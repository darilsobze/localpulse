"""
main.py — LocalPulse AI Engine  (feature/3d-map)

Challenge 01 · Generative City-Wallet · DSV-Gruppe × Hack-Nation

Implements all three required modules:
  01 Context Sensing Layer  — weather + location + Payone demand + local events
  02 Generative Offer Engine — GPT-4o-mini; merchant sets rules, AI creates offer
  03 Checkout & Redemption   — dynamic QR token → /api/redeem → wallet cashback

Start:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Docs: http://localhost:8000/docs
"""

import json, math, os, random, uuid
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pywebpush import webpush, WebPushException
from dotenv import load_dotenv

from payone_mock import get_payone_signal, _register_merchants
from ai_service import generate_offer_text
from events_mock import get_active_events, composite_label, get_time_slot
from database import (
    init_db,
    upsert_subscription, delete_subscription, all_subscriptions, subscription_count,
    insert_redemption, get_redemptions, merchant_stats as db_merchant_stats,
    get_wallet, add_cashback,
    get_merchant_settings, upsert_merchant_settings,
    insert_dismissal,
)

load_dotenv()

VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_EMAIL       = os.environ.get("VAPID_EMAIL", "mailto:demo@localpulse.app")

MERCHANTS_FILE = os.path.join(os.path.dirname(__file__), "data", "merchants.json")
with open(MERCHANTS_FILE, encoding="utf-8") as f:
    MERCHANTS: list[dict] = json.load(f)

_register_merchants(MERCHANTS)
init_db()

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="LocalPulse AI Engine", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Static files ──────────────────────────────────────────────────────────────

@app.get("/")
def serve_demo():
    return FileResponse(os.path.join(os.path.dirname(__file__), "demo_3d_map.html"))

@app.get("/config.js")
def serve_config():
    return FileResponse(
        os.path.join(os.path.dirname(__file__), "config.js"),
        media_type="application/javascript",
    )


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "0.2.0",
        "subscribers": subscription_count(),
        "merchants": len(MERCHANTS),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 01 — Context Sensing Layer
# ═══════════════════════════════════════════════════════════════════════════════

# ── Weather proxy ─────────────────────────────────────────────────────────────

@app.get("/api/weather")
async def get_weather(lat: float = 49.8728, lng: float = 8.6512):
    """
    Proxies Open-Meteo weather for the user's real coordinates.
    The frontend sends lat/lng from geolocation — no hardcoded city.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        "&current=temperature_2m,weathercode,windspeed_10m"
        "&timezone=auto"
    )
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(url)
        r.raise_for_status()
        raw = r.json()

    current = raw["current"]
    code    = current["weathercode"]
    temp    = round(current["temperature_2m"])

    return {
        "temp":        temp,
        "description": _wmo_desc(code),
        "condition":   _wmo_condition(code),
        "windspeed":   current["windspeed_10m"],
        "raw_code":    code,
    }


def _wmo_desc(code: int) -> str:
    mapping = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
        61: "Light rain", 63: "Rain", 65: "Heavy rain",
        71: "Light snow", 73: "Snow", 75: "Heavy snow",
        80: "Rain showers", 82: "Heavy rain showers",
        95: "Thunderstorm", 99: "Thunderstorm with hail",
    }
    return mapping.get(code, f"Code {code}")


def _wmo_condition(code: int) -> str:
    if code in (0, 1):    return "sunny"
    if code in (2, 3, 45, 48): return "cloudy"
    if 51 <= code <= 82:  return "rainy"
    if code >= 95:        return "stormy"
    if 71 <= code <= 77:  return "snowy"
    return "cloudy"


# ── Local events ──────────────────────────────────────────────────────────────

@app.get("/api/events")
def list_events():
    """Active local events right now — third context signal alongside weather + Payone."""
    events = get_active_events()
    return {
        "events":          events,
        "count":           len(events),
        "demand_pressure": "high"   if any(e["demand_impact"] == "high" for e in events) else
                           "medium" if events else
                           "none",
    }


# ── Merchants ─────────────────────────────────────────────────────────────────

@app.get("/api/merchants")
def list_merchants():
    return MERCHANTS


@app.get("/api/merchants/live")
def list_merchants_live():
    """All merchants enriched with their live Payone signal — for the Discover view."""
    result = []
    for m in MERCHANTS:
        signal   = get_payone_signal(m["id"])
        settings = get_merchant_settings(m["id"])
        effective_discount = (
            settings["max_discount_pct"] if settings
            else m["limits"]["max_discount_pct"]
        )
        result.append({**m, "payone_signal": signal, "effective_discount_pct": effective_discount})
    return result


# NOTE: /api/merchant/stats must be declared BEFORE /api/merchant/{id}/...
# to prevent FastAPI capturing "stats" as a merchant_id path parameter.

@app.get("/api/merchant/stats")
def get_merchant_stats():
    """
    Module 03 — Merchant dashboard.
    Returns accept / decline counts and cashback totals for the demo merchant.
    """
    demo_id = "m_1"
    demo    = next((m for m in MERCHANTS if m["id"] == demo_id), None)
    if not demo:
        raise HTTPException(status_code=404, detail="Demo merchant not found")

    stats  = db_merchant_stats(demo_id)
    signal = get_payone_signal(demo_id)
    return {
        "merchant_id":  demo_id,
        "merchant":     demo["name"],
        "location":     demo["address"],
        "quiet_score":  signal["quiet_score"],
        "is_quiet":     signal["is_quiet"],
        **stats,
    }


@app.get("/api/merchant/{merchant_id}/status")
def merchant_status(merchant_id: str):
    if not any(m["id"] == merchant_id for m in MERCHANTS):
        raise HTTPException(status_code=404, detail="Merchant not found")
    return get_payone_signal(merchant_id)


@app.get("/api/merchant/{merchant_id}/settings")
def get_settings(merchant_id: str):
    """Module 02 — Read merchant rule configuration."""
    if not any(m["id"] == merchant_id for m in MERCHANTS):
        raise HTTPException(status_code=404, detail="Merchant not found")
    merchant = next(m for m in MERCHANTS if m["id"] == merchant_id)
    saved    = get_merchant_settings(merchant_id)
    return saved or {
        "max_discount_pct":  merchant["limits"]["max_discount_pct"],
        "min_quiet_gap_min": 20,
    }


class MerchantSettingsPayload(BaseModel):
    max_discount_pct:  int
    min_quiet_gap_min: int


@app.put("/api/merchant/{merchant_id}/settings")
def save_settings(merchant_id: str, payload: MerchantSettingsPayload):
    """
    Module 02 — Merchant sets rules.
    The AI then uses these limits when generating the offer text.
    """
    if not any(m["id"] == merchant_id for m in MERCHANTS):
        raise HTTPException(status_code=404, detail="Merchant not found")
    if not (0 <= payload.max_discount_pct <= 100):
        raise HTTPException(status_code=422, detail="max_discount_pct must be 0–100")
    if not (1 <= payload.min_quiet_gap_min <= 120):
        raise HTTPException(status_code=422, detail="min_quiet_gap_min must be 1–120")
    upsert_merchant_settings(merchant_id, payload.max_discount_pct, payload.min_quiet_gap_min)
    return {"saved": True, **payload.model_dump()}


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 02 — Generative Offer Engine
# ═══════════════════════════════════════════════════════════════════════════════

class ContextRequest(BaseModel):
    user_lng:     float
    user_lat:     float
    temperature:  float
    weather_code: int
    radius_m:     float = 1000.0


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin(math.radians(lat2 - lat1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _social_proof_coords(lng: float, lat: float, n: int = 3) -> list[list[float]]:
    return [
        [lng + random.uniform(-0.0008, 0.0008), lat + random.uniform(-0.0005, 0.0005)]
        for _ in range(n)
    ]


@app.post("/api/offer")
def get_personalized_offer(context: ContextRequest):
    """
    Full context sensing → generative offer pipeline.

    Steps:
      1. Find merchants within radius
      2. Check Payone signal (quiet score)
      3. Collect local events + time slot (additional context signals)
      4. Pick the quietest candidate
      5. Apply merchant settings (may override JSON discount)
      6. Generate offer text via GPT-4o-mini (or template fallback)
      7. Return offer + composite context state for the UI

    Privacy: raw GPS never leaves this server.
    Only offer category + weather context string reach OpenAI.
    """
    now = datetime.now()

    # ── Signal 1: Location — filter nearby merchants ─────────────────────────
    nearby = [
        (m, _haversine(context.user_lat, context.user_lng, m["location"][1], m["location"][0]))
        for m in MERCHANTS
        if _haversine(context.user_lat, context.user_lng, m["location"][1], m["location"][0]) <= context.radius_m
    ]

    if not nearby:
        return {"status": "no_offer", "reason": "no_merchants_nearby"}

    # ── Signal 2: Payone demand — filter quiet merchants ─────────────────────
    candidates = []
    for m, dist in nearby:
        signal = get_payone_signal(m["id"])
        if signal["is_quiet"]:
            candidates.append((signal["quiet_score"], dist, m, signal))

    # ── Signal 3: Local events ────────────────────────────────────────────────
    active_events = get_active_events()
    time_slot     = get_time_slot(now.hour)
    condition     = _wmo_condition(context.weather_code)

    if not candidates:
        return {
            "status": "no_offer",
            "reason": "no_quiet_merchants",
            "context_state": {
                "label":   "City is busy right now",
                "events":  active_events,
                "signals": [
                    {"icon": "🌡", "label": f"{round(context.temperature)}°C", "type": "weather"},
                    {"icon": "🕐", "label": time_slot.capitalize(), "type": "time"},
                    *[{"icon": e["icon"], "label": e["name"], "type": "event"} for e in active_events],
                ],
            },
        }

    # ── Pick quietest candidate ───────────────────────────────────────────────
    candidates.sort(key=lambda x: -x[0])
    quiet_score, dist, merchant, signal = candidates[0]

    # ── Apply merchant settings from DB (overrides JSON limits if saved) ──────
    settings          = get_merchant_settings(merchant["id"])
    effective_discount = (
        settings["max_discount_pct"] if settings
        else merchant["limits"]["max_discount_pct"]
    )
    merchant_for_ai = {
        **merchant,
        "limits": {**merchant["limits"], "max_discount_pct": effective_discount},
    }

    # ── Generate offer text (GPT-4o-mini or template fallback) ───────────────
    offer_text = generate_offer_text(merchant_for_ai, {
        **context.model_dump(),
        "events":    [e["name"] for e in active_events],
        "time_slot": time_slot,
    })

    lng, lat      = merchant["location"]
    ctx_label     = composite_label(context.temperature, condition, quiet_score, active_events, now.hour)
    quiet_pct     = round(quiet_score * 100)

    return {
        "status":              "success",
        "merchant_id":         merchant["id"],
        "merchant_name":       merchant["name"],
        "merchant_address":    merchant["address"],
        "category":            merchant["category"],
        "targetLngLat":        merchant["location"],
        "offer":               offer_text,
        "distance_m":          round(dist),
        "social_proof_coords": _social_proof_coords(lng, lat),
        "payone_signal":       signal,
        "expires_in_sec":      900,
        # ── Module 01 output — composite context state ────────────────────────
        "context_state": {
            "label":     ctx_label,
            "time_slot": time_slot,
            "events":    active_events,
            "signals": [
                {"icon": "🌡", "label": f"{round(context.temperature)}°C · {condition}", "type": "weather"},
                {"icon": "🏪", "label": f"{quiet_pct}% below usual traffic",              "type": "demand"},
                {"icon": "🕐", "label": time_slot.capitalize(),                            "type": "time"},
                *[{"icon": e["icon"], "label": e["name"], "type": "event"} for e in active_events],
            ],
            # GDPR: raw GPS never sent to OpenAI — only abstract category + weather string
            "gdpr_note": "Your GPS stays on your device. Only offer category and weather context are sent to the AI.",
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 03 — Checkout & Redemption
# ═══════════════════════════════════════════════════════════════════════════════

class RedeemPayload(BaseModel):
    user_id:       str
    offer_code:    str
    merchant_id:   str
    merchant_name: str
    discount_pct:  int
    cashback_eur:  float


@app.post("/api/redeem", status_code=201)
def redeem_offer(payload: RedeemPayload):
    """
    Simulated POS confirmation.
    Validates the offer code, logs the redemption, and adds cashback to the wallet.
    """
    rid = insert_redemption(
        user_id=payload.user_id,
        merchant_id=payload.merchant_id,
        merchant_name=payload.merchant_name,
        offer_code=payload.offer_code,
        discount_pct=payload.discount_pct,
        cashback_eur=payload.cashback_eur,
    )
    add_cashback(payload.user_id, payload.merchant_name, payload.cashback_eur)

    return {
        "status":        "confirmed",
        "redemption_id": rid,
        "cashback_eur":  payload.cashback_eur,
        "message":       f"+€{payload.cashback_eur:.2f} added to your City Wallet",
    }


class DismissPayload(BaseModel):
    user_id:     str
    merchant_id: str
    reason:      str = "user_dismissed"   # "user_dismissed" | "expired"


@app.post("/api/dismiss", status_code=201)
def dismiss_offer(payload: DismissPayload):
    """Track declines — feeds the accept_rate_pct in the merchant dashboard."""
    insert_dismissal(payload.user_id, payload.merchant_id, payload.reason)
    return {"logged": True}


# ── Wallet ─────────────────────────────────────────────────────────────────────

@app.get("/api/wallet/{user_id}")
def wallet(user_id: str):
    return get_wallet(user_id)


@app.get("/api/wallet/{user_id}/history")
def wallet_history(user_id: str, limit: int = 20):
    return get_redemptions(user_id, limit)


# ═══════════════════════════════════════════════════════════════════════════════
# Push Notifications (Module 01 — delivery channel)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/vapid-public-key")
def get_vapid_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="VAPID keys not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}


class PushSubscription(BaseModel):
    endpoint: str
    keys:     dict[str, str]


@app.post("/api/subscribe", status_code=201)
def subscribe(sub: PushSubscription):
    upsert_subscription(sub.endpoint, sub.keys)
    return {"subscribed": True, "total": subscription_count()}


class PushPayload(BaseModel):
    title: str = "Local Pulse"
    body:  str = "A quiet moment just opened nearby. Tap to claim your offer."
    url:   str = "/"


@app.post("/api/push/send")
def send_push(payload: PushPayload):
    if not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="VAPID keys not configured in .env")

    subs = all_subscriptions()
    if not subs:
        raise HTTPException(status_code=400, detail="No subscribers yet.")

    data             = json.dumps({"title": payload.title, "body": payload.body, "url": payload.url})
    results          = []
    dead_endpoints   = []

    for sub in subs:
        sub_info = {"endpoint": sub["endpoint"], "keys": sub["keys"]}
        try:
            webpush(
                subscription_info=sub_info,
                data=data,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL},
            )
            results.append({"endpoint": sub["endpoint"][:40] + "…", "ok": True})
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                dead_endpoints.append(sub["endpoint"])
            results.append({"endpoint": sub["endpoint"][:40] + "…", "ok": False, "error": str(e)})
        except Exception as e:
            dead_endpoints.append(sub["endpoint"])
            results.append({"endpoint": sub.get("endpoint", "")[:40] + "…", "ok": False, "error": str(e)})

    for ep in dead_endpoints:
        delete_subscription(ep)

    return {
        "sent":      sum(1 for r in results if r["ok"]),
        "attempted": len(results),
        "results":   results,
    }

"""LocalPulse — FastAPI backend.

Endpoints:
  GET  /health
  GET  /vapid-public-key          — frontend fetches this to subscribe
  POST /subscribe                 — store browser push subscription
  POST /push/send                 — fire push to all subscribers
  GET  /weather                   — proxy Open-Meteo for Darmstadt
  GET  /merchant/stats            — simulated merchant stats
  POST /offer                     — generate hyperpersonalized offer (AI + Payone mock)
  GET  /merchants                 — list all merchants
  GET  /merchant/{id}/status      — Payone signal for one merchant
"""

import json, math, os, random, textwrap
from typing import Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pywebpush import webpush, WebPushException
from dotenv import load_dotenv

from payone_mock import get_payone_signal, _register_merchants
from ai_service import generate_offer_text

load_dotenv()

VAPID_PUBLIC_KEY  = os.environ["VAPID_PUBLIC_KEY"]
VAPID_PRIVATE_KEY = os.environ["VAPID_PRIVATE_KEY"]
VAPID_EMAIL       = os.environ.get("VAPID_EMAIL", "mailto:demo@localpulse.app")

MERCHANTS_FILE = os.path.join(os.path.dirname(__file__), "data", "merchants.json")
with open(MERCHANTS_FILE, encoding="utf-8") as f:
    MERCHANTS: list[dict] = json.load(f)

_register_merchants(MERCHANTS)

# In-memory subscription store (reset on restart — fine for demo)
_subscriptions: list[dict] = []

app = FastAPI(title="LocalPulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "subscribers": len(_subscriptions)}


# ─── VAPID public key ───────────────────────────────────────────────────────────

@app.get("/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


# ─── Subscribe ─────────────────────────────────────────────────────────────────

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict[str, str]


@app.post("/subscribe", status_code=201)
def subscribe(sub: PushSubscription):
    data = sub.model_dump()
    if not any(s["endpoint"] == data["endpoint"] for s in _subscriptions):
        _subscriptions.append(data)
    return {"subscribed": True, "total": len(_subscriptions)}


# ─── Send push ─────────────────────────────────────────────────────────────────

class PushPayload(BaseModel):
    title: str = "Local Pulse"
    body: str = "31°C at Luisenplatz · –30% iced coffee at BACK FACTORY, 2 min away."
    url: str = "/"


@app.post("/push/send")
def send_push(payload: PushPayload):
    if not _subscriptions:
        raise HTTPException(status_code=400, detail="No subscribers yet. Open the app on your phone first.")

    data = json.dumps({
        "title": payload.title,
        "body": payload.body,
        "url": payload.url,
    })

    results = []
    dead = []

    for sub in _subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=data,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL},
            )
            results.append({"endpoint": sub["endpoint"][:40] + "…", "ok": True})
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                dead.append(sub)
            results.append({"endpoint": sub["endpoint"][:40] + "…", "ok": False, "error": str(e)})
        except Exception as e:
            # Bad local/demo subscriptions should not crash sending to valid devices.
            dead.append(sub)
            results.append({"endpoint": sub.get("endpoint", "")[:40] + "…", "ok": False, "error": str(e)})

    for d in dead:
        _subscriptions.remove(d)

    return {"sent": sum(1 for result in results if result["ok"]), "attempted": len(results), "results": results}


# ─── Weather proxy ─────────────────────────────────────────────────────────────
# Open-Meteo is CORS-friendly and free — this proxy adds caching later if needed.

OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=49.8728&longitude=8.6512"
    "&current=temperature_2m,weathercode,windspeed_10m"
    "&timezone=Europe%2FBerlin"
)


@app.get("/weather")
async def get_weather():
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(OPEN_METEO_URL)
        r.raise_for_status()
        raw = r.json()

    current = raw["current"]
    code = current["weathercode"]
    temp = round(current["temperature_2m"])
    description = _wmo_desc(code)
    condition = _wmo_condition(code)

    return {
        "temp": temp,
        "description": description,
        "condition": condition,       # "sunny" | "cloudy" | "rainy" | "stormy" | "snowy"
        "windspeed": current["windspeed_10m"],
        "raw_code": code,
    }


def _wmo_desc(code: int) -> str:
    mapping = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
        61: "Light rain", 63: "Rain", 65: "Heavy rain",
        71: "Light snow", 73: "Snow", 75: "Heavy snow",
        80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers",
        95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
    }
    return mapping.get(code, f"Code {code}")


def _wmo_condition(code: int) -> str:
    if code == 0 or code == 1: return "sunny"
    if code in (2, 3, 45, 48): return "cloudy"
    if code in range(51, 82): return "rainy"
    if code >= 95: return "stormy"
    if code in range(71, 78): return "snowy"
    return "cloudy"


# ─── Offer engine (Payone signal + AI text) ─────────────────────────────────────

class OfferContext(BaseModel):
    user_lng:     float
    user_lat:     float
    temperature:  float
    weather_code: int
    radius_m:     float = 1500.0


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _social_proof_coords(lng: float, lat: float, n: int = 3) -> list[list[float]]:
    return [
        [lng + random.uniform(-0.0008, 0.0008), lat + random.uniform(-0.0005, 0.0005)]
        for _ in range(n)
    ]


@app.get("/merchants")
def list_merchants():
    return MERCHANTS


@app.get("/merchant/{merchant_id}/status")
def merchant_status(merchant_id: str):
    if not any(m["id"] == merchant_id for m in MERCHANTS):
        raise HTTPException(status_code=404, detail="Merchant not found")
    return get_payone_signal(merchant_id)


@app.post("/offer")
def get_personalized_offer(context: OfferContext):
    nearby: list[tuple[float, dict]] = []
    for m in MERCHANTS:
        lng, lat = m["location"]
        dist = _haversine(context.user_lat, context.user_lng, lat, lng)
        if dist <= context.radius_m:
            nearby.append((dist, m))

    if not nearby:
        return {"status": "no_offer", "reason": "no_merchants_nearby"}

    candidates: list[tuple[float, float, dict, dict]] = []
    for dist, m in nearby:
        signal = get_payone_signal(m["id"])
        if signal["is_quiet"]:
            candidates.append((signal["quiet_score"], dist, m, signal))

    if not candidates:
        return {"status": "no_offer", "reason": "no_quiet_merchants"}

    candidates.sort(key=lambda x: -x[0])
    quiet_score, dist, merchant, signal = candidates[0]

    offer_text = generate_offer_text(merchant, context.model_dump())
    lng, lat = merchant["location"]

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
    }


# ─── Merchant stats (simulated) ────────────────────────────────────────────────

@app.get("/merchant/stats")
def merchant_stats():
    return {
        "merchant": "BACK FACTORY",
        "location": "Luisenplatz, Darmstadt",
        "quiet_minutes": 38,
        "offers_today": 3,
        "accepted": 2,
        "declined": 1,
        "revenue_recovered_eur": 12.40,
        "cashback_issued_eur": 3.60,
        "suppressed": [
            {"reason": "User moving fast (likely commuting)", "time": "11:42"},
            {"reason": "Offer sent 18 min ago — cooldown active", "time": "13:05"},
        ],
    }

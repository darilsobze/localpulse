"""
main.py – LocalPulse AI Engine (FastAPI)

Starten:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

API-Docs: http://localhost:8000/docs
"""

import json
import math
import random
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from payone_mock import get_current_transaction_density, get_payone_signal, _register_merchants
from ai_service import generate_offer_text

# ── Setup ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="LocalPulse AI Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Für Hackathon alle Origins erlaubt
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MERCHANTS_FILE = os.path.join(os.path.dirname(__file__), "data", "merchants.json")
with open(MERCHANTS_FILE, encoding="utf-8") as f:
    MERCHANTS: list[dict] = json.load(f)

# Händlerdaten in den Payone-Mock laden
_register_merchants(MERCHANTS)


# ── Schemas ───────────────────────────────────────────────────────────────────
class ContextRequest(BaseModel):
    user_lng:     float
    user_lat:     float
    temperature:  float
    weather_code: int
    radius_m:     float = 1000.0   # Suchradius in Metern


# ── Helpers ───────────────────────────────────────────────────────────────────
def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Luftlinien-Distanz in Metern."""
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a  = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _social_proof_coords(lng: float, lat: float, n: int = 3) -> list[list[float]]:
    """Generiert n realistische Umgebungskoordinaten für FOMO-Marker."""
    return [
        [lng + random.uniform(-0.0008, 0.0008), lat + random.uniform(-0.0005, 0.0005)]
        for _ in range(n)
    ]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
def serve_demo():
    return FileResponse(os.path.join(os.path.dirname(__file__), "demo_3d_map.html"))

@app.get("/config.js")
def serve_config():
    return FileResponse(
        os.path.join(os.path.dirname(__file__), "config.js"),
        media_type="application/javascript"
    )

@app.get("/health")
def health():
    return {"status": "LocalPulse AI Engine running", "version": "0.1.0"}


@app.get("/api/merchants")
def list_merchants():
    """Alle Händler in der Datenbank."""
    return MERCHANTS


@app.get("/api/merchant/{merchant_id}/status")
def merchant_status(merchant_id: str):
    """Payone-Signal für einen einzelnen Händler (für das Merchant-Dashboard)."""
    if not any(m["id"] == merchant_id for m in MERCHANTS):
        raise HTTPException(status_code=404, detail="Merchant not found")
    return get_payone_signal(merchant_id)


@app.post("/api/offer")
def get_personalized_offer(context: ContextRequest):
    """
    Der Kern von LocalPulse:
    1. Findet Händler im Umkreis
    2. Prüft Payone-Daten (Gibt es eine Flaute?)
    3. Wählt den Händler mit der stärksten Flaute
    4. Generiert ein hyperpersonalisiertes Angebot via AI
    """

    # 1. Händler im Radius filtern
    nearby: list[tuple[float, dict]] = []
    for m in MERCHANTS:
        lng, lat = m["location"]
        dist = _haversine(context.user_lat, context.user_lng, lat, lng)
        if dist <= context.radius_m:
            nearby.append((dist, m))

    if not nearby:
        return {"status": "no_offer", "reason": "no_merchants_nearby"}

    # 2. Payone-Signal für jeden Händler in der Nähe prüfen
    candidates: list[tuple[float, float, dict, dict]] = []
    for dist, m in nearby:
        signal = get_payone_signal(m["id"])
        if signal["is_quiet"]:
            # (quiet_score, distanz, händler, signal) – höherer Score = dringender
            candidates.append((signal["quiet_score"], dist, m, signal))

    if not candidates:
        return {"status": "no_offer", "reason": "no_quiet_merchants"}

    # 3. Händler mit der stärksten Flaute auswählen
    candidates.sort(key=lambda x: -x[0])
    quiet_score, dist, merchant, signal = candidates[0]

    # 4. AI-Angebot generieren
    offer_text = generate_offer_text(merchant, context.model_dump())

    lng, lat = merchant["location"]

    return {
        "status":         "success",
        "merchant_id":    merchant["id"],
        "targetLngLat":   merchant["location"],
        "offer":          offer_text,
        "distance_m":     round(dist),
        "social_proof_coords": _social_proof_coords(lng, lat),
        "payone_signal":  signal,
        "expires_in_sec": 900,
    }

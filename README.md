# LocalPulse — Generative City Wallet

> **Hackathon: DSV-Gruppe × Hack-Nation — Challenge 01 · Generative City-Wallet**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemma](https://img.shields.io/badge/Gemma_4_2B-Google-4285F4?logo=google&logoColor=white)](https://ai.google.dev/gemma)
[![Mapbox](https://img.shields.io/badge/Mapbox%20GL%20JS-v3.2-000000?logo=mapbox&logoColor=white)](https://mapbox.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![GDPR](https://img.shields.io/badge/GDPR-Privacy%20by%20Design-005BBB)](https://gdpr.eu)

---

## What is LocalPulse?

LocalPulse is **not another coupon app**. It is an intelligent city companion that reads your current context — your movement pace, the weather, the merchant's real-time transaction density, the time of day, local events — and uses Generative AI to create a hyper-personalised offer **in the moment it becomes relevant**, not before.

The core insight: a `25% off ice cream` offer means nothing to someone sprinting to a meeting. The same offer, reframed as *"Schnell vorbei? Eis to-go — QR zeigen, 30 Sek., fertig"*, sent to someone who just finished a workout and is strolling nearby, converts.

**LocalPulse closes the full loop:** context detection → AI offer generation → immersive display → accept/decline → QR checkout → wallet cashback.

---

## Demo Scenario

> *"I finish my workout at A.I. Fitness Club, Luisenplatz 5, Darmstadt. I walk out. 4 seconds later — a notification:"*

```
┌────────────────────────────────────────────────────┐
│ 🏋️  LocalPulse                          18:42 Uhr  │
│  Workout geschafft! 💪                              │
│  Danny's Eisdiele · 80m entfernt · 25% Cashback –  │
│  du hast es dir verdient!                           │
└────────────────────────────────────────────────────┘
```

*Tap → context scan → offer card → accept → 3D map flies to Danny's Eisdiele → route drawn → QR checkout → cashback in wallet.*

---

## Table of Contents

- [Architecture](#architecture)
- [Privacy & GDPR](#privacy--gdpr)
- [Hyperpersonalisation Engine](#hyperpersonalisation-engine)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Merchant Dashboard](#merchant-dashboard)
- [Modules Deep-Dive](#modules-deep-dive)

---

## Architecture

LocalPulse is built around three backend modules plus an on-device behavioral engine:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER'S DEVICE (Browser)                        │
│                                                                        │
│  GPS Stream ──► ContextEngine (JS)                                    │
│                  │  Ring buffer: 20s snapshots × 6h                   │
│                  │  Detail window: 30min full resolution               │
│                  │  Computes: pace, direction variance,                │
│                  │  dwell detection, post-errand transition            │
│                  │                                                     │
│                  ▼  ONLY these 5 abstract fields leave the device:    │
│              IntentSignal {                                            │
│                vibe_state:   lingering | exploring | strolling |       │
│                              commuting | post_errand                   │
│                pace_class:   stopped | strolling | walking | fast      │
│                receptivity:  0.0 – 1.0                                 │
│                offer_format: quick_grab | full_experience              │
│                activity_ctx: leisure | commuting | post_errand         │
│              }                                                         │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTPS · no raw GPS · no history
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FASTAPI SERVER (Germany · DSGVO)                    │
│                                                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │  MODULE 01      │  │  MODULE 02       │  │  MODULE 03         │   │
│  │  Context Layer  │  │  Offer Engine    │  │  Checkout          │   │
│  │                 │  │                  │  │                    │   │
│  │  • Open-Meteo   │  │  • Gemma 4 2B   │  │  • Dynamic QR      │   │
│  │    weather      │─►│  • Vibe-aware    │─►│  • /api/redeem     │   │
│  │  • Payone mock  │  │    tone prompt   │  │  • Wallet cashback │   │
│  │  • Local events │  │  • Template      │  │  • /api/dismiss    │   │
│  │  • Merchant     │  │    fallback      │  │  • Redemption log  │   │
│  │    proximity    │  │  • Alternatives  │  │                    │   │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘   │
│                                │                                       │
│                         SQLite (localpulse.db)                         │
│               wallet · redemptions · settings · dismissals             │
└──────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vanilla JS)                          │
│                                                                        │
│  Mapbox GL JS v3  ──  3D satellite city map, 60fps                    │
│  WowEffect        ──  flyTo animation, route, social proof avatars    │
│  QRCode.js        ──  dynamic QR token generation                     │
│  Web Push (VAPID) ──  background notifications                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow: A Single Offer Request

```
1. User finishes workout, walks 100m
2. ContextEngine detects: pace dropped, post_errand vibe, receptivity 80%
3. Push notification fires (4s after app loads)
4. App scans: GPS → weather → Payone signal → vibe
5. POST /api/offer { location, weather, IntentSignal }
6. Server: finds quiet merchants within radius
7. Server: builds vibe-aware prompt → Gemma 4 2B generates offer
8. Response: { title, description, discount_pct, alternatives[], context_state }
9. Offer card slides up with vibe-specific copy
10. User accepts → 3D fly-to → route → QR screen → /api/redeem → wallet +€
```

---

## Privacy & GDPR

LocalPulse was designed **Privacy by Design** from day one — not as an afterthought.

### What stays on the device

| Data | Where it lives | Never sent? |
|------|---------------|------------|
| Raw GPS coordinates | Browser RAM only | ✅ Never |
| 6-hour movement history | Browser RAM (ring buffer) | ✅ Never |
| Exact trajectory and route | Browser RAM | ✅ Never |
| Behavioral snapshots | Browser RAM | ✅ Never |

### What leaves the device

| Field | Value example | Purpose |
|-------|--------------|---------|
| `vibe_state` | `"post_errand"` | Tune offer tone |
| `pace_class` | `"strolling"` | Tune offer urgency |
| `receptivity` | `0.80` | Trigger threshold |
| `offer_format` | `"full_experience"` | Offer length |
| `activity_context` | `"post_errand"` | Context signal |
| `user_lat` / `user_lng` | `49.8730, 8.6512` | Merchant proximity only — not stored, never leaves the server |
| `temperature` | `28.0` | Weather context |
| `weather_code` | `0` | Weather context |

### What Gemma 4 2B receives

```
Händler: Danny's Eisdiele (Kategorie: ice_cream)
Temperatur: 28°C, Wetterlage: heiss_sonnig
Tageszeit: feierabend
Heute: Sonntag (Wochenende)
Maximaler Rabatt: 25%

NUTZER-VIBE: post_errand (Schrittfrequenz: strolling)
Empfänglichkeit: 80%
Ton-Anweisung: belohnend, euphorisch, "Du hast es dir verdient"-Feeling
```

**No name. No location. No history. No user ID.** Gemma 4 2B runs locally — zero data egress.

### Infrastructure

- Server runs in **Germany** (DSGVO-compliant hosting target)
- No user profiles stored — session-only computation
- Full erasure is trivial (nothing persisted server-side beyond wallet/redemptions)
- Wallet data is pseudonymous (`user_demo` — no PII link required)

---

## Hyperpersonalisation Engine

The `ContextEngine` (client-side JavaScript) is the intelligence layer that makes LocalPulse different from every other proximity-marketing tool.

### Signals computed on-device

```
6-HOUR RING BUFFER (1080 × 20s snapshots)
┌────────────────────────────────────────────────────────────┐
│  t-360min ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ t-now    │
│           low-res historical movement pattern              │
└────────────────────────────────────────────────────────────┘

30-MINUTE DETAIL WINDOW
┌────────────────────────────────────────────────────────────┐
│  Precise GPS track → pace (m/s), direction, dwell points   │
└────────────────────────────────────────────────────────────┘
```

| Signal | Algorithm | Meaning |
|--------|-----------|---------|
| **Pace (m/s)** | Haversine distance over last 60s | How fast is the user moving right now |
| **Direction variance** | Bearing variance across last 5 GPS segments | Are they wandering or going somewhere specific |
| **Dwell detection** | <30m total displacement in 90s | User stopped / window shopping |
| **Post-errand** | Was fast (>1.2 m/s) 3–8 min ago, now slowing | Errand complete, open to reward |
| **Wandering** | Bearing variance >55° | Exploring, curious, high receptivity |

### Vibe state machine

```
          pace > 1.5 m/s
          linear trajectory
               │
               ▼
          ┌─────────┐      pace drops after fast period
          │COMMUTING│─────────────────────────────────►┌────────────┐
          │ rec:22% │                                   │POST_ERRAND │
          └─────────┘                                   │  rec: 80%  │
                                                        └────────────┘

     pace 0.8–1.5 m/s          pace < 0.8 m/s
     low dir. variance          high dir. variance
          │                          │
          ▼                          ▼
     ┌──────────┐             ┌───────────┐
     │STROLLING │             │ EXPLORING │
     │ rec: 58% │             │  rec: 75% │
     └──────────┘             └───────────┘

                  pace < 0.3 m/s or dwelling
                            │
                            ▼
                      ┌──────────┐
                      │LINGERING │
                      │ rec: 93% │
                      └──────────┘
```

### How vibe changes the offer copy

| Vibe | AI Tone Instruction | Example Output |
|------|--------------------|-|
| `lingering` | Einladend, erlebnisorientiert, kein Zeitdruck | *"Zeit für eine Pause bei Danny's ☕ — kein Stress, setz dich, 25% auf alles"* |
| `exploring` | Entdeckerfreudig, spielerisch, Neugier wecken | *"Entdecke Danny's Eisdiele – 25% auf Eis 🗺️ Perfekter Zwischenstopp!"* |
| `strolling` | Freundlich, kurz, leicht verlockend | *"Perfektes Eiswetter bei Danny's ☀️ — gönn dir eine Pause: 25% auf alles"* |
| `commuting` | Ultra-kurz, Schnelligkeit betonen, QR-first | *"Schnell vorbei? 25% Eis to-go ⚡ — QR zeigen, 30 Sek., fertig"* |
| `post_errand` | Belohnend, euphorisch, Verdient-Feeling | *"Workout geschafft? Eis verdient! 🍦 — 25%, du weißt, du willst es"* |

### Context layering

Every offer is generated from the intersection of **5 independent signals**:

```
Weather ──────────────────────┐
Payone transaction density ───┤
                               ├──► Gemma 4 2B ──► Hyper-personalised offer
Time slot + Calendar ─────────┤
Local events ─────────────────┤
User vibe (on-device) ────────┘
```

---

## Tech Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Framework | **FastAPI 0.110+** | REST API, automatic OpenAPI docs |
| ASGI Server | **Uvicorn** | Production-grade async server |
| AI Engine | **Gemma 4 2B** | Generative offer text — local inference, zero data egress |
| Weather | **Open-Meteo API** | Free, GDPR-compliant weather data |
| Database | **SQLite 3** | Lightweight persistence (wallet, redemptions, settings) |
| Push Notifications | **pywebpush + VAPID** | Web push standard |
| HTTP Client | **httpx** | Async weather proxy |
| Validation | **Pydantic v2** | Request/response schema enforcement |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| 3D Map | **Mapbox GL JS v3.2** | Satellite city map, 3D building extrusion, 60fps |
| Behavioral Engine | **Vanilla JS (ContextEngine)** | On-device movement tracking, vibe detection |
| Animations | **WowEffect (custom)** | flyTo, route drawing, social proof avatars |
| QR Generation | **QRCode.js** | Dynamic QR tokens at checkout |
| UI | **Vanilla HTML/CSS/JS** | Zero-dependency, mobile-first |

### Infrastructure

| Layer | Technology |
|-------|-----------|
| Language | Python 3.11+ |
| Config | python-dotenv |
| Dev server | `uvicorn --reload` |
| DB file | `localpulse.db` (SQLite, auto-created on first run) |
| Secrets | `.env` (gitignored) |

---

## Project Structure

```
localpulse/
│
├── main.py                   # FastAPI app — all 3 modules + routing
├── ai_service.py             # Gemma 4 2B offer generation + vibe-aware prompting
├── database.py               # SQLite schema + CRUD helpers
├── payone_mock.py            # Simulated transaction density by category/hour
├── events_mock.py            # Local event calendar + get_calendar_context()
│
├── demo_3d_map.html          # Complete frontend — map, ContextEngine, UI, checkout
│
├── data/
│   └── merchants.json        # 6 Darmstadt merchants with location + limits
│
├── .env                      # Secrets (gitignored)
├── .env.example              # Template for required variables
├── config.js                 # Mapbox token (gitignored, served at /config.js)
├── requirements.txt          # Python dependencies
├── localpulse.db             # SQLite database (auto-created)
│
├── test_api.py               # API endpoint tests
└── test_ai.py                # AI service tests
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- A Mapbox account (free tier works) → [mapbox.com](https://mapbox.com)
- Optional: Gemma 4 2B local endpoint → falls back to vibe-aware templates without it

### 1. Clone and install

```bash
git clone https://github.com/your-org/localpulse.git
cd localpulse
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-...          # Optional — uses templates if missing
VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
VAPID_EMAIL=mailto:you@example.com
```

### 3. Configure Mapbox token

Create `config.js` in the project root:

```js
const CONFIG = {
  MAPBOX_TOKEN: "pk.eyJ1..."   // Your Mapbox public token
};
```

### 4. Start the server

```bash
uvicorn main:app --reload --port 8000
```

### 5. Open the app

| URL | What you get |
|-----|-------------|
| `http://localhost:8000` | Full 3D demo app |
| `http://localhost:8000/docs` | Interactive Swagger API docs |
| `http://localhost:8000/redoc` | ReDoc API reference |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | Gemma 4 2B key. Without it, the system uses vibe-aware template fallbacks |
| `VAPID_PUBLIC_KEY` | Optional | Web Push public key for background notifications |
| `VAPID_PRIVATE_KEY` | Optional | Web Push private key |
| `VAPID_EMAIL` | Optional | Contact email for the push service |

> **Mapbox token** is stored in `config.js` (not `.env`) and served at `/config.js`. This keeps it out of the Python environment while allowing the frontend to load it at runtime.

### Generating VAPID keys

```bash
# Option A — Python
python -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print('Public:', v.public_key.decode())
print('Private:', v.private_key.decode())
"

# Option B — Web tool
# https://web-push-codelab.glitch.me/
```

---

## API Reference

### Module 01 — Context Sensing

```
GET  /health
GET  /api/weather?lat=49.8728&lng=8.6512
GET  /api/events
GET  /api/merchants
GET  /api/merchants/live
```

### Module 02 — Generative Offer Engine

```
POST /api/offer
```

**Request body:**

```json
{
  "user_lng": 8.6512,
  "user_lat": 49.8728,
  "temperature": 28.0,
  "weather_code": 0,
  "radius_m": 50000,
  "vibe_state": "post_errand",
  "pace_class": "strolling",
  "receptivity": 0.80,
  "offer_format": "full_experience",
  "activity_context": "post_errand"
}
```

**Response:**

```json
{
  "status": "success",
  "merchant_name": "Danny's Eisdiele",
  "merchant_address": "Luisenplatz 5, 64283 Darmstadt",
  "category": "ice_cream",
  "targetLngLat": [8.6535, 49.8740],
  "offer": {
    "title": "Workout geschafft? Eis verdient! 🍦",
    "description": "25% – du weißt, du willst es.",
    "discount_pct": 25,
    "alternatives": [
      {
        "title": "Wochenend-Special bei Danny's 🌅",
        "description": "Gönn dir was – 25% nur am Wochenende!",
        "context_reason": "Wochenende"
      }
    ]
  },
  "context_state": {
    "signals": [
      { "icon": "🌡", "label": "28°C · sunny",                "type": "weather" },
      { "icon": "🏪", "label": "67% below usual traffic",     "type": "demand"  },
      { "icon": "🕐", "label": "Feierabend",                  "type": "time"    },
      { "icon": "🧠", "label": "Post errand · 80% receptivity", "type": "vibe" }
    ],
    "gdpr_note": "Dein GPS bleibt auf deinem Gerät. Nur anonyme Verhaltens-Signale & Wetter werden gesendet."
  },
  "expires_in_sec": 900
}
```

### Module 03 — Checkout & Redemption

```
POST /api/redeem
POST /api/dismiss
GET  /api/wallet/{user_id}
GET  /api/wallet/{user_id}/history
```

### Merchant Dashboard

```
GET  /api/merchant/stats
GET  /api/merchant/{merchant_id}/settings
PUT  /api/merchant/{merchant_id}/settings
GET  /api/merchant/{merchant_id}/status
```

### Push Notifications

```
GET  /api/vapid-public-key
POST /api/subscribe
POST /api/push/send
```

---

## Modules Deep-Dive

### Module 01 — Context Sensing Layer

The context layer aggregates **4 independent signals** before any offer is generated:

| Signal | Source | What it tells us |
|--------|--------|-----------------|
| **Weather** | Open-Meteo API (real-time) | Hot → ice cream; Rain → café; Cold → warm drinks |
| **Payone demand** | `payone_mock.py` (simulated) | Quiet merchant = budget for discounts + capacity to serve |
| **Local events** | `events_mock.py` | Wochenmarkt, concerts, Stadtfest affect foot traffic |
| **Calendar** | `events_mock.get_calendar_context()` | Weekend / holiday changes offer tone |

The Payone signal is the key differentiator: merchants activate offers **only when they have quiet periods** (low transaction density), ensuring the discount serves both parties — the merchant fills a fallow window; the user gets a genuine deal.

### Module 02 — Generative Offer Engine

Unlike rule-based coupon systems, every offer is **generated live** at request time.

```
Merchant limits (DB) ──────────────────────────────┐
Context signals (weather, time, events, calendar) ──┤
IntentSignal (on-device vibe) ──────────────────────┤──► Gemma 4 2B ──► JSON
                                                     │     {
                                                     │       title,
                                                     │       description,
                                                     │       alternatives[]
                                                     │     }
```

**Fallback strategy:** If Gemma 4 2B is not available or the inference call fails, the engine uses a **vibe-aware template matrix** keyed on `(vibe_state, category, weather_context)`. The demo is fully functional without a local model.

### Module 03 — Checkout & Redemption

1. User accepts offer → app generates `LP-M1-{timestamp}-{random}` offer code
2. QRCode.js renders the code as a scannable QR
3. User taps "Einlösung bestätigen" → `POST /api/redeem`
4. Server logs redemption → `add_cashback()` → wallet balance updated
5. Accept rate tracked per merchant → feeds the dashboard analytics

---

## Merchant Dashboard

Access via the bottom nav **🏪 Händler** tab.

The dashboard shows the demo merchant (Danny's Eisdiele) in real time:

| Metric | Description |
|--------|-------------|
| **Quiet Score** | Current transaction density vs. expected (Payone signal) |
| **Offers Accepted** | Total redemptions |
| **Accept Rate** | Accepted / (Accepted + Dismissed) × 100% |
| **Cashback Issued** | Total EUR paid out via wallet |
| **Revenue Recovered** | Estimated revenue from quiet-period customers |

Merchant settings (max discount %, minimum quiet gap) are editable and persist in SQLite.

---

## Merchants (Demo Data)

| ID | Name | Category | Location | Max Discount |
|----|------|----------|----------|-------------|
| m_1 | Danny's Eisdiele | ice_cream | Luisenplatz 5 | 25% |
| m_2 | Café Metropol | cafe | Marktplatz 8 | 20% |
| m_3 | Bistro Zentrum | restaurant | Rheinstraße 12 | 15% |
| m_4 | Bäckerei Köhler | bakery | Wilhelminenstraße 3 | 30% |
| m_5 | Smoothie Lab | cafe | Mathildenplatz 2 | 20% |
| m_6 | Taproom Darmstadt | bar | Landgraf-Georg-Str. 5 | 15% |

All located in **Darmstadt city center**, within walking distance of Luisenplatz.

---

## Running Tests

```bash
# API endpoint tests
python -m pytest test_api.py -v

# AI service tests (works without OPENAI_API_KEY — tests template fallback)
python -m pytest test_ai.py -v
```

---

## Roadmap (Post-Hackathon)

- [ ] Real Payone API integration (replace mock with live transaction webhooks)
- [ ] On-device SLM (Gemma 2B / Phi-3) for full offline offer generation
- [ ] Merchant self-service onboarding portal
- [ ] Multi-city expansion (merchant data per city)
- [ ] A/B testing framework for offer copy variants
- [ ] React Native app (replace PWA with native push notifications)

---

## Concept & Challenge Context

**Challenge:** DSV-Gruppe × Hack-Nation — Build a *Generative City Wallet* that uses real-time context to create personalised offers for local merchants.

**Our answer:** A privacy-first, movement-aware, AI-generated offer engine that:
- Keeps all personal data on the user's device
- Generates offers live (no pre-defined coupon catalogue)
- Matches offer tone to the user's exact behavioural state
- Gives merchants zero-effort, goal-based marketing ("fill my quiet hours")
- Closes the complete loop from detection → checkout → wallet

---

## License

MIT — see `LICENSE` for details.

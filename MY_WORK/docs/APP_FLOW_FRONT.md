# LocalPulse — End-to-End App Flow

How the app works from boot to redeem, with file references at each step.

---

## 0. Stack overview

- **Backend**: FastAPI (Python) at `localhost:8000` — [backend/main.py](../backend/main.py)
- **Frontend**: React + Vite + TypeScript at `localhost:5173` — [frontend/](../frontend/)
- **Dev proxy**: Vite forwards `/api/*` → backend — [frontend/vite.config.ts](../frontend/vite.config.ts)
- **Mobile demo tunnel**: ngrok exposes Vite over HTTPS — [start-ngrok.js](../start-ngrok.js)

---

## 1. Boot

### 1a. Backend startup
- [backend/main.py](../backend/main.py) loads `.env` (VAPID keys), reads merchant catalog from [backend/data/merchants.json](../backend/data/merchants.json), registers them into the Payone mock cache via `_register_merchants` in [backend/payone_mock.py](../backend/payone_mock.py).
- FastAPI app bound, CORS open, in-memory `_subscriptions` list initialized.

### 1b. Frontend bootstrap
- [frontend/index.html](../frontend/index.html) → [frontend/src/main.tsx](../frontend/src/main.tsx) mounts `<App />`.
- [frontend/src/App.tsx](../frontend/src/App.tsx) sets up `BrowserRouter`, routes (`/`, `/discover`, `/wallet`, `/merchant`), renders persistent [BottomNav](../frontend/src/components/BottomNav.tsx) and the push prompt [NotificationControls](../frontend/src/components/NotificationControls.tsx).

---

## 2. Push notification opt-in

User taps the "Real push demo" banner → [NotificationControls.tsx](../frontend/src/components/NotificationControls.tsx) calls `subscribeToPush()` in [frontend/src/lib/push.ts](../frontend/src/lib/push.ts):

1. Registers service worker [frontend/public/sw.js](../frontend/public/sw.js).
2. Asks `Notification.requestPermission()`.
3. Fetches VAPID public key from backend `GET /vapid-public-key` ([main.py:61](../backend/main.py#L61)).
4. Calls `pushManager.subscribe(...)`, POSTs subscription to `POST /subscribe` ([main.py:73](../backend/main.py#L73)) — appended to `_subscriptions`.

Test push: `sendTestPush()` → `POST /push/send` ([main.py:89](../backend/main.py#L89)) → `pywebpush` fans out to every stored subscription → SW [sw.js](../frontend/public/sw.js) `push` handler renders OS notification.

---

## 3. Home screen — the "moment" pipeline

[frontend/src/pages/HomePage.tsx](../frontend/src/pages/HomePage.tsx) drives a stage machine: `lockscreen → card → flight → arrived → journal`.

### 3a. Bootstrap effect
On mount, runs in parallel:
- `getUserCoords()` — geolocation w/ fallback to Darmstadt — [lib/offer.ts:117](../frontend/src/lib/offer.ts#L117)
- `fetchWeather()` — `GET /weather` — [lib/weather.ts](../frontend/src/lib/weather.ts)

### 3b. Weather proxy
`GET /weather` ([main.py:138](../backend/main.py#L138)) hits Open-Meteo for Darmstadt coords, maps WMO code → `condition` string + description via `_wmo_desc` / `_wmo_condition`.

### 3c. Offer request
`fetchOffer(coords, weather)` POSTs `OfferRequest` to `/offer` — [lib/offer.ts:78](../frontend/src/lib/offer.ts#L78). On any failure → `DEMO_FALLBACK` (BACK FACTORY iced coffee).

### 3d. Backend offer engine
`POST /offer` ([main.py:220](../backend/main.py#L220)):
1. `_haversine` filters `MERCHANTS` within `radius_m`.
2. For each nearby merchant, `get_payone_signal(id)` ([payone_mock.py:51](../backend/payone_mock.py#L51)) computes expected vs current TPH from per-category hourly patterns; merchants flagged `_demo_force_quiet` get artificially low `current_tph`. `is_quiet = quiet_score > 0.40`.
3. Picks highest `quiet_score` candidate.
4. `generate_offer_text(merchant, context)` in [backend/ai_service.py](../backend/ai_service.py) — calls OpenAI `gpt-4o-mini` with German marketing system prompt + JSON schema response when `OPENAI_API_KEY` set, else falls back to `_TEMPLATES` keyed on `(category, weather_context)`.
5. Returns merchant info + AI/template text + `targetLngLat` + `social_proof_coords` + raw payone signal.

### 3e. Card render
[components/MomentCard.tsx](../frontend/src/components/MomentCard.tsx) shown via [components/AmbientSky.tsx](../frontend/src/components/AmbientSky.tsx) backdrop and [components/TopBar.tsx](../frontend/src/components/TopBar.tsx) header. `buildReasons()` in [HomePage.tsx:23](../frontend/src/pages/HomePage.tsx#L23) turns weather + payone + AI source into 4 bullet justifications.

### 3f. Accept → flight animation
Stage flips to `flight` → [components/WowMap.tsx](../frontend/src/components/WowMap.tsx) mounts and `wowMapRef.current?.trigger()` fires the cinematic Mapbox flight from [frontend/src/wow/WowEffect.js](../frontend/src/wow/WowEffect.js) (3D buildings, route line, social-proof pings). Token: `VITE_MAPBOX_TOKEN`.

### 3g. Arrived → redeem
`onFlightComplete` → stage `arrived` → [components/RedeemSheet.tsx](../frontend/src/components/RedeemSheet.tsx) slides up. Done → stage `journal` → [components/JournalEntry.tsx](../frontend/src/components/JournalEntry.tsx).

---

## 4. Other tabs

### Discover — [pages/DiscoverPage.tsx](../frontend/src/pages/DiscoverPage.tsx)
Static offer list + live weather header (re-polls every 30s).

### Wallet — [pages/WalletPage.tsx](../frontend/src/pages/WalletPage.tsx)
Hardcoded balance, stamps, journal entries (no backend yet).

### Merchant — [pages/MerchantPage.tsx](../frontend/src/pages/MerchantPage.tsx)
Sliders for max discount + quiet gap. "Send Moment Offer" button hits `POST /push/send` to broadcast a push to all subscribed devices.

### Interactive Map FAB — [components/InteractiveMapOverlay.tsx](../frontend/src/components/InteractiveMapOverlay.tsx)
BottomNav center FAB opens full-screen Mapbox overlay (toggles 2D streets ↔ satellite + 3D building extrusions). Markers for user + BACK FACTORY.

---

## 5. Endpoint map (backend)

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET  | `/health`                  | [main.py:54](../backend/main.py#L54)  | liveness + sub count |
| GET  | `/vapid-public-key`        | [main.py:61](../backend/main.py#L61)  | push key for SW |
| POST | `/subscribe`               | [main.py:73](../backend/main.py#L73)  | store push subscription |
| POST | `/push/send`               | [main.py:89](../backend/main.py#L89)  | broadcast push |
| GET  | `/weather`                 | [main.py:138](../backend/main.py#L138)| Open-Meteo proxy |
| GET  | `/merchants`               | [main.py:208](../backend/main.py#L208)| catalog dump |
| GET  | `/merchant/{id}/status`    | [main.py:213](../backend/main.py#L213)| single payone signal |
| POST | `/offer`                   | [main.py:220](../backend/main.py#L220)| ranked quiet-merchant + AI text |
| GET  | `/merchant/stats`          | [main.py:264](../backend/main.py#L264)| static demo dashboard |

---

## 6. End-to-end happy path

1. User opens `http://localhost:5173` → [main.tsx](../frontend/src/main.tsx) → [App.tsx](../frontend/src/App.tsx) → [HomePage.tsx](../frontend/src/pages/HomePage.tsx).
2. Geolocation + `/weather` resolved in parallel.
3. `/offer` hit → backend ranks quiet merchants ([payone_mock.py](../backend/payone_mock.py)) → AI text ([ai_service.py](../backend/ai_service.py)) → JSON back.
4. [MomentCard.tsx](../frontend/src/components/MomentCard.tsx) renders, user accepts.
5. [WowMap.tsx](../frontend/src/components/WowMap.tsx) flies to merchant.
6. [RedeemSheet.tsx](../frontend/src/components/RedeemSheet.tsx) → [JournalEntry.tsx](../frontend/src/components/JournalEntry.tsx).
7. (Parallel) Merchant tab fires `/push/send` → [sw.js](../frontend/public/sw.js) shows OS notification on phone via ngrok tunnel.

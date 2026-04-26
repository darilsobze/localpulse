# LocalPulse — End-to-End App Flow

How the app works from boot to cashback, with the file touched at every step.

---

## 0. Repository layout (relevant files)

| Layer | File | Role |
|---|---|---|
| Backend entry | [main.py](main.py) | FastAPI app, all HTTP routes, serves static frontend |
| AI engine | [ai_service.py](ai_service.py) | GPT-4o-mini offer text + template fallback |
| Demand mock | [payone_mock.py](payone_mock.py) | Per-merchant transaction density / quiet score |
| Events mock | [events_mock.py](events_mock.py) | Local event calendar + composite context label |
| Persistence | [database.py](database.py) | SQLite (subscriptions, redemptions, wallet, settings, dismissals) |
| Merchant data | [data/merchants.json](data/merchants.json) | Static merchant catalog (id, location, category, limits) |
| SQLite file | `localpulse.db` (auto-created at repo root) | Runtime DB, created by `init_db()` |
| Frontend (single-page) | [demo_3d_map.html](demo_3d_map.html) | Mapbox 3D map + all UI panels + client logic |
| Push worker | [frontend/dist/sw.js](frontend/dist/sw.js) | Service worker for web-push notifications |
| PWA manifest | [frontend/dist/manifest.json](frontend/dist/manifest.json) | Install metadata |
| Config | `.env` (from [.env.example](.env.example)) | OpenAI key, Mapbox token, VAPID keys |
| Mapbox config | `config.js` (served at `/config.js`) | Exposes `CONFIG.MAPBOX_TOKEN` to browser |

> Note: `frontend/` is a separate React build (untracked). The currently wired UI is the standalone [demo_3d_map.html](demo_3d_map.html) served at `/`.

---

## 1. Server boot

Trigger: `uvicorn main:app --reload --port 8000`

1. [main.py:41](main.py#L41) — `load_dotenv()` reads `.env` (OpenAI, VAPID, Mapbox).
2. [main.py:48-49](main.py#L48-L49) — load `data/merchants.json` into `MERCHANTS`.
3. [main.py:51](main.py#L51) — `_register_merchants(MERCHANTS)` populates [payone_mock.py](payone_mock.py) lookup cache.
4. [main.py:52](main.py#L52) — `init_db()` ([database.py:29](database.py#L29)) creates 5 tables in `localpulse.db`: `push_subscriptions`, `redemptions`, `wallet`, `merchant_settings`, `dismissals`.
5. [main.py:55-63](main.py#L55-L63) — FastAPI app + permissive CORS.

---

## 2. First page load

Browser hits `GET /`.

1. [main.py:68-70](main.py#L68-L70) `serve_demo()` returns [demo_3d_map.html](demo_3d_map.html).
2. HTML loads Mapbox GL JS + qrcodejs from CDNs and `/config.js` ([main.py:72-77](main.py#L72-L77)) for the Mapbox token.
3. [demo_3d_map.html:749](demo_3d_map.html#L749) instantiates `WowEffect` (3D Mapbox satellite-streets style + 3D buildings layer at [demo_3d_map.html:656](demo_3d_map.html#L656)).
4. [demo_3d_map.html:1283](demo_3d_map.html#L1283) — `runContextChecks()` kicks off Module 01.

---

## 3. Module 01 — Context Sensing

Sequence in `runContextChecks()` ([demo_3d_map.html:864](demo_3d_map.html#L864)):

| Step | Frontend | Backend route | Backend file | External |
|---|---|---|---|---|
| Time | `checkTime()` [demo_3d_map.html:804](demo_3d_map.html#L804) | — | — | — |
| Location | `checkLocation()` [demo_3d_map.html:810](demo_3d_map.html#L810) (`navigator.geolocation`) | — | — | Mapbox geocoding (reverse) |
| Weather | `checkWeather(ll)` [demo_3d_map.html:832](demo_3d_map.html#L832) | `GET /api/weather?lat&lng` [main.py:98](main.py#L98) | `_wmo_desc` / `_wmo_condition` [main.py:128-147](main.py#L128-L147) | Open-Meteo API |
| Demand | `fetchOffer(ll)` [demo_3d_map.html:841](demo_3d_map.html#L841) | `POST /api/offer` [main.py:281](main.py#L281) | see Module 02 below | OpenAI (optional) |

Each row resolves via `resolveRow()` [demo_3d_map.html:790](demo_3d_map.html#L790) (spinner → tick).

Map is centered on the user via `wow.updateUserLocation()` [demo_3d_map.html:616](demo_3d_map.html#L616).

---

## 4. Module 02 — Generative Offer Engine

`POST /api/offer` pipeline in [main.py:281-389](main.py#L281-L389):

1. **Filter by radius** — `_haversine` [main.py:266](main.py#L266) keeps merchants within `radius_m` of user.
2. **Payone signal** — for each candidate, `get_payone_signal(id)` [payone_mock.py:51](payone_mock.py#L51) computes `current_tph` vs hourly pattern in `_PATTERNS` [payone_mock.py:16](payone_mock.py#L16); returns `quiet_score` and `is_quiet` (>0.40). Merchants flagged `_demo_force_quiet` ([data/merchants.json](data/merchants.json)) are forced low.
3. **Events + time slot** — `get_active_events()` [events_mock.py:66](events_mock.py#L66) + `get_time_slot()` [events_mock.py:76](events_mock.py#L76).
4. If no quiet candidates → return `no_offer` with `context_state` only ([main.py:322-335](main.py#L322-L335)).
5. **Pick quietest** by score ([main.py:338-339](main.py#L338-L339)).
6. **Apply merchant settings** — `get_merchant_settings(id)` [database.py:193](database.py#L193) overrides JSON `max_discount_pct` if a merchant saved one.
7. **Generate offer text** — `generate_offer_text(merchant, context)` [ai_service.py:115](ai_service.py#L115):
   - If `OPENAI_API_KEY` set → GPT-4o-mini call with strict JSON schema [ai_service.py:141-156](ai_service.py#L141-L156).
   - Else → category × weather template lookup `_TEMPLATES` [ai_service.py:57](ai_service.py#L57), final fallback [ai_service.py:108](ai_service.py#L108).
   - GDPR: only category + weather string sent to OpenAI, never raw GPS.
8. **Build composite label** — `composite_label()` [events_mock.py:86](events_mock.py#L86) combines temp + condition + quiet + slot + first event.
9. **Response** — merchant info, offer text, distance, social-proof coords (`_social_proof_coords` [main.py:274](main.py#L274)), `expires_in_sec=900`, full `context_state` with signal pills.

Frontend renders the offer card via `showOfferCard()` [demo_3d_map.html:884](demo_3d_map.html#L884) with countdown `startCountdown()` [demo_3d_map.html:918](demo_3d_map.html#L918).

---

## 5. User decision

### Dismiss
- `btn-dismiss` handler [demo_3d_map.html:961](demo_3d_map.html#L961) → `POST /api/dismiss` [main.py:435](main.py#L435) → `insert_dismissal()` [database.py:218](database.py#L218). Resets to scan.
- Same on countdown expiry (`onExpired()` [demo_3d_map.html:933](demo_3d_map.html#L933)) with `reason="expired"`.

### Accept (the "WOW" flight)
1. `btn-accept` [demo_3d_map.html:946](demo_3d_map.html#L946) → `wow.trigger()` [demo_3d_map.html:627](demo_3d_map.html#L627) flies camera to merchant, drops target marker + social-proof pulses.
2. `onFlightComplete` [demo_3d_map.html:753](demo_3d_map.html#L753) → `wow.showRoute()` [demo_3d_map.html:639](demo_3d_map.html#L639) calls **Mapbox Directions API** for walking route, draws orange line, shows ETA banner.
3. User taps "Show QR" → `openQR()` [demo_3d_map.html:986](demo_3d_map.html#L986) generates `LP-<MID>-<ts>-<rand>` code (`genOfferCode()` [demo_3d_map.html:741](demo_3d_map.html#L741)) and renders QR.

---

## 6. Module 03 — Checkout & Redemption

`confirmRedeem()` [demo_3d_map.html:1015](demo_3d_map.html#L1015):

1. `POST /api/redeem` [main.py:405](main.py#L405).
2. `insert_redemption()` [database.py:104](database.py#L104) writes row (UNIQUE on `offer_code`).
3. `add_cashback()` [database.py:174](database.py#L174) bumps `wallet.balance_eur` and increments per-merchant stamp in `stamps_json`.
4. Response → success screen with `+€X.XX` confirmation.

---

## 7. Wallet tab

`switchTab('wallet')` → `loadWallet()` [demo_3d_map.html:1083](demo_3d_map.html#L1083) parallel-fetches:

- `GET /api/wallet/{user_id}` [main.py:444](main.py#L444) → `get_wallet()` [database.py:160](database.py#L160) (creates row on first read).
- `GET /api/wallet/{user_id}/history` [main.py:449](main.py#L449) → `get_redemptions()` [database.py:120](database.py#L120) (last 20).

`renderWallet()` [demo_3d_map.html:1102](demo_3d_map.html#L1102) draws balance, stamp grid, history list.

---

## 8. Merchant tab

`loadMerchant()` [demo_3d_map.html:1147](demo_3d_map.html#L1147) parallel-fetches for `m_1`:

- `GET /api/merchant/stats` [main.py:190](main.py#L190) — combines `merchant_stats()` [database.py:129](database.py#L129) (accept/dismiss counts, accept rate, cashback, recovered revenue) + live `get_payone_signal()` [payone_mock.py:51](payone_mock.py#L51).
- `GET /api/merchant/{id}/settings` [main.py:220](main.py#L220) — falls back to JSON limits if not yet saved.

`renderMerchant()` [demo_3d_map.html:1167](demo_3d_map.html#L1167) shows live signal dot, KPI grid, AI insight string, two sliders (max discount, quiet gap), and a test-push button.

`wireSliders()` [demo_3d_map.html:1242](demo_3d_map.html#L1242):
- Save → `PUT /api/merchant/{id}/settings` [main.py:238](main.py#L238) → `upsert_merchant_settings()` [database.py:202](database.py#L202). Next `/api/offer` call uses these new caps.
- Test push → `POST /api/push/send` (next section).

---

## 9. Web push (delivery channel for Module 01)

Subscription side (frontend not shown in `demo_3d_map.html`; requires manual subscribe via PWA flow → `/api/subscribe` [main.py:470](main.py#L470) → `upsert_subscription()` [database.py:76](database.py#L76)). Public VAPID key served by `/api/vapid-public-key` [main.py:458](main.py#L458).

Send side ([main.py:482](main.py#L482)):
1. `POST /api/push/send` reads all subscribers via `all_subscriptions()` [database.py:91](database.py#L91).
2. `pywebpush.webpush()` posts encrypted payload to each browser endpoint.
3. Dead endpoints (HTTP 404/410) pruned via `delete_subscription()`.
4. Browser → [frontend/dist/sw.js](frontend/dist/sw.js) `push` listener shows native notification with Accept/Later actions; click reopens app.

---

## 10. Reset loop

After dismiss / expiry / success-home: `resetToScan()` [demo_3d_map.html:1058](demo_3d_map.html#L1058) clears state and re-runs `runContextChecks()` after 300 ms — context cycle restarts at step 3.

---

## End-to-end at a glance

```
boot ─► main.py loads merchants.json + init_db() ─► uvicorn
GET /                       → demo_3d_map.html
GET /config.js              → Mapbox token
GET /api/weather            → main._wmo_*       (Open-Meteo)
POST /api/offer             → main → payone_mock + events_mock + database + ai_service (→ OpenAI)
POST /api/dismiss           → database.insert_dismissal
POST /api/redeem            → database.insert_redemption + add_cashback
GET /api/wallet/{u}[/hist]  → database.get_wallet / get_redemptions
GET /api/merchant/stats     → database.merchant_stats + payone_mock.get_payone_signal
PUT /api/merchant/{id}/settings → database.upsert_merchant_settings
POST /api/push/send         → pywebpush → sw.js → notification
```

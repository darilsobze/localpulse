# Merge summary — HIS_WORK + MY_WORK → backend/ + frontend/

## Phase A — Backend (root `backend/`)
- Copied from `HIS_WORK/`: `main.py`, `database.py`, `ai_service.py`, `payone_mock.py`, `events_mock.py`, `requirements.txt`, `.env.example`, `data/merchants.json`.
- Edited `backend/main.py`:
  - Removed `from fastapi.responses import FileResponse` import.
  - Removed `GET /` route (`serve_demo`) — React app replaces it.
  - Removed `GET /config.js` route (`serve_config`) — Mapbox token now lives in `frontend/.env.local`.
- All 5 Python files pass `ast.parse` syntax check.

## Phase B — Frontend (root `frontend/`)
- Copied entire `MY_WORK/frontend/` tree (src/, public/, configs, dotfiles, package-lock).
- **B1.** `frontend/vite.config.ts`: dropped `rewrite: (path) => path.replace(/^\/api/, '')` from both `server.proxy` and `preview.proxy`. `/api/*` now passes through to backend `/api/*` routes verbatim.
- **B5.** `frontend/src/lib/api.ts`: added `getJson<T>`, `postJson<T>`, `putJson<T>` helpers (8s timeout, throw on non-2xx) alongside existing `apiUrl()`.
- **B3.** `frontend/src/components/RedeemSheet.tsx`:
  - New props `merchantId`, `merchantName`, `discountPct`, `cashbackEur`, `userId='demo_user'`.
  - Added `genOfferCode(merchantId)` → `LP-{MID}-{base36-ts}-{rand}`.
  - On QR phase, fires `POST /api/redeem` with full payload before flipping to `confirmed`. Logs + ignores backend error.
  - Computed cashback: `Math.round(6 * discount_pct) / 100` (overridable via prop).
  - QR value now `LOCALPULSE://moment/{offerCode}` (was hardcoded `BF-DA-LUI-AMINE-31C`).
  - Replaced hardcoded `BACK FACTORY` strings with `{merchantName}`.
  - Replaced hardcoded `+€1.80` strings with `+€{computedCashback.toFixed(2)}`.
- **B4.** `frontend/src/pages/HomePage.tsx`:
  - Imported `postJson`, added `USER_ID = 'demo_user'` constant.
  - Added `handleDismiss()` that fires `POST /api/dismiss` with `{user_id, merchant_id, reason:'user_dismissed'}` then calls `handleReplay()`.
  - Wired `MomentCard onDismiss={handleDismiss}` (was `handleReplay`).
  - Wired `RedeemSheet` with `merchantId={offer.merchant_id}`, `merchantName`, `discountPct`, `userId`. Now only renders when `offer` is non-null.
- **B6.** `frontend/src/pages/WalletPage.tsx` — full rewrite:
  - `useEffect` fetches `/wallet/demo_user` + `/wallet/demo_user/history` in parallel via `getJson`.
  - Decodes `stamps_json` (JSON string from SQLite) into `[{merchant, count}]`.
  - Renders live balance, stamps, journal entries (merchant_name, discount_pct, cashback_eur, relative date).
  - Empty-state copy when no data, "Loading…" before first response.
- **B7.** `frontend/src/pages/MerchantPage.tsx` — full rewrite:
  - Loads `/merchant/stats` + `/merchant/m_1/settings` on mount.
  - Slider `onMouseUp`/`onTouchEnd` → `PUT /api/merchant/m_1/settings`. Inline save status indicator (saving/saved/error).
  - Stat tiles read live `offers_sent`, `accepted`, `recovered_revenue_eur`, `cashback_total_eur` from backend.
  - "Live quiet score" bar bound to `quiet_score` from `/merchant/stats`.
  - Push button still hits `/api/push/send`; body now uses live merchant name.
- Untouched (already correct): `WowEffect.js` (byte-identical to HIS), `WowMap.tsx`, `MomentCard.tsx`, `offer.ts`, `weather.ts`, `push.ts`, `sw.js`, `manifest.json`, all visuals.

## Phase C — Root scaffolding
- Copied `MY_WORK/package.json`, `MY_WORK/start-ngrok.js`, `MY_WORK/.gitignore` to repo root.
- Wrote new top-level `README.md` covering quick-start, layout, end-to-end flow.

## Phase D — Cleanup
- `MY_WORK/` and `HIS_WORK/` preserved on disk per locked decision.

## Locked decisions
- `user_id = "demo_user"` everywhere.
- Cashback computed as `6 * discount_pct / 100`.
- Wallet + Merchant pages live-wired, not static.

## Verification status
- Backend: `ast.parse` passed on all 5 .py files.
- Frontend: not yet `npm install`-ed → no `tsc --noEmit` run. Awaiting user verification:
  - `cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
  - `cd frontend && npm install && npm run dev`
  - Smoke check: `/health`, `POST /api/offer`, accept→flight→QR→wallet balance updates.

## Known follow-ups (not blockers)
- `frontend/.env.local` was carried over from `MY_WORK/` — may contain a real Mapbox token; verify before pushing to remote.
- `backend/.env` does NOT exist yet; user must `cp backend/.env.example backend/.env` and fill `OPENAI_API_KEY`, `MAPBOX_TOKEN`, `VAPID_*`.
- `backend/localpulse.db` will be auto-created by `init_db()` on first boot.
- Push notifications need VAPID keys + ngrok tunnel for phone testing.

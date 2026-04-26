# LocalPulse

Generative city-wallet hackathon project. Final merged build under `backend/` (FastAPI) and `frontend/` (React + Vite + TS).

## Quick start

### Backend
```
cd backend
python -m venv .venv
source .venv/Scripts/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill OPENAI_API_KEY, MAPBOX_TOKEN, VAPID_*
uvicorn main:app --reload --port 8000
```
Health: <http://localhost:8000/health> · Docs: <http://localhost:8000/docs>

### Frontend
```
cd frontend
npm install
cp .env.example .env.local       # set VITE_MAPBOX_TOKEN
npm run dev
```
Open <http://localhost:5173>. Vite proxies `/api/*` to `localhost:8000`.

### ngrok tunnel (mobile push demo)
```
npm install                      # at repo root
node start-ngrok.js
```

## Layout
```
backend/                FastAPI: context sensing, offer engine, redeem, wallet, push
  main.py               all routes (/api/*)
  database.py           SQLite (subscriptions, redemptions, wallet, settings, dismissals)
  ai_service.py         GPT-4o-mini offer-text generation + template fallback
  payone_mock.py        per-merchant transaction density
  events_mock.py        local event calendar + composite context label
  data/merchants.json   merchant catalog
frontend/               React + Vite + TS
  src/pages/            HomePage, DiscoverPage, WalletPage, MerchantPage
  src/components/       MomentCard, RedeemSheet, JournalEntry, WowMap, …
  src/wow/WowEffect.js  Mapbox cinematic flight (3D buildings, route, social-proof pulses)
  src/lib/              api, offer, weather, push helpers
HIS_WORK/, MY_WORK/     pre-merge source branches, kept for reference
```

## End-to-end flow
1. `GET /` → React app boots, geolocation + `/api/weather` in parallel.
2. `POST /api/offer` → context sensing + payone mock + events + GPT-4o-mini → MomentCard.
3. Accept → WowMap cinematic flight → RedeemSheet QR.
4. RedeemSheet → `POST /api/redeem` → `add_cashback` → success.
5. WalletPage → `GET /api/wallet/demo_user[/history]` → live balance/journal.
6. MerchantPage → `GET /api/merchant/stats`, `PUT /api/merchant/m_1/settings`, `POST /api/push/send`.
7. Dismiss → `POST /api/dismiss` → feeds accept-rate KPI.

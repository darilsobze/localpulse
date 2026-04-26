import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AmbientSky from '../components/AmbientSky';
import TopBar from '../components/TopBar';
import MomentCard from '../components/MomentCard';
import WowMap, { type WowMapHandle } from '../components/WowMap';
import RedeemSheet from '../components/RedeemSheet';
import JournalEntry from '../components/JournalEntry';
import type { WeatherData } from '../lib/weather';
import { fetchWeather } from '../lib/weather';
import {
  fetchOffer,
  getUserCoords,
  DEFAULT_COORDS,
  type OfferResponse,
} from '../lib/offer';
import { postJson } from '../lib/api';

const USER_ID = 'demo_user';

type Stage = 'lockscreen' | 'card' | 'flight' | 'route' | 'arrived' | 'journal';

const USER = 'Amine';
const CITY = 'Darmstadt';
const DEMO_WEATHER: WeatherData = {
  temp: 12,
  description: 'Sunny',
  condition: 'sunny',
  windspeed: 8,
  raw_code: 0,
};

function asDemoWeather(weather: WeatherData | null): WeatherData {
  return { ...DEMO_WEATHER, windspeed: weather?.windspeed ?? DEMO_WEATHER.windspeed };
}

function buildReasons(offer: OfferResponse, temp: number): { icon: string; text: string }[] {
  const signal = offer.payone_signal;
  const quietPct = Math.round((1 - signal.current_tph / Math.max(signal.expected_tph, 0.1)) * 100);
  return [
    { icon: '☀', text: `${temp}°C and sunny: hoodie weather after training.` },
    { icon: '📍', text: `You left All Inclusive Fitness and are waiting by transit.` },
    { icon: '🥤', text: `${offer.merchant_name} is ${offer.distance_m}m away, close enough before the next tram.` },
    { icon: '🧠', text: `Quiet counter window: ${quietPct}% below expected traffic right now.` },
  ];
}

function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('card');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [offer, setOffer] = useState<OfferResponse | null>(null);
  const [userCoords, setUserCoords] = useState<{ lng: number; lat: number }>(DEFAULT_COORDS);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [route, setRoute] = useState<{ distance: number; duration: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const wowMapRef = useRef<WowMapHandle>(null);
  const pendingTriggerRef = useRef(false);

  // Bootstrap: geolocation + weather → offer
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [coords, w] = await Promise.all([getUserCoords(), fetchWeather()]);
      if (cancelled) return;
      const demoWeather = asDemoWeather(w);
      setUserCoords(coords);
      setWeather(demoWeather);
      const o = await fetchOffer(coords, demoWeather);
      if (cancelled) return;
      setOffer(o);
      setLoadingOffer(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => fetchWeather().then((w) => setWeather(asDemoWeather(w))), 30000);
    return () => clearInterval(timer);
  }, []);

  // When stage flips to 'flight', trigger the wow flight. If the map style isn't
  // loaded yet, defer until onReady fires.
  useEffect(() => {
    if (stage !== 'flight') return;

    const fire = () => {
      const t = setTimeout(() => wowMapRef.current?.trigger(), 350);
      return () => clearTimeout(t);
    };

    if (mapReady && wowMapRef.current?.isReady()) {
      return fire();
    }
    pendingTriggerRef.current = true;
  }, [stage, mapReady]);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
    if (pendingTriggerRef.current && stage === 'flight') {
      pendingTriggerRef.current = false;
      setTimeout(() => wowMapRef.current?.trigger(), 350);
    }
  }, [stage]);

  const handleReplay = () => {
    wowMapRef.current?.reset();
    setRoute(null);
    setStage('lockscreen');
  };

  const handleDismiss = async () => {
    if (offer?.merchant_id) {
      try {
        await postJson('/dismiss', {
          user_id: USER_ID,
          merchant_id: offer.merchant_id,
          reason: 'user_dismissed',
        });
      } catch (e) {
        console.warn('[dismiss] backend log failed:', e);
      }
    }
    handleReplay();
  };

  // Flight done → show full walking route + ETA banner. Stays on 'route' stage
  // until user taps "Show QR", which opens the RedeemSheet on 'arrived'.
  const handleFlightComplete = useCallback(async () => {
    setStage('route');
    try {
      const r = await wowMapRef.current?.showRoute({
        padding: { top: 96, bottom: 168, left: 32, right: 32 },
        pitch: 54,
        duration: 1800,
      });
      if (r) setRoute(r);
    } catch (e) {
      console.warn('[route] showRoute failed:', e);
    }
  }, []);

  // User taps "Show QR" → open the centered RedeemSheet.
  const handleShowQR = useCallback(async () => {
    setStage('arrived');
    try {
      const r = await wowMapRef.current?.showRoute({
        padding: { top: 140, bottom: 180, left: 50, right: 50 },
        pitch: 40,
        duration: 1200,
      });
      if (r) setRoute(r);
    } catch (e) {
      console.warn('[route] re-fit failed:', e);
    }
  }, []);

  const showWowMap = stage === 'flight' || stage === 'route' || stage === 'arrived';
  const temp = weather?.temp || 12;

  const targetLngLat: [number, number] = offer?.targetLngLat ?? [8.650439, 49.872310];
  const socialProofCoords = (offer?.social_proof_coords ?? []) as [number, number][];
  const userLngLat: [number, number] = [userCoords.lng, userCoords.lat];

  // Pre-mount map as soon as we have an offer so the Mapbox style finishes
  // loading before the user taps "Accept" (avoids the "Style is not done loading"
  // race we saw with on-demand mount).
  const wowMapMounted = !!offer;

  return (
    <div className="relative w-full h-full overflow-hidden bg-paper">
      <AmbientSky />

      <div className="absolute inset-x-0 top-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-10 flex flex-col">
        <TopBar temp={temp} city={CITY} user={USER} />

        <div className="px-6 mt-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: stage === 'card' ? 1 : 0, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-stone-800/85"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-stone-700/55">
              {weather?.description || 'Loading…'}
            </div>
            <h1 className="serif text-[27px] leading-[1.02] mt-0.5 text-stone-900">
              The tram is coming,<br />but recovery is closer.
            </h1>
            <p className="mt-1 text-[12px] text-stone-700/75 max-w-[280px] leading-snug">
              Post-training, near transit, one quiet counter at BACK FACTORY opened.
            </p>
          </motion.div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <AnimatePresence mode="wait">
            {stage === 'card' && offer && !loadingOffer && (
              <MomentCard
                key="card"
                onAccept={() => setStage('flight')}
                onDismiss={handleDismiss}
                title={offer.offer.title}
                description={offer.offer.description}
                merchantName={offer.merchant_name}
                merchantArea={offer.merchant_address.split(',')[0] || CITY}
                distanceM={offer.distance_m}
                discountPct={offer.offer.discount_pct}
                validSeconds={offer.expires_in_sec}
                reasons={buildReasons(offer, temp)}
              />
            )}

            {stage === 'card' && loadingOffer && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px] uppercase tracking-[0.25em] text-stone-700/55"
              >
                Reading the city…
              </motion.div>
            )}

            {stage === 'journal' && (
              <motion.div key="journal" exit={{ opacity: 0, y: -20 }}>
                <JournalEntry onMap={handleReplay} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pb-2 text-center text-[9px] tracking-[0.25em] uppercase text-stone-700/45">
          local pulse · {CITY.toLowerCase()}
        </div>
      </div>

      {wowMapMounted && (
        <motion.div
          key="wowmap"
          initial={false}
          animate={{ opacity: showWowMap ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-20"
          style={{ pointerEvents: showWowMap ? 'auto' : 'none' }}
        >
          <WowMap
            ref={wowMapRef}
            onFlightComplete={handleFlightComplete}
            onReady={handleMapReady}
            userLngLat={userLngLat}
            targetLngLat={targetLngLat}
            socialProofCoords={socialProofCoords}
          />

          {/* Soft tint while sheet is up so the route still reads */}
          {stage === 'arrived' && (
            <div className="absolute inset-0 bg-stone-900/20 pointer-events-none" />
          )}

          <AnimatePresence>
            {(stage === 'route' || stage === 'arrived') && route && (
              <motion.div
                key="eta-banner"
                initial={{ x: '-50%', y: -20, opacity: 0 }}
                animate={{ x: '-50%', y: 0, opacity: 1 }}
                exit={{ x: '-50%', y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute left-1/2 z-30 pointer-events-none"
                style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
              >
                <div className="glass rounded-full px-5 py-2.5 text-center shadow-xl">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-stone-700/60">
                    On foot
                  </div>
                  <div className="serif text-[20px] leading-none mt-0.5 text-stone-900">
                    {Math.max(1, Math.ceil(route.duration / 60))} min
                  </div>
                  <div className="text-[10px] tracking-wide text-stone-700/65 mt-0.5">
                    {formatRouteDistance(route.distance)} · walking
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Route action bar: visible only on the 'route' stage */}
          <AnimatePresence>
            {stage === 'route' && offer && (
              <motion.div
                key="route-action"
                initial={{ x: '-50%', y: 24, opacity: 0 }}
                animate={{ x: '-50%', y: 0, opacity: 1 }}
                exit={{ x: '-50%', y: 24, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute left-1/2 z-30 w-full max-w-[420px] px-4"
                style={{
                  bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1.25rem)',
                }}
              >
                <div className="glass rounded-3xl px-5 py-4 flex items-center gap-3 shadow-2xl">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-700/60">
                      Heading to
                    </div>
                    <div className="serif text-[16px] text-stone-900 truncate">
                      {offer.merchant_name}
                    </div>
                  </div>
                  <motion.button
                    onClick={handleShowQR}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    className="shrink-0 h-11 px-5 rounded-full bg-stone-900 text-white text-[13px] font-medium shadow-lg"
                  >
                    Show QR
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {stage === 'arrived' && offer && (
          <RedeemSheet
            key="redeem"
            onDone={() => setStage('journal')}
            merchantId={offer.merchant_id}
            merchantName={offer.merchant_name}
            discountPct={offer.offer.discount_pct}
            offerTitle={offer.offer.title}
            userId={USER_ID}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

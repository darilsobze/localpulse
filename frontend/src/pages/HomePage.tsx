import { useEffect, useRef, useState } from 'react';
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

type Stage = 'lockscreen' | 'card' | 'flight' | 'arrived' | 'journal';

const USER = 'Amine';
const CITY = 'Darmstadt';

function buildReasons(offer: OfferResponse, temp: number): { icon: string; text: string }[] {
  const signal = offer.payone_signal;
  const quietPct = Math.round((1 - signal.current_tph / Math.max(signal.expected_tph, 0.1)) * 100);
  return [
    { icon: '☀', text: `It's ${temp}°C. ${offer.offer.weather_context.replace('_', ' ')} window.` },
    { icon: '📍', text: `You're ${offer.distance_m}m from ${offer.merchant_name}.` },
    { icon: '🥨', text: `They're quiet — ${quietPct}% below expected traffic right now.` },
    { icon: '🧠', text: offer.offer.source === 'openai' ? 'Personalised by AI for this moment.' : 'Matched to your routine.' },
  ];
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('card');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [offer, setOffer] = useState<OfferResponse | null>(null);
  const [userCoords, setUserCoords] = useState<{ lng: number; lat: number }>(DEFAULT_COORDS);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const wowMapRef = useRef<WowMapHandle>(null);

  // Bootstrap: geolocation + weather → offer
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [coords, w] = await Promise.all([getUserCoords(), fetchWeather()]);
      if (cancelled) return;
      setUserCoords(coords);
      setWeather(w);
      const o = await fetchOffer(coords, w);
      if (cancelled) return;
      setOffer(o);
      setLoadingOffer(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Refresh weather periodically (offer stays sticky for the session)
  useEffect(() => {
    const timer = setInterval(() => fetchWeather().then(setWeather), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 'flight') {
      const t = setTimeout(() => wowMapRef.current?.trigger(), 350);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const handleReplay = () => {
    wowMapRef.current?.reset();
    setStage('lockscreen');
  };

  const refreshOffer = async () => {
    setLoadingOffer(true);
    const o = await fetchOffer(userCoords, weather);
    setOffer(o);
    setLoadingOffer(false);
    setStage('card');
  };

  const showWowMap = stage === 'flight' || stage === 'arrived';
  const temp = weather?.temp || 28;

  const targetLngLat: [number, number] = offer?.targetLngLat ?? [8.6498, 49.8723];
  const socialProofCoords = (offer?.social_proof_coords ?? []) as [number, number][];
  const userLngLat: [number, number] = [userCoords.lng, userCoords.lat];

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
              The city is warm,<br />and slowing down.
            </h1>
            <p className="mt-1 text-[12px] text-stone-700/75 max-w-[280px] leading-snug">
              One place near you went quiet. We listened for the right moment.
            </p>
          </motion.div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <AnimatePresence mode="wait">
            {stage === 'card' && offer && !loadingOffer && (
              <MomentCard
                key="card"
                onAccept={() => setStage('flight')}
                onDismiss={handleReplay}
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

      <AnimatePresence>
        {showWowMap && (
          <motion.div
            key="wowmap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20"
          >
            <WowMap
              ref={wowMapRef}
              onFlightComplete={() => setStage('arrived')}
              userLngLat={userLngLat}
              targetLngLat={targetLngLat}
              socialProofCoords={socialProofCoords}
            />
            {stage === 'arrived' && (
              <div className="absolute inset-0 bg-stone-900/25 pointer-events-none" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'arrived' && (
          <RedeemSheet key="redeem" onDone={() => setStage('journal')} />
        )}
      </AnimatePresence>

      <button
        onClick={refreshOffer}
        className="absolute bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+2.4rem)] right-3 z-50 text-[10px] text-stone-700/60 hover:text-stone-900 px-2 py-1 rounded-full glass-soft"
      >
        new moment
      </button>

      <button
        onClick={handleReplay}
        className="absolute bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] right-3 z-50 text-[10px] text-stone-700/60 hover:text-stone-900 px-2 py-1 rounded-full glass-soft"
      >
        replay
      </button>
    </div>
  );
}

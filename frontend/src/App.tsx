import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AmbientSky from './components/AmbientSky';
import TopBar from './components/TopBar';
import MomentCard from './components/MomentCard';
import RedeemSheet from './components/RedeemSheet';
import JournalEntry from './components/JournalEntry';
import CityMap from './components/CityMap';

type Stage = 'idle' | 'card' | 'redeem' | 'journal' | 'map';

const USER = 'Amine';
const CITY = 'Darmstadt';
const TEMP = 31;

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');

  // Auto-bloom Moment Card after small delay
  useEffect(() => {
    if (stage === 'idle') {
      const t = setTimeout(() => setStage('card'), 1400);
      return () => clearTimeout(t);
    }
  }, [stage]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <AmbientSky />

      <div className="relative z-10 h-full flex flex-col">
        <TopBar temp={TEMP} city={CITY} user={USER} />

        {/* Greeting */}
        <div className="px-6 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-stone-800/85"
          >
            <div className="text-[12px] uppercase tracking-[0.25em] text-stone-700/55">
              Sunday afternoon
            </div>
            <h1 className="serif text-[34px] leading-[1.05] mt-1 text-stone-900">
              The city is warm,<br />and slowing down.
            </h1>
            <p className="mt-2 text-[13px] text-stone-700/75 max-w-[280px]">
              Three places near you went quiet. We're listening for the right one.
            </p>
          </motion.div>
        </div>

        {/* Center stage */}
        <div className="flex-1 flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            {stage === 'idle' && (
              <motion.div
                key="listening"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-stone-800/60"
              >
                <div className="mx-auto w-3 h-3 rounded-full bg-amber-500/80 animate-ping" />
                <div className="mt-3 text-[12px] tracking-[0.2em] uppercase">listening to the city…</div>
              </motion.div>
            )}

            {stage === 'card' && (
              <motion.div key="card" exit={{ opacity: 0, y: -20 }}>
                <MomentCard
                  onAccept={() => setStage('redeem')}
                  onDismiss={() => setStage('idle')}
                />
              </motion.div>
            )}

            {stage === 'redeem' && (
              <motion.div key="redeem" exit={{ opacity: 0, y: -20 }}>
                <RedeemSheet onDone={() => setStage('journal')} />
              </motion.div>
            )}

            {stage === 'journal' && (
              <motion.div key="journal" exit={{ opacity: 0, y: -20 }}>
                <JournalEntry onMap={() => setStage('map')} />
              </motion.div>
            )}

            {stage === 'map' && (
              <motion.div key="map" exit={{ opacity: 0, y: -20 }}>
                <CityMap onBack={() => setStage('idle')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer hint */}
        <div className="pb-5 text-center text-[10px] tracking-[0.25em] uppercase text-stone-700/45">
          local pulse · {CITY.toLowerCase()}
        </div>
      </div>

      {/* Reset button — corner, tiny, for demo loops */}
      <button
        onClick={() => setStage('idle')}
        className="absolute bottom-3 right-3 z-50 text-[10px] text-stone-700/40 hover:text-stone-900 px-2 py-1 rounded-full glass-soft"
      >
        replay
      </button>
    </div>
  );
}

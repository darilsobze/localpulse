import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

type Props = {
  onAccept: () => void;
  onDismiss: () => void;
};

export default function MomentCard({ onAccept, onDismiss }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ y: 30, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 80, damping: 16 }}
      className="relative w-[360px] glass rounded-[28px] overflow-hidden"
    >
      {/* "Just appeared" pulse */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-70" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-stone-700/70">
          Just appeared · 12s ago
        </span>
      </div>

      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full glass-soft text-stone-700/60 text-sm hover:text-stone-900"
      >×</button>

      {/* Hero — iced coffee illustration via gradient + emoji */}
      <div className="relative h-[200px] mt-10 flex items-center justify-center">
        <div className="absolute inset-x-8 top-2 bottom-2 rounded-2xl"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(120,80,50,0.85), rgba(60,30,20,0.95))',
          }}
        />
        <div className="absolute inset-x-12 top-6 h-12 rounded-full"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5), transparent)' }}
        />
        {/* Ice cubes */}
        <div className="absolute top-12 left-16 w-7 h-7 rounded-md bg-white/70 rotate-12" />
        <div className="absolute top-16 right-20 w-6 h-6 rounded-md bg-white/60 -rotate-12" />
        <div className="absolute top-20 left-24 w-5 h-5 rounded-md bg-white/50 rotate-45" />
        {/* Condensation drops */}
        <div className="absolute bottom-8 left-10 w-1.5 h-2.5 rounded-full bg-white/70" />
        <div className="absolute bottom-12 right-12 w-1 h-2 rounded-full bg-white/60" />
        <div className="absolute bottom-6 right-20 w-1.5 h-3 rounded-full bg-white/70" />
        <div className="absolute -bottom-1 inset-x-12 h-8 rounded-b-2xl"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(60,30,15,0.4))' }}
        />
      </div>

      <div className="px-6 pt-5 pb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] tracking-[0.2em] uppercase text-stone-700/60">
            BACK FACTORY · Luisenplatz
          </span>
          <span className="text-[11px] text-stone-700/60">240m</span>
        </div>

        <h2 className="serif text-[28px] leading-[1.1] mt-2 text-stone-900">
          Iced coffee, on the house side.
        </h2>
        <p className="text-[14px] text-stone-700/80 mt-2 leading-snug">
          –30% on any cold drink + pretzel. Window seat is free, fan is on.
        </p>

        <button
          onClick={() => setWhyOpen(v => !v)}
          className="mt-4 inline-flex items-center gap-2 text-[12px] text-stone-800/70 hover:text-stone-900"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700/70" />
          {whyOpen ? 'Hide reasoning' : 'Tap to see why'}
          <span className={`transition-transform ${whyOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        <AnimatePresence initial={false}>
          {whyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-stone-700/15 text-[13px] leading-relaxed text-stone-800/85 space-y-1.5">
                <Reason icon="☀" text="It's 31°C and sunny. You usually slow down past noon." />
                <Reason icon="📍" text="You're 240m from BACK FACTORY at Luisenplatz." />
                <Reason icon="🥨" text="They're quiet — 38 minutes since the last walk-in." />
                <Reason icon="🧊" text="You bought iced coffee 4× in the last two weeks." />
                <p className="pt-2 text-[11px] text-stone-700/60 italic">
                  All reasoning runs on your device. Nothing left Darmstadt.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 h-12 rounded-full bg-stone-900 text-paper text-[14px] font-medium tracking-wide hover:bg-stone-800 transition active:scale-[0.98]"
          >
            Accept the moment
          </button>
          <button
            onClick={onDismiss}
            className="px-4 h-12 rounded-full glass-soft text-stone-800 text-[13px]"
          >
            Later
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Reason({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-4 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

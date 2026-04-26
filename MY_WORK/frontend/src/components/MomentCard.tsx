import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

type Reason = { icon: string; text: string };

type Props = {
  onAccept: () => void;
  onDismiss: () => void;
  title: string;
  description: string;
  merchantName: string;
  merchantArea: string;
  distanceM: number;
  discountPct: number;
  validSeconds?: number;
  reasons?: Reason[];
  basePriceEur?: number;
};

const PRODUCT_PHOTOS = {
  icedCoffee: 'https://images.unsplash.com/photo-1759259639354-830bc3120807?auto=format&fit=crop&w=900&q=80',
  pretzel: 'https://images.unsplash.com/photo-1511951786553-1d4f975424c9?auto=format&fit=crop&w=900&q=80',
};

function formatWalk(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 80));
  return `${minutes} min walk`;
}

export default function MomentCard({
  onAccept,
  onDismiss,
  title,
  description,
  merchantName,
  merchantArea,
  distanceM,
  discountPct,
  validSeconds = 15 * 60,
  reasons = [],
  basePriceEur = 6.0,
}: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [remaining, setRemaining] = useState(validSeconds);

  useEffect(() => {
    setRemaining(validSeconds);
  }, [validSeconds]);

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');
  const momentPrice = (basePriceEur * (1 - discountPct / 100)).toFixed(2);

  return (
    <motion.div
      layout
      initial={{ y: 30, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -20, opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 80, damping: 16 }}
      className="relative w-[min(344px,calc(100vw-24px))] glass rounded-[24px] overflow-hidden"
    >
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        <span className="text-[11px] font-medium tabular-nums tracking-wide text-stone-800">
          {mm}:{ss}
        </span>
      </div>

      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full glass-soft text-stone-700/60 text-sm hover:text-stone-900"
      >×</button>

      <div className="relative h-[142px] mt-8 px-4">
        <div
          className="absolute inset-x-6 top-5 bottom-2 rounded-[24px]"
          style={{
            background: 'radial-gradient(circle at 45% 35%, rgba(255,238,190,0.85), rgba(188,94,62,0.28) 52%, rgba(80,38,24,0.28))',
          }}
        />
        <motion.div
          initial={{ rotate: -7, y: 8 }}
          animate={{ rotate: [-7, -4, -7], y: [8, 0, 8] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-5 top-3 h-[118px] w-[142px] overflow-hidden rounded-[20px] border border-white/60 shadow-2xl shadow-stone-900/20"
        >
          <img
            src={PRODUCT_PHOTOS.icedCoffee}
            alt="Iced coffee with cream and ice"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/28 via-transparent to-white/15" />
          <span className="absolute bottom-2 left-2 rounded-full bg-white/78 px-2 py-0.5 text-[9px] font-medium text-stone-900 backdrop-blur">
            Iced coffee
          </span>
        </motion.div>
        <motion.div
          initial={{ rotate: 6, y: 0 }}
          animate={{ rotate: [6, 3, 6], y: [0, 9, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
          className="absolute right-5 top-7 h-[104px] w-[118px] overflow-hidden rounded-[20px] border border-white/60 shadow-2xl shadow-stone-900/20"
        >
          <img
            src={PRODUCT_PHOTOS.pretzel}
            alt="Fresh pretzel"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/30 via-transparent to-white/10" />
          <span className="absolute bottom-2 left-2 rounded-full bg-white/78 px-2 py-0.5 text-[9px] font-medium text-stone-900 backdrop-blur">
            Pretzel
          </span>
        </motion.div>
      </div>

      <div className="px-5 pt-3 pb-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] tracking-[0.18em] uppercase text-stone-700/60">
            {merchantName} · {merchantArea}
          </span>
          <span className="text-[10px] text-stone-700/60">{formatWalk(distanceM)}</span>
        </div>

        <h2 className="serif text-[23px] leading-[1.05] mt-1 text-stone-900">
          {title}
        </h2>
        <p className="text-[12px] text-stone-700/80 mt-1 leading-snug">
          {description}
        </p>

        <div className="mt-2 flex items-end justify-between gap-3 rounded-2xl bg-white/38 px-3 py-2 border border-white/45">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-stone-700/55">
              Moment price
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold tracking-tight text-emerald-700">
                €{momentPrice}
              </span>
              <span className="text-[12px] text-stone-700/50 line-through">
                €{basePriceEur.toFixed(2)}
              </span>
            </div>
          </div>
          <span className="mb-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[9px] font-medium text-emerald-800">
            save {discountPct}%
          </span>
        </div>

        {reasons.length > 0 && (
          <>
            <button
              onClick={() => setWhyOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-2 text-[11px] text-stone-800/70 hover:text-stone-900"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700/70" />
              {whyOpen ? 'Hide reasoning' : 'Why this, why now?'}
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
                  <div className="mt-3 pt-3 border-t border-stone-700/15 text-[12px] leading-relaxed text-stone-800/85 space-y-1">
                    {reasons.map((r, i) => (
                      <ReasonRow key={i} icon={r.icon} text={r.text} />
                    ))}
                    <p className="pt-2 text-[11px] text-stone-700/60 italic">
                      All reasoning runs on your device. Nothing left Darmstadt.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <div className="mt-3 flex gap-2">
          <motion.button
            onClick={onAccept}
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.98 }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex-1 h-11 overflow-hidden rounded-full bg-gradient-to-r from-emerald-600 via-lime-400 to-amber-400 bg-[length:220%_220%] text-stone-950 text-[14px] font-semibold tracking-wide shadow-[0_14px_35px_-16px_rgba(5,150,105,0.9)]"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-0 -left-12 w-12 rotate-12 bg-white/38 blur-sm"
              animate={{ x: [0, 230, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="relative">Accept</span>
          </motion.button>
          <button
            onClick={onDismiss}
            className="px-4 h-11 rounded-full glass-soft text-stone-800 text-[12px]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ReasonRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-4 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

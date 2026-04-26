import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'good' | 'warn' | 'neutral';
  hint?: string;
  pulseKey?: string | number;
};

export default function MetricTile({ label, value, delta, deltaTone = 'good', hint, pulseKey }: Props) {
  const deltaColor =
    deltaTone === 'good' ? 'var(--m-good)' :
    deltaTone === 'warn' ? 'var(--m-warn)' :
    'var(--m-text-mute)';

  return (
    <div className="m-card p-3.5 relative overflow-hidden">
      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-text-mute)' }}>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={pulseKey ?? value}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="num text-[22px] leading-none font-medium"
            style={{ color: 'var(--m-text)' }}
          >
            {value}
          </motion.div>
        </AnimatePresence>
        {delta && (
          <span className="num text-[10px] font-medium" style={{ color: deltaColor }}>
            {delta}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--m-text-mute)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

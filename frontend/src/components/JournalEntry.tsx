import { motion } from 'framer-motion';

type Props = { onMap: () => void };

export default function JournalEntry({ onMap }: Props) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
      className="w-[360px] glass rounded-[28px] p-6"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-stone-700/60">
          Moment Journal
        </div>
        <div className="text-[11px] text-stone-700/60">Sun · 26 Apr</div>
      </div>

      <div className="mt-4 flex gap-4">
        {/* Stamp */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -8 }}
          transition={{ type: 'spring', stiffness: 140, damping: 11, delay: 0.15 }}
          className="relative w-[96px] h-[96px] shrink-0"
        >
          <div className="absolute inset-0 rounded-full border-[2px] border-amber-800/70 flex items-center justify-center text-center"
            style={{
              background: 'radial-gradient(circle, rgba(255,228,180,0.6), rgba(220,160,90,0.35))',
              boxShadow: 'inset 0 0 0 4px rgba(120,60,20,0.08)',
            }}
          >
            <div>
              <div className="serif text-[14px] leading-none text-amber-900">BACK</div>
              <div className="serif text-[14px] leading-none text-amber-900">FACTORY</div>
              <div className="text-[8px] mt-1 tracking-[0.2em] text-amber-900/70">DARMSTADT</div>
              <div className="text-[8px] mt-0.5 text-amber-900/70">№ 01</div>
            </div>
          </div>
        </motion.div>

        <div className="flex-1">
          <div className="serif text-[18px] leading-tight text-stone-900">
            Choco-Latte after training
          </div>
          <div className="mt-1 text-[12px] text-stone-700/75">
            12°C · sunny · 100m detour
          </div>
          <div className="mt-2 text-[12px] text-stone-700/60">
            Saved €0.98 · -20%
          </div>
          <div className="mt-2 text-[11px] text-emerald-800/80">
            +1 Darmstadt stamp
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-stone-700/15 flex items-center justify-between text-[12px] text-stone-700/70">
        <div>Your week: 3 moments · €4.20 saved</div>
        <button onClick={onMap} className="text-stone-900 font-medium">See the city →</button>
      </div>
    </motion.div>
  );
}

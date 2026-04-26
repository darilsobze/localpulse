import { motion } from 'framer-motion';

type Props = { onTap: () => void };

export default function PushNotification({ onTap }: Props) {
  return (
    <motion.button
      onClick={onTap}
      initial={{ y: -120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 110, damping: 16, delay: 1.2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left rounded-2xl px-4 py-3 backdrop-blur-xl"
      style={{
        background: 'rgba(28, 22, 18, 0.62)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
        <span className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-[9px]">
          ◐
        </span>
        <span className="font-medium">PulseWallet</span>
        <span className="text-stone-300/60">· now</span>
      </div>
      <div className="mt-1.5 text-[14px] font-medium text-white leading-snug">
        Post-workout? Skip the wait.
      </div>
      <div className="text-[12px] text-stone-200/80 leading-snug mt-0.5">
        High-Protein Choco-Latte at BACK FACTORY · 100m · 20% off 15 min.
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-[0.16em] text-emerald-100/85">
        <span className="rounded-full bg-white/10 px-2 py-0.5">Status: post-training</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">Loc: tram stop</span>
      </div>
    </motion.button>
  );
}

import { motion } from 'framer-motion';
import PushNotification from './PushNotification';

type Props = { onUnlock: () => void };

export default function Lockscreen({ onUnlock }: Props) {
  const time = '14:23';
  const date = 'Sunday · 26 April';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
    >
      {/* Slight darken so the lockscreen reads as "phone off" over ambient sky */}
      <div className="absolute inset-0 bg-stone-900/15 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-[360px]">
        {/* Status row */}
        <div className="flex items-center justify-between text-[11px] text-white/85 px-2">
          <span className="font-medium tracking-wide">14:23</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span>●●●○</span>
            <span className="ml-1 px-1 py-[1px] rounded-sm border border-white/60 text-[9px]">82</span>
          </div>
        </div>

        {/* Big clock */}
        <div className="text-center mt-10">
          <div className="text-[13px] text-white/85 tracking-wide">{date}</div>
          <div
            className="serif text-white text-[96px] leading-none mt-2 font-light"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.35)' }}
          >
            {time}
          </div>
        </div>

        {/* Weather widget */}
        <div className="mt-6 flex items-center justify-center gap-2 text-white/90 text-[13px]">
          <span className="text-[18px]">☀</span>
          <span className="font-medium">31°</span>
          <span className="text-white/60">·</span>
          <span>Sunny in Darmstadt</span>
        </div>

        {/* Push */}
        <div className="mt-10">
          <PushNotification onTap={onUnlock} />
        </div>

        {/* Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2.4, duration: 0.6 }}
          className="text-center text-[11px] text-white/65 tracking-[0.2em] uppercase mt-12"
        >
          tap notification
        </motion.div>
      </div>
    </motion.div>
  );
}

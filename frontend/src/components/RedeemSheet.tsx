import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type Phase = 'qr' | 'confirmed';

type Props = {
  onDone: () => void;
};

export default function RedeemSheet({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('qr');

  useEffect(() => {
    const t = setTimeout(() => setPhase('confirmed'), 4200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === 'confirmed') {
      const t = setTimeout(onDone, 2400);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      className="fixed inset-x-0 top-0 z-[70] flex items-end justify-center px-3 pointer-events-none"
      style={{
        bottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-fab-overlap) + env(safe-area-inset-bottom) + clamp(0.5rem, 2vh, 1rem))',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
      }}
    >
      <div
        className="pointer-events-auto w-full max-w-[420px] overflow-y-auto glass rounded-[32px] px-6 pt-4 pb-7"
        style={{
          maxHeight: 'calc(100dvh - var(--bottom-nav-height) - var(--bottom-nav-fab-overlap) - env(safe-area-inset-bottom) - max(1rem, env(safe-area-inset-top)) - clamp(0.5rem, 2vh, 1rem))',
          boxShadow: '0 -20px 60px -20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Drag handle */}
        <div className="mx-auto w-10 h-1 rounded-full bg-stone-700/25" />

        <AnimatePresence mode="wait">
          {phase === 'qr' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center mt-3"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone-700/60">
                Show at counter · BACK FACTORY
              </div>
              <h3 className="serif text-[22px] mt-1 text-stone-900">
                You arrived. Scan to claim.
              </h3>

              <div className="mt-4 mx-auto w-[180px] h-[180px] rounded-2xl bg-white p-3 shadow-inner relative">
                <QRCodeSVG
                  value="LOCALPULSE://moment/BF-DA-LUI-AMINE-31C"
                  size={156}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1410"
                />
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: 156 }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                  className="absolute left-3 right-3 h-[2px] bg-amber-500/70 rounded-full"
                  style={{ boxShadow: '0 0 12px rgba(245,158,11,0.8)' }}
                />
              </div>

              {/* City Wallet badge */}
              <div className="mt-4 mx-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-soft text-[12px] text-stone-800">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] text-white"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                >€</span>
                <span className="font-medium">City Wallet</span>
                <span className="text-stone-700/55">· auto cashback</span>
              </div>

              <div className="mt-2 text-[12px] text-stone-700/70">
                +€1.80 back to your wallet · valid 13:42
              </div>

              <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-stone-700/55">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Waiting for POS confirmation…
              </div>
            </motion.div>
          )}

          {phase === 'confirmed' && (
            <motion.div
              key="ok"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center mt-3 pb-2"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.05 }}
                className="mx-auto w-[80px] h-[80px] rounded-full bg-emerald-500/15 border border-emerald-600/40 flex items-center justify-center"
              >
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                  <motion.path
                    d="M10 21 L18 28 L31 13"
                    stroke="#047857"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>
              <h3 className="serif text-[22px] mt-4 text-stone-900">Moment claimed.</h3>
              <p className="mt-2 text-[13px] text-stone-700/85 leading-snug">
                BACK FACTORY had a quiet Sunday hour.<br />You filled it.
              </p>
              <div className="mt-3 text-[11px] text-stone-700/60">
                +€1.80 in your City Wallet · stamp earned
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

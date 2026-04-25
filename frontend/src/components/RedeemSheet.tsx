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
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
      className="w-[360px] glass rounded-[28px] p-7 text-center"
    >
      <AnimatePresence mode="wait">
        {phase === 'qr' && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-700/60">
              Show at counter · BACK FACTORY
            </div>
            <h3 className="serif text-[22px] mt-2 text-stone-900">
              Your moment, ready.
            </h3>

            <div className="mt-5 mx-auto w-[200px] h-[200px] rounded-2xl bg-white p-4 shadow-inner relative">
              <QRCodeSVG
                value="LOCALPULSE://moment/BF-DA-LUI-AMINE-31C"
                size={168}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1410"
              />
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: 168 }}
                transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                className="absolute left-4 right-4 h-[2px] bg-amber-500/70 rounded-full"
                style={{ boxShadow: '0 0 12px rgba(245,158,11,0.8)' }}
              />
            </div>

            <p className="mt-4 text-[12px] text-stone-700/70">
              Valid 15 min · –30% cold drink + pretzel
            </p>

            <div className="mt-5 inline-flex items-center gap-2 text-[11px] text-stone-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Waiting for POS confirmation…
            </div>
          </motion.div>
        )}

        {phase === 'confirmed' && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 14 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.05 }}
              className="mx-auto w-[88px] h-[88px] rounded-full bg-emerald-500/15 border border-emerald-600/40 flex items-center justify-center"
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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
            <h3 className="serif text-[24px] mt-5 text-stone-900">Moment claimed.</h3>
            <p className="mt-2 text-[13px] text-stone-700/80 leading-snug">
              BACK FACTORY had a quiet Sunday hour.<br />You filled it.
            </p>
            <div className="mt-4 text-[11px] text-stone-700/60">
              Saved €1.80 · Stamp earned
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

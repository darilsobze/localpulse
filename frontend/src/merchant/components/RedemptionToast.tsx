import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { subscribe, type RedeemedEvent } from '../../lib/channel';
import { chime } from '../lib/sounds';
import { loadSession } from '../lib/merchantStore';

/**
 * Mounted at the merchant shell level. Listens for `offer_redeemed` events
 * scoped to this merchant and pops a toast with chime. Auto-dismisses
 * after 4.5s.
 */
export default function RedemptionToast() {
  const [active, setActive] = useState<RedeemedEvent | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const unsub = subscribe((ev) => {
      if (ev.type !== 'offer_redeemed') return;
      if (ev.merchant_id !== session.merchantId) return;
      setActive(ev);
      chime();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setActive(null), 4500);
    });
    return () => {
      unsub();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  return (
    <div
      className="absolute left-0 right-0 z-40 flex justify-center pointer-events-none px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 4rem)' }}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="pointer-events-auto m-card-elev px-3 py-2.5 flex items-center gap-3 shadow-2xl"
            style={{
              borderColor: 'rgba(197, 245, 74, 0.35)',
              boxShadow: '0 18px 40px -16px rgba(197, 245, 74, 0.35), 0 0 0 1px rgba(197, 245, 74, 0.18)',
              minWidth: 280,
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--m-accent)', color: '#0b1320' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9.5 L7.5 13.5 L15 5" stroke="#0b1320" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-accent)' }}>
                Just redeemed · live
              </div>
              <div className="text-[13px] font-medium truncate" style={{ color: 'var(--m-text)' }}>
                {active.customer_initials} · {active.offer_title}
              </div>
            </div>
            <div className="num text-[16px] font-medium shrink-0" style={{ color: 'var(--m-accent)' }}>
              +€{active.amount_eur.toFixed(2)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

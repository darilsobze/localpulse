import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { postJson } from '../lib/api';
import { customerInitials, emit, type RedeemedEvent } from '../lib/channel';
import GooglePaySheet from './GooglePaySheet';

type Phase = 'qr' | 'gpay' | 'confirmed';

type Props = {
  onDone: () => void;
  merchantId?: string;
  merchantName?: string;
  discountPct?: number;
  cashbackEur?: number;
  userId?: string;
  /** Title of the offer item (e.g. "Iced cappuccino"). Falls back to a category-neutral default. */
  offerTitle?: string;
  /** Original price before discount. Defaults to a plausible value derived from cashback math. */
  priceOriginalEur?: number;
};

function genOfferCode(merchantId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `LP-${merchantId}-${ts}-${rand}`.toUpperCase();
}

export default function RedeemSheet({
  onDone,
  merchantId = 'm_demo',
  merchantName = 'BACK FACTORY',
  discountPct = 20,
  cashbackEur,
  userId = 'demo_user',
  offerTitle = 'High-Protein Choco-Latte',
  priceOriginalEur,
}: Props) {
  const [phase, setPhase] = useState<Phase>('qr');
  const offerCode = useMemo(() => genOfferCode(merchantId), [merchantId]);
  const computedCashback = cashbackEur ?? Math.round(4.9 * discountPct) / 100;
  // Derive a plausible original price if not provided. Cashback is ~discount of price,
  // so price ≈ cashback / (discount/100). Fall back to a neat number.
  const computedOriginal = priceOriginalEur ?? Math.max(2.5, Math.round((computedCashback / Math.max(0.01, discountPct / 100)) * 100) / 100);
  const computedFinal = Math.round((computedOriginal * (1 - discountPct / 100)) * 100) / 100;

  const redeemPostedRef = useRef(false);

  // QR phase auto-advances to GPay after 4.2s — same timing as before so the
  // existing flight/QR choreography is unchanged.
  useEffect(() => {
    if (phase !== 'qr') return;
    const t = setTimeout(() => setPhase('gpay'), 4200);
    return () => clearTimeout(t);
  }, [phase]);

  // When user "pays" with Google Pay, we both notify the merchant POV via
  // BroadcastChannel and persist to the backend wallet. Both calls are
  // idempotent for this RedeemSheet instance via redeemPostedRef.
  const handlePaid = async () => {
    if (!redeemPostedRef.current) {
      redeemPostedRef.current = true;

      const event: Omit<RedeemedEvent, 'id' | 'ts'> = {
        type: 'offer_redeemed',
        merchant_id: merchantId,
        merchant_name: merchantName,
        offer_title: offerTitle,
        amount_eur: computedFinal,
        discount_pct: discountPct,
        cashback_eur: computedCashback,
        customer_initials: customerInitials(userId),
        customer_id: userId,
      };
      emit<RedeemedEvent>(event);

      try {
        await postJson('/redeem', {
          user_id: userId,
          offer_code: offerCode,
          merchant_id: merchantId,
          merchant_name: merchantName,
          discount_pct: discountPct,
          cashback_eur: computedCashback,
        });
      } catch (e) {
        console.warn('[redeem] backend call failed, showing success anyway:', e);
      }
    }
    setPhase('confirmed');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 pointer-events-none"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)',
      }}
    >
      {phase !== 'gpay' && (
        <div
          className="pointer-events-auto w-full max-w-[420px] overflow-y-auto glass rounded-[32px] px-6 pt-4 pb-7"
          style={{
            maxHeight: 'calc(100dvh - var(--bottom-nav-height) - env(safe-area-inset-bottom) - max(1rem, env(safe-area-inset-top)) - 1rem)',
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
                Show at counter · {merchantName}
              </div>
              <h3 className="serif text-[22px] mt-1 text-stone-900">
                You arrived. Scan to claim.
              </h3>

              <div className="mt-4 mx-auto w-[180px] h-[180px] rounded-2xl bg-white p-3 shadow-inner relative">
                <QRCodeSVG
                  value={`LOCALPULSE://moment/${offerCode}`}
                  size={156}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1410"
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
                +€{computedCashback.toFixed(2)} back to your wallet
              </div>

              <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-stone-700/55">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Waiting for POS confirmation…
              </div>

              <button
                onClick={() => setPhase('gpay')}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-stone-950 px-5 text-[12px] font-medium text-white shadow-lg transition hover:bg-black"
              >
                Pay with G Pay now
              </button>
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
                {merchantName} had a quiet hour.<br />You filled it.
              </p>
              <div className="mt-3 text-[11px] text-stone-700/60">
                +€{computedCashback.toFixed(2)} in your City Wallet · stamp earned
              </div>
              <motion.button
                onClick={onDone}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="mt-5 inline-flex items-center justify-center px-6 h-11 rounded-full bg-stone-900 text-white text-[13px] font-medium shadow-lg"
              >
                Save to journal
              </motion.button>
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <GooglePaySheet
        visible={phase === 'gpay'}
        merchantName={merchantName}
        itemTitle={offerTitle}
        priceOriginalEur={computedOriginal}
        priceFinalEur={computedFinal}
        cashbackEur={computedCashback}
        discountPct={discountPct}
        onPaid={handlePaid}
        onCancel={() => setPhase('qr')}
      />
    </motion.div>
  );
}

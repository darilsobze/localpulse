import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

type Phase = 'review' | 'authorizing' | 'success';

type Props = {
  visible: boolean;
  merchantName: string;
  itemTitle: string;
  priceOriginalEur: number;
  priceFinalEur: number;
  cashbackEur: number;
  discountPct: number;
  onPaid: () => void;
  onCancel?: () => void;
};

/**
 * Visual mock of a Google Pay payment sheet. No SDK is loaded — this is a
 * pixel replica with the official wordmark/G logo for credibility on stage.
 * The biometric ping animation is purely cosmetic.
 *
 * On successful "auth", `onPaid()` fires. The caller is responsible for
 * emitting the channel event so the merchant view updates.
 */
export default function GooglePaySheet({
  visible,
  merchantName,
  itemTitle,
  priceOriginalEur,
  priceFinalEur,
  cashbackEur,
  discountPct,
  onPaid,
  onCancel,
}: Props) {
  const [phase, setPhase] = useState<Phase>('review');
  // Reset internal phase whenever the sheet is re-opened.
  // React's recommended pattern for this is to mirror the prop in state and
  // detect changes during render rather than via useEffect.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setPhase('review');
  }

  const handlePay = () => {
    if (phase !== 'review') return;
    setPhase('authorizing');
    setTimeout(() => {
      setPhase('success');
      setTimeout(() => onPaid(), 850);
    }, 1100);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="gpay-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] pointer-events-auto"
            style={{ background: 'rgba(0, 0, 0, 0.55)' }}
            onClick={() => phase === 'review' && onCancel?.()}
          />
          <motion.div
            key="gpay-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[81] flex justify-center pointer-events-auto"
          >
            <div
              className="w-full max-w-[440px] rounded-t-[28px] overflow-hidden shadow-2xl"
              style={{
                background: '#ffffff',
                paddingBottom: 'env(safe-area-inset-bottom)',
                fontFamily: '"Google Sans", "Roboto", "Geist", system-ui, sans-serif',
                color: '#202124',
              }}
            >
              {/* Drag handle */}
              <div className="pt-2 pb-1 flex justify-center">
                <div className="w-9 h-1 rounded-full bg-stone-300" />
              </div>

              {/* GPay header */}
              <div className="px-5 pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={phase !== 'review'}
                  className="rounded-full -ml-2 px-2 py-1 transition hover:bg-stone-100 disabled:pointer-events-none"
                  aria-label="Pay with Google Pay"
                >
                  <GooglePayLogo />
                </button>
                <button
                  onClick={() => phase === 'review' && onCancel?.()}
                  className="text-[20px] text-stone-500 leading-none"
                  aria-label="Close"
                  disabled={phase !== 'review'}
                  style={{ opacity: phase === 'review' ? 1 : 0.3 }}
                >
                  ×
                </button>
              </div>

              <div className="px-5 mt-2 pb-1 text-[12px] text-stone-500">
                Pay <span className="font-medium text-stone-800">{merchantName}</span>
              </div>

              <div className="mx-5 my-3 rounded-2xl border border-stone-200 overflow-hidden">
                {/* Item */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-stone-200">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-stone-800 truncate">{itemTitle}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      City Wallet offer · −{discountPct}% applied
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[11px] line-through text-stone-400"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      €{priceOriginalEur.toFixed(2)}
                    </div>
                    <div
                      className="text-[16px] font-medium text-stone-900"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      €{priceFinalEur.toFixed(2)}
                    </div>
                  </div>
                </div>
                {/* Card row */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-7 rounded-md shrink-0 flex items-center justify-end px-1.5"
                      style={{
                        background: 'linear-gradient(135deg, #1a73e8, #0b57d0)',
                      }}
                    >
                      <span className="text-[8px] tracking-widest text-white font-semibold">VISA</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-stone-800">Sparkasse Visa</div>
                      <div
                        className="text-[11px] text-stone-500"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        •••• 4173 · default
                      </div>
                    </div>
                  </div>
                  <button className="text-[12px] font-medium" style={{ color: '#1a73e8' }}>
                    Change
                  </button>
                </div>
              </div>

              {/* Cashback note */}
              <div className="mx-5 mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
                style={{ background: '#e8f0fe' }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                >€</div>
                <div className="text-[11px] flex-1" style={{ color: '#174ea6' }}>
                  +€{cashbackEur.toFixed(2)} cashback to your <strong>City Wallet</strong> after payment.
                </div>
              </div>

              {/* Pay button / state */}
              <div className="sticky bottom-0 bg-white px-5 pb-5 pt-1">
                {phase === 'review' && (
                  <motion.button
                    key="pay"
                    onClick={handlePay}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-medium text-[15px] shadow-sm"
                    style={{
                      background: '#202124',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <GPayButtonLogo />
                    Pay €{priceFinalEur.toFixed(2)}
                  </motion.button>
                )}

                <AnimatePresence mode="wait">
                  {phase === 'authorizing' && (
                    <motion.div
                      key="auth"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-3"
                    >
                      <BiometricPing />
                      <div className="mt-3 text-[13px] text-stone-700">Confirming with Face ID…</div>
                    </motion.div>
                  )}
                  {phase === 'success' && (
                    <motion.div
                      key="ok"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-3"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 16 }}
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: '#1a73e8' }}
                      >
                        <svg width="26" height="26" viewBox="0 0 26 26">
                          <motion.path
                            d="M5 13.5 L11 19 L21 8"
                            stroke="#fff"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        </svg>
                      </motion.div>
                      <div className="mt-2.5 text-[14px] font-medium text-stone-900">Paid €{priceFinalEur.toFixed(2)}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">Receipt sent to your City Wallet</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-4 text-[10px] text-center text-stone-400">
                  Payment is simulated for demo. No funds are moved.
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── GPay logo bits ─────────────────────────────────────────────────────────

function GooglePayLogo() {
  // Inline SVG version of the "G Pay" wordmark — colors match the official
  // monochrome variant. Not a real asset; demo replica only.
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
        <path fill="#4285F4" d="M43.6 22.5H24v8h11.3c-.5 2.7-2 5-4.3 6.5l7 5.4c4.1-3.8 6.4-9.4 6.4-15.9 0-1.5-.1-2.7-.4-4z"/>
        <path fill="#34A853" d="M24 44c5.8 0 10.7-1.9 14.3-5.2l-7-5.4c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9l-7.2 5.5C7.8 39.4 15.3 44 24 44z"/>
        <path fill="#FBBC05" d="M11.9 26.6c-.5-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1l-7.2-5.5C3.4 15.7 2.5 19 2.5 22.5s.9 6.8 2.6 9.6l6.8-5.5z"/>
        <path fill="#EA4335" d="M24 11.4c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 4.6 29.7 2.5 24 2.5 15.3 2.5 7.8 7.1 4.7 14.3l7.2 5.5c1.7-5.1 6.5-8.4 12.1-8.4z"/>
      </svg>
      <span className="text-[15px] font-medium" style={{ color: '#5f6368', letterSpacing: '-0.01em' }}>
        Pay
      </span>
    </div>
  );
}

function GPayButtonLogo() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1"
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 48 48">
        <path fill="#4285F4" d="M43.6 22.5H24v8h11.3c-.5 2.7-2 5-4.3 6.5l7 5.4c4.1-3.8 6.4-9.4 6.4-15.9 0-1.5-.1-2.7-.4-4z"/>
        <path fill="#34A853" d="M24 44c5.8 0 10.7-1.9 14.3-5.2l-7-5.4c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9l-7.2 5.5C7.8 39.4 15.3 44 24 44z"/>
        <path fill="#FBBC05" d="M11.9 26.6c-.5-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1l-7.2-5.5C3.4 15.7 2.5 19 2.5 22.5s.9 6.8 2.6 9.6l6.8-5.5z"/>
        <path fill="#EA4335" d="M24 11.4c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 4.6 29.7 2.5 24 2.5 15.3 2.5 7.8 7.1 4.7 14.3l7.2 5.5c1.7-5.1 6.5-8.4 12.1-8.4z"/>
      </svg>
      <span className="text-[13px] font-medium leading-none" style={{ color: '#202124', letterSpacing: '-0.01em' }}>
        Pay
      </span>
    </span>
  );
}

function BiometricPing() {
  return (
    <div className="relative w-14 h-14">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: '2px solid #1a73e8' }}
        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: '2px solid #1a73e8' }}
        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
      />
      <div
        className="absolute inset-2 rounded-full flex items-center justify-center"
        style={{ background: '#1a73e8' }}
      >
        {/* face id glyph */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 8V6a1 1 0 0 1 1-1h2M19 8V6a1 1 0 0 0-1-1h-2M5 16v2a1 1 0 0 0 1 1h2M19 16v2a1 1 0 0 1-1 1h-2"
            stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
          <circle cx="9" cy="11" r="0.9" fill="#fff" />
          <circle cx="15" cy="11" r="0.9" fill="#fff" />
          <path d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M12 9v3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

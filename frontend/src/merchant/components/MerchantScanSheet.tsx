import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { customerInitials, emit, type RedeemedEvent } from '../../lib/channel';
import type { LiveOfferRuntime, MerchantSession } from '../lib/merchantStore';

type Phase = 'aiming' | 'detected' | 'authorizing' | 'received' | 'idle';

type Props = {
  open: boolean;
  onClose: () => void;
  session: MerchantSession;
  liveOffers: LiveOfferRuntime[];
};

const FAKE_NAMES = ['mia_278', 'lukas_044', 'sara_551', 'jonas_902', 'anna_117', 'pia_330', 'omar_645', 'lena_281'];
const CHOCO_LATTE_OFFER_ID = 'cafe-recovery-latte';

function pickScanOffer(liveOffers: LiveOfferRuntime[]): LiveOfferRuntime | undefined {
  const liveOnly = liveOffers.filter((o) => o.status === 'live');
  const pool = liveOnly.length > 0 ? liveOnly : liveOffers;
  return (
    pool.find((o) => o.id === CHOCO_LATTE_OFFER_ID)
    ?? pool.find((o) => o.title === 'High-Protein Choco-Latte')
    ?? pool[0]
  );
}

/**
 * Mock QR scanner the merchant uses to "ring up" the customer. The flow is
 * fully simulated: aim → detect → authorize → received. On receipt we emit
 * `offer_redeemed` on the same channel the consumer Google Pay sheet uses,
 * so the merchant's own KPIs/feed/toast update consistently — and any other
 * tabs (e.g. /m/today open elsewhere) follow.
 */
export default function MerchantScanSheet({ open, onClose, session, liveOffers }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [picked, setPicked] = useState<{ offer: LiveOfferRuntime; userId: string } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reset on open. Using prev-state pattern instead of useEffect keeps lint happy.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const offer = pickScanOffer(liveOffers);
      const userId = FAKE_NAMES[(offer?.redeemed ?? 0) % FAKE_NAMES.length];
      setPicked(offer ? { offer, userId } : null);
      setPhase('aiming');
    } else {
      setPhase('idle');
    }
  }

  useEffect(() => {
    if (phase === 'idle') return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (phase === 'aiming') {
      timersRef.current.push(setTimeout(() => setPhase('detected'),     1800));
    } else if (phase === 'detected') {
      timersRef.current.push(setTimeout(() => setPhase('authorizing'),  650));
    } else if (phase === 'authorizing') {
      timersRef.current.push(setTimeout(() => {
        if (picked) {
          const event: Omit<RedeemedEvent, 'id' | 'ts'> = {
            type: 'offer_redeemed',
            merchant_id:       session.merchantId,
            merchant_name:     session.merchantName,
            offer_title:       picked.offer.title,
            offer_id:          picked.offer.id,
            amount_eur:        picked.offer.priceFinal,
            discount_pct:      picked.offer.discountPct,
            cashback_eur:      Math.round(picked.offer.priceFinal * (picked.offer.discountPct / 100) * 100) / 100,
            customer_initials: customerInitials(picked.userId),
            customer_id:       picked.userId,
          };
          // emit() now also notifies local subscribers (RedemptionToast,
          // merchantStore), so KPIs/feed/chime all fire from this one call.
          emit<RedeemedEvent>(event);
        }
        setPhase('received');
      }, 900));
    } else if (phase === 'received') {
      timersRef.current.push(setTimeout(() => onClose(), 1900));
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [phase, picked, session, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scan-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[85]"
            style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => phase === 'aiming' && onClose()}
          />
          <motion.div
            key="scan-sheet"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 top-0 bottom-0 z-[86] flex flex-col items-center justify-between px-5 py-6"
            style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between" style={{ color: 'var(--m-text)' }}>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--m-text-mute)' }}>
                  Scanner
                </div>
                <div className="text-[15px] font-medium mt-0.5">{session.merchantName}</div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--m-text-dim)' }}
                aria-label="Close scanner"
              >
                ✕
              </button>
            </div>

            {/* Viewfinder */}
            <Viewfinder phase={phase} pickedTitle={picked?.offer.title} />

            {/* Footer status */}
            <FooterStatus phase={phase} amount={picked?.offer.priceFinal ?? 0} initials={picked ? customerInitials(picked.userId) : ''} title={picked?.offer.title ?? ''} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Viewfinder ─────────────────────────────────────────────────────────────

function Viewfinder({ phase, pickedTitle }: { phase: Phase; pickedTitle?: string }) {
  return (
    <div className="relative" style={{ width: 280, height: 280 }}>
      {/* Camera-feed simulation: animated noise/gradient panel */}
      <motion.div
        animate={{
          background: [
            'radial-gradient(circle at 30% 40%, #1f2a44 0%, #0a0f1d 60%, #050913 100%)',
            'radial-gradient(circle at 70% 60%, #2a3856 0%, #0a0f1d 60%, #050913 100%)',
            'radial-gradient(circle at 30% 40%, #1f2a44 0%, #0a0f1d 60%, #050913 100%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Pseudo-QR appearing once detected */}
        <AnimatePresence>
          {(phase === 'detected' || phase === 'authorizing' || phase === 'received') && (
            <motion.div
              key="fakeqr"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <FakeQR />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Corner brackets */}
      {([
        { pos: { top: 0, left: 0 },     deg: 0   },
        { pos: { top: 0, right: 0 },    deg: 90  },
        { pos: { bottom: 0, right: 0 }, deg: 180 },
        { pos: { bottom: 0, left: 0 },  deg: 270 },
      ] as const).map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute w-7 h-7"
          style={{
            ...p.pos,
            transform: `rotate(${p.deg}deg)`,
            borderTop: '3px solid var(--m-accent)',
            borderLeft: '3px solid var(--m-accent)',
            borderTopLeftRadius: 8,
            filter: 'drop-shadow(0 0 6px var(--m-accent-glow))',
          }}
        />
      ))}

      {/* Scanning beam */}
      {phase === 'aiming' && (
        <motion.div
          aria-hidden
          className="absolute left-3 right-3 h-[3px] rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--m-accent), transparent)',
            boxShadow: '0 0 18px var(--m-accent)',
          }}
          initial={{ top: 16 }}
          animate={{ top: 256 }}
          transition={{ duration: 1.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      )}

      {/* Detected lock pulse */}
      {(phase === 'detected' || phase === 'authorizing') && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-3xl"
          style={{ border: '2px solid var(--m-accent)' }}
          animate={{ opacity: [0.9, 0.35, 0.9] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      {/* Title overlay once detected */}
      {pickedTitle && (phase === 'detected' || phase === 'authorizing') && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-9 left-0 right-0 text-center text-[12px]"
          style={{ color: 'var(--m-text-dim)' }}
        >
          QR detected · {pickedTitle}
        </motion.div>
      )}
    </div>
  );
}

function FakeQR() {
  // Render a small SVG that visually reads as a QR code without actually
  // encoding anything. Deterministic from a fixed seed so it doesn't flicker.
  const cells = 17;
  const size = 168;
  const cell = size / cells;
  const items: { x: number; y: number }[] = [];
  let h = 1779033703;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      const v = (h >>> 0) % 100;
      if (v < 48) items.push({ x, y });
    }
  }
  return (
    <div className="rounded-xl bg-white p-3" style={{ boxShadow: '0 12px 28px -10px rgba(0,0,0,0.5)' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="#ffffff" />
        {items.map((p, i) => (
          <rect key={i} x={p.x * cell} y={p.y * cell} width={cell} height={cell} fill="#0b1320" />
        ))}
        {/* Position markers */}
        {[
          { x: 0, y: 0 },
          { x: (cells - 7), y: 0 },
          { x: 0, y: (cells - 7) },
        ].map((m, i) => (
          <g key={`m${i}`}>
            <rect x={m.x * cell} y={m.y * cell} width={cell * 7} height={cell * 7} fill="#ffffff" />
            <rect x={m.x * cell} y={m.y * cell} width={cell * 7} height={cell * 7} fill="none" stroke="#0b1320" strokeWidth={cell} />
            <rect x={(m.x + 2) * cell} y={(m.y + 2) * cell} width={cell * 3} height={cell * 3} fill="#0b1320" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Footer status ──────────────────────────────────────────────────────────

function FooterStatus({
  phase,
  amount,
  initials,
  title,
}: {
  phase: Phase;
  amount: number;
  initials: string;
  title: string;
}) {
  return (
    <div className="w-full max-w-[420px]">
      <AnimatePresence mode="wait">
        {phase === 'aiming' && (
          <motion.div
            key="aiming"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="m-card p-4 text-center"
          >
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-accent)' }}>
              <span className="m-dot inline-block mr-1.5" /> Looking for QR…
            </div>
            <div className="text-[12px] mt-1.5" style={{ color: 'var(--m-text-dim)' }}>
              Hold the customer's wallet QR inside the frame. The scanner detects automatically.
            </div>
          </motion.div>
        )}
        {phase === 'detected' && (
          <motion.div
            key="detected"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="m-card p-4 text-center"
          >
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-accent)' }}>
              QR locked
            </div>
            <div className="text-[14px] mt-1.5 font-medium" style={{ color: 'var(--m-text)' }}>
              {initials} · {title}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--m-text-mute)' }}>
              Verifying offer code…
            </div>
          </motion.div>
        )}
        {phase === 'authorizing' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="m-card p-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-[12px]" style={{ color: 'var(--m-text-dim)' }}>
              <Spinner /> Authorizing payment with City Wallet…
            </div>
          </motion.div>
        )}
        {phase === 'received' && (
          <motion.div
            key="received"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="m-card p-4 flex items-center gap-3"
            style={{
              borderColor: 'rgba(197, 245, 74, 0.35)',
              boxShadow: '0 18px 40px -16px rgba(197, 245, 74, 0.45), 0 0 0 1px rgba(197, 245, 74, 0.18)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 14 }}
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--m-accent)' }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22">
                <motion.path
                  d="M4 11.5 L9 16 L18 6"
                  stroke="#0b1320"
                  strokeWidth="2.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-accent)' }}>
                Payment received
              </div>
              <div className="text-[15px] font-medium truncate" style={{ color: 'var(--m-text)' }}>
                {initials} · {title}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--m-text-mute)' }}>
                Receipt synced to {initials}'s City Wallet
              </div>
            </div>
            <div className="num text-[20px] font-medium shrink-0" style={{ color: 'var(--m-accent)' }}>
              +€{amount.toFixed(2)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full"
      style={{
        border: '2px solid rgba(197, 245, 74, 0.25)',
        borderTopColor: 'var(--m-accent)',
        animation: 'mSpin 0.8s linear infinite',
      }}
    />
  );
}

// keyframes injected once
if (typeof document !== 'undefined' && !document.getElementById('m-spin-kf')) {
  const s = document.createElement('style');
  s.id = 'm-spin-kf';
  s.textContent = '@keyframes mSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

import { motion } from 'framer-motion';
import type { LiveOfferRuntime } from '../lib/merchantStore';

type Props = {
  offer: LiveOfferRuntime;
  onPause?: () => void;
};

export default function LiveOfferCard({ offer }: Props) {
  const live = offer.status === 'live';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="m-card relative overflow-hidden"
    >
      {live && <div className="m-shimmer absolute inset-0 pointer-events-none" />}
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-[20px]"
            style={{
              background: 'rgba(197, 245, 74, 0.10)',
              border: '1px solid rgba(197, 245, 74, 0.22)',
            }}
          >
            {offer.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={live ? 'm-pill' : 'm-pill warn'}
                style={{ height: 18, fontSize: 10, padding: '0 8px' }}
              >
                <span className="m-dot" />
                <span className="num">{live ? 'LIVE' : 'PAUSED'}</span>
              </span>
              <span className="text-[10px] num" style={{ color: 'var(--m-text-mute)' }}>
                AI · −{offer.discountPct}%
              </span>
            </div>
            <div className="mt-1.5 text-[15px] font-medium leading-snug" style={{ color: 'var(--m-text)' }}>
              {offer.title}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--m-text-mute)' }}>
              {offer.trigger}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="num text-[10px] line-through" style={{ color: 'var(--m-text-mute)' }}>
              €{offer.priceOriginal.toFixed(2)}
            </div>
            <div className="num text-[18px] font-medium" style={{ color: 'var(--m-accent)' }}>
              €{offer.priceFinal.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Viewing" value={offer.viewers.toString()} />
          <Stat label="Redeemed" value={offer.redeemed.toString()} accent />
          <Stat
            label="Accept"
            value={
              offer.viewers + offer.redeemed === 0
                ? '—'
                : `${Math.round((offer.redeemed / Math.max(1, offer.viewers + offer.redeemed)) * 100)}%`
            }
          />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg py-1.5 px-2 text-center"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--m-line)' }}
    >
      <div className="num text-[15px] font-medium" style={{ color: accent ? 'var(--m-accent)' : 'var(--m-text)' }}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--m-text-mute)' }}>
        {label}
      </div>
    </div>
  );
}

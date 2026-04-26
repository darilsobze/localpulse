import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { loadSession } from '../lib/merchantStore';
import { useMerchantStore } from '../lib/useMerchantStore';
import type { FeedItem } from '../lib/mockData';

function relativeTime(ts: number, now: number): string {
  const sec = Math.max(1, Math.floor((now - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const KIND_TONE: Record<FeedItem['kind'], { bar: string; chip: string; chipText: string }> = {
  redeemed:     { bar: 'var(--m-accent)',         chip: 'rgba(197, 245, 74, 0.14)', chipText: 'var(--m-accent)' },
  dismissed:    { bar: 'var(--m-danger)',         chip: 'rgba(251, 113, 133, 0.12)', chipText: 'var(--m-danger)' },
  ai_published: { bar: '#60a5fa',                 chip: 'rgba(96, 165, 250, 0.14)', chipText: '#93c5fd' },
  ai_revised:   { bar: '#a78bfa',                 chip: 'rgba(167, 139, 250, 0.14)', chipText: '#c4b5fd' },
  paused:       { bar: 'var(--m-warn)',           chip: 'rgba(251, 191, 36, 0.14)',  chipText: 'var(--m-warn)' },
};

const KIND_LABEL: Record<FeedItem['kind'], string> = {
  redeemed: 'redeemed',
  dismissed: 'dismissed',
  ai_published: 'AI published',
  ai_revised: 'AI revised',
  paused: 'paused',
};

export default function LivePage() {
  const session = loadSession()!;
  const { state, store } = useMerchantStore(session.merchantId);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    store.enableSynth();
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      store.disableSynth();
      clearInterval(id);
    };
  }, [store]);

  const liveCount = state.feed.filter(
    (f) => f.kind === 'redeemed' && now - f.ts < 5 * 60 * 1000,
  ).length;

  return (
    <div className="pt-2 pb-2">
      <div className="m-card p-4 flex items-center gap-3">
        <span
          className="m-pill"
          style={{ height: 24, fontSize: 11 }}
        >
          <span className="m-dot" />
          <span className="num">LIVE FEED</span>
        </span>
        <div className="flex-1">
          <div className="text-[12px] font-medium" style={{ color: 'var(--m-text)' }}>
            {liveCount > 0 ? `${liveCount} redemption${liveCount === 1 ? '' : 's'} in last 5 min` : 'Waiting for the next moment…'}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--m-text-mute)' }}>
            Customer-anonymous · only initials shown · GDPR compliant
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {state.feed.map((item) => {
            const tone = KIND_TONE[item.kind];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.98 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
                className="m-card p-3 flex items-start gap-3 relative overflow-hidden"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: tone.bar }}
                />
                <div
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[14px] font-medium"
                  style={{ background: tone.chip, color: tone.chipText, border: `1px solid ${tone.chip}` }}
                >
                  {item.emoji ?? '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] uppercase tracking-[0.18em]"
                      style={{ color: tone.chipText }}
                    >
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span className="num text-[10px]" style={{ color: 'var(--m-text-mute)' }}>
                      {relativeTime(item.ts, now)}
                    </span>
                  </div>
                  <div className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--m-text)' }}>
                    {item.title}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--m-text-mute)' }}>
                    {item.subtitle}
                  </div>
                </div>
                {item.amount && (
                  <div className="text-right shrink-0 num text-[15px] font-medium" style={{ color: 'var(--m-accent)' }}>
                    +€{item.amount.toFixed(2)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {state.feed.length === 0 && (
          <div className="m-card p-6 text-center text-[12px]" style={{ color: 'var(--m-text-mute)' }}>
            Nothing yet. When a customer accepts an offer, it will land here within a second.
          </div>
        )}
      </div>
    </div>
  );
}

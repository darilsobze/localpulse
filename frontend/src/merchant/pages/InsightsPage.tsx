import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { loadSession } from '../lib/merchantStore';
import { useMerchantStore } from '../lib/useMerchantStore';
import { PEER_BENCHMARK, seedSuggestions, seedWeekly } from '../lib/mockData';
import SparkChart from '../components/SparkChart';

export default function InsightsPage() {
  const session = loadSession()!;
  const { state } = useMerchantStore(session.merchantId);
  const weekly = useMemo(() => seedWeekly(session.merchantId), [session.merchantId]);
  const suggestions = useMemo(() => seedSuggestions(session.category), [session.category]);

  const totalWeek = weekly.reduce((s, d) => s + d.revenue, 0);
  const totalRedemptions = weekly.reduce((s, d) => s + d.redemptions, 0);
  const softest = weekly.reduce((acc, d) => (d.revenue < acc.revenue ? d : acc), weekly[0]);

  const peerBars = [
    {
      label: 'Accept rate',
      you: PEER_BENCHMARK.acceptRateYou,
      peers: PEER_BENCHMARK.acceptRatePeers,
      format: (v: number) => `${Math.round(v * 100)}%`,
    },
    {
      label: 'Cashback / day',
      you: PEER_BENCHMARK.cashbackYou,
      peers: PEER_BENCHMARK.cashbackPeers,
      format: (v: number) => `€${v}`,
    },
    {
      label: 'Recovered revenue / wk',
      you: PEER_BENCHMARK.recoveredYou,
      peers: PEER_BENCHMARK.recoveredPeers,
      format: (v: number) => `€${v}`,
    },
  ];

  return (
    <div className="pt-2 pb-2 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-text-mute)' }}>
          Insights · last 7 days
        </div>
        <h2 className="serif text-[20px] mt-1 leading-tight" style={{ color: 'var(--m-text)' }}>
          Where the AI is helping most.
        </h2>
      </div>

      {/* Weekly chart */}
      <div className="m-card p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-text-dim)' }}>
            Recovered revenue
          </div>
          <div className="num text-[18px] font-medium" style={{ color: 'var(--m-text)' }}>
            €{totalWeek}
          </div>
        </div>
        <div className="mt-2">
          <SparkChart points={weekly} />
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Mini label="Redemptions" value={totalRedemptions.toString()} />
          <Mini label="Avg / day" value={`€${Math.round(totalWeek / 7)}`} />
          <Mini label="Today live" value={state.kpis.redemptions.toString()} />
        </div>
      </div>

      {/* Softest hour callout */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="m-card p-4 relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fbbf24, transparent 65%)' }}
        />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#fbbf24' }}>
            Softest hour · {softest.day} · 14:00–16:00
          </div>
          <div className="serif text-[17px] mt-1.5 leading-snug" style={{ color: 'var(--m-text)' }}>
            That window had €{softest.revenue} in recovered revenue, {softest.redemptions} redemptions.
          </div>
          <p className="text-[12px] mt-1" style={{ color: 'var(--m-text-dim)' }}>
            Peers in your category recover 23% more in the same window. The AI suggests a deeper discount cap when temp drops below 18°C.
          </p>
        </div>
      </motion.div>

      {/* Peer benchmark */}
      <div className="m-card p-4">
        <div className="text-[11px] uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--m-text-dim)' }}>
          You vs cafés within 1 km
        </div>
        <div className="space-y-2.5">
          {peerBars.map((b) => {
            const max = Math.max(b.you, b.peers);
            return (
              <div key={b.label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: 'var(--m-text-dim)' }}>{b.label}</span>
                  <span className="num" style={{ color: 'var(--m-text-mute)' }}>
                    you {b.format(b.you)} · peers {b.format(b.peers)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <Bar pct={b.you / max} accent />
                  <Bar pct={b.peers / max} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI suggestions */}
      <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-text-mute)' }}>
        AI suggestions
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="m-card p-3.5 flex items-start gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[14px]"
              style={{ background: 'rgba(197, 245, 74, 0.10)', border: '1px solid rgba(197, 245, 74, 0.22)', color: 'var(--m-accent)' }}
            >
              {s.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-snug" style={{ color: 'var(--m-text)' }}>
                {s.headline}
              </div>
              <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--m-text-dim)' }}>
                {s.body}
              </div>
            </div>
            <div className="num text-[11px] font-medium shrink-0" style={{ color: 'var(--m-accent)' }}>
              {s.delta}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="pt-2 text-[10px] text-center" style={{ color: 'var(--m-text-mute)' }}>
        Insights derived locally from on-device intent signals. No raw GPS or PII leaves the device.
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg py-1.5 px-2 text-center"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--m-line)' }}
    >
      <div className="num text-[14px] font-medium" style={{ color: 'var(--m-text)' }}>{value}</div>
      <div className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--m-text-mute)' }}>{label}</div>
    </div>
  );
}

function Bar({ pct, accent }: { pct: number; accent?: boolean }) {
  return (
    <div className="h-2.5 rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, pct * 100)}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{
          background: accent
            ? 'linear-gradient(90deg, var(--m-accent), #fbbf24)'
            : 'rgba(255,255,255,0.18)',
          boxShadow: accent ? '0 0 8px var(--m-accent-glow)' : 'none',
        }}
      />
    </div>
  );
}

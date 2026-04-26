import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { loadSession } from '../lib/merchantStore';
import { useMerchantStore } from '../lib/useMerchantStore';
import MetricTile from '../components/MetricTile';
import LiveOfferCard from '../components/LiveOfferCard';

export default function TodayPage() {
  const session = loadSession()!;
  const navigate = useNavigate();
  const { state, store } = useMerchantStore(session.merchantId);

  const acceptRate =
    state.kpis.redemptions + state.kpis.dismissals === 0
      ? 0
      : Math.round(
          (state.kpis.redemptions / (state.kpis.redemptions + state.kpis.dismissals)) * 100,
        );

  const liveOffers = state.liveOffers.slice(0, 3);
  const quietPct = Math.round(state.quietScore * 100);
  const isQuiet = state.quietScore >= 0.55;

  return (
    <div className="pt-2 pb-2">
      {/* Hero strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="m-card p-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${session.brandHue1} 0%, transparent 65%)`,
            transform: 'translate(35%, -35%)',
          }}
        />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-text-mute)' }}>
            Today · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div className="serif text-[20px] mt-1 leading-tight" style={{ color: 'var(--m-text)' }}>
            {isQuiet ? 'A quiet window just opened.' : 'Steady traffic. AI is holding back.'}
          </div>
          <p className="text-[12px] mt-1 max-w-[300px] leading-snug" style={{ color: 'var(--m-text-dim)' }}>
            {isQuiet
              ? `Transaction density ${quietPct}% below your usual. The engine is publishing offers within your rules.`
              : `Density at ${100 - quietPct}% of expected. Offers will resume when the next dip arrives.`}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                animate={{ width: `${quietPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--m-accent), #fbbf24)',
                  boxShadow: '0 0 14px var(--m-accent-glow)',
                }}
              />
            </div>
            <div className="num text-[11px]" style={{ color: 'var(--m-text-dim)' }}>
              {quietPct}% quiet
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI tiles */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <MetricTile
          label="Today's revenue"
          value={`€${state.kpis.revenueEur.toFixed(2)}`}
          delta="+12% vs yest"
          deltaTone="good"
          pulseKey={state.kpis.revenueEur}
        />
        <MetricTile
          label="Redemptions"
          value={state.kpis.redemptions.toString()}
          delta={`+${state.kpis.redemptions > 0 ? Math.max(1, Math.round(state.kpis.redemptions / 6)) : 0} h⁻¹`}
          deltaTone="good"
          pulseKey={state.kpis.redemptions}
        />
        <MetricTile
          label="Accept rate"
          value={`${acceptRate}%`}
          hint={`${state.kpis.redemptions} accepted · ${state.kpis.dismissals} dismissed`}
          pulseKey={acceptRate}
        />
        <MetricTile
          label="Cashback issued"
          value={`€${state.kpis.cashbackIssuedEur.toFixed(2)}`}
          hint="Credited via City Wallet"
          pulseKey={state.kpis.cashbackIssuedEur}
        />
      </div>

      {/* Live offers */}
      <div className="mt-5 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-text-mute)' }}>
          Live offers · {liveOffers.filter((o) => o.status === 'live').length} broadcasting
        </div>
        <button
          onClick={() => navigate('/m/rules')}
          className="text-[11px] num"
          style={{ color: 'var(--m-accent)' }}
        >
          Adjust rules →
        </button>
      </div>

      <div className="mt-2.5 space-y-2.5">
        {liveOffers.length === 0 && (
          <div className="m-card p-4 text-center text-[12px]" style={{ color: 'var(--m-text-mute)' }}>
            No live offers. The AI will publish one when the next quiet window opens.
          </div>
        )}
        {liveOffers.map((o) => (
          <LiveOfferCard key={o.id} offer={o} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          onClick={() => store.togglePause()}
          className="m-button"
          style={{ flex: 1 }}
        >
          {state.paused ? '▶ Resume offers' : '❚❚ Pause all'}
        </button>
        <button
          className="m-button"
          onClick={() => store.pushAiOfferToFeed('Post-training boost · Choco-Latte', 20)}
        >
          ✦ Boost recovery
        </button>
        <button
          onClick={() => navigate('/m/insights')}
          className="m-button"
        >
          ◭ EOD report
        </button>
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between text-[10px]" style={{ color: 'var(--m-text-mute)' }}>
        <span>Auto-published by Generative Offer Engine · GDPR safe (on-device intent only)</span>
      </div>
    </div>
  );
}

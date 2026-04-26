import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { apiUrl, getJson, putJson } from '../lib/api';

const MERCHANT_ID = 'm_1';

type MerchantStats = {
  merchant_id: string;
  merchant: string;
  location: string;
  quiet_score: number;
  is_quiet: boolean;
  offers_accepted?: number;
  offers_dismissed?: number;
  accept_rate_pct?: number;
  cashback_issued_eur?: number;
  revenue_recovered_eur?: number;
};

type MerchantSettings = {
  max_discount_pct: number;
  min_quiet_gap_min: number;
};

export default function MerchantPage() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [maxDiscount, setMaxDiscount] = useState(30);
  const [minQuietGap, setMinQuietGap] = useState(20);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, settings] = await Promise.all([
          getJson<MerchantStats>('/merchant/stats'),
          getJson<MerchantSettings>(`/merchant/${MERCHANT_ID}/settings`),
        ]);
        if (cancelled) return;
        setStats(s);
        setMaxDiscount(settings.max_discount_pct);
        setMinQuietGap(settings.min_quiet_gap_min);
      } catch (e) {
        console.warn('[merchant] backend fetch failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistSettings = async (mDisc: number, mGap: number) => {
    setSaveStatus('saving');
    try {
      await putJson(`/merchant/${MERCHANT_ID}/settings`, {
        max_discount_pct: mDisc,
        min_quiet_gap_min: mGap,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.warn('[merchant] save failed:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleSendOffer = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl('/push/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'PulseWallet',
          body: `Post-workout near the tram stop · -${maxDiscount}% High-Protein Choco-Latte at ${stats?.merchant ?? 'BACK FACTORY'}, 100m away.`,
          url: '/',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ Sent to ${data.sent} device${data.sent !== 1 ? 's' : ''}`);
      } else {
        setResult(`✗ ${data.detail || 'Failed to send'}`);
      }
    } catch (e) {
      setResult(`✗ Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  };

  const totalOffers =
    stats != null ? (stats.offers_accepted ?? 0) + (stats.offers_dismissed ?? 0) : null;
  const tiles = [
    { label: 'Offers sent', value: totalOffers ?? '—' },
    { label: 'Accepted', value: stats?.offers_accepted ?? '—' },
    {
      label: 'Recovered revenue',
      value: stats?.revenue_recovered_eur != null ? `€${stats.revenue_recovered_eur.toFixed(2)}` : '—',
    },
    {
      label: 'Cashback issued',
      value: stats?.cashback_issued_eur != null ? `€${stats.cashback_issued_eur.toFixed(2)}` : '—',
    },
  ];

  const quietPct = stats ? Math.round(stats.quiet_score * 100) : 0;

  return (
    <div className="pb-24 px-4 py-4 space-y-5">
      {/* Merchant info */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl glass p-5"
      >
        <div className="serif text-[18px] font-medium text-stone-900">{stats?.merchant ?? 'Loading…'}</div>
        <div className="text-[12px] text-stone-700/70 mt-1">📍 {stats?.location ?? 'Darmstadt'}</div>
      </motion.div>

      {/* Quiet hours */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl glass p-4"
      >
        <div className="text-[11px] uppercase tracking-wider text-stone-700/60">Live quiet score</div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
              style={{ width: `${Math.min(100, quietPct)}%` }}
            />
          </div>
          <span className="text-[13px] font-medium text-stone-900">{quietPct}%</span>
        </div>
        <div className="mt-1 text-[10px] text-stone-700/60">
          {stats?.is_quiet ? 'Quiet now — good time to push an offer.' : 'Busy — saving capacity.'}
        </div>
      </motion.div>

      {/* Rules sliders */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl glass p-4 space-y-4"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-medium text-stone-900">Max discount</label>
            <span className="text-[13px] font-medium text-amber-700">{maxDiscount}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(+e.target.value)}
            onMouseUp={() => persistSettings(maxDiscount, minQuietGap)}
            onTouchEnd={() => persistSettings(maxDiscount, minQuietGap)}
            className="w-full accent-amber-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-medium text-stone-900">Min quiet gap (min)</label>
            <span className="text-[13px] font-medium text-amber-700">{minQuietGap} min</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            value={minQuietGap}
            onChange={(e) => setMinQuietGap(+e.target.value)}
            onMouseUp={() => persistSettings(maxDiscount, minQuietGap)}
            onTouchEnd={() => persistSettings(maxDiscount, minQuietGap)}
            className="w-full accent-amber-600"
          />
        </div>

        <div className="text-[10px] text-stone-700/55 h-3">
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && '✓ Saved — next offer uses these caps.'}
          {saveStatus === 'error' && '✗ Save failed.'}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="rounded-xl glass p-3 text-center"
          >
            <div className="text-[14px] font-medium text-stone-900">{stat.value}</div>
            <div className="text-[10px] text-stone-700/60 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Send offer button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSendOffer}
        disabled={sending}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full h-12 rounded-full bg-stone-900 text-white font-medium text-[15px] disabled:opacity-50"
      >
        {sending ? 'Sending…' : '🔔 Send Moment Offer'}
      </motion.button>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-xl p-3 text-[12px] text-center ${
            result.includes('✓')
              ? 'bg-emerald-100/60 text-emerald-900'
              : 'bg-rose-100/60 text-rose-900'
          }`}
        >
          {result}
        </motion.div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-amber-600/20 bg-amber-50/30 p-3 text-[11px] text-amber-900/70">
        <p>💡 Open the app on your phone, then tap <strong>"Send Moment Offer"</strong> to trigger a real push notification.</p>
      </div>
    </div>
  );
}

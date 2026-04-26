import { motion } from 'framer-motion';
import { useState } from 'react';
import { apiUrl } from '../lib/api';

export default function MerchantPage() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [maxDiscount, setMaxDiscount] = useState(30);
  const [minQuietGap, setMinQuietGap] = useState(20);

  const handleSendOffer = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl('/push/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Local Pulse',
          body: `31°C at Luisenplatz · –${maxDiscount}% iced coffee at BACK FACTORY, 2 min away. Tap to claim.`,
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

  return (
    <div className="pb-24 px-4 py-4 space-y-5">
      {/* Merchant info */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl glass p-5"
      >
        <div className="serif text-[18px] font-medium text-stone-900">BACK FACTORY</div>
        <div className="text-[12px] text-stone-700/70 mt-1">📍 Luisenplatz, Darmstadt</div>
      </motion.div>

      {/* Quiet hours */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl glass p-4"
      >
        <div className="text-[11px] uppercase tracking-wider text-stone-700/60">Today's quiet period</div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 w-[38%]" />
          </div>
          <span className="text-[13px] font-medium text-stone-900">38 min</span>
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
            className="w-full accent-amber-600"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Offers sent', value: '3' },
          { label: 'Accepted', value: '2' },
          { label: 'Revenue saved', value: '€12.40' },
          { label: 'Cashback issued', value: '€3.60' },
        ].map((stat, i) => (
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

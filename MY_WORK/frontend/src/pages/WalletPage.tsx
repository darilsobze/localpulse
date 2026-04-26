import { motion } from 'framer-motion';

export default function WalletPage() {
  const balance = 12.40;
  const stamps = [
    { merchant: 'BACK FACTORY', count: 3 },
    { merchant: "Danny's Eis", count: 1 },
  ];
  const journal = [
    { date: 'Today', merchant: 'BACK FACTORY', item: 'Iced coffee + pretzel', saved: 1.80, temp: 31 },
    { date: 'Yesterday', merchant: 'BACK FACTORY', item: 'Cappuccino', saved: 0.90, temp: 28 },
    { date: '2 days ago', merchant: "Danny's Eis", item: 'Spaghettieis', saved: 2.50, temp: 26 },
  ];

  return (
    <div className="pb-24 px-4 py-4 space-y-5">
      {/* Balance card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl glass p-5"
      >
        <div className="text-[11px] uppercase tracking-[0.2em] text-stone-700/60">Your City Wallet</div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[48px] font-light text-stone-900">€{balance.toFixed(2)}</span>
          <span className="text-[13px] text-stone-700/60">cashback credit</span>
        </div>
        <p className="text-[11px] text-stone-700/70 mt-2">Available across all partner merchants in Darmstadt</p>
      </motion.div>

      {/* Stamps */}
      <div>
        <h3 className="text-[13px] font-medium text-stone-900 px-1 mb-2">Your stamps</h3>
        <div className="grid grid-cols-2 gap-2">
          {stamps.map((s) => (
            <motion.div
              key={s.merchant}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="rounded-xl p-3 border border-amber-600/40 flex items-center justify-center text-center"
              style={{
                background: 'radial-gradient(circle, rgba(255,228,180,0.6), rgba(220,160,90,0.35))',
              }}
            >
              <div>
                <div className="text-[28px] font-light">#{s.count}</div>
                <div className="text-[9px] uppercase tracking-wider text-amber-900/70 mt-1">{s.merchant}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Journal */}
      <div>
        <h3 className="text-[13px] font-medium text-stone-900 px-1 mb-2">Moment journal</h3>
        <div className="space-y-2">
          {journal.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl glass p-3 text-[12px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-stone-900 font-medium">{entry.merchant}</p>
                  <p className="text-stone-700/65 text-[11px] mt-0.5">{entry.item}</p>
                  <p className="text-stone-700/50 text-[10px] mt-1">{entry.date} · {entry.temp}°</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-700 font-medium">+€{entry.saved.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

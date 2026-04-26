import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getJson } from '../lib/api';

const USER_ID = 'demo_user';

type WalletResponse = {
  user_id: string;
  balance_eur: number;
  stamps: Record<string, number>;
};

type RedemptionRow = {
  id: string;
  user_id: string;
  merchant_id: string;
  merchant_name: string;
  offer_code: string;
  discount_pct: number;
  cashback_eur: number;
  created_at: string;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return 'Today';
  if (diffMs < 2 * day) return 'Yesterday';
  const days = Math.floor(diffMs / day);
  return `${days} days ago`;
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [stamps, setStamps] = useState<{ merchant: string; count: number }[]>([]);
  const [journal, setJournal] = useState<RedemptionRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wallet, history] = await Promise.all([
          getJson<WalletResponse>(`/wallet/${USER_ID}`),
          getJson<RedemptionRow[]>(`/wallet/${USER_ID}/history`),
        ]);
        if (cancelled) return;
        setBalance(wallet.balance_eur ?? 0);
        const stampDict = wallet.stamps ?? {};
        setStamps(Object.entries(stampDict).map(([merchant, count]) => ({ merchant, count })));
        setJournal(history);
      } catch (e) {
        console.warn('[wallet] backend fetch failed:', e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        {stamps.length === 0 ? (
          <div className="text-[11px] text-stone-700/55 px-1">
            {loaded ? 'No stamps yet — claim a moment to start your collection.' : 'Loading…'}
          </div>
        ) : (
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
        )}
      </div>

      {/* Journal */}
      <div>
        <h3 className="text-[13px] font-medium text-stone-900 px-1 mb-2">Moment journal</h3>
        {journal.length === 0 ? (
          <div className="text-[11px] text-stone-700/55 px-1">
            {loaded ? 'Your moments will land here once you redeem.' : 'Loading…'}
          </div>
        ) : (
          <div className="space-y-2">
            {journal.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl glass p-3 text-[12px]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-stone-900 font-medium">{entry.merchant_name}</p>
                    <p className="text-stone-700/65 text-[11px] mt-0.5">−{entry.discount_pct}% offer</p>
                    <p className="text-stone-700/50 text-[10px] mt-1">{formatRelative(entry.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-700 font-medium">+€{entry.cashback_eur.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

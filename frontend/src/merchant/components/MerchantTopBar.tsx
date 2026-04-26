import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { MerchantSession, MerchantState } from '../lib/merchantStore';

type Props = {
  session: MerchantSession;
  state: MerchantState;
  onSignOut: () => void;
};

export default function MerchantTopBar({ session, state, onSignOut }: Props) {
  const navigate = useNavigate();
  const quietPct = Math.round(state.quietScore * 100);
  const isQuiet = state.quietScore >= 0.55;
  const isPaused = state.paused;

  const { pillClass, pillLabel } = isPaused
    ? { pillClass: 'm-pill warn', pillLabel: 'Paused' }
    : isQuiet
    ? { pillClass: 'm-pill', pillLabel: `Quiet · AI active · ${quietPct}%` }
    : { pillClass: 'm-pill idle', pillLabel: `Busy · holding · ${quietPct}%` };

  return (
    <header
      className="relative z-30 flex items-center justify-between px-4 pt-3 pb-2"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <button
        onClick={() => navigate('/m/today')}
        className="flex items-center gap-2.5 text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-semibold"
          style={{
            background: `linear-gradient(135deg, ${session.brandHue1}, ${session.brandHue2})`,
            color: '#0b1320',
          }}
        >
          {session.merchantName.slice(0, 1)}
        </div>
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-text-mute)' }}>
            City Wallet · Merchant
          </div>
          <div className="text-[14px] font-medium truncate max-w-[180px]" style={{ color: 'var(--m-text)' }}>
            {session.merchantName}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <motion.div
          key={pillLabel}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={pillClass}
        >
          <span className="m-dot" />
          <span className="num">{pillLabel}</span>
        </motion.div>
        <button
          onClick={onSignOut}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[14px]"
          style={{ background: 'var(--m-bg-elev)', border: '1px solid var(--m-line)', color: 'var(--m-text-dim)' }}
          aria-label="Sign out"
          title="Sign out"
        >
          ⎋
        </button>
      </div>
    </header>
  );
}

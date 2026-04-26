import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type Tab = {
  path: string;
  label: string;
  icon: string;
};

// Two pairs flank a center scanner FAB so the camera stays the
// pull-of-the-eye action — same pattern the consumer BottomNav uses.
const LEFT_TABS: Tab[]  = [
  { path: '/m/today', label: 'Today', icon: '◉' },
  { path: '/m/live',  label: 'Live',  icon: '◢' },
];
const RIGHT_TABS: Tab[] = [
  { path: '/m/rules',    label: 'Rules',    icon: '☷' },
  { path: '/m/insights', label: 'Insights', icon: '◭' },
];

type Props = {
  onScan: () => void;
};

export default function MerchantTabBar({ onScan }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const renderTab = (tab: Tab) => {
    const active = location.pathname === tab.path;
    return (
      <button
        key={tab.path}
        onClick={() => navigate(tab.path)}
        className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium"
        style={{ color: active ? 'var(--m-accent)' : 'var(--m-text-mute)' }}
      >
        {active && (
          <motion.div
            layoutId="merchant-tab-active"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
            style={{ background: 'var(--m-accent)', boxShadow: '0 0 12px var(--m-accent-glow)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="text-[16px] leading-none">{tab.icon}</span>
        <span className="leading-none">{tab.label}</span>
      </button>
    );
  };

  return (
    <nav
      className="absolute bottom-0 inset-x-0 z-30 grid grid-cols-5"
      style={{
        background: 'rgba(8, 12, 22, 0.85)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderTop: '1px solid var(--m-line)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(4.75rem + env(safe-area-inset-bottom))',
      }}
    >
      {LEFT_TABS.map(renderTab)}

      {/* Scanner FAB — protrudes above the bar, owns the merchant's primary action */}
      <div className="relative flex items-end justify-center pb-1">
        <motion.button
          type="button"
          onClick={onScan}
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04, y: -2 }}
          aria-label="Scan customer QR"
          className="absolute -top-6 grid h-[60px] w-[60px] place-items-center rounded-full"
          style={{
            background: 'linear-gradient(150deg, #c5f54a 0%, #84cc16 70%, #4d7c0f 100%)',
            boxShadow:
              '0 14px 30px -10px rgba(197, 245, 74, 0.55), 0 0 0 4px rgba(8, 12, 22, 1), 0 0 0 5px rgba(197, 245, 74, 0.35)',
            color: '#0b1320',
          }}
        >
          {/* Camera glyph */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8.5a2 2 0 0 1 2-2h2.2a1 1 0 0 0 .8-.4l1-1.3a1 1 0 0 1 .8-.4h2.4a1 1 0 0 1 .8.4l1 1.3a1 1 0 0 0 .8.4H18a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.5z"
              stroke="#0b1320"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.4" stroke="#0b1320" strokeWidth="1.8" />
          </svg>
          {/* Subtle pulsing ring */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: '1.5px solid rgba(197, 245, 74, 0.7)' }}
            animate={{ scale: [1, 1.25], opacity: [0.55, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        </motion.button>
        <span
          className="text-[10px] font-medium leading-none mb-1.5 mt-auto"
          style={{ color: 'var(--m-text-mute)', marginTop: 'auto' }}
        >
          Scan
        </span>
      </div>

      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}

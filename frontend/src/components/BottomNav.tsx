import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type Props = {
  onOpenMap: () => void;
};

const leftTabs = [
  { name: 'Profile',  icon: '👤', path: '/profile' },
  { name: 'Home',     icon: '🏠', path: '/' },
];

const rightTabs = [
  { name: 'Discover', icon: '🗺', path: '/discover' },
  { name: 'Wallet',   icon: '💳', path: '/wallet' },
];

export default function BottomNav({ onOpenMap }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 inset-x-0 z-40 grid h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] grid-cols-5 border-t border-stone-700/15 pb-[env(safe-area-inset-bottom)] glass-soft"
    >
      {leftTabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
            isActive(tab.path)
              ? 'text-stone-900 bg-white/30'
              : 'text-stone-700/60 hover:text-stone-800'
          }`}
        >
          <span className="text-[18px]">{tab.icon}</span>
          {tab.name}
        </button>
      ))}

      <div className="relative flex items-center justify-center">
        <motion.button
          type="button"
          onClick={onOpenMap}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="absolute -top-[var(--bottom-nav-fab-overlap)] grid h-16 w-16 place-items-center rounded-full border border-white/70 bg-gradient-to-br from-emerald-500 via-lime-400 to-amber-300 text-stone-950 shadow-[0_18px_42px_-20px_rgba(5,150,105,0.95)]"
          aria-label="Open interactive map"
        >
          <span className="absolute inset-1 rounded-full bg-white/20" />
          <span className="relative text-[25px]">🗺</span>
        </motion.button>
        <span className="mt-10 text-[10px] font-medium text-stone-700/70">Map</span>
      </div>

      {rightTabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
            isActive(tab.path)
              ? 'text-stone-900 bg-white/30'
              : 'text-stone-700/60 hover:text-stone-800'
          }`}
        >
          <span className="text-[18px]">{tab.icon}</span>
          {tab.name}
        </button>
      ))}
    </motion.nav>
  );
}

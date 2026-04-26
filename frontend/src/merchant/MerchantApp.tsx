import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './MerchantTheme.css';

import LoginPage from './pages/LoginPage';
import TodayPage from './pages/TodayPage';
import LivePage from './pages/LivePage';
import RulesPage from './pages/RulesPage';
import InsightsPage from './pages/InsightsPage';

import MerchantTopBar from './components/MerchantTopBar';
import MerchantTabBar from './components/MerchantTabBar';
import RedemptionToast from './components/RedemptionToast';
import MerchantScanSheet from './components/MerchantScanSheet';

import { clearSession, clearStore, loadSession } from './lib/merchantStore';
import { useMerchantStore } from './lib/useMerchantStore';

export default function MerchantApp() {
  return (
    <div className="merchant-root">
      <div className="absolute inset-0 m-grid-bg pointer-events-none" />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="today"     element={<MerchantShell><TodayPage /></MerchantShell>} />
        <Route path="live"      element={<MerchantShell><LivePage /></MerchantShell>} />
        <Route path="rules"     element={<MerchantShell><RulesPage /></MerchantShell>} />
        <Route path="insights"  element={<MerchantShell><InsightsPage /></MerchantShell>} />
        <Route path="" element={<Navigate to="login" replace />} />
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    </div>
  );
}

function MerchantShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const session = loadSession();

  useEffect(() => {
    if (!session) navigate('/m/login', { replace: true });
  }, [session, navigate]);

  if (!session) return null;

  return <ShellInner sessionMerchantId={session.merchantId}>{children}</ShellInner>;
}

function ShellInner({
  children,
  sessionMerchantId,
}: {
  children: React.ReactNode;
  sessionMerchantId: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = loadSession()!;
  const { state } = useMerchantStore(sessionMerchantId);
  const [scanOpen, setScanOpen] = useState(false);

  const handleSignOut = () => {
    clearSession();
    clearStore();
    navigate('/m/login', { replace: true });
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      <MerchantTopBar session={session} state={state} onSignOut={handleSignOut} />
      <RedemptionToast />

      <main
        className="flex-1 min-h-0 m-scroll px-4"
        style={{
          paddingBottom: 'calc(4.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <MerchantTabBar onScan={() => setScanOpen(true)} />

      <MerchantScanSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        session={session}
        liveOffers={state.liveOffers}
      />
    </div>
  );
}

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/BottomNav';
import InteractiveMapOverlay from './components/InteractiveMapOverlay';
import MerchantApp from './merchant/MerchantApp';

export default function App() {
  return (
    <BrowserRouter>
      <RootShell />
    </BrowserRouter>
  );
}

function RootShell() {
  const [mapOpen, setMapOpen] = useState(false);
  const location = useLocation();
  const isMerchant = location.pathname === '/m' || location.pathname.startsWith('/m/');

  if (isMerchant) {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        <Routes>
          <Route path="/m/*" element={<MerchantApp />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen flex flex-col bg-paper overflow-hidden">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/merchant" element={<Navigate to="/m" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav onOpenMap={() => setMapOpen(true)} />
      <AnimatePresence>
        {mapOpen && <InteractiveMapOverlay onClose={() => setMapOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import WalletPage from './pages/WalletPage';
import MerchantPage from './pages/MerchantPage';
import BottomNav from './components/BottomNav';
import InteractiveMapOverlay from './components/InteractiveMapOverlay';
import NotificationControls from './components/NotificationControls';

export default function App() {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="relative w-screen h-screen flex flex-col bg-paper overflow-hidden">
        <NotificationControls />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/merchant" element={<MerchantPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav onOpenMap={() => setMapOpen(true)} />
        <AnimatePresence>
          {mapOpen && <InteractiveMapOverlay onClose={() => setMapOpen(false)} />}
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MERCHANT_SEEDS, type MerchantSeed } from '../lib/mockData';
import { saveSession, sessionFromSeed, ensureStore } from '../lib/merchantStore';
import { unlockAudio } from '../lib/sounds';

export default function LoginPage() {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<MerchantSeed | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = () => {
    if (!picked) return;
    unlockAudio();
    setSigningIn(true);
    saveSession(sessionFromSeed(picked));
    ensureStore(picked.id);
    setTimeout(() => navigate('/m/today', { replace: true }), 480);
  };

  return (
    <div className="absolute inset-0 flex flex-col px-5 m-scroll" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
      <div className="absolute inset-0 m-grid-bg pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10"
      >
        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--m-text-mute)' }}>
          City Wallet · Merchant
        </div>
        <h1 className="text-[26px] font-medium mt-1.5 leading-[1.1]" style={{ color: 'var(--m-text)' }}>
          Sign in to your shop.
        </h1>
        <p className="text-[13px] mt-1.5 max-w-[280px] leading-snug" style={{ color: 'var(--m-text-dim)' }}>
          Two phones, two views. The customer side runs on <span className="num">/</span>; merchants live here.
        </p>
      </motion.div>

      <div className="relative z-10 mt-7 grid grid-cols-1 gap-2.5">
        {MERCHANT_SEEDS.map((m, i) => {
          const active = picked?.id === m.id;
          return (
            <motion.button
              key={m.id}
              onClick={() => setPicked(m)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04, duration: 0.3 }}
              whileTap={{ scale: 0.985 }}
              className="m-card flex items-center gap-3 p-3 text-left transition"
              style={{
                borderColor: active ? 'var(--m-accent)' : 'var(--m-line)',
                boxShadow: active ? '0 0 0 1px var(--m-accent), 0 12px 28px -16px var(--m-accent-glow)' : 'none',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-[18px]"
                style={{
                  background: `linear-gradient(135deg, ${m.brandHue1}, ${m.brandHue2})`,
                  color: '#0b1320',
                }}
              >
                {m.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate" style={{ color: 'var(--m-text)' }}>{m.name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--m-text-mute)' }}>
                  {m.address}
                </div>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{
                  borderColor: active ? 'var(--m-accent)' : 'var(--m-line-strong)',
                  background: active ? 'var(--m-accent)' : 'transparent',
                }}
              >
                {active && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                  >
                    <path d="M2 6.5 L5 9 L10 3" stroke="#0b1320" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 mt-6"
      >
        <button
          disabled={!picked || signingIn}
          onClick={handleSignIn}
          className="m-button primary w-full"
          style={{ opacity: !picked || signingIn ? 0.5 : 1, height: 48 }}
        >
          {signingIn ? 'Signing in…' : picked ? `Continue as ${picked.name}` : 'Pick a shop to continue'}
        </button>
        <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--m-text-mute)' }}>
          Mock auth · no password · for demo only.
        </p>
      </motion.div>
    </div>
  );
}

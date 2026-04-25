import { motion } from 'framer-motion';

type Props = { onBack: () => void };

// Stylized isometric Darmstadt — Luisenplatz district. Not real geo.
export default function CityMap({ onBack }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-[360px] glass rounded-[28px] p-5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-stone-700/60">
          Darmstadt · Luisenplatz
        </div>
        <button onClick={onBack} className="text-[12px] text-stone-700/70">← back</button>
      </div>

      <div className="mt-3 relative h-[340px] rounded-2xl overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 50% 110%, rgba(255,200,140,0.5), transparent 60%), linear-gradient(180deg, #ffd9a0 0%, #f9b27a 100%)',
        }}
      >
        <svg viewBox="0 0 360 340" className="absolute inset-0 w-full h-full">
          {/* Roads — light streaks */}
          <g opacity="0.35">
            <path d="M -20 200 L 380 110" stroke="#fff7e8" strokeWidth="22" />
            <path d="M 180 -20 L 180 360" stroke="#fff7e8" strokeWidth="18" />
            <path d="M -20 280 L 380 200" stroke="#fff7e8" strokeWidth="14" />
          </g>

          {/* Isometric buildings */}
          <Building x={60} y={150} w={36} h={28} z={40} fill="#e08a5c" />
          <Building x={110} y={170} w={42} h={32} z={26} fill="#cf7a4e" />
          <Building x={70} y={210} w={32} h={26} z={20} fill="#d68460" />
          <Building x={210} y={120} w={48} h={36} z={50} fill="#b56741" />
          <Building x={270} y={150} w={40} h={30} z={30} fill="#cd7c52" />
          <Building x={250} y={210} w={38} h={28} z={22} fill="#dc8a5e" />
          <Building x={140} y={250} w={44} h={34} z={28} fill="#c97650" />
          <Building x={210} y={260} w={36} h={26} z={18} fill="#e09467" />

          {/* Plaza — Luisenplatz */}
          <g transform="translate(190, 195)">
            <ellipse cx="0" cy="0" rx="48" ry="22" fill="#ffe7c4" opacity="0.85" />
            <ellipse cx="0" cy="0" rx="48" ry="22" fill="none" stroke="#ffffff" strokeOpacity="0.5" />
            <text x="0" y="3" textAnchor="middle" fontSize="8" fill="#7a4520"
              style={{ letterSpacing: '0.15em' }}>LUISENPLATZ</text>
          </g>

          {/* Trees */}
          <Tree cx={50} cy={100} />
          <Tree cx={320} cy={100} />
          <Tree cx={40} cy={290} />
          <Tree cx={320} cy={300} />
          <Tree cx={170} cy={70} />
        </svg>

        {/* User dot — left of plaza */}
        <div className="absolute" style={{ left: '34%', top: '55%' }}>
          <div className="relative">
            <span className="absolute inset-0 -m-3 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,200,120,0.6), transparent 70%)' }} />
            <span className="absolute -inset-1 rounded-full bg-amber-300/70 animate-ping" />
            <span className="relative block w-3 h-3 rounded-full bg-amber-600 ring-2 ring-white" />
          </div>
          <div className="text-[9px] text-stone-800/70 mt-1 tracking-wider">YOU</div>
        </div>

        {/* BACK FACTORY bloom */}
        <div className="absolute" style={{ left: '54%', top: '50%' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 14, delay: 0.3 }}
          >
            <span className="absolute inset-0 -m-6 rounded-full animate-pulse-slow"
              style={{
                background: 'radial-gradient(circle, rgba(255,180,80,0.85), transparent 70%)',
                filter: 'blur(2px)',
              }}
            />
            <div className="relative flex flex-col items-center">
              <span className="w-4 h-4 rounded-full bg-amber-400 ring-2 ring-white shadow-[0_0_24px_rgba(245,180,80,0.9)]" />
              <span className="mt-1 text-[9px] font-medium text-stone-900 bg-white/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                BACK FACTORY
              </span>
            </div>
          </motion.div>
        </div>

        {/* Ghost pulses — others */}
        <GhostPulse left="22%" top="30%" delay={0.6} label="redeemed 4m ago" />
        <GhostPulse left="74%" top="72%" delay={1.4} label="redeemed 11m ago" />
        <GhostPulse left="44%" top="80%" delay={2.1} label="" />
        <GhostPulse left="80%" top="32%" delay={2.8} label="" />

        {/* Heat shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none animate-breathe"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,240,200,0.35), transparent 60%)',
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-stone-700/70">
        <div>3 moments blooming nearby</div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> live
        </div>
      </div>
    </motion.div>
  );
}

function Building({ x, y, w, h, z, fill }: { x: number; y: number; w: number; h: number; z: number; fill: string }) {
  // Simple isometric-ish box: top + left + right faces
  const top = `M ${x} ${y} L ${x + w / 2} ${y - h / 2} L ${x + w} ${y} L ${x + w / 2} ${y + h / 2} Z`;
  const left = `M ${x} ${y} L ${x + w / 2} ${y + h / 2} L ${x + w / 2} ${y + h / 2 + z} L ${x} ${y + z} Z`;
  const right = `M ${x + w / 2} ${y + h / 2} L ${x + w} ${y} L ${x + w} ${y + z} L ${x + w / 2} ${y + h / 2 + z} Z`;
  return (
    <g>
      <path d={left} fill={fill} fillOpacity="0.7" />
      <path d={right} fill={fill} fillOpacity="0.85" />
      <path d={top} fill={fill} fillOpacity="0.55" stroke="#ffffff" strokeOpacity="0.3" />
    </g>
  );
}

function Tree({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="9" ry="7" fill="#5d8a4a" fillOpacity="0.75" />
      <ellipse cx={cx - 3} cy={cy - 2} rx="4" ry="3" fill="#7aa362" fillOpacity="0.7" />
    </g>
  );
}

function GhostPulse({ left, top, delay, label }: { left: string; top: string; delay: number; label: string }) {
  return (
    <div className="absolute" style={{ left, top }}>
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1], opacity: [0, 0.8, 0.5] }}
        transition={{ delay, duration: 2.2, repeat: Infinity, repeatDelay: 4, ease: 'easeOut' }}
        className="block w-2 h-2 rounded-full bg-white/80"
        style={{ boxShadow: '0 0 16px rgba(255,255,255,0.9)' }}
      />
      {label && (
        <div className="text-[8px] text-stone-800/60 mt-1 whitespace-nowrap">{label}</div>
      )}
    </div>
  );
}

import { motion } from 'framer-motion';

type Point = { day: string; revenue: number; redemptions: number };

type Props = {
  points: Point[];
  height?: number;
};

export default function SparkChart({ points, height = 120 }: Props) {
  if (points.length === 0) return null;
  const W = 320;
  const H = height;
  const PAD_X = 16;
  const PAD_TOP = 18;
  const PAD_BOT = 24;
  const usableW = W - PAD_X * 2;
  const usableH = H - PAD_TOP - PAD_BOT;

  const max = Math.max(...points.map((p) => p.revenue));
  const min = Math.min(...points.map((p) => p.revenue));
  const range = Math.max(1, max - min);

  const x = (i: number) => PAD_X + (i / (points.length - 1)) * usableW;
  const y = (v: number) => PAD_TOP + usableH - ((v - min) / range) * usableH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.revenue).toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(2)},${(PAD_TOP + usableH).toFixed(2)} L${x(0).toFixed(2)},${(PAD_TOP + usableH).toFixed(2)} Z`;

  // Highlight the lowest day — this is "your softest window"
  const minIdx = points.reduce((acc, p, i, arr) => (p.revenue < arr[acc].revenue ? i : acc), 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(197, 245, 74, 0.35)" />
          <stop offset="100%" stopColor="rgba(197, 245, 74, 0)" />
        </linearGradient>
      </defs>

      <motion.path
        d={areaPath}
        fill="url(#sparkArea)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke="var(--m-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        style={{ filter: 'drop-shadow(0 0 6px rgba(197, 245, 74, 0.4))' }}
      />

      {points.map((p, i) => (
        <g key={p.day}>
          <circle
            cx={x(i)}
            cy={y(p.revenue)}
            r={i === minIdx ? 4 : 2.4}
            fill={i === minIdx ? '#fbbf24' : 'var(--m-accent)'}
            stroke="#0b1320"
            strokeWidth={1.5}
          />
          <text
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="rgba(233, 238, 249, 0.5)"
            fontFamily="Geist, ui-sans-serif, system-ui"
          >
            {p.day}
          </text>
        </g>
      ))}

      {/* Min-day callout */}
      <g>
        <rect
          x={x(minIdx) - 26}
          y={y(points[minIdx].revenue) - 28}
          width={52}
          height={18}
          rx={5}
          fill="rgba(251, 191, 36, 0.18)"
          stroke="rgba(251, 191, 36, 0.45)"
          strokeWidth={1}
        />
        <text
          x={x(minIdx)}
          y={y(points[minIdx].revenue) - 15}
          textAnchor="middle"
          fontSize={10}
          fill="#fbbf24"
          fontFamily="Geist, ui-sans-serif, system-ui"
          fontWeight={500}
        >
          softest
        </text>
      </g>
    </svg>
  );
}

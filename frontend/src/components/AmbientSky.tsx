import { useMemo } from 'react';

export default function AmbientSky() {
  const motes = useMemo(
    () =>
      Array.from({ length: 22 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 14,
        size: 2 + Math.random() * 4,
        duration: 12 + Math.random() * 10,
        opacity: 0.4 + Math.random() * 0.5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 sky-hot-noon sky-shimmer animate-shimmer" />
      <div className="absolute -top-20 -right-20 w-[60vw] h-[60vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,220,0.95) 0%, rgba(255,210,130,0.6) 25%, transparent 60%)',
          filter: 'blur(8px)',
        }}
      />
      <div className="absolute inset-0 heat-haze animate-breathe" />
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-mote"
          style={{
            left: `${m.left}%`,
            bottom: '-10px',
            width: m.size,
            height: m.size,
            opacity: m.opacity,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
            boxShadow: '0 0 8px rgba(255,240,200,0.9)',
          }}
        />
      ))}
      <div className="absolute inset-0 grain" />
    </div>
  );
}

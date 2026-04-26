const motes = Array.from({ length: 22 }, (_, i) => {
  const seed = i + 1;

  return {
    left: (seed * 37) % 100,
    delay: (seed * 1.7) % 14,
    size: 2 + ((seed * 13) % 40) / 10,
    duration: 12 + ((seed * 19) % 100) / 10,
    opacity: 0.4 + ((seed * 11) % 50) / 100,
  };
});

export default function AmbientSky() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 sky-hot-noon sky-shimmer animate-shimmer" />
      <div className="absolute inset-0 ambient-flow">
        <div className="flow-orb flow-orb-one" />
        <div className="flow-orb flow-orb-two" />
        <div className="flow-orb flow-orb-three" />
      </div>
      <div className="absolute inset-0 warm-current" />
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

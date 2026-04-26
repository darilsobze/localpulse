import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { WeatherData } from '../lib/weather';
import { fetchWeather } from '../lib/weather';

export default function DiscoverPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetchWeather().then(setWeather);
    const timer = setInterval(() => fetchWeather().then(setWeather), 30000);
    return () => clearInterval(timer);
  }, []);

  const offers = [
    { name: 'BACK FACTORY', distance: '240m', discount: '–30%', item: 'Iced coffee + pretzel', icon: '🥨' },
    { name: "Danny's Eis", distance: '380m', discount: '–20%', item: 'Spaghettieis', icon: '🍦' },
    { name: 'Café Müller', distance: '520m', discount: '–15%', item: 'Cappuccino', icon: '☕' },
  ];

  return (
    <div className="relative pb-24">
      {/* Map area (placeholder) */}
      <div className="relative h-[240px] w-full overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 50% 110%, rgba(255,200,140,0.5), transparent 60%), linear-gradient(180deg, #ffd9a0 0%, #f9b27a 100%)',
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-stone-700/70">
            <div className="text-[48px]">🗺</div>
            <div className="text-[13px] mt-2">Luisenplatz, Darmstadt</div>
            <div className="text-[11px] text-stone-700/60 mt-1">
              {weather ? `${weather.temp}° · ${weather.description}` : 'Loading…'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter / header */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-white/80 backdrop-blur border-b border-stone-700/15">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-stone-900">Nearby offers</span>
          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100/60 text-amber-900">
            {offers.length} active
          </span>
        </div>
      </div>

      {/* Offer cards */}
      <div className="px-3 py-4 space-y-3">
        {offers.map((offer, i) => (
          <motion.div
            key={offer.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl glass p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="serif text-[16px] font-medium text-stone-900">{offer.name}</h3>
                  <span className="text-[11px] text-stone-700/60">{offer.distance}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[24px]">{offer.icon}</span>
                  <div>
                    <p className="text-[13px] font-medium text-stone-800">{offer.item}</p>
                    <p className="text-[11px] text-stone-700/60">{offer.discount}</p>
                  </div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="ml-3 px-3 py-2 rounded-full bg-stone-900 text-white text-[11px] font-medium h-fit"
              >
                See
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

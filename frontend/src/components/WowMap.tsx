import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { WowEffect } from '../wow/WowEffect.js';
import '../wow/WowEffect.css';

export type WowMapHandle = {
  trigger: () => void;
  reset: () => void;
  showRoute: () => Promise<{ distance: number; duration: number } | null>;
};

type Props = {
  onFlightComplete: () => void;
  userLngLat: [number, number];
  targetLngLat: [number, number];
  socialProofCoords: [number, number][];
};

const WowMap = forwardRef<WowMapHandle, Props>(
  ({ onFlightComplete, userLngLat, targetLngLat, socialProofCoords }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wowRef = useRef<any>(null);
    const flightCb = useRef(onFlightComplete);
    flightCb.current = onFlightComplete;

    const userRef = useRef(userLngLat);
    const targetRef = useRef(targetLngLat);
    const socialRef = useRef(socialProofCoords);
    userRef.current = userLngLat;
    targetRef.current = targetLngLat;
    socialRef.current = socialProofCoords;

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    const [missingToken] = useState(!token);

    useEffect(() => {
      if (!containerRef.current || !token) return;

      const wow = new (WowEffect as any)({
        container: containerRef.current,
        mapboxToken: token,
        startLngLat: userRef.current,
        mapboxgl,
        onReady: () => {
          wow.updateUserLocation(userRef.current);
        },
        onFlightComplete: () => flightCb.current?.(),
      });

      wowRef.current = wow;

      return () => {
        try { wow.destroy(); } catch { /* noop */ }
        wowRef.current = null;
      };
    }, [token]);

    useEffect(() => {
      wowRef.current?.updateUserLocation(userLngLat);
    }, [userLngLat]);

    useImperativeHandle(ref, () => ({
      trigger: () =>
        wowRef.current?.trigger({
          targetLngLat: targetRef.current,
          socialProofCoords: socialRef.current,
          flightDuration: 4000,
        }),
      reset: () => wowRef.current?.reset(),
      showRoute: async () => {
        if (!wowRef.current) return null;
        try {
          return await wowRef.current.showRoute({
            from: userRef.current,
            to: targetRef.current,
          });
        } catch {
          return null;
        }
      },
    }));

  if (missingToken) {
    return (
      <div className="w-full h-full flex items-center justify-center text-stone-200 bg-stone-900">
        <div className="max-w-[280px] text-center px-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80">
            Mapbox token missing
          </div>
          <p className="mt-2 text-[13px] leading-snug text-stone-300">
            Add a Mapbox public token to <code className="text-amber-300">frontend/.env.local</code>:
          </p>
          <code className="block mt-2 text-[11px] text-amber-200">
            VITE_MAPBOX_TOKEN=pk.ey...
          </code>
          <p className="mt-3 text-[11px] text-stone-400">
            Then restart <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
});

WowMap.displayName = 'WowMap';
export default WowMap;

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { WowEffect } from '../wow/WowEffect.js';
import '../wow/WowEffect.css';

export type FitOptions = {
  padding?: number | { top: number; bottom: number; left: number; right: number };
  pitch?: number;
  bearing?: number;
  duration?: number;
};

export type WowMapHandle = {
  trigger: () => void;
  reset: () => void;
  showRoute: (fitOptions?: FitOptions) => Promise<{ distance: number; duration: number }>;
  isReady: () => boolean;
};

type Props = {
  onFlightComplete: () => void;
  onReady?: () => void;
  userLngLat: [number, number];
  targetLngLat: [number, number];
  socialProofCoords: [number, number][];
};

const WowMap = forwardRef<WowMapHandle, Props>(
  ({ onFlightComplete, onReady, userLngLat, targetLngLat, socialProofCoords }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wowRef = useRef<any>(null);
    const readyRef = useRef(false);
    const flightCb = useRef(onFlightComplete);
    const readyCb = useRef(onReady);
    flightCb.current = onFlightComplete;
    readyCb.current = onReady;

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

      readyRef.current = false;
      const wow = new (WowEffect as any)({
        container: containerRef.current,
        mapboxToken: token,
        startLngLat: userRef.current,
        mapboxgl,
        onReady: () => {
          readyRef.current = true;
          wow.updateUserLocation(userRef.current);
          readyCb.current?.();
        },
        onFlightComplete: () => flightCb.current?.(),
      });

      wowRef.current = wow;

      return () => {
        try { wow.destroy(); } catch { /* noop */ }
        wowRef.current = null;
        readyRef.current = false;
      };
    }, [token]);

    useEffect(() => {
      if (readyRef.current) wowRef.current?.updateUserLocation(userLngLat);
    }, [userLngLat]);

    useImperativeHandle(ref, () => ({
      trigger: () =>
        wowRef.current?.trigger({
          targetLngLat: targetRef.current,
          socialProofCoords: socialRef.current,
          flightDuration: 4000,
        }),
      reset: () => wowRef.current?.reset(),
      showRoute: async (fitOptions?: FitOptions) => {
        if (!wowRef.current) throw new Error('[WowMap] map not ready');
        return wowRef.current.showRoute({
          from: userRef.current,
          to: targetRef.current,
          fitOptions,
        });
      },
      isReady: () => readyRef.current,
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

import { apiUrl } from './api';
import type { WeatherData } from './weather';

export interface OfferText {
  title: string;
  description: string;
  discount_pct: number;
  weather_context: string;
  source: 'openai' | 'template_fallback';
}

export interface PayoneSignal {
  merchant_id: string;
  current_tph: number;
  expected_tph: number;
  quiet_score: number;
  is_quiet: boolean;
  hour: number;
  source: string;
}

export interface OfferResponse {
  status: 'success' | 'no_offer';
  reason?: string;
  merchant_id: string;
  merchant_name: string;
  merchant_address: string;
  category: string;
  targetLngLat: [number, number];
  offer: OfferText;
  distance_m: number;
  social_proof_coords: [number, number][];
  payone_signal: PayoneSignal;
  expires_in_sec: number;
}

export interface OfferRequest {
  user_lng: number;
  user_lat: number;
  temperature: number;
  weather_code: number;
  radius_m?: number;
}

const DEMO_FALLBACK: OfferResponse = {
  status: 'success',
  merchant_id: 'm_1',
  merchant_name: 'BACK FACTORY',
  merchant_address: 'Luisenpl. 4, 64283 Darmstadt',
  category: 'cafe',
  targetLngLat: [8.650439, 49.872310],
  offer: {
    title: 'Post-workout Choco-Latte',
    description: 'Skip the wait. High-protein recovery, 20% off for 15 min.',
    discount_pct: 20,
    weather_context: 'crisp_sunny',
    source: 'template_fallback',
  },
  distance_m: 100,
  social_proof_coords: [
    [8.6512, 49.8728],
    [8.6509, 49.8721],
    [8.6516, 49.8732],
    [8.6501, 49.8727],
  ],
  payone_signal: {
    merchant_id: 'm_1',
    current_tph: 3.2,
    expected_tph: 8.0,
    quiet_score: 0.60,
    is_quiet: true,
    hour: new Date().getHours(),
    source: 'demo_fallback',
  },
  expires_in_sec: 15 * 60,
};

export async function fetchOffer(
  coords: { lng: number; lat: number },
  weather: WeatherData | null,
): Promise<OfferResponse> {
  const body: OfferRequest = {
    user_lng: coords.lng,
    user_lat: coords.lat,
    temperature: weather?.temp ?? 22,
    weather_code: weather?.raw_code ?? 0,
    radius_m: 1500,
  };

  try {
    const res = await fetch(apiUrl('/offer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn('[offer] backend returned', res.status, '— using demo fallback');
      return DEMO_FALLBACK;
    }

    const data = (await res.json()) as OfferResponse;
    if (data.status !== 'success') {
      console.warn('[offer] no_offer:', data.reason, '— using demo fallback');
      return DEMO_FALLBACK;
    }
    return data;
  } catch (e) {
    console.error('[offer] fetch failed, using demo fallback:', e);
    return DEMO_FALLBACK;
  }
}

// ── Demo location override ────────────────────────────────────────────────
// During hackathon demo recordings we want the device to behave as if it
// were standing in front of "All Inclusive Fitness Darmstadt", Im Carree 1,
// 64283 Darmstadt — the user's actual demo spot. When the flag below is
// truthy, `getUserCoords` short-circuits the real GPS request and returns
// these coordinates instead. Disable by setting `VITE_DEMO_LOCATION=0`
// (or removing it) in `.env.local` to fall back to real geolocation.
export const DEMO_LOCATION = {
  label: 'All Inclusive Fitness Darmstadt · Im Carree 1, 64283 Darmstadt',
  lng: 8.65238,
  lat: 49.87158,
};

const FORCE_DEMO_LOCATION =
  (import.meta.env.VITE_DEMO_LOCATION ?? '1') !== '0';

export const DEFAULT_COORDS = FORCE_DEMO_LOCATION
  ? { lng: DEMO_LOCATION.lng, lat: DEMO_LOCATION.lat }
  : { lng: 8.6514, lat: 49.87275 };

export function getUserCoords(timeoutMs = 15000): Promise<{ lng: number; lat: number }> {
  return new Promise((resolve) => {
    if (FORCE_DEMO_LOCATION) {
      console.info(`[gps] demo override active → ${DEMO_LOCATION.label}`);
      return resolve({ lng: DEMO_LOCATION.lng, lat: DEMO_LOCATION.lat });
    }

    if (!('geolocation' in navigator)) {
      console.warn('[gps] navigator.geolocation unavailable — using fallback');
      return resolve(DEFAULT_COORDS);
    }

    if (!window.isSecureContext) {
      console.warn('[gps] insecure context — geolocation will be blocked. Use HTTPS or localhost.');
    }

    let settled = false;
    const settle = (coords: { lng: number; lat: number }, label: string) => {
      if (settled) return;
      settled = true;
      console.info(`[gps] ${label}:`, coords);
      resolve(coords);
    };

    const timer = setTimeout(() => {
      settle(DEFAULT_COORDS, 'timeout, using fallback');
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        settle(
          { lng: pos.coords.longitude, lat: pos.coords.latitude },
          `real GPS (±${Math.round(pos.coords.accuracy)}m)`,
        );
      },
      (err) => {
        clearTimeout(timer);
        const reason =
          err.code === err.PERMISSION_DENIED
            ? 'permission denied'
            : err.code === err.POSITION_UNAVAILABLE
            ? 'position unavailable'
            : err.code === err.TIMEOUT
            ? 'timed out'
            : err.message;
        settle(DEFAULT_COORDS, `geolocation failed (${reason}), using fallback`);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

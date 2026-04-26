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
  merchant_id: 'm_demo',
  merchant_name: 'BACK FACTORY',
  merchant_address: 'Luisenplatz, Darmstadt',
  category: 'cafe',
  targetLngLat: [8.6498, 49.8723],
  offer: {
    title: '–30% iced coffee, on the house side.',
    description: 'Cold drink + pretzel. Window seat is free, fan is on.',
    discount_pct: 30,
    weather_context: 'warm',
    source: 'template_fallback',
  },
  distance_m: 240,
  social_proof_coords: [
    [8.6510, 49.8736],
    [8.6489, 49.8716],
    [8.6525, 49.8722],
    [8.6502, 49.8740],
  ],
  payone_signal: {
    merchant_id: 'm_demo',
    current_tph: 4.2,
    expected_tph: 11.0,
    quiet_score: 0.62,
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

export const DEFAULT_COORDS = { lng: 8.6520, lat: 49.8730 };

export function getUserCoords(timeoutMs = 5000): Promise<{ lng: number; lat: number }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(DEFAULT_COORDS);

    const timer = setTimeout(() => resolve(DEFAULT_COORDS), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude });
      },
      () => {
        clearTimeout(timer);
        resolve(DEFAULT_COORDS);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

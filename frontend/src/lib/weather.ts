/**
 * Fetch live weather from backend (which proxies Open-Meteo).
 */

import { apiUrl } from './api';

export interface WeatherData {
  temp: number;
  description: string;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  windspeed: number;
  raw_code: number;
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const res = await fetch(apiUrl('/weather'), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Weather fetch failed:', e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function tempEmoji(_temp: number, condition: string): string {
  if (condition === 'sunny') return '☀';
  if (condition === 'rainy') return '🌧';
  if (condition === 'stormy') return '⛈';
  if (condition === 'snowy') return '❄';
  return '☁';
}

export function dressingSuggestion(temp: number): string {
  if (temp < 5) return 'Coat recommended';
  if (temp < 15) return 'Light jacket';
  if (temp < 20) return 'Comfortable';
  if (temp < 25) return 'Light clothing';
  return 'Very warm';
}

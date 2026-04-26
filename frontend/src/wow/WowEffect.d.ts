export class WowEffect {
  constructor(config: {
    container: string | HTMLElement;
    mapboxToken: string;
    startLngLat: [number, number];
    mapboxgl?: unknown;
    onReady?: () => void;
    onFlightComplete?: () => void;
  });
  updateUserLocation(lngLat: [number, number]): void;
  trigger(offer: {
    targetLngLat: [number, number];
    socialProofCoords?: [number, number][];
    flightDuration?: number;
  }): void;
  showRoute(params: {
    from: [number, number];
    to: [number, number];
  }): Promise<{ distance: number; duration: number }>;
  reset(): void;
  destroy(): void;
}

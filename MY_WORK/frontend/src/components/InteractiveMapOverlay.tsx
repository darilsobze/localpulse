import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type Props = {
  onClose: () => void;
};

const USER_LOCATION: [number, number] = [8.6520, 49.8730];
const BACK_FACTORY: [number, number] = [8.6498, 49.8723];
const BUILDING_LAYER_ID = 'lp-overlay-3d-buildings';

type MapMode = 'normal' | '3d';

const MAP_STYLES: Record<MapMode, string> = {
  normal: 'mapbox://styles/mapbox/streets-v12',
  '3d': 'mapbox://styles/mapbox/satellite-streets-v12',
};

function add3DBuildings(map: mapboxgl.Map) {
  if (map.getLayer(BUILDING_LAYER_ID)) return;

  const layers = map.getStyle().layers ?? [];
  const labelLayerId = layers.find(
    layer => layer.type === 'symbol' && layer.layout?.['text-field']
  )?.id;

  map.addLayer(
    {
      id: BUILDING_LAYER_ID,
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#c4a882',
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
        'fill-extrusion-opacity': 0.75,
      },
    },
    labelLayerId
  );
}

export default function InteractiveMapOverlay({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('normal');
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  useEffect(() => {
    if (!containerRef.current || !token || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES.normal,
      center: USER_LOCATION,
      zoom: 15,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-left');
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'bottom-left');

    const markers = [
      new mapboxgl.Marker({ color: '#059669' })
        .setLngLat(USER_LOCATION)
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setText('You are here'))
        .addTo(map),
      new mapboxgl.Marker({ color: '#f59e0b' })
        .setLngLat(BACK_FACTORY)
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setText('BACK FACTORY · Moment offer'))
        .addTo(map),
    ];

    mapRef.current = map;

    return () => {
      markers.forEach(marker => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(MAP_STYLES[mapMode]);

    if (mapMode === '3d') {
      map.once('style.load', () => {
        add3DBuildings(map);
        map.easeTo({ pitch: 62, bearing: -22, zoom: 16.2, duration: 1000 });
      });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, zoom: 15, duration: 900 });
    }
  }, [mapMode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-stone-950"
    >
      {token ? (
        <div ref={containerRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-8 text-center text-stone-200">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
              Mapbox token missing
            </div>
            <p className="mt-3 text-[13px] leading-snug text-stone-300">
              Add <code className="text-amber-200">VITE_MAPBOX_TOKEN</code> to <code className="text-amber-200">frontend/.env.local</code>, then restart the dev server.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-stone-950/75 to-transparent" />

      <div className="absolute left-4 top-4 rounded-2xl bg-stone-950/62 px-4 py-3 text-white shadow-2xl backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/80">
          Local map
        </div>
        <div className="serif mt-0.5 text-[19px] leading-none">
          Luisenplatz
        </div>
        <div className="mt-1 text-[11px] text-stone-300">
          Drag, zoom, and look around.
        </div>

        <button
          type="button"
          onClick={() => setMapMode(mode => mode === 'normal' ? '3d' : 'normal')}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-full bg-white/12 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-white/18"
          aria-pressed={mapMode === '3d'}
        >
          <span>{mapMode === '3d' ? '3D map' : 'Normal map'}</span>
          <span className={`relative h-5 w-9 rounded-full transition ${mapMode === '3d' ? 'bg-emerald-400' : 'bg-white/25'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${mapMode === '3d' ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      <div className="absolute right-4 top-4">
        <button
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-[20px] text-stone-900 shadow-xl backdrop-blur transition hover:bg-white"
          aria-label="Close map"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}

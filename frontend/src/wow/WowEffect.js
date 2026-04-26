/**
 * LocalPulse – WowEffect
 *
 * Usage (CDN / plain HTML):
 *   Load mapbox-gl via <script> tag first, then:
 *   const wow = new WowEffect({ container, mapboxToken, startLngLat });
 *
 * Usage (React / bundler):
 *   import mapboxgl from 'mapbox-gl';
 *   import 'mapbox-gl/dist/mapbox-gl.css';
 *   import '../WowEffect.css';
 *   import { WowEffect } from '../WowEffect';
 *   const wow = new WowEffect({ container, mapboxToken, startLngLat, mapboxgl });
 *
 * Public API:
 *   wow.updateUserLocation(lngLat)           – place/move "you are here" marker, fly map there
 *   wow.trigger(offer)                       – WOW camera flight + target marker
 *   async wow.showRoute({ from, to })        – fetch walking route, draw it, fit bounds
 *                                              returns { distance: meters, duration: seconds }
 *   wow.reset()                              – fly back to start, clear markers & route
 *   wow.destroy()                            – remove map from DOM
 */

export class WowEffect {
  #map;
  #mgl;
  #startLngLat;
  #markers = [];
  #userMarker = null;
  #onFlightComplete;

  /**
   * @param {object}             config
   * @param {string|HTMLElement} config.container
   * @param {string}             config.mapboxToken
   * @param {[number,number]}    config.startLngLat        - Initial map center [lng, lat]
   * @param {object}             [config.mapboxgl]         - Pass when using a bundler
   * @param {() => void}         [config.onReady]
   * @param {() => void}         [config.onFlightComplete]
   */
  constructor({ container, mapboxToken, startLngLat, mapboxgl: mgl, onReady, onFlightComplete }) {
    this.#mgl = mgl ?? window.mapboxgl;
    if (!this.#mgl) throw new Error('[WowEffect] mapbox-gl not found.');

    this.#mgl.accessToken = mapboxToken;
    this.#startLngLat = startLngLat;
    this.#onFlightComplete = onFlightComplete;

    this.#map = new this.#mgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: startLngLat,
      zoom: 14,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    this.#map.on('style.load', () => {
      this.#add3DBuildings();
      onReady?.();
    });
  }

  /**
   * Place or move the "you are here" marker and fly the map to that position.
   * Call this as soon as geolocation is available.
   * @param {[number,number]} lngLat
   */
  updateUserLocation(lngLat) {
    this.#startLngLat = lngLat;

    if (this.#userMarker) {
      this.#userMarker.setLngLat(lngLat);
    } else {
      const el = document.createElement('div');
      el.className = 'lp-user-marker';
      this.#userMarker = new this.#mgl.Marker(el).setLngLat(lngLat).addTo(this.#map);
    }

    this.#map.flyTo({ center: lngLat, zoom: 15, duration: 1200 });
  }

  /**
   * Trigger the WOW-Effect: camera flies to merchant and drops the target marker.
   * @param {object}            offer
   * @param {[number,number]}   offer.targetLngLat
   * @param {number}            [offer.flightDuration=4000]
   */
  trigger({ targetLngLat, flightDuration = 4000 }) {
    this.#clearOfferMarkers();

    this.#map.flyTo({
      center: targetLngLat,
      zoom: 17.5,
      pitch: 65,
      bearing: -20,
      duration: flightDuration,
      essential: true,
    });

    setTimeout(() => {
      this.#addTargetMarker(targetLngLat);
      this.#onFlightComplete?.();
    }, flightDuration);
  }

  /**
   * Fetch a walking route from Mapbox Directions API, draw it on the map, and fit the
   * viewport to show the full route. Resolves with distance (m) and duration (s).
   * @param {{ from: [number,number], to: [number,number], fitOptions?: object }} params
   * @returns {Promise<{ distance: number, duration: number }>}
   */
  async showRoute({ from, to, fitOptions }) {
    const token = this.#mgl.accessToken;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/walking/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}` +
      `?geometries=geojson&overview=full&access_token=${token}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`[WowEffect] Directions HTTP ${res.status}`);
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error('[WowEffect] No walking route returned');

    this.#drawRoute(route.geometry);
    this.#fitRouteOnMap(route.geometry.coordinates, fitOptions);

    return { distance: route.distance, duration: route.duration };
  }

  /** Fly back to start position, clear markers and route. */
  reset() {
    this.#clearOfferMarkers();
    this.#removeRouteLayer();
    this.#map.flyTo({ center: this.#startLngLat, zoom: 15, pitch: 0, bearing: 0, duration: 2000 });
  }

  /** Remove the map from the DOM. Call on component unmount. */
  destroy() {
    this.#clearOfferMarkers();
    this.#userMarker?.remove();
    this.#removeRouteLayer();
    this.#map.remove();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  #add3DBuildings() {
    const layers = this.#map.getStyle().layers;
    const labelLayerId = layers.find(
      (l) => l.type === 'symbol' && l.layout['text-field']
    )?.id;

    this.#map.addLayer(
      {
        id: 'lp-3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#c4a882',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base':   ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.75,
        },
      },
      labelLayerId
    );
  }

  #drawRoute(geometry) {
    if (this.#map.getSource('lp-route')) {
      this.#map.getSource('lp-route').setData(geometry);
      return;
    }

    this.#map.addSource('lp-route', { type: 'geojson', data: geometry });

    // Glow
    this.#map.addLayer({
      id: 'lp-route-glow',
      type: 'line',
      source: 'lp-route',
      paint: { 'line-color': '#ff8a00', 'line-width': 12, 'line-opacity': 0.25, 'line-blur': 6 },
    });

    // Main line
    this.#map.addLayer({
      id: 'lp-route-line',
      type: 'line',
      source: 'lp-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ff8a00', 'line-width': 4, 'line-opacity': 0.95 },
    });
  }

  #fitRouteOnMap(coordinates, fitOptions) {
    const bounds = coordinates.reduce(
      (b, c) => b.extend(c),
      new this.#mgl.LngLatBounds(coordinates[0], coordinates[0])
    );
    this.#map.fitBounds(bounds, {
      padding: 80,
      pitch: 45,
      bearing: 0,
      duration: 2000,
      ...(fitOptions || {}),
    });
  }

  #removeRouteLayer() {
    if (this.#map.getLayer('lp-route-glow')) this.#map.removeLayer('lp-route-glow');
    if (this.#map.getLayer('lp-route-line')) this.#map.removeLayer('lp-route-line');
    if (this.#map.getSource('lp-route'))     this.#map.removeSource('lp-route');
  }

  #addTargetMarker(lngLat) {
    const el = document.createElement('div');
    el.className = 'lp-target-marker';
    const marker = new this.#mgl.Marker(el).setLngLat(lngLat).addTo(this.#map);
    this.#markers.push(marker);
  }

  #addSocialProofMarkers(coords) {
    coords.forEach((coord, i) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'lp-pulse-marker';
        const marker = new this.#mgl.Marker(el).setLngLat(coord).addTo(this.#map);
        this.#markers.push(marker);
      }, i * 500);
    });
  }

  #clearOfferMarkers() {
    this.#markers.forEach((m) => m.remove());
    this.#markers = [];
  }
}

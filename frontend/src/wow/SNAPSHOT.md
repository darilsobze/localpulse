# WowEffect snapshot

Vendored copy of the 3D map effect from the parallel branch. Do **NOT** edit these files here — edit on `feature/3d-map` and refresh.

## Source

- Branch: `origin/feature/3d-map`
- Commit: `6b0da88b5cac42041cd220618b96b8e6ff9f6251`
- Files: `src/WowEffect.js`, `src/WowEffect.css`

## Refresh

From repo root:

```sh
git fetch origin feature/3d-map
git show origin/feature/3d-map:src/WowEffect.js  > frontend/src/wow/WowEffect.js
git show origin/feature/3d-map:src/WowEffect.css > frontend/src/wow/WowEffect.css
git -C . rev-parse origin/feature/3d-map  # update commit hash above
```

Smoke-test the demo afterwards (`npm run dev` in `frontend/`).

## Public API (consumed by `WowMap.tsx`)

- `new WowEffect({ container, mapboxToken, startLngLat, mapboxgl, onReady, onFlightComplete })`
- `updateUserLocation([lng, lat])`
- `trigger({ targetLngLat, socialProofCoords?, flightDuration? })`
- `showRoute({ from, to })` → `{ distance, duration }`
- `reset()`
- `destroy()`

When the friend's branch lands in master, replace this vendored copy with imports from the merged path and delete the `frontend/src/wow/` directory.

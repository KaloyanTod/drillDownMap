// -----------------------------------------------------------------------------
// Camera math
// -----------------------------------------------------------------------------
// Pure-ish helpers that translate geometry into a camera position. Separated
// from the map lifecycle so the "where should the camera go" logic can be read,
// reasoned about, and unit-tested in isolation. `computeCamera` never moves the
// map; `moveTo` is the only function with a side effect.

import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

// First longitude of a geometry, used as the reference lng when re-centering an
// antimeridian-crossing feature.
function firstLongitude(geo) {
  if (geo.type !== 'FeatureCollection' || geo.features.length === 0) return null;
  const geom = geo.features[0].geometry;
  if (geom.type === 'Polygon') return geom.coordinates[0][0][0];
  if (geom.type === 'MultiPolygon') return geom.coordinates[0][0][0][0];
  return null;
}

// Returns { center, zoom, bbox, crossesAntimeridian } — enough for a caller to
// either jump, animate, or derive a min-zoom, with no side effects.
export function computeCamera(geo, map, cameraCfg) {
  const { padding, antimeridianThreshold } = cameraCfg;
  const bbox = turf.bbox(geo);
  const crossesAntimeridian = bbox[2] - bbox[0] > antimeridianThreshold;

  if (crossesAntimeridian) {
    const refLng = firstLongitude(geo);
    if (refLng !== null) {
      const centerLat = (bbox[1] + bbox[3]) / 2;
      const latSpan = bbox[3] - bbox[1];
      const zoom = Math.max(2.5, Math.min(6, 5 - Math.log2(latSpan / 10)));
      return { center: [refLng, centerLat], zoom, bbox, crossesAntimeridian: true };
    }
  }

  const bounds = new maplibregl.LngLatBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
  const camera = map.cameraForBounds(bounds, { padding });
  return {
    center: [camera.center.lng, camera.center.lat],
    zoom: camera.zoom,
    bbox,
    crossesAntimeridian: false,
  };
}

// Derived floor that stops the user zooming out past the fitted view.
export function deriveMinZoom(zoom, cameraCfg) {
  return Math.max(cameraCfg.countryMinZoomFloor, zoom * cameraCfg.countryMinZoomFactor);
}

// Move the map to a computed camera. `animate` picks flyTo/fitBounds vs. an
// instant jump. Antimeridian cameras always move by center/zoom (fitBounds
// would wrap the world).
export function moveTo(map, camera, cameraCfg, { animate = false } = {}) {
  if (camera.crossesAntimeridian || !camera.bbox) {
    const target = { center: camera.center, zoom: camera.zoom };
    if (animate) map.flyTo({ ...target, duration: cameraCfg.duration, essential: true });
    else map.jumpTo(target);
    return;
  }

  if (animate) {
    map.fitBounds(camera.bbox, { padding: cameraCfg.padding, duration: cameraCfg.duration, essential: true });
  } else {
    map.jumpTo({ center: camera.center, zoom: camera.zoom });
  }
}

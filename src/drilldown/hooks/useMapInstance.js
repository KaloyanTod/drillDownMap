// -----------------------------------------------------------------------------
// useMapInstance
// -----------------------------------------------------------------------------
// Owns only the MapLibre instance lifecycle: create on mount, keep it sized to
// its container, destroy on unmount. It knows nothing about drill-down, layers,
// or data — that separation keeps the lifecycle bug-surface tiny.

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

export function useMapInstance(containerRef, config) {
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': config.theme.background } }],
      },
      center: config.view.center,
      zoom: config.view.zoom,
      minZoom: config.camera.worldMinZoom,
      maxZoom: config.camera.maxZoom,
      renderWorldCopies: true,
      attributionControl: false,
    });

    mapRef.current = map;
    map.on('load', () => setReady(true));

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Map is created once; runtime config changes are handled by the drill-down
    // hook, not by tearing down the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mapRef, ready };
}

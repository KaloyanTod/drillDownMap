// -----------------------------------------------------------------------------
// useDrillDownMap
// -----------------------------------------------------------------------------
// The orchestration hook: it holds the selection state machine and the four
// drill actions (world / country / region / programmatic zoom). All the map
// mechanics live in the injected LayerManager, camera helpers and data
// provider, so this file reads as intent ("show this country") rather than a
// wall of addLayer/removeLayer calls.

import { useCallback, useEffect, useRef, useState } from 'react';
import { LayerManager } from '../core/LayerManager';
import { createGeoDataProvider } from '../core/geoData';
import { computeCamera, deriveMinZoom, moveTo } from '../core/camera';
import { readCountryId, readRegionId, readName } from '../schema';
import { findFeatureById } from '../dataBinding';

const asFeatureCollection = (feature) => ({ type: 'FeatureCollection', features: [feature] });

export function useDrillDownMap({ mapRef, ready, config, onSelectionChange, onVisualization }) {
  const [selection, setSelection] = useState({ level: 'world', countryISO: null, regionID: null });
  const selectionRef = useRef(selection);

  const layerManagerRef = useRef(null);
  const providerRef = useRef(null);

  // Keep the latest callbacks/config in refs so the memoized actions never go
  // stale and don't need to be rebuilt (which would re-register the imperative
  // controller on every render).
  const configRef = useRef(config);
  const onVisualizationRef = useRef(onVisualization);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { onVisualizationRef.current = onVisualization; }, [onVisualization]);

  // Publish selection changes outward (mirrors the old "sync with filters"
  // effect) and keep the ref used by event handlers fresh.
  useEffect(() => {
    selectionRef.current = selection;
    onSelectionChange?.(selection);
    configRef.current.onSelect?.(selection);
  }, [selection, onSelectionChange]);

  const report = (level, geographies, metadata) =>
    onVisualizationRef.current?.(level, geographies, metadata);

  // --- actions --------------------------------------------------------------

  const goToWorld = useCallback(async () => {
    const map = mapRef.current;
    const lm = layerManagerRef.current;
    const cfg = configRef.current;
    if (!map || !lm) return;

    lm.clearRegions();

    try {
      const world = await providerRef.current.getWorld();
      lm.ensureWorld(world);

      report('world', world.features.map((f) => ({
        iso: readCountryId(cfg.schema, f),
        name: readName(cfg.schema, f),
        type: 'country',
      })), {
        source: 'ADM0 GeoJSON',
        filePath: cfg.paths.adm0,
        description: 'All countries from the ADM0 dataset',
      });
    } catch (err) {
      console.error('Error loading world:', err);
    }

    map.setMinZoom(cfg.camera.worldMinZoom);
    map.jumpTo({ center: cfg.view.center, zoom: cfg.view.zoom });
    setSelection({ level: 'world', countryISO: null, regionID: null });
  }, [mapRef]);

  // Show a country's regions (or the country itself when it has no ADM1 data),
  // optionally zooming to / highlighting one region.
  const showCountry = useCallback(async (countryISO, { regionID = null, animate = false } = {}) => {
    const map = mapRef.current;
    const lm = layerManagerRef.current;
    const cfg = configRef.current;
    if (!map || !lm || !countryISO) return;

    try {
      const regions = await providerRef.current.getRegions(countryISO);

      if (!regions) {
        await showCountryOnly(countryISO);
        return;
      }

      const { url, data: geo } = regions;
      const level = regionID ? 'region' : 'country';

      report(level, geo.features.map((f) => ({
        iso: countryISO,
        shapeID: readRegionId(cfg.schema, f),
        name: readName(cfg.schema, f),
        type: 'region',
      })), {
        source: 'ADM1 GeoJSON',
        filePath: url,
        country: countryISO,
        highlightedRegion: regionID,
        description: `Regions of ${countryISO}`,
      });

      lm.setRegions(geo, { highlightRegionID: regionID });

      // Zoom to the specific region when asked, otherwise the whole country.
      const target = regionID
        ? (findFeatureById(geo, 'region', regionID, cfg.schema) ?? geo)
        : geo;
      const zoomGeo = target === geo ? geo : asFeatureCollection(target);

      const camera = computeCamera(zoomGeo, map, cfg.camera);
      moveTo(map, camera, cfg.camera, { animate });
      map.setMinZoom(deriveMinZoom(camera.zoom, cfg.camera));

      setSelection({ level, countryISO, regionID: regionID || null });
    } catch (err) {
      console.error('Error loading country regions:', err);
    }
    // showCountryOnly is stable (defined below with useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef]);

  // Fallback for a country with no ADM1 file: draw its ADM0 outline alone.
  const showCountryOnly = useCallback(async (countryISO) => {
    const map = mapRef.current;
    const lm = layerManagerRef.current;
    const cfg = configRef.current;
    if (!map || !lm) return;

    const world = await providerRef.current.getWorld();
    const feature = findFeatureById(world, 'world', countryISO, cfg.schema);
    if (!feature) {
      console.error(`Country ${countryISO} not found in ADM0 data`);
      return;
    }

    const geo = asFeatureCollection(feature);
    lm.setRegions(geo, { idProp: cfg.schema.countryId });

    report('country', [{
      iso: countryISO,
      shapeID: null,
      name: readName(cfg.schema, feature),
      type: 'country',
      hasRegions: false,
    }], {
      source: 'ADM0 GeoJSON (country view)',
      country: countryISO,
      description: `Country ${countryISO} without regional subdivisions`,
    });

    const camera = computeCamera(geo, map, cfg.camera);
    map.setMinZoom(deriveMinZoom(camera.zoom, cfg.camera));
    moveTo(map, camera, cfg.camera, { animate: true });

    setSelection({ level: 'country', countryISO, regionID: null });
  }, [mapRef]);

  // Selecting a region already on screen: just highlight + report, no reload.
  const selectRegion = useCallback((feature) => {
    const cfg = configRef.current;
    const current = selectionRef.current;
    const regionID = readRegionId(cfg.schema, feature);
    if (!regionID) {
      console.error('No region id found for feature');
      return;
    }

    report('region', undefined, {
      selectedRegion: regionID,
      selectedRegionName: readName(cfg.schema, feature),
      description: `Region ${readName(cfg.schema, feature) ?? regionID} selected in ${current.countryISO}`,
    });

    setSelection({ level: 'region', countryISO: current.countryISO, regionID });
  }, []);

  // Programmatic entry point used by the imperative controller / external
  // filters. `null` country returns to the world view.
  const zoomTo = useCallback((countryISO, regionID = null) => {
    if (!countryISO) return goToWorld();
    return showCountry(countryISO, { regionID, animate: false });
  }, [goToWorld, showCountry]);

  // --- init: build collaborators and load the world once the map is ready ---
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    providerRef.current = createGeoDataProvider({
      adm0Path: config.paths.adm0,
      adm1Template: config.paths.adm1Template,
    });
    layerManagerRef.current = new LayerManager(mapRef.current, configRef.current);
    goToWorld();
    // Run once when the map becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return {
    selection,
    selectionRef,
    layerManagerRef,
    actions: { goToWorld, showCountry, selectRegion, zoomTo },
  };
}

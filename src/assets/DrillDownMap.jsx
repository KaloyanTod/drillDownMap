import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useFilters } from '../context/useFilters';
import { useVisualizationState } from '../context/VisualizationState';
import { mapPaths } from '../config/mapConfig';

// The ADM0 file is static for the session, so its parsed contents are cached
// (as a promise, so concurrent callers share one in-flight fetch) and reused
// across loadWorld()/loadCountryWithoutRegions() calls instead of re-fetching
// and re-parsing the multi-MB file every time.
const adm0DataCache = new Map();
function getAdm0Data(url) {
  if (!adm0DataCache.has(url)) {
    adm0DataCache.set(url, fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      return res.json();
    }));
  }
  return adm0DataCache.get(url);
}

const DrillDownMap = ({
  adm0Path = mapPaths.adm0,
  adm1PathTemplate = mapPaths.adm1Template,
  initialCenter = [0, 20],
  initialZoom = 1.6,
  fillColor = "#f28f82",
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const { setGeography, mapControllerRef, filters } = useFilters();
  const { updateVisualization, visualizationState } = useVisualizationState();

  const [selection, setSelection] = useState({
    level: 'world',
    countryISO: null,
    regionID: null
  });

  const selectionRef = useRef(selection);
  const countryMinZoomRef = useRef(1.2);
  const countryViewCameraRef = useRef(null);

  // Sync selection with filter context
  useEffect(() => {
    selectionRef.current = selection;
    setGeography(selection);
  }, [selection, setGeography]);

  // Expose visualization state to window for debugging
  useEffect(() => {
    window.getVisualizationState = () => visualizationState;
    window.getVisualizationJSON = () => JSON.parse(JSON.stringify(visualizationState));
  }, [visualizationState]);

  // Helper: Fit camera to geography bounds (handles antimeridian crossing)
  const fitToGeoBounds = (geo, map, animate = true, returnCameraOnly = false) => {
    const bbox = turf.bbox(geo);
    const crossesAntimeridian = bbox[2] - bbox[0] > 170;

    let cameraPosition;

    if (crossesAntimeridian) {
      let refLng = null;
      if (geo.type === 'FeatureCollection' && geo.features.length > 0) {
        const firstFeature = geo.features[0];
        if (firstFeature.geometry.type === 'Polygon') {
          refLng = firstFeature.geometry.coordinates[0][0][0];
        } else if (firstFeature.geometry.type === 'MultiPolygon') {
          refLng = firstFeature.geometry.coordinates[0][0][0][0];
        }
      }

      if (refLng !== null) {
        const centerLat = (bbox[1] + bbox[3]) / 2;
        const latSpan = bbox[3] - bbox[1];
        const zoom = Math.max(2.5, Math.min(6, 5 - Math.log2(latSpan / 10)));

        cameraPosition = {
          center: [refLng, centerLat],
          zoom: zoom
        };

        if (returnCameraOnly) return cameraPosition;

        if (animate) {
          map.flyTo({
            center: [refLng, centerLat],
            zoom: zoom,
            duration: 800,
            essential: true
          });
        } else {
          map.jumpTo({
            center: [refLng, centerLat],
            zoom: zoom
          });
        }
        return cameraPosition;
      }
    }

    const bounds = new maplibregl.LngLatBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
    const camera = map.cameraForBounds(bounds, { padding: 40 });

    cameraPosition = {
      center: [camera.center.lng, camera.center.lat],
      zoom: camera.zoom
    };

    if (returnCameraOnly) return cameraPosition;

    map.fitBounds(bbox, {
      padding: 40,
      duration: animate ? 800 : 0,
      essential: true
    });

    return cameraPosition;
  };

  const loadWorld = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer('adm1-fill')) map.removeLayer('adm1-fill');
    if (map.getLayer('adm1-outline')) map.removeLayer('adm1-outline');
    if (map.getSource('adm1')) map.removeSource('adm1');

    // Fetch (or reuse the cached parse of) the ADM0 data once, and use the
    // same parsed object both as the map source and for the visualization
    // side panel, instead of fetching/parsing the file twice.
    try {
      const geoData = await getAdm0Data(adm0Path);

      if (!map.getSource('adm0')) {
        map.addSource('adm0', {
          type: 'geojson',
          data: geoData,
          promoteId: 'shapeGroup',
        });
      }

      const visibleCountries = geoData.features.map(feature => ({
        iso: feature.properties.shapeGroup,
        name: feature.properties.shapeName,
        type: 'country'
      }));

      updateVisualization('world', visibleCountries, {
        source: 'ADM0 GeoJSON',
        filePath: adm0Path,
        description: 'All countries from world_adm0_simplified.geojson'
      });
    } catch (err) {
      console.error('Error loading ADM0 GeoJSON:', err);
    }

    if (!map.getLayer('adm0-fill')) {
      map.addLayer({
        id: 'adm0-fill',
        type: 'fill',
        source: 'adm0',
        paint: {
          'fill-color': fillColor,
          'fill-opacity': 0.9,
        },
      });
    } else {
      map.setLayoutProperty('adm0-fill', 'visibility', 'visible');
    }

    if (!map.getLayer('adm0-outline')) {
      map.addLayer({
        id: 'adm0-outline',
        type: 'line',
        source: 'adm0',
        paint: {
          'line-color': '#9a9a9a',
          'line-width': 0.5,
        },
      });
    } else {
      map.setLayoutProperty('adm0-outline', 'visibility', 'visible');
    }

    map.setMinZoom(1.2);
    countryMinZoomRef.current = 1.2;

    map.jumpTo({
      center: initialCenter,
      zoom: initialZoom
    });

    countryViewCameraRef.current = null;

    setSelection({
      level: 'world',
      countryISO: null,
      regionID: null
    });
  }, [adm0Path, fillColor, initialCenter, initialZoom, updateVisualization]);

  const loadCountryRegions = useCallback(async (countryISO, highlightRegionID = null) => {
    const map = mapRef.current;
    if (!map) return;

    const url = adm1PathTemplate.replace('{iso}', countryISO);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`No ADM1 data for ${countryISO}`);
        return;
      }

      const geo = await response.json();

      // Extract and report visible regions from GeoJSON
      const visibleRegions = geo.features.map(feature => ({
        iso: countryISO,
        shapeID: feature.properties.shapeID,
        name: feature.properties.shapeName,
        type: 'region'
      }));

      updateVisualization(
        highlightRegionID ? 'region' : 'country',
        visibleRegions,
        {
          source: 'ADM1 GeoJSON',
          filePath: url,
          country: countryISO,
          highlightedRegion: highlightRegionID,
          description: `Regions of ${countryISO} from ${countryISO}.geojson`
        }
      );

      // Hide ADM0
      if (map.getLayer('adm0-fill')) {
        map.setLayoutProperty('adm0-fill', 'visibility', 'none');
      }
      if (map.getLayer('adm0-outline')) {
        map.setLayoutProperty('adm0-outline', 'visibility', 'none');
      }

      // Remove old ADM1
      if (map.getLayer('adm1-fill')) map.removeLayer('adm1-fill');
      if (map.getLayer('adm1-outline')) map.removeLayer('adm1-outline');
      if (map.getSource('adm1')) map.removeSource('adm1');

      // Add all regions
      map.addSource('adm1', { type: 'geojson', data: geo, promoteId: 'shapeID' });

      // Style with conditional highlighting if specific region selected
      map.addLayer({
        id: 'adm1-fill',
        type: 'fill',
        source: 'adm1',
        paint: {
          'fill-color': fillColor,
          'fill-opacity': 0.85
        }
      });

      map.addLayer({
        id: 'adm1-outline',
        type: 'line',
        source: 'adm1',
        paint: {
          'line-color': '#c77',
          'line-width': highlightRegionID
            ? [
                'case',
                ['==', ['get', 'shapeID'], highlightRegionID],
                2, // Thicker border for selected
                0.8
              ]
            : 0.8
        }
      });

      // Zoom to the regions
      const targetCamera = fitToGeoBounds(geo, map, true, true);
      map.jumpTo({ center: targetCamera.center, zoom: targetCamera.zoom });

      countryMinZoomRef.current = Math.max(2, targetCamera.zoom * 0.7);
      map.setMinZoom(countryMinZoomRef.current);

      // Update internal selection state to match (prevents loop)
      setSelection({
        level: highlightRegionID ? 'region' : 'country',
        countryISO,
        regionID: highlightRegionID
      });

    } catch (err) {
      console.error('Error loading country regions:', err);
    }
  }, [adm1PathTemplate, fillColor, updateVisualization]);

  // const loadCountryWithoutRegions = useCallback(async (countryISO) => {
  //   const map = mapRef.current;
  //   if (!map) return;

  //   try {
  //     // Reuse the cached ADM0 world data to get the country feature
  //     const geo = await getAdm0Data(adm0Path);

  //     // Find the country feature by matching shapeGroup (ISO code)
  //     const countryFeature = geo.features.find(
  //       f => f.properties.shapeGroup === countryISO
  //     );

  //     if (!countryFeature) {
  //       console.error(`Country ${countryISO} not found in ADM0 data`);
  //       return;
  //     }

  //     // Use the existing zoomToCountryOnly function
  //     zoomToCountryOnly(countryFeature, countryISO);

  //   } catch (err) {
  //     console.error('Error loading country without regions:', err);
  //   }
  // }, [adm0Path]);

  const zoomToCountryOnly = (feature, iso) => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer('adm0-fill')) {
      map.setLayoutProperty('adm0-fill', 'visibility', 'none');
    }
    if (map.getLayer('adm0-outline')) {
      map.setLayoutProperty('adm0-outline', 'visibility', 'none');
    }

    // Remove old ADM1 layers/source before adding new country
    if (map.getLayer('adm1-fill')) map.removeLayer('adm1-fill');
    if (map.getLayer('adm1-outline')) map.removeLayer('adm1-outline');
    if (map.getSource('adm1')) map.removeSource('adm1');

    const countryGeoJSON = {
      type: 'FeatureCollection',
      features: [feature]
    };

    map.addSource('adm1', {
      type: 'geojson',
      data: countryGeoJSON,
      promoteId: 'shapeGroup',
    });

    map.addLayer({
      id: 'adm1-fill',
      type: 'fill',
      source: 'adm1',
      paint: {
        'fill-color': fillColor,
        'fill-opacity': 0.85,
      },
    });

    map.addLayer({
      id: 'adm1-outline',
      type: 'line',
      source: 'adm1',
      paint: {
        'line-color': '#c77',
        'line-width': 0.8,
      },
    });

    // Report country without regions (ADM1 = ADM0 in CSV)
    updateVisualization('country', [{
      iso: iso,
      shapeID: null,
      name: feature.properties.shapeName,
      type: 'country',
      hasRegions: false
    }], {
      source: 'ADM0 GeoJSON (country view)',
      country: iso,
      description: `Country ${iso} without regional subdivisions`
    });

    // Calculate target zoom before animation (avoid race condition)
    const targetCamera = fitToGeoBounds(countryGeoJSON, map, false, true);
    countryMinZoomRef.current = Math.max(2, targetCamera.zoom * 0.7);
    map.setMinZoom(countryMinZoomRef.current);

    // Now animate to the target
    map.fitBounds(turf.bbox(countryGeoJSON), { padding: 40, duration: 800 });

    setSelection({
      level: 'country',
      countryISO: iso,
      regionID: null
    });
  };

  // Define map controller methods
  const zoomTo = useCallback(async (countryISO, regionID = null) => {
    if (!countryISO) {
      loadWorld();
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    const url = adm1PathTemplate.replace('{iso}', countryISO);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);

      const geo = await response.json();

      // Hide ADM0 layers
      if (map.getLayer('adm0-fill')) {
        map.setLayoutProperty('adm0-fill', 'visibility', 'none');
      }
      if (map.getLayer('adm0-outline')) {
        map.setLayoutProperty('adm0-outline', 'visibility', 'none');
      }

      // Remove old ADM1
      if (map.getLayer('adm1-fill')) map.removeLayer('adm1-fill');
      if (map.getLayer('adm1-outline')) map.removeLayer('adm1-outline');
      if (map.getSource('adm1')) map.removeSource('adm1');

      // Determine what to zoom to
      let zoomGeo = geo; // Default: zoom to entire country

      if (regionID) {
        // Find the specific region by shapeID
        const regionFeature = geo.features.find(
          f => f.properties.shapeID === regionID
        );

        if (regionFeature) {
          // Create a single-feature GeoJSON for zooming
          zoomGeo = {
            type: 'FeatureCollection',
            features: [regionFeature]
          };
        } else {
          console.warn(`Region ${regionID} not found in ${countryISO}`);
        }
      }

      // Add ALL regions to the map (so user can see neighboring regions)
      map.addSource('adm1', { type: 'geojson', data: geo, promoteId: 'shapeID' });
      map.addLayer({
        id: 'adm1-fill',
        type: 'fill',
        source: 'adm1',
        paint: { 'fill-color': fillColor, 'fill-opacity': 0.85 }
      });
      map.addLayer({
        id: 'adm1-outline',
        type: 'line',
        source: 'adm1',
        paint: { 'line-color': '#c77', 'line-width': 0.8 }
      });

      // Zoom to the target (specific region or whole country)
      const targetCamera = fitToGeoBounds(zoomGeo, map, true, true);
      map.jumpTo({ center: targetCamera.center, zoom: targetCamera.zoom });

      countryMinZoomRef.current = Math.max(2, targetCamera.zoom * 0.7);
      map.setMinZoom(countryMinZoomRef.current);

      // Update selection state with the correct shapeID
      setSelection({
        level: regionID ? 'region' : 'country',
        countryISO,
        regionID: regionID || null
      });

    } catch (err) {
      console.error('Error zooming to location:', err);
    }
  }, [adm1PathTemplate, fillColor, loadWorld]);

  const goToWorld = useCallback(() => {
    loadWorld();
  }, [loadWorld]);

  // Register map controller in context
  useEffect(() => {
    mapControllerRef.current = { zoomTo, goToWorld };
  }, [zoomTo, goToWorld, mapControllerRef]);

  const handleMapClick = useCallback(async (e) => {
    const map = mapRef.current;
    if (!map) return;

    const currentSelection = selectionRef.current;

    if (currentSelection.level === 'world') {
      const adm0Features = map.queryRenderedFeatures(e.point, { layers: ['adm0-fill'] });
      if (!adm0Features.length) return;

      const feature = adm0Features[0];
      const iso = feature.properties.shapeGroup;

      if (!iso) {
        console.error('No shapeGroup found for country');
        return;
      }
      // if (!countriesWithADM1[iso]) {
      //   zoomToCountryOnly(feature, iso);
      //   return;
      // }

      const url = adm1PathTemplate.replace('{iso}', iso);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);

        const geo = await response.json();

        // Extract and report visible regions from GeoJSON
        const visibleRegions = geo.features.map(feature => ({
          iso: iso,
          shapeID: feature.properties.shapeID,
          name: feature.properties.shapeName,
          type: 'region'
        }));

        updateVisualization('country', visibleRegions, {
          source: 'ADM1 GeoJSON',
          filePath: url,
          country: iso,
          description: `Regions of ${iso} from ${iso}.geojson`
        });

        const targetCamera = fitToGeoBounds(geo, map, false, true);
        countryViewCameraRef.current = targetCamera;
        countryMinZoomRef.current = Math.max(2, targetCamera.zoom * 0.7);

        if (map.getLayer('adm0-fill')) {
          map.setLayoutProperty('adm0-fill', 'visibility', 'none');
        }
        if (map.getLayer('adm0-outline')) {
          map.setLayoutProperty('adm0-outline', 'visibility', 'none');
        }

        map.addSource('adm1', { type: 'geojson', data: geo, promoteId: 'shapeID' });
        map.addLayer({
          id: 'adm1-fill',
          type: 'fill',
          source: 'adm1',
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.85,
          },
        });
        map.addLayer({
          id: 'adm1-outline',
          type: 'line',
          source: 'adm1',
          paint: {
            'line-color': '#c77',
            'line-width': 0.8,
          },
        });

        map.jumpTo({ center: targetCamera.center, zoom: targetCamera.zoom });
        map.setMinZoom(countryMinZoomRef.current);

        setSelection({ level: 'country', countryISO: iso, regionID: null });
      } catch (err) {
        console.error('Error loading country data:', err);
      }
    } else if (currentSelection.level === 'country' || currentSelection.level === 'region') {
      const adm1Features = map.queryRenderedFeatures(e.point, { layers: ['adm1-fill'] });
      if (!adm1Features.length) return;

      const feature = adm1Features[0];
      const regionID = feature.properties.shapeID;

      if (!regionID) {
        console.error('No shapeID found for region');
        return;
      }

      // Update visualization to indicate region selection
      const currentGeos = visualizationState.visibleGeographies;
      updateVisualization('region', currentGeos, {
        ...visualizationState.metadata,
        selectedRegion: regionID,
        selectedRegionName: feature.properties.shapeName,
        description: `Region ${feature.properties.shapeName || regionID} selected in ${currentSelection.countryISO}`
      });

      setSelection({
        level: 'region',
        countryISO: currentSelection.countryISO,
        regionID: regionID
      });
    }
  }, [adm1PathTemplate, fillColor, updateVisualization, visualizationState]);

  const setupEventHandlers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on('mouseenter', 'adm0-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mousemove', 'adm0-fill', (e) => {
      if (!tooltipRef.current) return;
      const features = map.queryRenderedFeatures(e.point, { layers: ['adm0-fill'] });
      if (features.length > 0) {
        const feature = features[0];
        const countryName = feature.properties.shapeName || 'Unknown';
        const countryISO = feature.properties.shapeGroup || 'Unknown';

        tooltipRef.current.innerHTML = `<strong>${countryName}</strong><br/><span style="opacity:.8">${countryISO}</span><br/>Click to view regions`;
        tooltipRef.current.style.display = 'block';
        tooltipRef.current.style.left = e.point.x + 15 + 'px';
        tooltipRef.current.style.top = e.point.y + 15 + 'px';
      }
    });

    map.on('mouseleave', 'adm0-fill', () => {
      map.getCanvas().style.cursor = '';
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    });

    map.on('mouseenter', 'adm1-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mousemove', 'adm1-fill', (e) => {
      if (!tooltipRef.current) return;
      const features = map.queryRenderedFeatures(e.point, { layers: ['adm1-fill'] });

      if (features.length > 0) {
        const feature = features[0];
        const regionName = feature.properties.shapeName || feature.properties.shapeID || 'Unknown Region';

        tooltipRef.current.innerHTML = `<strong>${regionName}</strong><br/><span style="opacity:.8">Click to select</span>`;
        tooltipRef.current.style.display = 'block';
        tooltipRef.current.style.left = e.point.x + 15 + 'px';
        tooltipRef.current.style.top = e.point.y + 15 + 'px';
      }
    });

    map.on('mouseleave', 'adm1-fill', () => {
      map.getCanvas().style.cursor = '';
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    });

    map.on('click', handleMapClick);
  }, [handleMapClick]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const blankStyle = {
      version: 8,
      sources: {},
      layers: [
        {
          id: "bg",
          type: "background",
          paint: { "background-color": "#eeeeee" },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: blankStyle,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 1.2,
      maxZoom: 10,
      renderWorldCopies: true,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      loadWorld();
      setupEventHandlers();
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    const { level, countryISO, regionID } = filters.geography;

    // Only update if the filter change came from outside the map
    if (
      level !== selection.level ||
      countryISO !== selection.countryISO ||
      regionID !== selection.regionID
    ) {
      if (level === 'world') {
        loadWorld();
      } else if (level === 'country' && countryISO) {
        loadCountryRegions(countryISO);
      } else if (level === 'region' && countryISO && regionID) {
        loadCountryRegions(countryISO, regionID);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.geography.level, filters.geography.countryISO, filters.geography.regionID]);

  return (
    <div className="relative w-full max-w-[960px] aspect-[16/9] border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white">
      <button
        onClick={goToWorld}
        disabled={selection.level === 'world'}
        className={`absolute top-2.5 left-2.5 z-10 px-4 py-2 rounded-lg border border-gray-300 bg-white font-medium text-sm shadow-md transition-all duration-200
          ${selection.level === 'world'
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 hover:shadow-lg active:translate-y-px cursor-pointer'
          }`}
      >
        {"<- Back to World"}
      </button>

      <div className="absolute top-2.5 right-2.5 z-10 px-3 py-2 rounded-lg bg-white/90 text-xs font-mono border border-gray-200">
        Level: {selection.level}
        {selection.countryISO && <><br/>Country: {selection.countryISO}</>}
        {selection.regionID && <><br/>Region: {selection.regionID}</>}
      </div>

      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      />
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default DrillDownMap;

// Public entry point for the drill-down map template.
//
// Typical use:
//   import DrillDownMap from './drilldown';
//
// Customization (all optional):
//   <DrillDownMap
//     theme={{ fillColor: '#4f7cff' }}
//     schema={{ countryId: 'iso_a3', regionId: 'gid', name: 'admin_name' }}
//     binding={{
//       getData:  (feature, level) => myData[feature.properties.shapeID],
//       getColor: (feature, data) => data ? scale(data.value) : null,
//     }}
//     tooltips={{ region: (f, data) => `<b>${data?.label}</b>` }}
//   />

export { default } from './DrillDownMap';
export { default as DrillDownMap } from './DrillDownMap';

// Building blocks, exported for adopters who want to compose their own shell.
export { resolveConfig, DEFAULT_THEME, DEFAULT_CAMERA } from './config/defaults';
export { createSchema, DEFAULT_SCHEMA } from './schema';
export { createBinding } from './dataBinding';
export { useDrillDownMap } from './hooks/useDrillDownMap';
export { useMapInstance } from './hooks/useMapInstance';
export { useMapInteractions } from './hooks/useMapInteractions';
export { LayerManager } from './core/LayerManager';
export { createGeoDataProvider } from './core/geoData';

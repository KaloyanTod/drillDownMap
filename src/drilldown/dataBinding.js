// -----------------------------------------------------------------------------
// Per-element data binding
// -----------------------------------------------------------------------------
// This is the main extension point for reports: adopters attach their own data
// to each country / region and drive how it is drawn and described, without
// touching the drill-down engine itself.
//
// A binding is a plain object:
//   {
//     // Associate arbitrary data with a feature. Return anything (a number,
//     // a record, ...). It is handed back to you in `getColor` and tooltips.
//     getData?:  (feature, level, schema) => any,
//
//     // Data-driven fill. Return a CSS color string to override the theme fill
//     // for this feature (e.g. a choropleth), or null/undefined to keep the
//     // theme default.
//     getColor?: (feature, data, level, schema) => string | null,
//   }
//
// `level` is 'world' | 'country' | 'region'. Everything is optional: with no
// binding the map behaves exactly like a plain political map.

import { readCountryId, readRegionId } from './schema';

// Property we stamp onto features so MapLibre can pick up a per-feature color
// through a `['get', ...]` paint expression. Underscored to avoid colliding
// with real data properties.
export const FEATURE_COLOR_PROP = '__ddmFillColor';

export function createBinding(binding = {}) {
  return {
    getData: binding.getData ?? null,
    getColor: binding.getColor ?? null,
  };
}

// Resolve the user data associated with a single feature (used by tooltips and
// click handlers). Cheap and side-effect free.
export function resolveData(binding, feature, level, schema) {
  if (!binding?.getData) return null;
  return binding.getData(feature, level, schema);
}

// Returns whether this binding produces per-feature colors at all, so the
// layer/style code can pick a `['get']` expression vs. a flat color.
export function hasColorBinding(binding) {
  return typeof binding?.getColor === 'function';
}

// Produce a *copy* of the FeatureCollection with FEATURE_COLOR_PROP stamped on
// each feature. We copy (never mutate) because the source GeoJSON may be the
// shared, cached ADM0 object. Features without a computed color are left as-is
// so the paint expression can fall back to the theme color.
export function colorizeFeatures(geojson, binding, level, schema) {
  if (!hasColorBinding(binding) || !geojson?.features) return geojson;

  const features = geojson.features.map((feature) => {
    const data = resolveData(binding, feature, level, schema);
    const color = binding.getColor(feature, data, level, schema);
    if (color == null) return feature;
    return {
      ...feature,
      properties: { ...feature.properties, [FEATURE_COLOR_PROP]: color },
    };
  });

  return { ...geojson, features };
}

// Convenience: find a feature by id at a given level (used to look up a region
// or country to zoom to).
export function findFeatureById(geojson, level, id, schema) {
  if (!geojson?.features || id == null) return null;
  const read = level === 'world' ? readCountryId : readRegionId;
  return geojson.features.find((f) => read(schema, f) === id) ?? null;
}

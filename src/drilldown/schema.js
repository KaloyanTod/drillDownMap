// -----------------------------------------------------------------------------
// GeoJSON schema adapter
// -----------------------------------------------------------------------------
// The map never reads raw property names (`shapeGroup`, `shapeID`, ...) directly.
// Everything goes through a schema so an adopter whose GeoJSON uses different
// property names only changes this one object instead of hunting through the
// codebase. This is the seam that decouples the engine from a specific dataset
// (Open/Closed + Dependency Inversion).

export const DEFAULT_SCHEMA = {
  // Property on an ADM0 feature that identifies a country (its ISO code).
  countryId: 'shapeGroup',
  // Property on an ADM1 feature that identifies a region.
  regionId: 'shapeID',
  // Human-readable name, shared by both levels.
  name: 'shapeName',
};

export function createSchema(overrides = {}) {
  return { ...DEFAULT_SCHEMA, ...overrides };
}

// Thin, null-safe accessors. Keeping them as functions (rather than inlining
// `feature.properties[...]`) means a future schema could compute an id instead
// of reading a property without any caller changing.
export const readCountryId = (schema, feature) => feature?.properties?.[schema.countryId] ?? null;
export const readRegionId = (schema, feature) => feature?.properties?.[schema.regionId] ?? null;
export const readName = (schema, feature) => feature?.properties?.[schema.name] ?? null;

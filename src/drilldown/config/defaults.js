// -----------------------------------------------------------------------------
// Default configuration + config resolver
// -----------------------------------------------------------------------------
// A single place that defines every knob the template exposes and merges an
// adopter's overrides over the defaults. Components and hooks receive one
// already-resolved `config` object, so no module has to know about prop
// defaulting or merging (Single Responsibility).

import { mapPaths } from '../../config/mapConfig';
import { createSchema } from '../schema';
import { createBinding } from '../dataBinding';
import { defaultTooltips } from './tooltips';

export const DEFAULT_THEME = {
  fillColor: '#f28f82',
  background: '#eeeeee',
  world: {
    fillOpacity: 0.9,
    outlineColor: '#9a9a9a',
    outlineWidth: 0.5,
  },
  region: {
    fillOpacity: 0.85,
    outlineColor: '#c77',
    outlineWidth: 0.8,
    // Border width for the currently highlighted region.
    highlightWidth: 2,
  },
};

export const DEFAULT_CAMERA = {
  // Padding (px) kept around fitted geometry.
  padding: 40,
  // Animation length (ms) when a move is animated.
  duration: 800,
  // A feature wider than this many degrees of longitude is treated as crossing
  // the antimeridian (e.g. Russia, Fiji) and centered manually.
  antimeridianThreshold: 170,
  // Zoom floors.
  worldMinZoom: 1.2,
  // Country/region min zoom is derived: max(countryMinZoomFloor, zoom * factor).
  countryMinZoomFloor: 2,
  countryMinZoomFactor: 0.7,
  maxZoom: 10,
};

// Deep-ish merge tailored to our shallow, well-known config shape.
function mergeSection(base, override) {
  if (!override) return base;
  const out = { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object') {
      out[key] = { ...base[key], ...value };
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

// Turns raw props into the resolved config the rest of the package consumes.
// Legacy props (`fillColor`, `initialCenter`, ...) are honored so the public
// API is unchanged.
export function resolveConfig(props = {}) {
  const theme = mergeSection(DEFAULT_THEME, props.theme);
  // Back-compat: the old `fillColor` prop still wins if provided directly.
  if (props.fillColor) theme.fillColor = props.fillColor;

  return {
    paths: {
      adm0: props.adm0Path ?? mapPaths.adm0,
      adm1Template: props.adm1PathTemplate ?? mapPaths.adm1Template,
    },
    view: {
      center: props.initialCenter ?? [0, 20],
      zoom: props.initialZoom ?? 1.6,
    },
    theme,
    camera: mergeSection(DEFAULT_CAMERA, props.camera),
    schema: createSchema(props.schema),
    binding: createBinding(props.binding),
    tooltips: { ...defaultTooltips, ...props.tooltips },
    // Optional selection callback: (selection) => void, fired on every change.
    onSelect: props.onSelect ?? null,
  };
}

// -----------------------------------------------------------------------------
// Paint expression builders
// -----------------------------------------------------------------------------
// Turns the resolved theme (plus optional per-feature colors and a highlight)
// into MapLibre paint objects. Isolated here so styling can evolve — a new
// theme option, a different highlight rule — without editing layer wiring.

import { FEATURE_COLOR_PROP } from '../dataBinding';

// Fill: when a data binding stamped a per-feature color we read it via `get`
// and fall back to the theme color; otherwise a flat color.
export function buildFillPaint(fillColor, opacity, { dataDriven = false } = {}) {
  return {
    'fill-color': dataDriven
      ? ['coalesce', ['get', FEATURE_COLOR_PROP], fillColor]
      : fillColor,
    'fill-opacity': opacity,
  };
}

// Outline: optionally thickens the border of one highlighted feature.
export function buildOutlinePaint(sectionTheme, { highlightId = null, idProp = null } = {}) {
  const width = highlightId && idProp
    ? ['case', ['==', ['get', idProp], highlightId], sectionTheme.highlightWidth, sectionTheme.outlineWidth]
    : sectionTheme.outlineWidth;

  return {
    'line-color': sectionTheme.outlineColor,
    'line-width': width,
  };
}

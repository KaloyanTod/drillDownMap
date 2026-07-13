// -----------------------------------------------------------------------------
// Default tooltip renderers
// -----------------------------------------------------------------------------
// Tooltips are pure functions of (feature, data, schema) -> HTML string, so an
// adopter can inject their own bound data (values, KPIs, ...) into the hover
// card by overriding one function via the `tooltips` config, without knowing
// anything about how hover events are wired.

import { readName, readCountryId } from '../schema';

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

export const defaultTooltips = {
  country(feature, data, schema) {
    const name = escapeHtml(readName(schema, feature) ?? 'Unknown');
    const iso = escapeHtml(readCountryId(schema, feature) ?? 'Unknown');
    return `<strong>${name}</strong><br/><span style="opacity:.8">${iso}</span><br/>Click to view regions`;
  },

  region(feature, data, schema) {
    const name = escapeHtml(readName(schema, feature) ?? 'Unknown Region');
    return `<strong>${name}</strong><br/><span style="opacity:.8">Click to select</span>`;
  },
};

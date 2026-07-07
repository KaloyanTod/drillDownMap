// -----------------------------------------------------------------------------
// GeoJSON data access
// -----------------------------------------------------------------------------
// The single place that knows how to fetch geometry. Kept behind a small object
// so a report could swap in a different provider (bundled JSON, a tile API, a
// test stub) without the map code changing (Dependency Inversion).

// The ADM0 (world) file is static for the session, so its parsed contents are
// cached as a *promise* — concurrent callers share one in-flight fetch instead
// of re-downloading and re-parsing the multi-MB file.
const adm0Cache = new Map();

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

export function createGeoDataProvider({ adm0Path, adm1Template }) {
  return {
    // World countries (cached).
    getWorld() {
      if (!adm0Cache.has(adm0Path)) {
        adm0Cache.set(adm0Path, fetchJson(adm0Path));
      }
      return adm0Cache.get(adm0Path);
    },

    // Regions for a country. Returns null (rather than throwing) when a country
    // simply has no ADM1 file, so callers can fall back to a country-only view.
    async getRegions(countryISO) {
      const url = adm1Template.replace('{iso}', countryISO);
      const res = await fetch(url);
      if (!res.ok) return null;
      return { url, data: await res.json() };
    },

    adm1Url(countryISO) {
      return adm1Template.replace('{iso}', countryISO);
    },
  };
}

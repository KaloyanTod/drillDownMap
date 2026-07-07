// Shared map configuration
export const countriesWithADM1 = {
  USA: true,
  ESP: true,
  BIH: true,
};

// Build resource URLs that work in dev (/) and in a built site served from a sub-path (vite base)
const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");
const withBase = (path) => `${base}${path.replace(/^\/+/, "")}`;

// The world (ADM0) dataset the map loads. Swap this filename to try a
// different file in public/Resources/ADM0/ (e.g. a different simplification
// pass) without touching any component code.
const ADM0_FILE = "world_adm0_simplified.geojson";

export const mapPaths = {
  adm0: withBase(`Resources/ADM0/${ADM0_FILE}`),
  adm1Template: withBase("Resources/ADM1/{iso}.geojson"),
  adm1ForIso: (iso) => withBase(`Resources/ADM1/${iso}.geojson`),
};

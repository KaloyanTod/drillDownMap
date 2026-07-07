// Shared map configuration
export const countriesWithADM1 = {
  USA: true,
  ESP: true,
  BIH: true,
};

// Build resource URLs that work in dev (/) and in a built site served from a sub-path (vite base)
const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");
const withBase = (path) => `${base}${path.replace(/^\/+/, "")}`;

export const mapPaths = {
  adm0: withBase("Resources/ADM0/world_adm0_simplified.geojson"),
  adm1Template: withBase("Resources/ADM1/{iso}.geojson"),
  adm1ForIso: (iso) => withBase(`Resources/ADM1/${iso}.geojson`),
};

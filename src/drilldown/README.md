# DrillDownMap

An interactive, drill-down geographic map for reports: **World → Country → Region**
(ADM0 → ADM1). Click a country to load its regions, click a region to select it,
and jump back to the world. Built on [MapLibre GL](https://maplibre.org/).

This package is a **template**. The engine is fixed to the world/country/region
model, but *what data each element carries and how it looks* is fully yours to
shape through props — no need to edit any file under `core/` or `hooks/`.

```jsx
import DrillDownMap from './drilldown';

<DrillDownMap />                       // works out of the box
```

---

## Why it's structured this way

The whole thing used to be one ~775-line component that mixed map lifecycle,
data fetching, camera math, layer juggling, styling, tooltips, click logic,
selection state and JSX — and re-implemented the same "swap ADM0 for ADM1"
sequence in five places. It has been split along responsibilities so each piece
is small, testable, and replaceable.

```
drilldown/
├─ DrillDownMap.jsx        Public component. Thin: resolves config, owns refs,
│                          composes hooks, adapts the engine to app contexts.
├─ index.js                Public exports.
│
├─ config/
│  ├─ defaults.js          Every knob + resolveConfig() (prop → config merge).
│  └─ tooltips.js          Default hover renderers (override via `tooltips`).
├─ schema.js               GeoJSON property adapter (shapeGroup/shapeID/…).
├─ dataBinding.js          Per-element data + data-driven color (the report seam).
│
├─ core/                   Framework-agnostic. No React, no app contexts.
│  ├─ geoData.js           Fetch + cache GeoJSON (swappable provider).
│  ├─ camera.js            Pure camera math incl. antimeridian handling.
│  ├─ styleBuilder.js      Theme → MapLibre paint expressions.
│  └─ LayerManager.js      The single owner of source/layer add/remove/show/hide.
│
├─ hooks/
│  ├─ useMapInstance.js    MapLibre create / resize / destroy — nothing else.
│  ├─ useDrillDownMap.js   Selection state machine + the four drill actions.
│  └─ useMapInteractions.js Hover + click, delegating to the actions.
│
└─ components/             Presentational only: BackButton, LevelBadge, MapTooltip.
```

**SOLID at a glance**
- **S** — each module has one job (fetching, camera, layers, events, …).
- **O/D** — schema, data binding, theme, tooltips and the data provider are all
  injected, so behavior extends via config instead of edits.
- The `core/` layer knows nothing about React or this app's contexts, so it can
  be reused or unit-tested standalone.

---

## Props

All props are optional. Legacy props (`adm0Path`, `adm1PathTemplate`,
`initialCenter`, `initialZoom`, `fillColor`) still work unchanged.

| Prop | Type | Purpose |
|------|------|---------|
| `adm0Path` | string | World GeoJSON URL. |
| `adm1PathTemplate` | string | Region URL template, `{iso}` placeholder. |
| `initialCenter` / `initialZoom` | `[lng,lat]` / number | Starting view. |
| `theme` | object | Colors, opacities, outlines, background. See `DEFAULT_THEME`. |
| `camera` | object | Padding, animation duration, zoom floors, antimeridian threshold. |
| `schema` | object | Map your GeoJSON property names (`{ countryId, regionId, name }`). |
| `binding` | object | Attach data + drive color per element (below). |
| `tooltips` | `{ country, region }` | Custom hover HTML: `(feature, data, schema) => string`. |
| `onSelect` | function | Called with `{ level, countryISO, regionID }` on every change. |

---

## Associating data with each element (the report seam)

This is the point of the template: bind your own data to each country/region
and let it drive the visualization.

```jsx
<DrillDownMap
  binding={{
    // Attach whatever you want to a feature. Returned value is handed back
    // to getColor and to the tooltips.
    getData: (feature, level, schema) =>
      myMetrics[feature.properties.shapeID],

    // Data-driven fill (choropleth). Return a CSS color, or null to keep the
    // theme fill for that feature.
    getColor: (feature, data, level) =>
      data ? colorScale(data.value) : null,
  }}
  tooltips={{
    region: (feature, data, schema) =>
      `<strong>${feature.properties.shapeName}</strong><br/>Sales: ${data?.sales ?? 'n/a'}`,
  }}
/>
```

`getColor` colors are baked onto a *copy* of the GeoJSON before it hits the map
(the shared world cache is never mutated), then read via a MapLibre paint
expression, so per-feature coloring works at both the world and region levels.

---

## Using a different dataset

Point the paths at your files and describe their properties:

```jsx
<DrillDownMap
  adm0Path="/data/world.geojson"
  adm1PathTemplate="/data/regions/{iso}.geojson"
  schema={{ countryId: 'iso_a3', regionId: 'gid_1', name: 'admin_name' }}
/>
```

A country with no ADM1 file degrades gracefully: the map draws that country's
outline on its own instead of erroring.

---

## Integration notes

`DrillDownMap.jsx` adapts the engine to this app's `FilterProvider` and
`VisualizationStateProvider`, and registers an imperative controller
(`zoomTo`, `goToWorld`) on `mapControllerRef` so dropdowns and the reset button
can drive it. To use the engine without those contexts, compose the exported
hooks (`useMapInstance`, `useDrillDownMap`, `useMapInteractions`) directly.

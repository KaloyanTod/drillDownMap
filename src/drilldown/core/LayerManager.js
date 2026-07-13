// -----------------------------------------------------------------------------
// Layer manager
// -----------------------------------------------------------------------------
// Owns every source/layer add / remove / show / hide operation. Before this,
// the same "hide ADM0, drop old ADM1, add source + fill + outline" sequence was
// copy-pasted across five call sites. Centralizing it removes that duplication
// and gives one clear place responsible for the map's render state.

import { readCountryId, readRegionId } from '../schema';
import { hasColorBinding, colorizeFeatures } from '../dataBinding';
import { buildFillPaint, buildOutlinePaint } from './styleBuilder';

const IDS = {
  worldSource: 'adm0',
  worldFill: 'adm0-fill',
  worldOutline: 'adm0-outline',
  regionSource: 'adm1',
  regionFill: 'adm1-fill',
  regionOutline: 'adm1-outline',
};

export class LayerManager {
  constructor(map, config) {
    this.map = map;
    this.config = config;
  }

  // --- world (ADM0) ---------------------------------------------------------

  // Adds the world source + layers once, or just re-shows them on return trips.
  // `worldData` is the raw ADM0 collection; we colorize a copy if a binding
  // supplies per-feature colors.
  ensureWorld(worldData) {
    const { map, config } = this;
    const dataDriven = hasColorBinding(config.binding);

    if (!map.getSource(IDS.worldSource)) {
      const data = colorizeFeatures(worldData, config.binding, 'world', config.schema);
      map.addSource(IDS.worldSource, {
        type: 'geojson',
        data,
        promoteId: config.schema.countryId,
      });
    }

    this._ensureLayer(IDS.worldFill, {
      id: IDS.worldFill,
      type: 'fill',
      source: IDS.worldSource,
      paint: buildFillPaint(config.theme.fillColor, config.theme.world.fillOpacity, { dataDriven }),
    });

    this._ensureLayer(IDS.worldOutline, {
      id: IDS.worldOutline,
      type: 'line',
      source: IDS.worldSource,
      paint: buildOutlinePaint(config.theme.world),
    });

    this.showWorld();
  }

  showWorld() {
    this._setVisibility(IDS.worldFill, 'visible');
    this._setVisibility(IDS.worldOutline, 'visible');
  }

  hideWorld() {
    this._setVisibility(IDS.worldFill, 'none');
    this._setVisibility(IDS.worldOutline, 'none');
  }

  // --- regions (ADM1) -------------------------------------------------------

  // Replaces whatever regions are shown with `geo`, optionally thickening the
  // border of `highlightRegionID`. `idProp` lets us use the ADM0 country id
  // when rendering a country-only fallback that has no ADM1 features.
  setRegions(geo, { highlightRegionID = null, idProp = null } = {}) {
    const { map, config } = this;
    const promoteId = idProp ?? config.schema.regionId;
    const dataDriven = hasColorBinding(config.binding);

    this.hideWorld();
    this.clearRegions();

    const data = colorizeFeatures(geo, config.binding, 'region', config.schema);
    map.addSource(IDS.regionSource, { type: 'geojson', data, promoteId });

    map.addLayer({
      id: IDS.regionFill,
      type: 'fill',
      source: IDS.regionSource,
      paint: buildFillPaint(config.theme.fillColor, config.theme.region.fillOpacity, { dataDriven }),
    });

    map.addLayer({
      id: IDS.regionOutline,
      type: 'line',
      source: IDS.regionSource,
      paint: buildOutlinePaint(config.theme.region, { highlightId: highlightRegionID, idProp: promoteId }),
    });
  }

  clearRegions() {
    const { map } = this;
    if (map.getLayer(IDS.regionFill)) map.removeLayer(IDS.regionFill);
    if (map.getLayer(IDS.regionOutline)) map.removeLayer(IDS.regionOutline);
    if (map.getSource(IDS.regionSource)) map.removeSource(IDS.regionSource);
  }

  // --- queries used by interaction handlers ---------------------------------

  countryFeatureAt(point) {
    const hits = this.map.queryRenderedFeatures(point, { layers: [IDS.worldFill] });
    return hits.length ? hits[0] : null;
  }

  regionFeatureAt(point) {
    const hits = this.map.queryRenderedFeatures(point, { layers: [IDS.regionFill] });
    return hits.length ? hits[0] : null;
  }

  // Layer ids exposed so interaction wiring can bind hover handlers by name.
  static ids = IDS;

  // --- internals ------------------------------------------------------------

  _ensureLayer(id, layerDef) {
    if (this.map.getLayer(id)) this._setVisibility(id, 'visible');
    else this.map.addLayer(layerDef);
  }

  _setVisibility(id, value) {
    if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', value);
  }
}

export { IDS as LAYER_IDS, readCountryId, readRegionId };

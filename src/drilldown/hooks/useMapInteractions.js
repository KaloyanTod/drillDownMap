// -----------------------------------------------------------------------------
// useMapInteractions
// -----------------------------------------------------------------------------
// Wires hover tooltips and click-to-drill onto the map. It reads the current
// selection through a ref (avoiding stale closures) and delegates every actual
// state change to the drill actions, so this hook stays purely about "what a
// pointer event means".

import { useEffect } from 'react';
import { LAYER_IDS } from '../core/LayerManager';
import { resolveData } from '../dataBinding';

export function useMapInteractions({ mapRef, ready, config, selectionRef, layerManagerRef, actions, tooltipRef }) {
  useEffect(() => {
    const map = mapRef.current;
    const lm = layerManagerRef.current;
    if (!ready || !map || !lm) return undefined;

    const showTooltip = (html, point) => {
      const el = tooltipRef.current;
      if (!el) return;
      el.innerHTML = html;
      el.style.display = 'block';
      el.style.left = `${point.x + 15}px`;
      el.style.top = `${point.y + 15}px`;
    };

    const hideTooltip = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    };

    const setPointer = (on) => { map.getCanvas().style.cursor = on ? 'pointer' : ''; };

    const onCountryMove = (e) => {
      const feature = lm.countryFeatureAt(e.point);
      if (!feature) return;
      const data = resolveData(config.binding, feature, 'world', config.schema);
      showTooltip(config.tooltips.country(feature, data, config.schema), e.point);
    };

    const onRegionMove = (e) => {
      const feature = lm.regionFeatureAt(e.point);
      if (!feature) return;
      const data = resolveData(config.binding, feature, 'region', config.schema);
      showTooltip(config.tooltips.region(feature, data, config.schema), e.point);
    };

    const onClick = (e) => {
      const level = selectionRef.current.level;
      if (level === 'world') {
        const feature = lm.countryFeatureAt(e.point);
        if (!feature) return;
        const iso = feature.properties?.[config.schema.countryId];
        if (!iso) return console.error('No country id found for feature');
        actions.showCountry(iso, { animate: false });
      } else {
        const feature = lm.regionFeatureAt(e.point);
        if (!feature) return;
        actions.selectRegion(feature);
      }
    };

    const enterPointer = () => setPointer(true);
    const leavePointer = () => { setPointer(false); hideTooltip(); };

    map.on('mouseenter', LAYER_IDS.worldFill, enterPointer);
    map.on('mousemove', LAYER_IDS.worldFill, onCountryMove);
    map.on('mouseleave', LAYER_IDS.worldFill, leavePointer);
    map.on('mouseenter', LAYER_IDS.regionFill, enterPointer);
    map.on('mousemove', LAYER_IDS.regionFill, onRegionMove);
    map.on('mouseleave', LAYER_IDS.regionFill, leavePointer);
    map.on('click', onClick);

    return () => {
      map.off('mouseenter', LAYER_IDS.worldFill, enterPointer);
      map.off('mousemove', LAYER_IDS.worldFill, onCountryMove);
      map.off('mouseleave', LAYER_IDS.worldFill, leavePointer);
      map.off('mouseenter', LAYER_IDS.regionFill, enterPointer);
      map.off('mousemove', LAYER_IDS.regionFill, onRegionMove);
      map.off('mouseleave', LAYER_IDS.regionFill, leavePointer);
      map.off('click', onClick);
    };
  }, [ready, mapRef, layerManagerRef, config, selectionRef, actions, tooltipRef]);
}

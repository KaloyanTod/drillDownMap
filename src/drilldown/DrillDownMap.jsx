// -----------------------------------------------------------------------------
// DrillDownMap
// -----------------------------------------------------------------------------
// The public component. It is deliberately thin: it resolves config, owns the
// two DOM refs, composes the hooks, and adapts the drill-down engine to *this*
// app's contexts (filters + visualization state). Everything reusable lives in
// the hooks/core/config modules, so an adopter can drop this component into a
// report and only ever touch props.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFilters } from '../context/useFilters';
import { useVisualizationState } from '../context/VisualizationState';
import { resolveConfig } from './config/defaults';
import { useMapInstance } from './hooks/useMapInstance';
import { useDrillDownMap } from './hooks/useDrillDownMap';
import { useMapInteractions } from './hooks/useMapInteractions';
import { BackButton } from './components/BackButton';
import { LevelBadge } from './components/LevelBadge';
import { MapTooltip } from './components/MapTooltip';

export default function DrillDownMap(props) {
  const config = useMemo(() => resolveConfig(props), [props]);

  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  const { setGeography, mapControllerRef, filters } = useFilters();
  const { updateVisualization, visualizationState } = useVisualizationState();

  // Keep current visualization state readable inside the (memoized) reporter so
  // a region selection can preserve the visible geographies and only merge
  // metadata — matching the original behavior.
  const vizRef = useRef(visualizationState);
  useEffect(() => { vizRef.current = visualizationState; }, [visualizationState]);

  const handleVisualization = useCallback((level, geographies, metadata) => {
    if (geographies === undefined) {
      const current = vizRef.current;
      updateVisualization(level, current.visibleGeographies, { ...current.metadata, ...metadata });
    } else {
      updateVisualization(level, geographies, metadata);
    }
  }, [updateVisualization]);

  const { mapRef, ready } = useMapInstance(containerRef, config);

  const { selection, selectionRef, layerManagerRef, actions } = useDrillDownMap({
    mapRef,
    ready,
    config,
    onSelectionChange: setGeography,
    onVisualization: handleVisualization,
  });

  useMapInteractions({ mapRef, ready, config, selectionRef, layerManagerRef, actions, tooltipRef });

  // Expose the map to external controllers (dropdowns, reset button, ...).
  useEffect(() => {
    mapControllerRef.current = { zoomTo: actions.zoomTo, goToWorld: actions.goToWorld };
  }, [actions, mapControllerRef]);

  // Apply geography changes that originate outside the map (e.g. filter
  // dropdowns). We only act when the incoming filter differs from what the map
  // already shows, which prevents an update loop with onSelectionChange.
  useEffect(() => {
    if (!ready) return;
    const { level, countryISO, regionID } = filters.geography;
    if (level === selection.level && countryISO === selection.countryISO && regionID === selection.regionID) return;

    if (level === 'world') actions.goToWorld();
    else if (level === 'country' && countryISO) actions.showCountry(countryISO);
    else if (level === 'region' && countryISO && regionID) actions.showCountry(countryISO, { regionID });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filters.geography.level, filters.geography.countryISO, filters.geography.regionID]);

  // Optional debug hooks, preserved from the original component.
  useEffect(() => {
    window.getVisualizationState = () => visualizationState;
    window.getVisualizationJSON = () => JSON.parse(JSON.stringify(visualizationState));
  }, [visualizationState]);

  return (
    <div className="relative w-full max-w-[960px] aspect-[16/9] border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white">
      <BackButton atWorld={selection.level === 'world'} onClick={actions.goToWorld} />
      <LevelBadge selection={selection} />
      <MapTooltip tooltipRef={tooltipRef} />
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

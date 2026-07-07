import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Visualization State Context
 *
 * This context tracks what is currently being visualized on the map.
 * It reports in detail which geographies from the GeoJSON files are visible.
 */

const VisualizationStateContext = createContext(null);

export function VisualizationStateProvider({ children }) {
  const [visualizationState, setVisualizationState] = useState({
    level: 'world',
    visibleGeographies: [],
    metadata: {}
  });

  /**
   * Update what is currently visible on the map
   * @param {string} level - 'world', 'country', or 'region'
   * @param {Array} geographies - Array of geography objects being shown
   * @param {Object} metadata - Additional context information
   */
  const updateVisualization = useCallback((level, geographies, metadata = {}) => {
    const newState = {
      level,
      visibleGeographies: geographies,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        count: geographies.length
      }
    };

    setVisualizationState(newState);

    // Log detailed information about what's being visualized
    console.log('📊 Visualization State Updated:', {
      level: newState.level,
      count: newState.metadata.count,
      geographies: newState.visibleGeographies,
      metadata: newState.metadata
    });
  }, []);

  /**
   * Get current visualization state
   */
  const getVisualizationState = useCallback(() => {
    return visualizationState;
  }, [visualizationState]);

  /**
   * Get list of visible geography identifiers
   * Returns array of ISO codes or shapeIDs depending on level
   */
  const getVisibleIdentifiers = useCallback(() => {
    return visualizationState.visibleGeographies.map(geo => {
      if (visualizationState.level === 'world') {
        return geo.iso;
      } else {
        return geo.shapeID || geo.iso;
      }
    });
  }, [visualizationState]);

  /**
   * Get current visualization as JSON
   * Returns a clean JSON object with current visualization state
   */
  const getVisualizationJSON = useCallback(() => {
    return JSON.parse(JSON.stringify(visualizationState));
  }, [visualizationState]);

  const value = {
    visualizationState,
    updateVisualization,
    getVisualizationState,
    getVisibleIdentifiers,
    getVisualizationJSON
  };

  return (
    <VisualizationStateContext.Provider value={value}>
      {children}
    </VisualizationStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVisualizationState() {
  const context = useContext(VisualizationStateContext);
  if (!context) {
    throw new Error('useVisualizationState must be used within VisualizationStateProvider');
  }
  return context;
}

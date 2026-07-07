// src/context/FilterProvider.jsx
import { useState, useRef, useCallback } from 'react';
import { FilterContext } from './FilterContext';

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    geography: {
      level: 'world',
      countryISO: null,
      regionID: null,
      regionName: null
    },
    products: [],
    dateRange: null,
  });

  const mapControllerRef = useRef(null);

  // ✅ CRITICAL: This is now the ONLY way to change geography
  // Both map clicks AND filter dropdowns call this
  // The map has a useEffect that watches filters.geography and updates accordingly
  const setGeography = useCallback((geo) => {
    setFilters(prev => ({
      ...prev,
      geography: { ...prev.geography, ...geo }
    }));
  }, []);

  const setProducts = (products) => {
    setFilters(prev => ({ ...prev, products }));
  };

  const resetFilters = () => {
    const resetGeo = { 
      level: 'world', 
      countryISO: null, 
      regionID: null, 
      regionName: null 
    };
    
    setFilters({
      geography: resetGeo,
      products: [],
      dateRange: null
    });
    
    // Tell map to go back to world view
    if (mapControllerRef.current?.goToWorld) {
      mapControllerRef.current.goToWorld();
    }
  };

  return (
    <FilterContext.Provider value={{
      filters,
      setGeography,
      setProducts,
      resetFilters,
      mapControllerRef
    }}>
      {children}
    </FilterContext.Provider>
  );
}
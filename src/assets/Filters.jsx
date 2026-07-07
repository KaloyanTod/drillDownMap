// src/components/Filters.jsx
import { useState, useEffect } from 'react';
import { useFilters } from '../context/useFilters';
import { countriesWithADM1, mapPaths } from '../config/mapConfig';

function Filters() {
  const { filters, setGeography, resetFilters } = useFilters();
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);

  // Load countries on mount
  useEffect(() => {
    fetch(mapPaths.adm0)
      .then(res => res.json())
      .then(data => {
        const countryList = data.features.map(feature => ({
          iso: feature.properties.shapeGroup,
          name: feature.properties.shapeName
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
        
        setCountries(countryList);
      })
      .catch(err => console.error('Failed to load countries:', err));
  }, []);

  // Load regions when country is selected (only if country has ADM1 data)
  useEffect(() => {
    if (!filters.geography.countryISO) {
      setRegions([]);
      return;
    }

    const iso = filters.geography.countryISO;

    // Only try to load regions if this country has ADM1 data
    if (!countriesWithADM1[iso]) {
      setRegions([]);
      return;
    }

    setLoadingRegions(true);

    const adm1Url = mapPaths.adm1ForIso ? mapPaths.adm1ForIso(iso) : mapPaths.adm1Template.replace('{iso}', iso);


    fetch(adm1Url)
      .then(res => {
        if (!res.ok) throw new Error('No regions available');
        return res.json();
      })
      .then(data => {
        const regionList = data.features.map(feature => ({
          id: feature.properties.shapeID,      // Store the shapeID
          name: feature.properties.shapeName   // Store the shapeName
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

        setRegions(regionList);
      })
      .catch(err => {
        console.log(`No ADM1 data for ${iso}`);
        setRegions([]);
      })
      .finally(() => setLoadingRegions(false));
  }, [filters.geography.countryISO]);

  // ==================== GEOGRAPHY FILTERS ====================
  
  const handleCountryChange = (e) => {
    const countryISO = e.target.value;
    if (!countryISO) {
      setGeography({ level: 'world', countryISO: null, regionID: null });
    } else {
      setGeography({ level: 'country', countryISO, regionID: null });
    }
  };

  const handleRegionChange = (e) => {
    const regionID = e.target.value;
    if (!regionID) {
      setGeography({ level: 'country', regionID: null });
    } else {
      setGeography({ level: 'region', regionID });
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="filters-panel p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Filters</h2>
        <button 
          onClick={resetFilters}
          className="text-sm text-blue-600 hover:underline"
        >
          Reset All
        </button>
      </div>

      {/* ==================== GEOGRAPHY SECTION ==================== */}
      <div className="filter-section mb-6">
        <h3 className="font-semibold mb-2">Geography</h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Country</label>
          <select 
            value={filters.geography.countryISO || ''} 
            onChange={handleCountryChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">World (All Countries)</option>
            {countries.map(country => (
              <option key={country.iso} value={country.iso}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {filters.geography.countryISO && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Region/State</label>
              <select 
                value={filters.geography.regionID || ''} 
                onChange={handleRegionChange}
                className="w-full border rounded px-3 py-2"
                disabled={loadingRegions}
              >
                <option value="">All Regions</option>
                {loadingRegions ? (
                  <option disabled>Loading regions...</option>
                ) : regions.length === 0 ? (
                  <option disabled>No regions available</option>
                ) : (
                  regions.map(region => (
                    <option key={region.id} value={region.id}>  {/* ← value is shapeID */}
                      {region.name}                              {/* ← display is shapeName */}
                    </option>
                  ))
                )}
              </select>
          </div>
        )}
      </div>

      {/* ==================== ACTIVE FILTERS DISPLAY ==================== */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="font-semibold mb-2">Active Filters:</h3>
        <div className="flex flex-wrap gap-2">
          {filters.geography.countryISO && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {countries.find(c => c.iso === filters.geography.countryISO)?.name || filters.geography.countryISO}
            </span>
          )}
          {filters.geography.regionID && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {regions.find(r => r.id === filters.geography.regionID)?.name || filters.geography.regionID}
            </span>
          )}
          {!filters.geography.countryISO && !filters.geography.regionID && (
            <span className="text-gray-500 text-sm">No filters applied</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Filters;







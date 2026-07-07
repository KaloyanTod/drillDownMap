import './App.css';
import DrillDownMap from './assets/DrillDownMap';
import Filters from './assets/Filters';
import { FilterProvider } from './context/FilterProvider';
import { VisualizationStateProvider } from './context/VisualizationState';
import { useFilters } from './context/useFilters';

// Example data component that uses filters
function DataDisplay() {
  const { filters } = useFilters();

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Data Dashboard</h2>
      <div className="text-sm text-gray-600">
        <p>Currently showing data for:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Geography: {filters.geography.level === 'world' ? 'World' : `${filters.geography.countryISO}${filters.geography.regionID ? ` - ${filters.geography.regionID}` : ''}`}</li>
          <li>Products: {filters.products.length > 0 ? filters.products.join(', ') : 'All'}</li>
        </ul>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          Interactive World Map Dashboard
        </h1>

        <div className="grid grid-cols-12 gap-4">
          {/* Left sidebar - Filters */}
          <div className="col-span-3">
            <Filters />
          </div>

          {/* Main content - Map and Data */}
          <div className="col-span-9 space-y-4">
            <DrillDownMap />
            <DataDisplay />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <VisualizationStateProvider>
      <FilterProvider>
        <AppContent />
      </FilterProvider>
    </VisualizationStateProvider>
  );
}

export default App;
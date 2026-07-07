# DrillDownMap Component Documentation

## Overview
`DrillDownMap` is a React component that provides an interactive geographical map with drill-down capabilities. Users can click on countries to view regions (ADM1 level) and click on regions to select them. The component supports both world-level (ADM0) and country-level (ADM1) views with smooth transitions between levels. 

## Component Type
Forward ref component that exposes imperative methods to parent components.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `adm0Path` | string | `"Resources/ADM0/world_adm0_simplified.geojson"` | Path to the world countries GeoJSON file |
| `adm1PathTemplate` | string | `"Resources/ADM1/{iso}.geojson"` | Template path for country regions GeoJSON files (use `{iso}` as placeholder) |
| `initialCenter` | [number, number] | `[0, 20]` | Initial map center coordinates [longitude, latitude] |
| `initialZoom` | number | `1.6` | Initial zoom level when map loads |
| `fillColor` | string | `"#f28f82"` | Fill color for countries and regions |

---

## State Variables

### `selection`
**Type:** `{ level: string, countryISO: string | null, regionID: string | null }`
**Initial Value:** `{ level: 'world', countryISO: null, regionID: null }`
**Purpose:** Tracks the current selection state of the map.
- `level`: Can be `'world'`, `'country'`, or `'region'`
- `countryISO`: ISO code of the selected country (e.g., "USA", "RUS")
- `regionID`: Shape ID of the selected region (e.g., "USA.1_1")

---

## Refs

### `mapContainerRef`
**Type:** `React.RefObject<HTMLDivElement>`
**Purpose:** Reference to the DOM element that contains the MapLibre GL map.

### `mapRef`
**Type:** `React.RefObject<maplibregl.Map>`
**Purpose:** Reference to the MapLibre GL map instance. Used throughout the component to interact with the map.

### `tooltipRef`
**Type:** `React.RefObject<HTMLDivElement>`
**Purpose:** Reference to the tooltip DOM element that displays on hover over countries/regions.

### `selectionRef`
**Type:** `React.RefObject<selection>`
**Purpose:** Keeps a reference to the current selection state. Used in event handlers to avoid stale closures.

### `countryMinZoomRef`
**Type:** `React.RefObject<number>`
**Initial Value:** `1.2`
**Purpose:** Stores the minimum zoom level when viewing a country. Prevents users from zooming out too far when viewing country details.

### `countryViewCameraRef`
**Type:** `React.RefObject<{ center: [number, number], zoom: number } | null>`
**Purpose:** Stores the camera position when viewing a country. Used for reference when managing country views.

---

## Hooks & Context

### `useFilters()`
**From:** `../context/useFilters`
**Returns:** `{ setGeography, mapControllerRef, filters }`
- `setGeography`: Function to update geography filters in the global context
- `mapControllerRef`: Reference to the map controller for external control
- `filters`: Current filter state including geography selections

---

## Effects

### Effect 1: Sync selection with filter context
**Lines:** 30-33
**Dependencies:** `[selection, setGeography]`
**Purpose:** Synchronizes the local `selection` state with the global filter context and updates `selectionRef`.

### Effect 2: Register map controller
**Lines:** 125-129
**Dependencies:** `[ref, mapControllerRef]`
**Purpose:** Registers this map instance in the filter context so external components can control it.

### Effect 3: Initialize map
**Lines:** 131-170
**Dependencies:** `[]` (runs once on mount)
**Purpose:**
- Creates the MapLibre GL map instance
- Sets up blank style with background
- Loads the world view on map load
- Sets up event handlers
- Cleans up map instance on unmount

### Effect 4: Sync with external filter changes
**Lines:** 172-203
**Dependencies:** `[filters.geography.level, filters.geography.countryISO, filters.geography.regionID]`
**Purpose:** Listens for geography filter changes from outside the map (e.g., dropdown selections) and updates the map view accordingly.

---

## Imperative Handle Methods (Exposed via ref)

### `zoomTo(countryISO, regionID = null)`
**Lines:** 37-118
**Parameters:**
- `countryISO` (string | null): ISO code of the country to zoom to
- `regionID` (string | null, optional): Specific region ID to highlight and zoom to

**Purpose:** Programmatically zooms the map to a specific country or region. If `countryISO` is null, returns to world view.

**Behavior:**
- Fetches ADM1 (region) data for the country
- Hides ADM0 (world) layers
- Removes old ADM1 layers if they exist
- Adds all regions to the map as a source
- Zooms to specific region if `regionID` provided, otherwise zooms to entire country
- Updates selection state
- Sets minimum zoom to prevent over-zooming out

### `goToWorld()`
**Lines:** 119-121
**Purpose:** Programmatically returns the map to world view. Calls `loadWorld()` internally.

---

## Core Functions

### `loadWorld()`
**Lines:** 373-432
**Purpose:** Loads the world view (ADM0 level).

**Behavior:**
- Removes ADM1 layers and sources
- Adds or shows ADM0 source and layers
- Resets map camera to initial position
- Resets minimum zoom to 1.2
- Updates selection to world level

### `loadCountryRegions(countryISO, highlightRegionID = null)`
**Lines:** 205-287
**Parameters:**
- `countryISO` (string): ISO code of the country
- `highlightRegionID` (string | null, optional): Specific region to highlight

**Purpose:** Loads and displays regions (ADM1 level) for a specific country.

**Behavior:**
- Fetches region GeoJSON data for the country
- Hides ADM0 layers
- Removes old ADM1 layers
- Adds new ADM1 source and layers
- If `highlightRegionID` provided, applies special styling (red color, thicker border)
- Zooms to fit all regions
- Updates selection state

### `loadCountryWithoutRegions(countryISO)`
**Lines:** 289-316
**Parameters:**
- `countryISO` (string): ISO code of the country

**Purpose:** Loads a country that doesn't have ADM1 (region) data available.

**Behavior:**
- Fetches ADM0 world data
- Finds the specific country feature by ISO code
- Calls `zoomToCountryOnly()` to display it
- Used for countries in the `countriesWithADM1` config that don't have region subdivisions

### `zoomToCountryOnly(feature, iso)`
**Lines:** 499-559
**Parameters:**
- `feature` (GeoJSON Feature): The country feature from ADM0 data
- `iso` (string): ISO code of the country

**Purpose:** Displays a single country without regional subdivisions.

**Behavior:**
- Hides ADM0 layers
- Removes existing ADM1 layers
- Creates a GeoJSON FeatureCollection with just this country
- Adds it as an ADM1 source (reusing the layer names)
- Calculates and sets appropriate zoom level
- Animates to fit the country
- Updates selection to country level

### `fitToGeoBounds(geo, map, animate = true, returnCameraOnly = false)`
**Lines:** 434-497
**Parameters:**
- `geo` (GeoJSON): The GeoJSON object to fit
- `map` (maplibregl.Map): The map instance
- `animate` (boolean): Whether to animate the transition
- `returnCameraOnly` (boolean): If true, only returns camera position without moving map

**Returns:** `{ center: [lng, lat], zoom: number }`

**Purpose:** Calculates optimal camera position to fit a GeoJSON object within the map viewport.

**Special Handling:**
- Detects geometries crossing the antimeridian (like Russia)
- For antimeridian-crossing features, uses custom centering logic
- For normal features, uses MapLibre's `cameraForBounds()`
- Applies 40px padding around the bounds

### `setupEventHandlers()`
**Lines:** 318-371
**Purpose:** Sets up all mouse event handlers for map interactions.

**Events Configured:**
- `mouseenter` on ADM0/ADM1: Changes cursor to pointer
- `mousemove` on ADM0: Displays country name, ISO code, and "Click to view regions"
- `mousemove` on ADM1: Displays region name and "Click to select"
- `mouseleave` on ADM0/ADM1: Resets cursor and hides tooltip
- `click` on map: Delegates to `handleMapClick()`

### `handleMapClick(e)`
**Lines:** 565-650
**Parameters:**
- `e` (MapMouseEvent): MapLibre mouse event object

**Purpose:** Main click handler that manages drill-down behavior.

**Behavior Based on Current Level:**

**When level is 'world':**
- Queries clicked features from `adm0-fill` layer
- Extracts country ISO code
- If country has ADM1 data (`countriesWithADM1`):
  - Fetches region data
  - Hides ADM0 layers
  - Adds ADM1 layers
  - Zooms to country
  - Updates selection to 'country' level
- If country has no ADM1 data:
  - Calls `zoomToCountryOnly()` to display just the country

**When level is 'country' or 'region':**
- Queries clicked features from `adm1-fill` layer
- Extracts region's `shapeID`
- Updates selection to 'region' level with the clicked region ID

### `goBack()`
**Lines:** 561-563
**Purpose:** Handler for the "Back to World" button. Calls `loadWorld()`.

---

## UI Structure

### Container
- **Classes:** `relative w-[960px] h-[540px] border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white`
- **Fixed dimensions:** 960×540px
- **Styling:** Rounded corners, border, shadow

### Back Button
- **Position:** Top-left corner (absolute)
- **State:** Disabled when `selection.level === 'world'`
- **Handler:** `goBack()`
- **Text:** "← Back to World"

### Info Display
- **Position:** Top-right corner (absolute)
- **Content:** Shows current level, country ISO (if selected), and region ID (if selected)
- **Style:** Semi-transparent white background with monospace font

### Tooltip
- **Position:** Follows mouse cursor (+15px offset)
- **Display:** Controlled by event handlers (shown on hover, hidden on leave)
- **Content:**
  - For countries: Name, ISO code, "Click to view regions"
  - For regions: Name, "Click to select"
- **Style:** Dark semi-transparent background with white text

### Map Container
- **Ref:** `mapContainerRef`
- **Classes:** `w-full h-full`
- **Purpose:** Contains the MapLibre GL map instance

---

## Data Flow

1. **User clicks on map** → `handleMapClick()` → Updates `selection` state
2. **Selection state changes** → Effect syncs with filter context → `setGeography()`
3. **External filter changes** → Effect detects mismatch → Loads appropriate view
4. **Parent component calls** → `ref.current.zoomTo()` or `ref.current.goToWorld()` → Map updates

---

## Dependencies

- **React:** `useEffect`, `useRef`, `useState`, `useImperativeHandle`, `forwardRef`, `useCallback`
- **maplibre-gl:** Map rendering library
- **@turf/turf:** Geospatial calculations (bounding boxes)
- **useFilters:** Custom context hook for filter management
- **countriesWithADM1:** Configuration defining which countries have regional data

---

## Layer Architecture

### ADM0 Layers (World View)
- **Source:** `adm0` (GeoJSON from `adm0Path`)
- **Layers:**
  - `adm0-fill`: Filled country polygons
  - `adm0-outline`: Country borders

### ADM1 Layers (Country/Region View)
- **Source:** `adm1` (GeoJSON from ADM1 files or single country feature)
- **Layers:**
  - `adm1-fill`: Filled region polygons (or single country)
  - `adm1-outline`: Region borders

**Note:** ADM1 layers are reused for both regional subdivisions and countries without regions.

---

## Key Behaviors

### Selection Hierarchy
1. **World** → Can click countries
2. **Country** → Can click regions (if ADM1 data exists)
3. **Region** → Terminal state (can only go back to world)

### Zoom Constraints
- World view: `minZoom = 1.2`
- Country/Region view: `minZoom = max(2, targetZoom * 0.7)`
- Global: `maxZoom = 10`

### Antimeridian Handling
Countries spanning >170° longitude (e.g., Russia, Fiji) use custom centering logic to avoid map wrapping issues.

### Bidirectional Sync
The component maintains sync with external filters. Changes from the map update filters, and filter changes from dropdowns update the map.

# Tunisia Map — Frontend Documentation

## Overview

This document describes the frontend of the `tunisia-map` application: its architecture, components, data flow, API interactions, state management, development and build steps, extension points, and troubleshooting notes.

## Technology Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Map Library**: Leaflet 1.9.4 with React Leaflet 4.2.1
- **UI Library**: Material-UI (MUI) 7.3.7 with Emotion styling
- **GIS Utilities**: Turf.js 7.3.3

## Project Structure

```
tunisia-map/
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── README.md               # This file
├── geojson/                # GeoJSON data files
│   ├── governorates.geojson
│   ├── municipalities.geojson
│   ├── sectors.geojson
│   └── tunisia.geojson
├── public/                 # Static assets
└── src/                    # React application source
    ├── main.jsx            # Application entry point
    ├── App.jsx             # Root component
    ├── index.css           # Global styles
    ├── components/         # React components
    │   ├── TunisiaMap.jsx
    │   ├── ControlCard.jsx
    │   ├── PickupPointPopup.jsx
    │   ├── PickupPointDetails.jsx
    │   └── AgencyAssignment.jsx
    └── utils/              # Utility modules
        └── api.js          # API client for backend communication
```

## High-level Architecture

The frontend is a single-page React application built with **Vite** for fast development and optimized production builds. 

### Core Responsibilities

- **Interactive Mapping**: Render Tunisia's geographical layers (governorates, municipalities, sectors) using Leaflet and React Leaflet
- **Dynamic Data**: Fetch and display pickup points, agency assignments, and related data from backend APIs
- **User Interactions**: Enable area selection, detail viewing, and agency assignment operations
- **UI Components**: Provide Material-UI based controls and cards for enhanced user experience

### Architecture Layers

1. **Presentation Layer**: React components in [src/components/](src/components/)
   - Built with functional components and React hooks
   - Styled using MUI components and Emotion CSS-in-JS

2. **Data Layer**: 
   - **Static**: GeoJSON files in [geojson/](geojson/) for base map layers
   - **Dynamic**: Backend API calls via [src/utils/api.js](src/utils/api.js)

3. **Application Shell**: 
   - [src/main.jsx](src/main.jsx) — React app mounting and global providers
   - [src/App.jsx](src/App.jsx) — Top-level component wrapper

### Component Hierarchy

```
App (App.jsx)
  └─ TunisiaMap (TunisiaMap.jsx)
      ├─ Leaflet Map with GeoJSON Layers
      ├─ ControlCard (filters & controls)
      ├─ PickupPointPopup (marker interactions)
      ├─ PickupPointDetails (detail panel)
      └─ AgencyAssignment (assignment interface)
```

### Data Flow

```
Static GeoJSON Files → Leaflet Layers
Backend API ← api.js ← Components → React State → UI Rendering
```

## Component Responsibilities

### TunisiaMap.jsx
**Location**: [src/components/TunisiaMap.jsx](src/components/TunisiaMap.jsx)

**Purpose**: Main map component providing core mapping functionality

**Responsibilities**:
- Initialize and configure Leaflet map instance via React Leaflet
- Load and render GeoJSON layers (governorates, municipalities, sectors) from [geojson/](geojson/)
- Fetch and display dynamic pickup points from backend
- Manage map viewport state (zoom, center, bounds)
- Handle user interactions (clicks, selections, hover events)
- Coordinate with child components for popups and details display

**Key Features**:
- Turf.js integration for geospatial calculations
- Layer toggling and filtering
- Marker clustering and custom icons
- Event handling for geographic features

### ControlCard.jsx
**Location**: [src/components/ControlCard.jsx](src/components/ControlCard.jsx)

**Purpose**: UI control panel for map filters and settings

**Responsibilities**:
- Provide Material-UI based filter controls (region, status, agency)
- Manage filter state and propagate changes to parent components
- Display summary statistics and counts
- Toggle layer visibility
- Handle user input for search and filtering

**Interaction Pattern**: Controlled component receiving props and emitting callbacks

### PickupPointPopup.jsx
**Location**: [src/components/PickupPointPopup.jsx](src/components/PickupPointPopup.jsx)

**Purpose**: Quick-view popup for pickup point markers

**Responsibilities**:
- Display summary information when a pickup point marker is clicked
- Show essential details (name, address, status, assigned agency)
- Provide action buttons (view details, assign agency, navigate)
- Integrate with Leaflet's popup system

**UI Features**: Compact design, Material-UI styled content, quick actions

### PickupPointDetails.jsx
**Location**: [src/components/PickupPointDetails.jsx](src/components/PickupPointDetails.jsx)

**Purpose**: Detailed information panel for selected pickup points

**Responsibilities**:
- Fetch and display comprehensive pickup point data
- Show extended attributes (contact info, operating hours, capacity, etc.)
- Provide editing and management capabilities
- Display historical data and analytics
- Call backend APIs via [src/utils/api.js](src/utils/api.js) for additional information

**UI Pattern**: Side panel or modal dialog with scrollable content

### AgencyAssignment.jsx
**Location**: [src/components/AgencyAssignment.jsx](src/components/AgencyAssignment.jsx)

**Purpose**: Interface for assigning agencies to pickup points or regions

**Responsibilities**:
- Display available agencies from backend
- Enable single or bulk assignment operations
- Validate assignment rules and constraints
- Submit assignments to backend via API calls
- Update local state optimistically on success
- Handle assignment errors and provide user feedback

**Features**: 
- Agency search and filtering
- Assignment preview
- Confirmation dialogs
- Success/error notifications

## Component Communication

### Data Flow Patterns

1. **Parent-to-Child**: Props for data and configuration
   ```jsx
   <TunisiaMap filters={filters} onSelectionChange={handleSelection} />
   ```

2. **Child-to-Parent**: Callback functions for events
   ```jsx
   // In child component
   onClick={() => onPickupPointSelect(pickupPoint)}
   ```

3. **Shared Module**: [src/utils/api.js](src/utils/api.js) for all backend communication
   ```javascript
   import { getPickupPoints, assignAgency } from '../utils/api';
   ```

### Example Event Flow

**User selects a pickup point**:
1. User clicks marker on map in `TunisiaMap`
2. `TunisiaMap` updates `selectedPickupPoint` state
3. `PickupPointPopup` renders at marker location with basic info
4. User clicks "View Details" button
5. `PickupPointDetails` component mounts and fetches additional data
6. Detailed information displays in side panel

**User assigns an agency**:
1. User opens `AgencyAssignment` interface
2. Selects pickup point(s) and target agency
3. Clicks "Assign" button
4. Component calls `api.assignAgency(payload)`
5. UI updates optimistically
6. On success: confirmation message, state refresh
7. On error: rollback optimistic update, show error message

## Data Flow & API Interactions

### Data Sources

1. **Static GeoJSON Data** ([geojson/](geojson/))
   - `governorates.geojson` — Tunisia's 24 governorates boundaries
   - `municipalities.geojson` — Municipal boundaries
   - `sectors.geojson` — Sector-level divisions
   - `tunisia.geojson` — Country outline
   - Loaded once on app initialization and rendered as Leaflet layers

2. **Dynamic Backend Data** ([src/utils/api.js](src/utils/api.js))
   - Pickup points with locations and metadata
   - Agency information and assignments
   - Real-time status updates
   - Analytics and statistics

### API Client Structure

**Location**: [src/utils/api.js](src/utils/api.js)

**Purpose**: Centralized HTTP client for backend communication

**Features**:
- Base URL configuration
- Authentication header management
- Request/response interceptors
- Error handling and retry logic
- JSON serialization/deserialization
- TypeScript-friendly function signatures (if applicable)

**Common API Functions**:
```javascript
// Read operations
getPickupPoints(filters)
getPickupPointById(id)
getAgencies()
getRegionData(regionId)

// Mutation operations
assignAgency(pickupPointId, agencyId)
updatePickupPoint(id, data)
createPickupPoint(data)
deletePickupPoint(id)
```

### Request Flow Patterns

**Read Operation**:
```
User Action → Component Event Handler → api.js Function 
  → fetch() → Backend API → JSON Response 
  → Component setState → UI Re-render
```

**Mutation Operation with Optimistic Update**:
```
User Action → Optimistic State Update → UI Update
  → api.js Function → Backend API
  → Success: Confirm State
  → Error: Rollback State + Show Error
```

### Data Fetching Best Practices

- **On Mount**: Fetch initial data in `useEffect` with empty dependency array
- **On Interaction**: Fetch details when user selects an item
- **Caching**: Memoize responses to avoid redundant requests
- **Error Handling**: Catch and display user-friendly error messages
- **Loading States**: Show spinners or skeletons during async operations

### Error Handling Strategy

```javascript
try {
  const data = await api.getPickupPoints(filters);
  setPickupPoints(data);
} catch (error) {
  console.error('Failed to fetch pickup points:', error);
  setError('Unable to load pickup points. Please try again.');
}
```

## State Management

The application uses **React Hooks** for state management without external state libraries.

### State Organization

**Component-Level State** (`useState`):
- `TunisiaMap`: viewport, selected features, visible layers, loaded data
- `ControlCard`: filter values, UI controls, expanded/collapsed state
- `PickupPointDetails`: detailed data, editing mode, validation errors
- `AgencyAssignment`: selected agency, assignment targets, submission status

**Data Fetching State** (`useEffect` + `useState`):
```javascript
const [pickupPoints, setPickupPoints] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getPickupPoints();
      setPickupPoints(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [/* dependencies */]);
```

### Performance Optimization Hooks

- **`useMemo`**: Memoize expensive calculations (e.g., filtering large datasets)
  ```javascript
  const filteredPoints = useMemo(
    () => pickupPoints.filter(pt => filters.test(pt)),
    [pickupPoints, filters]
  );
  ```

- **`useCallback`**: Prevent unnecessary re-renders by memoizing callbacks
  ```javascript
  const handleSelect = useCallback((id) => {
    setSelectedId(id);
  }, []);
  ```

- **`useRef`**: Store Leaflet map instance reference

### Optimistic Updates

For better UX, update UI immediately before backend confirmation:

```javascript
const handleAssignment = async (pickupPointId, agencyId) => {
  // Optimistic update
  const previousState = pickupPoints;
  setPickupPoints(prev => 
    prev.map(p => p.id === pickupPointId 
      ? { ...p, assignedAgency: agencyId } 
      : p
    )
  );

  try {
    await api.assignAgency(pickupPointId, agencyId);
    // Success - state already updated
  } catch (error) {
    // Rollback on error
    setPickupPoints(previousState);
    showError('Assignment failed. Please try again.');
  }
};
```

### Future Scalability

If state management complexity grows, consider:
- **React Context**: Share global state (user, theme, settings)
- **React Query / SWR**: Advanced data fetching, caching, and synchronization
- **Zustand / Redux**: Centralized state management for complex applications

## Key Files Reference

### Application Entry Points
- [index.html](index.html) — HTML template with root div for React mounting
- [src/main.jsx](src/main.jsx) — React app initialization and rendering
- [src/App.jsx](src/App.jsx) — Root component wrapper

### Components
- [src/components/TunisiaMap.jsx](src/components/TunisiaMap.jsx) — Main map component with Leaflet integration
- [src/components/ControlCard.jsx](src/components/ControlCard.jsx) — Filter controls and map settings
- [src/components/PickupPointPopup.jsx](src/components/PickupPointPopup.jsx) — Quick-view popup for markers
- [src/components/PickupPointDetails.jsx](src/components/PickupPointDetails.jsx) — Detailed information panel
- [src/components/AgencyAssignment.jsx](src/components/AgencyAssignment.jsx) — Agency assignment interface

### Utilities & Configuration
- [src/utils/api.js](src/utils/api.js) — Backend API client
- [src/index.css](src/index.css) — Global styles
- [vite.config.js](vite.config.js) — Vite build configuration
- [package.json](package.json) — Dependencies and scripts

### Static Data
- [geojson/governorates.geojson](geojson/governorates.geojson) — Governorate boundaries
- [geojson/municipalities.geojson](geojson/municipalities.geojson) — Municipality boundaries
- [geojson/sectors.geojson](geojson/sectors.geojson) — Sector boundaries
- [geojson/tunisia.geojson](geojson/tunisia.geojson) — Tunisia country outline

## Development & Build Instructions

### Prerequisites

- **Node.js**: LTS version (18.x or higher recommended)
- **npm**: Comes with Node.js, or use yarn/pnpm as alternatives

### Installation

```bash
# Navigate to project directory
cd tunisia-map

# Install dependencies
npm install
```

### Available Scripts

Defined in [package.json](package.json):

```bash
# Start development server with hot reload
npm run dev
# Vite dev server typically runs on http://localhost:5173

# Build for production
npm run build
# Outputs to dist/ directory with optimized bundles

# Preview production build locally
npm run preview
# Serves the dist/ folder to verify production build
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Open browser**: Navigate to displayed localhost URL (usually http://localhost:5173)
3. **Make changes**: Edit files in `src/` — changes hot-reload automatically
4. **Check console**: Monitor browser DevTools for errors or warnings
5. **Test features**: Interact with the map and verify functionality

### Production Build

```bash
# Create optimized build
npm run build

# Output structure:
dist/
├── index.html
├── assets/
│   ├── index-[hash].js    # Bundled JavaScript
│   ├── index-[hash].css   # Bundled CSS
│   └── [other assets]
```

### Environment Variables

Create `.env` file in project root for environment-specific configuration:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_MAP_DEFAULT_CENTER=[36.8065, 10.1815]
VITE_MAP_DEFAULT_ZOOM=7
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

### IDE Setup

**VS Code** (recommended):
- Install extensions: ESLint, Prettier, ES7+ React/Redux/React-Native snippets
- Use workspace settings for consistent formatting

**Settings**:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Testing & Quality Assurance

### Recommended Testing Strategy

**Unit Testing**:
- **Framework**: Jest + React Testing Library
- **Target**: Individual components and utility functions
- **Example**: Test `api.js` functions with mocked fetch responses

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**Component Testing**:
```javascript
import { render, screen } from '@testing-library/react';
import ControlCard from './ControlCard';

test('renders filter controls', () => {
  render(<ControlCard />);
  expect(screen.getByText(/filters/i)).toBeInTheDocument();
});
```

**Integration Testing**:
- Test component interactions (e.g., selecting a pickup point updates detail panel)
- Mock API responses for predictable test data

**End-to-End Testing**:
- **Framework**: Cypress or Playwright
- **Scenarios**: 
  - Load map and verify GeoJSON layers render
  - Click marker and verify popup appears
  - Filter pickup points by region
  - Assign agency and verify success message

### Code Quality Tools

**Linting**:
```bash
# Install ESLint
npm install --save-dev eslint eslint-plugin-react

# Run linter
npm run lint
```

**Formatting**:
```bash
# Install Prettier
npm install --save-dev prettier

# Format code
npm run format
```

**Type Checking** (Optional):
```bash
# Add TypeScript for better type safety
npm install --save-dev typescript @types/react @types/react-dom
```

## Performance Optimization

### GeoJSON Optimization

**Current**: GeoJSON files in [geojson/](geojson/) are loaded as static assets

**Recommendations**:
- **Simplify geometries**: Use tools like [mapshaper](https://mapshaper.org/) to reduce polygon complexity
  ```bash
  # Simplify to 1% of original vertices
  mapshaper governorates.geojson -simplify 1% -o simplified-governorates.geojson
  ```
- **Vector tiles**: For larger datasets, consider serving as Mapbox Vector Tiles (MVT)
- **Lazy loading**: Load detailed layers only when user zooms in
- **Caching**: Enable HTTP caching headers for GeoJSON files

### React Performance

**Memoization**:
```javascript
import { memo } from 'react';

// Prevent unnecessary re-renders
const PickupPointMarker = memo(({ point, onClick }) => {
  // Component logic
}, (prevProps, nextProps) => {
  return prevProps.point.id === nextProps.point.id;
});
```

**Virtual Scrolling**:
- Use `react-window` or `react-virtualized` for long lists of pickup points

**Debouncing**:
```javascript
import { debounce } from 'lodash';

const handleSearch = debounce((query) => {
  // Search logic
}, 300);
```

### Leaflet Optimization

- **Marker clustering**: Group nearby markers at lower zoom levels using `react-leaflet-markercluster`
- **Canvas renderer**: Use for large numbers of markers
  ```javascript
  <MapContainer renderer={L.canvas()}>
  ```
- **Viewport-based loading**: Only load markers within current map bounds

### Bundle Size

**Analyze**:
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Build and analyze
npm run build -- --analyze
```

**Optimization**:
- Tree-shake unused MUI components
- Lazy load routes and heavy components
- Use dynamic imports for large dependencies

### Network Optimization

- **HTTP/2**: Serve assets over HTTP/2 for parallel loading
- **Compression**: Enable gzip/brotli compression on server
- **CDN**: Serve static assets from CDN
- **API response caching**: Implement cache headers for frequently accessed data

## Extending the Application

### Adding a New Map Layer

1. **Add GeoJSON file** to [geojson/](geojson/)
   ```bash
   cp new-layer.geojson geojson/
   ```

2. **Import in TunisiaMap.jsx**:
   ```javascript
   import newLayerData from '../geojson/new-layer.geojson';
   ```

3. **Add to map**:
   ```javascript
   <GeoJSON data={newLayerData} style={layerStyle} />
   ```

4. **Add control** in [ControlCard.jsx](src/components/ControlCard.jsx):
   ```javascript
   <FormControlLabel
     control={<Checkbox checked={showNewLayer} onChange={toggleNewLayer} />}
     label="New Layer"
   />
   ```

### Adding a New API Endpoint

1. **Define function** in [src/utils/api.js](src/utils/api.js):
   ```javascript
   export const getNewResource = async (params) => {
     const response = await fetch(`${API_BASE_URL}/new-resource`, {
       method: 'GET',
       headers: { 'Content-Type': 'application/json' },
       params
     });
     return await response.json();
   };
   ```

2. **Use in component**:
   ```javascript
   import { getNewResource } from '../utils/api';

   const [data, setData] = useState([]);
   
   useEffect(() => {
     getNewResource().then(setData);
   }, []);
   ```

### Creating a New Component

1. **Create file**: [src/components/NewComponent.jsx](src/components/NewComponent.jsx)
   ```javascript
   import React from 'react';
   import { Card, CardContent } from '@mui/material';

   const NewComponent = ({ data }) => {
     return (
       <Card>
         <CardContent>
           {/* Component content */}
         </CardContent>
       </Card>
     );
   };

   export default NewComponent;
   ```

2. **Import and use**:
   ```javascript
   import NewComponent from './components/NewComponent';
   
   <NewComponent data={someData} />
   ```

### Adding Custom Map Markers

```javascript
import L from 'leaflet';

const customIcon = L.icon({
  iconUrl: '/path/to/icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

<Marker position={[lat, lng]} icon={customIcon} />
```

### Implementing Search Functionality

```javascript
const [searchQuery, setSearchQuery] = useState('');

const filteredPoints = useMemo(() => {
  return pickupPoints.filter(point =>
    point.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [pickupPoints, searchQuery]);
```

## Troubleshooting

### Map Not Displaying

**Symptoms**: Blank map or gray tiles

**Solutions**:
1. Check console for errors
2. Verify Leaflet CSS is imported in [src/index.css](src/index.css):
   ```css
   @import 'leaflet/dist/leaflet.css';
   ```
3. Ensure map container has defined height:
   ```css
   .map-container {
     height: 600px;
     width: 100%;
   }
   ```
4. Check if GeoJSON files exist in [geojson/](geojson/)

### GeoJSON Not Loading

**Symptoms**: Map renders but no boundaries visible

**Solutions**:
1. Verify file paths in import statements
2. Check GeoJSON validity using [geojson.io](https://geojson.io/)
3. Ensure Vite is configured to handle JSON imports in [vite.config.js](vite.config.js)
4. Check browser network tab for 404 errors

### API Requests Failing

**Symptoms**: Empty data, error messages, or infinite loading

**Solutions**:
1. Verify backend server is running
2. Check API base URL in [src/utils/api.js](src/utils/api.js)
3. Inspect browser Network tab for request details
4. Verify CORS configuration on backend
5. Check authentication headers if required
6. Add error logging:
   ```javascript
   catch (error) {
     console.error('API Error:', error);
     console.log('Request details:', { url, method, body });
   }
   ```

### Slow Performance

**Symptoms**: Laggy interactions, slow rendering

**Solutions**:
1. **Too many markers**: Implement marker clustering
2. **Large GeoJSON**: Simplify geometries or use vector tiles
3. **Unnecessary re-renders**: Use React DevTools Profiler to identify bottlenecks
4. **Memory leaks**: Ensure cleanup in useEffect:
   ```javascript
   useEffect(() => {
     let isMounted = true;
     // Async operations
     return () => { isMounted = false; };
   }, []);
   ```

### Material-UI Styling Issues

**Symptoms**: Unexpected styles, missing theme

**Solutions**:
1. Ensure MUI theme provider wraps app in [src/main.jsx](src/main.jsx):
   ```javascript
   import { ThemeProvider, createTheme } from '@mui/material/styles';
   
   const theme = createTheme();
   
   <ThemeProvider theme={theme}>
     <App />
   </ThemeProvider>
   ```
2. Check Emotion dependencies are installed
3. Verify CSS injection order

### Build Errors

**Symptoms**: `npm run build` fails

**Solutions**:
1. Clear cache and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check for TypeScript errors if using TypeScript
3. Verify all imports have correct paths
4. Ensure all dependencies are in [package.json](package.json)

### Development Server Issues

**Symptoms**: Hot reload not working, port conflicts

**Solutions**:
1. Kill existing processes on port 5173:
   ```bash
   lsof -ti:5173 | xargs kill -9
   ```
2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```
3. Restart dev server: `npm run dev`

### Common Console Warnings

**"React does not recognize prop"**:
- Remove non-standard props before spreading to DOM elements
- Use `sx` prop for MUI styling instead of custom props

**"Memory leak warning"**:
- Cancel async operations in useEffect cleanup
- Remove event listeners in cleanup functions

## Glossary

- **Agency**: An organization or entity responsible for managing pickup points within specific regions
- **GeoJSON**: JSON format for encoding geographic data structures (points, lines, polygons)
- **Governorate**: Tunisia's first-level administrative division (24 governorates total)
- **Leaflet**: Open-source JavaScript library for interactive maps
- **Material-UI (MUI)**: React component library implementing Material Design
- **Municipality**: Tunisia's second-level administrative division
- **Pickup Point**: Physical location for package pickup or delivery operations
- **React Leaflet**: React components for Leaflet maps
- **Sector**: Tunisia's third-level administrative division for granular geographic management
- **Turf.js**: JavaScript library for geospatial analysis and processing
- **Vite**: Fast build tool and development server for modern web projects
- **Vector Tiles**: Map tiles that contain vector data for efficient rendering at multiple zoom levels

## Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [Material-UI Documentation](https://mui.com/material-ui/getting-started/)
- [Turf.js Documentation](https://turfjs.org/docs/)

### Tools
- [GeoJSON.io](https://geojson.io/) — View and edit GeoJSON online
- [Mapshaper](https://mapshaper.org/) — Simplify and convert GeoJSON
- [React DevTools](https://react.dev/learn/react-developer-tools) — Debug React components
- [Vite Plugin Visualizer](https://github.com/btd/rollup-plugin-visualizer) — Analyze bundle size

### Community
- [Leaflet Community](https://leafletjs.com/community.html)
- [React Community](https://react.dev/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/leaflet+react)

---

**Last Updated**: February 2026  
**Maintainer**: Development Team  
**Project**: Tunisia Map Frontend Application

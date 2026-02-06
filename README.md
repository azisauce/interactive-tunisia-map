# Tunisia Map — Frontend Documentation

## Overview

This document describes the frontend of the `tunisia-map` application: its architecture, components, data flow, API interactions, state management, development and build steps, extension points, and troubleshooting notes.

Project layout (relevant paths):

- `src/` — React app source
  - `src/main.jsx` — App entry
  - `src/App.jsx` — Top-level application wrapper
  - `src/components/` — UI components (map, popups, cards)
    - `TunisiaMap.jsx` — main map component
    - `PickupPointPopup.jsx`, `PickupPointDetails.jsx`, `AgencyAssignment.jsx`, `ControlCard.jsx` — supporting components
  - `src/index.css` — styles
  - `src/utils/api.js` — API helper for backend requests
- `public/` — static assets
- `geojson/` — local GeoJSON data (governorates, municipalities, sectors, tunisia)

## High-level Architecture

The frontend is a single-page React application built with Vite. Responsibilities:

- Render an interactive map of Tunisia using local GeoJSON layers.
- Fetch and display dynamic data (pickup points, agency assignments, etc.) from backend APIs via `src/utils/api.js`.
- Provide UI for selecting areas, viewing details, and assigning agencies.

Architecture components:

- Presentation layer: React components in `src/components/`.
- Data layer: remote API calls via `src/utils/api.js` and local GeoJSON static files under `geojson/`.
- App shell: `src/App.jsx` and `src/main.jsx` configure global providers and mount the app.

Diagram (conceptual):

App Shell (main.jsx/App.jsx)
  ├─ TunisiaMap (map UI)
  │   ├─ ControlCard (filters & controls)
  │   ├─ PickupPointPopup (popup on marker click)
  │   └─ PickupPointDetails (detail panel)
  └─ Other UI components

Data sources:
- Static: `geojson/*.geojson` — rendered as map layers.
- Dynamic: backend endpoints called via `src/utils/api.js`.

## Component Responsibilities & Interactions

- `TunisiaMap.jsx` ([src/components/TunisiaMap.jsx](src/components/TunisiaMap.jsx))
  - Loads base GeoJSON layers (governorates, municipalities, sectors) from `geojson/` and renders them on the map.
  - Requests dynamic data (e.g., pickup points) via `src/utils/api.js` when needed.
  - Manages viewport and selection state for the map (zoom, center, active region).
  - Emits events when the user clicks a marker or selects a region.

- `ControlCard.jsx` ([src/components/ControlCard.jsx](src/components/ControlCard.jsx))
  - Provides UI controls and filters (by region, status, agency).
  - Calls handlers passed as props to update map state in `TunisiaMap`.

- `PickupPointPopup.jsx` & `PickupPointDetails.jsx` ([src/components/PickupPointPopup.jsx](src/components/PickupPointPopup.jsx), [src/components/PickupPointDetails.jsx](src/components/PickupPointDetails.jsx))
  - Show brief and expanded information for a selected pickup point.
  - Provide actions (assign agency, open details, navigate) which call API functions from `src/utils/api.js`.

- `AgencyAssignment.jsx` ([src/components/AgencyAssignment.jsx](src/components/AgencyAssignment.jsx))
  - UI for assigning a pickup point or region to an agency.
  - Performs mutation calls to the backend and updates local UI state on success.

Component communication patterns:
- Parent-to-child: props for data and event callbacks (standard React pattern).
- Child-to-parent: callbacks for user interactions (selection, assignment).
- Shared module: `src/utils/api.js` for all network requests.

Example event flow (user selects a pickup point):

1. User clicks a marker on `TunisiaMap`.
2. `TunisiaMap` sets `selectedPickupPoint` state and renders `PickupPointPopup` at the marker location.
3. User clicks 'Details' in the popup.
4. `PickupPointDetails` fetches additional info (if needed) from backend via `src/utils/api.js` and displays it.

## Data Flow & API Interactions

Data originates from two places:

1. Local GeoJSON files in `geojson/` — loaded once (or cached) and rendered as static map layers.
2. Backend APIs — dynamic data for pickup points, agencies, assignments, etc.

Common patterns in `src/utils/api.js`:
- A small wrapper around `fetch` (or `axios`) to centralize base URL, auth headers, error handling, and JSON parsing.
- Exports functions like `getPickupPoints(params)`, `getAgencies()`, `assignAgency(payload)`.

Typical read request flow:

Component -> `utils/api` read function -> backend -> component updates state -> UI re-renders

Typical mutation flow (assigning an agency):

User action -> component calls `utils/api.assignAgency()` -> backend returns success -> component shows success UI and refreshes relevant lists or updates local state optimistically.

API contract notes (general guidance):
- Keep requests idempotent where possible for safety.
- Return minimal payloads for list endpoints and provide detail endpoints for heavier content.

## State Management

The app likely uses React local state (hooks) within components. Recommended patterns:

- Map-local state: `TunisiaMap` manages viewport, visible layers, and `selected` entities.
- UI state: `ControlCard` manages filter controls and passes them up via callbacks.
- Data fetching: components fetch data as needed and memoize results to avoid redundant requests. Consider using `useEffect` + `useState`, or adopting a small client like React Query if requirements grow.

Optimistic updates:
- For fast UX when performing assignments, update the UI optimistically and reconcile after the server response. Provide rollback on error.

## Files of Interest (quick reference)

- `src/main.jsx` — mounts React app and injects global providers.
- `src/App.jsx` — app shell (routing or top-level layout).
- `src/components/TunisiaMap.jsx` — primary map rendering and core behavior.
- `src/utils/api.js` — all interactions with the backend.
- `geojson/*.geojson` — geographic base layers displayed by the map.

Use these links to inspect code:

- [src/main.jsx](src/main.jsx)
- [src/App.jsx](src/App.jsx)
- [src/components/TunisiaMap.jsx](src/components/TunisiaMap.jsx)
- [src/utils/api.js](src/utils/api.js)

## Dev & Run Instructions

Prerequisites: Node.js (LTS recommended), npm or yarn.

Common commands (run from `tunisia-map`):

```bash
# install deps
npm install

# dev server (Vite)
npm run dev

# build for production
npm run build

# preview production build
npm run preview
```

If package scripts differ, check `package.json` in the project root.

## Testing & Quality

- Unit tests: add component tests with Jest + React Testing Library for critical components like `TunisiaMap` interactions and `utils/api` behavior.
- E2E: consider Cypress or Playwright to test map flows (select a marker, assign an agency, view details).
- Linting/formatting: enable ESLint + Prettier to ensure consistent code style.

## Performance Considerations

- GeoJSON size: serve simplified GeoJSON for faster initial load; use vector tile approach if dataset grows large.
- Debounce expensive operations like heavy filtering or viewport-based fetches.
- Cache static GeoJSON locally and leverage HTTP caching headers.

## Extending the Frontend

- Adding a new data layer:
  1. Add GeoJSON to `geojson/`.
  2. Update `TunisiaMap.jsx` to load and render the layer and add a control in `ControlCard` to toggle visibility.

- Adding a new API-backed widget:
  1. Add calls in `src/utils/api.js`.
  2. Create a presentational component and a container component that fetches data and manages local state.

## Troubleshooting

- Blank map — check console for GeoJSON load errors or missing map provider tokens.
- Slow loads — confirm GeoJSON sizes and network waterfall; consider lazy-loading nonessential layers.
- API failures — inspect `src/utils/api.js` for error handling and retry strategies.

## Glossary

- Pickup point: a location on the map representing a package pickup/dropoff point.
- Agency: an entity assigned responsibility over pickup points or regions.

---


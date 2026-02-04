# Tunisia Interactive Map

An interactive map application for exploring Tunisia's administrative divisions (Governorates, Municipalities, and Sectors) with hierarchical drill-down functionality.

## Features

- **Hierarchical Navigation**: Start with governorates → drill down to municipalities → drill down to sectors
- **Interactive Map**: Click on regions to explore sub-divisions
- **Bilingual Support**: Display names in English and Arabic
- **PostGIS Backend**: Spatial data stored in PostgreSQL with PostGIS extension
- **Responsive Design**: Clean UI with hover effects and smooth transitions

## Architecture

### Frontend
- **React** with hooks for state management
- **Leaflet** and **react-leaflet** for map visualization
- **Vite** for fast development and builds
- Located in `/home/etorjie/Projects/tunisia-map`

### Backend
- Uses the existing **Autoenvironment** server at `/home/etorjie/Projects/Autoenvironment/server`
- **Express.js** API with clean architecture pattern
- **Knex.js** for database migrations and queries
- **PostGIS** for spatial data storage and queries

## Backend Setup

### 1. Run Migrations

Navigate to the Autoenvironment server and run the migrations:

\`\`\`bash
cd ~/Projects/Autoenvironment/server
npx knex migrate:latest
\`\`\`

This creates the following tables:
- `governorates` - Aggregated governorate boundaries
- `municipalities` - Municipality polygons with governorate references
- `sectors` - Sector polygons with municipality/governorate references

### 2. Seed the Database

Import the GeoJSON data:

\`\`\`bash
cd ~/Projects/Autoenvironment/server
npx knex seed:run
\`\`\`

This will populate all tables with Tunisia's geographic data.

## Frontend Setup

### 1. Install Dependencies

\`\`\`bash
cd ~/Projects/tunisia-map
npm install
\`\`\`

### 2. Configure Environment

The `.env` file is already configured to point to the Autoenvironment server:

\`\`\`env
VITE_API_URL=http://localhost:8000/api/tunisia-regions
\`\`\`

### 3. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at `http://localhost:5173`

## API Endpoints

All endpoints are under `/api/tunisia-regions`:

- `GET /governorates` - Get all governorates (aggregated GeoJSON)
- `GET /governorates/:id` - Get single governorate by ID
- `GET /municipalities?gov_id={id}` - Get municipalities (optionally filtered)
- `GET /sectors?mun_uid={id}` - Get sectors (optionally filtered)
- `GET /stats` - Get region counts

## Service Architecture

The backend follows clean architecture with:

### Repository Layer
`@services/tunisia-regions/TunisiaRegionsRepository.js`
- Handles database queries
- Returns raw data from PostGIS

### Service Layer
`@services/tunisia-regions/TunisiaRegionsService.js`
- Business logic
- Error handling
- Data validation

### API Layer
`api/tunisia_regions.js`
- Express routes
- Request/response handling
- HTTP status codes

## Database Schema

All tables use PostGIS `GEOMETRY(MultiPolygon, 4326)`:

- **governorates**: `gov_id`, `gov_en`, `gov_ar`, `reg`, `reg_en`, `reg_ar`, `geom`
- **municipalities**: `mun_uid`, `mun_en`, `mun_ar`, `gov_id`, `gov_en`, `gov_ar`, `geom`
- **sectors**: `sec_uid`, `sec_en`, `sec_ar`, `mun_uid`, `gov_id`, `dis_id`, `geom`

Spatial and regular indexes are created for optimal query performance.

## Development

- Frontend hot-reloads on changes
- Backend uses the existing Autoenvironment server infrastructure
- GeoJSON data is located in `/geojson` folder

## Production Build

\`\`\`bash
npm run build
npm run preview
\`\`\`

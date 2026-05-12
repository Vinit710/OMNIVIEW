# Copilot Instructions for OMNIVIEW

## Project Overview
- **OMNIVIEW** is an AI-powered geospatial intelligence platform for satellite image analysis.
- Architecture: Electron-based frontend (JavaScript) communicates with a Python backend (Flask API) for ML/image processing.
- Data flows: User interacts with Electron UI → API requests to backend (`localhost:5000`) → ML/image analysis → results returned to frontend.

## Key Directories & Files
- `frontend/` — Electron app UI, main entry: `main.js`, renderer logic in `src/renderer/screens/*`.
- `backend/` — Python Flask API, entry: `app.py`, ML/data logic in `services/`.
- `requirements.txt` in both `frontend/` and `backend/` for dependencies.
- `disaster_national_clean.geojson`, `disaster_points.csv`, `flights.json` — sample geospatial datasets.

## Developer Workflows
- **Backend:**
  - Setup: `cd backend; pip install -r requirements.txt`
  - Run: `python app.py` (serves at `localhost:5000`)
  - Docker: `docker build -t omniview-backend .; docker run -p 5000:5000 omniview-backend`
- **Frontend:**
  - Setup: `cd frontend; npm install`
  - Run: `npm start` (launches Electron app)
  - Build/package: `npx electron-builder`
- **Data/Config:**
  - API endpoints and base URLs are hardcoded in `main.js` or config files; update if backend port changes.

## Project-Specific Patterns & Conventions
- **API Communication:**
  - All frontend-backend communication is via HTTP requests to `localhost:5000`.
  - Data is exchanged as JSON; geospatial data may use GeoJSON.
- **Frontend:**
  - UI logic is modularized by screen in `src/renderer/screens/` (e.g., `analysis/`, `disaster/`, `monitoring/`).
  - Use Electron APIs for desktop integration; avoid browser-only features.
- **Backend:**
  - ML/data logic is separated into `services/`.
  - Use Flask conventions for route definitions in `app.py`.
- **Testing:**
  - No formal test suite detected; manual testing via UI and API calls is standard.

## Integration Points & External Dependencies
- **Electron** (frontend), **Flask** (backend), **Node.js**, **Python 3.7+**.
- Datasets: CSV, GeoJSON, JSON files in project root and backend.
- Optional: Docker for backend containerization.

## Example: Adding a New Analysis Feature
1. Add backend logic in `backend/services/` and expose via `app.py` route.
2. Update frontend UI in `src/renderer/screens/analysis/analysis.js`.
3. Ensure API endpoint matches between frontend and backend.

## Troubleshooting
- If UI fails to load data, check backend is running and accessible at `localhost:5000`.
- Update hardcoded URLs if ports/configs change.

---
For more, see `README.md` in project root and `frontend/`/`backend/` folders.

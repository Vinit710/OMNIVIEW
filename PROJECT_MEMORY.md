# PROJECT_MEMORY.md

> Comprehensive reference doc for OMNIVIEW. Read this first to get up to speed.

---

## 1. Project Overview

**OMNIVIEW** is an AI-powered satellite image analysis desktop application for disaster monitoring and geospatial intelligence. It combines an Electron desktop UI with a Flask ML backend to ingest satellite imagery, run segmentation models (change detection, road extraction, land cover, glacial lake change), aggregate disaster news/imagery, and generate AI-written incident reports. The goal is to give emergency responders and analysts a single tool for situational awareness across multiple data modalities (maps, satellite, news, flight tracking).

---

## 2. Tech Stack

### Backend (Python, `backend/`)

Core libs from [`backend/requirements.txt`](backend/requirements.txt) (no pinned versions — loose):

- **Flask** + **flask-cors** — REST API layer
- **PyTorch** (`torch`, `torchvision`, CPU wheels) — UNet change detection, glacial lake segmentation
- **segmentation-models-pytorch** — UNet-ResNet34 wrapper for glacial lake model
- **TensorFlow** — ResNet road detection (Keras `.h5` format)
- **onnxruntime** — Land cover UNet inference (ONNX format)
- **google-generativeai** — Primary LLM (Gemini 2.5 Flash)
- **Pillow / OpenCV (`opencv-python-headless`) / rasterio / numpy** — Image I/O and processing
- **matplotlib / seaborn** — Chart generation (non-GUI `Agg` backend)
- **pandas** — CSV loading for disaster points
- **requests / feedparser** — Google News RSS, NewsAPI, image downloads
- **python-dotenv** — Env loader
- **tweepy / praw / spacy / transformers / exifread / geopy** — Used only by the standalone `nlp_socilmedia.py` CLI
- **gradio-client** — (imported for HF Space road detection, but local TF model is the live path)

### Frontend (Electron, `frontend/`)

From [`frontend/package.json`](frontend/package.json):

- **electron** `^37.2.4`
- **@electron/packager** `^18.4.0` (builds)
- **electron-builder** `^24.9.1` (Windows installer)
- **terser** `^5.43.1` (prod minifier via [`frontend/minify.js`](frontend/minify.js))
- **No bundler** — plain HTML/CSS/JS served by Electron; IIFE-style globals
- **CDN libs** (loaded per-screen via `<script>`/`<link>`): Leaflet 1.9.4, Leaflet.draw 1.0.4, html2canvas 1.4.1, Turf.js 6, leaflet-rotatedmarker 0.2.0, Chart.js

### Data / Models

All under [`backend/ml_models/`](backend/ml_models/), downloaded via [`backend/setup_models.py`](backend/setup_models.py) from the `v1.0-models-alpha` GitHub release:

| File | Size | Framework |
|---|---|---|
| `unet_builtup_cd.pth` | 124 MB | PyTorch (custom UNet, 6ch input) |
| `road_detection_resnet_e50.h5` | 66 MB | TensorFlow/Keras (ResNet) |
| `unet_poland_ds_modelv1.onnx` | 98 MB | ONNX (5-class UNet) |
| `unet_resnet34_glacial_lake.pth` | 98 MB | segmentation_models_pytorch (UNet-ResNet34) |

Note: `unet_resnet34_glacial_lake.pth` exists on disk but is **not** in `setup_models.py`'s manifest — it must be fetched by other means.

### Platform

Windows 11 (primary dev). Python 3.7+, Node 16+. Docker available for backend only ([`backend/Dockerfile`](backend/Dockerfile) referenced in README, not verified).

---

## 3. Architecture

**Two-process desktop app** with HTTP-over-localhost IPC:

```
┌──────────────────┐         HTTP :5000          ┌─────────────────────┐
│  Electron Main   │  ────────────────────────▶  │   Flask Backend     │
│  (BrowserWindow) │                             │   (app.py + bps)    │
│                  │   JSON requests/responses   │                     │
│  Renderer procs  │  ◀────────────────────────  │   ML blueprints     │
│  (HTML/JS pages) │                             │   Background thread │
└──────────────────┘                             └─────────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────────┐
                                              │  PyTorch / TF / ONNX │
                                              │  Gemini / Groq / etc │
                                              │  OpenSky / GoogleNews│
                                              └──────────────────────┘
```

### Backend pattern — Blueprints + a God-class

- [`backend/app.py`](backend/app.py) is the single ~1500-line entry point. It hosts the `DisasterResponseAgent` class (news + image aggregation + LLM + chart + report orchestration) and registers four Flask Blueprints:
  - `road_bp` from [`backend/road_backend.py`](backend/road_backend.py) — small-image road detection
  - `road_extract_bp` from [`backend/road_extract.py`](backend/road_extract.py) — big-TIFF road extraction
  - `landcover_bp` from [`backend/landcover.py`](backend/landcover.py) — 5-class ONNX segmentation
  - `glacial_lake_bp` from [`backend/glacial_lake.py`](backend/glacial_lake.py) — bi-temporal glacial lake change
- Each ML module loads its model **lazily or at import** and uses a module-level singleton.
- `change_detection.py` is imported as a *function* (`detect_building_changes`), not a blueprint — routes live in `app.py`.
- Background daemon thread (flight tracker) started once from `app.py`'s `__main__`.

### Frontend pattern — Multi-page Electron

- No SPA router, no bundler. Each "screen" is its own HTML/JS/CSS triplet. Navigation is `window.location.href` between files.
- [`frontend/src/main/main.js`](frontend/src/main/main.js) creates one `BrowserWindow` (1200×800, `nodeIntegration: true`, `contextIsolation: false` — **trusted local app**), sets up the application menu, and loads the splash screen.
- Application menu sends IPC events (`menu-new-project`, `toggle-logs`, `map-zoom-in`, etc.) via `webContents.send`, consumed inside renderer scripts.
- OSM tile requests get an injected `Referer: https://omniview.app` header (required by OSM policy).
- All renderer screens share [`frontend/src/renderer/shared/theme.css`](frontend/src/renderer/shared/theme.css) and [`frontend/src/renderer/shared/logger.js`](frontend/src/renderer/shared/logger.js) (TTS-enabled log panel).

### Directory tree (important folders)

```
OMNIVIEW/
├── backend/
│   ├── app.py                      # Flask entry + DisasterResponseAgent orchestrator
│   ├── change_detection.py         # PyTorch UNet (6-ch) for building change
│   ├── road_backend.py             # Small-image road detection blueprint
│   ├── road_extract.py             # Big-TIFF tiled road extraction blueprint
│   ├── landcover.py                # ONNX 5-class landcover blueprint
│   ├── glacial_lake.py             # Glacial lake change blueprint
│   ├── nlp_socilmedia.py           # Standalone CLI (NOT wired into Flask)
│   ├── setup_models.py             # Model weight downloader
│   ├── services/flight_data.py     # OpenSky daemon thread
│   ├── ml_models/                  # 4 model files (~385 MB total)
│   ├── big_masks/                  # Road extraction outputs (auto-purged >2h)
│   ├── disaster_points.csv         # Static dataset for map markers
│   ├── flights.json                # Cached OpenSky snapshot (refreshed every 5 min)
│   ├── .env / .env.example         # API keys
│   └── requirements.txt
├── frontend/
│   ├── package.json                # electron-packager / electron-builder scripts
│   ├── minify.js                   # terser pass before electron-packager
│   └── src/
│       ├── main/main.js            # Electron main process (BrowserWindow, menu, IPC)
│       ├── assets/                 # Icons and static media
│       └── renderer/
│           ├── screens/
│           │   ├── config.js               # Central API_CONFIG (all backend URLs)
│           │   ├── splash/                 # 10s boot animation → monitoring
│           │   ├── monitoring/             # Buildings/Roads/Ships/Aircraft/Glacial Lakes
│           │   ├── disaster/               # News + pre/post disaster map + AI report
│           │   ├── analysis/               # Analytics: charts, landcover, road extract
│           │   └── settings/               # Placeholder (single-line HTML)
│           └── shared/
│               ├── logger.js               # TTS-enabled log panel
│               ├── logs.html               # Log panel template
│               └── theme.css               # Shared design tokens
├── CLAUDE.md                       # Agent working instructions
├── README.md
├── METHODOLOGY.txt                 # Project methodology notes (long-form)
├── OMNIVU_Project_Report.pdf       # Academic project report
└── requirements.txt                # (root-level duplicate — unused by backend)
```

---

## 4. Key Files & Their Roles

| File | Role |
|---|---|
| [`backend/app.py`](backend/app.py) | Flask app factory; registers blueprints; hosts `DisasterResponseAgent`; wires `/api/generate_report`, `/api/news`, `/api/news_brief`, `/api/images`, `/api/building-change-detection`, `/api/analyze-disasters`, `/api/disaster-csv`, `/api/flights`, `/api/status`, `/api/test`, `/api/health`. |
| [`backend/change_detection.py`](backend/change_detection.py) | Custom `UNet` (6 input channels = pre+post RGB stacked) in PyTorch. Singleton `ChangeDetectionService`. Entry: `detect_building_changes(pre_b64, post_b64)`. |
| [`backend/road_extract.py`](backend/road_extract.py) | Big TIFF (Sentinel-2 scale) → tiled prediction (2×4 crops, 500×500 patches) → morphology post-process → saves outputs to [`backend/big_masks/`](backend/big_masks/). |
| [`backend/road_backend.py`](backend/road_backend.py) | Same Keras model but for small (base64) images; also exposes placeholder endpoints (`/api/area`, `/api/satellite-image`). |
| [`backend/landcover.py`](backend/landcover.py) | ONNX UNet, 5 classes (Background, Buildings, Trees, Water, Road). Accepts lat/lon (fetches ESRI tile) or base64. |
| [`backend/glacial_lake.py`](backend/glacial_lake.py) | UNet-ResNet34 + tiled sliding-window inference (256×256 tiles, 64px overlap). Computes gained/lost/net area in px and hectares. |
| [`backend/services/flight_data.py`](backend/services/flight_data.py) | Daemon thread. Polls OpenSky `/api/states/all` every 5 min (authenticated via OAuth2 if `OPENSKY_CLIENT_ID`/`SECRET` set, else anonymous). Writes `flights.json`. |
| [`backend/setup_models.py`](backend/setup_models.py) | Downloads 3 of 4 model weights from GitHub release `v1.0-models-alpha`. Supports `--force` and `--verify`. |
| [`backend/nlp_socilmedia.py`](backend/nlp_socilmedia.py) | **Standalone CLI only** — Twitter/Reddit disaster data collector with spaCy NER + SQLite. Not reachable from the UI. |
| [`frontend/src/main/main.js`](frontend/src/main/main.js) | Electron main process. Creates window, builds menu, handles OSM referer injection. |
| [`frontend/src/renderer/screens/config.js`](frontend/src/renderer/screens/config.js) | Centralized `API_CONFIG` — **one place** to update backend endpoint paths. Exposed as both `globalThis.API_CONFIG` and `module.exports`. |
| [`frontend/src/renderer/shared/logger.js`](frontend/src/renderer/shared/logger.js) | `Logger` class with `info/warning/error/success`, Text-to-Speech toggle, 50-log cap, Ctrl+L panel toggle. |
| [`frontend/minify.js`](frontend/minify.js) | Terser pass for `npm run dist`. |
| [`CLAUDE.md`](CLAUDE.md) | Agent working instructions (loaded automatically by Claude Code). |

---

## 5. Data Models / Schemas

### 5.1 API response shapes

**`POST /api/generate_report`** (most complex response):
```jsonc
{
  "status": "success",
  "report": "markdown string",
  "charts": { "damage_severity": "data:image/png;base64,...",
              "priority_distribution": "...", "resource_allocation": "..." },
  "analysis_summary": { "query", "news_articles_found", "images_processed",
                        "successful_analyses", "failed_analyses",
                        "average_severity", "max_severity",
                        "high_priority_areas", "confidence_level",
                        "processing_duration" },
  "raw_data": { "news_articles": [...5], "successful_image_analyses": [...],
                "total_processing_attempts": int },
  "timestamp": "iso8601",
  "system_info": { "version", "ai_models": [], "data_sources": [] }
}
```

**News article shape** (from `get_google_news`):
```jsonc
{ "title": "...", "snippet": "Source • Mmm DD, YYYY",
  "link": "...", "source": "...", "date": "YYYY-MM-DD" }
```

**Per-image analysis shape** (produced by LLM into strict JSON):
```jsonc
{ "image_id", "image_url", "caption", "source",
  "detailed_analysis": {
    "damage_severity_score": 1-10,
    "damage_severity_explanation", "infrastructure_damage",
    "visible_hazards": [...], "accessibility_status",
    "emergency_priority": "high|medium|low", "priority_justification",
    "recommended_resources": [...], "geographical_features",
    "estimated_affected_area", "population_impact", "immediate_risks",
    "recovery_challenges", "response_timeline", "coordination_needs"
  },
  "processing_status": "success|failed",
  "timestamp": "iso8601"
}
```

**`POST /api/building-change-detection`**:
- Request: `{ pre_image: base64, post_image: base64 }`
- Response: `{ success, change_percentage, changed_pixels, total_pixels, mask_image, comparison_image, overlay_image }` (all images as data URLs)

**`POST /api/glacial-lake-change`**:
- Request: `{ image1, image2, threshold?=0.5, resolution?="sentinel2"|"landsat30" }`
- Response: `{ stats: { area_t1, area_t2, gained, lost, delta, pct_change, pixel_res_m, *_ha }, threshold, resolution_m, change_image (data URL) }`

**`POST /api/landcover`**:
- Request: either `{ lat, lon, zoom?=17 }` or `{ image_base64 }`
- Response: `{ original, mask, classes: [{name, count, percentage, color}], total_pixels }`

**`POST /api/extract_roads`** (multipart):
- Request: TIFF file upload
- Response: `{ orig_url, mask_url, overlay_url }` — fetch via `/api/bigroads_file/<name>`

### 5.2 Static datasets

- [`backend/disaster_points.csv`](backend/disaster_points.csv) (~5 MB) — columns: `id, country, location, disastertype, year, latitude, longitude` (plus extras, but only those are exposed via `/api/disaster-csv`).
- [`backend/flights.json`](backend/flights.json) — raw OpenSky `/api/states/all` snapshot (refreshed every 5 min by `flight_data.py`).

### 5.3 No database

No SQL schema. The only SQLite use is inside [`backend/nlp_socilmedia.py`](backend/nlp_socilmedia.py) (`disaster_monitor.db`), which is CLI-only and **not** connected to the Flask app.

---

## 6. Core Flows

### 6.1 App boot

1. User runs `npm start` in `frontend/`.
2. [`frontend/src/main/main.js`](frontend/src/main/main.js) creates BrowserWindow → loads [`splash/splash.html`](frontend/src/renderer/screens/splash/splash.html).
3. [`splash.js`](frontend/src/renderer/screens/splash/splash.js) runs 5-step ~10s progress animation ("AI SYSTEM INITIALIZING" → "ALL SYSTEMS ONLINE"), each with TTS.
4. After 2s tail-delay, `window.location.href = '../monitoring/monitoring.html'`.
5. Monitoring screen hits `http://127.0.0.1:5000/api/status` (`check_backend()` in [`monitoring.js`](frontend/src/renderer/screens/monitoring/monitoring.js)) to verify backend is up.

### 6.2 Disaster report generation (the headline flow)

Endpoint: `POST /api/generate_report` in [`backend/app.py`](backend/app.py#L1141).

1. **Phase 1 — News**: `DisasterResponseAgent.get_google_news(query, 10)` → Google News RSS (primary) → NewsAPI fallback → static fallback articles. Optional `when` filter (`1d|7d|30d`). Query is auto-augmented with disaster keywords if not already disaster-scoped.
2. **Phase 2 — Images**: `get_google_images(query, 6)` → Google Custom Search Images API → base64 PIL placeholder images on failure.
3. **Phase 3 — Image analysis**: For each image (up to 6):
   - External image: download → BLIP caption via HF Inference API → build LLM prompt with caption.
   - Placeholder image: skip download → build generic prompt.
   - `query_free_llm_api(prompt)` cascades **Gemini → DeepSeek → Groq (llama-3.3-70b-versatile) → hardcoded JSON fallback**.
   - Response parsed by taking the outermost `{...}` block; JSONDecodeError falls back to `create_default_analysis`.
4. **Phase 4 — Charts**: `generate_comprehensive_charts` builds matplotlib PNGs (Agg backend): damage severity bar chart, priority distribution pie, resource allocation pie. Returns base64 data URLs.
5. **Phase 5 — Report**: `generate_official_report` constructs a long structured prompt (with emoji section headers), runs through the LLM chain, then appends a technical appendix with per-point severity.
6. Returns merged JSON (`report`, `charts`, `analysis_summary`, `raw_data`).

### 6.3 Building change detection

1. Monitoring UI → user uploads pre/post images (drag-drop or click) in [`monitoring.js`](frontend/src/renderer/screens/monitoring/monitoring.js) `BuildingChangeDetection` class.
2. `POST /api/building-change-detection` with `{ pre_image, post_image }` (base64 data URLs).
3. [`backend/app.py`](backend/app.py#L1306) calls `detect_building_changes` → [`backend/change_detection.py`](backend/change_detection.py).
4. Preprocess each to 256×256 tensor → concat along channels (6ch) → `UNet` forward → sigmoid → threshold 0.5 → mask.
5. `create_visualization` builds a 4-panel matplotlib figure (pre / post / mask / red overlay) plus individual mask and overlay PNGs.
6. Frontend displays `change_percentage` + the three base64 images.

### 6.4 Big-TIFF road extraction

1. Analysis UI → upload `.tif`/`.tiff` (up to 1 GB per `MAX_CONTENT_LENGTH`).
2. `POST /api/extract_roads` (multipart) → [`backend/road_extract.py`](backend/road_extract.py).
3. Save file to `big_masks/`, load via OpenCV, convert to PNG.
4. Split into 2×4 crops → further tile each crop into 500×500 patches → resize each to 256×256 → model predict → stitch back.
5. Morphology (close 7×7, open 3×3, min-area filter 500px, merge with high-prob>200 mask) → overlay 60% red on original.
6. Save `_prob_mask.png`, `_binary_mask.png`, `_processed_mask.png`, `_overlay.png` under `big_masks/`, return their URLs via `/api/bigroads_file/<name>`.
7. `cleanup_temp_files` purges anything in `big_masks/` older than 2h on each request.

### 6.5 Flight tracker

1. On Flask startup ([`app.py`](backend/app.py#L1357) `__main__`), `start_flight_tracker()` spawns a daemon thread.
2. Thread loop: fetch OAuth2 token (if `OPENSKY_CLIENT_ID`/`SECRET`), GET `https://opensky-network.org/api/states/all`, dump JSON to `flights.json`, sleep 300s.
3. Monitoring UI's Aircraft tab hits `GET /api/flights` → returns cached `flights.json`.

---

## 7. Environment & Setup

### Required env vars (see [`backend/.env.example`](backend/.env.example))

| Var | Purpose | Required? |
|---|---|---|
| `GEMINI_API_KEY` | Primary LLM | **Yes** |
| `GOOGLE_API_KEY` | Google Custom Search | **Yes** |
| `GOOGLE_CX` | Custom Search Engine ID | **Yes** |
| `DEEPSEEK_API_KEY` | Fallback LLM | Optional |
| `GROQ_API_KEY` | Fallback LLM + news brief primary | Optional |
| `OPENROUTER_API_KEY` | Read but not actively used in current code | Optional |
| `HUGGINGFACE_API_KEY` | BLIP image captioning via HF Inference API | Optional |
| `NEWS_API_KEY` | NewsAPI fallback when Google News RSS fails | Optional |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | OAuth2 for higher OpenSky rate limits | Optional |
| `TWITTER_BEARER_TOKEN`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | Only needed for the standalone `nlp_socilmedia.py` CLI | Optional |

App raises `ValueError` on startup if any of the three required vars is missing ([`app.py:53`](backend/app.py#L53)).

### Install, run, build

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate     # Windows
pip install -r requirements.txt
python setup_models.py                           # downloads model weights
python app.py                                    # Flask :5000

# Frontend (new terminal)
cd frontend
npm install
npm start                                        # launches Electron

# Production build
npm run dist                                     # minify + electron-packager (win32 x64, --asar)
npm run build:win                                # electron-builder (produces .exe installer)

# Docker (backend only)
cd backend && docker build -t omniview-backend . && docker run -p 5000:5000 omniview-backend
```

### Tests

There is **no test suite**. The closest thing is `GET /api/test` ([`app.py:954`](backend/app.py#L954)) which pings Gemini, Google Search, and image generation.

---

## 8. Conventions & Patterns

### Backend

- **Blueprint-per-feature** for ML routes (`road_bp`, `road_extract_bp`, `landcover_bp`, `glacial_lake_bp`); main app owns news/report/utility routes.
- **Model loading**: eager singleton at import (`change_detection.py`, `glacial_lake.py`) or lazy singleton on first call (`road_backend.py`, `landcover.py`). Path resolved via `os.path.join(os.path.dirname(__file__), "ml_models", ...)` — machine-independent.
- **Image I/O**: accept base64 data URL *or* raw base64 *or* bytes; always normalize via `.split(',')[1]` guard.
- **Error style**: broad `try/except Exception` with `app.logger.error(...)` + `traceback.format_exc()`; return JSON with `error` key and 500 status.
- **LLM fallback chain** is the load-bearing pattern: Gemini → DeepSeek → Groq → hardcoded JSON default. JSON extraction uses outermost `{...}` slice.
- **Heavy emoji logging** in [`app.py`](backend/app.py) (🚨 📰 🖼️ 🔍 📊 📋 ✅). Intentional flavor, not a bug.
- `matplotlib.use('Agg')` **before** any pyplot import to stay headless-safe.

### Frontend

- **One class per screen**, instantiated at DOM ready. State lives on the class instance — no global store.
- **No module system in renderer**: scripts loaded via `<script>` tags, rely on global side effects. `config.js` dual-exports for CommonJS + `globalThis`.
- **Leaflet maps** per screen with different tile layers (OSM default + Satellite toggle in Monitoring).
- **TTS-everywhere**: `speechSynthesis` narrates status updates on splash, monitoring, and logger. User-toggleable via logger panel.
- **Centralized endpoint URLs** in [`config.js`](frontend/src/renderer/screens/config.js) — change backend URL once.
- No TypeScript, no linter config committed. No tests.

### Naming

- Python: `snake_case` functions/vars, `PascalCase` classes.
- JS: `camelCase` functions/vars, `PascalCase` classes.
- Screen folders mirror their entry HTML name (`monitoring/monitoring.html`).
- Route paths are kebab-case where multi-word (`/api/building-change-detection`, `/api/glacial-lake-change`), but some are snake (`/api/news_brief`, `/api/extract_roads`) — **inconsistent** — keep both styles when adding new routes in the same module.

---

## 9. External Integrations

| Service | Used where | Purpose |
|---|---|---|
| **Google Gemini (generativeai SDK)** | [`app.py`](backend/app.py) `query_free_llm_api`, `_generate_news_brief` | Primary LLM (`gemini-2.5-flash`) |
| **Google Custom Search API** | [`app.py`](backend/app.py#L262) `get_google_images` | Disaster image search |
| **Google News RSS** | [`app.py`](backend/app.py#L140) `get_google_news` | Primary news feed |
| **NewsAPI** | [`app.py`](backend/app.py#L190) fallback | News fallback |
| **DeepSeek `deepseek-chat`** | `query_free_llm_api` | LLM fallback #1 |
| **Groq `llama-3.3-70b-versatile`** | `query_free_llm_api`, `_generate_news_brief` | LLM fallback #2 + primary for news briefs |
| **Hugging Face Inference API (`Salesforce/blip-image-captioning-large`)** | `analyze_real_image` | Image captioning |
| **OpenSky Network** | [`services/flight_data.py`](backend/services/flight_data.py) | Live flight data (OAuth2 optional) |
| **ESRI World Imagery WMTS** | [`landcover.py`](backend/landcover.py#L57) `fetch_satellite_tile` | Tile fetch by lat/lon/zoom |
| **OpenStreetMap tiles** | Leaflet on monitoring/disaster/analysis screens | Basemap (Referer injected in `main.js`) |
| **Nominatim (geopy)** | [`nlp_socilmedia.py`](backend/nlp_socilmedia.py) CLI + frontend location search | Geocoding |
| **HF Space `Vinit710/road_omniview`** | [`road_backend.py`](backend/road_backend.py) (imports `gradio-client` but local TF inference path is what's live) | Legacy remote road detection |
| **Twitter v2 (tweepy) / Reddit (praw)** | [`nlp_socilmedia.py`](backend/nlp_socilmedia.py) only | CLI social-media disaster collector |

---

## 10. Known Issues / TODOs / Gotchas

- **No auth on APIs** — Flask listens on `0.0.0.0:5000` with debug mode on. Intended for local desktop use only; do **not** expose to the network.
- **Electron renderer has `nodeIntegration: true` and `contextIsolation: false`** — standard for a trusted local app but means renderer has full Node access. Any third-party JS loaded in the renderer can reach the filesystem.
- **`unet_resnet34_glacial_lake.pth` is not in `setup_models.py`** ([`setup_models.py:23`](backend/setup_models.py#L23) only lists 3 files). It's required by [`glacial_lake.py`](backend/glacial_lake.py) but not auto-fetched — must be placed manually.
- **`OPENROUTER_API_KEY` is loaded but unused** ([`app.py:50`](backend/app.py#L50)) — leftover from a previous fallback tier.
- **`gradio-client` in requirements but the HF Space path is dead code** — `road_backend.py` runs the local Keras model; the HF Space wrapper mentioned in docs isn't wired up in the current routes.
- **Two `road` endpoints**: `/api/road-detection` (base64, small image, via `road_backend.py`) and `/api/extract_roads` (TIFF upload, large, via `road_extract.py`). Different paths, different modules, different output shapes.
- **Some `app.py` routes import inside functions** (`import pandas as pd` at L1259) — redundant since it's already imported at top.
- **[`backend/nlp_socilmedia.py`](backend/nlp_socilmedia.py) is completely disconnected** from the Flask app. It's a spaCy+Twitter+Reddit CLI pipeline with its own SQLite DB. Easy to mistake for an active endpoint.
- **[`settings/settings.html`](frontend/src/renderer/screens/settings/settings.html) is a stub** — literally one comment line `<!-- Somone need to code this -->`.
- **`backend/disaster_points.csv` is ~5 MB** and loaded from disk on every `/api/disaster-csv` request with no caching.
- **Model paths**: all resolve via `os.path.dirname(__file__)` now — older `CLAUDE.md` notes about hardcoded Windows paths are **outdated**.
- **`frontend/omniview-win32-x64/`** is a previously-packaged build artifact checked into `node_modules` area; ignore unless doing release work.
- **Test endpoint `/api/test` pings `gemini-1.5-flash`** ([`app.py:961`](backend/app.py#L961)) while the actual LLM calls use `gemini-2.5-flash` — minor drift, but test may succeed while real calls fail if the 2.5 model is gated.
- **News brief prompt prefers Groq first, then Gemini** ([`_generate_news_brief`](backend/app.py#L1049)) — the only place where Groq is the primary, not a fallback.
- **`CHUNK` in `setup_models.py` is 1 MiB** but used for both download and hash reads — fine on Windows, watch on Linux under heavy concurrency.
- **Report version string says "3.0 Production"** even though there's no versioned release pipeline — cosmetic.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **UNet** | Encoder-decoder CNN architecture used for segmentation (pixel-level classification). All four models in this project are UNet variants. |
| **Change detection** | Comparing imagery at two timestamps to highlight what changed. Here: built-up (buildings) change and glacial-lake water extent change. |
| **Built-up** | Terrain classification term for human-constructed (buildings, roads, parking). The `unet_builtup_cd.pth` model segments built-up change between pre/post pairs. |
| **NDVI** | Normalized Difference Vegetation Index — greenness metric. Referenced in the Analytics screen (currently demo data only). |
| **TIFF / GeoTIFF** | Tagged Image File Format, optionally with embedded geospatial metadata. The road extraction pipeline accepts large Sentinel-2 tiles in this format. |
| **Sentinel-2** | ESA satellite constellation; 10 m/px native resolution. Default `pixel_res_m` for glacial lake metrics. |
| **Landsat** | USGS satellite; 30 m/px. Alternative `resolution` option for glacial lake analysis. |
| **WMTS** | Web Map Tile Service — standard for serving pre-rendered map tiles. Used to fetch ESRI imagery by lat/lon/zoom in `landcover.py`. |
| **BLIP** | Bootstrapped Language-Image Pretraining — image-captioning model from Salesforce used via Hugging Face Inference API. |
| **OpenSky** | Crowd-sourced aircraft tracking network (ADS-B); polled for live flight state vectors. |
| **Nominatim** | OpenStreetMap's free geocoder. Used for location search (forward geocoding). |
| **Overpass API** | OpenStreetMap query API; used only in the `nlp_socilmedia.py` CLI. |
| **Blueprint (Flask)** | Flask's mechanism for composing sub-apps; each ML module registers one. |
| **Agg backend** | matplotlib's non-interactive PNG/PDF renderer. Required when running inside Flask (no display). |
| **BLIP-2** | The README/report mentions BLIP-2 but the code uses BLIP (image-captioning-large), not BLIP-2. |

---

Last updated: 2026-04-22

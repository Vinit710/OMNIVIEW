# CHAPTER 7

## SOFTWARE TESTING

Software Testing is the process of executing every functionality and procedure of the program or application with the intent to find the errors or bugs. Testing is performed to investigate the entire project from every aspect. It deals with the motto to make the model more robust and accurate. The results make the developer aware of the issues that the program might go through in the future. Software testing is important to understand the future risks.

In the OMNIVIEW project, testing was performed across both the Electron frontend and the Flask backend, covering the REST API layer, machine learning inference modules (building change detection, glacial lake change detection, road extraction, land cover segmentation), the LLM fallback pipeline (Gemini → DeepSeek → Groq), the background flight-data daemon, and user-facing screens for monitoring, disaster response, and analytics.

---

### 7.1 Type of Testing

#### 7.1.1 Positive Testing

In this process the testing is done against valid data inputs. The model is being given the same kind of input which it is trained on and designed for. It only checks on the valid set of inputs. This checks whether the system actually shows the expected output when the system is supposed to. Positive testing tries to predict whether the system shows the exact output as per the requirements and specifications. It checks the expected behavior of the model.

In OMNIVIEW, positive testing was carried out by supplying valid satellite imagery (PNG/JPG pre- and post-event pairs) to the building change-detection endpoint, valid multi-band Sentinel-2 TIFF tiles to the road extraction module, in-range latitude and longitude values to the land-cover segmentation endpoint, well-formed disaster keywords to the news and report-generation pipeline, and genuine voice commands such as *"draw"*, *"clear"*, and *"roads"* to the analytics voice interface. The system produced the expected masks, reports, charts, and navigation actions in each of these cases.

#### 7.1.2 Negative Testing

In this process the testing is done against invalid data inputs. The model is being given the different kinds of input which it is not trained on and not designed for accordingly. It only checks on the invalid set of inputs. This checks whether the system actually shows error when the system is supposed to. Negative testing tries to predict whether the system shows the exact output as per the requirements and specifications when the inputs are not in correspondence with the valid inputs. It checks the expected behavior of the model in case of random unwanted actions.

In OMNIVIEW, negative testing included uploading non-image files (`.txt`, `.pdf`) to the change-detection panels, submitting only one of the two required images for pre/post comparison, providing out-of-range latitude/longitude values (e.g. `lat = 200`) to the land-cover endpoint, supplying an empty search string to the news and disaster pipelines, uploading a standard PNG to the road-extraction endpoint which strictly accepts `.tif`/`.tiff`, setting the glacial-lake threshold outside the `0.0–1.0` range, and simulating an offline state for all LLM providers to verify the static fallback. In every case the system either returned a structured error response, fell back to the next provider in the chain, or displayed a user-facing warning in the log panel without crashing.

#### 7.1.3 Unit Testing

The unit testing is performed on every part of the model that is being developed. It tests the model right from the stage wherein the input was been provided upto the state where the probabilistic labels are being generated. The tests test the inputs, outputs, functions, classes, modules and the entire data in chunks. This leads to the assurance of having no errors in the smallest possible module too. This helps in making the model more confident.

Unit testing in OMNIVIEW was performed on the individual building blocks of the system. The UNet change-detection model in `change_detection.py` was tested in isolation on its 6-channel stacked input pipeline to confirm a valid sigmoid mask is produced for every `256×256` input. The ResNet-based road extraction module in `road_extract.py` was tested on its tiled-inference routine (`2×4` crops, `500×500` patches) and on its morphological post-processing. The UNet-ResNet34 glacial-lake model in `glacial_lake.py` was tested on its tiled-inference loop and its area-calculation helper (`pixels × resolution²`). The ONNX land-cover model in `landcover.py` was tested on its min-max normalization and five-class argmax colouring. The LLM helper `query_free_llm_api` was tested by muting each provider in turn to confirm the Gemini → DeepSeek → Groq → static fallback order. The frontend `Logger` class was unit-tested for its `info / warning / error / success / clear` methods and the 50-entry FIFO rotation.

#### 7.1.4 Integration Testing

In integration testing the entire system is being tested as a whole entity. The combination of various modules lead to the formation of an integrated system. The unit testing tests the individual elements and the integration testing tests all the units combined as a single unit. It ensures that the functionality of the system is same and error free when combined completely.

For OMNIVIEW, integration testing was performed by running the Electron frontend and the Flask backend together on `localhost:5000` and exercising the complete user journeys end-to-end. The **disaster report pipeline** was verified as one integrated unit: a search query triggers the Google News fetch, BLIP-2 image captioning on the Hugging Face Inference API, Gemini-based analysis, Matplotlib chart generation, and the final Markdown report rendered back on the Disaster screen. The **building change-detection journey** was verified from drag-drop upload in the browser, through base64 encoding, REST transport, UNet inference, and rendering of the mask/comparison/overlay images back on the Monitoring screen. The **road-extraction journey** was verified from TIFF upload, through multipart transport, ResNet tiled inference, temp-file output, and `/api/bigroads_file/<filename>` image serving. The **live flights layer** was verified from the background OpenSky daemon thread, through the `flights.json` cache, to the map overlay on the Monitoring screen.

---

### 7.2 Test Cases & Test Results

**Table 7.1: Test Cases and Test Results**

| Test Case ID | Test Case Name | Objectives | Expected Output | Actual Output | Result |
|:---:|:---|:---|:---|:---|:---:|
| 1 | Check Backend Health Endpoint | To check whether the `/api/status` endpoint correctly reports backend availability and service status on application launch | Status JSON with `status: ok` and connected services should be returned | Status JSON with service map was returned | Pass |
| 2 | Check Splash Screen Initialization | To check whether the splash screen animation plays and auto-redirects to the Monitoring screen after the initialization sequence | Splash should complete and redirect to `monitoring.html` | Splash completed and redirected to Monitoring screen | Pass |
| 3 | Check Location Search using Nominatim | To check whether entering a valid place name in the search bar flies the Leaflet map to the correct coordinates | Map should fly to searched location with a marker | Map flew to location and marker was placed | Pass |
| 4 | Check Building Change Detection using Valid Image Pair | To check whether uploading valid pre- and post-disaster satellite images produces a change mask | Change mask, change percentage, and overlay image should be generated | Mask, percentage, and overlay were generated | Pass |
| 5 | Check Building Change Detection with Single Image | To check whether the system blocks analysis when only one of the two required images is uploaded | System should display a warning and not call the API | Warning was shown and request was blocked | Pass |
| 6 | Check Building Change Detection with Non-Image File | To check whether the upload panel rejects `.txt` or `.pdf` files | Non-image file should be rejected before upload | File was rejected and error shown in logs | Pass |
| 7 | Check Glacial Lake Change Detection using Valid Images | To check whether the lake-change pipeline computes area change between two time-stamped images | Stats (pct change, gained ha, lost ha) and change map should be generated | Stats and change map were generated | Pass |
| 8 | Check Glacial Lake Threshold Bounds | To check whether the confidence threshold slider correctly restricts values to the `0.00–1.00` range | Slider should clamp to valid range | Slider values stayed within `0.0–1.0` | Pass |
| 9 | Check Glacial Lake Change Map Download | To check whether the change-map PNG can be downloaded to the user's filesystem | Browser should trigger download of change map | PNG download was triggered | Pass |
| 10 | Check News Search using Valid Query | To check whether the `/api/news` endpoint returns news articles for a valid disaster keyword | 15 news articles should be returned | 15 articles were returned | Pass |
| 11 | Check News Search with Empty Query | To check whether the news pipeline handles an empty search string gracefully | System should reject or return fallback articles without crashing | Fallback articles were returned with a warning | Pass |
| 12 | Check News Time Filter | To check whether the time-filter dropdown (1d / 7d / 30d / all) restricts results to the selected window | Articles should be filtered by date range | Articles were filtered correctly | Pass |
| 13 | Check AI News Brief Generation | To check whether `/api/news_brief` produces a concise LLM-generated summary of top articles | Summary text should be generated via Groq or Gemini | Summary was generated | Pass |
| 14 | Check Full Disaster Report Generation | To check whether `/api/generate_report` orchestrates news → images → analysis → charts → Markdown report | Full report with charts and narrative sections should be returned | Report was generated end-to-end | Pass |
| 15 | Check Download Report as Text | To check whether the generated disaster report can be downloaded as a plain-text file | Browser should download the report as `.txt` | File was downloaded | Pass |
| 16 | Check Pre-Disaster Alerts Map Toggle | To check whether the "Pre Disaster Alerts" menu loads the pre-disaster scenario map | Pre-disaster map should render | Pre-disaster map rendered correctly | Pass |
| 17 | Check Post-Disaster Reports Map Toggle | To check whether the "Post Disaster Reports" menu loads the disaster GeoJSON overlay | Disaster markers should render from GeoJSON/CSV | Markers rendered on map | Pass |
| 18 | Check Disaster CSV Fallback | To check whether the map falls back to `/api/disaster-csv` when the GeoJSON source is unavailable | CSV-based markers should be rendered | Fallback markers rendered | Pass |
| 19 | Check Road Extraction using Valid TIFF | To check whether a Sentinel-2 TIFF produces the original, mask, and overlay outputs | `orig_url`, `mask_url`, and `overlay_url` should be returned | All three URLs were returned and images rendered | Pass |
| 20 | Check Road Extraction with PNG Input | To check whether the road-extraction endpoint rejects non-TIFF files | Request should be rejected with an error message | Request was rejected with clear error | Pass |
| 21 | Check Road Overlay Toggle | To check whether the "Toggle Overlay" button shows/hides the red road mask over the original image | Overlay visibility should toggle | Overlay toggled correctly | Pass |
| 22 | Check Temp File Serving (`/api/bigroads_file`) | To check whether generated road extraction PNGs are served correctly and cleaned up after 2 hours | PNG should be served; old files should be deleted | Files served and cleanup confirmed | Pass |
| 23 | Check Land Cover Segmentation using Lat/Lon | To check whether providing valid lat/lon fetches an ESRI tile and returns a five-class mask | Segmentation mask with class statistics should be returned | Mask and class stats were returned | Pass |
| 24 | Check Land Cover with Out-of-Range Coordinates | To check whether `lat=200, lon=500` is rejected | System should return a 400-style error | Invalid coordinates were rejected | Pass |
| 25 | Check Land Cover using Base64 Image Upload | To check whether the endpoint accepts a base64 image as an alternative to lat/lon | Segmentation output should be generated from uploaded image | Mask was generated from uploaded image | Pass |
| 26 | Check Voice Command Activation | To check whether the Web Speech API activates continuous listening on the Analysis screen | "🎤 Listening…" indicator should appear | Indicator appeared and commands were captured | Pass |
| 27 | Check Voice Command Recognition ("roads") | To check whether the spoken word *roads* switches to the road-extraction section | Road extraction panel should open | Panel switched correctly | Pass |
| 28 | Check Voice Command with Unrecognized Phrase | To check whether the system ignores non-registered phrases without crashing | Unknown phrase should be logged, no action taken | Phrase ignored, system stable | Pass |
| 29 | Check Flight Data Endpoint | To check whether `/api/flights` returns live aircraft positions from the OpenSky daemon cache | Array of flight state objects should be returned | Flight array returned within 4-minute freshness | Pass |
| 30 | Check Flight Data Offline Behaviour | To check whether the system remains usable when the OpenSky API is unreachable | Cached or empty flight array should be returned, no crash | Empty array returned, app remained responsive | Pass |
| 31 | Check LLM Primary (Gemini) Path | To check whether Gemini is used as the primary LLM when the API key is valid | Gemini response should populate report narratives | Gemini returned the expected analysis text | Pass |
| 32 | Check LLM Fallback to DeepSeek | To check whether DeepSeek is used when Gemini is unavailable | DeepSeek response should be used | DeepSeek response was used | Pass |
| 33 | Check LLM Fallback to Groq | To check whether Groq is used when both Gemini and DeepSeek are unavailable | Groq response should be used | Groq response was used | Pass |
| 34 | Check LLM Static Fallback | To check whether a static JSON report is returned when all providers are offline | Hardcoded fallback response should be returned | Static response was returned | Pass |
| 35 | Check Logger Panel Display | To check whether the in-app logger records `info`, `warning`, `error`, and `success` messages | Log entries should appear in the logs panel with colour coding | Entries appeared with correct styles | Pass |
| 36 | Check Logger FIFO Rotation | To check whether the logger keeps at most the 50 most recent entries | Older entries should be dropped beyond 50 | Rotation verified at 50 entries | Pass |
| 37 | Check Logger Clear Button | To check whether pressing the Clear button empties the log history | Logs panel should become empty | Logs panel cleared | Pass |
| 38 | Check Logger Voice (TTS) Toggle | To check whether enabling TTS makes the logger read out log messages aloud | Browser `speechSynthesis` should speak each log | Log messages were spoken aloud | Pass |
| 39 | Check Sidebar Screen Switcher | To check whether the sidebar dropdown navigates between Monitoring, Disaster, and Analytics screens | Selected screen should load correctly | Navigation worked across all screens | Pass |
| 40 | Check End-to-End Integration (Frontend ↔ Backend) | To check whether the Electron frontend correctly communicates with the Flask backend on `localhost:5000` across all modules | All API calls from frontend should return expected results | All endpoints responded correctly during integration run | Pass |

---

*End of Chapter 7.*

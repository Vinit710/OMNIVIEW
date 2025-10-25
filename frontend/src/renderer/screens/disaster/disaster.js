const fs = require("fs"),
  path = require("path");
let currentSection = "news",
  isSearching = !1;
const postDisasterSection = document.getElementById("postDisasterSection");
const preDisasterContent = document.getElementById("preDisasterContent");
let map,
  markersLayer,
  mapInitialized = !1,
  disasterPoints = [];
const menuItems = document.querySelectorAll(".menu-item"),
  searchInput = document.getElementById("searchInput"),
  searchBtn = document.getElementById("searchBtn"),
  reportBtn = document.getElementById("reportBtn"),
  refreshBtn = document.getElementById("refreshBtn"),
  defaultContent = document.getElementById("defaultContent"),
  newsResults = document.getElementById("newsResults");
const reportSection = document.getElementById("reportSection"),
  sectionTitle = document.getElementById("sectionTitle"),
  resultsContainer = document.getElementById("resultsContainer"),
  reportContainer = document.getElementById("reportContainer"),
  downloadReportBtn = document.getElementById("downloadReportBtn"),
  logsContent = document.querySelector(".logs-content");
const disasterIcons = {
  flood: "🌊",
  earthquake: "🌋",
  cyclone: "🌀",
  drought: "☀️",
  landslide: "⛰️",
  tsunami: "🌊",
  wildfire: "🔥",
  default: "⚠️",
}; // Add this after your existing variable declarations
function updateSectionTitle() {
  sectionTitle.textContent =
    {
      news: "Latest News",
      "post-disaster": "Post Disaster Reports",
      "pre-disaster": "Pre Disaster Alerts",
    }[currentSection] || "News Dashboard";
}
function performSearch() {
  const e = searchInput.value.trim();
  e
    ? ((isSearching = !0),
      showNewsResults(),
      showLoading(),
      fetch(API_CONFIG.getUrl("NEWS"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: e, section: currentSection }),
      })
        .then((e) => e.json())
        .then((t) => {
          (displayResults(t),
            addLog("info", `Fetched ${t.articles.length} articles for "${e}"`));
        })
        .catch((e) => {
          (showError("Error fetching news. Please try again."),
            addLog("error", "Error fetching news: " + e.message),
            console.error("Search error:", e));
        }))
    : addLog("error", "Please enter a search query.");
}
function generateReport() {
  const e = searchInput.value.trim();
  e
    ? (showReportSection(),
      (reportContainer.innerHTML =
        '<div class="loading">Generating report...</div>'),
      addLog("info", `Generating report for "${e}"`),
      fetch(API_CONFIG.getUrl("GENERATE_REPORT"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: e }),
      })
        .then((e) => e.json())
        .then((e) => {
          if (e.error)
            return (
              (reportContainer.innerHTML = `<div class="error">${e.error}</div>`),
              void addLog("error", `Report generation failed: ${e.error}`)
            );
          const t = markdownToHtml(e.report);
          ((reportContainer.innerHTML = `<div class="report-content">${t}</div>`),
            addLog("info", "Report generated successfully"));
        })
        .catch((e) => {
          ((reportContainer.innerHTML =
            '<div class="error">Error generating report. Please try again.</div>'),
            addLog("error", "Error generating report: " + e.message),
            console.error("Report error:", e));
        }))
    : addLog("error", "Please enter a search query to generate a report.");
}
const searchContainer = document.querySelector(".search-container");
function loadDefaultContent() {
  ((isSearching = !1),
    (searchInput.value = ""),
    (defaultContent.style.display = "block"),
    (newsResults.style.display = "none"),
    (reportSection.style.display = "none"),
    (postDisasterSection.style.display = "none"),
    (preDisasterContent.style.display = "none"),
    // Show search container for news section
    searchContainer.classList.remove("hidden"));

  // Show content area for default/news content
  document.querySelector(".content-area").style.display = "block";
}
function showNewsResults() {
  ((defaultContent.style.display = "none"),
    (newsResults.style.display = "block"),
    (reportSection.style.display = "none"),
    (postDisasterSection.style.display = "none"),
    (preDisasterContent.style.display = "none"),
    // Show search container for news section
    searchContainer.classList.remove("hidden"));

  // Show content area for news results
  document.querySelector(".content-area").style.display = "block";
}
function showReportSection() {
  ((defaultContent.style.display = "none"),
    (newsResults.style.display = "none"),
    (reportSection.style.display = "block"),
    (postDisasterSection.style.display = "none"),
    (preDisasterContent.style.display = "none"),
    // Show search container for report section
    searchContainer.classList.remove("hidden"));

  // Show content area for report section
  document.querySelector(".content-area").style.display = "block";
}
function showLoading() {
  resultsContainer.innerHTML =
    '<div class="loading">Loading news articles...</div>';
}
function showError(e) {
  resultsContainer.innerHTML = `<div class="error">${e}</div>`;
}
function displayResults(e) {
  if (!e.articles || 0 === e.articles.length)
    return void (resultsContainer.innerHTML =
      '<div class="error">No articles found for your search query.</div>');
  const t = e.articles
    .map(
      (e) =>
        `\n          <div class="news-article">\n            <h3>${escapeHtml(e.title || "Untitled")}</h3>\n            <p>${escapeHtml(e.snippet || "No description available.")}</p>\n            <a href="${escapeHtml(e.link || "#")}" target="_blank" rel="noopener noreferrer">Read more →</a>\n          </div>\n        `
    )
    .join("");
  resultsContainer.innerHTML = t;
}
function escapeHtml(e) {
  const t = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return e.replace(/[&<>"']/g, function (e) {
    return t[e];
  });
}
function addLog(e, t) {
  const n = "error" === e ? "log-error" : "log-warning",
    r = document.createElement("div");
  for (
    r.className = n,
      r.textContent = `${new Date().toLocaleTimeString()}: ${t}`,
      logsContent.prepend(r);
    logsContent.children.length > 10;

  )
    logsContent.removeChild(logsContent.lastChild);
}
function markdownToHtml(e) {
  return e
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/(\n<li>.*)+/g, "<ul>$&</ul>")
    .replace(/\n/g, "<br>");
}
function showPostDisaster() {
  defaultContent.style.display = "none";
  newsResults.style.display = "none";
  reportSection.style.display = "none";
  postDisasterSection.style.display = "block";
  preDisasterContent.style.display = "none";

  // Hide search container
  searchContainer.classList.add("hidden");

  // Show content area for post-disaster
  document.querySelector(".content-area").style.display = "block";

  if (!mapInitialized) {
    initMap();
    mapInitialized = true;
  }
}
function initMap() {
  (((map = L.map("map").setView([20, 0], 2)),
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    zoom: 5,
    minZoom: 3,
    maxZoom: 18,
    maxBounds: [
      [-90, -180],
      [90, 180],
    ],
    maxBoundsViscosity: 1.0,
    attribution: "&copy; OpenStreetMap contributors",
    noWrap: true,
  }).addTo(map),
  (markersLayer = L.layerGroup().addTo(map)),
  fetch(API_CONFIG.getUrl("DISASTER_CSV"))
    .then((e) => e.json())
    .then((e) => {
      ((disasterPoints = e),
        populateCountryFilter(e),
        populateYearFilter(e),
        (document.getElementById("countryFilter").value = "India"),
        (document.getElementById("yearFilter").value = "2010"),
        filterAndRenderMarkers());
    })
    .catch((e) => {
      (addLog("error", "Failed to load disaster points: " + e.message),
        console.error("CSV load error:", e));
    }),
  document
    .getElementById("countryFilter")
    .addEventListener("change", filterAndRenderMarkers),
  document
    .getElementById("yearFilter")
    .addEventListener("change", filterAndRenderMarkers)),
    map.setMaxBounds([
      [-90, -180],
      [90, 180],
    ]));
}
function filterAndRenderMarkers() {
  const e = document.getElementById("countryFilter").value,
    t = document.getElementById("yearFilter").value;
  let n = disasterPoints;
  (e &&
    (n = n.filter(
      (t) => t.country && t.country.toLowerCase() === e.toLowerCase()
    )),
    t && (n = n.filter((e) => String(e.year) === t)),
    renderDisasterMarkers(n));
}
function renderDisasterMarkers(points) {
  markersLayer.clearLayers();
  const latlngs = [];

  points.forEach((pt) => {
    if (pt.latitude && pt.longitude) {
      latlngs.push([pt.latitude, pt.longitude]);

      const marker = L.marker([pt.latitude, pt.longitude], {
        icon: createDisasterIcon(pt.disastertype),
        title: pt.location,
      })
        .addTo(markersLayer)
        .bindPopup(
          `<b>${pt.disastertype || "Disaster"}</b><br>
         <b>Year:</b> ${pt.year || "N/A"}<br>
         <b>Location:</b> ${pt.location || "N/A"}<br>
         <b>Country:</b> ${pt.country || "N/A"}`
        );
    }
  });

  if (latlngs.length) map.fitBounds(latlngs);
}
function populateCountryFilter(e) {
  const t = new Set(e.map((e) => e.country).filter(Boolean)),
    n = document.getElementById("countryFilter");
  ((n.innerHTML = '<option value="">All Countries</option>'),
    Array.from(t)
      .sort()
      .forEach((e) => {
        const t = document.createElement("option");
        ((t.value = e), (t.textContent = e), n.appendChild(t));
      }));
}
function populateYearFilter(e) {
  const t = new Set(e.map((e) => e.year).filter(Boolean)),
    n = document.getElementById("yearFilter");
  ((n.innerHTML = '<option value="">All Years</option>'),
    Array.from(t)
      .sort()
      .forEach((e) => {
        const t = document.createElement("option");
        ((t.value = e), (t.textContent = e), n.appendChild(t));
      }));
}
function createDisasterIcon(type) {
  const icon = disasterIcons[type.toLowerCase()] || disasterIcons.default;
  return L.divIcon({
    html: `<span style="font-size: 24px;">${icon}</span>`,
    className: "disaster-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
} // Create custom divIcon for emojis
(menuItems.forEach((e) => {
  e.addEventListener("click", function () {
    (menuItems.forEach((e) => e.classList.remove("active")),
      this.classList.add("active"),
      (currentSection = this.getAttribute("data-section")),
      updateSectionTitle(),
      "post-disaster" === currentSection
        ? showPostDisaster()
        : isSearching || loadDefaultContent());
  });
}),
  searchBtn.addEventListener("click", performSearch),
  searchInput.addEventListener("keypress", function (e) {
    "Enter" === e.key && performSearch();
  }),
  reportBtn.addEventListener("click", generateReport),
  refreshBtn.addEventListener("click", function () {
    isSearching ? performSearch() : loadDefaultContent();
  }),
  downloadReportBtn.addEventListener("click", function () {
    const e = searchInput.value.trim() || "disaster_report",
      t = reportContainer.querySelector(".report-content");
    if (!t) return void addLog("error", "No report available to download.");
    const n = t.innerText,
      r = `disaster_report_${e.replace(/\s+/g, "_")}.md`,
      o = path.join(
        process.env.HOME || process.env.USERPROFILE,
        "Downloads",
        r
      );
    try {
      (fs.writeFileSync(o, n),
        addLog("info", "Report downloaded successfully to Downloads folder"));
    } catch (e) {
      addLog("error", `Download failed: ${e.message}`);
    }
  }));
(document.addEventListener("DOMContentLoaded", function () {
  const e = document.getElementById("sidebarTitle"),
    t = document.getElementById("screenDropdown"),
    n = document.querySelector(".dropdown-arrow"),
    r = document.querySelectorAll(".dropdown-item"),
    o = document.querySelector(".sidebar-title-container");
  (o.addEventListener("click", function (e) {
    (e.preventDefault(),
      e.stopPropagation(),
      t.classList.toggle("show"),
      n.classList.toggle("rotated"));
  }),
    window.addEventListener("click", function (e) {
      o.contains(e.target) ||
        (t.classList.remove("show"), n.classList.remove("rotated"));
    }),
    t.addEventListener("click", function (e) {
      e.stopPropagation();
    }),
    r.forEach((o) => {
      o.addEventListener("click", function (o) {
        o.stopPropagation();
        const s = this.getAttribute("data-screen"),
          a = this.querySelector("span").textContent;
        (r.forEach((e) => e.classList.remove("active")),
          this.classList.add("active"),
          (e.textContent = a),
          t.classList.remove("show"),
          n.classList.remove("rotated"),
          (function (e) {
            switch (e) {
              case "monitoring":
                window.location.href = "../monitoring/monitoring.html";
                break;
              case "disaster":
                console.log("Already on Disaster Analysis screen");
                break;
              case "analytics":
                window.location.href = "../analysis/analysis.html";
                break;
            }
          })(s));
      });
    }));
}),
  updateSectionTitle(),
  loadDefaultContent(),
  document.querySelector(".expand-btn").addEventListener("click", function () {
    const e = document.querySelector(".bottom-panel");
    "300px" === e.style.height
      ? ((e.style.height = "120px"), (this.textContent = "Expand ▲"))
      : ((e.style.height = "300px"), (this.textContent = "Collapse ▼"));
  }),
  document
    .getElementById("generateAnalysisBtn")
    .addEventListener("click", async function () {
      const analysisResult = document.getElementById("analysisResult");
      const analysisContent = document.getElementById("analysisContent");

      // Get currently displayed disasters
      const currentDisasters = [];
      markersLayer.eachLayer((marker) => {
        const position = marker.getLatLng();
        const popup = marker.getPopup();
        currentDisasters.push({
          latitude: position.lat,
          longitude: position.lng,
          details: popup.getContent(),
        });
      });

      analysisContent.innerHTML =
        '<div class="loading">Generating analysis...</div>';
      analysisResult.style.display = "block";

      try {
        const response = await fetch(API_CONFIG.getUrl("ANALYZE_DISASTERS"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disasters: currentDisasters,
            country: document.getElementById("countryFilter").value,
            year: document.getElementById("yearFilter").value,
          }),
        });

        const data = await response.json();
        analysisContent.innerHTML = `
      <div class="analysis-content">
        ${markdownToHtml(data.analysis)}
      </div>
    `;
        addLog("info", "Generated disaster analysis report");
      } catch (error) {
        analysisContent.innerHTML =
          '<div class="error">Failed to generate analysis</div>';
        addLog("error", "Failed to generate analysis: " + error.message);
      }
    }));

// --- Pre-Disaster Map (like Post Disaster, but shows weather on click) ---
let preDisasterMap, preDisasterWeatherMarker;

function showPreDisaster() {
  defaultContent.style.display = "none";
  newsResults.style.display = "none";
  reportSection.style.display = "none";
  postDisasterSection.style.display = "none";
  preDisasterContent.style.display = "block";

  // Hide search container
  searchContainer.classList.add("hidden");

  // Hide content area for pre-disaster
  document.querySelector(".content-area").style.display = "none";

  document.getElementById("preWeatherHeadline").innerHTML = "";
  if (!preDisasterMap) initPreDisasterMap();
}

function hidePreDisaster() {
  preDisasterContent.style.display = "none";
  document.getElementById("preWeatherHeadline").innerHTML = "";

  // Show content area when leaving pre-disaster
  document.querySelector(".content-area").style.display = "block";
}

function initPreDisasterMap() {
  preDisasterMap = L.map("preDisasterMap").setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    zoom: 5,
    minZoom: 3,
    maxZoom: 18,
    maxBounds: [
      [-90, -180],
      [90, 180],
    ],
    attribution: "&copy; OpenStreetMap contributors",
    noWrap: true,
  }).addTo(preDisasterMap);

  preDisasterMap.setMaxBounds([
    [-90, -180],
    [90, 180],
  ]);
  preDisasterMap.on("click", function (e) {
    const { lat, lng } = e.latlng;
    if (preDisasterWeatherMarker)
      preDisasterMap.removeLayer(preDisasterWeatherMarker);
    preDisasterWeatherMarker = L.marker([lat, lng]).addTo(preDisasterMap);
    document.getElementById("preWeatherHeadline").innerHTML =
      '<div class="loading">Fetching weather...</div>';
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code,windspeed_10m,cloud_cover&timezone=auto`
    )
      .then((res) => res.json())
      .then((data) => {
        const w = data.current;
        const headline = `
          <div style="color:#ffd700; font-size:1.2rem; font-weight:bold; margin-bottom:8px;">
            Weather at (${lat.toFixed(2)}, ${lng.toFixed(2)}): 
            ${w.temperature_2m}°C, ${w.precipitation}mm rain, ${w.windspeed_10m}km/h wind, ${w.cloud_cover}% clouds.
            <span style="color:#64b5f6; margin-left:12px;"><b>AI:</b> ${getAISummary(w)}</span>
          </div>
        `;
        document.getElementById("preWeatherHeadline").innerHTML = headline;
      })
      .catch(() => {
        document.getElementById("preWeatherHeadline").innerHTML =
          '<div class="error">Failed to fetch weather data.</div>';
      });
  });
}

// Hardcoded AI summary logic (demo)
function getAISummary(w) {
  if (w.precipitation > 20)
    return "⚠️ High risk of flooding due to heavy rainfall.";
  if (w.temperature_2m > 40)
    return "⚠️ Extreme heat detected. Possible heatwave.";
  if (w.windspeed_10m > 60) return "⚠️ Severe wind speeds. Storm risk present.";
  if (w.cloud_cover > 90) return "Heavy cloud cover, possible storms.";
  return "No immediate disaster risk detected.";
}

// Attach to menu items (update this block)
menuItems.forEach((item) => {
  item.addEventListener("click", function () {
    menuItems.forEach((i) => i.classList.remove("active"));
    this.classList.add("active");
    currentSection = this.getAttribute("data-section");
    updateSectionTitle();
    if (currentSection === "post-disaster") {
      showPostDisaster();
      hidePreDisaster();
    } else if (currentSection === "pre-disaster") {
      showPreDisaster();
    } else if (currentSection === "news") {
      isSearching || loadDefaultContent();
      hidePreDisaster();
    }
  });
});

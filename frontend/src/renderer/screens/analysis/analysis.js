document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ Analytics screen loaded");

  const logsContent = document.querySelector(".logs-content");
  function addLog(message, type = "info") {
    if (logsContent) {
      const logEntry = document.createElement("div");
      logEntry.className = `log-${type}`;
      logEntry.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${message}`;
      logsContent.appendChild(logEntry);
      logsContent.scrollTop = logsContent.scrollHeight;
    }
  }
  addLog("Analytics dashboard initialized");

  // Sidebar navigation implementation
  const sidebarTitle = document.getElementById("sidebarTitle");
  const screenDropdown = document.getElementById("screenDropdown");
  const dropdownArrow = document.querySelector(".dropdown-arrow");
  const dropdownItems = document.querySelectorAll(".dropdown-item");
  const sidebarTitleContainer = document.querySelector(
    ".sidebar-title-container"
  );
  // Sub-tabs (menu-section)
  const menuItems = document.querySelectorAll(".menu-item");
  const overviewSection = document.getElementById("overviewSection");
  const trendsSection = document.getElementById("trendsSection");
  const classificationSection = document.getElementById(
    "classificationSection"
  );
  const ndviSection = document.getElementById("ndviSection");
  const bigroadsSection = document.getElementById("bigroadsSection");
  // Sub-tab switching logic
  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      menuItems.forEach((el) => el.classList.remove("active"));
      this.classList.add("active");
      // Hide all sections
      overviewSection.style.display = "none";
      trendsSection.style.display = "none";
      classificationSection.style.display = "none";
      ndviSection.style.display = "none";
      bigroadsSection.style.display = "none";
      // Show selected
      const section = this.getAttribute("data-section");
      if (section === "overview") overviewSection.style.display = "";
      if (section === "trends") trendsSection.style.display = "";
      if (section === "classification")
        classificationSection.style.display = "";
      if (section === "ndvi") ndviSection.style.display = "";
      if (section === "bigroads") bigroadsSection.style.display = "";
    });
  });

  // --- Big Roads Extraction Feature ---
  const bigRoadsForm = document.getElementById("bigRoadsForm");
  const sentinelFile = document.getElementById("sentinelFile");
  const bigRoadsStatus = document.getElementById("bigRoadsStatus");
  const bigRoadsResults = document.getElementById("bigRoadsResults");
  const bigRoadsOrig = document.getElementById("bigRoadsOrig");
  const bigRoadsMask = document.getElementById("bigRoadsMask");
  const bigRoadsOverlay = document.getElementById("bigRoadsOverlay");
  const toggleOverlayBtn = document.getElementById("toggleOverlayBtn");
  let overlayMode = true;

  if (bigRoadsForm) {
    bigRoadsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      bigRoadsStatus.textContent =
        "Uploading and processing... (this may take a while)";
      bigRoadsResults.style.display = "none";
      const file = sentinelFile.files[0];
      if (!file) {
        bigRoadsStatus.textContent = "Please select a Sentinel-2 TIFF file.";
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      try {
        const resp = await fetch("http://localhost:5000/api/extract_roads", {
          method: "POST",
          body: formData,
        });
        if (!resp.ok) throw new Error("Processing failed");
        const data = await resp.json();
        // data: { orig_url, mask_url, overlay_url }
        bigRoadsOrig.innerHTML = `<img src="${data.orig_url}" style="width:100%;height:100%;object-fit:contain;"/>`;
        bigRoadsMask.innerHTML = `<img src="${data.mask_url}" style="width:100%;height:100%;object-fit:contain;"/>`;
        bigRoadsOverlay.innerHTML = `<img id="overlayImg" src="${data.overlay_url}" style="width:100%;height:100%;object-fit:contain;"/>`;
        bigRoadsResults.style.display = "";
        bigRoadsStatus.textContent = "Extraction complete!";
        overlayMode = true;
      } catch (err) {
        bigRoadsStatus.textContent = "Error: " + err.message;
      }
    });
    // Overlay toggle
    if (toggleOverlayBtn) {
      toggleOverlayBtn.addEventListener("click", () => {
        overlayMode = !overlayMode;
        const overlayImg = document.getElementById("overlayImg");
        if (!overlayImg) return;
        overlayImg.style.opacity = overlayMode ? "1" : "0.3";
        toggleOverlayBtn.textContent = overlayMode
          ? "Toggle Overlay"
          : "Show Overlay";
      });
    }
  }

  // Toggle dropdown
  sidebarTitleContainer.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    screenDropdown.classList.toggle("show");
    dropdownArrow.classList.toggle("rotated");
  });

  // Close dropdown when clicking outside
  window.addEventListener("click", function (event) {
    if (!sidebarTitleContainer.contains(event.target)) {
      screenDropdown.classList.remove("show");
      dropdownArrow.classList.remove("rotated");
    }
  });

  // Prevent dropdown from closing when clicking inside it
  screenDropdown.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  // Handle dropdown item clicks
  dropdownItems.forEach((item) => {
    item.addEventListener("click", function (event) {
      event.stopPropagation();
      const screen = this.getAttribute("data-screen");
      const screenName = this.querySelector("span").textContent;

      // Update active state
      dropdownItems.forEach((item) => item.classList.remove("active"));
      this.classList.add("active");

      // Update sidebar title
      sidebarTitle.textContent = screenName;

      // Close dropdown
      screenDropdown.classList.remove("show");
      dropdownArrow.classList.remove("rotated");

      // Navigate to screen
      switchScreen(screen);
    });
  });

  // Screen switching function
  function switchScreen(screen) {
    switch (screen) {
      case "monitoring":
        window.location.href = "../monitoring/monitoring.html";
        break;
      case "disaster":
        window.location.href = "../disaster/disaster.html";
        break;
      case "analytics":
        console.log("Already on Analytics screen");
        break;
    }
  }

  // Mock Data Expansion
  const mockDisasterData = {
    years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025"],
    events: {
      Flood: [5, 7, 4, 6, 8, 5, 9],
      Fire: [3, 4, 6, 5, 7, 8, 6],
      Earthquake: [2, 3, 1, 4, 2, 3, 5],
    },
    classifications: [
      {
        labels: ["Urban", "Forest", "Water", "Agriculture", "Other"],
        data: [40, 20, 15, 15, 10],
      }, // Urban area
      {
        labels: ["Urban", "Forest", "Water", "Agriculture", "Other"],
        data: [10, 50, 20, 15, 5],
      }, // Rural area
    ],
    ndviValues: [0.2, 0.4, 0.6, 0.3, 0.5, 0.7, 0.8], // Mock NDVI over time
  };

  // Populate Filters
  const yearFilter = document.getElementById("yearFilter");
  mockDisasterData.years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  // Map Setup (enhanced with markers and overlays)
  const map = L.map("map").setView([0, 0], 2);
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles &copy; Esri",
      maxZoom: 18,
    }
  ).addTo(map);

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  const drawControl = new L.Control.Draw({
    draw: { rectangle: true },
    edit: { featureGroup: drawnItems },
  });
  map.addControl(drawControl);

  map.on("draw:created", (e) => {
    drawnItems.addLayer(e.layer);
    addLog("Area selected");
    map.on("click", (clickEvent) => {
      L.marker(clickEvent.latlng).addTo(map).bindPopup("Analysis Point");
      addLog("Marker added at " + clickEvent.latlng);
      updateCharts(); // Trigger chart update on click
    });
  });

  // NDVI Heatmap Overlay (mock)
  let ndviLayer;
  function addNdviOverlay() {
    if (ndviLayer) map.removeLayer(ndviLayer);
    const bounds = drawnItems.getBounds() || map.getBounds();
    ndviLayer = L.rectangle(bounds, {
      color: "none",
      fillColor: getNdviColor(Math.random() * 0.8 + 0.2),
      fillOpacity: 0.5,
    }).addTo(map);
    addLog("NDVI overlay added");
  }

  function getNdviColor(ndvi) {
    return ndvi > 0.5 ? "#4caf50" : ndvi > 0.3 ? "#ffeb3b" : "#f44336";
  }

  // Charts
  let trendChart, classificationChart, barChart;

  const trendCtx = document.getElementById("trendChart").getContext("2d");
  trendChart = new Chart(trendCtx, {
    type: "line",
    data: { labels: mockDisasterData.years, datasets: [] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });

  const classCtx = document
    .getElementById("classificationChart")
    .getContext("2d");
  classificationChart = new Chart(classCtx, {
    type: "pie",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [
            "#ff6384",
            "#36a2eb",
            "#ffce56",
            "#4bc0c0",
            "#9966ff",
          ],
        },
      ],
    },
    options: { responsive: true },
  });

  const barCtx = document.getElementById("disasterBarChart").getContext("2d");
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Flood", "Fire", "Earthquake"],
      datasets: [{ label: "Events", data: [], backgroundColor: "#ff9800" }],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });

  // Update Charts Function
  function updateCharts(year = "", type = "") {
    const index = mockDisasterData.years.indexOf(year);
    const datasets = Object.keys(mockDisasterData.events)
      .map((key) => ({
        label: key,
        data: mockDisasterData.events[key],
        borderColor: getRandomColor(),
        tension: 0.1,
      }))
      .filter((ds) => !type || ds.label === type);
    trendChart.data.datasets = datasets;
    trendChart.update();

    const classIndex = Math.floor(
      Math.random() * mockDisasterData.classifications.length
    );
    classificationChart.data.labels =
      mockDisasterData.classifications[classIndex].labels;
    classificationChart.data.datasets[0].data =
      mockDisasterData.classifications[classIndex].data;
    classificationChart.update();

    const barData = Object.values(mockDisasterData.events).map(
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    ); // Average
    barChart.data.datasets[0].data = barData;
    barChart.update();

    addLog("Charts updated with filters");
  }
  updateCharts(); // Initial

  function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
  }

  // Time Slider
  const timeSlider = document.getElementById("timeSlider");
  timeSlider.addEventListener("input", (e) => {
    const year = e.target.value;
    updateCharts(year);
    addLog(`Time slider set to ${year}`);
  });

  // Filters
  yearFilter.addEventListener("change", (e) =>
    updateCharts(e.target.value, document.getElementById("typeFilter").value)
  );
  document
    .getElementById("typeFilter")
    .addEventListener("change", (e) =>
      updateCharts(document.getElementById("yearFilter").value, e.target.value)
    );

  // Analyze Buttons
  document.getElementById("analyzeBtn").addEventListener("click", () => {
    if (drawnItems.getLayers().length === 0)
      return addLog("No area", "warning");
    const mockDetails = `Classification: ${JSON.stringify(mockDisasterData.classifications[0])}`;
    showModal(mockDetails);
    updateCharts();
    addLog("Analysis complete");
  });

  document.getElementById("ndviBtn").addEventListener("click", () => {
    if (drawnItems.getLayers().length === 0)
      return addLog("No area", "warning");
    const mockNdvi =
      mockDisasterData.ndviValues[
        Math.floor(Math.random() * mockDisasterData.ndviValues.length)
      ];
    addNdviOverlay();
    showModal(`Mock NDVI: ${mockNdvi.toFixed(2)} (Healthy if >0.5)`);
    addLog("NDVI computed");
  });

  // Modal
  const modal = document.getElementById("analysisModal");
  const closeBtn = document.querySelector(".close");
  function showModal(details) {
    document.getElementById("modalDetails").textContent = details;
    modal.style.display = "block";
  }
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Export
  function exportChart(chartId, filename) {
    html2canvas(document.getElementById(chartId).parentNode).then((canvas) => {
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL();
      link.click();
      addLog(`${filename} exported`);
    });
  }
  document
    .getElementById("exportTrend")
    .addEventListener("click", () => exportChart("trendChart", "trends.png"));
  document
    .getElementById("exportBar")
    .addEventListener("click", () =>
      exportChart("disasterBarChart", "disasters.png")
    );

  // -- interactive map + area analysis --
  let  drawnLayer;
  const mapEl = document.getElementById('map');
  // initialize Leaflet map (reuse if already present)
  const analysisMap = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(analysisMap);

  // FeatureGroup to store drawn items
  // Reuse the already declared drawnItems
  analysisMap.addLayer(drawnItems);

  // Add draw control
  drawControl = new L.Control.Draw({
    draw: { marker:false, polyline:false, circle:false, rectangle:{}, circlemarker:false, polygon:{allowIntersection:false, showArea:true} },
    edit: { featureGroup: drawnItems, remove:true }
  });

  // attach draw control only when requested
  document.getElementById('drawBtn').addEventListener('click', () => {
    if (!analysisMap.hasControl) {
      analysisMap.addControl(drawControl);
      analysisMap.hasControl = true;
    }
  });

  document.getElementById('clearSelection').addEventListener('click', () => {
    drawnItems.clearLayers();
    document.getElementById('resultsContent').innerHTML = '<div id="summary" class="result-block">No area selected.</div>';
    document.getElementById('fitToSelection').style.display = 'none';
  });

  analysisMap.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    const gj = layer.toGeoJSON();
    analyzeSelection(gj, layer);
  });

  analysisMap.on('draw:edited', function(e) {
    const layers = e.layers;
    layers.eachLayer(function(l){
      const gj = l.toGeoJSON();
      analyzeSelection(gj, l);
    });
  });

  async function analyzeSelection(geojson, layer) {
    // compute area (m²) and perimeter (m)
    const areaM2 = turf.area(geojson);
    // perimeter: convert polygon to line
    const line = turf.polygonToLine(geojson);
    const perimeterKm = turf.length(line, {units: 'kilometers'});
    const perimeterM = Math.round(perimeterKm * 1000);
    const areaRounded = Math.round(areaM2);

    // show basic summary
    const summaryHtml = `
      <div class="result-block">
        <h4>Selection Summary</h4>
        <p><strong>Area:</strong> ${areaRounded.toLocaleString()} m²</p>
        <p><strong>Perimeter:</strong> ${perimeterM.toLocaleString()} m</p>
      </div>
    `;
    document.getElementById('resultsContent').innerHTML = summaryHtml + '<div class="result-block">Loading landcover breakdown...</div>';
    document.getElementById('fitToSelection').style.display = '';
    // fit map to selection
    if (layer && layer.getBounds) analysisMap.fitBounds(layer.getBounds(), {padding:[20,20]});

    // Fetch landuse / natural / water features from Overpass within bbox
    try {
      const bbox = turf.bbox(geojson); // [minX, minY, maxX, maxY] => [west, south, east, north]
      const south = bbox[1], west = bbox[0], north = bbox[3], east = bbox[2];
      // Overpass QL: query landuse, natural, waterway
      const q = `
        [out:json][timeout:25];
        (
          way["landuse"](${south},${west},${north},${east});
          relation["landuse"](${south},${west},${north},${east});
          way["natural"](${south},${west},${north},${east});
          relation["natural"](${south},${west},${north},${east});
          way["water"](${south},${west},${north},${east});
          relation["water"](${south},${west},${north},${east});
        );
        out geom;
      `;
      const url = 'https://overpass-api.de/api/interpreter';
      const res = await fetch(url, { method:'POST', body: q });
      if (!res.ok) throw new Error('Overpass fetch failed: ' + res.status);
      const json = await res.json();
      // convert elements to GeoJSON polygons where possible
      const features = [];
      for (const el of json.elements) {
        if (!el.geometry) continue;
        const coords = el.geometry.map(pt => [pt.lon, pt.lat]);
        // create polygon if first and last not equal (attempt)
        let geom = null;
        if (el.type === 'way') {
          // If closed, treat as polygon
          if (coords.length >= 4 && coords[0][0] === coords[coords.length-1][0] && coords[0][1] === coords[coords.length-1][1]) {
            geom = turf.polygon([coords], { tags: el.tags || {}});
          } else {
            // try polygon by closing
            const closed = coords.concat([coords[0]]);
            geom = turf.polygon([closed], { tags: el.tags || {}});
          }
        } else if (el.type === 'relation') {
          // Build polygon from members not handled strictly; attempt using geometry as polygon
          geom = turf.polygon([coords], { tags: el.tags || {}});
        }
        if (geom) features.push(geom);
      }

      // compute intersections and aggregate areas by tag
      const breakdown = {};
      let totalIntersectArea = 0;
      for (const feat of features) {
        try {
          const inter = turf.intersect(geojson, feat);
          if (!inter) continue;
          const a = turf.area(inter);
          totalIntersectArea += a;
          const tag = (feat.properties.tags && (feat.properties.tags.landuse || feat.properties.tags.natural || feat.properties.tags.water)) || 'other';
          breakdown[tag] = (breakdown[tag] || 0) + a;
        } catch (err) {
          console.warn('intersection error', err);
        }
      }

      // water vs land heuristic
      const waterArea = (breakdown.water || 0) + (breakdown.river || 0) + (breakdown.lake || 0);
      const landArea = areaM2 - waterArea;

      // prepare breakdown HTML
      let breakdownHtml = '<div class="result-block"><h4>Landcover Breakdown (approx)</h4>';
      breakdownHtml += `<p><strong>Computed overlap area:</strong> ${Math.round(totalIntersectArea).toLocaleString()} m² of ${areaRounded.toLocaleString()} m²</p>`;
      breakdownHtml += '<ul>';
      for (const k of Object.keys(breakdown).sort((a,b)=>breakdown[b]-breakdown[a])) {
        const val = Math.round(breakdown[k]);
        const pct = Math.round((val / areaRounded) * 10000)/100;
        breakdownHtml += `<li><strong>${k}</strong>: ${val.toLocaleString()} m² (${pct}%)</li>`;
      }
      breakdownHtml += `</ul><p><strong>Estimated water area:</strong> ${Math.round(waterArea).toLocaleString()} m²</p>`;
      breakdownHtml += `</div>`;

      document.getElementById('resultsContent').innerHTML = summaryHtml + breakdownHtml;
      // show raw geojson toggle
      const raw = document.getElementById('rawGeojson');
      raw.style.display = 'block';
      raw.textContent = JSON.stringify(geojson, null, 2);
    } catch (err) {
      console.error(err);
      document.getElementById('resultsContent').innerHTML = summaryHtml + `<div class="result-block error">Failed to load landcover data: ${err.message}</div>`;
    }
  }

  // fit to selection button
  document.getElementById('fitToSelection').addEventListener('click', () => {
    const layers = drawnItems.getLayers();
    if (!layers.length) return;
    analysisMap.fitBounds(layers[0].getBounds(), {padding:[20,20]});
  });
});

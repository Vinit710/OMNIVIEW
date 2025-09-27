document.addEventListener("DOMContentLoaded", () => {
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
  const menuItems = document.querySelectorAll('.menu-item');
  const overviewSection = document.getElementById('overviewSection');
  const trendsSection = document.getElementById('trendsSection');
  const classificationSection = document.getElementById('classificationSection');
  const ndviSection = document.getElementById('ndviSection');
  const bigroadsSection = document.getElementById('bigroadsSection');
  // Sub-tab switching logic
  menuItems.forEach((item) => {
    item.addEventListener('click', function () {
      menuItems.forEach((el) => el.classList.remove('active'));
      this.classList.add('active');
      // Hide all sections
      overviewSection.style.display = 'none';
      trendsSection.style.display = 'none';
      classificationSection.style.display = 'none';
      ndviSection.style.display = 'none';
      bigroadsSection.style.display = 'none';
      // Show selected
      const section = this.getAttribute('data-section');
      if (section === 'overview') overviewSection.style.display = '';
      if (section === 'trends') trendsSection.style.display = '';
      if (section === 'classification') classificationSection.style.display = '';
      if (section === 'ndvi') ndviSection.style.display = '';
      if (section === 'bigroads') bigroadsSection.style.display = '';
    });
  });

  // --- Big Roads Extraction Feature ---
  const bigRoadsForm = document.getElementById('bigRoadsForm');
  const sentinelFile = document.getElementById('sentinelFile');
  const bigRoadsStatus = document.getElementById('bigRoadsStatus');
  const bigRoadsResults = document.getElementById('bigRoadsResults');
  const bigRoadsOrig = document.getElementById('bigRoadsOrig');
  const bigRoadsMask = document.getElementById('bigRoadsMask');
  const bigRoadsOverlay = document.getElementById('bigRoadsOverlay');
  const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
  let overlayMode = true;

  if (bigRoadsForm) {
    bigRoadsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      bigRoadsStatus.textContent = 'Uploading and processing... (this may take a while)';
      bigRoadsResults.style.display = 'none';
      const file = sentinelFile.files[0];
      if (!file) {
        bigRoadsStatus.textContent = 'Please select a Sentinel-2 TIFF file.';
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        const resp = await fetch('http://localhost:5000/api/extract_roads', {
          method: 'POST',
          body: formData
        });
        if (!resp.ok) throw new Error('Processing failed');
        const data = await resp.json();
        // data: { orig_url, mask_url, overlay_url }
        bigRoadsOrig.innerHTML = `<img src="${data.orig_url}" style="width:100%;height:100%;object-fit:contain;"/>`;
        bigRoadsMask.innerHTML = `<img src="${data.mask_url}" style="width:100%;height:100%;object-fit:contain;"/>`;
        bigRoadsOverlay.innerHTML = `<img id="overlayImg" src="${data.overlay_url}" style="width:100%;height:100%;object-fit:contain;"/>`;
        bigRoadsResults.style.display = '';
        bigRoadsStatus.textContent = 'Extraction complete!';
        overlayMode = true;
      } catch (err) {
        bigRoadsStatus.textContent = 'Error: ' + err.message;
      }
    });
    // Overlay toggle
    if (toggleOverlayBtn) {
      toggleOverlayBtn.addEventListener('click', () => {
        overlayMode = !overlayMode;
        const overlayImg = document.getElementById('overlayImg');
        if (!overlayImg) return;
        overlayImg.style.opacity = overlayMode ? '1' : '0.3';
        toggleOverlayBtn.textContent = overlayMode ? 'Toggle Overlay' : 'Show Overlay';
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
    years: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    events: {
      Flood: [5, 7, 4, 6, 8, 5, 9],
      Fire: [3, 4, 6, 5, 7, 8, 6],
      Earthquake: [2, 3, 1, 4, 2, 3, 5]
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
    ndviValues: [0.2, 0.4, 0.6, 0.3, 0.5, 0.7, 0.8] // Mock NDVI over time
  };

  // Populate Filters
  const yearFilter = document.getElementById('yearFilter');
  mockDisasterData.years.forEach(year => {
    const option = document.createElement('option');
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
    edit: { featureGroup: drawnItems }
  });
  map.addControl(drawControl);

  map.on("draw:created", (e) => {
    drawnItems.addLayer(e.layer);
    addLog("Area selected");
    map.on('click', (clickEvent) => {
      L.marker(clickEvent.latlng).addTo(map).bindPopup('Analysis Point');
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
      color: 'none',
      fillColor: getNdviColor(Math.random() * 0.8 + 0.2),
      fillOpacity: 0.5
    }).addTo(map);
    addLog("NDVI overlay added");
  }

  function getNdviColor(ndvi) {
    return ndvi > 0.5 ? '#4caf50' : ndvi > 0.3 ? '#ffeb3b' : '#f44336';
  }

  // Charts
  let trendChart, classificationChart, barChart;

  const trendCtx = document.getElementById('trendChart').getContext('2d');
  trendChart = new Chart(trendCtx, {
    type: 'line',
    data: { labels: mockDisasterData.years, datasets: [] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  const classCtx = document.getElementById('classificationChart').getContext('2d');
  classificationChart = new Chart(classCtx, {
    type: 'pie',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'] }] },
    options: { responsive: true }
  });

  const barCtx = document.getElementById('disasterBarChart').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: ['Flood', 'Fire', 'Earthquake'], datasets: [{ label: 'Events', data: [], backgroundColor: '#ff9800' }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  // Update Charts Function
  function updateCharts(year = '', type = '') {
    const index = mockDisasterData.years.indexOf(year);
    const datasets = Object.keys(mockDisasterData.events).map(key => ({
      label: key,
      data: mockDisasterData.events[key],
      borderColor: getRandomColor(),
      tension: 0.1
    })).filter(ds => !type || ds.label === type);
    trendChart.data.datasets = datasets;
    trendChart.update();

    const classIndex = Math.floor(Math.random() * mockDisasterData.classifications.length);
    classificationChart.data.labels = mockDisasterData.classifications[classIndex].labels;
    classificationChart.data.datasets[0].data = mockDisasterData.classifications[classIndex].data;
    classificationChart.update();

    const barData = Object.values(mockDisasterData.events).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length); // Average
    barChart.data.datasets[0].data = barData;
    barChart.update();

    addLog("Charts updated with filters");
  }
  updateCharts(); // Initial

  function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
  }

  // Time Slider
  const timeSlider = document.getElementById('timeSlider');
  timeSlider.addEventListener('input', (e) => {
    const year = e.target.value;
    updateCharts(year);
    addLog(`Time slider set to ${year}`);
  });

  // Filters
  yearFilter.addEventListener('change', (e) => updateCharts(e.target.value, document.getElementById('typeFilter').value));
  document.getElementById('typeFilter').addEventListener('change', (e) => updateCharts(document.getElementById('yearFilter').value, e.target.value));

  // Analyze Buttons
  document.getElementById('analyzeBtn').addEventListener('click', () => {
    if (drawnItems.getLayers().length === 0) return addLog("No area", "warning");
    const mockDetails = `Classification: ${JSON.stringify(mockDisasterData.classifications[0])}`;
    showModal(mockDetails);
    updateCharts();
    addLog("Analysis complete");
  });

  document.getElementById('ndviBtn').addEventListener('click', () => {
    if (drawnItems.getLayers().length === 0) return addLog("No area", "warning");
    const mockNdvi = mockDisasterData.ndviValues[Math.floor(Math.random() * mockDisasterData.ndviValues.length)];
    addNdviOverlay();
    showModal(`Mock NDVI: ${mockNdvi.toFixed(2)} (Healthy if >0.5)`);
    addLog("NDVI computed");
  });

  // Modal
  const modal = document.getElementById('analysisModal');
  const closeBtn = document.querySelector('.close');
  function showModal(details) {
    document.getElementById('modalDetails').textContent = details;
    modal.style.display = 'block';
  }
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  // Export
  function exportChart(chartId, filename) {
    html2canvas(document.getElementById(chartId).parentNode).then(canvas => {
      const link = document.createElement('a');
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
});
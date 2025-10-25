// Initialize speech synthesis
const speechSynth = window.speechSynthesis;

function speakText(text) {
  // Cancel any ongoing speech
  speechSynth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  speechSynth.speak(utterance);
}

function check_backend() {
  fetch("http://127.0.0.1:5000/api/status")
    .then((t) => t.json())
    .then((t) => {
      const status = t.status;
      document.getElementById("status").innerText = status;
      // Speak the status update
      speakText(status);
    })
    .catch((t) => {
      const errorMsg = "Backend not responding.";
      document.getElementById("status").innerText = errorMsg;
      speakText(errorMsg);
      console.error(t);
    });
}
document.addEventListener("DOMContentLoaded", function () {
  const t = document.getElementById("sidebarTitle"),
    e = document.getElementById("screenDropdown"),
    n = document.querySelector(".dropdown-arrow"),
    o = document.querySelectorAll(".dropdown-item"),
    s = document.querySelector(".sidebar-title-container");
  (s.addEventListener("click", function (t) {
    (t.preventDefault(),
      t.stopPropagation(),
      e.classList.toggle("show"),
      n.classList.toggle("rotated"));
  }),
    window.addEventListener("click", function (t) {
      s.contains(t.target) ||
        (e.classList.remove("show"), n.classList.remove("rotated"));
    }),
    e.addEventListener("click", function (t) {
      t.stopPropagation();
    }),
    o.forEach((s) => {
      s.addEventListener("click", function (s) {
        s.stopPropagation();
        const c = this.getAttribute("data-screen"),
          i = this.querySelector("span").textContent;
        (o.forEach((t) => t.classList.remove("active")),
          this.classList.add("active"),
          (t.textContent = i),
          e.classList.remove("show"),
          n.classList.remove("rotated"),
          (function (t) {
            switch (t) {
              case "monitoring":
                console.log("Switched to Monitoring");
                break;
              case "disaster":
                window.location.href = "../disaster/disaster.html";
                break;
              case "analytics":
                window.location.href = "../analysis/analysis.html";
                break;
            }
          })(c));
      });
    }));
});

// Search functionality
document
  .querySelector(".search-input")
  .addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      const query = this.value.trim();
      if (!query) {
        logger.warning("Please enter a location to search");
        return;
      }

      logger.info(`Searching for: ${query}`);

      try {
        // Using Nominatim API (OpenStreetMap's geocoding service)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const results = await response.json();

        if (!results || results.length === 0) {
          logger.warning(`No results found for: ${query}`);
          return;
        }

        // Clear previous search results
        if (window.searchResultsLayer) {
          map.removeLayer(window.searchResultsLayer);
        }
        window.searchResultsLayer = L.layerGroup().addTo(map);

        // Get the first result (best match)
        const firstResult = results[0];
        const lat = parseFloat(firstResult.lat);
        const lon = parseFloat(firstResult.lon);

        logger.success(`Found: ${firstResult.display_name}`);

        // Create a marker for the search result
        const searchMarker = L.marker([lat, lon], {
          icon: L.icon({
            iconUrl:
              "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
            shadowUrl:
              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        }).addTo(window.searchResultsLayer);

        // Fly to the location with animation
        map.flyTo([lat, lon], 13, {
          duration: 1.5,
          easeLinearity: 0.5,
        });

        // Clear the search input
        this.value = "";
      } catch (error) {
        logger.error(`Search failed: ${error.message}`);
      }
    }
  });

// Global function to navigate to a location (called from popup)
window.goToLocation = function (lat, lon, name) {
  logger.info(`Navigating to: ${name}`);
  map.flyTo([lat, lon], 15, {
    duration: 1,
    easeLinearity: 0.5,
  });
};

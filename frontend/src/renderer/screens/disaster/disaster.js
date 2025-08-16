const fs = require('fs');
const path = require('path');

let currentSection = "news";
let isSearching = false;

// DOM Elements
const menuItems = document.querySelectorAll(".menu-item");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const reportBtn = document.getElementById("reportBtn");
const refreshBtn = document.getElementById("refreshBtn");
const defaultContent = document.getElementById("defaultContent");
const newsResults = document.getElementById("newsResults");
const reportSection = document.getElementById("reportSection");
const sectionTitle = document.getElementById("sectionTitle");
const resultsContainer = document.getElementById("resultsContainer");
const reportContainer = document.getElementById("reportContainer");
const downloadReportBtn = document.getElementById("downloadReportBtn");
const logsContent = document.querySelector(".logs-content");

// Menu Item Interactions
menuItems.forEach((item) => {
  item.addEventListener("click", function () {
    menuItems.forEach((i) => i.classList.remove("active"));
    this.classList.add("active");

    currentSection = this.getAttribute("data-section");
    updateSectionTitle();

    if (!isSearching) {
      loadDefaultContent();
    }
  });
});

// Search functionality
searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    performSearch();
  }
});

// Generate Report functionality
reportBtn.addEventListener("click", generateReport);

// Refresh button
refreshBtn.addEventListener("click", function () {
  if (isSearching) {
    performSearch();
  } else {
    loadDefaultContent();
  }
});

function updateSectionTitle() {
  const titles = {
    news: "Latest News",
    "post-disaster": "Post Disaster Reports",
    "pre-disaster": "Pre Disaster Alerts",
  };
  sectionTitle.textContent = titles[currentSection] || "News Dashboard";
}

function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    addLog("error", "Please enter a search query.");
    return;
  }

  isSearching = true;
  showNewsResults();
  showLoading();

  fetch("http://localhost:5000/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query,
      section: currentSection,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      displayResults(data);
      addLog("info", `Fetched ${data.articles.length} articles for "${query}"`);
    })
    .catch((err) => {
      showError("Error fetching news. Please try again.");
      addLog("error", "Error fetching news: " + err.message);
      console.error("Search error:", err);
    });
}

function generateReport() {
  const query = searchInput.value.trim();
  if (!query) {
    addLog("error", "Please enter a search query to generate a report.");
    return;
  }

  showReportSection();
  reportContainer.innerHTML = '<div class="loading">Generating report...</div>';
  addLog("info", `Generating report for "${query}"`);

  fetch("http://localhost:5000/api/generate_report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        reportContainer.innerHTML = `<div class="error">${data.error}</div>`;
        addLog("error", `Report generation failed: ${data.error}`);
        return;
      }
      // Render Markdown manually
      const html = markdownToHtml(data.report);
      reportContainer.innerHTML = `<div class="report-content">${html}</div>`;
      addLog("info", "Report generated successfully");
    })
    .catch((err) => {
      reportContainer.innerHTML = `<div class="error">Error generating report. Please try again.</div>`;
      addLog("error", "Error generating report: " + err.message);
      console.error("Report error:", err);
    });
}

function loadDefaultContent() {
  isSearching = false;
  searchInput.value = "";
  defaultContent.style.display = "block";
  newsResults.style.display = "none";
  reportSection.style.display = "none";
}

function showNewsResults() {
  defaultContent.style.display = "none";
  newsResults.style.display = "block";
  reportSection.style.display = "none";
}

function showReportSection() {
  defaultContent.style.display = "none";
  newsResults.style.display = "none";
  reportSection.style.display = "block";
}

function showLoading() {
  resultsContainer.innerHTML =
    '<div class="loading">Loading news articles...</div>';
}

function showError(message) {
  resultsContainer.innerHTML = `<div class="error">${message}</div>`;
}

function displayResults(data) {
  if (!data.articles || data.articles.length === 0) {
    resultsContainer.innerHTML =
      '<div class="error">No articles found for your search query.</div>';
    return;
  }

  const articlesHTML = data.articles
    .map(
      (article) => `
          <div class="news-article">
            <h3>${escapeHtml(article.title || "Untitled")}</h3>
            <p>${escapeHtml(
              article.snippet || "No description available."
            )}</p>
            <a href="${escapeHtml(
              article.link || "#"
            )}" target="_blank" rel="noopener noreferrer">Read more →</a>
          </div>
        `
    )
    .join("");

  resultsContainer.innerHTML = articlesHTML;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

function addLog(type, message) {
  const logClass = type === "error" ? "log-error" : "log-warning";
  const logDiv = document.createElement("div");
  logDiv.className = logClass;
  logDiv.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  logsContent.prepend(logDiv);
  // Limit logs to prevent overflow
  while (logsContent.children.length > 10) {
    logsContent.removeChild(logsContent.lastChild);
  }
}

// Simple Markdown to HTML converter for report rendering
function markdownToHtml(markdown) {
  let html = markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(\n<li>.*)+/g, '<ul>$&</ul>')
    .replace(/\n/g, '<br>');
  return html;
}

// Download report
downloadReportBtn.addEventListener("click", function () {
  const query = searchInput.value.trim() || "disaster_report";
  const reportContent = reportContainer.querySelector(".report-content");
  if (!reportContent) {
    addLog("error", "No report available to download.");
    return;
  }
  const text = reportContent.innerText;
  const filename = `disaster_report_${query.replace(/\s+/g, '_')}.md`;
  const filePath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', filename);

  try {
    fs.writeFileSync(filePath, text);
    addLog("info", "Report downloaded successfully to Downloads folder");
  } catch (error) {
    addLog("error", `Download failed: ${error.message}`);
  }
});

// Screen switching functionality
document.addEventListener("DOMContentLoaded", function () {
  const sidebarTitle = document.getElementById("sidebarTitle");
  const screenDropdown = document.getElementById("screenDropdown");
  const dropdownArrow = document.querySelector(".dropdown-arrow");
  const dropdownItems = document.querySelectorAll(".dropdown-item");
  const titleContainer = document.querySelector(".sidebar-title-container");

  // Toggle dropdown
  titleContainer.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    screenDropdown.classList.toggle("show");
    dropdownArrow.classList.toggle("rotated");
  });

  // Close dropdown when clicking outside
  window.addEventListener("click", function (e) {
    if (!titleContainer.contains(e.target)) {
      screenDropdown.classList.remove("show");
      dropdownArrow.classList.remove("rotated");
    }
  });

  // Prevent dropdown from closing when clicking inside
  screenDropdown.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // Handle screen selection
  dropdownItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.stopPropagation();

      // Get selected screen
      const selectedScreen = this.getAttribute("data-screen");
      const screenName = this.querySelector("span").textContent;

      // Update active states
      dropdownItems.forEach((i) => i.classList.remove("active"));
      this.classList.add("active");

      // Update sidebar title
      sidebarTitle.textContent = screenName;

      // Close dropdown
      screenDropdown.classList.remove("show");
      dropdownArrow.classList.remove("rotated");

      // Switch screens
      switchToScreen(selectedScreen);
    });
  });

  function switchToScreen(screenType) {
    switch (screenType) {
      case "monitoring":
        window.location.href = "../monitoring/monitoring.html";
        break;
      case "disaster":
        // Already on disaster screen
        console.log("Already on Disaster Analysis screen");
        break;
      case "analytics":
        console.log("Analytics screen not implemented yet");
        break;
    }
  }
});

// Initialize
updateSectionTitle();
loadDefaultContent();

// Add event listener for expand button
document.querySelector(".expand-btn").addEventListener("click", function () {
  const panel = document.querySelector(".bottom-panel");
  if (panel.style.height === "300px") {
    panel.style.height = "120px";
    this.textContent = "Expand ▲";
  } else {
    panel.style.height = "300px";
    this.textContent = "Collapse ▼";
  }
});
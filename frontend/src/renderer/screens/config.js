const API_CONFIG = {
  BASE_URL: "http://localhost:5000",
  ENDPOINTS: {
    ROAD_DETECTION: "/api/road-detection",
    FLIGHTS: "/api/flights",
    BUILDINGS: "/api/buildings",
    WATER_BODIES: "/api/water-bodies",
    SHIPS: "/api/ships",
    EXTRACT_ROADS: "/api/extract_roads",
    NEWS: "/api/news",
    GENERATE_REPORT: "/api/generate_report",
    DISASTER_CSV: "/api/disaster-csv",
    ANALYZE_DISASTERS: "/api/analyze-disasters",
  },

  // Helper method to get full URL
  getUrl(endpoint) {
    return this.BASE_URL + this.ENDPOINTS[endpoint];
  },
};

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = API_CONFIG;
}

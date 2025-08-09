function check_backend() {
  fetch("http://127.0.0.1:5000/api/status")
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("status").innerText = data.status;
    })
    .catch((err) => {
      document.getElementById("status").innerText = "Backend not responding.";
      console.error(err);
    });
}

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
        // Already on monitoring screen
        console.log("Switched to Monitoring");
        break;
      case "disaster":
        // Navigate to news dashboard
        window.location.href = "../disaster/disaster.html";
        break;
      case "analytics":
        // Navigate to analytics (you can create this later)
        console.log("Analytics screen not implemented yet");
        break;
    }
  }
});

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

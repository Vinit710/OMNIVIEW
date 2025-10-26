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
// Building Change Detection Class
class BuildingChangeDetection {
  constructor() {
    this.preImage = null;
    this.postImage = null;
    this.isProcessing = false;
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Upload area clicks
    document.getElementById('preImageUpload').addEventListener('click', () => {
      document.getElementById('preImageInput').click();
    });
    
    document.getElementById('postImageUpload').addEventListener('click', () => {
      document.getElementById('postImageInput').click();
    });

    // File input changes
    document.getElementById('preImageInput').addEventListener('change', (e) => {
      this.handleImageUpload(e, 'pre');
    });
    
    document.getElementById('postImageInput').addEventListener('change', (e) => {
      this.handleImageUpload(e, 'post');
    });

    // Drag and drop
    this.setupDragAndDrop('preImageUpload', 'pre');
    this.setupDragAndDrop('postImageUpload', 'post');

    // Control buttons
    document.getElementById('runAnalysisBtn').addEventListener('click', () => {
      this.runChangeDetection();
    });
    
    document.getElementById('resetAnalysisBtn').addEventListener('click', () => {
      this.resetAnalysis();
    });
    
    document.getElementById('closeBuildingPanel').addEventListener('click', () => {
      this.closeBuildingPanel();
    });
  }

  setupDragAndDrop(uploadAreaId, imageType) {
    const uploadArea = document.getElementById(uploadAreaId);
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processImageFile(files[0], imageType);
      }
    });
  }

  handleImageUpload(event, imageType) {
    const file = event.target.files[0];
    if (file) {
      this.processImageFile(file, imageType);
    }
  }

  processImageFile(file, imageType) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      
      if (imageType === 'pre') {
        this.preImage = base64Data;
        this.updateImagePreview('preImagePreview', 'preImageUpload', base64Data);
        logger.info('Pre-disaster image uploaded successfully');
        speakText('Pre-disaster image uploaded');
      } else {
        this.postImage = base64Data;
        this.updateImagePreview('postImagePreview', 'postImageUpload', base64Data);
        logger.info('Post-disaster image uploaded successfully');
        speakText('Post-disaster image uploaded');
      }
      
      this.updateAnalysisButton();
    };
    
    reader.readAsDataURL(file);
  }

  updateImagePreview(previewId, uploadAreaId, imageSrc) {
    const preview = document.getElementById(previewId);
    const uploadArea = document.getElementById(uploadAreaId);
    
    preview.src = imageSrc;
    preview.style.display = 'block';
    
    // Hide upload placeholder
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    if (placeholder) {
      placeholder.style.display = 'none';
    }
  }

  updateAnalysisButton() {
    const btn = document.getElementById('runAnalysisBtn');
    if (this.preImage && this.postImage && !this.isProcessing) {
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }
  }

  async runChangeDetection() {
    if (!this.preImage || !this.postImage) {
      alert('Please upload both pre and post disaster images');
      return;
    }

    this.isProcessing = true;
    this.updateAnalysisButton();
    
    // Show loading state
    const btn = document.getElementById('runAnalysisBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    
    logger.info('Starting building change detection analysis...');
    speakText('Starting building change detection analysis');

    try {
      const response = await fetch('http://localhost:5000/api/building-change-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pre_image: this.preImage,
          post_image: this.postImage
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.displayResults(data.result);
        logger.success(`Change detection completed: ${data.result.change_percentage}% change detected`);
        speakText(`Analysis complete. ${data.result.change_percentage} percent building change detected`);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Change detection error:', error);
      logger.error(`Analysis failed: ${error.message}`);
      speakText('Analysis failed. Please check your images and try again');
      alert(`Analysis failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.updateAnalysisButton();
      
      // Reset button state
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
    }
  }

  displayResults(result) {
    // Update statistics
    document.getElementById('changePercentage').textContent = `${result.change_percentage}%`;
    document.getElementById('changedPixels').textContent = result.changed_pixels.toLocaleString();
    document.getElementById('totalPixels').textContent = result.total_pixels.toLocaleString();

    // Update result images
    if (result.mask_image) {
      document.getElementById('maskImage').src = result.mask_image;
    }
    if (result.comparison_image) {
      document.getElementById('comparisonImage').src = result.comparison_image;
    }
    if (result.overlay_image) {
      document.getElementById('overlayImage').src = result.overlay_image;
    }

    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
  }

  resetAnalysis() {
    // Clear images
    this.preImage = null;
    this.postImage = null;
    
    // Reset previews
    ['preImagePreview', 'postImagePreview'].forEach(id => {
      const img = document.getElementById(id);
      img.style.display = 'none';
      img.src = '';
    });
    
    // Show placeholders
    ['preImageUpload', 'postImageUpload'].forEach(id => {
      const placeholder = document.getElementById(id).querySelector('.upload-placeholder');
      if (placeholder) {
        placeholder.style.display = 'block';
      }
    });
    
    // Reset file inputs
    document.getElementById('preImageInput').value = '';
    document.getElementById('postImageInput').value = '';
    
    // Hide results
    document.getElementById('resultsSection').style.display = 'none';
    
    // Update button state
    this.updateAnalysisButton();
    
    logger.info('Analysis reset');
    speakText('Analysis reset');
  }

  closeBuildingPanel() {
    document.getElementById('buildingPanel').style.display = 'none';
    logger.info('Building analysis panel closed');
  }

  showBuildingPanel() {
    document.getElementById('buildingPanel').style.display = 'block';
    logger.info('Building analysis panel opened');
    speakText('Building change detection panel opened');
  }
}

// Global building change detection instance
let buildingChangeDetection;

document.addEventListener("DOMContentLoaded", function () {
  // Initialize building change detection
  buildingChangeDetection = new BuildingChangeDetection();

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

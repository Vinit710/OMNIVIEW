class Logger {
    constructor() {
        this.logs = [];
        this.logContainer = document.querySelector(".logs-content");
        this.maxLogs = 50; // Keep only last 50 logs
        this.speechEnabled = true;
        this.speechSynth = window.speechSynthesis;
        this.setupControls();
    }

    setupControls() {
        const panelHeader = document.querySelector(".panel-header");
        
        // Text-to-speech toggle button
        const ttsBtn = document.createElement("button");
        ttsBtn.textContent = "🔊 Voice";
        ttsBtn.className = "expand-btn";
        ttsBtn.style.marginRight = "8px";
        ttsBtn.setAttribute('data-enabled', 'true');
        ttsBtn.onclick = () => {
            const isEnabled = ttsBtn.getAttribute('data-enabled') === 'true';
            ttsBtn.setAttribute('data-enabled', (!isEnabled).toString());
            ttsBtn.textContent = isEnabled ? "🔇 Voice" : "🔊 Voice";
            this.toggleSpeech();
            this.info(`Text-to-speech ${isEnabled ? 'disabled' : 'enabled'}`);
        };
        
        // Clear logs button
        const clearLogsBtn = document.createElement("button");
        clearLogsBtn.textContent = "Clear";
        clearLogsBtn.className = "expand-btn";
        clearLogsBtn.style.marginRight = "8px";
        clearLogsBtn.onclick = () => {
            this.clear();
            this.info("Logs cleared");
        };
        
        panelHeader.insertBefore(ttsBtn, panelHeader.querySelector(".expand-btn"));
        panelHeader.insertBefore(clearLogsBtn, panelHeader.querySelector(".expand-btn"));
    }

    speak(text) {
        if (!this.speechEnabled) return;
        
        // Cancel any ongoing speech
        this.speechSynth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        this.speechSynth.speak(utterance);
    }

    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        if (!this.speechEnabled) {
            this.speechSynth.cancel(); // Stop any ongoing speech
        }
    }

    log(message, type = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type,
        };

        this.logs.unshift(logEntry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.updateDisplay();
        this.speak(message); // Speak new log messages
    }

    info(message) {
        this.log(message, "info");
    }

    warning(message) {
        this.log(message, "warning");
    }

    error(message) {
        this.log(message, "error");
    }

    success(message) {
        this.log(message, "success");
    }

    clear() {
        this.logs = [];
        this.updateDisplay();
    }

    updateDisplay() {
        this.logContainer.innerHTML = "";

        if (this.logs.length === 0) {
            this.logContainer.innerHTML = '<div class="log-info">No logs available</div>';
            return;
        }

        this.logs.forEach((log) => {
            const logDiv = document.createElement("div");
            logDiv.className = `log-${log.type}`;
            logDiv.innerHTML = `<span class="log-timestamp">[${log.timestamp}]</span> ${log.message}`;
            this.logContainer.appendChild(logDiv);
        });
    }
}
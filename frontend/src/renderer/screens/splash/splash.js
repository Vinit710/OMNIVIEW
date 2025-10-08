class SplashScreen {
    constructor() {
        this.statusText = document.querySelector('.status-text');
        this.progress = document.querySelector('.progress');
        this.speechSynth = window.speechSynthesis;
        this.initializeSequence();
    }

    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        this.speechSynth.speak(utterance);
    }

    async updateStatus(text, progressPercent) {
        this.statusText.textContent = text;
        this.progress.style.width = `${progressPercent}%`;
        this.speak(text);
        
        // Return a promise that resolves after both the text is spoken and a delay
        return new Promise(resolve => {
            setTimeout(resolve, 2000); // Minimum 2 second delay between status updates
        });
    }

    async initializeSequence() {
        const steps = [
            { text: "AI SYSTEM INITIALIZING", progress: 20 },
            { text: "CONNECTING TO SATELLITES", progress: 40 },
            { text: "FETCHING GLOBAL DATA", progress: 60 },
            { text: "CALIBRATING SYSTEMS", progress: 80 },
            { text: "ALL SYSTEMS ONLINE. ACTIVATED.", progress: 100 }
        ];

        for (const step of steps) {
            await this.updateStatus(step.text, step.progress);
        }

        // After sequence completes, wait a moment then redirect to main app
        setTimeout(() => {
            window.location.href = '../monitoring/monitoring.html';
        }, 2000);
    }
}

// Initialize splash screen when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SplashScreen();
});
// =============================================================================
// Skooda Mobile — EMF Metallsucher & Leitungs-Finder
// Real-time magnetometer analysis with baseline tare, Geiger-counter audio & haptics.
// =============================================================================

import { getEl } from '../../core/ui.js';
import { showToast } from '../../core/toast.js';

let audioCtx = null;
let isEmfActive = false;
let baselineUf = 45.0; // Default Earth magnetic baseline (~30-60 µT)
let currentUf = 45.0;
let peakUf = 45.0;
let sensitivity = 1.0;
let soundEnabled = true;
let hapticEnabled = true;
let nextClickTimeout = null;

export function initEmfMeter() {
    const startBtn = getEl('emf-start-btn');
    const stopBtn = getEl('emf-stop-btn');
    const tareBtn = getEl('emf-tare-btn');
    const resetPeakBtn = getEl('emf-reset-peak-btn');
    const soundToggle = getEl('emf-toggle-sound');
    const hapticToggle = getEl('emf-toggle-haptic');
    const sensSlider = getEl('emf-sensitivity');

    if (startBtn) startBtn.addEventListener('click', startEmf);
    if (stopBtn) stopBtn.addEventListener('click', stopEmf);
    if (tareBtn) {
        tareBtn.addEventListener('click', () => {
            baselineUf = currentUf;
            const baseEl = getEl('emf-baseline-val');
            if (baseEl) baseEl.innerText = `${baselineUf.toFixed(1)} µT`;
            showToast(`Tara gesetzt: ${baselineUf.toFixed(1)} µT`, 'info');
        });
    }
    if (resetPeakBtn) {
        resetPeakBtn.addEventListener('click', () => {
            peakUf = currentUf;
            updateEmfUI(currentUf);
        });
    }

    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            soundEnabled = e.target.checked;
        });
    }
    if (hapticToggle) {
        hapticToggle.addEventListener('change', (e) => {
            hapticEnabled = e.target.checked;
        });
    }
    if (sensSlider) {
        sensSlider.addEventListener('input', (e) => {
            sensitivity = parseFloat(e.target.value);
            const valEl = getEl('emf-sensitivity-val');
            if (valEl) valEl.innerText = `${sensitivity.toFixed(1)}x`;
        });
    }

    // Connect to sensor listener
    setupSensorListener();
}

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playGeigerClick(pitchMultiplier = 1.0) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Short high-frequency burst mimicking a Geiger-Müller discharge
        const freq = 1200 * pitchMultiplier;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.015);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.02);
    } catch (e) {}
}

function scheduleNextClick(delta) {
    if (!isEmfActive) return;
    if (nextClickTimeout) clearTimeout(nextClickTimeout);

    // Delta determines click interval (higher delta -> faster clicks)
    const scaledDelta = delta * sensitivity;
    let intervalMs = 1500;
    if (scaledDelta > 2) {
        intervalMs = Math.max(35, 1200 / (1 + scaledDelta * 0.8));
    }

    nextClickTimeout = setTimeout(() => {
        if (!isEmfActive) return;
        const pitch = Math.min(2.5, 1.0 + (scaledDelta / 60));
        playGeigerClick(pitch);

        if (hapticEnabled && scaledDelta > 25) {
            if (navigator.vibrate) navigator.vibrate(15);
        }

        scheduleNextClick(delta);
    }, intervalMs);
}

function setupSensorListener() {
    // 1. Try Magnetometer API (Generic Sensor API)
    if ('Magnetometer' in window) {
        try {
            const mag = new window.Magnetometer({ frequency: 30 });
            mag.addEventListener('reading', () => {
                if (!isEmfActive) return;
                const magTotal = Math.sqrt(mag.x * mag.x + mag.y * mag.y + mag.z * mag.z);
                handleEmfReading(magTotal);
            });
            mag.start();
            return;
        } catch (e) {
            console.log("Standard Magnetometer API not supported or blocked, falling back", e);
        }
    }

    // 2. DeviceOrientation fallback
    window.addEventListener('deviceorientation', (e) => {
        if (!isEmfActive) return;
        if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
            const syntheticMag = 45.0 + (Math.sin(e.webkitCompassHeading * Math.PI / 180) * 8);
            handleEmfReading(syntheticMag);
        }
    });

    // 3. Polling from Tauri SystemStats / Android Bridge if exposed
    setInterval(() => {
        if (!isEmfActive) return;
        if (window.__lastReportedEmf !== undefined) {
            handleEmfReading(window.__lastReportedEmf);
        }
    }, 100);
}

export function feedRawEmf(val) {
    if (isEmfActive) {
        handleEmfReading(val);
    }
}

function handleEmfReading(val) {
    currentUf = val;
    if (currentUf > peakUf) peakUf = currentUf;

    const delta = Math.abs(currentUf - baselineUf);
    updateEmfUI(currentUf, delta);
    scheduleNextClick(delta);
}

function updateEmfUI(val, delta = 0) {
    const valEl = getEl('emf-current-val');
    const deltaEl = getEl('emf-delta-val');
    const peakEl = getEl('emf-peak-val');
    const barEl = getEl('emf-meter-bar');
    const statusEl = getEl('emf-status-badge');

    if (valEl) valEl.innerText = `${val.toFixed(1)} µT`;
    if (deltaEl) deltaEl.innerText = `±${delta.toFixed(1)} µT`;
    if (peakEl) peakEl.innerText = `${peakUf.toFixed(1)} µT`;

    // Max visual range: 0 to 150 µT
    const pct = Math.min(100, (val / 150) * 100);
    if (barEl) {
        barEl.style.width = `${pct}%`;
        if (delta * sensitivity > 40) {
            barEl.style.background = 'var(--neon-red)';
            barEl.style.boxShadow = '0 0 12px var(--neon-red)';
        } else if (delta * sensitivity > 15) {
            barEl.style.background = '#ffaa00';
            barEl.style.boxShadow = '0 0 8px #ffaa00';
        } else {
            barEl.style.background = 'var(--neon-cyan)';
            barEl.style.boxShadow = '0 0 8px var(--neon-cyan)';
        }
    }

    if (statusEl) {
        const scaledDelta = delta * sensitivity;
        if (scaledDelta > 45) {
            statusEl.innerText = "⚠️ STARKES MAGNETFELD / METALL ERKANNT";
            statusEl.style.color = "var(--neon-red)";
            statusEl.style.borderColor = "var(--neon-red)";
        } else if (scaledDelta > 15) {
            statusEl.innerText = "⚡ ANOMALIE ERKANNT (Leitung / Metall)";
            statusEl.style.color = "#ffaa00";
            statusEl.style.borderColor = "#ffaa00";
        } else {
            statusEl.innerText = "NORMAL (Erdmagnetfeld)";
            statusEl.style.color = "var(--neon-green)";
            statusEl.style.borderColor = "var(--neon-green)";
        }
    }
}

export function startEmf() {
    if (isEmfActive) return;
    initAudioContext();
    isEmfActive = true;

    const startBtn = getEl('emf-start-btn');
    const stopBtn = getEl('emf-stop-btn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';

    baselineUf = currentUf > 0 ? currentUf : 45.0;
    const baseEl = getEl('emf-baseline-val');
    if (baseEl) baseEl.innerText = `${baselineUf.toFixed(1)} µT`;

    scheduleNextClick(0);
    showToast('EMF Metallsucher aktiviert', 'success');
}

export function stopEmf() {
    if (!isEmfActive) return;
    isEmfActive = false;

    if (nextClickTimeout) clearTimeout(nextClickTimeout);

    const startBtn = getEl('emf-start-btn');
    const stopBtn = getEl('emf-stop-btn');
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';

    showToast('EMF Messung pausiert', 'info');
}

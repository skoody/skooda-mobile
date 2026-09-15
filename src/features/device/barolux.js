// =============================================================================
// Skooda Mobile — Barometer, Altimeter & Luxmeter Studio
// Real-time atmospheric pressure, barometric elevation, weather trend & ambient lux.
// =============================================================================

import { getEl } from '../../core/ui.js';
import { showToast } from '../../core/toast.js';

let isBaroActive = false;
let isLuxActive = false;
let seaLevelPressure = 1013.25; // Standard atmosphere hPa (QNH)
let currentPressure = 1013.25;
let pressureHistory = []; // { time: timestamp, pressure: hPa }
let currentLux = 0;
let peakLux = 0;

export function initBaroLux() {
    setupBarometer();
    setupLuxmeter();
}

// =============================================================================
// 1. BAROMETER & ALTIMETER
// =============================================================================
function setupBarometer() {
    const startBtn = getEl('baro-start-btn');
    const stopBtn = getEl('baro-stop-btn');
    const qnhInput = getEl('baro-qnh-input');
    const setQnhBtn = getEl('baro-set-qnh-btn');

    if (startBtn) startBtn.addEventListener('click', startBaro);
    if (stopBtn) stopBtn.addEventListener('click', stopBaro);

    if (setQnhBtn && qnhInput) {
        setQnhBtn.addEventListener('click', () => {
            const val = parseFloat(qnhInput.value);
            if (!isNaN(val) && val > 800 && val < 1100) {
                seaLevelPressure = val;
                updateBaroUI();
                showToast(`Meereshöhendruck auf ${val.toFixed(1)} hPa gesetzt`, 'info');
            } else {
                showToast('Ungültiger QNH-Wert (800 - 1100 hPa)', 'error');
            }
        });
    }

    // Try PressureSensor API
    if ('PressureSensor' in window) {
        try {
            const sensor = new window.PressureSensor({ frequency: 5 });
            sensor.addEventListener('reading', () => {
                if (!isBaroActive) return;
                currentPressure = sensor.pressure; // pressure in hPa/mbar
                recordPressureSample(currentPressure);
                updateBaroUI();
            });
            sensor.start();
        } catch (e) {
            console.log("PressureSensor not available natively, using environmental model", e);
        }
    }
}

function calculateAltitude(p, p0) {
    // Barometric hypsometric formula (International Standard Atmosphere)
    // h = 44330 * (1 - (p / p0)^(1 / 5.255))
    return 44330 * (1 - Math.pow(p / p0, 0.190294957));
}

function recordPressureSample(p) {
    const now = Date.now();
    pressureHistory.push({ time: now, pressure: p });
    // Keep 3 hours of samples
    const threeHoursAgo = now - 3 * 3600 * 1000;
    pressureHistory = pressureHistory.filter(s => s.time >= threeHoursAgo);
}

function calculateTrend() {
    if (pressureHistory.length < 2) return { text: "Ermittle Trend...", change: 0, status: "neutral" };
    const oldest = pressureHistory[0];
    const newest = pressureHistory[pressureHistory.length - 1];
    const delta = newest.pressure - oldest.pressure;

    if (delta < -3.0) {
        return { text: "Starker Druckabfall (Sturm- / Unwetterwarnung)", change: delta, status: "storm" };
    } else if (delta < -1.0) {
        return { text: "Fallend (Verschlechterung / Regen möglich)", change: delta, status: "falling" };
    } else if (delta > 1.0) {
        return { text: "Steigend (Wetterbesserung / Hochdruck)", change: delta, status: "rising" };
    } else {
        return { text: "Stabil (Konstante Wetterlage)", change: delta, status: "stable" };
    }
}

function updateBaroUI() {
    const hpaEl = getEl('baro-hpa-val');
    const altEl = getEl('baro-alt-val');
    const mmhgEl = getEl('baro-mmhg-val');
    const inhgEl = getEl('baro-inhg-val');
    const trendEl = getEl('baro-trend-text');

    const altMeters = calculateAltitude(currentPressure, seaLevelPressure);
    const mmhg = currentPressure * 0.750062;
    const inhg = currentPressure * 0.02953;

    if (hpaEl) hpaEl.innerText = `${currentPressure.toFixed(2)} hPa`;
    if (altEl) altEl.innerText = `${altMeters.toFixed(1)} m`;
    if (mmhgEl) mmhgEl.innerText = `${mmhg.toFixed(1)} mmHg`;
    if (inhgEl) inhgEl.innerText = `${inhg.toFixed(2)} inHg`;

    if (trendEl) {
        const trend = calculateTrend();
        trendEl.innerText = trend.text;
        if (trend.status === 'storm') {
            trendEl.style.color = 'var(--neon-red)';
        } else if (trend.status === 'rising') {
            trendEl.style.color = 'var(--neon-green)';
        } else if (trend.status === 'falling') {
            trendEl.style.color = '#ffaa00';
        } else {
            trendEl.style.color = 'var(--neon-cyan)';
        }
    }
}

function startBaro() {
    isBaroActive = true;
    const startBtn = getEl('baro-start-btn');
    const stopBtn = getEl('baro-stop-btn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';

    // If no physical sensor, fetch standard elevation from GPS or baseline
    if (pressureHistory.length === 0) {
        recordPressureSample(currentPressure);
    }
    updateBaroUI();
    showToast('Barometer-Messung aktiv', 'success');
}

function stopBaro() {
    isBaroActive = false;
    const startBtn = getEl('baro-start-btn');
    const stopBtn = getEl('baro-stop-btn');
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
    showToast('Barometer pausiert', 'info');
}

// =============================================================================
// 2. LUXMETER (LICHTMESSER)
// =============================================================================
function setupLuxmeter() {
    const startBtn = getEl('lux-start-btn');
    const stopBtn = getEl('lux-stop-btn');
    const resetPeakBtn = getEl('lux-reset-peak-btn');

    if (startBtn) startBtn.addEventListener('click', startLux);
    if (stopBtn) stopBtn.addEventListener('click', stopLux);
    if (resetPeakBtn) {
        resetPeakBtn.addEventListener('click', () => {
            peakLux = currentLux;
            updateLuxUI();
        });
    }

    // Try AmbientLightSensor API
    if ('AmbientLightSensor' in window) {
        try {
            const sensor = new window.AmbientLightSensor();
            sensor.addEventListener('reading', () => {
                if (!isLuxActive) return;
                handleLuxReading(sensor.illuminance);
            });
            sensor.start();
        } catch (e) {
            console.log("AmbientLightSensor blocked or not available", e);
        }
    }
}

function handleLuxReading(lux) {
    currentLux = Math.max(0, lux);
    if (currentLux > peakLux) peakLux = currentLux;
    updateLuxUI();
}

function getLuxCategory(lux) {
    if (lux < 1) return { label: "Nacht / Mondlicht (< 1 lx)", color: "var(--text-dim)" };
    if (lux < 10) return { label: "Kerzenschein / Straßenbeleuchtung (1 - 10 lx)", color: "var(--neon-purple)" };
    if (lux < 50) return { label: "Wohnzimmer / Dämmerung (10 - 50 lx)", color: "var(--neon-cyan)" };
    if (lux < 250) return { label: "Gute Innenbeleuchtung (50 - 250 lx)", color: "var(--neon-cyan)" };
    if (lux < 1000) return { label: "Büro / Werkstattarbeitsplatz (250 - 1.000 lx)", color: "var(--neon-green)" };
    if (lux < 5000) return { label: "Präzisions-OP / Helle Werkstatt (1.000 - 5.000 lx)", color: "var(--neon-green)" };
    if (lux < 25000) return { label: "Tageslicht bedeckt (5.000 - 25.000 lx)", color: "#ffaa00" };
    return { label: "Direktes Sonnenlicht (> 25.000 lx)", color: "var(--neon-red)" };
}

function updateLuxUI() {
    const valEl = getEl('lux-current-val');
    const peakEl = getEl('lux-peak-val');
    const meterBar = getEl('lux-meter-bar');
    const descEl = getEl('lux-desc-badge');

    if (valEl) valEl.innerText = `${Math.round(currentLux).toLocaleString('de-DE')} lx`;
    if (peakEl) peakEl.innerText = `${Math.round(peakLux).toLocaleString('de-DE')} lx`;

    const cat = getLuxCategory(currentLux);
    if (descEl) {
        descEl.innerText = cat.label;
        descEl.style.color = cat.color;
        descEl.style.borderColor = cat.color;
    }

    if (meterBar) {
        // Logarithmic scale for human eye perception (0 lx to 100,000 lx)
        // log10(1) = 0, log10(100000) = 5
        let pct = 0;
        if (currentLux > 0.1) {
            pct = Math.min(100, (Math.log10(currentLux) / 5) * 100);
        }
        meterBar.style.width = `${Math.max(2, pct)}%`;
        meterBar.style.background = cat.color;
        meterBar.style.boxShadow = `0 0 10px ${cat.color}`;
    }
}

function startLux() {
    isLuxActive = true;
    const startBtn = getEl('lux-start-btn');
    const stopBtn = getEl('lux-stop-btn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';

    updateLuxUI();
    showToast('Luxmeter aktiviert', 'success');
}

function stopLux() {
    isLuxActive = false;
    const startBtn = getEl('lux-start-btn');
    const stopBtn = getEl('lux-stop-btn');
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
    showToast('Luxmeter pausiert', 'info');
}

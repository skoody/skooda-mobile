// =============================================================================
// Skooda Mobile — Audio SPL Schallpegel-Messer & FFT Visualizer
// Real-time microphone acoustic analysis with dB(A) estimation and spectrum.
// =============================================================================

import { getEl } from '../../core/ui.js';
import { showToast } from '../../core/toast.js';

let audioCtx = null;
let analyser = null;
let micStream = null;
let isAudioRunning = false;
let animFrameId = null;

let peakDb = 0;
let minDb = 120;
let maxDb = 0;
let currentDb = 0;
let lastPeakTime = 0;

export function initAudioMeter() {
    const startBtn = getEl('audio-start-btn');
    const stopBtn = getEl('audio-stop-btn');
    const resetBtn = getEl('audio-reset-btn');

    if (startBtn) {
        startBtn.addEventListener('click', startAudioMeter);
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', stopAudioMeter);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            peakDb = currentDb;
            minDb = currentDb > 0 ? currentDb : 120;
            maxDb = currentDb;
            updateStatsUI();
            showToast('Schallpegel-Statistiken zurückgesetzt', 'info');
        });
    }
}

export async function startAudioMeter() {
    if (isAudioRunning) return;

    try {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);

        isAudioRunning = true;

        const startBtn = getEl('audio-start-btn');
        const stopBtn = getEl('audio-stop-btn');
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';

        renderAudioLoop();
        showToast('Schallpegel-Messung aktiv', 'success');
    } catch (err) {
        console.error('Audio meter failed to start:', err);
        showToast('Mikrofon-Zugriff fehlgeschlagen: ' + err.message, 'error');
    }
}

export function stopAudioMeter() {
    if (!isAudioRunning) return;

    isAudioRunning = false;
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }

    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }

    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close();
        audioCtx = null;
    }

    const startBtn = getEl('audio-start-btn');
    const stopBtn = getEl('audio-stop-btn');
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';

    showToast('Schallpegel-Messung gestoppt', 'info');
}

function renderAudioLoop() {
    if (!isAudioRunning || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(bufferLength);

    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    // Calculate RMS from time domain data
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sum += val * val;
    }
    const rms = Math.sqrt(sum / timeData.length);

    // Convert RMS to estimated dB SPL (calibrated typical mobile baseline)
    const baseDb = rms > 0.0001 ? 20 * Math.log10(rms) + 94 : 30;
    const measuredDb = Math.min(130, Math.max(30, Math.round(baseDb * 10) / 10));

    currentDb = currentDb * 0.6 + measuredDb * 0.4;
    const now = performance.now();

    if (currentDb > maxDb) maxDb = currentDb;
    if (currentDb < minDb && currentDb > 25) minDb = currentDb;

    if (currentDb > peakDb || (now - lastPeakTime > 2500)) {
        peakDb = currentDb;
        lastPeakTime = now;
    }

    updateStatsUI();
    drawSpectrumCanvas(freqData);

    animFrameId = requestAnimationFrame(renderAudioLoop);
}

function updateStatsUI() {
    const curEl = getEl('spl-cur-val');
    const minEl = getEl('spl-min-val');
    const maxEl = getEl('spl-max-val');
    const peakEl = getEl('spl-peak-val');
    const progEl = getEl('spl-bar-progress');
    const labelEl = getEl('spl-env-label');

    const displayDb = Math.round(currentDb * 10) / 10;

    if (curEl) curEl.innerText = `${displayDb.toFixed(1)} dB(A)`;
    if (minEl) minEl.innerText = `${minDb.toFixed(1)} dB`;
    if (maxEl) maxEl.innerText = `${maxDb.toFixed(1)} dB`;
    if (peakEl) peakEl.innerText = `${peakDb.toFixed(1)} dB`;

    if (progEl) {
        const pct = Math.min(100, Math.max(0, ((displayDb - 30) / 90) * 100));
        progEl.style.width = `${pct}%`;
        if (displayDb < 55) progEl.style.background = 'var(--neon-green)';
        else if (displayDb < 80) progEl.style.background = 'var(--neon-cyan)';
        else if (displayDb < 95) progEl.style.background = '#ff9500';
        else progEl.style.background = 'var(--neon-red)';
    }

    if (labelEl) {
        let env = 'Ruhiges Zimmer / Flüstern';
        if (displayDb >= 40 && displayDb < 60) env = 'Normale Unterhaltung / Büro';
        else if (displayDb >= 60 && displayDb < 75) env = 'Straßenverkehr / Restaurant';
        else if (displayDb >= 75 && displayDb < 85) env = 'Lauter Verkehr / Rasenmäher';
        else if (displayDb >= 85 && displayDb < 100) env = '⚠️ Gehörschutz empfohlen (Industrielärm)';
        else if (displayDb >= 100) env = '🚨 GEHÖRSCHADEN-RISIKO (Konzert / Sirene)';
        labelEl.innerText = env;
    }
}

function drawSpectrumCanvas(freqData) {
    const canvas = getEl('audio-spectrum-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const barCount = freqData.length;
    const barWidth = (width / barCount) * 0.85;
    const gap = (width / barCount) * 0.15;

    for (let i = 0; i < barCount; i++) {
        const val = freqData[i];
        const barHeight = (val / 255) * (height - 6);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#00f2ff');
        grad.addColorStop(0.6, '#b000ff');
        grad.addColorStop(1, '#ff0055');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);
    }
}

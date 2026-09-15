/**
 * SKOODA MOBILE - Akustik- & Signalverarbeitungs-Suite (Audio-Labor)
 * 100% Non-Root Browser & Web Audio API Implementierung
 */

import { showToast } from '../../core/toast.js';

let audioCtx = null;
let micStream = null;
let micSource = null;
let micAnalyser = null;
let isMicActive = false;
let animationFrameId = null;

// SPL Meter State
let splMode = 'A'; // 'A' oder 'C'
let splMin = 999;
let splMax = 0;
let splPeak = 0;
let splSamples = [];
const MAX_LEQ_SAMPLES = 600; // ~30 Sekunden bei 20Hz Sampling

// FFT & Waterfall State
let waterfallCanvas = null;
let waterfallCtx = null;
let spectrumCanvas = null;
let spectrumCtx = null;

// Generator State
let activeOsc = null;
let activeGain = null;
let noiseNode = null;
let isGenerating = false;
let sweepInterval = null;

// Morse State
let isPlayingMorse = false;
let morseStopFlag = false;

// ITU-T Q.23 DTMF Frequenzen
const DTMF_FREQS = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], 'A': [697, 1633],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], 'B': [770, 1633],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], 'C': [852, 1633],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477], 'D': [941, 1633],
};

const MORSE_CODE = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.', '0': '-----', ' ': '/'
};

export function initAudioLab() {
  initSubnav();
  initSplControls();
  initSpectrumDisplays();
  initGeneratorControls();
  initDtmfMorseControls();
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function initSubnav() {
  const container = document.getElementById('audiolab-toolset');
  if (!container) return;

  const buttons = container.querySelectorAll('.audiolab-subnav-btn');
  const panels = container.querySelectorAll('.audiolab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.style.display = 'block';
        targetPanel.classList.add('active');
      }
    });
  });
}

// -----------------------------------------------------------------------------
// 1. SCHALLPEGELMESSER (SPL dB-Meter)
// -----------------------------------------------------------------------------
function initSplControls() {
  const startBtn = document.getElementById('audio-spl-start-btn');
  const resetBtn = document.getElementById('audio-spl-reset-btn');
  const modeA = document.getElementById('audio-spl-mode-a');
  const modeC = document.getElementById('audio-spl-mode-c');

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (isMicActive) {
        stopMicrophone();
        startBtn.textContent = 'Mikrofon Starten 🎙️';
        startBtn.classList.remove('btn-danger');
        startBtn.classList.add('btn-primary');
      } else {
        const ok = await startMicrophone();
        if (ok) {
          startBtn.textContent = 'Messung Stoppen ⏹️';
          startBtn.classList.remove('btn-primary');
          startBtn.classList.add('btn-danger');
        }
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      splMin = 999;
      splMax = 0;
      splPeak = 0;
      splSamples = [];
      updateSplDisplay(0, 0, 0, 0);
      showToast('SPL-Messwerte zurückgesetzt', 'info');
    });
  }

  if (modeA && modeC) {
    modeA.addEventListener('click', () => {
      splMode = 'A';
      modeA.classList.add('active');
      modeC.classList.remove('active');
      const unitEl = document.getElementById('audio-spl-unit');
      if (unitEl) unitEl.textContent = 'dB(A)';
    });
    modeC.addEventListener('click', () => {
      splMode = 'C';
      modeC.classList.add('active');
      modeA.classList.remove('active');
      const unitEl = document.getElementById('audio-spl-unit');
      if (unitEl) unitEl.textContent = 'dB(C)';
    });
  }
}

async function startMicrophone() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false
    });

    micSource = ctx.createMediaStreamSource(micStream);
    micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 2048;
    micAnalyser.smoothingTimeConstant = 0.6;
    micSource.connect(micAnalyser);

    isMicActive = true;
    startAudioLoop();
    showToast('Mikrofon-Echtzeitanalyse aktiv', 'success');
    return true;
  } catch (err) {
    console.error('AudioLab Mic Error:', err);
    showToast(`Mikrofonzugriff verweigert: ${err.message}`, 'error');
    return false;
  }
}

function stopMicrophone() {
  isMicActive = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }
}

function startAudioLoop() {
  if (!micAnalyser) return;

  const timeData = new Float32Array(micAnalyser.fftSize);
  const freqData = new Float32Array(micAnalyser.frequencyBinCount);
  const sampleRate = audioCtx.sampleRate;

  function render() {
    if (!isMicActive) return;

    micAnalyser.getFloatTimeDomainData(timeData);
    micAnalyser.getFloatFrequencyData(freqData);

    // 1. Calculate SPL in dB(A) / dB(C)
    calculateSpl(timeData, freqData, sampleRate);

    // 2. Render FFT Spectrum & Waterfall
    drawSpectrum(freqData, sampleRate);
    drawWaterfall(freqData);

    // 3. Peak Pitch Detection
    detectFundamentalPitch(freqData, sampleRate);

    animationFrameId = requestAnimationFrame(render);
  }

  render();
}

/**
 * IEC 61672-1 A- und C-Frequenzbewertungen
 */
function aWeighting(f) {
  if (f < 10) return -70;
  const f2 = f * f;
  const num = 12194 * 12194 * f2 * f2;
  const den = (f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12194 * 12194);
  const ra = num / den;
  return 20 * Math.log10(ra) + 2.0;
}

function cWeighting(f) {
  if (f < 10) return -70;
  const f2 = f * f;
  const num = 12194 * 12194 * f2;
  const den = (f2 + 20.6 * 20.6) * (f2 + 12194 * 12194);
  const rc = num / den;
  return 20 * Math.log10(rc) + 0.06;
}

function calculateSpl(timeData, freqData, sampleRate) {
  // RMS in Time Domain
  let sumSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    sumSquares += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sumSquares / timeData.length);

  // Basis-dBFS umrechnen auf ca. SPL (Referenz-Kalibrierung: 0 dBFS ≈ 100 dB SPL)
  let rawDb = rms > 0.000001 ? 20 * Math.log10(rms) + 100 : 25;

  // Frequenzgewichtungs-Korrektur über das gemessene Spektrum
  let weightedEnergy = 0;
  let totalEnergy = 0;
  const binCount = freqData.length;
  const binWidth = sampleRate / (binCount * 2);

  for (let i = 1; i < binCount; i++) {
    const f = i * binWidth;
    const p = Math.pow(10, freqData[i] / 10);
    totalEnergy += p;
    const w = splMode === 'A' ? aWeighting(f) : cWeighting(f);
    weightedEnergy += p * Math.pow(10, w / 10);
  }

  const weightingDelta = totalEnergy > 0 ? 10 * Math.log10(weightedEnergy / totalEnergy) : 0;
  let currentSpl = Math.max(20, Math.min(130, rawDb + weightingDelta));

  // Smoothing
  currentSpl = Math.round(currentSpl * 10) / 10;

  // Min / Max / Peak
  if (currentSpl < splMin && currentSpl > 20) splMin = currentSpl;
  if (currentSpl > splMax) splMax = currentSpl;
  if (currentSpl > splPeak) splPeak = currentSpl;
  else splPeak = Math.max(currentSpl, splPeak - 0.2); // Soft decay

  // Leq (Equivalent Continuous Sound Level)
  splSamples.push(currentSpl);
  if (splSamples.length > MAX_LEQ_SAMPLES) splSamples.shift();

  let leqSum = 0;
  for (let s of splSamples) {
    leqSum += Math.pow(10, s / 10);
  }
  const leq = Math.round((10 * Math.log10(leqSum / splSamples.length)) * 10) / 10;

  updateSplDisplay(currentSpl, splPeak, splMin === 999 ? currentSpl : splMin, splMax, leq);
}

function updateSplDisplay(val, peak, min, max, leq) {
  const valEl = document.getElementById('audio-spl-current-val');
  const barEl = document.getElementById('audio-spl-meter-bar');
  const peakEl = document.getElementById('audio-spl-peak');
  const minEl = document.getElementById('audio-spl-min');
  const maxEl = document.getElementById('audio-spl-max');
  const leqEl = document.getElementById('audio-spl-leq');
  const descEl = document.getElementById('audio-spl-desc');

  if (valEl) valEl.textContent = val.toFixed(1);
  if (peakEl) peakEl.textContent = `${peak.toFixed(1)} dB`;
  if (minEl) minEl.textContent = `${min.toFixed(1)} dB`;
  if (maxEl) maxEl.textContent = `${max.toFixed(1)} dB`;
  if (leqEl) leqEl.textContent = `${leq.toFixed(1)} dB`;

  if (barEl) {
    const pct = Math.min(100, Math.max(0, ((val - 20) / 100) * 100));
    barEl.style.width = `${pct}%`;
    if (val < 60) {
      barEl.style.background = 'var(--neon-green)';
      barEl.style.boxShadow = '0 0 10px var(--neon-green)';
    } else if (val < 80) {
      barEl.style.background = '#ffaa00';
      barEl.style.boxShadow = '0 0 10px #ffaa00';
    } else {
      barEl.style.background = 'var(--neon-red)';
      barEl.style.boxShadow = '0 0 12px var(--neon-red)';
    }
  }

  if (descEl) {
    if (val < 35) descEl.textContent = 'Sehr leise (Flüstern, ruhiges Zimmer)';
    else if (val < 50) descEl.textContent = 'Leise (Wohnung, ruhige Bibliothek)';
    else if (val < 65) descEl.textContent = 'Normal (Gespräch, Büroumgebung)';
    else if (val < 75) descEl.textContent = 'Laut (Straßenverkehr, Staubsauger)';
    else if (val < 85) descEl.textContent = 'Sehr laut (Schwerverkehr, Baustelle)';
    else descEl.textContent = '⚠️ GEHÖRSCHÄDIGEND (Ab 85 dB Gehörschutz erforderlich)';
  }
}

// -----------------------------------------------------------------------------
// 2. FFT SPEKTRUMANALYSATOR & WASSERFALL
// -----------------------------------------------------------------------------
function initSpectrumDisplays() {
  spectrumCanvas = document.getElementById('audio-spectrum-canvas');
  if (spectrumCanvas) spectrumCtx = spectrumCanvas.getContext('2d');

  waterfallCanvas = document.getElementById('audio-waterfall-canvas');
  if (waterfallCanvas) waterfallCtx = waterfallCanvas.getContext('2d');
}

function drawSpectrum(freqData, sampleRate) {
  if (!spectrumCtx || !spectrumCanvas) return;

  const w = spectrumCanvas.width;
  const h = spectrumCanvas.height;
  spectrumCtx.fillStyle = '#070a14';
  spectrumCtx.fillRect(0, 0, w, h);

  // Rasterlinien
  spectrumCtx.strokeStyle = 'rgba(255, 0, 60, 0.15)';
  spectrumCtx.lineWidth = 1;
  for (let y = 0; y < h; y += h / 4) {
    spectrumCtx.beginPath();
    spectrumCtx.moveTo(0, y);
    spectrumCtx.lineTo(w, y);
    spectrumCtx.stroke();
  }

  // Frequenzkurve
  spectrumCtx.beginPath();
  spectrumCtx.strokeStyle = '#ff003c';
  spectrumCtx.lineWidth = 2;

  const totalBins = freqData.length;
  // Logarithmische Darstellung von 20 Hz bis 20 kHz
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);

  for (let x = 0; x < w; x++) {
    const logFrac = x / w;
    const freq = Math.pow(10, minLog + logFrac * (maxLog - minLog));
    const bin = Math.min(totalBins - 1, Math.max(0, Math.round((freq / (sampleRate / 2)) * totalBins)));

    const db = freqData[bin];
    const norm = Math.max(0, Math.min(1, (db + 100) / 100));
    const y = h - norm * h;

    if (x === 0) spectrumCtx.moveTo(x, y);
    else spectrumCtx.lineTo(x, y);
  }
  spectrumCtx.stroke();

  // Frequenzbeschriftung
  spectrumCtx.fillStyle = 'rgba(255, 200, 210, 0.7)';
  spectrumCtx.font = '9px monospace';
  const markers = [50, 100, 500, 1000, 5000, 10000];
  markers.forEach(m => {
    const x = ((Math.log10(m) - minLog) / (maxLog - minLog)) * w;
    if (x >= 0 && x <= w) {
      spectrumCtx.fillText(`${m >= 1000 ? (m / 1000) + 'k' : m}`, x - 8, h - 4);
    }
  });
}

function drawWaterfall(freqData) {
  if (!waterfallCtx || !waterfallCanvas) return;

  const w = waterfallCanvas.width;
  const h = waterfallCanvas.height;

  // Verschiebe bestehenden Inhalt um 1 Pixel nach unten
  const prevImage = waterfallCtx.getImageData(0, 0, w, h - 1);
  waterfallCtx.putImageData(prevImage, 0, 1);

  // Zeichne die neue oberste Zeile
  const rowData = waterfallCtx.createImageData(w, 1);
  const totalBins = freqData.length;
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);

  for (let x = 0; x < w; x++) {
    const logFrac = x / w;
    const freq = Math.pow(10, minLog + logFrac * (maxLog - minLog));
    const bin = Math.min(totalBins - 1, Math.max(0, Math.round((freq / 24000) * totalBins)));

    const db = freqData[bin];
    const norm = Math.max(0, Math.min(1, (db + 95) / 95));

    const color = getHeatmapColor(norm);
    const idx = x * 4;
    rowData.data[idx] = color.r;
    rowData.data[idx + 1] = color.g;
    rowData.data[idx + 2] = color.b;
    rowData.data[idx + 3] = 255;
  }

  waterfallCtx.putImageData(rowData, 0, 0);
}

function getHeatmapColor(val) {
  // Crimson Blood / Yandere Noir Farbverlauf:
  // 0.0 -> Dunkles Obsidian / Blutwein -> Karminrot -> Scharlach-Neon -> Perlenweiß
  if (val < 0.25) {
    const t = val / 0.25;
    return { r: Math.round(t * 80), g: 0, b: Math.round(t * 15) };
  } else if (val < 0.5) {
    const t = (val - 0.25) / 0.25;
    return { r: Math.round(80 + t * 90), g: Math.round(t * 10), b: Math.round(15 + t * 20) };
  } else if (val < 0.75) {
    const t = (val - 0.5) / 0.25;
    return { r: Math.round(170 + t * 85), g: Math.round(10 + t * 20), b: Math.round(35 + t * 25) };
  } else if (val < 0.9) {
    const t = (val - 0.75) / 0.15;
    return { r: 255, g: Math.round(30 + t * 70), b: Math.round(60 + t * 50) };
  } else {
    const t = (val - 0.9) / 0.1;
    return { r: 255, g: Math.round(100 + t * 155), b: Math.round(110 + t * 145) };
  }
}

function detectFundamentalPitch(freqData, sampleRate) {
  let maxVal = -120;
  let maxBin = 0;

  for (let i = 2; i < freqData.length; i++) {
    if (freqData[i] > maxVal) {
      maxVal = freqData[i];
      maxBin = i;
    }
  }

  const pitchEl = document.getElementById('audio-peak-pitch-val');
  const noteEl = document.getElementById('audio-peak-note-val');
  if (!pitchEl) return;

  if (maxVal > -55) {
    // Parabolische Interpolation für Sub-Bin-Präzision
    const alpha = freqData[maxBin - 1] || maxVal;
    const beta = maxVal;
    const gamma = freqData[maxBin + 1] || maxVal;
    const delta = (0.5 * (alpha - gamma)) / (alpha - 2 * beta + gamma);
    const exactBin = maxBin + (isNaN(delta) ? 0 : delta);
    const freq = exactBin * (sampleRate / (freqData.length * 2));

    pitchEl.textContent = `${freq.toFixed(1)} Hz`;

    // Note ermitteln
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const noteName = noteNames[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;

    let remark = '';
    if (Math.abs(freq - 50) < 2) remark = ' (Netzbrummen EU 50Hz)';
    else if (Math.abs(freq - 60) < 2) remark = ' (Netzbrummen US 60Hz)';
    else if (Math.abs(freq - 440) < 3) remark = ' (Kammerton A4)';

    if (noteEl) noteEl.textContent = `${noteName}${octave}${remark}`;
  } else {
    pitchEl.textContent = '--- Hz';
    if (noteEl) noteEl.textContent = 'Kein klares Signal';
  }
}

// -----------------------------------------------------------------------------
// 3. SIGNAL- & FUNKTIONSGENERATOR
// -----------------------------------------------------------------------------
function initGeneratorControls() {
  const freqSlider = document.getElementById('gen-freq-slider');
  const freqInput = document.getElementById('gen-freq-input');
  const volSlider = document.getElementById('gen-vol-slider');
  const startBtn = document.getElementById('gen-start-btn');
  const sweepBtn = document.getElementById('gen-sweep-btn');
  const whiteNoiseBtn = document.getElementById('gen-white-noise-btn');
  const pinkNoiseBtn = document.getElementById('gen-pink-noise-btn');

  if (freqSlider && freqInput) {
    freqSlider.addEventListener('input', () => {
      freqInput.value = freqSlider.value;
      if (activeOsc && audioCtx) activeOsc.frequency.setValueAtTime(parseFloat(freqSlider.value), audioCtx.currentTime);
    });
    freqInput.addEventListener('change', () => {
      freqSlider.value = freqInput.value;
      if (activeOsc && audioCtx) activeOsc.frequency.setValueAtTime(parseFloat(freqInput.value), audioCtx.currentTime);
    });
  }

  if (volSlider) {
    volSlider.addEventListener('input', () => {
      if (activeGain && audioCtx) activeGain.gain.setValueAtTime(parseFloat(volSlider.value) / 100, audioCtx.currentTime);
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (isGenerating) {
        stopGenerator();
        startBtn.textContent = 'Signal Starten 🔊';
        startBtn.classList.remove('btn-danger');
        startBtn.classList.add('btn-primary');
      } else {
        const type = document.getElementById('gen-wave-type').value;
        const freq = parseFloat(freqInput.value) || 440;
        const vol = parseFloat(volSlider.value) / 100;
        startTone(type, freq, vol);
        startBtn.textContent = 'Signal Stoppen ⏹️';
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-danger');
      }
    });
  }

  if (sweepBtn) {
    sweepBtn.addEventListener('click', () => {
      if (isGenerating) {
        stopGenerator();
        sweepBtn.textContent = 'Sweep Starten (20Hz - 20kHz)';
      } else {
        startSweep();
        sweepBtn.textContent = 'Sweep Stoppen ⏹️';
      }
    });
  }

  if (whiteNoiseBtn) {
    whiteNoiseBtn.addEventListener('click', () => {
      if (isGenerating) stopGenerator();
      else startNoise('white');
    });
  }

  if (pinkNoiseBtn) {
    pinkNoiseBtn.addEventListener('click', () => {
      if (isGenerating) stopGenerator();
      else startNoise('pink');
    });
  }
}

function startTone(type, freq, volume) {
  stopGenerator();
  const ctx = getAudioContext();

  activeOsc = ctx.createOscillator();
  activeGain = ctx.createGain();

  activeOsc.type = type;
  activeOsc.frequency.setValueAtTime(freq, ctx.currentTime);

  activeGain.gain.setValueAtTime(0.001, ctx.currentTime);
  activeGain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), ctx.currentTime + 0.05);

  activeOsc.connect(activeGain);
  activeGain.connect(ctx.destination);
  activeOsc.start();
  isGenerating = true;
  showToast(`Signal aktiv: ${freq} Hz (${type})`, 'info');
}

function startSweep() {
  stopGenerator();
  const ctx = getAudioContext();

  activeOsc = ctx.createOscillator();
  activeGain = ctx.createGain();

  activeOsc.type = 'sine';
  activeGain.gain.setValueAtTime(0.3, ctx.currentTime);

  activeOsc.connect(activeGain);
  activeGain.connect(ctx.destination);
  activeOsc.start();
  isGenerating = true;

  const duration = 10; // 10 Sekunden Sweep
  activeOsc.frequency.setValueAtTime(20, ctx.currentTime);
  activeOsc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + duration);

  showToast('Frequenz-Sweep gestartet: 20 Hz bis 20 kHz', 'info');

  sweepInterval = setTimeout(() => {
    stopGenerator();
    const btn = document.getElementById('gen-sweep-btn');
    if (btn) btn.textContent = 'Sweep Starten (20Hz - 20kHz)';
    showToast('Sweep abgeschlossen', 'success');
  }, duration * 1000);
}

function startNoise(type) {
  stopGenerator();
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * 4; // 4 Sekunden Loop
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else {
    // Paul Kellet's Pink Noise Filter (1/f)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;
  noiseNode.loop = true;

  activeGain = ctx.createGain();
  activeGain.gain.setValueAtTime(0.2, ctx.currentTime);

  noiseNode.connect(activeGain);
  activeGain.connect(ctx.destination);
  noiseNode.start();
  isGenerating = true;

  showToast(`${type === 'pink' ? 'Rosa Rauschen (1/f)' : 'Weißes Rauschen'} aktiv`, 'info');
}

function stopGenerator() {
  if (sweepInterval) {
    clearTimeout(sweepInterval);
    sweepInterval = null;
  }
  if (activeOsc) {
    try { activeOsc.stop(); activeOsc.disconnect(); } catch (e) { }
    activeOsc = null;
  }
  if (noiseNode) {
    try { noiseNode.stop(); noiseNode.disconnect(); } catch (e) { }
    noiseNode = null;
  }
  if (activeGain) {
    try { activeGain.disconnect(); } catch (e) { }
    activeGain = null;
  }
  isGenerating = false;
}

// -----------------------------------------------------------------------------
// 4. DTMF- & MORSE-STUDIO
// -----------------------------------------------------------------------------
function initDtmfMorseControls() {
  // DTMF Keypad
  const keypadBtns = document.querySelectorAll('.dtmf-key');
  keypadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const char = btn.getAttribute('data-key');
      playDtmfTone(char);
      const display = document.getElementById('dtmf-history-display');
      if (display) display.value += char;
    });
  });

  const clearDtmfBtn = document.getElementById('dtmf-clear-btn');
  if (clearDtmfBtn) {
    clearDtmfBtn.addEventListener('click', () => {
      const display = document.getElementById('dtmf-history-display');
      if (display) display.value = '';
    });
  }

  // Morse Controls
  const morseInput = document.getElementById('morse-text-input');
  const morseOutput = document.getElementById('morse-code-output');
  const playMorseBtn = document.getElementById('morse-play-btn');
  const stopMorseBtn = document.getElementById('morse-stop-btn');

  if (morseInput && morseOutput) {
    morseInput.addEventListener('input', () => {
      const text = morseInput.value.toUpperCase();
      let encoded = '';
      for (let ch of text) {
        if (MORSE_CODE[ch]) encoded += MORSE_CODE[ch] + ' ';
        else encoded += '? ';
      }
      morseOutput.textContent = encoded.trim();
    });
  }

  if (playMorseBtn) {
    playMorseBtn.addEventListener('click', async () => {
      if (isPlayingMorse) return;
      const code = morseOutput.textContent.trim();
      if (!code) {
        showToast('Kein Text zum Morsen vorhanden', 'warn');
        return;
      }
      const wpm = parseInt(document.getElementById('morse-wpm-select')?.value || '15', 10);
      morseStopFlag = false;
      isPlayingMorse = true;
      playMorseBtn.disabled = true;
      if (stopMorseBtn) stopMorseBtn.disabled = false;

      await playMorseSequence(code, wpm);

      isPlayingMorse = false;
      playMorseBtn.disabled = false;
      if (stopMorseBtn) stopMorseBtn.disabled = true;
    });
  }

  if (stopMorseBtn) {
    stopMorseBtn.addEventListener('click', () => {
      morseStopFlag = true;
      showToast('Morse-Wiedergabe gestoppt', 'info');
    });
  }
}

function playDtmfTone(char) {
  const freqs = DTMF_FREQS[char.toUpperCase()];
  if (!freqs) return;

  const ctx = getAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.frequency.setValueAtTime(freqs[0], ctx.currentTime);
  osc2.frequency.setValueAtTime(freqs[1], ctx.currentTime);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.2);
}

async function playMorseSequence(morseStr, wpm) {
  const ctx = getAudioContext();
  const dotTime = 1200 / wpm; // ms
  const dashTime = dotTime * 3;
  const symbolGap = dotTime;
  const charGap = dotTime * 3;
  const wordGap = dotTime * 7;

  const torchEnabled = document.getElementById('morse-torch-toggle')?.checked && window.Android && window.Android.toggleTorch;

  for (let ch of morseStr) {
    if (morseStopFlag) break;

    if (ch === '.') {
      await beep(ctx, 750, dotTime, torchEnabled);
      await sleep(symbolGap);
    } else if (ch === '-') {
      await beep(ctx, 750, dashTime, torchEnabled);
      await sleep(symbolGap);
    } else if (ch === ' ') {
      await sleep(charGap - symbolGap);
    } else if (ch === '/') {
      await sleep(wordGap - charGap);
    }
  }
}

function beep(ctx, freq, durationMs, useTorch) {
  return new Promise(resolve => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (useTorch) {
      try { window.Android.toggleTorch(true); } catch (e) { }
    }

    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) { }

      if (useTorch) {
        try { window.Android.toggleTorch(false); } catch (e) { }
      }
      resolve();
    }, durationMs);
  });
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * SKOODA MOBILE - Taktische HF-, Antennen- & Funk-Suite (RF-Engineering)
 * Präzise Hochfrequenzberechnungen für Funkamateure, LoRa, PMR446 & Antennentechnik
 */

import { showToast } from '../../core/toast.js';

const SPEED_OF_LIGHT = 299792458; // m/s

// Koaxialkabel-Dämpfungskoeffizienten: attenuation = k1 * sqrt(f) + k2 * f (dB/100m, f in MHz)
const COAX_CABLES = {
  'rg58': { name: 'RG-58 C/U (50 Ω)', k1: 1.45, k2: 0.015, vFactor: 0.66 },
  'rg213': { name: 'RG-213 /U (50 Ω)', k1: 0.65, k2: 0.007, vFactor: 0.66 },
  'rg174': { name: 'RG-174 (50 Ω Mini)', k1: 2.85, k2: 0.030, vFactor: 0.66 },
  'rg316': { name: 'RG-316 Teflon (50 Ω)', k1: 2.70, k2: 0.028, vFactor: 0.69 },
  'lmr195': { name: 'LMR-195 (50 Ω Low-Loss)', k1: 1.10, k2: 0.011, vFactor: 0.80 },
  'lmr400': { name: 'LMR-400 (50 Ω Low-Loss)', k1: 0.41, k2: 0.004, vFactor: 0.85 },
  'aircell7': { name: 'Aircell 7 (50 Ω Hochflexibel)', k1: 0.58, k2: 0.006, vFactor: 0.83 },
  'ecoflex10': { name: 'Ecoflex 10 (50 Ω High-End)', k1: 0.38, k2: 0.0035, vFactor: 0.86 },
  'rg59': { name: 'RG-59 B/U (75 Ω Video/CATV)', k1: 1.15, k2: 0.012, vFactor: 0.66 }
};

export function initRf() {
  initRfSuite();
}

export function initRfSuite() {
  initSubnav();
  initAntennaCalc();
  initCableLinkCalc();
  initSwrCalc();
  initPowerLevelCalc();
}

function initSubnav() {
  const container = document.getElementById('rf-toolset');
  if (!container) return;

  const buttons = container.querySelectorAll('.rf-subnav-btn');
  const panels = container.querySelectorAll('.rf-panel');

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
// 1. ANTENNENLÄNGEN-RECHNER
// -----------------------------------------------------------------------------
function initAntennaCalc() {
  const freqInput = document.getElementById('ant-freq-input');
  const presetSelect = document.getElementById('ant-preset-select');
  const kFactorInput = document.getElementById('ant-kfactor-input');
  const typeSelect = document.getElementById('ant-type-select');

  if (!freqInput) return;

  const update = () => calculateAntenna();

  freqInput.addEventListener('input', update);
  if (kFactorInput) kFactorInput.addEventListener('input', update);
  if (typeSelect) typeSelect.addEventListener('change', update);

  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const val = parseFloat(presetSelect.value);
      if (!isNaN(val) && val > 0) {
        freqInput.value = val;
        update();
      }
    });
  }

  update();
}

function calculateAntenna() {
  const freq = parseFloat(document.getElementById('ant-freq-input')?.value) || 145.0; // MHz
  const k = parseFloat(document.getElementById('ant-kfactor-input')?.value) || 0.95;
  const type = document.getElementById('ant-type-select')?.value || 'dipole';

  if (freq <= 0) return;

  const wavelength = SPEED_OF_LIGHT / (freq * 1000000); // m

  const lambdaEl = document.getElementById('ant-res-lambda');
  const primaryEl = document.getElementById('ant-res-primary');
  const detailEl = document.getElementById('ant-res-details');
  const diagramEl = document.getElementById('ant-res-diagram');

  if (lambdaEl) lambdaEl.textContent = `${wavelength.toFixed(3)} m (${(wavelength * 100).toFixed(1)} cm)`;

  if (type === 'dipole') {
    // λ/2 Dipol
    const totalLenM = (wavelength / 2) * k;
    const legLenCm = (totalLenM / 2) * 100;

    if (primaryEl) primaryEl.textContent = `Gesamtlänge: ${(totalLenM * 100).toFixed(1)} cm`;
    if (detailEl) {
      detailEl.innerHTML = `
        <div class="info-item"><span class="info-label">Schenkellänge (je Seite):</span><span class="info-val font-mono">${legLenCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Speiseimpedanz (Freiraum):</span><span class="info-val font-mono">ca. 73 Ω</span></div>
        <div class="info-item"><span class="info-label">Gewinn:</span><span class="info-val font-mono">2.15 dBi (0 dBd)</span></div>
        <div class="info-item"><span class="info-label">Anpassung:</span><span class="info-val font-mono">Direktspeisung 50Ω Koax mit 1:1 Balun / Choke</span></div>
      `;
    }
    if (diagramEl) {
      diagramEl.innerHTML = `
        <div style="font-family: monospace; font-size: 0.75rem; color: var(--neon-cyan); text-align: center; white-space: pre;">
|&lt;--- ${legLenCm.toFixed(1)} cm ---&gt;|   |&lt;--- ${legLenCm.toFixed(1)} cm ---&gt;|
=====================---[SPEISUNG]---=====================
                                | |
                             Koax 50Ω
        </div>`;
    }
  } else if (type === 'groundplane') {
    // λ/4 Groundplane
    const radiatorCm = (wavelength / 4) * k * 100;
    const radialCm = (wavelength / 4) * 1.05 * 100;

    if (primaryEl) primaryEl.textContent = `Strahler (Vertikal): ${radiatorCm.toFixed(1)} cm`;
    if (detailEl) {
      detailEl.innerHTML = `
        <div class="info-item"><span class="info-label">Strahler (λ/4 vertikal):</span><span class="info-val font-mono">${radiatorCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">4x Radiale (45° Neigung):</span><span class="info-val font-mono">${radialCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Speiseimpedanz:</span><span class="info-val font-mono">ca. 50 Ω (durch 45° Radiale)</span></div>
        <div class="info-item"><span class="info-label">Abstrahlcharakteristik:</span><span class="info-val font-mono">Rundumstrahler (Omni, flacher Erdwinkel)</span></div>
      `;
    }
    if (diagramEl) {
      diagramEl.innerHTML = `
        <div style="font-family: monospace; font-size: 0.75rem; color: var(--neon-cyan); text-align: center; white-space: pre;">
                |  Strahler: ${radiatorCm.toFixed(1)} cm
                |
                |
             ---o---  [50Ω Buchse]
            /   |   \\
 45° Rad.: /    |    \\  je ${radialCm.toFixed(1)} cm
        </div>`;
    }
  } else if (type === 'jpole') {
    // J-Pole
    const longLenCm = (wavelength * 0.75) * k * 100;
    const stubLenCm = (wavelength * 0.25) * k * 100;
    const feedDistCm = (wavelength * 0.022) * 100;
    const spacingCm = (wavelength * 0.02) * 100;

    if (primaryEl) primaryEl.textContent = `Langer Schenkel: ${longLenCm.toFixed(1)} cm`;
    if (detailEl) {
      detailEl.innerHTML = `
        <div class="info-item"><span class="info-label">Langer Strahler (3/4 λ):</span><span class="info-val font-mono">${longLenCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Kurzer Anpass-Stub (1/4 λ):</span><span class="info-val font-mono">${stubLenCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Einspeisepunkt (Höhe ab Basis):</span><span class="info-val font-mono">ca. ${feedDistCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Element-Abstand:</span><span class="info-val font-mono">ca. ${spacingCm.toFixed(1)} cm</span></div>
      `;
    }
    if (diagramEl) {
      diagramEl.innerHTML = `
        <div style="font-family: monospace; font-size: 0.75rem; color: var(--neon-cyan); text-align: center; white-space: pre;">
 |  (${longLenCm.toFixed(1)} cm)
 |
 |          |  Stub (${stubLenCm.toFixed(1)} cm)
 |===Feed===|  (Höhe: ${feedDistCm.toFixed(1)} cm)
 |          |
 +----------+  Kurzschluss-Basis
        </div>`;
    }
  } else if (type === 'yagi') {
    // Yagi-Uda 3-Element
    const refCm = (wavelength * 0.495) * 100;
    const drivenCm = (wavelength * 0.473) * k * 100;
    const dirCm = (wavelength * 0.440) * k * 100;
    const spaceRefDip = (wavelength * 0.20) * 100;
    const spaceDipDir = (wavelength * 0.15) * 100;

    if (primaryEl) primaryEl.textContent = `3-Element Yagi (ca. 7.1 dBi Gewinn)`;
    if (detailEl) {
      detailEl.innerHTML = `
        <div class="info-item"><span class="info-label">Reflektor:</span><span class="info-val font-mono">${refCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Gespeister Dipol:</span><span class="info-val font-mono">${drivenCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Direktor 1:</span><span class="info-val font-mono">${dirCm.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Abstand Reflektor ➔ Dipol:</span><span class="info-val font-mono">${spaceRefDip.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Abstand Dipol ➔ Direktor:</span><span class="info-val font-mono">${spaceDipDir.toFixed(1)} cm</span></div>
        <div class="info-item"><span class="info-label">Gesamte Boom-Länge:</span><span class="info-val font-mono">${(spaceRefDip + spaceDipDir).toFixed(1)} cm</span></div>
      `;
    }
    if (diagramEl) {
      diagramEl.innerHTML = `
        <div style="font-family: monospace; font-size: 0.75rem; color: var(--neon-cyan); text-align: center; white-space: pre;">
   Reflektor      Dipol (Feed)      Direktor       --&gt; Hauptstrahl
      |                |                |
      |&lt;--${spaceRefDip.toFixed(0)}cm--&gt;|&lt;--${spaceDipDir.toFixed(0)}cm--&gt;|
      |                |                |
  (${refCm.toFixed(0)}cm)        (${drivenCm.toFixed(0)}cm)       (${dirCm.toFixed(0)}cm)
        </div>`;
    }
  }
}

// -----------------------------------------------------------------------------
// 2. HF-KABELDÄMPFUNG & LINK-BUDGET
// -----------------------------------------------------------------------------
function initCableLinkCalc() {
  const cableSelect = document.getElementById('rf-cable-type');
  const lengthInput = document.getElementById('rf-cable-len');
  const freqInput = document.getElementById('rf-cable-freq');
  const ptxInput = document.getElementById('rf-link-ptx');
  const gtxInput = document.getElementById('rf-link-gtx');
  const grxInput = document.getElementById('rf-link-grx');
  const distInput = document.getElementById('rf-link-dist');
  const sensInput = document.getElementById('rf-link-sens');

  if (!cableSelect) return;

  const update = () => calculateCableAndLink();

  [cableSelect, lengthInput, freqInput, ptxInput, gtxInput, grxInput, distInput, sensInput].forEach(el => {
    if (el) el.addEventListener('input', update);
  });

  update();
}

function calculateCableAndLink() {
  const cableKey = document.getElementById('rf-cable-type')?.value || 'rg58';
  const cableLenM = parseFloat(document.getElementById('rf-cable-len')?.value) || 10.0;
  const freqMHz = parseFloat(document.getElementById('rf-cable-freq')?.value) || 433.0;

  const ptxDbm = parseFloat(document.getElementById('rf-link-ptx')?.value) || 14.0; // 14 dBm = 25 mW (LoRa/PMR)
  const gtxDbi = parseFloat(document.getElementById('rf-link-gtx')?.value) || 2.15;
  const grxDbi = parseFloat(document.getElementById('rf-link-grx')?.value) || 2.15;
  const distKm = parseFloat(document.getElementById('rf-link-dist')?.value) || 5.0;
  const sensDbm = parseFloat(document.getElementById('rf-link-sens')?.value) || -125.0; // LoRa Empfindlichkeit

  const cableInfo = COAX_CABLES[cableKey] || COAX_CABLES['rg58'];

  // Kabeldämpfung in dB/100m bei Frequenz
  const attPer100m = cableInfo.k1 * Math.sqrt(freqMHz) + cableInfo.k2 * freqMHz;
  const totalCableLoss = (attPer100m * cableLenM) / 100;
  const efficiencyPct = Math.pow(10, -totalCableLoss / 10) * 100;

  // Freiraumdämpfung FSPL = 20*log10(d) + 20*log10(f) + 32.44 (d in km, f in MHz)
  const dSafe = Math.max(0.001, distKm);
  const fspl = 20 * Math.log10(dSafe) + 20 * Math.log10(freqMHz) + 32.44;

  // Empfangspegel Prx = Ptx + Gtx - LossCableTX - FSPL + Grx - LossCableRX
  // Nehmen wir identische Kabel an beiden Enden an
  const prxDbm = ptxDbm + gtxDbi - totalCableLoss - fspl + grxDbi - totalCableLoss;
  const fadeMargin = prxDbm - sensDbm;

  // Theoretische Maximalreichweite bis Fade Margin = 0
  const maxAllowableFspl = ptxDbm + gtxDbi - totalCableLoss + grxDbi - totalCableLoss - sensDbm;
  const maxDistKm = Math.pow(10, (maxAllowableFspl - 32.44 - 20 * Math.log10(freqMHz)) / 20);

  // UI Updates
  const cableLossEl = document.getElementById('rf-cable-res-loss');
  const cableEffEl = document.getElementById('rf-cable-res-eff');
  const linkPrxEl = document.getElementById('rf-link-res-prx');
  const linkFsplEl = document.getElementById('rf-link-res-fspl');
  const linkMarginEl = document.getElementById('rf-link-res-margin');
  const linkMaxDistEl = document.getElementById('rf-link-res-maxdist');

  if (cableLossEl) cableLossEl.textContent = `${totalCableLoss.toFixed(2)} dB (${attPer100m.toFixed(1)} dB/100m)`;
  if (cableEffEl) cableEffEl.textContent = `${efficiencyPct.toFixed(1)} % Leistung am Ende`;
  if (linkFsplEl) linkFsplEl.textContent = `${fspl.toFixed(1)} dB`;
  if (linkPrxEl) linkPrxEl.textContent = `${prxDbm.toFixed(1)} dBm`;

  if (linkMarginEl) {
    linkMarginEl.textContent = `${fadeMargin.toFixed(1)} dB`;
    if (fadeMargin >= 10) {
      linkMarginEl.style.color = 'var(--neon-green)';
    } else if (fadeMargin >= 0) {
      linkMarginEl.style.color = '#ffaa00';
    } else {
      linkMarginEl.style.color = 'var(--neon-red)';
    }
  }

  if (linkMaxDistEl) {
    if (maxDistKm >= 1.0) linkMaxDistEl.textContent = `${maxDistKm.toFixed(1)} km (Sichtlinie/Freiraum)`;
    else linkMaxDistEl.textContent = `${(maxDistKm * 1000).toFixed(0)} m (Sichtlinie/Freiraum)`;
  }
}

// -----------------------------------------------------------------------------
// 3. SWR- & REFLEXIONSRECHNER
// -----------------------------------------------------------------------------
function initSwrCalc() {
  const pfwdInput = document.getElementById('swr-pfwd-input');
  const preflInput = document.getElementById('swr-prefl-input');

  if (!pfwdInput || !preflInput) return;

  const update = () => calculateSwr();

  pfwdInput.addEventListener('input', update);
  preflInput.addEventListener('input', update);

  update();
}

function calculateSwr() {
  const pfwd = parseFloat(document.getElementById('swr-pfwd-input')?.value) || 10.0; // Watt
  const prefl = parseFloat(document.getElementById('swr-prefl-input')?.value) || 0.5; // Watt

  if (pfwd <= 0) return;
  const reflClamped = Math.min(pfwd, Math.max(0, prefl));

  // Reflexionsfaktor Gamma = sqrt(Prefl / Pfwd)
  const gamma = Math.sqrt(reflClamped / pfwd);

  // SWR = (1 + Gamma) / (1 - Gamma)
  const swr = gamma >= 0.999 ? 99.9 : (1 + gamma) / (1 - gamma);

  // Return Loss (dB) = -20 * log10(Gamma)
  const returnLoss = gamma > 0 ? -20 * Math.log10(gamma) : 99.9;

  // Mismatch Loss (dB) = -10 * log10(1 - Gamma^2)
  const mismatchLoss = gamma < 1 ? -10 * Math.log10(1 - gamma * gamma) : 99.9;

  // Abgestrahlte Leistung
  const pNet = pfwd - reflClamped;
  const effPct = (pNet / pfwd) * 100;

  const swrValEl = document.getElementById('swr-res-val');
  const statusEl = document.getElementById('swr-res-status');
  const rlEl = document.getElementById('swr-res-rl');
  const pnetEl = document.getElementById('swr-res-pnet');
  const mlEl = document.getElementById('swr-res-ml');

  if (swrValEl) swrValEl.textContent = `${swr.toFixed(2)} : 1`;
  if (rlEl) rlEl.textContent = `${returnLoss.toFixed(1)} dB`;
  if (pnetEl) pnetEl.textContent = `${pNet.toFixed(2)} W (${effPct.toFixed(1)}%)`;
  if (mlEl) mlEl.textContent = `${mismatchLoss.toFixed(2)} dB`;

  if (statusEl) {
    if (swr <= 1.3) {
      statusEl.textContent = '🟢 Optimal (Hervorragende Antennenanpassung)';
      statusEl.style.color = 'var(--neon-green)';
    } else if (swr <= 1.7) {
      statusEl.textContent = '🟡 Gut (Geringe Verluste, voll sendefähig)';
      statusEl.style.color = '#ffaa00';
    } else if (swr <= 2.2) {
      statusEl.textContent = '🟠 Akzeptabel (Tuner empfohlen, Endstufe drosselt ggf.)';
      statusEl.style.color = '#ff7700';
    } else {
      statusEl.textContent = '🔴 Kritisch! (Hohe Reflexion, Endstufen-Gefahr!)';
      statusEl.style.color = 'var(--neon-red)';
    }
  }
}

// -----------------------------------------------------------------------------
// 4. HF-PEGELRECHNER (dBm <-> Watt <-> dBuV <-> Veff)
// -----------------------------------------------------------------------------
function initPowerLevelCalc() {
  const dbmInput = document.getElementById('rf-pwr-dbm');
  const wattInput = document.getElementById('rf-pwr-watt');
  const vInput = document.getElementById('rf-pwr-volt');
  const dbuvInput = document.getElementById('rf-pwr-dbuv');
  const impSelect = document.getElementById('rf-pwr-imp');

  if (!dbmInput) return;

  let isUpdating = false;

  const syncFromDbm = (dbm) => {
    if (isUpdating) return;
    isUpdating = true;
    const z = parseFloat(impSelect?.value || '50');

    // P(W) = 10^((dBm - 30) / 10)
    const watt = Math.pow(10, (dbm - 30) / 10);
    // V = sqrt(P * Z)
    const volt = Math.sqrt(Math.max(0, watt * z));
    // dBuV = dBm + 10*log10(Z) + 90
    const dbuv = dbm + 10 * Math.log10(z) + 90;

    if (wattInput) {
      if (watt >= 1) wattInput.value = `${watt.toFixed(3)} W`;
      else if (watt >= 0.001) wattInput.value = `${(watt * 1000).toFixed(2)} mW`;
      else wattInput.value = `${(watt * 1000000).toFixed(1)} µW`;
    }
    if (vInput) {
      if (volt >= 1) vInput.value = `${volt.toFixed(3)} V`;
      else if (volt >= 0.001) vInput.value = `${(volt * 1000).toFixed(2)} mV`;
      else vInput.value = `${(volt * 1000000).toFixed(1)} µV`;
    }
    if (dbuvInput) dbuvInput.value = dbuv.toFixed(1);

    updateSmeterDisplay(dbm);
    isUpdating = false;
  };

  dbmInput.addEventListener('input', () => {
    const val = parseFloat(dbmInput.value);
    if (!isNaN(val)) syncFromDbm(val);
  });

  if (impSelect) {
    impSelect.addEventListener('change', () => {
      const val = parseFloat(dbmInput.value);
      if (!isNaN(val)) syncFromDbm(val);
    });
  }

  syncFromDbm(parseFloat(dbmInput.value) || 0);
}

function updateSmeterDisplay(dbm) {
  const smeterEl = document.getElementById('rf-pwr-smeter');
  if (!smeterEl) return;

  // IARU Standard KW: S9 = -73 dBm (jede S-Stufe = 6 dB)
  // S1 = -121 dBm, S3 = -109, S5 = -97, S7 = -85, S9 = -73, S9+20 = -53, S9+40 = -33
  let text = '';
  if (dbm >= -13) text = 'S9 + 60 dB (Extrem starkes Signal)';
  else if (dbm >= -33) text = `S9 + ${(dbm + 73).toFixed(0)} dB`;
  else if (dbm >= -53) text = `S9 + ${(dbm + 73).toFixed(0)} dB`;
  else if (dbm >= -73) text = `S9 (Klassischer 50 µV Pegel)`;
  else if (dbm >= -79) text = 'S8';
  else if (dbm >= -85) text = 'S7';
  else if (dbm >= -91) text = 'S6';
  else if (dbm >= -97) text = 'S5 (Gutes Signal)';
  else if (dbm >= -103) text = 'S4';
  else if (dbm >= -109) text = 'S3';
  else if (dbm >= -115) text = 'S2';
  else if (dbm >= -121) text = 'S1 (Grasnarbe)';
  else text = '&lt; S1 (Rauschflur)';

  smeterEl.innerHTML = `<span style="color: var(--neon-cyan); font-weight: bold;">${text}</span> (nach IARU KW)`;
}

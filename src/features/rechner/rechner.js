import { solvePythagoras, fmtGeo } from './geometry.js';
import { getEl } from '../../core/ui.js';

function fmt(val) {
    if (val === 0 || isNaN(val)) return '0';
    const abs = Math.abs(val);
    if (abs >= 1e15) return val.toExponential(4);
    if (abs >= 1e6) return Number(val.toPrecision(10)).toString();
    if (abs >= 1) return Number(val.toFixed(4)).toString();
    if (abs >= 0.0001) return Number(val.toFixed(6)).toString();
    return val.toExponential(4);
}

function fmtOhms(ohms) {
    if (ohms >= 1e6) return (ohms / 1e6).toFixed(2) + ' MΩ';
    if (ohms >= 1e3) return (ohms / 1e3).toFixed(2) + ' kΩ';
    if (ohms < 1) return (ohms * 1e3).toFixed(1) + ' mΩ';
    return ohms.toFixed(2) + ' Ω';
}

// ==========================================================================
// 1. OHMSCHES GESETZ & LEISTUNG
// ==========================================================================
function initOhmPower() {
    const fields = {
        U: { el: getEl('calc-voltage'), unit: getEl('calc-voltage-unit') },
        I: { el: getEl('calc-current'), unit: getEl('calc-current-unit') },
        R: { el: getEl('calc-resistance'), unit: getEl('calc-resistance-unit') },
        P: { el: getEl('calc-power'), unit: getEl('calc-power-unit') },
    };
    const clearBtn = getEl('calc-clear');
    if (!fields.U.el) return;

    let editHistory = [];

    function getBaseVal(key) {
        const raw = parseFloat(fields[key].el.value);
        if (isNaN(raw)) return NaN;
        return raw * parseFloat(fields[key].unit.value);
    }

    function setBaseVal(key, baseVal) {
        const unitFactor = parseFloat(fields[key].unit.value);
        fields[key].el.value = fmt(baseVal / unitFactor);
        fields[key].el.classList.add('conv-computed');
    }

    function calculate() {
        if (editHistory.length < 2) return;
        const k1 = editHistory[0], k2 = editHistory[1];
        const v1 = getBaseVal(k1), v2 = getBaseVal(k2);
        if (isNaN(v1) || isNaN(v2)) return;

        const results = {};
        const U = (k1 === 'U' ? v1 : (k2 === 'U' ? v2 : NaN));
        const I = (k1 === 'I' ? v1 : (k2 === 'I' ? v2 : NaN));
        const R = (k1 === 'R' ? v1 : (k2 === 'R' ? v2 : NaN));
        const P = (k1 === 'P' ? v1 : (k2 === 'P' ? v2 : NaN));

        if (!isNaN(I) && !isNaN(U)) {
            if (I !== 0) results.R = U / I;
            results.P = U * I;
        } else if (!isNaN(R) && !isNaN(U)) {
            if (R !== 0) { results.I = U / R; results.P = (U * U) / R; }
        } else if (!isNaN(P) && !isNaN(U)) {
            if (U !== 0) { results.I = P / U; results.R = (U * U) / P; }
        } else if (!isNaN(I) && !isNaN(R)) {
            results.U = I * R;
            results.P = I * I * R;
        } else if (!isNaN(I) && !isNaN(P)) {
            if (I !== 0) { results.U = P / I; results.R = P / (I * I); }
        } else if (!isNaN(P) && !isNaN(R)) {
            if (R > 0 && P >= 0) { results.I = Math.sqrt(P / R); results.U = Math.sqrt(P * R); }
        }

        Object.keys(fields).forEach(k => {
            if (k !== k1 && k !== k2 && results[k] !== undefined) setBaseVal(k, results[k]);
        });
    }

    Object.entries(fields).forEach(([key, field]) => {
        field.el.addEventListener('input', () => {
            Object.values(fields).forEach(f => f.el.classList.remove('conv-computed'));
            editHistory = editHistory.filter(k => k !== key);
            if (!isNaN(parseFloat(field.el.value))) {
                editHistory.push(key);
                if (editHistory.length > 2) editHistory.shift();
            }
            calculate();
        });
        field.unit.addEventListener('change', () => {
            if (editHistory.includes(key)) calculate();
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            Object.values(fields).forEach(f => { f.el.value = ''; f.el.classList.remove('conv-computed'); });
            editHistory = [];
        });
    }
}

// ==========================================================================
// 2. WIDERSTANDS-FARBCODE DECODER (4, 5, 6 RINGE)
// ==========================================================================
function initFarbcodeDecoder() {
    const COLOR_DIGITS = [
        { name: "Schwarz (0)", color: "#000000", val: 0 },
        { name: "Braun (1)", color: "#a52a2a", val: 1 },
        { name: "Rot (2)", color: "#ff0000", val: 2 },
        { name: "Orange (3)", color: "#ff8c00", val: 3 },
        { name: "Gelb (4)", color: "#ffd700", val: 4 },
        { name: "Grün (5)", color: "#008000", val: 5 },
        { name: "Blau (6)", color: "#0000ff", val: 6 },
        { name: "Violett (7)", color: "#8a2be2", val: 7 },
        { name: "Grau (8)", color: "#808080", val: 8 },
        { name: "Weiß (9)", color: "#ffffff", val: 9 }
    ];

    const COLOR_MULTS = [
        { name: "Silber (×0.01)", color: "#c0c0c0", val: 0.01 },
        { name: "Gold (×0.1)", color: "#d4af37", val: 0.1 },
        { name: "Schwarz (×1)", color: "#000000", val: 1 },
        { name: "Braun (×10)", color: "#a52a2a", val: 10 },
        { name: "Rot (×100)", color: "#ff0000", val: 100 },
        { name: "Orange (×1k)", color: "#ff8c00", val: 1000 },
        { name: "Gelb (×10k)", color: "#ffd700", val: 10000 },
        { name: "Grün (×100k)", color: "#008000", val: 100000 },
        { name: "Blau (×1M)", color: "#0000ff", val: 1000000 },
        { name: "Violett (×10M)", color: "#8a2be2", val: 10000000 },
        { name: "Grau (×100M)", color: "#808080", val: 100000000 },
        { name: "Weiß (×1G)", color: "#ffffff", val: 1000000000 }
    ];

    const COLOR_TOLS = [
        { name: "Brau (±1%)", color: "#a52a2a", val: 1 },
        { name: "Rot (±2%)", color: "#ff0000", val: 2 },
        { name: "Grün (±0.5%)", color: "#008000", val: 0.5 },
        { name: "Blau (±0.25%)", color: "#0000ff", val: 0.25 },
        { name: "Violett (±0.1%)", color: "#8a2be2", val: 0.1 },
        { name: "Grau (±0.05%)", color: "#808080", val: 0.05 },
        { name: "Gold (±5%)", color: "#d4af37", val: 5 },
        { name: "Silber (±10%)", color: "#c0c0c0", val: 10 }
    ];

    const COLOR_PPMS = [
        { name: "Braun (100 ppm/K)", color: "#a52a2a", val: 100 },
        { name: "Rot (50 ppm/K)", color: "#ff0000", val: 50 },
        { name: "Orange (15 ppm/K)", color: "#ff8c00", val: 15 },
        { name: "Gelb (25 ppm/K)", color: "#ffd700", val: 25 },
        { name: "Blau (10 ppm/K)", color: "#0000ff", val: 10 },
        { name: "Violett (5 ppm/K)", color: "#8a2be2", val: 5 }
    ];

    let currentBands = 4;

    const b1 = getEl('fc-band-1');
    const b2 = getEl('fc-band-2');
    const b3 = getEl('fc-band-3');
    const bMult = getEl('fc-band-mult');
    const bTol = getEl('fc-band-tol');
    const bPpm = getEl('fc-band-ppm');

    if (!b1 || !b2) return;

    function populateSelect(selectEl, items) {
        selectEl.innerHTML = items.map((item, idx) => `<option value="${idx}">${item.name}</option>`).join('');
    }

    populateSelect(b1, COLOR_DIGITS);
    populateSelect(b2, COLOR_DIGITS);
    populateSelect(b3, COLOR_DIGITS);
    populateSelect(bMult, COLOR_MULTS);
    populateSelect(bTol, COLOR_TOLS);
    populateSelect(bPpm, COLOR_PPMS);

    // Defaults: 1k Ohm (Brown, Black, Red, Gold)
    b1.value = 1; // Braun (1)
    b2.value = 0; // Schwarz (0)
    b3.value = 0; // Schwarz (0)
    bMult.value = 4; // Rot (x100)
    bTol.value = 6; // Gold (+-5%)
    bPpm.value = 0; // Braun (100ppm)

    function drawResistorCanvas(colors) {
        const canvas = getEl('resistor-canvas');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Lead wires
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(10, h / 2);
        ctx.lineTo(w - 10, h / 2);
        ctx.stroke();

        // Resistor body
        const bodyX = 50;
        const bodyY = 10;
        const bodyW = w - 100;
        const bodyH = h - 20;
        const r = 10;

        const grad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
        grad.addColorStop(0, '#f2d5a3');
        grad.addColorStop(0.3, '#fae6c0');
        grad.addColorStop(0.7, '#d4b886');
        grad.addColorStop(1, '#9e8050');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bodyX, bodyY, bodyW, bodyH, r);
        } else {
            ctx.rect(bodyX, bodyY, bodyW, bodyH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bulges on ends
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(bodyX + 2, bodyY + 2, 8, bodyH - 4);

        // Draw color bands
        const bandWidth = 9;
        const numBands = colors.length;
        const step = (bodyW - 40) / (numBands + (numBands >= 5 ? 0.5 : 1));

        colors.forEach((col, idx) => {
            let bx = bodyX + 16 + (idx * step);
            if (idx === numBands - 1) {
                bx = bodyX + bodyW - 24; // Tolerance band gap
            } else if (idx === numBands - 2 && numBands === 6) {
                bx = bodyX + bodyW - 38; // 6-band ppm gap
            }

            ctx.fillStyle = col;
            ctx.fillRect(bx, bodyY, bandWidth, bodyH);

            // Shading & Sheen
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(bx, bodyY, 2, bodyH);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(bx + bandWidth - 2, bodyY, 2, bodyH);
        });
    }

    function updateFarbcode() {
        const val1 = COLOR_DIGITS[b1.value].val;
        const val2 = COLOR_DIGITS[b2.value].val;
        const mult = COLOR_MULTS[bMult.value].val;
        const tol = COLOR_TOLS[bTol.value].val;

        const activeColors = [
            COLOR_DIGITS[b1.value].color,
            COLOR_DIGITS[b2.value].color
        ];

        let totalOhms = 0;
        if (currentBands === 4) {
            totalOhms = (val1 * 10 + val2) * mult;
            activeColors.push(COLOR_MULTS[bMult.value].color);
            activeColors.push(COLOR_TOLS[bTol.value].color);
        } else if (currentBands === 5) {
            const val3 = COLOR_DIGITS[b3.value].val;
            activeColors.push(COLOR_DIGITS[b3.value].color);
            activeColors.push(COLOR_MULTS[bMult.value].color);
            activeColors.push(COLOR_TOLS[bTol.value].color);
            totalOhms = (val1 * 100 + val2 * 10 + val3) * mult;
        } else if (currentBands === 6) {
            const val3 = COLOR_DIGITS[b3.value].val;
            activeColors.push(COLOR_DIGITS[b3.value].color);
            activeColors.push(COLOR_MULTS[bMult.value].color);
            activeColors.push(COLOR_TOLS[bTol.value].color);
            activeColors.push(COLOR_PPMS[bPpm.value].color);
            totalOhms = (val1 * 100 + val2 * 10 + val3) * mult;
        }

        drawResistorCanvas(activeColors);

        const minOhms = totalOhms * (1 - tol / 100);
        const maxOhms = totalOhms * (1 + tol / 100);

        const valEl = getEl('fc-result-value');
        const rangeEl = getEl('fc-result-range');
        if (valEl) {
            let ppmText = currentBands === 6 ? ` (${COLOR_PPMS[bPpm.value].val} ppm/K)` : '';
            valEl.textContent = `${fmtOhms(totalOhms)} ± ${tol}%${ppmText}`;
        }
        if (rangeEl) {
            rangeEl.textContent = `Toleranzbereich: ${fmtOhms(minOhms)} – ${fmtOhms(maxOhms)}`;
        }
    }

    [b1, b2, b3, bMult, bTol, bPpm].forEach(sel => {
        if (sel) sel.addEventListener('change', updateFarbcode);
    });

    document.querySelectorAll('.band-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.band-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBands = parseInt(btn.dataset.bands);

            const g3 = getEl('fc-group-3');
            const gPpm = getEl('fc-group-ppm');
            const p3 = getEl('band-preview-3');
            const pPpm = getEl('band-preview-ppm');

            if (currentBands >= 5) {
                if (g3) g3.style.display = 'block';
                if (p3) p3.style.display = 'block';
            } else {
                if (g3) g3.style.display = 'none';
                if (p3) p3.style.display = 'none';
            }

            if (currentBands === 6) {
                if (gPpm) gPpm.style.display = 'block';
                if (pPpm) pPpm.style.display = 'block';
            } else {
                if (gPpm) gPpm.style.display = 'none';
                if (pPpm) pPpm.style.display = 'none';
            }

            updateFarbcode();
        });
    });

    // Reverse lookup
    const revInput = getEl('fc-reverse-input');
    const revBtn = getEl('fc-reverse-btn');
    if (revBtn && revInput) {
        revBtn.addEventListener('click', () => {
            const raw = revInput.value.trim().toLowerCase();
            let num = parseFloat(raw);
            if (isNaN(num)) return;
            if (raw.includes('k')) num *= 1000;
            if (raw.includes('m')) num *= 1000000;

            let digitsStr = num.toString().replace('.', '');
            if (digitsStr.length >= 2) {
                let d1 = parseInt(digitsStr[0]);
                let d2 = parseInt(digitsStr[1]);
                let divisor = (d1 * 10 + d2);
                let mult = num / divisor;
                let multIdx = COLOR_MULTS.findIndex(m => Math.abs(m.val - mult) < 0.0001);
                if (multIdx !== -1) {
                    b1.value = d1;
                    b2.value = d2;
                    bMult.value = multIdx;
                    updateFarbcode();
                }
            }
        });
    }

    updateFarbcode();
}

// ==========================================================================
// 3. LED-VORWIDERSTAND
// ==========================================================================
function initLedResistor() {
    const E24 = [
        1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
        3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1
    ];

    function getNearestE24(val) {
        if (val <= 0) return 0;
        const exponent = Math.floor(Math.log10(val));
        const normalized = val / Math.pow(10, exponent);
        let best = E24[0];
        let minDiff = Math.abs(normalized - best);
        for (let i = 1; i < E24.length; i++) {
            const diff = Math.abs(normalized - E24[i]);
            if (diff < minDiff) {
                minDiff = diff;
                best = E24[i];
            }
        }
        return Math.round(best * Math.pow(10, exponent));
    }

    const vccEl = getEl('led-vcc');
    const vfEl = getEl('led-vf');
    const ifEl = getEl('led-if');
    const countEl = getEl('led-count');

    if (!vccEl || !vfEl) return;

    function calcLed() {
        const vcc = parseFloat(vccEl.value) || 0;
        const vf = parseFloat(vfEl.value) || 0;
        const currentMa = parseFloat(ifEl.value) || 0;
        const count = parseInt(countEl.value) || 1;

        const currentA = currentMa / 1000;
        const totalVf = vf * count;
        const vDrop = vcc - totalVf;

        const resExactEl = getEl('led-res-exact');
        const resE24El = getEl('led-res-e24');
        const resPowerEl = getEl('led-res-power');
        const resRatingEl = getEl('led-res-rating');

        if (vDrop <= 0 || currentA <= 0) {
            if (resExactEl) resExactEl.textContent = 'Spannung zu gering (Vcc ≤ Vf)';
            if (resE24El) resE24El.textContent = '---';
            if (resPowerEl) resPowerEl.textContent = '0 W';
            if (resRatingEl) resRatingEl.textContent = '---';
            return;
        }

        const exactR = vDrop / currentA;
        const e24R = getNearestE24(exactR);
        const powerW = vDrop * currentA;

        let rating = "1/8 Watt (0.125W)";
        if (powerW > 2.0) rating = "5 Watt Keramik";
        else if (powerW > 1.0) rating = "2 Watt";
        else if (powerW > 0.5) rating = "1 Watt";
        else if (powerW > 0.25) rating = "1/2 Watt (0.5W)";
        else if (powerW > 0.125) rating = "1/4 Watt (0.25W)";

        if (resExactEl) resExactEl.textContent = fmtOhms(exactR);
        if (resE24El) resE24El.textContent = fmtOhms(e24R);
        if (resPowerEl) resPowerEl.textContent = `${powerW.toFixed(2)} W (${(powerW * 1000).toFixed(0)} mW)`;
        if (resRatingEl) resRatingEl.textContent = rating;
    }

    [vccEl, vfEl, ifEl, countEl].forEach(el => {
        el.addEventListener('input', calcLed);
    });

    document.querySelectorAll('.led-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            vfEl.value = btn.dataset.vf;
            ifEl.value = btn.dataset.if;
            calcLed();
        });
    });

    calcLed();
}

// ==========================================================================
// 4. KABELQUERSCHNITT & SPANNUNGSABFALL
// ==========================================================================
function initKabelquerschnitt() {
    const NORM_CROSS_SECTIONS = [0.5, 0.75, 1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0];
    const AWG_MAP = {
        0.5: "AWG 20", 0.75: "AWG 18", 1.0: "AWG 17", 1.5: "AWG 15",
        2.5: "AWG 13", 4.0: "AWG 11", 6.0: "AWG 9", 10.0: "AWG 7",
        16.0: "AWG 5", 25.0: "AWG 3", 35.0: "AWG 2", 50.0: "AWG 1/0"
    };

    const voltEl = getEl('kabel-voltage');
    const currEl = getEl('kabel-current');
    const lenEl = getEl('kabel-length');
    const matEl = getEl('kabel-material');
    const maxDropEl = getEl('kabel-max-drop');

    let currentSystem = 'dc'; // dc, ac1, ac3

    if (!voltEl || !currEl) return;

    function calcKabel() {
        const u = parseFloat(voltEl.value) || 12;
        const i = parseFloat(currEl.value) || 0;
        const l = parseFloat(lenEl.value) || 0;
        const rho = parseFloat(matEl.value) || 0.0175;
        const maxPercent = parseFloat(maxDropEl.value) || 3;

        const maxDeltaU = u * (maxPercent / 100);
        let minArea = 0;

        if (currentSystem === 'ac3') {
            // 3-Phasen Drehstrom: A = (sqrt(3) * L * I * cosPhi * rho) / deltaU
            minArea = (Math.sqrt(3) * l * i * rho) / maxDeltaU;
        } else {
            // 1-Phasen AC & DC: Hin- und Rückweg (2 * L)
            minArea = (2 * l * i * rho) / maxDeltaU;
        }

        let recommended = NORM_CROSS_SECTIONS.find(a => a >= minArea) || NORM_CROSS_SECTIONS[NORM_CROSS_SECTIONS.length - 1];
        let awg = AWG_MAP[recommended] || "AWG Standard";

        // Reales Delta U mit dem empfohlenen Querschnitt
        const rWire = (currentSystem === 'ac3' ? Math.sqrt(3) * l * rho / recommended : (2 * l * rho / recommended));
        const actualDeltaU = i * rWire;
        const actualPercent = (actualDeltaU / u) * 100;
        const lossPowerW = i * i * rWire;

        const resMin = getEl('kabel-res-min');
        const resNorm = getEl('kabel-res-norm');
        const resDrop = getEl('kabel-res-drop');
        const resLoss = getEl('kabel-res-loss');

        if (resMin) resMin.textContent = `${minArea.toFixed(2)} mm²`;
        if (resNorm) resNorm.textContent = `${recommended} mm² (${awg})`;
        if (resDrop) resDrop.textContent = `${actualDeltaU.toFixed(2)} V (${actualPercent.toFixed(2)} %)`;
        if (resLoss) resLoss.textContent = `${lossPowerW.toFixed(2)} Watt`;
    }

    [voltEl, currEl, lenEl, matEl, maxDropEl].forEach(el => {
        el.addEventListener('input', calcKabel);
        el.addEventListener('change', calcKabel);
    });

    document.querySelectorAll('.kabel-sys-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.kabel-sys-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSystem = btn.dataset.sys;
            voltEl.value = btn.dataset.v;
            calcKabel();
        });
    });

    calcKabel();
}

// ==========================================================================
// 5. SPANNUNGSTEILER
// ==========================================================================
function initSpannungsteiler() {
    const vinEl = getEl('teiler-vin');
    const r1El = getEl('teiler-r1');
    const r1uEl = getEl('teiler-r1-u');
    const r2El = getEl('teiler-r2');
    const r2uEl = getEl('teiler-r2-u');
    const rlEl = getEl('teiler-rl');
    const rluEl = getEl('teiler-rl-u');

    if (!vinEl || !r1El) return;

    function calcTeiler() {
        const vin = parseFloat(vinEl.value) || 0;
        const r1 = (parseFloat(r1El.value) || 0) * parseFloat(r1uEl.value);
        const r2 = (parseFloat(r2El.value) || 0) * parseFloat(r2uEl.value);
        const rawRl = parseFloat(rlEl.value);
        const rl = (!isNaN(rawRl) && rawRl > 0) ? rawRl * parseFloat(rluEl.value) : null;

        const voutEl = getEl('teiler-res-vout');
        const voutLoadEl = getEl('teiler-res-vout-load');
        const iqEl = getEl('teiler-res-iq');
        const ptotEl = getEl('teiler-res-ptot');

        if (r1 + r2 === 0) return;

        const voutNoLoad = vin * (r2 / (r1 + r2));
        const iqA = vin / (r1 + r2);
        const ptotW = vin * iqA;

        let voutLoaded = voutNoLoad;
        if (rl !== null) {
            const r2Parallel = (r2 * rl) / (r2 + rl);
            voutLoaded = vin * (r2Parallel / (r1 + r2Parallel));
        }

        if (voutEl) voutEl.textContent = `${voutNoLoad.toFixed(2)} V`;
        if (voutLoadEl) voutLoadEl.textContent = rl !== null ? `${voutLoaded.toFixed(2)} V` : `${voutNoLoad.toFixed(2)} V (unbelastet)`;
        if (iqEl) iqEl.textContent = `${(iqA * 1000).toFixed(2)} mA`;
        if (ptotEl) ptotEl.textContent = `${(ptotW * 1000).toFixed(2)} mW (${ptotW.toFixed(3)} W)`;
    }

    [vinEl, r1El, r1uEl, r2El, r2uEl, rlEl, rluEl].forEach(el => {
        el.addEventListener('input', calcTeiler);
        el.addEventListener('change', calcTeiler);
    });

    calcTeiler();
}

// ==========================================================================
// 6. AKKULAUFZEIT & KAPAZITÄT
// ==========================================================================
function initAkkulaufzeit() {
    const capEl = getEl('akku-cap');
    const capuEl = getEl('akku-cap-u');
    const voltEl = getEl('akku-volt');
    const loadEl = getEl('akku-load');
    const loaduEl = getEl('akku-load-u');
    const effEl = getEl('akku-eff');

    if (!capEl || !loadEl) return;

    function calcAkku() {
        const rawCap = parseFloat(capEl.value) || 0;
        const capMah = rawCap * parseFloat(capuEl.value);
        const volt = parseFloat(voltEl.value) || 3.7;
        const eff = parseFloat(effEl.value) || 0.85;
        const loadVal = parseFloat(loadEl.value) || 0;
        const loadMode = loaduEl.value;

        let loadMa = 0;
        if (loadMode === 'watt') {
            loadMa = (loadVal / volt) * 1000;
        } else {
            loadMa = loadVal * parseFloat(loadMode);
        }

        const resTime = getEl('akku-res-time');
        const resDays = getEl('akku-res-days');
        const resEnergy = getEl('akku-res-energy');
        const resCrate = getEl('akku-res-crate');

        const totalWh = (capMah / 1000) * volt;
        if (resEnergy) resEnergy.textContent = `${totalWh.toFixed(2)} Wh`;

        if (loadMa <= 0) {
            if (resTime) resTime.textContent = '---';
            if (resDays) resDays.textContent = '---';
            if (resCrate) resCrate.textContent = '0 C';
            return;
        }

        const runtimeHours = (capMah * eff) / loadMa;
        const hours = Math.floor(runtimeHours);
        const mins = Math.round((runtimeHours - hours) * 60);
        const days = (runtimeHours / 24).toFixed(2);
        const cRate = (loadMa / capMah).toFixed(2);

        if (resTime) resTime.textContent = `${hours}h ${mins.toString().padStart(2, '0')}m`;
        if (resDays) resDays.textContent = `${days} Tage`;
        if (resCrate) resCrate.textContent = `${cRate} C`;
    }

    [capEl, capuEl, voltEl, loadEl, loaduEl, effEl].forEach(el => {
        el.addEventListener('input', calcAkku);
        el.addEventListener('change', calcAkku);
    });

    document.querySelectorAll('.akku-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.akku-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            voltEl.value = btn.dataset.volt;
            effEl.value = btn.dataset.eff;
            calcAkku();
        });
    });

    calcAkku();
}

// ==========================================================================
// 7. REIHEN- & PARALLELSCHALTUNG (SCHALTUNGS-ANALYSE STUDIO)
// ==========================================================================
function initCircuitSolver() {
    // ---------------------------------------------------------
    // 1. SUB-MODE NAVIGATION (Standard, Gemischt, Synthese)
    // ---------------------------------------------------------
    const modeBtns = document.querySelectorAll('.circuit-mode-btn');
    const panels = {
        standard: getEl('circuit-panel-standard'),
        mixed: getEl('circuit-panel-mixed'),
        synth: getEl('circuit-panel-synth')
    };

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.cmode;
            Object.keys(panels).forEach(key => {
                if (panels[key]) panels[key].style.display = (key === mode) ? 'block' : 'none';
            });
            if (mode === 'synth') calcSynth();
            if (mode === 'mixed') calcMixed();
        });
    });

    // ---------------------------------------------------------
    // 2. STANDARD-MODUS MIT DETAIL- & LASTANALYSE
    // ---------------------------------------------------------
    let circuitType = 'resistor'; // resistor, capacitor, inductor
    let components = [
        { val: 100, unitFactor: 1 },
        { val: 220, unitFactor: 1 },
        { val: 470, unitFactor: 1 }
    ];

    const UNIT_CONFIGS = {
        resistor: [
            { label: 'Ω', factor: 1 },
            { label: 'kΩ', factor: 1000 },
            { label: 'MΩ', factor: 1000000 },
            { label: 'mΩ', factor: 0.001 }
        ],
        capacitor: [
            { label: 'µF', factor: 1e-6 },
            { label: 'nF', factor: 1e-9 },
            { label: 'pF', factor: 1e-12 },
            { label: 'mF', factor: 1e-3 }
        ],
        inductor: [
            { label: 'mH', factor: 1e-3 },
            { label: 'µH', factor: 1e-6 },
            { label: 'H', factor: 1 }
        ]
    };

    const listEl = getEl('circuit-components-list');
    const addBtn = getEl('circuit-add-btn');
    const vgesInput = getEl('circuit-vges');
    const evalModeSelect = getEl('circuit-eval-mode');

    function fmtValUnit(baseVal, type) {
        if (type === 'resistor') {
            if (baseVal >= 1e6) return `${(baseVal / 1e6).toFixed(3)} MΩ`;
            if (baseVal >= 1e3) return `${(baseVal / 1e3).toFixed(2)} kΩ`;
            if (baseVal < 1) return `${(baseVal * 1000).toFixed(2)} mΩ`;
            return `${baseVal.toFixed(2)} Ω`;
        } else if (type === 'capacitor') {
            if (baseVal >= 1e-3) return `${(baseVal * 1e3).toFixed(2)} mF`;
            if (baseVal >= 1e-6) return `${(baseVal * 1e6).toFixed(2)} µF`;
            if (baseVal >= 1e-9) return `${(baseVal * 1e9).toFixed(2)} nF`;
            return `${(baseVal * 1e12).toFixed(2)} pF`;
        } else {
            if (baseVal >= 1) return `${baseVal.toFixed(3)} H`;
            if (baseVal >= 1e-3) return `${(baseVal * 1e3).toFixed(2)} mH`;
            return `${(baseVal * 1e6).toFixed(2)} µH`;
        }
    }

    function renderComponents() {
        if (!listEl) return;
        listEl.innerHTML = '';

        const units = UNIT_CONFIGS[circuitType];

        components.forEach((comp, idx) => {
            const row = document.createElement('div');
            row.className = 'conv-row circuit-comp-row';

            const nameLabel = document.createElement('span');
            nameLabel.style.fontWeight = 'bold';
            nameLabel.style.color = 'var(--neon-cyan)';
            nameLabel.style.fontSize = '0.8rem';
            nameLabel.style.minWidth = '24px';
            nameLabel.textContent = `${circuitType === 'resistor' ? 'R' : (circuitType === 'capacitor' ? 'C' : 'L')}${idx + 1}:`;

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'cyber-input-field conv-input';
            input.value = comp.val;
            input.step = 'any';
            input.oninput = (e) => {
                components[idx].val = parseFloat(e.target.value) || 0;
                calcCircuit();
            };

            const unitSelect = document.createElement('select');
            unitSelect.className = 'cyber-input-field';
            unitSelect.style.maxWidth = '75px';
            units.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.factor;
                opt.textContent = u.label;
                if (Math.abs(u.factor - comp.unitFactor) < 1e-15) opt.selected = true;
                unitSelect.appendChild(opt);
            });
            unitSelect.onchange = (e) => {
                components[idx].unitFactor = parseFloat(e.target.value);
                calcCircuit();
            };

            const delBtn = document.createElement('button');
            delBtn.className = 'btn mini';
            delBtn.style.color = '#ff0044';
            delBtn.textContent = '✕';
            delBtn.onclick = () => {
                if (components.length > 1) {
                    components.splice(idx, 1);
                    renderComponents();
                    calcCircuit();
                }
            };

            row.appendChild(nameLabel);
            row.appendChild(input);
            row.appendChild(unitSelect);
            row.appendChild(delBtn);
            listEl.appendChild(row);
        });

        calcCircuit();
    }

    function calcCircuit() {
        const seriesEl = getEl('circuit-res-series');
        const parallelEl = getEl('circuit-res-parallel');
        const igesEl = getEl('circuit-res-iges');
        const pgesEl = getEl('circuit-res-pges');
        const breakdownBody = getEl('circuit-breakdown-body');
        const stepsText = getEl('circuit-steps-text');

        const baseValues = components.map(c => (c.val || 0) * (c.unitFactor || 1)).filter(v => v > 0);
        if (baseValues.length === 0) return;

        let totalSeries = 0;
        let totalParallel = 0;

        if (circuitType === 'resistor' || circuitType === 'inductor') {
            totalSeries = baseValues.reduce((a, b) => a + b, 0);
            totalParallel = 1 / baseValues.reduce((acc, v) => acc + (1 / v), 0);
        } else {
            // Kondensatoren invers
            totalParallel = baseValues.reduce((a, b) => a + b, 0);
            totalSeries = 1 / baseValues.reduce((acc, v) => acc + (1 / v), 0);
        }

        if (seriesEl) seriesEl.textContent = fmtValUnit(totalSeries, circuitType);
        if (parallelEl) parallelEl.textContent = fmtValUnit(totalParallel, circuitType);

        // Lastanalyse (U_ges, I_ges, P_ges)
        const uGes = parseFloat(vgesInput ? vgesInput.value : '12') || 0;
        const evalMode = evalModeSelect ? evalModeSelect.value : 'series';

        let igesA = 0;
        let pgesW = 0;

        if (circuitType === 'resistor') {
            const activeRges = (evalMode === 'series') ? totalSeries : totalParallel;
            if (activeRges > 0 && uGes > 0) {
                igesA = uGes / activeRges;
                pgesW = uGes * igesA;
            }

            if (igesEl) igesEl.textContent = igesA >= 1 ? `${igesA.toFixed(3)} A` : `${(igesA * 1000).toFixed(2)} mA`;
            if (pgesEl) pgesEl.textContent = pgesW >= 1 ? `${pgesW.toFixed(2)} W` : `${(pgesW * 1000).toFixed(1)} mW`;

            // Breakdown table
            if (breakdownBody) {
                breakdownBody.innerHTML = '';
                baseValues.forEach((rVal, idx) => {
                    let uPart = 0;
                    let iPart = 0;
                    let pPart = 0;
                    let loadPercent = 0;

                    if (evalMode === 'series') {
                        // Reihe: I ist überall gleich, U teilt sich auf
                        iPart = igesA;
                        uPart = igesA * rVal;
                        pPart = uPart * iPart;
                        loadPercent = totalSeries > 0 ? (rVal / totalSeries) * 100 : 0;
                    } else {
                        // Parallel: U ist überall gleich, I teilt sich auf
                        uPart = uGes;
                        iPart = rVal > 0 ? uGes / rVal : 0;
                        pPart = uPart * iPart;
                        loadPercent = pgesW > 0 ? (pPart / pgesW) * 100 : 0;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:bold; color:var(--neon-cyan)">R${idx + 1}</td>
                        <td>${fmtValUnit(rVal, 'resistor')}</td>
                        <td>${uPart.toFixed(2)} V</td>
                        <td>${iPart >= 1 ? iPart.toFixed(3) + ' A' : (iPart * 1000).toFixed(1) + ' mA'}</td>
                        <td>${pPart >= 1 ? pPart.toFixed(2) + ' W' : (pPart * 1000).toFixed(1) + ' mW'}</td>
                        <td><span style="color:${loadPercent > 50 ? 'var(--neon-orange)' : 'var(--neon-green)'}; font-weight:bold;">${loadPercent.toFixed(1)} %</span></td>
                    `;
                    breakdownBody.appendChild(tr);
                });
            }

            // Schul- & Aufgaben-Rechenweg Generator
            if (stepsText) {
                if (evalMode === 'series') {
                    const sumFormula = baseValues.map((_, i) => `R${i + 1}`).join(' + ');
                    const sumValues = baseValues.map(v => fmtValUnit(v, 'resistor')).join(' + ');
                    stepsText.innerHTML = `
                        1. <strong>Reihenschaltung Gesamtwiderstand:</strong><br>
                        &nbsp;&nbsp;&nbsp;R_ges = ${sumFormula} = ${sumValues} = <strong>${fmtValUnit(totalSeries, 'resistor')}</strong><br>
                        2. <strong>Gesamtstrom (Ohmsches Gesetz):</strong><br>
                        &nbsp;&nbsp;&nbsp;I_ges = U_ges / R_ges = ${uGes}V / ${fmtValUnit(totalSeries, 'resistor')} = <strong>${(igesA * 1000).toFixed(2)} mA</strong><br>
                        3. <strong>Spannungsteilung an den Teilwiderständen (U = I · R):</strong><br>
                        ${baseValues.map((v, i) => `&nbsp;&nbsp;&nbsp;• U_${i + 1} = ${ (igesA * 1000).toFixed(2) }mA · ${fmtValUnit(v, 'resistor')} = <strong>${(igesA * v).toFixed(2)} V</strong>`).join('<br>')}<br>
                        4. <strong>Gesamtleistung:</strong> P_ges = U_ges · I_ges = ${uGes}V · ${(igesA * 1000).toFixed(2)}mA = <strong>${pgesW.toFixed(2)} W</strong>
                    `;
                } else {
                    const parFormula = baseValues.map((_, i) => `1/R${i + 1}`).join(' + ');
                    stepsText.innerHTML = `
                        1. <strong>Parallelschaltung Gesamtwiderstand:</strong><br>
                        &nbsp;&nbsp;&nbsp;1/R_ges = ${parFormula} ➔ R_ges = <strong>${fmtValUnit(totalParallel, 'resistor')}</strong><br>
                        2. <strong>Spannung an allen Zweigen:</strong> U_1 = U_2 = ... = U_ges = <strong>${uGes} V</strong><br>
                        3. <strong>Zweigströme (Kirchhoffsche Knotenregel I_n = U / R_n):</strong><br>
                        ${baseValues.map((v, i) => `&nbsp;&nbsp;&nbsp;• I_${i + 1} = ${uGes}V / ${fmtValUnit(v, 'resistor')} = <strong>${((uGes / v) * 1000).toFixed(2)} mA</strong>`).join('<br>')}<br>
                        4. <strong>Gesamtstrom:</strong> I_ges = ∑ I_n = <strong>${(igesA * 1000).toFixed(2)} mA</strong> (${pgesW.toFixed(2)} W)
                    `;
                }
            }
        } else {
            if (igesEl) igesEl.textContent = '--';
            if (pgesEl) pgesEl.textContent = '--';
            if (breakdownBody) breakdownBody.innerHTML = '<tr><td colspan="6" style="color:var(--text-dim); text-align:center;">Lastanalyse für C und L bei Wechselstrom im AC/Filter-Tab.</td></tr>';
            if (stepsText) {
                if (circuitType === 'capacitor') {
                    stepsText.innerHTML = `
                        • <strong>Kondensatoren in Reihe:</strong> 1/C_ges = 1/C1 + 1/C2 + ... ➔ C_ges = <strong>${fmtValUnit(totalSeries, 'capacitor')}</strong> (Kapazität sinkt, Spannungsfestigkeit steigt).<br>
                        • <strong>Kondensatoren Parallel:</strong> C_ges = C1 + C2 + ... ➔ C_ges = <strong>${fmtValUnit(totalParallel, 'capacitor')}</strong> (Kapazität addiert sich).
                    `;
                } else {
                    stepsText.innerHTML = `
                        • <strong>Spulen in Reihe:</strong> L_ges = L1 + L2 + ... ➔ L_ges = <strong>${fmtValUnit(totalSeries, 'inductor')}</strong> (Induktivität addiert sich).<br>
                        • <strong>Spulen Parallel:</strong> 1/L_ges = 1/L1 + 1/L2 + ... ➔ L_ges = <strong>${fmtValUnit(totalParallel, 'inductor')}</strong>.
                    `;
                }
            }
        }
    }

    if (addBtn) {
        addBtn.onclick = () => {
            const defVal = circuitType === 'resistor' ? 100 : (circuitType === 'capacitor' ? 10 : 1);
            const defFactor = circuitType === 'resistor' ? 1 : (circuitType === 'capacitor' ? 1e-6 : 1e-3);
            components.push({ val: defVal, unitFactor: defFactor });
            renderComponents();
        };
    }

    if (vgesInput) vgesInput.addEventListener('input', calcCircuit);
    if (evalModeSelect) evalModeSelect.addEventListener('change', calcCircuit);

    document.querySelectorAll('.circuit-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.circuit-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            circuitType = btn.dataset.type;

            const defFactor = circuitType === 'resistor' ? 1 : (circuitType === 'capacitor' ? 1e-6 : 1e-3);
            components.forEach(c => c.unitFactor = defFactor);

            renderComponents();
        });
    });

    // ---------------------------------------------------------
    // 3. GEMISCHTE SCHALTUNGEN (EXPRESSION-PARSER)
    // ---------------------------------------------------------
    const mixedInput = getEl('circuit-mixed-input');
    const mixedResultEl = getEl('circuit-mixed-result');
    const mixedStatusEl = getEl('circuit-mixed-status');
    const mixedStepsEl = getEl('circuit-mixed-steps');

    function parseComponentValue(str) {
        str = str.trim().toLowerCase();
        let mult = 1;
        if (str.endsWith('k') || str.endsWith('kω')) {
            mult = 1000;
            str = str.replace(/k.*$/, '');
        } else if (str.endsWith('m') || str.endsWith('mω')) {
            mult = 1000000;
            str = str.replace(/m.*$/, '');
        } else if (str.endsWith('r') || str.endsWith('ω')) {
            str = str.replace(/[rω].*$/, '');
        }
        const val = parseFloat(str);
        return isNaN(val) ? null : val * mult;
    }

    function evaluateMixedExpression(expr) {
        // Replace || and // with custom operator @ for parallel
        let clean = expr.replace(/\s+/g, '')
                        .replace(/\|\|/g, '@')
                        .replace(/\/\//g, '@');

        // Tokenize into numbers, +, @, (, )
        let tokens = [];
        let cur = '';

        for (let i = 0; i < clean.length; i++) {
            let ch = clean[i];
            if (ch === '+' || ch === '@' || ch === '(' || ch === ')') {
                if (cur) {
                    let v = parseComponentValue(cur);
                    if (v === null) return { error: `Ungültiger Wert "${cur}"` };
                    tokens.push(v);
                    cur = '';
                }
                tokens.push(ch);
            } else {
                cur += ch;
            }
        }
        if (cur) {
            let v = parseComponentValue(cur);
            if (v === null) return { error: `Ungültiger Wert "${cur}"` };
            tokens.push(v);
        }

        // Shunting-yard algorithm
        let outputQueue = [];
        let opStack = [];
        let precedence = { '+': 1, '@': 2 };

        for (let token of tokens) {
            if (typeof token === 'number') {
                outputQueue.push(token);
            } else if (token === '+' || token === '@') {
                while (opStack.length > 0 && opStack[opStack.length - 1] !== '(' &&
                       precedence[opStack[opStack.length - 1]] >= precedence[token]) {
                    outputQueue.push(opStack.pop());
                }
                opStack.push(token);
            } else if (token === '(') {
                opStack.push(token);
            } else if (token === ')') {
                while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
                    outputQueue.push(opStack.pop());
                }
                if (opStack.length === 0) return { error: "Klammerfehler: Fehlende öffnende Klammer" };
                opStack.pop(); // Remove '('
            }
        }

        while (opStack.length > 0) {
            let op = opStack.pop();
            if (op === '(' || op === ')') return { error: "Klammerfehler: Ungeschlossene Klammer" };
            outputQueue.push(op);
        }

        // Evaluate RPN
        let evalStack = [];
        let steps = [];

        for (let token of outputQueue) {
            if (typeof token === 'number') {
                evalStack.push(token);
            } else if (token === '+' || token === '@') {
                if (evalStack.length < 2) return { error: "Ungültiger Schaltungsausdruck" };
                let b = evalStack.pop();
                let a = evalStack.pop();
                let res = 0;
                if (token === '+') {
                    res = a + b;
                    steps.push(`${fmtOhms(a)} + ${fmtOhms(b)} = ${fmtOhms(res)} (Reihe)`);
                } else if (token === '@') {
                    res = (a * b) / (a + b);
                    steps.push(`${fmtOhms(a)} || ${fmtOhms(b)} = ${fmtOhms(res)} (Parallel)`);
                }
                evalStack.push(res);
            }
        }

        if (evalStack.length !== 1) return { error: "Unvollständige Formel" };
        return { result: evalStack[0], steps: steps };
    }

    function calcMixed() {
        if (!mixedInput) return;
        const expr = mixedInput.value.trim();
        if (!expr) {
            if (mixedResultEl) mixedResultEl.innerText = '--';
            if (mixedStatusEl) mixedStatusEl.innerText = '--';
            return;
        }

        const res = evaluateMixedExpression(expr);
        if (res.error) {
            if (mixedResultEl) mixedResultEl.innerText = 'Syntax-Fehler';
            if (mixedStatusEl) {
                mixedStatusEl.innerText = res.error;
                mixedStatusEl.style.color = 'var(--neon-red)';
            }
            if (mixedStepsEl) mixedStepsEl.innerText = 'Beispiel: 100 + (220 || 470) oder (1k || 2.2k) + 330';
        } else {
            if (mixedResultEl) mixedResultEl.innerText = fmtOhms(res.result);
            if (mixedStatusEl) {
                mixedStatusEl.innerText = 'Gültig & Gelöst';
                mixedStatusEl.style.color = 'var(--neon-green)';
            }
            if (mixedStepsEl) {
                mixedStepsEl.innerHTML = res.steps.length > 0 ? res.steps.map((s, idx) => `<strong>Schritt ${idx + 1}:</strong> ${s}`).join('<br>') : `Direkter Wert: ${fmtOhms(res.result)}`;
            }
        }
    }

    if (mixedInput) mixedInput.addEventListener('input', calcMixed);

    document.querySelectorAll('.circuit-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (mixedInput) {
                mixedInput.value = btn.dataset.expr;
                calcMixed();
            }
        });
    });

    // ---------------------------------------------------------
    // 4. WUNSCHWERT-FINDER (E12 / E24 / E96 SYNTHESE)
    // ---------------------------------------------------------
    const targetValInput = getEl('synth-target-val');
    const targetUnitSelect = getEl('synth-target-unit');
    const seriesSelect = getEl('synth-series-select');
    const synthSeriesRes = getEl('synth-series-res');
    const synthParallelRes = getEl('synth-parallel-res');

    const E_SERIES_BASES = {
        E12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
        E24: [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1],
        E96: [
            1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43,
            1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10,
            2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09,
            3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53,
            4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65,
            6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76
        ]
    };

    function generateNormValues(seriesName) {
        const base = E_SERIES_BASES[seriesName] || E_SERIES_BASES.E24;
        let vals = [];
        for (let exp = 0; exp <= 6; exp++) {
            let decade = Math.pow(10, exp);
            base.forEach(b => {
                let v = Math.round(b * decade * 100) / 100;
                if (v >= 1 && v <= 10000000) vals.push(v);
            });
        }
        return vals;
    }

    function calcSynth() {
        if (!targetValInput) return;
        const rawTarget = parseFloat(targetValInput.value) || 0;
        const unitMult = parseFloat(targetUnitSelect ? targetUnitSelect.value : '1') || 1;
        const targetOhms = rawTarget * unitMult;
        const seriesName = seriesSelect ? seriesSelect.value : 'E24';

        if (targetOhms <= 0) {
            if (synthSeriesRes) synthSeriesRes.innerText = '--';
            if (synthParallelRes) synthParallelRes.innerText = '--';
            return;
        }

        const normList = generateNormValues(seriesName);

        // Find Best Series Pair: R1 + R2 ~ Target
        let bestSeries = null;
        let minSeriesDiff = Infinity;

        // Find Best Parallel Pair: (R1 * R2) / (R1 + R2) ~ Target
        let bestParallel = null;
        let minParallelDiff = Infinity;

        for (let i = 0; i < normList.length; i++) {
            let r1 = normList[i];
            if (r1 > targetOhms) break; // In series, r1 cannot be larger than target

            for (let j = i; j < normList.length; j++) {
                let r2 = normList[j];
                let sVal = r1 + r2;
                let sDiff = Math.abs(sVal - targetOhms);
                if (sDiff < minSeriesDiff) {
                    minSeriesDiff = sDiff;
                    bestSeries = { r1, r2, total: sVal, diff: sDiff, errPct: (sDiff / targetOhms) * 100 };
                }
                if (sVal > targetOhms && sDiff > minSeriesDiff) break;
            }
        }

        // For parallel, R1 and R2 must each be >= targetOhms
        const parallelCandidates = normList.filter(v => v >= targetOhms && v <= targetOhms * 50);
        for (let i = 0; i < parallelCandidates.length; i++) {
            let r1 = parallelCandidates[i];
            for (let j = i; j < parallelCandidates.length; j++) {
                let r2 = parallelCandidates[j];
                let pVal = (r1 * r2) / (r1 + r2);
                let pDiff = Math.abs(pVal - targetOhms);
                if (pDiff < minParallelDiff) {
                    minParallelDiff = pDiff;
                    bestParallel = { r1, r2, total: pVal, diff: pDiff, errPct: (pDiff / targetOhms) * 100 };
                }
            }
        }

        if (synthSeriesRes) {
            if (bestSeries) {
                const isExact = bestSeries.errPct < 0.001;
                synthSeriesRes.innerHTML = `
                    <strong>${fmtOhms(bestSeries.r1)}</strong> + <strong>${fmtOhms(bestSeries.r2)}</strong> = 
                    <span style="color:var(--neon-cyan); font-weight:bold;">${fmtOhms(bestSeries.total)}</span>
                    <span style="font-size:0.75rem; color:${isExact ? 'var(--neon-green)' : 'var(--neon-orange)'}; margin-left:6px;">
                        (${isExact ? 'EXAKT 0% Abweichung' : `Δ ${bestSeries.diff.toFixed(2)} Ω / ${bestSeries.errPct.toFixed(2)} % Fehler`})
                    </span>
                `;
            } else {
                synthSeriesRes.innerText = 'Keine passende Kombination gefunden';
            }
        }

        if (synthParallelRes) {
            if (bestParallel) {
                const isExact = bestParallel.errPct < 0.001;
                synthParallelRes.innerHTML = `
                    <strong>${fmtOhms(bestParallel.r1)}</strong> || <strong>${fmtOhms(bestParallel.r2)}</strong> = 
                    <span style="color:var(--neon-purple); font-weight:bold;">${fmtOhms(bestParallel.total)}</span>
                    <span style="font-size:0.75rem; color:${isExact ? 'var(--neon-green)' : 'var(--neon-orange)'}; margin-left:6px;">
                        (${isExact ? 'EXAKT 0% Abweichung' : `Δ ${bestParallel.diff.toFixed(2)} Ω / ${bestParallel.errPct.toFixed(2)} % Fehler`})
                    </span>
                `;
            } else {
                synthParallelRes.innerText = 'Keine passende Kombination gefunden';
            }
        }
    }

    if (targetValInput) targetValInput.addEventListener('input', calcSynth);
    if (targetUnitSelect) targetUnitSelect.addEventListener('change', calcSynth);
    if (seriesSelect) seriesSelect.addEventListener('change', calcSynth);

    renderComponents();
}

// ==========================================================================
// 8. RC-FILTER & GRENZFREQUENZ
// ==========================================================================
function initRcFilter() {
    const rEl = getEl('rc-r');
    const ruEl = getEl('rc-r-u');
    const cEl = getEl('rc-c');
    const cuEl = getEl('rc-c-u');

    if (!rEl || !cEl) return;

    function calcRc() {
        const r = (parseFloat(rEl.value) || 0) * parseFloat(ruEl.value);
        const c = (parseFloat(cEl.value) || 0) * parseFloat(cuEl.value);

        const tauEl = getEl('rc-res-tau');
        const fcEl = getEl('rc-res-fc');
        const t50El = getEl('rc-res-t50');
        const t99El = getEl('rc-res-t99');

        if (r <= 0 || c <= 0) return;

        const tauSeconds = r * c;
        const fcHz = 1 / (2 * Math.PI * tauSeconds);
        const t50Seconds = tauSeconds * 0.693;
        const t99Seconds = tauSeconds * 5.0;

        function formatTime(s) {
            if (s >= 1) return s.toFixed(2) + ' s';
            if (s >= 1e-3) return (s * 1e3).toFixed(2) + ' ms';
            if (s >= 1e-6) return (s * 1e6).toFixed(2) + ' µs';
            return (s * 1e9).toFixed(2) + ' ns';
        }

        function formatFreq(hz) {
            if (hz >= 1e6) return (hz / 1e6).toFixed(2) + ' MHz';
            if (hz >= 1e3) return (hz / 1e3).toFixed(2) + ' kHz';
            return hz.toFixed(2) + ' Hz';
        }

        if (tauEl) tauEl.textContent = formatTime(tauSeconds);
        if (fcEl) fcEl.textContent = formatFreq(fcHz);
        if (t50El) t50El.textContent = formatTime(t50Seconds);
        if (t99El) t99El.textContent = formatTime(t99Seconds);
    }

    [rEl, ruEl, cEl, cuEl].forEach(el => {
        el.addEventListener('input', calcRc);
        el.addEventListener('change', calcRc);
    });

    calcRc();
}

// ==========================================================================
// 9. SMD-WIDERSTANDS-DECODER
// ==========================================================================
function initSmdDecoder() {
    const EIA96_CODES = {
        "01": 100, "02": 102, "03": 105, "04": 107, "05": 110, "06": 113, "07": 115, "08": 118, "09": 121, "10": 124,
        "11": 127, "12": 130, "13": 133, "14": 137, "15": 140, "16": 143, "17": 147, "18": 150, "19": 154, "20": 158,
        "21": 162, "22": 165, "23": 169, "24": 174, "25": 178, "26": 182, "27": 187, "28": 191, "29": 196, "30": 200,
        "31": 205, "32": 210, "33": 215, "34": 221, "35": 226, "36": 232, "37": 237, "38": 243, "39": 249, "40": 255,
        "41": 261, "42": 267, "43": 274, "44": 280, "45": 287, "46": 294, "47": 301, "48": 309, "49": 316, "50": 324,
        "51": 332, "52": 340, "53": 348, "54": 357, "55": 365, "56": 374, "57": 383, "58": 392, "59": 402, "60": 412,
        "61": 422, "62": 432, "63": 442, "64": 453, "65": 464, "66": 475, "67": 487, "68": 499, "69": 511, "70": 523,
        "71": 536, "72": 549, "73": 562, "74": 576, "75": 590, "76": 604, "77": 619, "78": 634, "79": 649, "80": 665,
        "81": 681, "82": 698, "83": 715, "84": 732, "85": 750, "86": 768, "87": 787, "88": 806, "89": 825, "90": 845,
        "91": 866, "92": 887, "93": 909, "94": 931, "95": 953, "96": 976
    };

    const EIA96_MULTS = {
        'Z': 0.001, 'Y': 0.01, 'X': 0.1, 'A': 1, 'B': 10, 'C': 100, 'D': 1000, 'E': 10000, 'F': 100000
    };

    const input = getEl('smd-input');
    const decodeBtn = getEl('smd-decode-btn');
    const valEl = getEl('smd-res-value');
    const detEl = getEl('smd-res-details');

    if (!input) return;

    function decodeSmd() {
        const code = input.value.trim().toUpperCase();
        if (!code) return;

        let ohms = null;
        let details = "";

        // R Decimal format: 4R7 (4.7), R050 (0.05), 10R (10)
        if (code.includes('R')) {
            const parts = code.split('R');
            const left = parts[0] ? parts[0] : '0';
            const right = parts[1] ? parts[1] : '0';
            ohms = parseFloat(`${left}.${right}`);
            details = `R-Dezimalschreibweise (${ohms} Ω)`;
        } else if (/^\d{3}$/.test(code)) {
            // 3-digit: 103 = 10 * 10^3
            const d = parseInt(code.substring(0, 2));
            const mult = Math.pow(10, parseInt(code[2]));
            ohms = d * mult;
            details = `3-stelliger Standardcode (${d} × 10^${code[2]} Ω, ±5%)`;
        } else if (/^\d{4}$/.test(code)) {
            // 4-digit: 4702 = 470 * 10^2
            const d = parseInt(code.substring(0, 3));
            const mult = Math.pow(10, parseInt(code[3]));
            ohms = d * mult;
            details = `4-stelliger Präzisionscode (${d} × 10^${code[3]} Ω, ±1%)`;
        } else if (code.length === 3 && EIA96_CODES[code.substring(0, 2)] && EIA96_MULTS[code[2]]) {
            // EIA-96: 01C = 100 * 100
            const base = EIA96_CODES[code.substring(0, 2)];
            const mult = EIA96_MULTS[code[2]];
            ohms = base * mult;
            details = `EIA-96 1% Präzisionscode (Basis ${base} × Multiplikator ${mult})`;
        } else {
            if (valEl) valEl.textContent = "Ungültiger Code";
            if (detEl) detEl.textContent = "Bitte 3/4-stelligen Code (z.B. 103, 4702), EIA-96 (01C) oder R-Notation (4R7) eingeben.";
            return;
        }

        if (valEl) valEl.textContent = fmtOhms(ohms);
        if (detEl) detEl.textContent = details;
    }

    if (decodeBtn) decodeBtn.onclick = decodeSmd;
    input.addEventListener('input', decodeSmd);
}

// ==========================================================================
// GENERAL CONVERTERS (Länge, Gewicht, Temp, etc.)
// ==========================================================================
function tempToBase(val, unit) {
    if (unit === 'C') return val;
    if (unit === 'F') return (val - 32) * 5 / 9;
    return val - 273.15;
}

function baseToTemp(celsius, unit) {
    if (unit === 'C') return celsius;
    if (unit === 'F') return celsius * 9 / 5 + 32;
    return celsius + 273.15;
}

function initConverters() {
    const panels = document.querySelectorAll('.conv-panel[data-units]');

    panels.forEach(panel => {
        const units = JSON.parse(panel.dataset.units);
        const isTemp = panel.dataset.special === 'temp';
        const inputs = [];

        units.forEach(([label, factor], idx) => {
            const row = document.createElement('div');
            row.className = 'conv-row';

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'cyber-input-field conv-input';
            input.placeholder = label;
            input.step = 'any';
            input.dataset.idx = idx;

            const unitLabel = document.createElement('span');
            unitLabel.className = 'conv-unit-label';
            unitLabel.textContent = label;

            row.appendChild(input);
            row.appendChild(unitLabel);
            panel.appendChild(row);
            inputs.push({ input, label, factor });
        });

        inputs.forEach((src, srcIdx) => {
            src.input.addEventListener('input', () => {
                const val = parseFloat(src.input.value);
                inputs.forEach((dst, dstIdx) => {
                    if (dstIdx === srcIdx) {
                        dst.input.classList.remove('conv-computed');
                        return;
                    }
                    if (isNaN(val) || src.input.value === '') {
                        dst.input.value = '';
                        dst.input.classList.remove('conv-computed');
                        return;
                    }
                    if (isTemp) {
                        const celsius = tempToBase(val, src.factor);
                        dst.input.value = fmt(baseToTemp(celsius, dst.factor));
                    } else {
                        const baseVal = val * src.factor;
                        dst.input.value = fmt(baseVal / dst.factor);
                    }
                    dst.input.classList.add('conv-computed');
                });
            });
        });
    });
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.conv-tab-btn');
    const panels = document.querySelectorAll('.conv-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = getEl(`conv-${btn.dataset.cat}`);
            if (panel) panel.classList.add('active');
        });
    });
}

function initElektrikSubtabs() {
    const elSubBtns = document.querySelectorAll('.el-subtab-btn');
    const elSubContents = document.querySelectorAll('.el-subtab-content');
    const groupPills = document.querySelectorAll('.el-group-pill');
    const searchInput = getEl('el-search-input');

    let currentGroup = 'all';
    let searchQuery = '';

    function filterTabs() {
        let firstVisible = null;
        let activeVisible = false;

        elSubBtns.forEach(btn => {
            const btnGroup = btn.dataset.group || 'basics';
            const tabId = btn.dataset.eltab;
            const content = getEl(tabId);
            const keywords = content ? (content.dataset.keywords || '') : '';
            const btnText = btn.textContent.toLowerCase();

            const matchesGroup = (currentGroup === 'all' || btnGroup === currentGroup);
            const matchesSearch = !searchQuery || btnText.includes(searchQuery) || keywords.includes(searchQuery);

            if (matchesGroup && matchesSearch) {
                btn.style.display = 'inline-block';
                if (!firstVisible) firstVisible = btn;
                if (btn.classList.contains('active')) activeVisible = true;
            } else {
                btn.style.display = 'none';
            }
        });

        // If currently active tab is hidden by filter, activate the first visible one
        if (!activeVisible && firstVisible) {
            activateTab(firstVisible);
        }
    }

    function activateTab(btn) {
        elSubBtns.forEach(b => b.classList.remove('active'));
        elSubContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = getEl(btn.dataset.eltab);
        if (target) target.classList.add('active');
    }

    elSubBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activateTab(btn);
        });
    });

    groupPills.forEach(pill => {
        pill.addEventListener('click', () => {
            groupPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentGroup = pill.dataset.elGroup || 'all';
            filterTabs();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            filterTabs();
        });
    }
}

// =============================================================================
// 14. WHEATSTONE-MESSBRÜCKE
// =============================================================================
function initWheatstoneBridge() {
    const vinEl = getEl('ws-vin');
    const r1El = getEl('ws-r1');
    const r2El = getEl('ws-r2');
    const r3El = getEl('ws-r3');
    const rxEl = getEl('ws-rx');
    const vdiagEl = getEl('ws-res-vdiag');
    const statusEl = getEl('ws-res-status');

    if (!vinEl || !r1El) return;

    function calculate() {
        const vin = parseFloat(vinEl.value) || 0;
        const r1 = parseFloat(r1El.value) || 0;
        const r2 = parseFloat(r2El.value) || 0;
        const r3 = parseFloat(r3El.value) || 0;
        const rx = parseFloat(rxEl.value) || 0;

        if (r1 + r2 === 0 || r3 + rx === 0) {
            if (vdiagEl) vdiagEl.innerText = '--';
            return;
        }

        // Bridge Diagonal Voltage Vg = Vin * (Rx / (R3 + Rx) - R2 / (R1 + R2))
        const va = vin * (r2 / (r1 + r2));
        const vb = vin * (rx / (r3 + rx));
        const vdiag = vb - va;

        if (vdiagEl) {
            if (Math.abs(vdiag) < 0.001) {
                vdiagEl.innerText = `${(vdiag * 1e6).toFixed(1)} µV`;
            } else if (Math.abs(vdiag) < 1) {
                vdiagEl.innerText = `${(vdiag * 1000).toFixed(2)} mV`;
            } else {
                vdiagEl.innerText = `${vdiag.toFixed(3)} V`;
            }
        }

        if (statusEl) {
            if (Math.abs(vdiag) < 0.0001) {
                statusEl.innerText = 'Abgeglichen (0 V)';
                statusEl.style.color = 'var(--neon-green)';
            } else {
                statusEl.innerText = `Verstimmt (${vdiag > 0 ? '+' : ''}${(vdiag * 1000).toFixed(1)} mV)`;
                statusEl.style.color = 'var(--neon-orange)';
            }
        }
    }

    [vinEl, r1El, r2El, r3El, rxEl].forEach(el => {
        if (el) el.addEventListener('input', calculate);
    });

    calculate();
}

// =============================================================================
// 15. IPC-2152 LEITERBAHN-BREITE (PCB TRACE WIDTH)
// =============================================================================
function initPcbTraceWidth() {
    const currentEl = getEl('pcb-current');
    const tempRiseEl = getEl('pcb-temp-rise');
    const copperOzEl = getEl('pcb-copper-oz');
    const layerEl = getEl('pcb-layer');
    const lengthEl = getEl('pcb-length');

    const widthMmEl = getEl('pcb-res-width-mm');
    const areaEl = getEl('pcb-res-area');
    const rEl = getEl('pcb-res-r');
    const dropEl = getEl('pcb-res-drop');

    if (!currentEl) return;

    function calculate() {
        const I = parseFloat(currentEl.value) || 1;
        const deltaT = parseFloat(tempRiseEl.value) || 10;
        const copperOz = parseFloat(copperOzEl.value) || 1;
        const isInternal = layerEl.value === 'internal';
        const lengthMm = parseFloat(lengthEl.value) || 50;

        // IPC-2152 Constants
        const k = isInternal ? 0.024 : 0.048;
        const b = 0.44;
        const c = 0.725;

        // Area in mils^2
        const areaMil2 = Math.pow(I / (k * Math.pow(deltaT, b)), 1 / c);
        // Copper thickness: 1 oz = 1.378 mils = 0.035 mm
        const thicknessMils = copperOz * 1.378;
        const widthMils = areaMil2 / thicknessMils;
        const widthMm = widthMils * 0.0254;
        const areaMm2 = (widthMm * (copperOz * 0.035));

        // Resistance calculation (rho copper = 1.72e-8 Ohm*m at 25C, adjusted for temp)
        const tempC = 25 + deltaT;
        const rhoCu = 1.72e-8 * (1 + 0.00393 * (tempC - 20));
        const lengthM = lengthMm / 1000;
        const areaM2 = areaMm2 * 1e-6;
        const R_wire = areaM2 > 0 ? (rhoCu * lengthM) / areaM2 : 0;

        const deltaV = I * R_wire;
        const powerW = I * I * R_wire;

        if (widthMmEl) widthMmEl.innerText = `${widthMm.toFixed(2)} mm (${widthMils.toFixed(1)} mil)`;
        if (areaEl) areaEl.innerText = `${areaMm2.toFixed(3)} mm² (${Math.round(areaMil2)} mil²)`;
        if (rEl) rEl.innerText = R_wire < 1 ? `${(R_wire * 1000).toFixed(1)} mΩ` : `${R_wire.toFixed(3)} Ω`;
        if (dropEl) dropEl.innerText = `${(deltaV * 1000).toFixed(1)} mV (${powerW.toFixed(2)} W)`;
    }

    [currentEl, tempRiseEl, lengthEl].forEach(el => {
        if (el) el.addEventListener('input', calculate);
    });
    [copperOzEl, layerEl].forEach(el => {
        if (el) el.addEventListener('change', calculate);
    });

    calculate();
}

// =============================================================================
// 16. OPERATIONSVERSTÄRKER (OP-AMP GAIN)
// =============================================================================
function initOpAmpCalculator() {
    const vinEl = getEl('opamp-vin');
    const r1El = getEl('opamp-r1');
    const r1uEl = getEl('opamp-r1-u');
    const rfEl = getEl('opamp-rf');
    const rfuEl = getEl('opamp-rf-u');
    const r1Label = getEl('opamp-r1-label');
    const schematicEl = getEl('opamp-schematic');

    const gainEl = getEl('opamp-res-gain');
    const gainDbEl = getEl('opamp-res-gain-db');
    const voutEl = getEl('opamp-res-vout');
    const modeBtns = document.querySelectorAll('.opamp-mode-btn');

    let mode = 'inverting';

    if (!vinEl || !r1El) return;

    function calculate() {
        const vin = parseFloat(vinEl.value) || 0;
        const r1 = (parseFloat(r1El.value) || 1) * parseFloat(r1uEl ? r1uEl.value : '1000');
        const rf = (parseFloat(rfEl.value) || 1) * parseFloat(rfuEl ? rfuEl.value : '1000');

        if (r1 <= 0) return;

        let gain = 0;
        let vout = 0;

        if (mode === 'inverting') {
            gain = - (rf / r1);
            vout = - (rf / r1) * vin;
            if (schematicEl) {
                schematicEl.innerHTML = `Vin ──[ Rin: ${fmtOhms(r1)} ]──┬──(-) ─┐<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├──► Vout (${vout.toFixed(2)}V)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ Rf: ${fmtOhms(rf)} ] │<br>GND ─────────────────────(+)────┘`;
            }
        } else {
            gain = 1 + (rf / r1);
            vout = (1 + (rf / r1)) * vin;
            if (schematicEl) {
                schematicEl.innerHTML = `Vin ────────(+) ─┐<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├──► Vout (${vout.toFixed(2)}V)<br>GND ──[ R1 ]──┬──(-) ─┘<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└──[ Rf: ${fmtOhms(rf)} ]──┘`;
            }
        }

        const gainDb = Math.abs(gain) > 0 ? 20 * Math.log10(Math.abs(gain)) : 0;

        if (gainEl) gainEl.innerText = `${gain.toFixed(2)} x`;
        if (gainDbEl) gainDbEl.innerText = `${gainDb.toFixed(2)} dB`;
        if (voutEl) {
            voutEl.innerText = `${vout.toFixed(2)} V`;
            voutEl.style.color = vout < 0 ? 'var(--neon-orange)' : 'var(--neon-green)';
        }
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.dataset.mode;
            if (r1Label) {
                r1Label.textContent = mode === 'inverting' ? 'Eingangswiderstand (Rin):' : 'Massewiderstand (R1):';
            }
            calculate();
        });
    });

    [vinEl, r1El, rfEl].forEach(el => {
        if (el) el.addEventListener('input', calculate);
    });
    [r1uEl, rfuEl].forEach(el => {
        if (el) el.addEventListener('change', calculate);
    });

    calculate();
}

// =============================================================================
// 17. KÜHLKÖRPER & THERMIK (R_TH)
// =============================================================================
function initHeatsinkCalculator() {
    const plossEl = getEl('hs-ploss');
    const tjmaxEl = getEl('hs-tjmax');
    const tambEl = getEl('hs-tamb');
    const rthjcEl = getEl('hs-rthjc');
    const rthcsEl = getEl('hs-rthcs');

    const rthEl = getEl('hs-res-rth');
    const statusEl = getEl('hs-res-status');
    const tcEl = getEl('hs-res-tc');

    if (!plossEl) return;

    function calculate() {
        const P = parseFloat(plossEl.value) || 0;
        const TjMax = parseFloat(tjmaxEl.value) || 125;
        const Tamb = parseFloat(tambEl.value) || 35;
        const RthJC = parseFloat(rthjcEl.value) || 1.8;
        const RthCS = parseFloat(rthcsEl.value) || 0.5;

        if (P <= 0 || TjMax <= Tamb) {
            if (rthEl) rthEl.innerText = '--';
            return;
        }

        // Total thermal resistance allowed: Rth_total = (TjMax - Tamb) / P
        const RthTotal = (TjMax - Tamb) / P;
        const RthHA = RthTotal - (RthJC + RthCS);

        // Case temperature Tc = TjMax - (P * RthJC)
        const Tc = TjMax - (P * RthJC);

        if (rthEl) {
            if (RthHA <= 0) {
                rthEl.innerText = "Nicht machbar (P zu hoch!)";
                rthEl.style.color = "var(--neon-red)";
            } else {
                rthEl.innerText = `${RthHA.toFixed(2)} K/W`;
                rthEl.style.color = "var(--neon-cyan)";
            }
        }

        if (statusEl) {
            if (RthHA <= 0) {
                statusEl.innerText = "Überhitzungsgefahr! Chip stirbt";
                statusEl.style.color = "var(--neon-red)";
            } else if (RthHA > 15) {
                statusEl.innerText = "Kein Kühlkörper nötig (Luft reicht)";
                statusEl.style.color = "var(--neon-green)";
            } else if (RthHA > 5) {
                statusEl.innerText = "Kleiner Passivkühlkörper ausreichend";
                statusEl.style.color = "var(--neon-green)";
            } else if (RthHA > 1.5) {
                statusEl.innerText = "Großer Passiv- oder Rippenkühlkörper";
                statusEl.style.color = "var(--neon-orange)";
            } else {
                statusEl.innerText = "Aktivkühlung (Lüfter) zwingend nötig";
                statusEl.style.color = "var(--neon-red)";
            }
        }

        if (tcEl) {
            tcEl.innerText = `${Tc.toFixed(1)} °C`;
        }
    }

    [plossEl, tjmaxEl, tambEl, rthjcEl, rthcsEl].forEach(el => {
        if (el) el.addEventListener('input', calculate);
    });

    calculate();
}

// =============================================================================
// 18. NE555 TIMER-IC
// =============================================================================
function initNe555Timer() {
    const r1El = getEl('ne555-r1');
    const r1uEl = getEl('ne555-r1-u');
    const r2El = getEl('ne555-r2');
    const r2uEl = getEl('ne555-r2-u');
    const r2Group = getEl('ne555-r2-group');
    const cEl = getEl('ne555-c');
    const cuEl = getEl('ne555-c-u');
    const r1Label = getEl('ne555-r1-label');
    const schematicEl = getEl('ne555-schematic');

    const freqEl = getEl('ne555-res-freq');
    const tEl = getEl('ne555-res-t');
    const dutyEl = getEl('ne555-res-duty');
    const thighEl = getEl('ne555-res-thigh');
    const tlowEl = getEl('ne555-res-tlow');
    const dutyLbl = getEl('ne555-res-lbl-duty');
    const thighLbl = getEl('ne555-res-lbl-thigh');
    const tlowLbl = getEl('ne555-res-lbl-tlow');
    const modeBtns = document.querySelectorAll('.ne555-mode-btn');

    let mode = 'astable';

    if (!r1El || !cEl) return;

    function formatTime(s) {
        if (s >= 1) return s.toFixed(2) + ' s';
        if (s >= 1e-3) return (s * 1e3).toFixed(2) + ' ms';
        if (s >= 1e-6) return (s * 1e6).toFixed(2) + ' µs';
        return (s * 1e9).toFixed(2) + ' ns';
    }

    function formatFreq(hz) {
        if (hz >= 1e6) return (hz / 1e6).toFixed(2) + ' MHz';
        if (hz >= 1e3) return (hz / 1e3).toFixed(2) + ' kHz';
        return hz.toFixed(2) + ' Hz';
    }

    function calculate() {
        const r1 = (parseFloat(r1El.value) || 0) * parseFloat(r1uEl ? r1uEl.value : '1000');
        const r2 = (parseFloat(r2El.value) || 0) * parseFloat(r2uEl ? r2uEl.value : '1000');
        const c = (parseFloat(cEl.value) || 0) * parseFloat(cuEl ? cuEl.value : '1e-9');

        if (c <= 0 || r1 <= 0) return;

        if (mode === 'astable') {
            if (r2 <= 0) return;
            const tHigh = 0.693 * (r1 + r2) * c;
            const tLow = 0.693 * r2 * c;
            const T = tHigh + tLow;
            const f = 1 / T;
            const duty = (tHigh / T) * 100;

            if (freqEl) freqEl.innerText = formatFreq(f);
            if (tEl) tEl.innerText = formatTime(T);
            if (dutyEl) dutyEl.innerText = `${duty.toFixed(1)} %`;
            if (thighEl) thighEl.innerText = formatTime(tHigh);
            if (tlowEl) tlowEl.innerText = formatTime(tLow);
        } else {
            // Monostable: pulse width t = 1.1 * R * C
            const tPulse = 1.1 * r1 * c;
            if (freqEl) freqEl.innerText = "Einmal-Impuls";
            if (tEl) tEl.innerText = formatTime(tPulse);
            if (dutyEl) dutyEl.innerText = "Single-Shot";
            if (thighEl) thighEl.innerText = formatTime(tPulse);
            if (tlowEl) tlowEl.innerText = "Wartet auf Trigger";
        }
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.dataset.mode;
            if (mode === 'monostable') {
                if (r2Group) r2Group.style.display = 'none';
                if (r1Label) r1Label.textContent = 'Zeit-Widerstand (R):';
                if (dutyLbl) dutyLbl.textContent = 'Modus:';
                if (thighLbl) thighLbl.textContent = 'Impulsdauer (t_pulse):';
                if (tlowLbl) tlowLbl.textContent = 'Ruhezustand:';
            } else {
                if (r2Group) r2Group.style.display = 'flex';
                if (r1Label) r1Label.textContent = 'Widerstand R1:';
                if (dutyLbl) dutyLbl.textContent = 'Tastverhältnis (Duty Cycle):';
                if (thighLbl) thighLbl.textContent = 'High-Zeit (t_high):';
                if (tlowLbl) tlowLbl.textContent = 'Low-Zeit (t_low):';
            }
            calculate();
        });
    });

    [r1El, r2El, cEl].forEach(el => {
        if (el) el.addEventListener('input', calculate);
    });
    [r1uEl, r2uEl, cuEl].forEach(el => {
        if (el) el.addEventListener('change', calculate);
    });

    calculate();
}

// =============================================================================
// 19. LM317 SPANNUNGSREGLER
// =============================================================================
function initLm317Calculator() {
    const vinEl = getEl('lm317-vin');
    const r1El = getEl('lm317-r1');
    const r2El = getEl('lm317-r2');
    const iloadEl = getEl('lm317-iload');

    const voutEl = getEl('lm317-res-vout');
    const pdropEl = getEl('lm317-res-pdrop');
    const vdropEl = getEl('lm317-res-vdrop');
    const recEl = getEl('lm317-res-rec');

    if (!r1El || !r2El) return;

    function calculate() {
        const vin = parseFloat(vinEl?.value) || 12;
        const r1 = parseFloat(r1El.value) || 240;
        const r2 = parseFloat(r2El.value) || 0;
        const iload = parseFloat(iloadEl?.value) || 0.5;

        if (r1 <= 0) return;

        // Vout = 1.25 * (1 + R2 / R1) + Iadj * R2 (Iadj ~ 50uA)
        const iadj = 50e-6;
        const vout = 1.25 * (1 + r2 / r1) + (iadj * r2);
        const vdrop = Math.max(0, vin - vout);
        const pdrop = vdrop * iload;

        if (voutEl) voutEl.innerText = `${vout.toFixed(2)} V`;
        if (vdropEl) vdropEl.innerText = `${vdrop.toFixed(2)} V`;
        if (pdropEl) {
            pdropEl.innerText = `${pdrop.toFixed(2)} W`;
            pdropEl.style.color = pdrop > 5 ? 'var(--neon-red)' : pdrop > 2 ? 'var(--neon-orange)' : 'var(--neon-green)';
        }

        // Recommend standard R2 for target 3.3V, 5V, 9V, 12V
        if (recEl) {
            let idealR2_5v = Math.round(((5.0 / 1.25) - 1) * r1);
            recEl.innerText = `Für 5V: R2 ≈ ${idealR2_5v} Ω | Für 3.3V: R2 ≈ ${Math.round(((3.3 / 1.25) - 1) * r1)} Ω`;
        }
    }

    [vinEl, r1El, r2El, iloadEl].forEach(el => {
        if (el) el.addEventListener('input', calculate);
    });

    calculate();
}

// =============================================================================
// 20. SMD-KONDENSATOR CODES
// =============================================================================
function initSmdCapDecoder() {
    const input = getEl('smdcap-code');
    const calcBtn = getEl('smdcap-calc-btn');
    const pfEl = getEl('smdcap-res-pf');
    const nfEl = getEl('smdcap-res-nf');
    const ufEl = getEl('smdcap-res-uf');
    const tolEl = getEl('smdcap-res-tol');
    const presetBtns = document.querySelectorAll('.smdcap-preset-btn');

    if (!input) return;

    const TOLERANCES = {
        'B': '±0.1 pF',
        'C': '±0.25 pF',
        'D': '±0.5 pF',
        'F': '±1 %',
        'G': '±2 %',
        'J': '±5 %',
        'K': '±10 %',
        'M': '±20 %',
        'Z': '+80 % / -20 %'
    };

    function decode() {
        const raw = input.value.trim().toUpperCase();
        if (!raw) return;

        let code = raw;
        let tolChar = '';

        if (/[A-Z]$/.test(code)) {
            tolChar = code.slice(-1);
            code = code.slice(0, -1);
        }

        let pf = 0;
        if (/^\d{3}$/.test(code)) {
            const base = parseInt(code.slice(0, 2));
            const exp = parseInt(code.slice(2));
            pf = base * Math.pow(10, exp);
        } else if (/^\d{1,2}$/.test(code)) {
            pf = parseFloat(code);
        } else if (code.includes('P') || code.includes('N') || code.includes('U')) {
            // e.g. 4P7 = 4.7 pF, 2N2 = 2.2 nF
            if (code.includes('P')) pf = parseFloat(code.replace('P', '.'));
            else if (code.includes('N')) pf = parseFloat(code.replace('N', '.')) * 1000;
            else if (code.includes('U')) pf = parseFloat(code.replace('U', '.')) * 1000000;
        } else {
            if (pfEl) pfEl.innerText = 'Ungültig';
            return;
        }

        const nf = pf / 1000;
        const uf = pf / 1000000;

        if (pfEl) pfEl.innerText = `${pf.toLocaleString('de-DE')} pF`;
        if (nfEl) nfEl.innerText = `${nf < 1 ? nf.toFixed(3) : nf.toLocaleString('de-DE')} nF`;
        if (ufEl) ufEl.innerText = `${uf < 0.01 ? uf.toFixed(4) : uf.toLocaleString('de-DE')} µF`;
        if (tolEl) tolEl.innerText = TOLERANCES[tolChar] ? `${TOLERANCES[tolChar]} (${tolChar})` : 'Keine Toleranz';
    }

    if (calcBtn) calcBtn.addEventListener('click', decode);
    input.addEventListener('input', decode);

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.code;
            decode();
        });
    });

    decode();
}

function initGeometry() {
    const aEl = getEl('geo-a');
    const bEl = getEl('geo-b');
    const cEl = getEl('geo-c');
    if (!aEl || !bEl || !cEl) return;

    const formulaEl = getEl('geo-formula');
    const usedEl = getEl('geo-formula-used');
    const subEl = getEl('geo-formula-sub');
    const areaEl = getEl('geo-area');
    const periEl = getEl('geo-peri');
    const heightEl = getEl('geo-height');
    const errEl = getEl('geo-error');
    const clearBtn = getEl('geo-clear');
    const fields = { a: aEl, b: bEl, c: cEl };
    let editHistory = [];

    function valOf(key) {
        const raw = fields[key].value;
        if (raw === '' || raw == null) return undefined;
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : undefined;
    }

    function render() {
        const given = {};
        editHistory.forEach((k) => {
            const v = valOf(k);
            if (v !== undefined) given[k] = v;
        });
        if (editHistory.length < 2) {
            const leftover = Object.keys(fields).find((k) => !editHistory.includes(k));
            if (leftover) {
                fields[leftover].value = '';
                fields[leftover].classList.remove('conv-computed', 'conv-error');
            }
            if (formulaEl) formulaEl.textContent = 'a² + b² = c²';
            if (usedEl) usedEl.textContent = 'c = √(a² + b²)';
            if (subEl) subEl.textContent = '—';
            if (areaEl) areaEl.textContent = 'A = ½·a·b = —';
            if (periEl) periEl.textContent = 'U = a+b+c = —';
            if (heightEl) heightEl.textContent = 'h = (a·b)/c = —';
            if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
            Object.values(fields).forEach((el) => el.classList.remove('conv-error'));
            return;
        }

        const result = solvePythagoras(given);
        Object.values(fields).forEach((el) => el.classList.remove('conv-error', 'conv-computed'));
        if (!result.ok) {
            if (errEl) {
                errEl.hidden = !result.error;
                errEl.textContent = result.error || '';
            }
            if (result.error) {
                Object.keys(fields).forEach((k) => {
                    if (!editHistory.includes(k)) fields[k].classList.add('conv-error');
                });
            }
            if (usedEl) usedEl.textContent = result.formula;
            if (subEl) subEl.textContent = result.substituted || '—';
            return;
        }
        if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        ['a', 'b', 'c'].forEach((k) => {
            if (!editHistory.includes(k)) {
                fields[k].value = fmtGeo(result[k]);
                fields[k].classList.add('conv-computed');
            }
        });
        if (formulaEl) formulaEl.textContent = result.formula;
        if (usedEl) usedEl.textContent = result.used || result.formula;
        if (subEl) subEl.textContent = result.substituted || '—';
        if (areaEl) areaEl.textContent = `A = ½·a·b = ${fmtGeo(result.area)}`;
        if (periEl) periEl.textContent = `U = a+b+c = ${fmtGeo(result.perimeter)}`;
        if (heightEl) heightEl.textContent = `h = (a·b)/c = ${fmtGeo(result.height)}`;
    }

    Object.entries(fields).forEach(([key, el]) => {
        el.addEventListener('input', () => {
            editHistory = editHistory.filter((k) => k !== key);
            if (el.value !== '' && !isNaN(parseFloat(el.value))) {
                editHistory.push(key);
                if (editHistory.length > 2) editHistory.shift();
            }
            render();
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            Object.values(fields).forEach((el) => {
                el.value = '';
                el.classList.remove('conv-computed', 'conv-error');
            });
            editHistory = [];
            render();
        });
    }
}

export function initRechner() {
    initTabs();
    initElektrikSubtabs();
    initOhmPower();
    initFarbcodeDecoder();
    initLedResistor();
    initKabelquerschnitt();
    initSpannungsteiler();
    initAkkulaufzeit();
    initCircuitSolver();
    initRcFilter();
    initSmdDecoder();
    initWheatstoneBridge();
    initPcbTraceWidth();
    initOpAmpCalculator();
    initHeatsinkCalculator();
    initNe555Timer();
    initLm317Calculator();
    initSmdCapDecoder();
    initHfDbmConverter();
    initAntennaDipole();
    initDownloadCalculator();
    initConverters();
    initGeometry();
}

// =============================================================================
// 10. HF- & DBM-KONVERTER (50Ω / 75Ω)
// =============================================================================
function initHfDbmConverter() {
    const dbmEl = getEl('hf-val-dbm');
    const mwEl = getEl('hf-val-mw');
    const wattEl = getEl('hf-val-watt');
    const vrmsEl = getEl('hf-val-vrms');
    const dbuvEl = getEl('hf-val-dbuv');
    const impEl = getEl('hf-impedance');

    if (!dbmEl) return;

    let isUpdating = false;

    function getZ() {
        return parseFloat(impEl ? impEl.value : '50');
    }

    function updateFromDbm(dbm) {
        if (isNaN(dbm)) return;
        const Z = getZ();
        const mw = Math.pow(10, dbm / 10);
        const watt = mw / 1000;
        const vrms = Math.sqrt(watt * Z);
        const dbuv = vrms > 0 ? 20 * Math.log10(vrms * 1e6) : 0;

        if (mwEl) mwEl.value = fmt(mw);
        if (wattEl) wattEl.value = fmt(watt);
        if (vrmsEl) vrmsEl.value = fmt(vrms);
        if (dbuvEl) dbuvEl.value = fmt(dbuv);
    }

    dbmEl.addEventListener('input', () => {
        if (isUpdating) return;
        isUpdating = true;
        updateFromDbm(parseFloat(dbmEl.value));
        isUpdating = false;
    });

    mwEl.addEventListener('input', () => {
        if (isUpdating) return;
        isUpdating = true;
        const mw = parseFloat(mwEl.value);
        if (!isNaN(mw) && mw > 0) {
            const dbm = 10 * Math.log10(mw);
            dbmEl.value = fmt(dbm);
            updateFromDbm(dbm);
        }
        isUpdating = false;
    });

    wattEl.addEventListener('input', () => {
        if (isUpdating) return;
        isUpdating = true;
        const watt = parseFloat(wattEl.value);
        if (!isNaN(watt) && watt > 0) {
            const dbm = 10 * Math.log10(watt * 1000);
            dbmEl.value = fmt(dbm);
            updateFromDbm(dbm);
        }
        isUpdating = false;
    });

    vrmsEl.addEventListener('input', () => {
        if (isUpdating) return;
        isUpdating = true;
        const v = parseFloat(vrmsEl.value);
        const Z = getZ();
        if (!isNaN(v) && v > 0) {
            const watt = (v * v) / Z;
            const dbm = 10 * Math.log10(watt * 1000);
            dbmEl.value = fmt(dbm);
            updateFromDbm(dbm);
        }
        isUpdating = false;
    });

    if (impEl) {
        impEl.addEventListener('change', () => {
            const dbm = parseFloat(dbmEl.value);
            if (!isNaN(dbm)) updateFromDbm(dbm);
        });
    }

    // Set standard default: 0 dBm = 1 mW
    dbmEl.value = "0";
    updateFromDbm(0);
}

// =============================================================================
// 11. WELLENLÄNGE & ANTENNEN-DIPOL
// =============================================================================
function initAntennaDipole() {
    const freqInput = getEl('ant-freq');
    const vfInput = getEl('ant-vf');
    const lambdaVal = getEl('ant-res-lambda');
    const halfVal = getEl('ant-res-half');
    const quarterVal = getEl('ant-res-quarter');
    const presetBtns = document.querySelectorAll('.ant-preset-btn');

    if (!freqInput) return;

    function calculate() {
        const fMHz = parseFloat(freqInput.value);
        const vf = parseFloat(vfInput ? vfInput.value : '0.95');

        if (isNaN(fMHz) || fMHz <= 0) {
            if (lambdaVal) lambdaVal.innerText = '0 m';
            if (halfVal) halfVal.innerText = '0 cm';
            if (quarterVal) quarterVal.innerText = '0 cm';
            return;
        }

        const c = 299.792458; // Speed of light in Mm/s (or m / us)
        const lambdaM = c / fMHz;
        const halfCm = (lambdaM / 2) * vf * 100;
        const quarterCm = (lambdaM / 4) * vf * 100;

        if (lambdaVal) lambdaVal.innerText = lambdaM >= 1 ? `${lambdaM.toFixed(3)} m` : `${(lambdaM * 100).toFixed(2)} cm`;
        if (halfVal) halfVal.innerText = halfCm >= 100 ? `${(halfCm / 100).toFixed(3)} m` : `${halfCm.toFixed(2)} cm`;
        if (quarterVal) quarterVal.innerText = quarterCm >= 100 ? `${(quarterCm / 100).toFixed(3)} m` : `${quarterCm.toFixed(2)} cm`;
    }

    freqInput.addEventListener('input', calculate);
    if (vfInput) vfInput.addEventListener('input', calculate);

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            freqInput.value = btn.dataset.freq;
            calculate();
        });
    });

    calculate();
}

// =============================================================================
// 12. DOWNLOADZEIT- & DATENRATEN-RECHNER
// =============================================================================
function initDownloadCalculator() {
    const sizeValEl = getEl('dl-size-val');
    const sizeUnitEl = getEl('dl-size-unit');
    const speedValEl = getEl('dl-speed-val');
    const speedUnitEl = getEl('dl-speed-unit');
    const overheadCb = getEl('dl-overhead');
    const resultTimeEl = getEl('dl-time-result');
    const resultByteRateEl = getEl('dl-byterate-result');

    if (!sizeValEl) return;

    function calculate() {
        const size = parseFloat(sizeValEl.value);
        const sizeUnit = parseFloat(sizeUnitEl ? sizeUnitEl.value : '1073741824'); // Default GB in bytes
        const speed = parseFloat(speedValEl ? speedValEl.value : '100');
        const speedUnit = parseFloat(speedUnitEl ? speedUnitEl.value : '1000000'); // Default Mbit/s in bits/s
        const withOverhead = overheadCb ? overheadCb.checked : true;

        if (isNaN(size) || isNaN(speed) || size <= 0 || speed <= 0) {
            if (resultTimeEl) resultTimeEl.innerText = '--';
            if (resultByteRateEl) resultByteRateEl.innerText = '--';
            return;
        }

        const totalBytes = size * sizeUnit;
        const totalBits = totalBytes * 8 * (withOverhead ? 1.05 : 1.0);
        const bitsPerSec = speed * speedUnit;

        const seconds = totalBits / bitsPerSec;
        const byteSpeedMBs = (bitsPerSec / 8) / (1024 * 1024);

        if (resultByteRateEl) {
            resultByteRateEl.innerText = `${byteSpeedMBs.toFixed(2)} MB/s (${(bitsPerSec / 1e6).toFixed(1)} Mbit/s)`;
        }

        if (resultTimeEl) {
            if (seconds < 1) {
                resultTimeEl.innerText = "< 1 Sekunde";
            } else if (seconds < 60) {
                resultTimeEl.innerText = `${Math.ceil(seconds)} Sekunden`;
            } else if (seconds < 3600) {
                const m = Math.floor(seconds / 60);
                const s = Math.ceil(seconds % 60);
                resultTimeEl.innerText = `${m} Min. ${s} Sek.`;
            } else if (seconds < 86400) {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                resultTimeEl.innerText = `${h} Std. ${m} Min.`;
            } else {
                const d = Math.floor(seconds / 86400);
                const h = Math.floor((seconds % 86400) / 3600);
                resultTimeEl.innerText = `${d} Tage ${h} Std.`;
            }
        }
    }

    sizeValEl.addEventListener('input', calculate);
    if (sizeUnitEl) sizeUnitEl.addEventListener('change', calculate);
    if (speedValEl) speedValEl.addEventListener('input', calculate);
    if (speedUnitEl) speedUnitEl.addEventListener('change', calculate);
    if (overheadCb) overheadCb.addEventListener('change', calculate);

    calculate();
}


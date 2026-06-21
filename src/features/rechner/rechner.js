import { getEl } from '../../core/ui.js';

function fmt(val) {
    if (val === 0) return '0';
    const abs = Math.abs(val);
    if (abs >= 1e12) return val.toExponential(4);
    if (abs >= 1e6) return Number(val.toPrecision(8)).toString();
    if (abs >= 1) return Number(val.toFixed(6)).toString();
    if (abs >= 0.001) return Number(val.toFixed(8)).toString();
    return val.toExponential(4);
}

function initElektrik() {
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
        fields[key].el.style.borderColor = 'var(--neon-cyan)';
        fields[key].el.style.boxShadow = '0 0 8px rgba(0, 242, 255, 0.3)';
    }

    function resetStyle(key) {
        fields[key].el.style.boxShadow = 'none';
        fields[key].el.style.borderColor = 'var(--glass-border)';
    }

    function calculate() {
        if (editHistory.length < 2) return;

        const k1 = editHistory[0], k2 = editHistory[1];
        const v1 = getBaseVal(k1), v2 = getBaseVal(k2);
        if (isNaN(v1) || isNaN(v2)) return;

        const results = {};
        const pair = [k1, k2].sort().join('');

        if (pair === 'IU') {
            if (v2 !== 0) { results.R = v1 / v2; results.P = v1 * v2; }
            else if (k1 === 'U' && k2 === 'I') { if (v2 !== 0) { results.R = v1/v2; results.P = v1*v2; } }
        } else if (pair === 'RU') {
            const U = k1 === 'U' ? v1 : v2, R = k1 === 'R' ? v1 : v2;
            if (R !== 0) { results.I = U / R; results.P = (U * U) / R; }
        } else if (pair === 'PU') {
            const U = k1 === 'U' ? v1 : v2, P = k1 === 'P' ? v1 : v2;
            if (U !== 0) { results.I = P / U; results.R = (U * U) / P; }
        } else if (pair === 'IR') {
            const I = k1 === 'I' ? v1 : v2, R = k1 === 'R' ? v1 : v2;
            results.U = I * R; results.P = I * I * R;
        } else if (pair === 'IP') {
            const I = k1 === 'I' ? v1 : v2, P = k1 === 'P' ? v1 : v2;
            if (I !== 0) { results.U = P / I; results.R = P / (I * I); }
        } else if (pair === 'PR') {
            const R = k1 === 'R' ? v1 : v2, P = k1 === 'P' ? v1 : v2;
            if (R > 0 && P >= 0) { results.I = Math.sqrt(P / R); results.U = Math.sqrt(P * R); }
        }

        Object.keys(fields).forEach(k => {
            if (k !== k1 && k !== k2 && results[k] !== undefined) {
                setBaseVal(k, results[k]);
            }
        });
    }

    Object.entries(fields).forEach(([key, field]) => {
        field.el.addEventListener('input', () => {
            resetStyle(key);
            const val = parseFloat(field.el.value);
            editHistory = editHistory.filter(k => k !== key);
            if (!isNaN(val)) {
                editHistory.push(key);
                if (editHistory.length > 2) {
                    const dropped = editHistory.shift();
                    resetStyle(dropped);
                }
            }
            calculate();
        });

        field.unit.addEventListener('change', () => {
            if (editHistory.includes(key)) calculate();
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            Object.entries(fields).forEach(([key, field]) => {
                field.el.value = '';
                resetStyle(key);
            });
            editHistory = [];
        });
    }
}

function initConverters() {
    const categories = ['laenge', 'gewicht', 'temperatur', 'daten', 'speed', 'druck', 'zeit', 'flaeche'];

    categories.forEach(cat => {
        const input = getEl(`conv-${cat}-input`);
        const select = getEl(`conv-${cat}-unit`);
        const results = getEl(`conv-${cat}-results`);
        if (!input || !select || !results) return;

        function convert() {
            const val = parseFloat(input.value);
            results.innerHTML = '';
            if (isNaN(val)) return;

            if (cat === 'temperatur') {
                convertTemperature(val, select.value, results);
                return;
            }

            const srcFactor = parseFloat(select.value);
            const baseVal = val * srcFactor;
            const options = select.querySelectorAll('option');

            options.forEach(opt => {
                if (opt.value === select.value) return;
                const targetFactor = parseFloat(opt.value);
                const converted = baseVal / targetFactor;
                const row = document.createElement('div');
                row.className = 'conv-result-row';
                row.innerHTML = `<span class="conv-result-val">${fmt(converted)}</span><span class="conv-result-unit">${opt.textContent}</span>`;
                results.appendChild(row);
            });
        }

        input.addEventListener('input', convert);
        select.addEventListener('change', convert);
    });
}

function convertTemperature(val, fromUnit, container) {
    let celsius;
    if (fromUnit === 'C') celsius = val;
    else if (fromUnit === 'F') celsius = (val - 32) * 5 / 9;
    else celsius = val - 273.15;

    const conversions = [];
    if (fromUnit !== 'C') conversions.push({ val: celsius, unit: '°C' });
    if (fromUnit !== 'F') conversions.push({ val: celsius * 9 / 5 + 32, unit: '°F' });
    if (fromUnit !== 'K') conversions.push({ val: celsius + 273.15, unit: 'K' });

    conversions.forEach(c => {
        const row = document.createElement('div');
        row.className = 'conv-result-row';
        row.innerHTML = `<span class="conv-result-val">${fmt(c.val)}</span><span class="conv-result-unit">${c.unit}</span>`;
        container.appendChild(row);
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

export function initRechner() {
    initTabs();
    initElektrik();
    initConverters();
}

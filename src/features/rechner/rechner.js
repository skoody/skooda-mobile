import { getEl } from '../../core/ui.js';

function fmt(val) {
    if (val === 0) return '0';
    const abs = Math.abs(val);
    if (abs >= 1e15) return val.toExponential(4);
    if (abs >= 1e6) return Number(val.toPrecision(10)).toString();
    if (abs >= 1) return Number(val.toFixed(6)).toString();
    if (abs >= 0.0001) return Number(val.toFixed(10)).toString();
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
        fields[key].el.classList.add('conv-computed');
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
        } else if (pair === 'RU') {
            const U = v1 * (k1 === 'U') + v2 * (k2 === 'U' ? 1 : 0) || (k1 === 'U' ? v1 : v2);
            const R = k1 === 'R' ? v1 : v2;
            const Uv = k1 === 'U' ? v1 : v2;
            if (R !== 0) { results.I = Uv / R; results.P = (Uv * Uv) / R; }
        } else if (pair === 'PU') {
            const Uv = k1 === 'U' ? v1 : v2, P = k1 === 'P' ? v1 : v2;
            if (Uv !== 0) { results.I = P / Uv; results.R = (Uv * Uv) / P; }
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

export function initRechner() {
    initTabs();
    initElektrik();
    initConverters();
}

import { getEl } from '../../core/ui.js';

export function initRechner() {
    const uInput = getEl('calc-voltage');
    const iInput = getEl('calc-current');
    const rInput = getEl('calc-resistance');
    const pInput = getEl('calc-power');
    const clearBtn = getEl('calc-clear');

    if (!uInput || !iInput || !rInput || !pInput) return;

    let editHistory = [];

    const inputs = {
        U: { el: uInput, key: 'U' },
        I: { el: iInput, key: 'I' },
        R: { el: rInput, key: 'R' },
        P: { el: pInput, key: 'P' }
    };

    Object.values(inputs).forEach(item => {
        item.el.addEventListener('input', () => {
            const val = parseFloat(item.el.value);
            
            // Remove highlighting of auto-computed values when user starts manually editing
            item.el.style.boxShadow = 'none';
            item.el.style.borderColor = 'var(--glass-border)';

            if (isNaN(val)) {
                editHistory = editHistory.filter(k => k !== item.key);
            } else {
                editHistory = editHistory.filter(k => k !== item.key);
                editHistory.push(item.key);
                if (editHistory.length > 2) {
                    const droppedKey = editHistory.shift();
                    const droppedInput = inputs[droppedKey];
                    if (droppedInput) {
                        droppedInput.el.style.boxShadow = 'none';
                        droppedInput.el.style.borderColor = 'var(--glass-border)';
                    }
                }
            }

            calculate();
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            Object.values(inputs).forEach(item => {
                item.el.value = '';
                item.el.style.boxShadow = 'none';
                item.el.style.borderColor = 'var(--glass-border)';
            });
            editHistory = [];
        });
    }

    function calculate() {
        if (editHistory.length < 2) return;

        const key1 = editHistory[0];
        const key2 = editHistory[1];

        const val1 = parseFloat(inputs[key1].el.value);
        const val2 = parseFloat(inputs[key2].el.value);

        if (isNaN(val1) || isNaN(val2)) return;

        let results = {};

        if (key1 === 'U' && key2 === 'I' || key1 === 'I' && key2 === 'U') {
            const U = key1 === 'U' ? val1 : val2;
            const I = key1 === 'I' ? val1 : val2;
            if (I !== 0) {
                results.R = U / I;
                results.P = U * I;
            }
        } 
        else if (key1 === 'U' && key2 === 'R' || key1 === 'R' && key2 === 'U') {
            const U = key1 === 'U' ? val1 : val2;
            const R = key1 === 'R' ? val1 : val2;
            if (R !== 0) {
                results.I = U / R;
                results.P = (U * U) / R;
            }
        } 
        else if (key1 === 'U' && key2 === 'P' || key1 === 'P' && key2 === 'U') {
            const U = key1 === 'U' ? val1 : val2;
            const P = key1 === 'P' ? val1 : val2;
            if (U !== 0) {
                results.I = P / U;
                results.R = (U * U) / P;
            }
        } 
        else if (key1 === 'I' && key2 === 'R' || key1 === 'R' && key2 === 'I') {
            const I = key1 === 'I' ? val1 : val2;
            const R = key1 === 'R' ? val1 : val2;
            results.U = I * R;
            results.P = I * I * R;
        } 
        else if (key1 === 'I' && key2 === 'P' || key1 === 'P' && key2 === 'I') {
            const I = key1 === 'I' ? val1 : val2;
            const P = key1 === 'P' ? val1 : val2;
            if (I !== 0) {
                results.U = P / I;
                results.R = P / (I * I);
            }
        } 
        else if (key1 === 'R' && key2 === 'P' || key1 === 'P' && key2 === 'R') {
            const R = key1 === 'R' ? val1 : val2;
            const P = key1 === 'P' ? val1 : val2;
            if (R > 0 && P >= 0) {
                results.I = Math.sqrt(P / R);
                results.U = Math.sqrt(P * R);
            }
        }

        // Apply results and highlight them in cyan
        Object.keys(inputs).forEach(k => {
            if (k !== key1 && k !== key2 && results[k] !== undefined) {
                const targetInput = inputs[k];
                targetInput.el.value = Number(results[k].toFixed(4));
                targetInput.el.style.borderColor = 'var(--neon-cyan)';
                targetInput.el.style.boxShadow = '0 0 8px rgba(0, 242, 255, 0.3)';
            }
        });
    }
}

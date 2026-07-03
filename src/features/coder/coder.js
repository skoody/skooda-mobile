import { getEl } from '../../core/ui.js';

let currentMode = 'encode'; // 'encode' or 'decode'
let currentType = 'base64'; // 'base64' or 'binary'

// Helper for UTF-8 Base64 encoding
function utf8ToBase64(str) {
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    } catch (e) {
        return '';
    }
}

// Helper for UTF-8 Base64 decoding
function base64ToUtf8(str) {
    try {
        return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        throw new Error('Ungültiges Base64-Format');
    }
}

// Helper for UTF-8 Binary encoding
function utf8ToBinary(str) {
    try {
        return Array.from(new TextEncoder().encode(str))
            .map(byte => byte.toString(2).padStart(8, '0'))
            .join(' ');
    } catch (e) {
        return '';
    }
}

// Helper for UTF-8 Binary decoding
function binaryToUtf8(binStr) {
    try {
        // Remove spaces, newlines, and other formatting characters
        const cleanBin = binStr.replace(/[^01]/g, '');
        if (cleanBin.length === 0) return '';
        if (cleanBin.length % 8 !== 0) {
            throw new Error('Ungültige Bit-Anzahl (Muss ein Vielfaches von 8 sein)');
        }
        const bytes = [];
        for (let i = 0; i < cleanBin.length; i += 8) {
            const byteVal = parseInt(cleanBin.slice(i, i + 8), 2);
            bytes.push(byteVal);
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
    } catch (e) {
        throw new Error(e.message || 'Ungültiges Binär-Format');
    }
}

function performConversion() {
    const inputEl = getEl('coder-input');
    const outputEl = getEl('coder-output');
    if (!inputEl || !outputEl) return;

    const inputVal = inputEl.value;
    if (!inputVal) {
        outputEl.value = '';
        outputEl.classList.remove('conv-error');
        return;
    }

    try {
        let result = '';
        if (currentMode === 'encode') {
            if (currentType === 'base64') {
                result = utf8ToBase64(inputVal);
            } else {
                result = utf8ToBinary(inputVal);
            }
        } else {
            if (currentType === 'base64') {
                result = base64ToUtf8(inputVal);
            } else {
                result = binaryToUtf8(inputVal);
            }
        }
        outputEl.value = result;
        outputEl.classList.remove('conv-error');
    } catch (err) {
        outputEl.value = `Fehler: ${err.message}`;
        outputEl.classList.add('conv-error');
    }
}

function updateLabels() {
    const inputLabel = getEl('coder-input-label');
    const outputLabel = getEl('coder-output-label');
    if (!inputLabel || !outputLabel) return;

    if (currentMode === 'encode') {
        inputLabel.textContent = 'KLARTEXT (EINGABE):';
        outputLabel.textContent = currentType === 'base64' ? 'BASE64 (AUSGABE):' : 'BINÄRCODE (AUSGABE):';
    } else {
        inputLabel.textContent = currentType === 'base64' ? 'BASE64 (EINGABE):' : 'BINÄRCODE (EINGABE):';
        outputLabel.textContent = 'KLARTEXT (AUSGABE):';
    }
}

export function initCoder() {
    const inputEl = getEl('coder-input');
    const outputEl = getEl('coder-output');
    const modeBtns = document.querySelectorAll('.coder-mode-btn');
    const typeBtns = document.querySelectorAll('.coder-type-btn');
    const swapBtn = getEl('coder-swap');
    const clearBtn = getEl('coder-clear');
    const copyBtn = getEl('coder-copy');

    if (!inputEl) return;

    // Real-time input handling
    inputEl.addEventListener('input', performConversion);

    // Mode Buttons (Encode/Decode)
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateLabels();
            performConversion();
        });
    });

    // Type Buttons (Base64/Binary)
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            updateLabels();
            performConversion();
        });
    });

    // Swap input/output and mode
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const inputVal = inputEl.value;
            const outputVal = outputEl.value;

            if (outputEl.classList.contains('conv-error') || !outputVal) return;

            // Toggle mode
            currentMode = currentMode === 'encode' ? 'decode' : 'encode';
            
            // Update mode buttons UI
            modeBtns.forEach(btn => {
                if (btn.dataset.mode === currentMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            inputEl.value = outputVal;
            updateLabels();
            performConversion();
        });
    }

    // Clear Button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputEl.value = '';
            outputEl.value = '';
            outputEl.classList.remove('conv-error');
        });
    }

    // Copy Button
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!outputEl.value || outputEl.classList.contains('conv-error')) return;
            navigator.clipboard.writeText(outputEl.value).then(() => {
                const oldText = copyBtn.textContent;
                copyBtn.textContent = '✅ Kopiert!';
                copyBtn.style.borderColor = 'var(--neon-cyan)';
                setTimeout(() => {
                    copyBtn.textContent = oldText;
                    copyBtn.style.borderColor = '';
                }, 1500);
            }).catch(err => {
                console.error('Copy failed: ', err);
            });
        });
    }
}

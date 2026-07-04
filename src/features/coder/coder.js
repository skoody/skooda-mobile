import { getEl } from '../../core/ui.js';

let currentMode = 'encode'; // 'encode' or 'decode'
let currentType = 'base64'; // 'base64', 'binary', 'hex', 'md5', 'sha1', 'sha256'

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

// Helper for UTF-8 Hex encoding
function utf8ToHex(str) {
    try {
        return Array.from(new TextEncoder().encode(str))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(' ');
    } catch (e) {
        return '';
    }
}

// Helper for UTF-8 Hex decoding
function hexToUtf8(hexStr) {
    try {
        const cleanHex = hexStr.replace(/[^0-9A-Fa-f]/g, '');
        if (cleanHex.length === 0) return '';
        if (cleanHex.length % 2 !== 0) {
            throw new Error('Ungültige Hex-Länge (Muss gerade sein)');
        }
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
    } catch (e) {
        throw new Error(e.message || 'Ungültiges Hex-Format');
    }
}

// Inline MD5 Hashing implementation
function md5(str) {
    var k = [], i;
    for (i = 0; i < 64; i++) {
        k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    }
    var h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
    
    var utf8Bytes = Array.from(new TextEncoder().encode(str));
    var originalLength = utf8Bytes.length;
    
    utf8Bytes.push(0x80);
    while ((utf8Bytes.length + 8) % 64 !== 0) {
        utf8Bytes.push(0);
    }
    
    var dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(0, originalLength * 8, true);
    dv.setUint32(4, 0, true);
    for (i = 0; i < 8; i++) {
        utf8Bytes.push(dv.getUint8(i));
    }
    
    var s = [
        7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
        5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
        4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
        6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
    ];
    
    for (var b = 0; b < utf8Bytes.length; b += 64) {
        var w = [];
        for (i = 0; i < 16; i++) {
            w[i] = (utf8Bytes[b + i * 4]) |
                   (utf8Bytes[b + i * 4 + 1] << 8) |
                   (utf8Bytes[b + i * 4 + 2] << 16) |
                   (utf8Bytes[b + i * 4 + 3] << 24);
        }
        
        var a = h[0], b1 = h[1], c = h[2], d = h[3];
        for (i = 0; i < 64; i++) {
            var f, g;
            if (i < 16) {
                f = (b1 & c) | (~b1 & d);
                g = i;
            } else if (i < 32) {
                f = (d & b1) | (~d & c);
                g = (5 * i + 1) % 16;
            } else if (i < 48) {
                f = b1 ^ c ^ d;
                g = (3 * i + 5) % 16;
            } else {
                f = c ^ (b1 | ~d);
                g = (7 * i) % 16;
            }
            
            var temp = d;
            d = c;
            c = b1;
            b1 = (b1 + ((a + f + k[i] + (w[g] || 0)) | 0)) | 0;
            var r = s[i];
            b1 = ((b1 << r) | (b1 >>> (32 - r))) + c;
            a = temp;
        }
        h[0] = (h[0] + a) | 0;
        h[1] = (h[1] + b1) | 0;
        h[2] = (h[2] + c) | 0;
        h[3] = (h[3] + d) | 0;
    }
    
    return h.map(function (val) {
        var unsigned = val >>> 0;
        var bytes = [
            unsigned & 0xFF,
            (unsigned >>> 8) & 0xFF,
            (unsigned >>> 16) & 0xFF,
            (unsigned >>> 24) & 0xFF
        ];
        return bytes.map(function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }).join('');
}

// Web Crypto API helpers for SHA
async function sha1(str) {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(str) {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function performConversion() {
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
            } else if (currentType === 'binary') {
                result = utf8ToBinary(inputVal);
            } else if (currentType === 'hex') {
                result = utf8ToHex(inputVal);
            } else if (currentType === 'md5') {
                result = md5(inputVal);
            } else if (currentType === 'sha1') {
                result = await sha1(inputVal);
            } else if (currentType === 'sha256') {
                result = await sha256(inputVal);
            }
        } else {
            if (currentType === 'base64') {
                result = base64ToUtf8(inputVal);
            } else if (currentType === 'binary') {
                result = binaryToUtf8(inputVal);
            } else if (currentType === 'hex') {
                result = hexToUtf8(inputVal);
            } else {
                throw new Error('Hash-Algorithmen sind Einwegfunktionen und können nicht decodiert werden.');
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

    const typeNames = {
        base64: 'BASE64',
        binary: 'BINÄRCODE',
        hex: 'HEXADEZIMAL',
        md5: 'MD5 HASH',
        sha1: 'SHA-1 HASH',
        sha256: 'SHA-256 HASH'
    };

    const typeName = typeNames[currentType] || currentType.toUpperCase();

    if (currentMode === 'encode') {
        inputLabel.textContent = 'KLARTEXT (EINGABE):';
        outputLabel.textContent = `${typeName} (AUSGABE):`;
    } else {
        inputLabel.textContent = `${typeName} (EINGABE):`;
        outputLabel.textContent = 'KLARTEXT (AUSGABE):';
    }
}

function handleHashModeUI() {
    const decodeBtn = document.querySelector('.coder-mode-btn[data-mode="decode"]');
    const encodeBtn = document.querySelector('.coder-mode-btn[data-mode="encode"]');
    const swapBtn = getEl('coder-swap');

    const isHash = ['md5', 'sha1', 'sha256'].includes(currentType);

    if (isHash) {
        // Hash only supports encoding. Force encoding mode.
        if (currentMode === 'decode') {
            currentMode = 'encode';
            if (encodeBtn) encodeBtn.classList.add('active');
            if (decodeBtn) decodeBtn.classList.remove('active');
        }
        if (decodeBtn) {
            decodeBtn.style.opacity = '0.3';
            decodeBtn.style.pointerEvents = 'none';
        }
        if (swapBtn) {
            swapBtn.style.opacity = '0.3';
            swapBtn.style.pointerEvents = 'none';
        }
    } else {
        if (decodeBtn) {
            decodeBtn.style.opacity = '1';
            decodeBtn.style.pointerEvents = 'auto';
        }
        if (swapBtn) {
            swapBtn.style.opacity = '1';
            swapBtn.style.pointerEvents = 'auto';
        }
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

    inputEl.addEventListener('input', performConversion);

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.style.pointerEvents === 'none') return;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateLabels();
            performConversion();
        });
    });

    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            handleHashModeUI();
            updateLabels();
            performConversion();
        });
    });

    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            if (swapBtn.style.pointerEvents === 'none') return;
            const inputVal = inputEl.value;
            const outputVal = outputEl.value;

            if (outputEl.classList.contains('conv-error') || !outputVal) return;

            currentMode = currentMode === 'encode' ? 'decode' : 'encode';
            
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

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputEl.value = '';
            outputEl.value = '';
            outputEl.classList.remove('conv-error');
        });
    }

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

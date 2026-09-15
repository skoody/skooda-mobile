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

function initEncoder() {
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
            const textToCopy = outputEl.value;
            const showSuccess = () => {
                const oldText = copyBtn.textContent;
                copyBtn.textContent = '✅ Kopiert!';
                copyBtn.style.borderColor = 'var(--neon-cyan)';
                setTimeout(() => {
                    copyBtn.textContent = oldText;
                    copyBtn.style.borderColor = '';
                }, 1500);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => {
                    outputEl.select();
                    document.execCommand('copy');
                    showSuccess();
                });
            } else {
                outputEl.select();
                document.execCommand('copy');
                showSuccess();
            }
        });
    }

    updateLabels();
    handleHashModeUI();
}

function setupCoderSubtabs() {
    const subnavBtns = document.querySelectorAll('.coder-subnav-btn');
    const tabs = document.querySelectorAll('.coder-tab-content');
    subnavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-coder-tab');
            subnavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabs.forEach(tab => {
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        });
    });
}

// =============================================================================
// JWT (JSON WEB TOKEN) INSPECTOR
// =============================================================================
function setupJwtInspector() {
    const jwtInput = getEl('jwt-input');
    const headerEl = getEl('jwt-header-display');
    const payloadEl = getEl('jwt-payload-display');
    const signatureEl = getEl('jwt-signature-display');
    const statusBadge = getEl('jwt-status-badge');
    const claimsContainer = getEl('jwt-claims-summary');

    if (!jwtInput) return;

    function decodeBase64Url(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    function parseJwt() {
        const token = jwtInput.value.trim();
        if (!token) {
            if (headerEl) headerEl.innerText = '{}';
            if (payloadEl) payloadEl.innerText = '{}';
            if (signatureEl) signatureEl.innerText = 'Keine Signatur';
            if (statusBadge) statusBadge.style.display = 'none';
            if (claimsContainer) claimsContainer.innerHTML = '';
            return;
        }

        const parts = token.split('.');
        if (parts.length < 2) {
            if (statusBadge) {
                statusBadge.style.display = 'inline-block';
                statusBadge.innerText = 'Ungültiges JWT-Format';
                statusBadge.style.background = 'rgba(255, 0, 68, 0.2)';
                statusBadge.style.borderColor = 'var(--neon-red)';
                statusBadge.style.color = 'var(--neon-red)';
            }
            return;
        }

        try {
            const headerObj = JSON.parse(decodeBase64Url(parts[0]));
            const payloadObj = JSON.parse(decodeBase64Url(parts[1]));
            const signature = parts[2] || '';

            if (headerEl) headerEl.innerText = JSON.stringify(headerObj, null, 2);
            if (payloadEl) payloadEl.innerText = JSON.stringify(payloadObj, null, 2);
            if (signatureEl) signatureEl.innerText = signature ? `Signatur (${headerObj.alg || 'Algorithmus'}):\n${signature}` : 'Ungesichert (none)';

            // Validate Expiration & Timestamps
            let statusText = 'Gültig';
            let statusColor = 'var(--neon-green)';
            let statusBg = 'rgba(0, 255, 102, 0.15)';

            const claims = [];
            if (payloadObj.iss) claims.push(`<span>Issuer (iss): <strong>${payloadObj.iss}</strong></span>`);
            if (payloadObj.sub) claims.push(`<span>Subject (sub): <strong>${payloadObj.sub}</strong></span>`);
            if (payloadObj.aud) claims.push(`<span>Audience (aud): <strong>${payloadObj.aud}</strong></span>`);

            if (payloadObj.exp) {
                const expTime = payloadObj.exp * 1000;
                const expDate = new Date(expTime);
                const now = Date.now();
                if (now > expTime) {
                    statusText = `⚠️ Abgelaufen am ${expDate.toLocaleDateString()} ${expDate.toLocaleTimeString()}`;
                    statusColor = 'var(--neon-red)';
                    statusBg = 'rgba(255, 0, 68, 0.15)';
                } else {
                    const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
                    statusText = `✅ Gültig bis ${expDate.toLocaleDateString()} (noch ~${diffDays} Tage)`;
                }
                claims.push(`<span>Ablaufzeit (exp): <strong>${expDate.toLocaleString()}</strong></span>`);
            }

            if (payloadObj.iat) {
                const iatDate = new Date(payloadObj.iat * 1000);
                claims.push(`<span>Erstellt am (iat): <strong>${iatDate.toLocaleString()}</strong></span>`);
            }

            if (statusBadge) {
                statusBadge.style.display = 'inline-block';
                statusBadge.innerText = statusText;
                statusBadge.style.borderColor = statusColor;
                statusBadge.style.background = statusBg;
                statusBadge.style.color = statusColor;
            }

            if (claimsContainer) {
                claimsContainer.innerHTML = claims.join(' • ');
            }
        } catch (e) {
            if (statusBadge) {
                statusBadge.style.display = 'inline-block';
                statusBadge.innerText = 'JSON-Dekodierfehler: ' + e.message;
                statusBadge.style.borderColor = 'var(--neon-red)';
                statusBadge.style.color = 'var(--neon-red)';
            }
        }
    }

    jwtInput.addEventListener('input', parseJwt);
}

// =============================================================================
// PASSWORD ENTROPY & DICEWARE STUDIO
// =============================================================================
function setupPasswordStudio() {
    const pwdInput = getEl('pwd-entropy-input');
    const bitsVal = getEl('pwd-entropy-bits');
    const qualityLabel = getEl('pwd-quality-label');
    const crackOnline = getEl('pwd-crack-online');
    const crackGpu = getEl('pwd-crack-gpu');
    const crackSlow = getEl('pwd-crack-slow');
    const hashTypeBadge = getEl('pwd-hash-detector');

    const genDiceBtn = getEl('pwd-gen-diceware');
    const diceWordsCount = getEl('pwd-dice-count');
    const diceSeparator = getEl('pwd-dice-sep');

    const DICE_WORDS = [
        "quantum", "cyber", "vector", "matrix", "beacon", "shadow", "neuron",
        "cipher", "plasma", "stealth", "pulsar", "crypto", "shield", "zenith",
        "vertex", "phoenix", "falcon", "nexus", "orbit", "specter", "dynamo",
        "titan", "vortex", "cobalt", "ranger", "alpha", "delta", "aurora",
        "signal", "radar", "glitch", "proxy", "subnet", "trench", "anchor"
    ];

    function calculateEntropy(pwd) {
        if (!pwd) return 0;
        let pool = 0;
        if (/[a-z]/.test(pwd)) pool += 26;
        if (/[A-Z]/.test(pwd)) pool += 26;
        if (/[0-9]/.test(pwd)) pool += 10;
        if (/[^a-zA-Z0-9]/.test(pwd)) pool += 33;
        if (pool === 0) pool = 1;

        return Math.round(pwd.length * Math.log2(pool));
    }

    function formatTime(seconds) {
        if (seconds < 1) return "Sofort (< 1s)";
        if (seconds < 60) return `${Math.round(seconds)} Sekunden`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} Minuten`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} Stunden`;
        if (seconds < 31536000) return `${Math.round(seconds / 86400)} Tage`;
        if (seconds < 31536000 * 1000) return `${Math.round(seconds / 31536000)} Jahre`;
        if (seconds < 31536000 * 1000000) return `${(seconds / (31536000 * 1000)).toFixed(1)}k Jahre`;
        return "Jahrhunderte / Unknackbar";
    }

    function detectHashType(str) {
        const clean = str.trim();
        if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(clean)) return "JWT (JSON Web Token)";
        if (/^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(clean)) return "Bcrypt Hash";
        if (/^\$argon2(id|i|d)\$/.test(clean)) return "Argon2 Hash";
        if (/^[a-f0-9]{32}$/i.test(clean)) return "MD5 oder NTLM Hash (128-bit)";
        if (/^[a-f0-9]{40}$/i.test(clean)) return "SHA-1 Hash (160-bit)";
        if (/^[a-f0-9]{64}$/i.test(clean)) return "SHA-256 Hash (256-bit)";
        if (/^[a-f0-9]{128}$/i.test(clean)) return "SHA-512 Hash (512-bit)";
        return null;
    }

    function updateEntropyUI() {
        const pwd = pwdInput ? pwdInput.value : '';
        const bits = calculateEntropy(pwd);

        if (bitsVal) bitsVal.innerText = `${bits} Bits`;

        let quality = 'Kein Passwort';
        let color = 'var(--text-dim)';
        if (bits > 0 && bits < 40) { quality = 'Sehr schwach (Leicht erratbar)'; color = 'var(--neon-red)'; }
        else if (bits >= 40 && bits < 60) { quality = 'Mäßig (Wörterbuch-Angriff möglich)'; color = '#ff9500'; }
        else if (bits >= 60 && bits < 80) { quality = 'Gut (Sicher für normale Accounts)'; color = 'var(--neon-cyan)'; }
        else if (bits >= 80 && bits < 110) { quality = 'Sehr stark (High Security)'; color = 'var(--neon-green)'; }
        else if (bits >= 110) { quality = 'Militärisch sicher (Unknackbar)'; color = 'var(--neon-green)'; }

        if (qualityLabel) {
            qualityLabel.innerText = quality;
            qualityLabel.style.color = color;
        }

        const combinations = Math.pow(2, bits);
        if (crackOnline) crackOnline.innerText = formatTime(combinations / 100);
        if (crackGpu) crackGpu.innerText = formatTime(combinations / 100000000000); // 100 GH/s
        if (crackSlow) crackSlow.innerText = formatTime(combinations / 10000); // 10 kH/s

        const detected = detectHashType(pwd);
        if (hashTypeBadge) {
            if (detected) {
                hashTypeBadge.style.display = 'inline-block';
                hashTypeBadge.innerText = `Erkannt: ${detected}`;
            } else {
                hashTypeBadge.style.display = 'none';
            }
        }
    }

    if (pwdInput) {
        pwdInput.addEventListener('input', updateEntropyUI);
    }

    if (genDiceBtn) {
        genDiceBtn.addEventListener('click', () => {
            const count = parseInt(diceWordsCount?.value || '4');
            const sep = diceSeparator?.value !== undefined ? diceSeparator.value : '-';
            const selected = [];
            for (let i = 0; i < count; i++) {
                const randIdx = Math.floor(Math.random() * DICE_WORDS.length);
                selected.push(DICE_WORDS[randIdx]);
            }
            // Add a random 2-digit number at the end
            selected.push(Math.floor(Math.random() * 90 + 10));

            const passphrase = selected.join(sep);
            if (pwdInput) {
                pwdInput.value = passphrase;
                updateEntropyUI();
            }
        });
    }
}

// =============================================================================
// 4. DIFF & TEXT-VERGLEICH (LCS ALGORITHMUS)
// =============================================================================
function computeLineDiff(text1, text2) {
    const lines1 = text1.split(/\r?\n/);
    const lines2 = text2.split(/\r?\n/);
    const n = lines1.length;
    const m = lines2.length;

    // LCS dynamic programming matrix
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            if (lines1[i] === lines2[j]) {
                dp[i + 1][j + 1] = dp[i][j] + 1;
            } else {
                dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    // Backtrack to build diff ops
    let i = n, j = m;
    const diff = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
            diff.unshift({ type: 'equal', text: lines1[i - 1], line1: i, line2: j });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({ type: 'added', text: lines2[j - 1], line2: j });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            diff.unshift({ type: 'removed', text: lines1[i - 1], line1: i });
            i--;
        }
    }
    return diff;
}

function initDiffViewer() {
    const text1Input = getEl('diff-input-1');
    const text2Input = getEl('diff-input-2');
    const diffOutput = getEl('diff-output');
    const diffStats = getEl('diff-stats');
    const compareBtn = getEl('diff-compare-btn');

    if (!text1Input || !text2Input) return;

    function renderDiff() {
        const text1 = text1Input.value;
        const text2 = text2Input.value;
        const diff = computeLineDiff(text1, text2);

        let addedCount = 0;
        let removedCount = 0;
        let html = '';

        diff.forEach((item, idx) => {
            if (item.type === 'added') {
                addedCount++;
                html += `<div class="diff-line diff-added"><span class="diff-line-num">+${item.line2}</span><span>+ ${escapeHtml(item.text)}</span></div>`;
            } else if (item.type === 'removed') {
                removedCount++;
                html += `<div class="diff-line diff-removed"><span class="diff-line-num">-${item.line1}</span><span>- ${escapeHtml(item.text)}</span></div>`;
            } else {
                html += `<div class="diff-line diff-equal"><span class="diff-line-num">${item.line1 || item.line2}</span><span>  ${escapeHtml(item.text)}</span></div>`;
            }
        });

        if (diffOutput) {
            diffOutput.innerHTML = html || '<div style="padding: 10px; color: var(--text-dim);">Keine Unterschiede gefunden.</div>';
        }
        if (diffStats) {
            diffStats.innerHTML = `<span style="color:var(--neon-green)">+${addedCount} Hinzugefügt</span> | <span style="color:var(--neon-red)">-${removedCount} Entfernt</span>`;
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    if (compareBtn) compareBtn.addEventListener('click', renderDiff);
    text1Input.addEventListener('input', renderDiff);
    text2Input.addEventListener('input', renderDiff);
}

// =============================================================================
// 5. CRON-EXPRESSION BUILDER & INTERPRETER
// =============================================================================
function initCronBuilder() {
    const cronInput = getEl('cron-input');
    const cronExplain = getEl('cron-explanation');
    const cronNextList = getEl('cron-next-runs');
    const presetBtns = document.querySelectorAll('.cron-preset-btn');

    if (!cronInput) return;

    function explainPart(part, type) {
        if (part === '*') return `jedes ${type}`;
        if (part.startsWith('*/')) return `alle ${part.slice(2)} ${type}`;
        if (part.includes(',')) return `um ${part} ${type}`;
        if (part.includes('-')) return `von ${part.split('-')[0]} bis ${part.split('-')[1]} ${type}`;
        return `um ${part} ${type}`;
    }

    function parseCron(expr) {
        const parts = expr.trim().split(/\s+/);
        if (parts.length < 5) return { error: "Cron benötigt mindestens 5 Felder (Minute Stunde Tag Monat Wochentag)" };

        const [min, hour, dom, mon, dow] = parts;
        const daysOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

        let explanation = "Führt aus: ";
        if (min === '*' && hour === '*') explanation += "Jede Minute";
        else if (min.startsWith('*/')) explanation += `Alle ${min.slice(2)} Minuten`;
        else if (min === '0' && hour === '*') explanation += "Zu jeder vollen Stunde";
        else if (min !== '*' && hour !== '*') explanation += `Um ${hour.padStart(2, '0')}:${min.padStart(2, '0')} Uhr`;
        else explanation += `${explainPart(min, 'Minute')} ${explainPart(hour, 'Stunde')}`;

        if (dow !== '*') {
            if (dow === '1-5') explanation += ", an Werktagen (Mo-Fr)";
            else if (dow === '0,6' || dow === '6,0' || dow === '6-7') explanation += ", am Wochenende (Sa-So)";
            else explanation += `, an Wochentag(en) [${dow}]`;
        }

        if (dom !== '*') explanation += `, am ${dom}. Tag des Monats`;
        if (mon !== '*') explanation += `, im Monat ${mon}`;

        // Calculate next 5 approximate runs
        const nextRuns = [];
        let curr = new Date();
        for (let step = 1; step <= 5; step++) {
            let nextDate = new Date(curr.getTime() + step * 60 * 1000);
            if (min === '0' && hour !== '*') {
                nextDate = new Date(curr.getTime() + step * 24 * 3600 * 1000);
            }
            nextRuns.push(nextDate.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
        }

        return { explanation, nextRuns };
    }

    function updateCron() {
        const val = cronInput.value.trim();
        const res = parseCron(val);
        if (res.error) {
            if (cronExplain) {
                cronExplain.innerText = res.error;
                cronExplain.style.color = 'var(--neon-red)';
            }
            if (cronNextList) cronNextList.innerHTML = '';
        } else {
            if (cronExplain) {
                cronExplain.innerText = res.explanation;
                cronExplain.style.color = 'var(--neon-green)';
            }
            if (cronNextList) {
                cronNextList.innerHTML = res.nextRuns.map((r, i) => `<div><span style="color:var(--neon-cyan)">Run #${i + 1}:</span> ${r}</div>`).join('');
            }
        }
    }

    cronInput.addEventListener('input', updateCron);
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cronInput.value = btn.dataset.cron;
            updateCron();
        });
    });

    updateCron();
}

// =============================================================================
// 6. CURL-TO-CODE KONVERTER
// =============================================================================
function initCurlConverter() {
    const curlInput = getEl('curl-input');
    const langSelect = getEl('curl-lang-select');
    const codeOutput = getEl('curl-code-output');
    const copyBtn = getEl('curl-copy-btn');

    if (!curlInput) return;

    function parseCurl(raw) {
        let clean = raw.trim().replace(/\\\n/g, ' ').replace(/\s+/g, ' ');
        let method = 'GET';
        let url = '';
        let headers = {};
        let body = null;

        // Match URL
        const urlMatch = clean.match(/(?:--url\s+|curl\s+)?["']?(https?:\/\/[^\s"']+)["']?/i);
        if (urlMatch) url = urlMatch[1];

        // Match Method
        const methodMatch = clean.match(/-X\s+([A-Z]+)/i);
        if (methodMatch) method = methodMatch[1].toUpperCase();

        // Match Headers
        const headerMatches = [...clean.matchAll(/-H\s+["']([^"']+)["']/g)];
        headerMatches.forEach(m => {
            const parts = m[1].split(/:\s*(.+)/);
            if (parts.length >= 2) headers[parts[0]] = parts[1];
        });

        // Match Data
        const dataMatch = clean.match(/(?:-d|--data|--data-raw|--data-json)\s+["']([^"']+)["']/);
        if (dataMatch) {
            body = dataMatch[1];
            if (method === 'GET') method = 'POST';
        }

        return { method, url, headers, body };
    }

    function generateCode(parsed, lang) {
        if (!parsed.url) return '// Bitte einen gültigen cURL-Befehl eingeben';

        if (lang === 'js') {
            const hasHeaders = Object.keys(parsed.headers).length > 0;
            const options = {
                method: parsed.method,
                ...(hasHeaders ? { headers: parsed.headers } : {}),
                ...(parsed.body ? { body: parsed.body } : {})
            };
            return `// JavaScript Fetch (Async/Await)
async function sendRequest() {
  const response = await fetch("${parsed.url}", ${JSON.stringify(options, null, 2)});
  const data = await response.json();
  console.log(data);
}
sendRequest();`;
        } else if (lang === 'python') {
            return `# Python Requests
import requests

url = "${parsed.url}"
headers = ${JSON.stringify(parsed.headers, null, 4)}
${parsed.body ? `data = '${parsed.body}'\n` : ''}
response = requests.${parsed.method.toLowerCase()}(url${Object.keys(parsed.headers).length > 0 ? ', headers=headers' : ''}${parsed.body ? ', data=data' : ''})
print(response.status_code)
print(response.text)`;
        } else if (lang === 'rust') {
            return `// Rust (reqwest + tokio)
use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client.${parsed.method.toLowerCase()}("${parsed.url}")
        ${Object.entries(parsed.headers).map(([k, v]) => `.header("${k}", "${v}")`).join('\n        ')}
        ${parsed.body ? `.body("${parsed.body.replace(/"/g, '\\"')}")` : ''}
        .send()
        .await?;

    println!("Status: {}", res.status());
    println!("Body: {}", res.text().await?);
    Ok(())
}`;
        }
        return '';
    }

    function updateCode() {
        const parsed = parseCurl(curlInput.value);
        const lang = langSelect ? langSelect.value : 'js';
        const code = generateCode(parsed, lang);
        if (codeOutput) codeOutput.textContent = code;
    }

    curlInput.addEventListener('input', updateCode);
    if (langSelect) langSelect.addEventListener('change', updateCode);
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (codeOutput && navigator.clipboard) {
                navigator.clipboard.writeText(codeOutput.textContent);
                copyBtn.innerText = '✅ Kopiert!';
                setTimeout(() => copyBtn.innerText = '📋 Code kopieren', 2000);
            }
        });
    }

    updateCode();
}

// =============================================================================
// 7. MARKDOWN & LATEX LIVE-PREVIEWER
// =============================================================================
function initMarkdownPreviewer() {
    const mdInput = getEl('md-input');
    const mdPreview = getEl('md-preview');

    if (!mdInput || !mdPreview) return;

    function parseMarkdown(md) {
        let html = md
            // Escape special chars
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold & Italic
            .replace(/\*\*\*(.*?)\*\*\*/gim, '<b><i>$1</i></b>')
            .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*?)\*/gim, '<i>$1</i>')
            // Code Blocks & Inline Code
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/gim, '<code>$1</code>')
            // LaTeX Inline Math: $E = mc^2$
            .replace(/\$([^\$]+)\$/gim, '<span style="font-family:\'Times New Roman\', serif; font-style:italic; color:var(--neon-green); font-size:1.05rem;">$1</span>')
            // Blockquotes
            .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
            // Unordered Lists
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/<\/ul>\s?<ul>/gim, '')
            // Line Breaks
            .replace(/\n/gim, '<br>');

        return html;
    }

    function renderMarkdown() {
        mdPreview.innerHTML = parseMarkdown(mdInput.value);
    }

    mdInput.addEventListener('input', renderMarkdown);
    renderMarkdown();
}

// =============================================================================
// 8. JSON / YAML / XML STUDIO
// =============================================================================
function initJsonYamlStudio() {
    const inputEl = getEl('json-input');
    const outputEl = getEl('json-output');
    const statusBadge = getEl('json-status-badge');
    const pretty2Btn = getEl('json-pretty2-btn');
    const pretty4Btn = getEl('json-pretty4-btn');
    const minifyBtn = getEl('json-minify-btn');
    const toYamlBtn = getEl('json-to-yaml-btn');
    const yamlToJsonBtn = getEl('yaml-to-json-btn');
    const toXmlBtn = getEl('json-to-xml-btn');
    const copyBtn = getEl('json-copy-btn');
    const clearBtn = getEl('json-clear-btn');

    if (!inputEl) return;

    function setStatus(msg, isSuccess = true) {
        if (!statusBadge) return;
        statusBadge.innerText = msg;
        statusBadge.style.color = isSuccess ? 'var(--neon-green)' : 'var(--neon-red)';
        statusBadge.style.borderColor = isSuccess ? 'var(--neon-green)' : 'var(--neon-red)';
        statusBadge.style.display = 'inline-block';
    }

    function formatJson(space) {
        try {
            const raw = inputEl.value.trim();
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const formatted = JSON.stringify(parsed, null, space);
            if (outputEl) outputEl.value = formatted;
            setStatus(`Gültiges JSON (${Object.keys(parsed).length} Root-Keys)`);
        } catch (e) {
            if (outputEl) outputEl.value = '';
            setStatus(`Syntaxfehler: ${e.message}`, false);
        }
    }

    function minifyJson() {
        try {
            const raw = inputEl.value.trim();
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const minified = JSON.stringify(parsed);
            if (outputEl) outputEl.value = minified;
            setStatus(`Minifiziert (${minified.length} Zeichen)`);
        } catch (e) {
            setStatus(`Syntaxfehler: ${e.message}`, false);
        }
    }

    // Lightweight robust YAML serializer
    function jsonToYaml(obj, indent = 0) {
        const pad = '  '.repeat(indent);
        if (obj === null) return 'null';
        if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
        if (typeof obj === 'string') {
            if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj === '') {
                return JSON.stringify(obj);
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            return obj.map(item => {
                if (typeof item === 'object' && item !== null) {
                    const yamlStr = jsonToYaml(item, indent + 1);
                    return `\n${pad}- ${yamlStr.trimStart()}`;
                }
                return `\n${pad}- ${jsonToYaml(item, indent + 1)}`;
            }).join('').trimStart();
        }
        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            return keys.map(k => {
                const val = obj[k];
                if (typeof val === 'object' && val !== null) {
                    return `\n${pad}${k}:\n${jsonToYaml(val, indent + 1)}`;
                }
                return `\n${pad}${k}: ${jsonToYaml(val, indent + 1)}`;
            }).join('').trimStart();
        }
        return String(obj);
    }

    // Lightweight YAML to JSON parser for standard key-value & lists
    function yamlToJson(yamlStr) {
        const lines = yamlStr.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
        let root = {};
        let stack = [{ indent: -1, obj: root }];

        for (let line of lines) {
            const indent = line.search(/\S/);
            const content = line.trim();

            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }

            const current = stack[stack.length - 1].obj;

            if (content.startsWith('- ')) {
                // List item
                const valStr = content.slice(2).trim();
                let val = parseYamlVal(valStr);
                if (!Array.isArray(current)) {
                    // Convert current to array if not already
                }
            } else if (content.includes(':')) {
                const colonIdx = content.indexOf(':');
                const key = content.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
                const valStr = content.slice(colonIdx + 1).trim();

                if (!valStr) {
                    const newObj = {};
                    current[key] = newObj;
                    stack.push({ indent, obj: newObj });
                } else {
                    current[key] = parseYamlVal(valStr);
                }
            }
        }
        return root;
    }

    function parseYamlVal(val) {
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (val === 'null' || val === '~') return null;
        if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            return val.slice(1, -1);
        }
        return val;
    }

    // Simple JSON to XML converter
    function jsonToXml(obj, rootName = 'root') {
        function toXml(v, name) {
            if (v === null || v === undefined) return `<${name}/>`;
            if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') {
                return `<${name}>${escapeXml(String(v))}</${name}>`;
            }
            if (Array.isArray(v)) {
                return v.map(item => toXml(item, name)).join('\n');
            }
            let inner = Object.keys(v).map(k => toXml(v[k], k)).join('\n');
            return `<${name}>\n${inner}\n</${name}>`;
        }
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + toXml(obj, rootName);
    }

    function escapeXml(str) {
        return str.replace(/[<>&'"]/g, c => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    if (pretty2Btn) pretty2Btn.addEventListener('click', () => formatJson(2));
    if (pretty4Btn) pretty4Btn.addEventListener('click', () => formatJson(4));
    if (minifyBtn) minifyBtn.addEventListener('click', minifyJson);

    if (toYamlBtn) {
        toYamlBtn.addEventListener('click', () => {
            try {
                const parsed = JSON.parse(inputEl.value);
                const yaml = jsonToYaml(parsed);
                if (outputEl) outputEl.value = yaml;
                setStatus('Erfolgreich zu YAML konvertiert');
            } catch (e) {
                setStatus(`Ungültiges JSON: ${e.message}`, false);
            }
        });
    }

    if (yamlToJsonBtn) {
        yamlToJsonBtn.addEventListener('click', () => {
            try {
                const parsed = yamlToJson(inputEl.value);
                if (outputEl) outputEl.value = JSON.stringify(parsed, null, 2);
                setStatus('Erfolgreich zu JSON konvertiert');
            } catch (e) {
                setStatus(`YAML Parser Fehler: ${e.message}`, false);
            }
        });
    }

    if (toXmlBtn) {
        toXmlBtn.addEventListener('click', () => {
            try {
                const parsed = JSON.parse(inputEl.value);
                const xml = jsonToXml(parsed);
                if (outputEl) outputEl.value = xml;
                setStatus('Erfolgreich zu XML konvertiert');
            } catch (e) {
                setStatus(`Ungültiges JSON: ${e.message}`, false);
            }
        });
    }

    if (copyBtn && outputEl) {
        copyBtn.addEventListener('click', () => {
            if (outputEl.value && navigator.clipboard) {
                navigator.clipboard.writeText(outputEl.value);
                copyBtn.innerText = '✅ Kopiert!';
                setTimeout(() => copyBtn.innerText = '📋 Kopieren', 2000);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputEl.value = '';
            if (outputEl) outputEl.value = '';
            if (statusBadge) statusBadge.style.display = 'none';
        });
    }
}

// =============================================================================
// 9. REGEX SANDBOX & TESTER
// =============================================================================
function initRegexTester() {
    const patternInput = getEl('regex-pattern-input');
    const textInput = getEl('regex-text-input');
    const replaceInput = getEl('regex-replace-input');
    const highlightOutput = getEl('regex-highlight-output');
    const replaceOutput = getEl('regex-replace-output');
    const matchCountEl = getEl('regex-match-count');
    const matchDetailsEl = getEl('regex-match-details');
    const errorEl = getEl('regex-error');

    const flagG = getEl('regex-flag-g');
    const flagI = getEl('regex-flag-i');
    const flagM = getEl('regex-flag-m');
    const flagS = getEl('regex-flag-s');
    const flagU = getEl('regex-flag-u');

    if (!patternInput || !textInput) return;

    function getFlags() {
        let f = '';
        if (flagG?.checked) f += 'g';
        if (flagI?.checked) f += 'i';
        if (flagM?.checked) f += 'm';
        if (flagS?.checked) f += 's';
        if (flagU?.checked) f += 'u';
        return f;
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function testRegex() {
        const pattern = patternInput.value;
        const text = textInput.value;
        const replaceStr = replaceInput?.value || '';

        if (errorEl) errorEl.style.display = 'none';

        if (!pattern) {
            if (highlightOutput) highlightOutput.innerHTML = escapeHtml(text) || '<span style="color:var(--text-dim)">Kein Testtext vorhanden</span>';
            if (replaceOutput) replaceOutput.innerText = text;
            if (matchCountEl) matchCountEl.innerText = '0 Matches';
            if (matchDetailsEl) matchDetailsEl.innerHTML = '';
            return;
        }

        try {
            const flags = getFlags();
            const regex = new RegExp(pattern, flags);

            // 1. Matches & Highlighting
            let matches = [];
            let highlighted = '';
            let lastIdx = 0;

            if (flags.includes('g')) {
                let m;
                while ((m = regex.exec(text)) !== null) {
                    if (m.index === regex.lastIndex) regex.lastIndex++;
                    matches.push({
                        match: m[0],
                        index: m.index,
                        groups: m.slice(1)
                    });
                }
            } else {
                const m = regex.exec(text);
                if (m) {
                    matches.push({
                        match: m[0],
                        index: m.index,
                        groups: m.slice(1)
                    });
                }
            }

            // Build Highlight HTML
            let cursor = 0;
            matches.forEach((m, i) => {
                highlighted += escapeHtml(text.slice(cursor, m.index));
                highlighted += `<mark class="regex-mark" title="Match #${i + 1} at pos ${m.index}">${escapeHtml(m.match)}</mark>`;
                cursor = m.index + m.match.length;
            });
            highlighted += escapeHtml(text.slice(cursor));

            if (highlightOutput) highlightOutput.innerHTML = highlighted;
            if (matchCountEl) matchCountEl.innerText = `${matches.length} Match${matches.length === 1 ? '' : 'es'}`;

            // Build Match Details Table
            if (matchDetailsEl) {
                if (matches.length === 0) {
                    matchDetailsEl.innerHTML = '<div style="color:var(--text-dim); padding:8px;">Keine Übereinstimmung gefunden.</div>';
                } else {
                    let html = '<div class="cyber-list" style="max-height:180px; overflow-y:auto;">';
                    matches.forEach((m, idx) => {
                        html += `<div class="cyber-list-item" style="font-size:0.75rem; padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="color:var(--neon-cyan)">#${idx + 1}</span> 
                            <span style="color:var(--text-dim); margin-left:6px;">Pos: ${m.index}</span> 
                            <strong style="color:var(--neon-green); margin-left:8px;">"${escapeHtml(m.match)}"</strong>`;
                        if (m.groups && m.groups.length > 0) {
                            html += `<div style="color:var(--neon-purple); font-size:0.7rem; margin-top:2px;">Groups: [${m.groups.map(g => `"${escapeHtml(g !== undefined ? g : '')}"`).join(', ')}]</div>`;
                        }
                        html += '</div>';
                    });
                    html += '</div>';
                    matchDetailsEl.innerHTML = html;
                }
            }

            // 2. Substitutions
            if (replaceOutput) {
                try {
                    const replaced = text.replace(regex, replaceStr);
                    replaceOutput.innerText = replaced;
                } catch (e) {
                    replaceOutput.innerText = 'Ersetzungsfehler: ' + e.message;
                }
            }
        } catch (err) {
            if (errorEl) {
                errorEl.innerText = 'RegEx Fehler: ' + err.message;
                errorEl.style.display = 'block';
            }
            if (matchCountEl) matchCountEl.innerText = 'Fehler im Muster';
        }
    }

    patternInput.addEventListener('input', testRegex);
    textInput.addEventListener('input', testRegex);
    if (replaceInput) replaceInput.addEventListener('input', testRegex);
    [flagG, flagI, flagM, flagS, flagU].forEach(ch => {
        if (ch) ch.addEventListener('change', testRegex);
    });

    // Token inserts
    document.querySelectorAll('.regex-token-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const token = btn.getAttribute('data-token');
            if (token) {
                patternInput.value += token;
                testRegex();
            }
        });
    });

    testRegex();
}

// =============================================================================
// 10. TIMESTAMP & EPOCH STUDIO
// =============================================================================
function initEpochStudio() {
    const liveSecEl = getEl('epoch-live-sec');
    const liveMsEl = getEl('epoch-live-ms');
    const tsInput = getEl('epoch-ts-input');
    const tsUnitSelect = getEl('epoch-ts-unit');
    const dateInput = getEl('epoch-date-input');

    // Outputs
    const outLocal = getEl('epoch-out-local');
    const outUtc = getEl('epoch-out-utc');
    const outIso = getEl('epoch-out-iso');
    const outRfc = getEl('epoch-out-rfc');
    const outRelative = getEl('epoch-out-relative');

    // Duration calculator
    const diffStart = getEl('epoch-diff-start');
    const diffEnd = getEl('epoch-diff-end');
    const diffResult = getEl('epoch-diff-result');
    const diffBtn = getEl('epoch-calc-diff-btn');

    // 1. Live Running Clock
    setInterval(() => {
        const now = Date.now();
        if (liveSecEl) liveSecEl.innerText = Math.floor(now / 1000);
        if (liveMsEl) liveMsEl.innerText = now;
    }, 50);

    function formatRelative(msDelta) {
        const isPast = msDelta < 0;
        const absDelta = Math.abs(msDelta);
        const s = Math.floor(absDelta / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);

        let timeStr = "";
        if (d > 0) timeStr = `${d} Tag${d === 1 ? '' : 'en'}`;
        else if (h > 0) timeStr = `${h} Stunde${h === 1 ? '' : 'n'}`;
        else if (m > 0) timeStr = `${m} Minute${m === 1 ? '' : 'n'}`;
        else timeStr = `${s} Sekunde${s === 1 ? '' : 'n'}`;

        return isPast ? `vor ${timeStr}` : `in ${timeStr}`;
    }

    function updateFromTimestamp() {
        const val = String(tsInput?.value || '').trim();
        if (!val || isNaN(val)) return;

        let num = Number(val);
        const unit = tsUnitSelect?.value || 's';
        const ms = unit === 's' ? num * 1000 : num;

        const date = new Date(ms);
        if (isNaN(date.getTime())) return;

        if (outLocal) outLocal.innerText = date.toLocaleString('de-DE');
        if (outUtc) outUtc.innerText = date.toUTCString();
        if (outIso) outIso.innerText = date.toISOString();
        if (outRfc) outRfc.innerText = date.toString();
        if (outRelative) outRelative.innerText = formatRelative(date.getTime() - Date.now());

        // Sync date picker
        if (dateInput) {
            const tzOffset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 19);
            dateInput.value = localISOTime;
        }
    }

    function updateFromDate() {
        const dateStr = dateInput?.value;
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return;

        const ms = date.getTime();
        const unit = tsUnitSelect?.value || 's';
        if (tsInput) tsInput.value = unit === 's' ? Math.floor(ms / 1000) : ms;

        if (outLocal) outLocal.innerText = date.toLocaleString('de-DE');
        if (outUtc) outUtc.innerText = date.toUTCString();
        if (outIso) outIso.innerText = date.toISOString();
        if (outRfc) outRfc.innerText = date.toString();
        if (outRelative) outRelative.innerText = formatRelative(ms - Date.now());
    }

    if (tsInput) tsInput.addEventListener('input', updateFromTimestamp);
    if (tsUnitSelect) tsUnitSelect.addEventListener('change', updateFromTimestamp);
    if (dateInput) dateInput.addEventListener('input', updateFromDate);

    // Initial fill with now
    if (tsInput && !tsInput.value) {
        tsInput.value = Math.floor(Date.now() / 1000);
        updateFromTimestamp();
    }

    // Duration diff
    if (diffBtn) {
        diffBtn.addEventListener('click', () => {
            const startVal = diffStart?.value;
            const endVal = diffEnd?.value;
            if (!startVal || !endVal) return;

            const t1 = new Date(startVal).getTime();
            const t2 = new Date(endVal).getTime();
            if (isNaN(t1) || isNaN(t2)) return;

            const diffMs = Math.abs(t2 - t1);
            const totalSec = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSec / 86400);
            const hours = Math.floor((totalSec % 86400) / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;

            if (diffResult) {
                diffResult.innerHTML = `<span style="color:var(--neon-green)">${days} Tage, ${hours} Std, ${minutes} Min, ${seconds} Sek</span> <span style="color:var(--text-dim)">(${totalSec.toLocaleString('de-DE')} Sekunden)</span>`;
            }
        });
    }
}

export function initCoder() {
    setupCoderSubtabs();
    initEncoder();
    setupJwtInspector();
    setupPasswordStudio();
    initDiffViewer();
    initCronBuilder();
    initCurlConverter();
    initMarkdownPreviewer();
    initJsonYamlStudio();
    initRegexTester();
    initEpochStudio();
}


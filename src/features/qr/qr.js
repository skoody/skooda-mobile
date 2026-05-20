import { getEl } from '../../core/ui.js';

const qrInput = getEl('qr-input');
const qrResult = getEl('qr-code-result');
const qrClear = getEl('qr-clear');
const qrDownload = getEl('qr-download');
const qrSignPayload = getEl('qr-sign-payload');
const qrColorSelect = getEl('qr-color');
const qrSizeSelect = getEl('qr-size-select');

const scanResult = getEl('scan-result');
const startBtn = getEl('start-scan');
const scannerActions = getEl('scanner-actions');
const qrCopy = getEl('qr-copy');
const qrOpen = getEl('qr-open');
const qrTorch = getEl('qr-torch');
const readerContainer = getEl('reader-container');
const qrBatchMode = getEl('qr-batch-mode');
const qrClearHistory = getEl('qr-clear-history');
const qrScanHistoryList = getEl('qr-scan-history-list');
const qrHexContainer = getEl('qr-hex-container');
const qrHexView = getEl('qr-hex-view');

let lastResult = "";
let lastScanTime = 0;
let torchActive = false;
let scanHistory = [];

export function initQR() {
    // Restore scan history
    try {
        scanHistory = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
    } catch(e) {
        scanHistory = [];
    }
    renderHistory();

    // Generator Reactive Triggers
    const triggerGenerate = () => {
        generateQR();
    };

    if (qrInput) qrInput.addEventListener('input', triggerGenerate);
    if (qrSignPayload) qrSignPayload.addEventListener('change', triggerGenerate);
    if (qrColorSelect) qrColorSelect.addEventListener('change', triggerGenerate);
    if (qrSizeSelect) qrSizeSelect.addEventListener('change', triggerGenerate);

    if (qrClear) {
        qrClear.addEventListener('click', () => {
            qrInput.value = '';
            qrResult.innerHTML = '';
            qrDownload.style.display = 'none';
        });
    }

    if (qrDownload) {
        qrDownload.addEventListener('click', () => {
            const canvas = qrResult.querySelector('canvas');
            const img = qrResult.querySelector('img');
            let dataUrl = "";
            if (canvas) dataUrl = canvas.toDataURL("image/png");
            else if (img && img.src) dataUrl = img.src;
            if (dataUrl && window.Android) {
                const timestamp = Math.floor(Date.now() / 1000);
                window.Android.saveImage(dataUrl, `skooda-qr-${timestamp}.png`);
            }
        });
    }

    // Clear History Button
    if (qrClearHistory) {
        qrClearHistory.addEventListener('click', () => {
            scanHistory = [];
            localStorage.setItem('qr_scan_history', JSON.stringify([]));
            renderHistory();
        });
    }

    // Scanner Trigger
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (!window.html5QrCode) window.html5QrCode = new Html5Qrcode("reader");
            if (startBtn.innerText === "Stop Scanner") {
                stopScanner();
                return;
            }
            const boxSize = Math.min(250, window.innerWidth * 0.7);
            const config = {
                fps: 20,
                qrbox: { width: boxSize, height: boxSize },
                aspectRatio: 1.777778,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.DATA_MATRIX
                ]
            };
            if (scannerActions) scannerActions.style.display = 'none';
            if (readerContainer) readerContainer.classList.add('active');
            if (scanResult) scanResult.innerText = "Initializing...";
            
            window.html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    const isBatch = qrBatchMode && qrBatchMode.checked;
                    let now = Date.now();
                    if (decodedText === lastResult && now - lastScanTime < 2500) return;

                    lastResult = decodedText;
                    lastScanTime = now;
                    const format = decodedResult.result.format.formatName;

                    if (window.navigator.vibrate) window.navigator.vibrate(100);

                    // Update UI with scanned result
                    if (scanResult) scanResult.innerText = `[${format}] ${decodedText}`;
                    updateHexView(decodedText);

                    // Add to history list (async signature checks)
                    addScanItem(decodedText, format);

                    if (scannerActions) scannerActions.style.display = 'flex';
                    if (qrOpen) qrOpen.style.display = decodedText.startsWith('http') ? 'block' : 'none';

                    if (!isBatch) {
                        stopScanner();
                    }
                },
                () => { }
            ).then(() => {
                startBtn.innerText = "Stop Scanner";
                if (scanResult) scanResult.innerText = "Scanning...";
                initCameraControls();
            }).catch(err => {
                if (scanResult) scanResult.innerText = "Error: " + err;
                if (readerContainer) readerContainer.classList.remove('active');
            });
        });
    }

    if (qrTorch) {
        qrTorch.addEventListener('click', () => {
            const video = document.querySelector('#reader video');
            if (video && video.srcObject) {
                const track = video.srcObject.getVideoTracks()[0];
                torchActive = !torchActive;
                track.applyConstraints({ advanced: [{ torch: torchActive }] });
                qrTorch.style.background = torchActive ? 'var(--accent-primary)' : 'rgba(0, 0, 0, 0.5)';
            }
        });
    }

    if (qrCopy) {
        qrCopy.addEventListener('click', () => {
            if (lastResult) {
                navigator.clipboard.writeText(lastResult).then(() => {
                    const originalText = qrCopy.innerText;
                    qrCopy.innerText = "Copied!";
                    setTimeout(() => { qrCopy.innerText = originalText; }, 2000);
                });
            }
        });
    }

    if (qrOpen) {
        qrOpen.addEventListener('click', () => {
            if (window.Android && window.Android.openExternalUrl) {
                window.Android.openExternalUrl(lastResult);
            } else {
                window.open(lastResult, '_blank');
            }
        });
    }
}

async function generateQR() {
    if (!qrInput) return;
    const val = qrInput.value.trim();
    if (!val) {
        qrResult.innerHTML = '';
        qrDownload.style.display = 'none';
        return;
    }

    qrResult.innerHTML = '';
    let finalPayload = val;

    if (qrSignPayload && qrSignPayload.checked) {
        try {
            const sig = await window.__TAURI__.core.invoke("sign_payload", { msg: val });
            const pub = await window.__TAURI__.core.invoke("get_identity");
            finalPayload = `${val}|sig:${sig}|pub:${pub}`;
        } catch (e) {
            console.error("Generator signing failed:", e);
        }
    }

    const activeColor = qrColorSelect ? qrColorSelect.value : "#00f2ff";
    const activeSize = qrSizeSelect ? parseInt(qrSizeSelect.value, 10) : 256;

    new QRCode(qrResult, {
        text: finalPayload,
        width: activeSize,
        height: activeSize,
        colorDark: activeColor,
        colorLight: "#0c0d12",
        correctLevel: QRCode.CorrectLevel.H
    });

    qrDownload.style.display = 'block';
}

function updateHexView(text) {
    if (qrHexContainer && qrHexView) {
        qrHexContainer.style.display = 'block';
        let hex = "";
        for (let i = 0; i < text.length; i++) {
            let h = text.charCodeAt(i).toString(16).toUpperCase();
            if (h.length < 2) h = "0" + h;
            hex += h + " ";
        }
        qrHexView.innerText = hex.trim();
    }
}

async function addScanItem(text, format) {
    let sigStatus = "unsigned";
    let originalText = text;

    if (text.includes('|sig:') && text.includes('|pub:')) {
        try {
            const parts = text.split('|sig:');
            const msg = parts[0];
            const subparts = parts[1].split('|pub:');
            const sig = subparts[0];
            const pub = subparts[1];

            originalText = msg;
            const valid = await window.__TAURI__.core.invoke("verify_payload", {
                msg: msg,
                signatureB64: sig,
                pubkeyB64: pub
            });
            sigStatus = valid ? "verified" : "invalid";
        } catch(e) {
            sigStatus = "error";
        }
    }

    const item = {
        time: new Date().toLocaleTimeString(),
        originalText,
        fullText: text,
        format,
        sigStatus
    };

    scanHistory.unshift(item);
    if (scanHistory.length > 50) scanHistory.pop();
    localStorage.setItem('qr_scan_history', JSON.stringify(scanHistory));
    renderHistory();
}

function renderHistory() {
    if (!qrScanHistoryList) return;
    if (scanHistory.length === 0) {
        qrScanHistoryList.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 10px 0;">No items scanned yet.</div>';
        return;
    }

    qrScanHistoryList.innerHTML = '';
    scanHistory.forEach((item, index) => {
        const row = document.createElement('div');
        row.style.background = 'rgba(255,255,255,0.02)';
        row.style.border = '1px solid rgba(255,255,255,0.05)';
        row.style.borderRadius = '4px';
        row.style.padding = '6px 8px';
        row.style.marginBottom = '6px';
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '4px';

        let badge = '<span style="color: var(--text-dim);">Unsigned</span>';
        if (item.sigStatus === "verified") {
            badge = '<span style="color: var(--neon-green); font-weight: bold;">🔒 Verified Ed25519</span>';
        } else if (item.sigStatus === "invalid") {
            badge = '<span style="color: var(--neon-red); font-weight: bold;">⚠️ Invalid Signature</span>';
        } else if (item.sigStatus === "error") {
            badge = '<span style="color: var(--neon-red);">Signature Error</span>';
        }

        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-dim);">
                <span>${item.time} (${item.format})</span>
                <span>${badge}</span>
            </div>
            <div style="word-break: break-all; color: var(--text-normal); font-family: monospace;">${item.originalText}</div>
            <div style="display: flex; gap: 8px; margin-top: 2px;">
                <button class="btn mini copy-btn" style="padding: 1px 4px; font-size: 0.6rem;">Copy</button>
                <button class="btn mini hex-btn" style="padding: 1px 4px; font-size: 0.6rem;">Hex</button>
            </div>
        `;

        row.querySelector('.copy-btn').onclick = () => {
            navigator.clipboard.writeText(item.originalText);
            const btn = row.querySelector('.copy-btn');
            btn.innerText = "Copied!";
            setTimeout(() => { btn.innerText = "Copy"; }, 1500);
        };

        row.querySelector('.hex-btn').onclick = () => {
            updateHexView(item.fullText);
        };

        qrScanHistoryList.appendChild(row);
    });
}

export function stopScanner() {
    if (window.html5QrCode) {
        try {
            window.html5QrCode.stop().then(() => {
                window.html5QrCode.clear();
                resetScannerUI();
            }).catch(() => {
                try { window.html5QrCode.clear(); } catch (e) { }
                resetScannerUI();
            });
        } catch (e) { }
    }
}

function resetScannerUI() {
    if (startBtn) startBtn.innerText = "Start Scanner";
    if (readerContainer) readerContainer.classList.remove('active');
    if (qrTorch) qrTorch.style.display = 'none';
    const zc = getEl('zoom-controls');
    if (zc) zc.style.display = 'none';
    torchActive = false;
}

function initCameraControls() {
    setTimeout(() => {
        const video = document.querySelector('#reader video');
        if (video && video.srcObject) {
            const track = video.srcObject.getVideoTracks()[0];
            const caps = track.getCapabilities();
            if (caps && caps.torch && qrTorch) qrTorch.style.display = 'block';

            const zoomControls = getEl('zoom-controls');
            const zoomSlider = getEl('camera-zoom');
            const zoomMax = getEl('zoom-max');
            if (zoomControls && zoomSlider) {
                zoomControls.style.display = 'flex';
                if (caps && caps.zoom) {
                    zoomSlider.min = caps.zoom.min || 1;
                    zoomSlider.max = caps.zoom.max || 5;
                    zoomSlider.step = caps.zoom.step || 0.1;
                }
                zoomSlider.value = (track.getSettings && track.getSettings().zoom) ? track.getSettings().zoom : 1;
                if (zoomMax) zoomMax.innerText = `${zoomSlider.max}x`;

                zoomSlider.oninput = async (e) => {
                    const val = parseFloat(e.target.value);
                    try { await track.applyConstraints({ advanced: [{ zoom: val }] }); } catch (err) {
                        try { await track.applyConstraints({ zoom: val }); } catch (err2) { }
                    }
                };
            }
            try {
                if (caps && caps.focusMode && caps.focusMode.includes('continuous')) {
                    track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                }
            } catch (e) { }
        }
    }, 500);
}

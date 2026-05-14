import { getEl } from '../../core/ui.js';

const qrInput = getEl('qr-input');
const qrResult = getEl('qr-code-result');
const qrClear = getEl('qr-clear');
const qrDownload = getEl('qr-download');

const scanResult = getEl('scan-result');
const startBtn = getEl('start-scan');
const scannerActions = getEl('scanner-actions');
const qrCopy = getEl('qr-copy');
const qrOpen = getEl('qr-open');
const qrTorch = getEl('qr-torch');
const readerContainer = getEl('reader-container');

let lastResult = "";
let torchActive = false;

export function initQR() {
    // Generator
    if (qrInput) {
        qrInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!val) {
                qrResult.innerHTML = '';
                qrDownload.style.display = 'none';
                return;
            }
            qrResult.innerHTML = '';
            new QRCode(qrResult, {
                text: val,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            qrDownload.style.display = 'block';
        });
    }

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

    // Scanner
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
                    if (decodedText === lastResult) return;
                    lastResult = decodedText;
                    const format = decodedResult.result.format.formatName;
                    if (scanResult) scanResult.innerText = `[${format}] ${decodedText}`;
                    if (window.navigator.vibrate) window.navigator.vibrate(100);
                    if (scannerActions) scannerActions.style.display = 'flex';
                    if (qrOpen) qrOpen.style.display = decodedText.startsWith('http') ? 'block' : 'none';
                    stopScanner();
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

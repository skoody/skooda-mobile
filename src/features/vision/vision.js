import { getCached, getEl } from '../../core/ui.js';

export let espActive = false;
let espModel = null;
let espStream = null;
let espReqId = null;
let vfcId = null;
let detectionCanvas = document.createElement('canvas');
let dCtx = detectionCanvas.getContext('2d', { alpha: false });
detectionCanvas.width = 320;
detectionCanvas.height = 320;
let isDetecting = false;

// HUD & Performance Metrics
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let inferenceTime = 0;

const espVideo = getEl('esp-video');
const espMjpeg = getEl('esp-mjpeg');
const espCanvas = getEl('esp-canvas');
const espStatus = getEl('esp-status');
const espSliders = getEl('esp-sliders');
const toggleEspBtn = getEl('toggle-esp-btn');
const filterPerson = getEl('esp-filter-person');
const filterCar = getEl('esp-filter-car');
const filterOther = getEl('esp-filter-other');
const customFilter = getEl('esp-custom-filter');
const captureBtn = getEl('esp-capture-btn');
const sourceSelect = getEl('esp-source-select');
const ipUrlContainer = getEl('esp-ip-url-container');
const ipUrlInput = getEl('esp-ip-url');
const boxColorSelect = getEl('esp-box-color');
const espHud = getEl('esp-hud');

export function initVision() {
    if (toggleEspBtn) toggleEspBtn.onclick = startESP;
    if (captureBtn) {
        captureBtn.onclick = () => {
            const isIp = sourceSelect && sourceSelect.value === 'ip';
            const sourceEl = isIp ? espMjpeg : espVideo;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = isIp ? (sourceEl.naturalWidth || 640) : (sourceEl.videoWidth || 640);
            tempCanvas.height = isIp ? (sourceEl.naturalHeight || 480) : (sourceEl.videoHeight || 480);
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(sourceEl, 0, 0);
            tCtx.drawImage(espCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            const dataUrl = tempCanvas.toDataURL('image/png');
            if (window.Android && window.Android.saveImage) {
                window.Android.saveImage(dataUrl, 'esp-capture-' + Date.now() + '.png');
            } else {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = 'esp-capture-' + Date.now() + '.png';
                link.click();
            }
        };
    }

    if (sourceSelect) {
        // Restore saved IP URL
        if (ipUrlInput) {
            ipUrlInput.value = localStorage.getItem('esp_ip_url') || 'http://192.168.1.50:81/stream';
            ipUrlInput.onchange = (e) => {
                localStorage.setItem('esp_ip_url', e.target.value.trim());
            };
        }

        sourceSelect.onchange = (e) => {
            if (e.target.value === 'ip') {
                if (ipUrlContainer) ipUrlContainer.style.display = 'flex';
                if (espSliders) espSliders.style.display = 'none';
            } else {
                if (ipUrlContainer) ipUrlContainer.style.display = 'none';
                if (espSliders && espActive) espSliders.style.display = 'block';
            }
            if (espActive) {
                stopESP();
                startESP();
            }
        };
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && espActive) {
            stopESP();
            if (window.skoodaNav) window.skoodaNav.showCategories();
        }
    });
}

export async function startESP() {
    if (espActive) { stopESP(); return; }
    espActive = true;
    if (toggleEspBtn) toggleEspBtn.innerText = 'Stoppe ESP';
    
    const isIp = sourceSelect && sourceSelect.value === 'ip';
    
    if (!isIp) {
        if (espSliders) espSliders.style.display = 'block';
        if (espVideo) espVideo.style.display = 'block';
        if (espMjpeg) espMjpeg.style.display = 'none';
    } else {
        if (espSliders) espSliders.style.display = 'none';
        if (espVideo) espVideo.style.display = 'none';
        if (espMjpeg) espMjpeg.style.display = 'block';
    }
    
    const reticle = getCached('esp-reticle');
    if (reticle) reticle.style.display = 'block';
    if (espHud) espHud.style.display = 'block';

    if (!isIp) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }
            });
            espStream = stream;
            if (espVideo) {
                espVideo.srcObject = stream;
                await espVideo.play();
            }
        } catch (e) {
            if (espStatus) espStatus.innerText = 'Kamera Fehler: ' + e.message;
            espActive = false;
            if (toggleEspBtn) toggleEspBtn.innerText = 'Starte ESP';
            return;
        }
    } else {
        const url = ipUrlInput ? ipUrlInput.value.trim() : '';
        if (espMjpeg) {
            espMjpeg.src = url;
            espMjpeg.onerror = () => {
                if (espStatus) espStatus.innerText = 'MJPEG Stream Fehler';
                stopESP();
            };
        }
    }

    if (espStatus) espStatus.innerText = 'Lade KI...';
    try {
        if (!window.Android || !window.Android.detectObjects) {
            if (!espModel) {
                const { ObjectDetector, FilesetResolver } = await import('../../lib/mediapipe/vision_bundle.mjs');
                const vision = await FilesetResolver.forVisionTasks('../../lib/mediapipe');
                espModel = await ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'models/mediapipe/detector.tflite',
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    scoreThreshold: 0.5
                });
            }
        }
        if (espStatus) espStatus.innerText = 'ESP AKTIV';

        if (!isIp && espVideo && 'requestVideoFrameCallback' in espVideo) {
            vfcId = espVideo.requestVideoFrameCallback(detectFrameCallback);
        } else {
            detectFrame();
        }
    } catch (e) {
        if (espStatus) espStatus.innerText = 'KI Fehler: ' + e.message;
        stopESP();
    }
}

export function stopESP() {
    espActive = false;
    if (espReqId) cancelAnimationFrame(espReqId);
    if (espStream) {
        espStream.getTracks().forEach(t => t.stop());
        espStream = null;
    }
    if (espVideo) {
        espVideo.srcObject = null;
        if (espVideo.cancelVideoFrameCallback && vfcId) {
            espVideo.cancelVideoFrameCallback(vfcId);
        }
    }
    if (espMjpeg) {
        espMjpeg.src = '';
    }
    if (espCanvas) {
        const ctx = espCanvas.getContext('2d');
        ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
    }
    if (toggleEspBtn) toggleEspBtn.innerText = 'Starte ESP';
    if (espStatus) espStatus.innerText = 'Offline';
    if (espSliders) espSliders.style.display = 'none';
    if (espHud) espHud.style.display = 'none';
    const reticle = getCached('esp-reticle');
    if (reticle) reticle.style.display = 'none';
}

function detectFrameCallback(now, metadata) {
    if (!espActive) return;
    detectLogic();
    vfcId = espVideo.requestVideoFrameCallback(detectFrameCallback);
}

function detectFrame() {
    if (!espActive) return;
    detectLogic();
    espReqId = requestAnimationFrame(detectFrame);
}

function calculateFps() {
    const now = performance.now();
    frameCount++;
    if (now - lastFrameTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
        frameCount = 0;
        lastFrameTime = now;
        const fpsEl = getEl('esp-hud-fps');
        if (fpsEl) fpsEl.innerText = fps;
    }
}

function detectLogic() {
    const isIp = sourceSelect && sourceSelect.value === 'ip';
    const sourceEl = isIp ? espMjpeg : espVideo;
    if (!sourceEl) return;

    if (isIp && (!espMjpeg.complete || espMjpeg.naturalWidth === 0)) {
        return; // MJPEG not fully loaded yet
    }

    const width = isIp ? espMjpeg.clientWidth : espVideo.clientWidth;
    const height = isIp ? espMjpeg.clientHeight : espVideo.clientHeight;

    if (espCanvas.width !== width || espCanvas.height !== height) {
        espCanvas.width = width;
        espCanvas.height = height;
    }

    calculateFps();

    const startTime = performance.now();

    if (window.Android && window.Android.detectObjects) {
        if (isDetecting) return;
        isDetecting = true;

        dCtx.drawImage(sourceEl, 0, 0, 320, 320);
        const dataUrl = detectionCanvas.toDataURL('image/jpeg', 0.6);

        window.onNativeObjectsDetected = (res) => {
            isDetecting = false;
            inferenceTime = Math.round(performance.now() - startTime);
            const infEl = getEl('esp-hud-inf');
            const devEl = getEl('esp-hud-dev');
            if (infEl) infEl.innerText = inferenceTime;
            if (devEl) devEl.innerText = 'Android GPU';

            if (res.detections) {
                const mappedDetections = res.detections.map(det => {
                    const box = det.boundingBox;
                    return {
                        boundingBox: {
                            originX: box.left,
                            originY: box.top,
                            width: box.right - box.left,
                            height: box.bottom - box.top
                        },
                        categories: det.categories.map(cat => ({
                            categoryName: cat.label,
                            score: cat.score
                        }))
                    };
                });
                drawDetections(mappedDetections);
            }
        };

        window.Android.detectObjects(dataUrl, 'onNativeObjectsDetected');
    } else {
        if (!espModel) return;
        dCtx.drawImage(sourceEl, 0, 0, 320, 320);
        const detections = espModel.detectForVideo(detectionCanvas, performance.now()).detections;
        inferenceTime = Math.round(performance.now() - startTime);
        const infEl = getEl('esp-hud-inf');
        const devEl = getEl('esp-hud-dev');
        if (infEl) infEl.innerText = inferenceTime;
        if (devEl) devEl.innerText = 'MediaPipe GPU';
        drawDetections(detections);
    }
}

function drawDetections(detections) {
    const ctx = espCanvas.getContext('2d');
    ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);

    const scaleX = espCanvas.width / 320;
    const scaleY = espCanvas.height / 320;

    const espSens = getEl('esp-sens');
    const threshold = espSens ? parseFloat(espSens.value) : 0.5;

    const animals = ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'];
    const cars = ['car', 'truck', 'bus', 'motorcycle'];
    const customQuery = customFilter?.value.toLowerCase().trim();
    const activeColor = boxColorSelect ? boxColorSelect.value : '#00f2ff';

    let matchCount = 0;

    detections.forEach(det => {
        if (det.categories[0].score < threshold) return;

        const label = det.categories[0].categoryName;
        const isPerson = label === 'person';
        const isAirplane = label === 'airplane';
        const isAnimal = animals.includes(label);
        const isCar = cars.includes(label);
        const isCustom = customQuery && label.includes(customQuery);

        let show = false;
        if (filterPerson?.checked && isPerson) show = true;
        if (filterCar?.checked && isCar) show = true;
        if (isAirplane || isAnimal) show = true;
        if (filterOther?.checked && !isPerson && !isCar && !isAirplane && !isAnimal) show = true;
        if (isCustom) show = true;

        if (show) {
            matchCount++;
            const box = det.boundingBox;
            const x = box.originX * scaleX;
            const y = box.originY * scaleY;
            const w = box.width * scaleX;
            const h = box.height * scaleY;

            ctx.strokeStyle = activeColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            let dist = "";
            if (isPerson) {
                const isIp = sourceSelect && sourceSelect.value === 'ip';
                const heightVal = isIp ? (espMjpeg.naturalHeight || 480) : (espVideo.videoHeight || 720);
                const d = (1.7 * 800) / (box.height * (heightVal / 320));
                dist = " ~" + d.toFixed(1) + "m";
            }

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(x, y - 20, Math.max(100, w), 20);
            ctx.fillStyle = activeColor;
            ctx.font = 'bold 11px monospace';
            ctx.fillText(`${label.toUpperCase()} (${(det.categories[0].score * 100).toFixed(0)}%)${dist}`, x + 5, y - 5);

            // Bounding box corner ticks
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + 10, y);
            ctx.moveTo(x, y); ctx.lineTo(x, y + 10);
            ctx.stroke();
        }
    });

    const detEl = getEl('esp-hud-det');
    if (detEl) detEl.innerText = matchCount;
}

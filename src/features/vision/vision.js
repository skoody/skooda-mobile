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

const espVideo = getEl('esp-video');
const espCanvas = getEl('esp-canvas');
const espStatus = getEl('esp-status');
const espSliders = getEl('esp-sliders');
const toggleEspBtn = getEl('toggle-esp-btn');
const filterPerson = getEl('esp-filter-person');
const filterCar = getEl('esp-filter-car');
const filterOther = getEl('esp-filter-other');
const customFilter = getEl('esp-custom-filter');
const captureBtn = getEl('esp-capture-btn');

export function initVision() {
    if (toggleEspBtn) toggleEspBtn.onclick = startESP;
    if (captureBtn) {
        captureBtn.onclick = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = espVideo.videoWidth;
            tempCanvas.height = espVideo.videoHeight;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(espVideo, 0, 0);
            tCtx.drawImage(espCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            const dataUrl = tempCanvas.toDataURL('image/png');
            window.Android.saveImage(dataUrl, 'esp-capture-' + Date.now() + '.png');
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
    if (espSliders) espSliders.style.display = 'block';
    const reticle = getCached('esp-reticle');
    if (reticle) reticle.style.display = 'block';

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

    if (espStatus) espStatus.innerText = 'Lade GPU KI...';
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

        if ('requestVideoFrameCallback' in espVideo) {
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
    if (espCanvas) {
        const ctx = espCanvas.getContext('2d');
        ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
    }
    if (toggleEspBtn) toggleEspBtn.innerText = 'Starte ESP';
    if (espStatus) espStatus.innerText = 'Offline';
    if (espSliders) espSliders.style.display = 'none';
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

function detectLogic() {
    if (!espVideo) return;

    if (espCanvas.width !== espVideo.clientWidth) {
        espCanvas.width = espVideo.clientWidth;
        espCanvas.height = espVideo.clientHeight;
    }

    if (window.Android && window.Android.detectObjects) {
        if (isDetecting) return;
        isDetecting = true;

        dCtx.drawImage(espVideo, 0, 0, 320, 320);
        const dataUrl = detectionCanvas.toDataURL('image/jpeg', 0.6);

        window.onNativeObjectsDetected = (res) => {
            isDetecting = false;
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
        dCtx.drawImage(espVideo, 0, 0, 320, 320);
        const detections = espModel.detectForVideo(detectionCanvas, performance.now()).detections;
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
            const box = det.boundingBox;
            const x = box.originX * scaleX;
            const y = box.originY * scaleY;
            const w = box.width * scaleX;
            const h = box.height * scaleY;

            let color = '#00f2ff';
            if (isPerson) color = '#ff0055';
            if (isAnimal) color = '#a200ff';
            if (isAirplane) color = '#ffffff';
            if (isCar) color = '#ffd500';
            if (isCustom) color = '#00ff44';

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            let dist = "";
            if (isPerson) {
                const d = (1.7 * 800) / (box.height * (espVideo.videoHeight / 320));
                dist = " ~" + d.toFixed(1) + "m";
            }

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(x, y - 20, w, 20);
            ctx.fillStyle = color;
            ctx.font = 'bold 12px monospace';
            ctx.fillText(label.toUpperCase() + dist, x + 5, y - 5);

            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + 10, y);
            ctx.moveTo(x, y); ctx.lineTo(x, y + 10);
            ctx.stroke();
        }
    });
}

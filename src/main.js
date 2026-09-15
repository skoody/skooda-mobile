import { initNavigation } from './core/navigation.js';
import { initStats } from './core/stats.js';
import { initErrorBoundary } from './core/error.js';
import { initChat } from './features/chat/chat.js';
import { initCyber } from './features/cyber/cyber.js';
import { initQR } from './features/qr/qr.js';
import { initMap } from './features/map/map.js';
import { initVision } from './features/vision/vision.js';
import { initSettings } from './features/settings/settings.js';
import { initRechner } from './features/rechner/rechner.js';
import { ensureGeometryDom } from './features/rechner/geometry-ui.js';
import { initOsint } from './features/osint/osint.js';
import { initScreenRecorder } from './features/device/screenrecorder.js';
import { initCoder } from './features/coder/coder.js';
import { initAudioLab } from './features/audio/audiolab.js';
import { initSurvival } from './features/survival/survival.js';
import { initRf } from './features/rechner/rf.js';
import { initAudioMeter } from './features/device/audiometer.js';
import { initBaroLux } from './features/device/barolux.js';
import { initEmfMeter } from './features/device/emfmeter.js';

import * as MapModule from './features/map/map.js';
import * as VisionModule from './features/vision/vision.js';
import * as NavigationModule from './core/navigation.js';
import * as QRModule from './features/qr/qr.js';

window.skoodaMap = MapModule;
window.skoodaVision = VisionModule;
window.skoodaNav = NavigationModule;
window.skoodaQR = QRModule;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Skooda Mobile Modular Core Initializing...");

    initErrorBoundary();
    initNavigation();
    initStats();
    initChat();
    initCyber();
    initQR();
    initMap();
    initVision();
    initSettings();
    ensureGeometryDom();
    initRechner();
    initOsint();
    initScreenRecorder();
    initCoder();
    initAudioLab();
    initSurvival();
    initRf();
    initAudioMeter();
    initBaroLux();
    initEmfMeter();

    console.log("✨ All modules initialized.");
});

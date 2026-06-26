import { getEl } from '../../core/ui.js';

let recordingInterval = null;
let recordingStartTime = 0;
let pollInterval = null;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function setRecordingUI(active) {
    const dot = getEl('rec-dot');
    const statusText = getEl('rec-status-text');
    const timer = getEl('rec-timer');
    const startBtn = getEl('btn-start-rec');
    const stopBtn = getEl('btn-stop-rec');
    const info = getEl('rec-info');

    if (active) {
        dot.classList.add('active');
        timer.classList.add('active');
        statusText.textContent = 'Aufnahme läuft...';
        statusText.style.color = '#ff0044';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        info.style.display = 'none';

        recordingStartTime = Date.now();
        if (recordingInterval) clearInterval(recordingInterval);
        recordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            timer.textContent = formatTime(elapsed);
        }, 1000);
    } else {
        dot.classList.remove('active');
        timer.classList.remove('active');
        statusText.textContent = 'Bereit';
        statusText.style.color = '';
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        info.style.display = 'block';

        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }

        setTimeout(() => {
            if (!dot.classList.contains('active')) {
                timer.textContent = '00:00';
                info.style.display = 'none';
            }
        }, 5000);
    }
}

function startPollingForRecording() {
    if (pollInterval) clearInterval(pollInterval);
    let attempts = 0;
    pollInterval = setInterval(() => {
        attempts++;
        try {
            if (typeof Android !== 'undefined' && Android.isScreenRecording && Android.isScreenRecording()) {
                clearInterval(pollInterval);
                pollInterval = null;
                setRecordingUI(true);
                return;
            }
        } catch (e) {}
        if (attempts > 30) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }, 500);
}

export function initScreenRecorder() {
    const startBtn = getEl('btn-start-rec');
    const stopBtn = getEl('btn-stop-rec');

    if (!startBtn || !stopBtn) return;

    startBtn.addEventListener('click', () => {
        if (typeof Android !== 'undefined' && Android.startScreenRecording) {
            Android.startScreenRecording('__screenRecordCallback');
            startPollingForRecording();
        }
    });

    stopBtn.addEventListener('click', () => {
        if (typeof Android !== 'undefined' && Android.stopScreenRecording) {
            Android.stopScreenRecording();
            setRecordingUI(false);
        }
    });

    if (typeof Android !== 'undefined' && Android.isScreenRecording) {
        try {
            if (Android.isScreenRecording()) {
                setRecordingUI(true);
            }
        } catch (e) {}
    }
}

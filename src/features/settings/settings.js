import { getEl } from '../../core/ui.js';

const checkUpdateBtn = getEl('check-update-btn');
const downloadUpdateBtn = getEl('download-update-btn');
const updateInfo = getEl('update-info');
const latestVersionVal = getEl('latest-version-val');
const updateTitle = getEl('update-title');
const updateDesc = getEl('update-desc');
const releaseNotes = getEl('release-notes');

let CURRENT_VERSION = "0.9.0";
if (window.Android && window.Android.getAppVersion) {
    CURRENT_VERSION = window.Android.getAppVersion();
}
const GITHUB_REPO = "skoody/skooda-mobile";

function nativeCheckForUpdate() {
    return new Promise((resolve) => {
        if (!window.Android || !window.Android.checkForUpdate) {
            return resolve(null);
        }
        const cbName = '_updateCb_' + Math.random().toString(36).substring(2, 9);
        window[cbName] = (res) => {
            resolve(res);
        };
        try {
            window.Android.checkForUpdate(cbName);
        } catch (e) {
            delete window[cbName];
            resolve(null);
        }
    });
}

export function initSettings() {
    // Hardware Toggles
    const toggleFlashlight = getEl('toggle-flashlight');
    const toggleBluetooth = getEl('toggle-bluetooth');

    if (toggleFlashlight) {
        toggleFlashlight.onchange = (e) => {
            if (window.Android) window.Android.setFlashlight(e.target.checked);
        };
    }

    if (toggleBluetooth) {
        toggleBluetooth.onchange = (e) => {
            if (window.__isUpdatingBT) return;
            if (window.Android) window.Android.toggleBluetooth(e.target.checked);
        };
    }

    // Feedback
    const sendFeedbackBtn = getEl('send-feedback-btn');
    const feedbackText = getEl('feedback-text');
    if (sendFeedbackBtn && feedbackText) {
        sendFeedbackBtn.onclick = () => {
            const text = feedbackText.value.trim();
            if (!text) return;
            const subject = encodeURIComponent("Skooda Mobile Feedback");
            const body = encodeURIComponent(`User Feedback (v${CURRENT_VERSION}):\n\n${text}`);
            const githubIssueUrl = `https://github.com/${GITHUB_REPO}/issues/new?title=${subject}&body=${body}`;
            if (window.Android) {
                window.Android.openExternalUrl(githubIssueUrl);
                window.Android.cleanupOldApks();
            } else {
                window.open(githubIssueUrl, '_blank');
            }
            feedbackText.value = "";
            alert("Danke für dein Feedback!");
        };
    }

    // Updater
    if (checkUpdateBtn) {
        checkUpdateBtn.onclick = async () => {
            checkUpdateBtn.disabled = true;
            checkUpdateBtn.innerText = "Prüfe...";
            try {
                let latestVersion = null;
                let downloadUrl = null;

                const nativeRes = await nativeCheckForUpdate();
                if (nativeRes) {
                    if (nativeRes.status === 'ok') {
                        latestVersion = nativeRes.latestVersion;
                        downloadUrl = nativeRes.downloadUrl;
                    } else {
                        throw new Error(nativeRes.message || "Netzwerkfehler");
                    }
                } else {
                    const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/README.md`);
                    if (!response.ok) throw new Error("Verbindung fehlgeschlagen");
                    const text = await response.text();
                    const match = text.match(/Aktuelle Version:\s*v?([\d\.]+)/);
                    if (!match) throw new Error("Format ungültig");
                    latestVersion = match[1];
                    downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latestVersion}/skooda-mobile.apk`;
                }

                if (latestVersionVal) latestVersionVal.innerText = 'v' + latestVersion;
                if (updateInfo) updateInfo.style.display = 'flex';
                if (releaseNotes) releaseNotes.innerText = `Skooda Mobile v${latestVersion} Release (Closed Source APK Download)`;

                if (latestVersion !== CURRENT_VERSION) {
                    if (updateTitle) updateTitle.innerText = "Update Verfügbar!";
                    if (updateDesc) updateDesc.innerText = "Eine neue Version wurde veröffentlicht.";
                    if (downloadUpdateBtn) {
                        downloadUpdateBtn.style.display = 'block';
                        downloadUpdateBtn.onclick = () => {
                            if (window.Android) {
                                window.Android.cleanupOldApks();
                                window.Android.openExternalUrl(downloadUrl);
                            } else {
                                window.open(downloadUrl, '_blank');
                            }
                        };
                    }
                } else {
                    if (updateTitle) updateTitle.innerText = "System Aktuell";
                    if (updateDesc) updateDesc.innerText = `Du nutzt bereits die neueste Version ${CURRENT_VERSION}.`;
                    if (downloadUpdateBtn) downloadUpdateBtn.style.display = 'none';
                }
            } catch (err) {
                if (updateTitle) updateTitle.innerText = "Fehler";
                if (updateDesc) updateDesc.innerText = "Konnte GitHub nicht erreichen: " + err.message;
            } finally {
                checkUpdateBtn.disabled = false;
                checkUpdateBtn.innerText = "Jetzt prüfen";
            }
        };
    }

    // Version Display
    const versionDisplay = document.querySelector('.version-badge .value');
    if (versionDisplay) versionDisplay.innerText = `v${CURRENT_VERSION}`;

    // Auto-check
    setInterval(silentCheckUpdate, 30 * 60 * 1000);
    setTimeout(silentCheckUpdate, 5000);
}

async function silentCheckUpdate() {
    try {
        let latestVersion = null;
        const nativeRes = await nativeCheckForUpdate();
        if (nativeRes) {
            if (nativeRes.status === 'ok') latestVersion = nativeRes.latestVersion;
        } else {
            const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/README.md`);
            if (!response.ok) return;
            const text = await response.text();
            const match = text.match(/Aktuelle Version:\s*v?([\d\.]+)/);
            if (!match) return;
            latestVersion = match[1];
        }

        if (latestVersion && latestVersion !== CURRENT_VERSION) {
            if (window.Android) {
                window.Android.showNotification("Skooda Update Verfügbar!", `Version v${latestVersion} ist jetzt verfügbar.`);
            }
            const updateTabBtn = document.querySelector('[data-tab="update-tab"]');
            if (updateTabBtn) {
                updateTabBtn.style.position = 'relative';
                let badge = updateTabBtn.querySelector('.notification-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'notification-badge';
                    badge.style = "position:absolute; top:5px; right:20%; width:8px; height:8px; background:var(--neon-purple); border-radius:50%; box-shadow:0 0 10px var(--neon-purple);";
                    updateTabBtn.appendChild(badge);
                }
            }
        }
    } catch (e) {}
}

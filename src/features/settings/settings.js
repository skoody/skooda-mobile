import { getEl } from '../../core/ui.js';

const checkUpdateBtn = getEl('check-update-btn');
const downloadUpdateBtn = getEl('download-update-btn');
const updateInfo = getEl('update-info');
const latestVersionVal = getEl('latest-version-val');
const updateTitle = getEl('update-title');
const updateDesc = getEl('update-desc');
const releaseNotes = getEl('release-notes');

let CURRENT_VERSION = "0.8.2";
if (window.Android && window.Android.getAppVersion) {
    CURRENT_VERSION = window.Android.getAppVersion();
}
const GITHUB_REPO = "skoody/skooda-mobile";

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
                const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
                if (!response.ok) throw new Error("Verbindung fehlgeschlagen");
                const data = await response.json();
                const latestVersion = data.tag_name.replace('v', '');

                if (latestVersionVal) latestVersionVal.innerText = 'v' + latestVersion;
                if (updateInfo) updateInfo.style.display = 'flex';
                if (releaseNotes) releaseNotes.innerText = data.body || "Keine Release-Notes vorhanden.";

                if (latestVersion !== CURRENT_VERSION) {
                    if (updateTitle) updateTitle.innerText = "Update Verfügbar!";
                    if (updateDesc) updateDesc.innerText = "Eine neue Version wurde auf GitHub gefunden.";
                    if (downloadUpdateBtn) {
                        downloadUpdateBtn.style.display = 'block';
                        const apkAsset = data.assets.find(a => a.name.endsWith('.apk'));
                        if (apkAsset) {
                            downloadUpdateBtn.onclick = () => {
                                if (window.Android) {
                                    window.Android.cleanupOldApks();
                                    window.Android.openExternalUrl(apkAsset.browser_download_url);
                                } else {
                                    window.open(apkAsset.browser_download_url, '_blank');
                                }
                            };
                        }
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
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        if (!response.ok) return;
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        if (latestVersion !== CURRENT_VERSION) {
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
    } catch (e) { }
}

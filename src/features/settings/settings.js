import { getEl, openExternalUrl } from '../../core/ui.js';
import { storageRepo } from '../../core/storage.js';
import { showToast } from '../../core/toast.js';

const checkUpdateBtn = getEl('check-update-btn');
const downloadUpdateBtn = getEl('download-update-btn');
const updateInfo = getEl('update-info');
const latestVersionVal = getEl('latest-version-val');
const updateTitle = getEl('update-title');
const updateDesc = getEl('update-desc');
const releaseNotes = getEl('release-notes');

let CURRENT_VERSION = "0.23.5";
const GITHUB_REPO = "skoody/skooda-mobile";

async function fetchCurrentVersion() {
    if (window.__TAURI__ && window.__TAURI__.core) {
        try {
            const v = await window.__TAURI__.core.invoke('get_app_version');
            if (v) {
                CURRENT_VERSION = v;
                return v;
            }
        } catch (e) {}
    }
    if (window.Android && window.Android.getAppVersion) {
        try {
            const v = window.Android.getAppVersion();
            if (v) {
                CURRENT_VERSION = v;
                return v;
            }
        } catch (e) {}
    }
    return CURRENT_VERSION;
}

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
    setupThemeSwitcher();
    setupBackupSystem();

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
            openExternalUrl(githubIssueUrl);
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
                await fetchCurrentVersion();
                let latestVersion = null;
                let downloadUrl = null;
                let notes = null;

                // 1. Try GitHub Releases API first (provides full markdown changelog)
                try {
                    const apiRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
                        headers: { 'Accept': 'application/vnd.github.v3+json' }
                    });
                    if (apiRes.ok) {
                        const releaseData = await apiRes.json();
                        if (releaseData.tag_name) {
                            latestVersion = releaseData.tag_name.replace(/^v/, '');
                            notes = releaseData.body || "";
                            if (releaseData.assets && releaseData.assets.length > 0) {
                                const apkAsset = releaseData.assets.find(a => a.name.endsWith('.apk'));
                                if (apkAsset) downloadUrl = apkAsset.browser_download_url;
                            }
                            if (!downloadUrl) {
                                downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latestVersion}/skooda-mobile.apk`;
                            }
                        }
                    }
                } catch (apiErr) {
                    console.warn("Direct GitHub API call failed, falling back", apiErr);
                }

                // 2. Native Android Bridge fallback
                if (!latestVersion) {
                    const nativeRes = await nativeCheckForUpdate();
                    if (nativeRes) {
                        if (nativeRes.status === 'ok') {
                            latestVersion = nativeRes.latestVersion;
                            downloadUrl = nativeRes.downloadUrl;
                            notes = nativeRes.body || nativeRes.releaseNotes || "";
                        } else {
                            throw new Error(nativeRes.message || "Netzwerkfehler");
                        }
                    }
                }

                // 3. Raw README.md Fallback
                if (!latestVersion) {
                    const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/README.md?t=${Date.now()}`);
                    if (!response.ok) throw new Error("Verbindung fehlgeschlagen");
                    const text = await response.text();
                    const match = text.match(/Aktuelle Version:\s*v?([\d\.]+)/);
                    if (!match) throw new Error("Format ungültig");
                    latestVersion = match[1];
                    downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latestVersion}/skooda-mobile.apk`;
                    
                    const featMatch = text.match(/### (?:🚀 )?Kern-Module & Features:([\s\S]*?)(?:---|\n\n##|$)/i);
                    if (featMatch) {
                        notes = featMatch[1].trim();
                    }
                }

                if (latestVersionVal) latestVersionVal.innerText = 'v' + latestVersion;
                if (updateInfo) updateInfo.style.display = 'flex';
                
                if (releaseNotes) {
                    if (notes && notes.trim().length > 0) {
                        releaseNotes.innerText = notes.trim();
                    } else {
                        releaseNotes.innerText = `Skooda Mobile v${latestVersion} Release:\n\n• Alle neuen Sicherheits- und Feature-Erweiterungen enthalten.\n• Geschlossenes APK-Build-Paket.`;
                    }
                }

                if (latestVersion !== CURRENT_VERSION) {
                    if (updateTitle) updateTitle.innerText = "Update Verfügbar!";
                    if (updateDesc) updateDesc.innerText = `Eine neue Version (v${latestVersion}) wurde veröffentlicht.`;
                    if (downloadUpdateBtn) {
                        downloadUpdateBtn.style.display = 'block';
                        downloadUpdateBtn.onclick = () => {
                            openExternalUrl(downloadUrl);
                        };
                    }
                } else {
                    if (updateTitle) updateTitle.innerText = "System Aktuell";
                    if (updateDesc) updateDesc.innerText = `Du nutzt bereits die neueste Version (v${CURRENT_VERSION}).`;
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
    const updateVersionUI = async () => {
        await fetchCurrentVersion();
        const currentVerEl = document.getElementById('current-version-val') || document.querySelector('.version-badge .value');
        if (currentVerEl) currentVerEl.innerText = `v${CURRENT_VERSION}`;
        if (latestVersionVal && (latestVersionVal.innerText.includes('?') || latestVersionVal.innerText === '')) {
            latestVersionVal.innerText = `v${CURRENT_VERSION}`;
        }
    };
    updateVersionUI();

    // Auto-check
    setInterval(silentCheckUpdate, 30 * 60 * 1000);
    setTimeout(silentCheckUpdate, 5000);
}

async function silentCheckUpdate() {
    try {
        await fetchCurrentVersion();
        let latestVersion = null;
        const nativeRes = await nativeCheckForUpdate();
        if (nativeRes) {
            if (nativeRes.status === 'ok') latestVersion = nativeRes.latestVersion;
        } else {
            const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/README.md?t=${Date.now()}`);
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

// =============================================================================
// HUD FARBPROFILE (THEMES)
// =============================================================================
function setupThemeSwitcher() {
    const themeSelect = getEl('settings-theme-select');
    const savedTheme = localStorage.getItem('skooda_theme') || 'crimson-yandere';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeSelect) {
        themeSelect.value = savedTheme;
        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('skooda_theme', newTheme);
            showToast(`Theme geändert: ${newTheme}`, 'info');
        });
    }
}

// =============================================================================
// VERSCHLÜSSELTES VOLL-BACKUP (.SKOODA) & RESTORE
// =============================================================================
function setupBackupSystem() {
    const exportBtn = getEl('backup-export-btn');
    const importBtn = getEl('backup-import-btn');
    const fileInput = getEl('backup-file-input');
    const backupModal = getEl('backup-modal');
    const backupPassInput = getEl('backup-pass-input');
    const backupConfirmBtn = getEl('backup-confirm-btn');
    const backupCancelBtn = getEl('backup-cancel-btn');
    const backupModalTitle = getEl('backup-modal-title');

    let pendingAction = null; // 'export' | 'restore'
    let pendingBlob = null;

    if (exportBtn && backupModal) {
        exportBtn.onclick = () => {
            pendingAction = 'export';
            if (backupModalTitle) backupModalTitle.innerText = "🔒 Voll-Backup verschlüsseln (.skooda)";
            if (backupPassInput) backupPassInput.value = "";
            backupModal.style.display = 'flex';
        };
    }

    if (importBtn && fileInput) {
        importBtn.onclick = () => {
            fileInput.click();
        };
    }

    if (fileInput) {
        fileInput.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            pendingBlob = await file.text();
            pendingAction = 'restore';
            if (backupModalTitle) backupModalTitle.innerText = "🔓 Voll-Backup entschlüsseln (.skooda)";
            if (backupPassInput) backupPassInput.value = "";
            if (backupModal) backupModal.style.display = 'flex';
            fileInput.value = "";
        };
    }

    if (backupCancelBtn && backupModal) {
        backupCancelBtn.onclick = () => {
            backupModal.style.display = 'none';
            pendingAction = null;
            pendingBlob = null;
        };
    }

    if (backupConfirmBtn && backupPassInput) {
        backupConfirmBtn.onclick = async () => {
            const passphrase = backupPassInput.value;
            if (!passphrase || passphrase.length < 4) {
                showToast('Passwort muss mindestens 4 Zeichen lang sein', 'warn');
                return;
            }

            backupConfirmBtn.disabled = true;
            backupConfirmBtn.innerText = "Verarbeite...";

            try {
                if (pendingAction === 'export') {
                    // Gather all data
                    const pois = storageRepo.getPois();
                    const theme = localStorage.getItem('skooda_theme') || 'cyber-default';
                    const favorites = localStorage.getItem('skooda_favorites') || '[]';
                    const bundle = {
                        app: 'skooda-mobile',
                        version: CURRENT_VERSION,
                        exported_at: new Date().toISOString(),
                        theme,
                        favorites,
                        pois,
                    };

                    const encryptedBlob = await window.__TAURI__.core.invoke('create_encrypted_backup', {
                        payloadJson: JSON.stringify(bundle),
                        passphrase
                    });

                    // Download file
                    const blob = new Blob([encryptedBlob], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `skooda_backup_${Date.now()}.skooda`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    showToast('Voll-Backup (.skooda) erfolgreich exportiert!', 'success');
                    if (backupModal) backupModal.style.display = 'none';
                } else if (pendingAction === 'restore') {
                    if (!pendingBlob) throw new Error("Keine Backup-Datei geladen");

                    const decryptedJson = await window.__TAURI__.core.invoke('restore_encrypted_backup', {
                        encryptedBlob: pendingBlob,
                        passphrase
                    });

                    const bundle = JSON.parse(decryptedJson);
                    if (bundle.theme) {
                        localStorage.setItem('skooda_theme', bundle.theme);
                        document.documentElement.setAttribute('data-theme', bundle.theme);
                    }
                    if (bundle.favorites) {
                        localStorage.setItem('skooda_favorites', bundle.favorites);
                    }
                    if (bundle.pois && Array.isArray(bundle.pois)) {
                        bundle.pois.forEach(p => storageRepo.addPoi(p));
                    }

                    showToast('Backup erfolgreich wiederhergestellt!', 'success');
                    if (backupModal) backupModal.style.display = 'none';
                    setTimeout(() => window.location.reload(), 1200);
                }
            } catch (err) {
                showToast(`Fehler: ${err.message || String(err)}`, 'error');
            } finally {
                backupConfirmBtn.disabled = false;
                backupConfirmBtn.innerText = "Bestätigen";
            }
        };
    }
}

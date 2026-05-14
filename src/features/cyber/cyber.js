import { getEl } from '../../core/ui.js';
import { showCategories } from '../../core/navigation.js';

const scanBtn = getEl('start-net-scan');
const scanList = getEl('scan-list');
const scanProgCont = getEl('scan-progress-container');
const scanProgBar = getEl('scan-progress-bar');
const pingBtn = getEl('start-ping');
const pingHost = getEl('ping-host');
const pingResult = getEl('ping-result');
const dnsBtn = getEl('start-dns');
const dnsHost = getEl('dns-host');
const dnsResult = getEl('dns-result');

const deviceModal = getEl('device-modal');
const modalName = getEl('modal-device-name');
const modalIp = getEl('modal-device-ip');
const actionCopy = getEl('action-copy');
const actionPing = getEl('action-ping');
const actionBrowser = getEl('action-browser');
const actionClose = getEl('action-close');

let currentModalIp = "";

export function initCyber() {
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            scanList.innerHTML = '';
            scanBtn.disabled = true;
            if (scanProgCont) scanProgCont.style.display = 'block';
            if (scanProgBar) scanProgBar.style.width = '0%';
            window.Android.scanNetwork('onNetScan');
        });
    }

    window.onNetScan = (data) => {
        if (data.progress !== undefined) {
            if (scanProgBar) scanProgBar.style.width = data.progress + '%';
            return;
        }

        scanBtn.disabled = false;
        if (scanProgCont) scanProgCont.style.display = 'none';

        if (data.error) {
            scanList.innerHTML = `<div class="info-value" style="color:red">${data.error}</div>`;
        } else if (data.done) {
            if (data.devices.length === 0) {
                scanList.innerHTML = '<div class="info-value">No devices found.</div>';
                return;
            }
            scanList.innerHTML = data.devices.map(dev => {
                const portsHtml = dev.ports.map(p => `<span class="port-badge">:${p}</span>`).join('');
                const name = (dev.name && dev.name !== dev.ip) ? dev.name : "Unknown Device";
                const portsStr = dev.ports.join(',');
                return `
                    <div class="info-item device-item" data-ip="${dev.ip}" data-name="${name}" data-ports="${portsStr}">
                        <div style="display:flex; flex-direction:column">
                            <span class="info-value" style="font-size:0.9rem">${name}</span>
                            <span class="info-label">${dev.ip}</span>
                        </div>
                        <div>${portsHtml}</div>
                    </div>
                `;
            }).join('');

            // Add event listeners to newly created items
            scanList.querySelectorAll('.device-item').forEach(item => {
                item.onclick = () => openDeviceModal(item.dataset.ip, item.dataset.name, item.dataset.ports);
            });
        }
    };

    if (pingBtn) {
        pingBtn.addEventListener('click', () => {
            const host = pingHost.value || "8.8.8.8";
            pingResult.innerText = "Pinging " + host + "...";
            window.Android.ping(host, 'onPingResult');
        });
    }

    window.onPingResult = (data) => {
        if (data.error) pingResult.innerText = "Error: " + data.error;
        else pingResult.innerText = data.result;
    };

    if (dnsBtn) {
        dnsBtn.addEventListener('click', () => {
            const host = dnsHost.value || "google.com";
            dnsResult.innerText = "Resolving " + host + "...";
            window.Android.dnsLookup(host, 'onDnsResult');
        });
    }

    window.onDnsResult = (data) => {
        if (data.error) dnsResult.innerText = "Error: " + data.error;
        else dnsResult.innerText = "IPs:\n" + data.ips.join("\n");
    };

    // Modal Logic
    actionClose.addEventListener('click', () => {
        deviceModal.classList.remove('active');
    });

    actionCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(currentModalIp);
        actionCopy.innerText = "✅ Copied!";
        setTimeout(() => { actionCopy.innerText = "📋 Copy IP Address"; }, 2000);
    });

    actionPing.addEventListener('click', () => {
        deviceModal.classList.remove('active');
        const cyberId = 'cyber-toolset';
        document.querySelectorAll('.sub-tool-container').forEach(c => c.style.display = 'none');
        getEl(cyberId).style.display = 'block';
        getEl('tool-categories').style.display = 'none';

        if (pingHost) {
            pingHost.value = currentModalIp;
            pingBtn.click();
        }
    });

    actionBrowser.addEventListener('click', () => {
        if (window.Android && window.Android.openExternalUrl) {
            window.Android.openExternalUrl(`http://${currentModalIp}`);
        } else {
            window.open(`http://${currentModalIp}`, '_blank');
        }
    });

    deviceModal.addEventListener('click', (e) => {
        if (e.target === deviceModal) deviceModal.classList.remove('active');
    });

    // Public IP reveal
    const pIpEl = getEl('public-ip');
    if (pIpEl) {
        pIpEl.addEventListener('click', () => {
            pIpEl.classList.add('revealed');
            setTimeout(() => {
                pIpEl.classList.remove('revealed');
            }, 5000);
        });
    }
}

export function openDeviceModal(ip, name, portsStr) {
    currentModalIp = ip;
    modalName.innerText = name;
    modalIp.innerText = ip;

    const ports = portsStr ? portsStr.split(',').map(p => parseInt(p)) : [];
    actionBrowser.style.display = (ports.includes(80) || ports.includes(443)) ? 'flex' : 'none';

    deviceModal.classList.add('active');
}

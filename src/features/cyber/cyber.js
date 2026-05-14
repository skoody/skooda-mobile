import { getEl } from '../../core/ui.js';
import { showCategories } from '../../core/navigation.js';
import { CyberTools } from './cyber-utils.js';

// UI Elements
const ui = {
    scanBtn: getEl('start-net-scan'),
    scanList: getEl('scan-list'),
    scanProgCont: getEl('scan-progress-container'),
    scanProgBar: getEl('scan-progress-bar'),
    pingBtn: getEl('start-ping'),
    pingHost: getEl('ping-host'),
    pingResult: getEl('ping-result'),
    dnsBtn: getEl('start-dns'),
    dnsHost: getEl('dns-host'),
    dnsResult: getEl('dns-result'),
    traceBtn: getEl('start-trace'),
    traceHost: getEl('trace-host'),
    traceResult: getEl('trace-result'),
    portBtn: getEl('start-port-scan'),
    portHost: getEl('port-host'),
    portResult: getEl('port-scan-result'),
    deviceModal: getEl('device-modal'),
    modalName: getEl('modal-device-name'),
    modalIp: getEl('modal-device-ip'),
    actionCopy: getEl('action-copy'),
    actionPing: getEl('action-ping'),
    actionBrowser: getEl('action-browser'),
    actionClose: getEl('action-close'),
    publicIp: getEl('public-ip')
};

let currentModalIp = "";

export function initCyber() {
    setupNetworkScanner();
    setupPingTool();
    setupDnsTool();
    setupTracerouteTool();
    setupPortScanTool();
    setupModalHandlers();
    setupPublicIpReveal();
}

/**
 * Helper to update loading state
 */
function setLoading(el, isLoading, text = "Scanning...") {
    if (!el) return;
    if (isLoading) {
        el.classList.add('loading-pulse');
        el.innerText = text;
    } else {
        el.classList.remove('loading-pulse');
    }
}

function setupNetworkScanner() {
    if (ui.scanBtn) {
        ui.scanBtn.addEventListener('click', () => {
            ui.scanList.innerHTML = '';
            ui.scanBtn.disabled = true;
            ui.scanBtn.innerText = "Scanning Network...";
            if (ui.scanProgCont) ui.scanProgCont.style.display = 'block';
            if (ui.scanProgBar) ui.scanProgBar.style.width = '0%';
            CyberTools.scanNetwork();
        });
    }

    window.onNetScan = (data) => {
        if (data.progress !== undefined) {
            if (ui.scanProgBar) ui.scanProgBar.style.width = data.progress + '%';
            return;
        }

        ui.scanBtn.disabled = false;
        ui.scanBtn.innerText = "Start Network Scan";
        if (ui.scanProgCont) ui.scanProgCont.style.display = 'none';

        if (data.error) {
            ui.scanList.innerHTML = `<div class="info-value" style="color:var(--neon-purple)">Error: ${data.error}</div>`;
        } else if (data.done) {
            renderDeviceList(data.devices);
        }
    };
}

function renderDeviceList(devices) {
    if (devices.length === 0) {
        ui.scanList.innerHTML = '<div class="info-value">No devices found.</div>';
        return;
    }
    ui.scanList.innerHTML = devices.map(dev => {
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

    ui.scanList.querySelectorAll('.device-item').forEach(item => {
        item.onclick = () => openDeviceModal(item.dataset.ip, item.dataset.name, item.dataset.ports);
    });
}

function setupPingTool() {
    if (ui.pingBtn) {
        ui.pingBtn.addEventListener('click', () => {
            const host = ui.pingHost.value || "8.8.8.8";
            setLoading(ui.pingResult, true, `Pinging ${host}...`);
            CyberTools.ping(host);
        });
    }

    window.onPingResult = (data) => {
        setLoading(ui.pingResult, false);
        if (data.error) ui.pingResult.innerText = "Error: " + data.error;
        else ui.pingResult.innerText = data.result;
    };
}

function setupDnsTool() {
    if (ui.dnsBtn) {
        ui.dnsBtn.addEventListener('click', () => {
            const host = ui.dnsHost.value || "google.com";
            setLoading(ui.dnsResult, true, `Resolving ${host}...`);
            CyberTools.dnsLookup(host);
        });
    }

    window.onDnsResult = (data) => {
        setLoading(ui.dnsResult, false);
        if (data.error) ui.dnsResult.innerText = "Error: " + data.error;
        else ui.dnsResult.innerText = "IPs:\n" + data.ips.join("\n");
    };
}

function setupTracerouteTool() {
    if (ui.traceBtn) {
        ui.traceBtn.addEventListener('click', () => {
            const host = ui.traceHost.value || "8.8.8.8";
            ui.traceResult.innerText = `Starting trace to ${host}...\n`;
            setLoading(ui.traceResult, true, `Tracing ${host}...`);
            CyberTools.traceroute(host);
        });
    }

    window.onTraceResult = (data) => {
        if (data.partial) {
            ui.traceResult.innerText += data.partial + "\n";
            ui.traceResult.scrollTop = ui.traceResult.scrollHeight;
            return;
        }
        
        setLoading(ui.traceResult, false);
        if (data.error) ui.traceResult.innerText += "Error: " + data.error;
        else if (data.done) {
            ui.traceResult.innerText = "Trace complete:\n" + data.result;
        }
    };
}

function setupPortScanTool() {
    if (ui.portBtn) {
        ui.portBtn.addEventListener('click', () => {
            const host = ui.portHost.value || "192.168.1.1";
            setLoading(ui.portResult, true, `Scanning ports on ${host}...`);
            CyberTools.scanPorts(host);
        });
    }

    window.onPortScanResult = (data) => {
        if (data.progress !== undefined) {
            ui.portResult.innerText = `Scanning: ${data.progress}%`;
            return;
        }

        setLoading(ui.portResult, false);
        if (data.error) ui.portResult.innerText = "Error: " + data.error;
        else if (data.done) {
            if (data.ports.length === 0) {
                ui.portResult.innerText = "No common ports found open.";
            } else {
                ui.portResult.innerText = "Open Ports:\n" + data.ports.map(p => `:${p}`).join(", ");
            }
        }
    };
}

function setupModalHandlers() {
    ui.actionClose.addEventListener('click', () => ui.deviceModal.classList.remove('active'));
    
    ui.actionCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(currentModalIp);
        ui.actionCopy.innerText = "✅ Copied!";
        setTimeout(() => { ui.actionCopy.innerText = "📋 Copy IP Address"; }, 2000);
    });

    ui.actionPing.addEventListener('click', () => {
        ui.deviceModal.classList.remove('active');
        // Navigate to Cyber tools and trigger ping
        const cyberId = 'cyber-toolset';
        document.querySelectorAll('.sub-tool-container').forEach(c => c.style.display = 'none');
        getEl(cyberId).style.display = 'block';
        getEl('tool-categories').style.display = 'none';

        if (ui.pingHost) {
            ui.pingHost.value = currentModalIp;
            ui.pingBtn.click();
        }
    });

    ui.actionBrowser.addEventListener('click', () => {
        const url = `http://${currentModalIp}`;
        if (window.Android && window.Android.openExternalUrl) {
            window.Android.openExternalUrl(url);
        } else {
            window.open(url, '_blank');
        }
    });

    ui.deviceModal.addEventListener('click', (e) => {
        if (e.target === ui.deviceModal) ui.deviceModal.classList.remove('active');
    });
}

function setupPublicIpReveal() {
    if (ui.publicIp) {
        ui.publicIp.addEventListener('click', () => {
            ui.publicIp.classList.add('revealed');
            setTimeout(() => ui.publicIp.classList.remove('revealed'), 5000);
        });
    }
}

export function openDeviceModal(ip, name, portsStr) {
    currentModalIp = ip;
    ui.modalName.innerText = name;
    ui.modalIp.innerText = ip;

    const ports = portsStr ? portsStr.split(',').map(p => parseInt(p)) : [];
    ui.actionBrowser.style.display = (ports.includes(80) || ports.includes(443)) ? 'flex' : 'none';

    ui.deviceModal.classList.add('active');
}

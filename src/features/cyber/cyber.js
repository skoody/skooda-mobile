import { getEl } from '../../core/ui.js';
import { showCategories } from '../../core/navigation.js';
import { CyberTools } from './cyber-utils.js';

// UI Elements
const ui = {
    scanBtn: getEl('start-net-scan'),
    scanStopBtn: getEl('stop-net-scan'),
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
    traceStopBtn: getEl('stop-trace'),
    traceHost: getEl('trace-host'),
    traceResult: getEl('trace-result'),
    portBtn: getEl('start-port-scan'),
    portStopBtn: getEl('stop-port-scan'),
    portHost: getEl('port-host'),
    portRange: getEl('port-range'),
    portResult: getEl('port-scan-result'),
    deviceModal: getEl('device-modal'),
    modalName: getEl('modal-device-name'),
    modalIp: getEl('modal-device-ip'),
    modalMac: getEl('modal-device-mac'),
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
            ui.scanBtn.style.display = 'none';
            ui.scanStopBtn.style.display = 'block';
            if (ui.scanProgCont) ui.scanProgCont.style.display = 'block';
            if (ui.scanProgBar) ui.scanProgBar.style.width = '0%';
            CyberTools.scanNetwork();
        });
    }

    if (ui.scanStopBtn) {
        ui.scanStopBtn.addEventListener('click', () => {
            CyberTools.cancel('netScan');
            resetScanUI();
        });
    }

    function resetScanUI() {
        ui.scanBtn.style.display = 'block';
        ui.scanStopBtn.style.display = 'none';
        if (ui.scanProgCont) ui.scanProgCont.style.display = 'none';
    }

    window.onNetScan = (data) => {
        if (data.progress !== undefined) {
            if (ui.scanProgBar) ui.scanProgBar.style.width = data.progress + '%';
            return;
        }

        resetScanUI();

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
            <div class="info-item device-item" data-ip="${dev.ip}" data-name="${name}" data-mac="${dev.mac}" data-ports="${portsStr}">
                <div style="display:flex; flex-direction:column">
                    <span class="info-value" style="font-size:0.9rem">${name}</span>
                    <span class="info-label">${dev.ip}</span>
                </div>
                <div>${portsHtml}</div>
            </div>
        `;
    }).join('');

    ui.scanList.querySelectorAll('.device-item').forEach(item => {
        item.onclick = () => openDeviceModal(item.dataset.ip, item.dataset.name, item.dataset.mac, item.dataset.ports);
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
            ui.traceBtn.style.display = 'none';
            ui.traceStopBtn.style.display = 'block';
            setLoading(ui.traceResult, true, `Tracing ${host}...`);
            CyberTools.traceroute(host);
        });
    }

    if (ui.traceStopBtn) {
        ui.traceStopBtn.addEventListener('click', () => {
            CyberTools.cancel('traceroute');
            ui.traceBtn.style.display = 'block';
            ui.traceStopBtn.style.display = 'none';
            setLoading(ui.traceResult, false);
            ui.traceResult.innerText += "\n[Trace Aborted by User]";
        });
    }

    window.onTraceResult = (data) => {
        if (data.partial) {
            ui.traceResult.innerText += data.partial + "\n";
            ui.traceResult.scrollTop = ui.traceResult.scrollHeight;
            return;
        }
        
        ui.traceBtn.style.display = 'block';
        ui.traceStopBtn.style.display = 'none';
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
            let ports = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080];
            
            if (ui.portRange.value) {
                try {
                    ports = ui.portRange.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                } catch(e) { console.error("Invalid port range"); }
            }

            ui.portBtn.style.display = 'none';
            ui.portStopBtn.style.display = 'block';
            setLoading(ui.portResult, true, `Scanning ports on ${host}...`);
            CyberTools.scanPorts(host, ports);
        });
    }

    if (ui.portStopBtn) {
        ui.portStopBtn.addEventListener('click', () => {
            CyberTools.cancel('portScan');
            ui.portBtn.style.display = 'block';
            ui.portStopBtn.style.display = 'none';
            setLoading(ui.portResult, false);
            ui.portResult.innerText = "Scan Aborted.";
        });
    }

    window.onPortScanResult = (data) => {
        if (data.progress !== undefined) {
            ui.portResult.innerText = `Scanning: ${data.progress}%`;
            return;
        }

        ui.portBtn.style.display = 'block';
        ui.portStopBtn.style.display = 'none';
        setLoading(ui.portResult, false);
        
        if (data.error) ui.portResult.innerText = "Error: " + data.error;
        else if (data.done) {
            if (data.ports.length === 0) {
                ui.portResult.innerText = "No open ports found.";
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

export function openDeviceModal(ip, name, mac, portsStr) {
    currentModalIp = ip;
    ui.modalName.innerText = name;
    ui.modalIp.innerText = ip;
    ui.modalMac.innerText = mac ? `MAC: ${mac}` : "MAC: Unknown";

    const ports = portsStr ? portsStr.split(',').map(p => parseInt(p)) : [];
    ui.actionBrowser.style.display = (ports.includes(80) || ports.includes(443)) ? 'flex' : 'none';

    ui.deviceModal.classList.add('active');
}

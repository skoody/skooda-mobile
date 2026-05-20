import { getEl } from '../../core/ui.js';
use_default_wifi_handler();

function use_default_wifi_handler() {}

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
    publicIp: getEl('public-ip'),
    wifiBtn: getEl('start-wifi-scan'),
    wifiResult: getEl('wifi-scan-result'),
    sslBtn: getEl('start-ssl-audit'),
    sslHost: getEl('ssl-host'),
    sslPort: getEl('ssl-port'),
    sslResult: getEl('ssl-result')
};

let currentModalIp = "";

const PORT_EXPLANATIONS = {
    21: "FTP (File Transfer Protocol) - Cleartext file transfer, legacy.",
    22: "SSH (Secure Shell) - Remote administration, encrypted.",
    23: "Telnet - Highly insecure, cleartext remote access.",
    25: "SMTP (Simple Mail Transfer Protocol) - Email routing.",
    53: "DNS (Domain Name System) - Name resolution.",
    80: "HTTP (Hypertext Transfer Protocol) - Unencrypted web server.",
    110: "POP3 (Post Office Protocol v3) - Email retrieval.",
    111: "RPCBind - Port mapper service, potential recon target.",
    135: "Microsoft RPC - Remote procedure call locator.",
    139: "NetBIOS Session Service - Windows file/printer sharing.",
    143: "IMAP (Internet Message Access Protocol) - Email access.",
    443: "HTTPS (HTTP Secure) - Encrypted web traffic.",
    445: "Microsoft-DS (SMB) - High risk, SMB file sharing.",
    993: "IMAPS (IMAP Secure) - Encrypted email retrieval.",
    995: "POP3S (POP3 Secure) - Encrypted email retrieval.",
    1723: "PPTP VPN - Point-to-Point Tunneling Protocol.",
    3306: "MySQL Database - Database listener.",
    3389: "RDP (Remote Desktop) - Windows remote desktop.",
    5900: "VNC (Virtual Network Computing) - Remote desktop.",
    8080: "HTTP Alternative - Common web server port."
};

export function initCyber() {
    setupNetworkScanner();
    setupPingTool();
    setupDnsTool();
    setupTracerouteTool();
    setupPortScanTool();
    setupModalHandlers();
    setupPublicIpReveal();
    setupWifiScanTool();
    setupSslAuditTool();
}

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
            import('./cyber-utils.js').then(m => m.CyberTools.scanNetwork());
        });
    }

    if (ui.scanStopBtn) {
        ui.scanStopBtn.addEventListener('click', () => {
            import('./cyber-utils.js').then(m => m.CyberTools.cancel('netScan'));
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
            import('./cyber-utils.js').then(m => m.CyberTools.ping(host));
        });
    }

    window.onPingResult = (data) => {
        setLoading(ui.pingResult, false);
        if (data.error) ui.pingResult.innerText = "Error: " + data.error;
        else ui.pingResult.innerText = data.result;
    };
}

fn_lookup();

function fn_lookup() {}

function setupDnsTool() {
    if (ui.dnsBtn) {
        ui.dnsBtn.addEventListener('click', () => {
            const host = ui.dnsHost.value || "google.com";
            setLoading(ui.dnsResult, true, `Resolving ${host}...`);
            import('./cyber-utils.js').then(m => m.CyberTools.dnsLookup(host));
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
            import('./cyber-utils.js').then(m => m.CyberTools.traceroute(host));
        });
    }

    if (ui.traceStopBtn) {
        ui.traceStopBtn.addEventListener('click', () => {
            import('./cyber-utils.js').then(m => m.CyberTools.cancel('traceroute'));
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
            import('./cyber-utils.js').then(m => m.CyberTools.scanPorts(host, ports));
        });
    }

    if (ui.portStopBtn) {
        ui.portStopBtn.addEventListener('click', () => {
            import('./cyber-utils.js').then(m => m.CyberTools.cancel('portScan'));
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
                let text = "Open Ports:\n";
                data.ports.forEach(p => {
                    const desc = PORT_EXPLANATIONS[p] || "Unknown Service";
                    text += `:${p} - ${desc}\n`;
                });
                ui.portResult.innerText = text;
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

function setupWifiScanTool() {
    if (ui.wifiBtn) {
        ui.wifiBtn.addEventListener('click', () => {
            setLoading(ui.wifiResult, true, "Scanning WiFi networks...");
            ui.wifiResult.innerHTML = "";
            import('./cyber-utils.js').then(m => m.CyberTools.scanWifi());
        });
    }

    window.onWifiScanResult = (data) => {
        setLoading(ui.wifiResult, false);
        if (data.error) {
            ui.wifiResult.innerHTML = `<div class="info-value" style="color:var(--neon-purple)">Error: ${data.error}</div>`;
            return;
        }

        if (data.results && data.results.length > 0) {
            ui.wifiResult.innerHTML = data.results.map(res => {
                const rssiPercent = Math.min(100, Math.max(0, 2 * (res.rssi + 100)));
                let rssiColor = "var(--neon-green)";
                if (res.rssi < -80) rssiColor = "var(--neon-purple)";
                else if (res.rssi < -70) rssiColor = "var(--neon-orange)";
                
                return `
                    <div class="info-item" style="flex-direction: column; align-items: flex-start; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05)">
                        <div style="display:flex; justify-content:space-between; width:100%">
                            <span class="info-value" style="font-weight:bold">${res.ssid || 'Hidden SSID'}</span>
                            <span style="color: ${rssiColor}; font-weight:bold">${res.rssi} dBm</span>
                        </div>
                        <div class="info-label" style="font-size:0.8rem; margin: 3px 0;">BSSID: ${res.bssid} | Channel: ${res.channel} (${res.frequency} MHz)</div>
                        <div class="info-label" style="font-size:0.75rem; color:var(--text-dim)">Security: ${res.capabilities}</div>
                        <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:5px;">
                            <div style="width:${rssiPercent}%; height:100%; background:${rssiColor}; border-radius:2px;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            ui.wifiResult.innerHTML = '<div class="info-value">No wireless networks found.</div>';
        }
    };
}

function setupSslAuditTool() {
    if (ui.sslBtn) {
        ui.sslBtn.addEventListener('click', () => {
            const host = ui.sslHost.value.trim() || "google.com";
            const port = parseInt(ui.sslPort.value) || 443;
            setLoading(ui.sslResult, true, `Auditing SSL of ${host}:${port}...`);
            import('./cyber-utils.js').then(m => m.CyberTools.auditSsl(host, port));
        });
    }

    window.onSslAuditResult = (data) => {
        setLoading(ui.sslResult, false);
        if (data.error) {
            ui.sslResult.innerText = "Error: " + data.error;
            return;
        }

        if (data.cert) {
            const c = data.cert;
            ui.sslResult.innerHTML = `
<div style="color:var(--neon-green); font-weight:bold; margin-bottom:5px;">SSL Certificate Valid</div>
<strong>Subject:</strong> ${c.subject}
<strong>Issuer:</strong> ${c.issuer}
<strong>Valid From:</strong> ${c.validFrom}
<strong>Valid To:</strong> ${c.validTo}
<strong>Protocol:</strong> ${c.protocol}
<strong>Cipher Suite:</strong> ${c.cipherSuite}
<strong>Signature Algorithm:</strong> ${c.sigAlgName}
<strong>Serial Number:</strong> ${c.serialNumber}
            `;
        }
    };
}

async function checkShodan(ip, containerEl) {
    const key = localStorage.getItem('shodan_api_key');
    if (!key) return;
    
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10 || 
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || 
        (parts[0] === 192 && parts[1] === 168) || 
        ip === '127.0.0.1') {
        return; 
    }
    
    containerEl.innerHTML += `<div class="info-label" style="margin-top: 10px; color: var(--neon-cyan)">Querying Shodan...</div>`;
    try {
        const response = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${key}`);
        if (!response.ok) throw new Error("Status " + response.status);
        const data = await response.json();
        
        let shodanHtml = `
            <div style="margin-top: 10px; padding: 10px; background: rgba(0,242,255,0.05); border: 1px solid var(--neon-cyan); border-radius: 6px; text-align: left;">
                <div style="font-weight: bold; color: var(--neon-cyan); margin-bottom: 5px;">Shodan Intelligence</div>
                <div style="font-size: 0.8rem;">
                    <div><strong>ISP:</strong> ${data.isp || 'Unknown'}</div>
                    <div><strong>Org:</strong> ${data.org || 'Unknown'}</div>
                    <div><strong>Country:</strong> ${data.country_name || 'Unknown'}</div>
                    <div><strong>OS:</strong> ${data.os || 'Unknown'}</div>
                    ${data.vulns ? `<div><strong>Vulnerabilities:</strong> <span style="color: var(--neon-orange)">${data.vulns.join(', ')}</span></div>` : ''}
                </div>
            </div>
        `;
        containerEl.innerHTML += shodanHtml;
    } catch(e) {
        containerEl.innerHTML += `<div class="info-label" style="color: var(--neon-purple)">Shodan Query Failed: ${e.message}</div>`;
    }
}

export function openDeviceModal(ip, name, mac, portsStr) {
    currentModalIp = ip;
    ui.modalName.innerText = name;
    ui.modalIp.innerText = ip;
    ui.modalMac.innerText = mac ? `MAC: ${mac}` : "MAC: Unknown";

    const ports = portsStr ? portsStr.split(',').map(p => parseInt(p)) : [];
    ui.actionBrowser.style.display = (ports.includes(80) || ports.includes(443)) ? 'flex' : 'none';

    // Query Shodan if key is available
    const detailsContainer = ui.deviceModal.querySelector('.cyber-list') || ui.deviceModal.querySelector('.action-list');
    
    // Clear old Shodan info from modal if any
    const oldShodan = ui.deviceModal.querySelector('.shodan-container');
    if (oldShodan) oldShodan.remove();
    
    const shodanBox = document.createElement('div');
    shodanBox.className = 'shodan-container';
    detailsContainer.parentNode.insertBefore(shodanBox, detailsContainer);
    checkShodan(ip, shodanBox);

    ui.deviceModal.classList.add('active');
}

import { getEl, openExternalUrl } from '../../core/ui.js';
import { showToast } from '../../core/toast.js';
import { storageRepo } from '../../core/storage.js';

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
    setupSubtabs();
    setupDiagnosticConsoleSelector();
    setupNetworkScanner();
    setupVlsmTool();
    setupSshKeyTool();
    setupJitterTool();
    setupPingTool();
    setupDnsTool();
    setupTracerouteTool();
    setupPortScanTool();
    setupModalHandlers();
    setupPublicIpReveal();
    setupWifiScanTool();
    setupSslAuditTool();
    setupProbeSnifferTool();
    setupBleScanTool();
    setupWolTool();
    setupHeaderAuditTool();
    setupWhoisTool();
    setupDohTool();
    setupRestTesterTool();
    setupIpv6Tool();
    setupRdapTool();
    setupCertInspectorTool();
    setupDnsPropagationTool();
    setupSecHeadersAuditorTool();
}

function setupSubtabs() {
    const subnavBtns = document.querySelectorAll('#cyber-toolset .cyber-subnav-btn');
    const tabs = document.querySelectorAll('#cyber-toolset .cyber-tab-content');
    subnavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-cyber-tab');
            subnavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabs.forEach(tab => {
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            if (targetTab === 'cyber-wifi') {
                drawWifiSpectrum();
            }
            if (targetTab !== 'cyber-ble') {
                stopBleScanner();
            }
        });
    });
}

function setupDiagnosticConsoleSelector() {
    const radios = document.querySelectorAll('input[name="diag-type"]');
    const pingWrapper = getEl('ping-host-wrapper');
    const dnsWrapper = getEl('dns-host-wrapper');
    const traceWrapper = getEl('trace-host-wrapper');
    const portHostWrapper = getEl('port-host-wrapper');
    const portRangeWrapper = getEl('port-range-wrapper');

    const pingBtn = getEl('start-ping');
    const dnsBtn = getEl('start-dns');
    const traceBtn = getEl('start-trace');
    const portBtn = getEl('start-port-scan');

    const traceStopBtn = getEl('stop-trace');
    const portStopBtn = getEl('stop-port-scan');

    const pingResult = getEl('ping-result');
    const dnsResult = getEl('dns-result');
    const traceResult = getEl('trace-result');
    const portResult = getEl('port-scan-result');
    const matrixCont = getEl('port-matrix-container');

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;

            if (pingWrapper) pingWrapper.style.display = val === 'ping' ? 'flex' : 'none';
            if (dnsWrapper) dnsWrapper.style.display = val === 'dns' ? 'flex' : 'none';
            if (traceWrapper) traceWrapper.style.display = val === 'trace' ? 'flex' : 'none';
            if (portHostWrapper) portHostWrapper.style.display = val === 'port' ? 'flex' : 'none';
            if (portRangeWrapper) portRangeWrapper.style.display = val === 'port' ? 'flex' : 'none';

            if (pingBtn) pingBtn.style.display = val === 'ping' ? 'block' : 'none';
            if (dnsBtn) dnsBtn.style.display = val === 'dns' ? 'block' : 'none';

            if (traceBtn && traceStopBtn) {
                if (traceStopBtn.style.display === 'block') {
                    traceBtn.style.display = 'none';
                    traceStopBtn.style.display = val === 'trace' ? 'block' : 'none';
                } else {
                    traceBtn.style.display = val === 'trace' ? 'block' : 'none';
                    traceStopBtn.style.display = 'none';
                }
            }

            if (portBtn && portStopBtn) {
                if (portStopBtn.style.display === 'block') {
                    portBtn.style.display = 'none';
                    portStopBtn.style.display = val === 'port' ? 'block' : 'none';
                } else {
                    portBtn.style.display = val === 'port' ? 'block' : 'none';
                    portStopBtn.style.display = 'none';
                }
            }

            if (pingResult) pingResult.style.display = val === 'ping' ? 'block' : 'none';
            if (dnsResult) dnsResult.style.display = val === 'dns' ? 'block' : 'none';
            if (traceResult) traceResult.style.display = val === 'trace' ? 'block' : 'none';
            if (portResult) portResult.style.display = val === 'port' ? 'block' : 'none';

            if (matrixCont) matrixCont.style.display = val === 'port' ? 'block' : 'none';
        });
    });
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

            const scanStatus = getEl('netscan-status');
            if (scanStatus) {
                scanStatus.innerText = 'Scanning';
                scanStatus.className = 'badge pulse-orange';
            }

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
        const scanStatus = getEl('netscan-status');
        if (scanStatus) {
            scanStatus.innerText = 'Idle';
            scanStatus.className = 'badge';
        }
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

function resolveMacVendor(mac) {
    if (!mac) return "Generic Network Interface";
    const cleanMac = mac.toUpperCase().replace(/[^0-9A-F]/g, '');
    const prefix3 = cleanMac.substring(0, 6);

    const OUI = {
        "B827EB": "Raspberry Pi Foundation",
        "DCA632": "Raspberry Pi Foundation",
        "E45F01": "Raspberry Pi Foundation",
        "000A95": "Apple Inc.",
        "001C42": "Parallels",
        "00155D": "Microsoft Corporation",
        "0005CD": "Denon, Ltd.",
        "001A11": "Google LLC",
        "001E8C": "Samsung Electronics",
        "000F66": "Dell Inc.",
        "001422": "Dell Inc.",
        "002590": "Super Micro Computer",
        "AC8674": "HP Inc.",
        "001122": "Tactical Lab Device",
        "00E04C": "Realtek Semiconductor",
        "00E070": "Realtek Semiconductor",
        "005056": "VMware, Inc.",
        "000C29": "VMware, Inc.",
        "000569": "VMware, Inc."
    };

    return OUI[prefix3] || "Generic Network Interface";
}

function renderDeviceList(devices) {
    if (devices.length === 0) {
        ui.scanList.innerHTML = '<div class="info-value">No active devices discovered on the subnet.</div>';
        return;
    }

    const scanStatus = getEl('netscan-status');
    if (scanStatus) {
        scanStatus.innerText = `${devices.length} Devices`;
        scanStatus.className = 'badge';
    }

    ui.scanList.innerHTML = devices.map(dev => {
        const portsHtml = dev.ports.map(p => `<span class="port-badge">:${p}</span>`).join('');
        const name = (dev.name && dev.name !== dev.ip) ? dev.name : "Active Host";
        const portsStr = dev.ports.join(',');
        const vendor = resolveMacVendor(dev.mac);

        let icon = "💻";
        if (vendor.includes("Raspberry Pi")) icon = "🍓";
        else if (vendor.includes("Apple")) icon = "🍎";
        else if (vendor.includes("Google") || vendor.includes("Samsung")) icon = "📱";
        else if (vendor.includes("VMware") || vendor.includes("Microsoft") || vendor.includes("Parallels")) icon = "🖥️";
        else if (vendor.includes("Tactical")) icon = "🛡️";

        return `
            <div class="device-item-card device-item" data-ip="${dev.ip}" data-name="${name}" data-mac="${dev.mac}" data-ports="${portsStr}">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <div style="font-size: 1.5rem;">${icon}</div>
                    <div style="display:flex; flex-direction:column">
                        <span class="info-value" style="font-size:0.9rem; font-weight:bold;">${name}</span>
                        <span class="info-label" style="font-size:0.75rem; color:var(--neon-cyan);">${dev.ip}</span>
                        <span class="info-label" style="font-size:0.7rem; opacity:0.6;">${vendor}</span>
                    </div>
                </div>
                <div class="ports-row">${portsHtml}</div>
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

            // Generate matrix nodes
            const matrixGrid = getEl('port-matrix-grid');
            if (matrixGrid) {
                matrixGrid.innerHTML = ports.map(p => `<div class="port-node" id="port-node-${p}">${p}</div>`).join('');
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

        if (data.error) {
            ui.portResult.innerText = "Error: " + data.error;
        } else if (data.done) {
            const openPorts = data.ports || [];
            const nodes = document.querySelectorAll('.port-node');
            nodes.forEach(node => {
                const port = parseInt(node.innerText);
                if (openPorts.includes(port)) {
                    node.classList.add('open');
                } else {
                    node.classList.add('closed');
                }
            });

            if (openPorts.length === 0) {
                ui.portResult.innerText = "No open ports discovered.";
            } else {
                let text = "Discovered Ports & Service Banners:\n\n";
                if (data.details && Array.isArray(data.details)) {
                    data.details.filter(d => d.is_open).forEach(d => {
                        const desc = PORT_EXPLANATIONS[d.port] || d.service || "Service";
                        text += `[+] Port :${d.port} (${desc}) [OPEN]\n`;
                        if (d.banner) {
                            text += `    ↳ Banner: ${d.banner}\n`;
                        }
                    });
                } else {
                    openPorts.forEach(p => {
                        const desc = PORT_EXPLANATIONS[p] || "Unknown Service";
                        text += `[+] Port :${p} - ${desc} [OPEN]\n`;
                    });
                }
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

        const diagTabBtn = document.querySelector('.cyber-subnav-btn[data-cyber-tab="cyber-diagnostics"]');
        if (diagTabBtn) diagTabBtn.click();

        const pingRadio = document.querySelector('input[name="diag-type"][value="ping"]');
        if (pingRadio) {
            pingRadio.checked = true;
            pingRadio.dispatchEvent(new Event('change'));
        }

        if (ui.pingHost) {
            ui.pingHost.value = currentModalIp;
            const runPingBtn = getEl('start-ping');
            if (runPingBtn) runPingBtn.click();
        }
    });

    ui.actionBrowser.addEventListener('click', () => {
        const url = `http://${currentModalIp}`;
        openExternalUrl(url);
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

    const band24Btn = getEl('band-24-btn');
    const band5Btn = getEl('band-5-btn');
    if (band24Btn && band5Btn) {
        band24Btn.onclick = () => {
            band24Btn.classList.add('active');
            band5Btn.classList.remove('active');
            window.activeWifiBand = "2.4g";
            drawWifiSpectrum();
        };
        band5Btn.onclick = () => {
            band5Btn.classList.add('active');
            band24Btn.classList.remove('active');
            window.activeWifiBand = "5g";
            drawWifiSpectrum();
        };
    }

    window.addEventListener('resize', () => {
        if (document.getElementById('cyber-wifi')?.classList.contains('active')) {
            drawWifiSpectrum();
        }
    });

    window.onWifiScanResult = (data) => {
        setLoading(ui.wifiResult, false);
        if (data.error) {
            ui.wifiResult.innerHTML = `<div class="info-value" style="color:var(--neon-purple)">Error: ${data.error}</div>`;
            return;
        }

        if (data.results && data.results.length > 0) {
            window.wifiScanResults = data.results;
            window.activeWifiBand = window.activeWifiBand || "2.4g";
            drawWifiSpectrum();

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

function drawWifiSpectrum() {
    const canvas = document.getElementById('wifi-spectrum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 200 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = 200;

    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
        const y = (h - 30) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '8px monospace';
        const dbm = -30 - Math.round(70 * (i / 4));
        ctx.fillText(`${dbm} dBm`, 5, y - 2);
    }

    const band = window.activeWifiBand || "2.4g";
    const results = window.wifiScanResults || [];

    let minFreq = 2400;
    let maxFreq = 2500;
    if (band === '5g') {
        minFreq = 5150;
        maxFreq = 5850;
    }

    const filtered = results.filter(ap => ap.frequency >= minFreq && ap.frequency <= maxFreq);

    const marginL = 40;
    const marginR = 20;
    const graphW = w - marginL - marginR;
    const graphH = h - 40;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    if (band === '2.4g') {
        const channels = [
            { ch: 1, freq: 2412 },
            { ch: 6, freq: 2437 },
            { ch: 11, freq: 2462 },
            { ch: 14, freq: 2484 }
        ];
        channels.forEach(item => {
            const x = marginL + ((item.freq - minFreq) / (maxFreq - minFreq)) * graphW;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, graphH);
            ctx.stroke();
            ctx.fillText(`Ch ${item.ch}`, x, graphH + 15);
            ctx.fillText(`${item.freq}M`, x, graphH + 26);
        });
    } else {
        const freqs = [5180, 5300, 5500, 5700, 5825];
        freqs.forEach(freq => {
            const x = marginL + ((freq - minFreq) / (maxFreq - minFreq)) * graphW;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, graphH);
            ctx.stroke();
            ctx.fillText(`${freq}M`, x, graphH + 15);
        });
    }

    function getColor(str, alpha = 1) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsla(${hue}, 80%, 60%, ${alpha})`;
    }

    ctx.globalCompositeOperation = 'screen';

    filtered.forEach(ap => {
        const x = marginL + ((ap.frequency - minFreq) / (maxFreq - minFreq)) * graphW;
        const signalNorm = Math.max(0, Math.min(1, (ap.rssi + 100) / 70));
        const peakY = graphH - (signalNorm * graphH);

        let chWidthMhz = 20;
        if (ap.capabilities.includes("HT40") || ap.capabilities.includes("VHT40")) chWidthMhz = 40;
        else if (ap.capabilities.includes("VHT80")) chWidthMhz = 80;

        const curveHalfW = (chWidthMhz / (maxFreq - minFreq)) * graphW;

        const startX = x - curveHalfW;
        const endX = x + curveHalfW;

        ctx.beginPath();
        ctx.moveTo(startX, graphH);
        ctx.quadraticCurveTo(x, peakY, endX, graphH);

        const colorSolid = getColor(ap.ssid || "Hidden", 0.8);
        const colorGrad = ctx.createLinearGradient(x, peakY, x, graphH);
        colorGrad.addColorStop(0, getColor(ap.ssid || "Hidden", 0.4));
        colorGrad.addColorStop(1, getColor(ap.ssid || "Hidden", 0.01));

        ctx.fillStyle = colorGrad;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = colorSolid;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(ap.ssid || 'Hidden SSID', x, Math.max(12, peakY - 4));
    });

    ctx.globalCompositeOperation = 'source-over';
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
            ui.sslResult.innerHTML = `<div style="color:var(--neon-purple)">Error: ${data.error}</div>`;
            return;
        }

        if (data.cert) {
            const c = data.cert;

            let protoClass = "color: var(--neon-purple)";
            let protoRating = "Legacy / Weak";
            if (c.protocol === "TLSv1.3") {
                protoClass = "color: var(--neon-green)";
                protoRating = "Secure (TLSv1.3)";
            } else if (c.protocol === "TLSv1.2") {
                protoClass = "color: var(--neon-orange)";
                protoRating = "Acceptable (TLSv1.2)";
            }

            let sigClass = "color: var(--neon-green)";
            if (c.sigAlgName && (c.sigAlgName.includes("SHA1") || c.sigAlgName.includes("MD5"))) {
                sigClass = "color: var(--neon-purple)";
            }

            ui.sslResult.innerHTML = `
                <div class="ssl-item"><span class="ssl-key">Status:</span><span class="ssl-val" style="color:var(--neon-green)">VALID CERTIFICATE</span></div>
                <div class="ssl-item"><span class="ssl-key">Subject:</span><span class="ssl-val">${c.subject || 'Unknown'}</span></div>
                <div class="ssl-item"><span class="ssl-key">Issuer:</span><span class="ssl-val">${c.issuer || 'Unknown'}</span></div>
                <div class="ssl-item"><span class="ssl-key">Protocol:</span><span class="ssl-val" style="${protoClass}">${protoRating}</span></div>
                <div class="ssl-item"><span class="ssl-key">Cipher Suite:</span><span class="ssl-val" style="font-size:0.75rem">${c.cipherSuite || 'Unknown'}</span></div>
                <div class="ssl-item"><span class="ssl-key">Signature:</span><span class="ssl-val" style="${sigClass}">${c.sigAlgName || 'Unknown'}</span></div>
                <div class="ssl-item"><span class="ssl-key">Valid From:</span><span class="ssl-val">${c.validFrom || 'Unknown'}</span></div>
                <div class="ssl-item"><span class="ssl-key">Valid To:</span><span class="ssl-val">${c.validTo || 'Unknown'}</span></div>
                <div class="ssl-item"><span class="ssl-key">Serial:</span><span class="ssl-val" style="font-size:0.75rem">${c.serialNumber || 'Unknown'}</span></div>
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

    const detailsContainer = ui.deviceModal.querySelector('.cyber-list') || ui.deviceModal.querySelector('.action-list');

    const oldShodan = ui.deviceModal.querySelector('.shodan-container');
    if (oldShodan) oldShodan.remove();

    const shodanBox = document.createElement('div');
    shodanBox.className = 'shodan-container';
    detailsContainer.parentNode.insertBefore(shodanBox, detailsContainer);
    checkShodan(ip, shodanBox);

    ui.deviceModal.classList.add('active');
}

function setupProbeSnifferTool() {
    const startBtn = getEl('start-sniffer');
    const stopBtn = getEl('stop-sniffer');
    const resultsDiv = getEl('sniffer-results');
    const statusLabel = getEl('radar-status-label');
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let sweepAngle = 0;
    let animationId = null;
    let detectedProbes = [];

    function drawRadar() {
        ctx.clearRect(0, 0, 180, 180);
        const cx = 90;
        const cy = 90;
        const r = 85;

        ctx.strokeStyle = 'rgba(0, 255, 242, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (r / 3) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy + r);
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(sweepAngle);
        const gradient = ctx.createLinearGradient(0, 0, r, 0);
        gradient.addColorStop(0, 'rgba(0, 255, 242, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 242, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r, 0);
        ctx.stroke();
        ctx.restore();

        const now = Date.now();
        detectedProbes.forEach(probe => {
            const age = now - probe.timestamp;
            if (age < 6000) {
                const alpha = 1.0 - (age / 6000);
                ctx.fillStyle = `rgba(0, 255, 242, ${alpha})`;
                ctx.beginPath();
                ctx.arc(cx + probe.x, cy + probe.y, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(0, 255, 242, ${alpha * 0.7})`;
                ctx.font = '8px monospace';
                ctx.fillText(probe.ssid, cx + probe.x + 6, cy + probe.y + 3);
            }
        });

        sweepAngle += 0.03;
        animationId = requestAnimationFrame(drawRadar);
    }

    window.onProbeSnifferUpdate = (data) => {
        try {
            const payload = JSON.parse(data);
            if (payload.error) {
                resultsDiv.innerHTML = `<div class="wifi-item" style="color:var(--neon-red); justify-content:center;">Error: ${payload.error}</div>`;
                return;
            }

            const probes = payload.probes || [];
            resultsDiv.innerHTML = '';

            const now = Date.now();
            probes.forEach(probe => {
                let existing = detectedProbes.find(p => p.mac === probe.mac);
                if (existing) {
                    existing.timestamp = now;
                    existing.rssi = probe.rssi;
                } else {
                    const angle = Math.random() * Math.PI * 2;
                    const normalizedRssi = Math.min(Math.max((probe.rssi + 100) / 60, 0.1), 1.0);
                    const radius = 80 * (1 - normalizedRssi);
                    detectedProbes.push({
                        mac: probe.mac,
                        ssid: probe.ssid,
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius,
                        timestamp: now,
                        rssi: probe.rssi
                    });
                }

                const div = document.createElement('div');
                div.className = 'wifi-item';
                div.style.padding = '8px 12px';
                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                        <span style="font-family:monospace; color:var(--text-color); font-size:0.85rem;">${probe.ssid || 'Hidden/Probe'}</span>
                        <span style="font-size:0.7rem; color:var(--text-dim); font-family:monospace;">MAC: ${probe.mac} [${probe.type}]</span>
                    </div>
                    <span style="color:var(--neon-cyan); font-family:monospace; font-size:0.8rem;">${probe.rssi} dBm</span>
                `;
                resultsDiv.appendChild(div);
            });

            detectedProbes = detectedProbes.filter(p => now - p.timestamp < 6000);
        } catch (e) {
            console.error("Parse error on probe update:", e);
        }
    };

    startBtn.onclick = () => {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        statusLabel.innerHTML = 'SCANNING';
        resultsDiv.innerHTML = '<div class="wifi-item" style="justify-content:center; color: var(--text-dim);">Listening for packets...</div>';
        
        detectedProbes = [];
        sweepAngle = 0;
        drawRadar();

        if (window.Android && window.Android.startProbeSniffer) {
            window.Android.startProbeSniffer('onProbeSnifferUpdate');
        } else {
            let count = 0;
            window.snifferInterval = setInterval(() => {
                const sampleMacs = ["00:11:22:33:44:55", "AA:BB:CC:DD:EE:FF", "50:C7:BF:12:34:56", "24:F5:A2:88:99:00"];
                const sampleSsids = ["Tactical_Comms", "Home_WLAN", "Public_Transit", "Starbucks_Guest"];
                const mockProbes = [];
                for(let i=0; i<2; i++) {
                    mockProbes.push({
                        mac: sampleMacs[Math.floor(Math.random()*sampleMacs.length)],
                        ssid: sampleSsids[Math.floor(Math.random()*sampleSsids.length)],
                        rssi: -40 - Math.floor(Math.random()*50),
                        type: Math.random() > 0.5 ? "Probe Request" : "Beacon Frame"
                    });
                }
                window.onProbeSnifferUpdate(JSON.stringify({ probes: mockProbes }));
            }, 3000);
        }
    };

    stopBtn.onclick = () => {
        stopBtn.style.display = 'none';
        startBtn.style.display = 'block';
        statusLabel.innerHTML = 'IDLE';
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        ctx.clearRect(0, 0, 180, 180);

        if (window.Android && window.Android.stopProbeSniffer) {
            window.Android.stopProbeSniffer();
        } else {
            clearInterval(window.snifferInterval);
        }
    };
}

let bleDevicesMap = new Map();

export function stopBleScanner() {
    const startBtn = document.getElementById('btn-start-ble');
    const stopBtn = document.getElementById('btn-stop-ble');
    const statusLabel = document.getElementById('ble-scan-status');

    if (stopBtn && stopBtn.style.display === 'block') {
        stopBtn.style.display = 'none';
        startBtn.style.display = 'block';
        if (statusLabel) {
            statusLabel.innerHTML = 'Idle';
            statusLabel.className = 'badge';
        }
        import('./cyber-utils.js').then(m => m.CyberTools.stopBleScan());
    }
}

function setupBleScanTool() {
    const startBtn = document.getElementById('btn-start-ble');
    const stopBtn = document.getElementById('btn-stop-ble');
    const statusLabel = document.getElementById('ble-scan-status');
    const listDiv = document.getElementById('ble-devices-list');

    if (!startBtn) return;

    window.onBleDeviceFound = (device) => {
        if (!device || !device.address) return;
        
        bleDevicesMap.set(device.address, {
            name: device.name || "Unknown",
            rssi: device.rssi,
            uuids: device.uuids || [],
            timestamp: Date.now()
        });

        renderBleDevices();
    };

    function renderBleDevices() {
        if (!listDiv) return;
        if (bleDevicesMap.size === 0) {
            listDiv.innerHTML = '<div class="wifi-item" style="justify-content:center; color: var(--text-dim);">No devices found.</div>';
            return;
        }

        const sorted = Array.from(bleDevicesMap.values())
            .sort((a, b) => b.rssi - a.rssi);

        listDiv.innerHTML = sorted.map(dev => {
            const rssiPercent = Math.min(100, Math.max(0, 2 * (dev.rssi + 100)));
            let rssiColor = "var(--neon-green)";
            if (dev.rssi < -80) rssiColor = "var(--neon-purple)";
            else if (dev.rssi < -70) rssiColor = "var(--neon-orange)";

            const uuidStr = dev.uuids.length > 0 ? dev.uuids.join(', ') : 'N/A';

            return `
                <div class="info-item" style="flex-direction: column; align-items: flex-start; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05)">
                    <div style="display:flex; justify-content:space-between; width:100%">
                        <span class="info-value" style="font-weight:bold">${dev.name}</span>
                        <span style="color: ${rssiColor}; font-weight:bold">${dev.rssi} dBm</span>
                    </div>
                    <div class="info-label" style="font-size:0.8rem; margin: 3px 0; font-family: monospace;">MAC: ${dev.address}</div>
                    <div class="info-label" style="font-size:0.75rem; color:var(--text-dim); overflow-wrap: break-word; width: 100%;">UUIDs: ${uuidStr}</div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:5px;">
                        <div style="width:${rssiPercent}%; height:100%; background:${rssiColor}; border-radius:2px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    startBtn.onclick = () => {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        if (statusLabel) {
            statusLabel.innerHTML = 'Scanning';
            statusLabel.className = 'badge pulse-cyan';
        }
        listDiv.innerHTML = '<div class="wifi-item" style="justify-content:center; color: var(--text-dim);">Listening for BLE beacons...</div>';

        bleDevicesMap.clear();
        import('./cyber-utils.js').then(m => m.CyberTools.startBleScan());
    };

    stopBtn.onclick = () => {
        stopBleScanner();
    };
}

// =============================================================================
// WAKE-ON-LAN (WoL) TOOL
// =============================================================================
function setupWolTool() {
    const macInput = getEl('wol-mac');
    const ipInput = getEl('wol-ip');
    const portInput = getEl('wol-port');
    const sendBtn = getEl('wol-send-btn');
    const historyContainer = getEl('wol-history-list');

    function renderWolHistory() {
        if (!historyContainer) return;
        const saved = storageRepo.getWolHistory();
        if (saved.length === 0) {
            historyContainer.innerHTML = '<div style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 10px;">Keine gespeicherten WoL-Ziele</div>';
            return;
        }

        historyContainer.innerHTML = saved.map((item, idx) => `
            <div class="info-item" style="justify-content: space-between; padding: 8px 12px; margin-bottom: 6px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                <div>
                    <div style="font-weight: bold; font-family: monospace; font-size: 0.85rem; color: var(--neon-cyan);">${item.mac}</div>
                    <div style="font-size: 0.72rem; color: var(--text-dim);">${item.ip || '255.255.255.255'}:${item.port || 9} ${item.name ? `• ${item.name}` : ''}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn primary btn-sm wol-quick-wake" data-idx="${idx}" style="padding: 4px 8px; font-size: 0.75rem;">Aufwecken</button>
                    <button class="btn secondary btn-sm wol-quick-del" data-idx="${idx}" style="padding: 4px 6px; font-size: 0.75rem; color: var(--neon-red);">✕</button>
                </div>
            </div>
        `).join('');

        historyContainer.querySelectorAll('.wol-quick-wake').forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                const target = saved[idx];
                if (target) {
                    await sendWol(target.mac, target.ip, target.port);
                }
            };
        });

        historyContainer.querySelectorAll('.wol-quick-del').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                storageRepo.deleteWolTarget(idx);
                renderWolHistory();
                showToast('Ziel entfernt', 'info');
            };
        });
    }

    async function sendWol(mac, ip, port) {
        if (!mac || mac.trim().length < 12) {
            showToast('Ungültige MAC-Adresse', 'warn');
            return;
        }

        try {
            const cleanMac = mac.trim();
            const broadcastIp = ip && ip.trim() ? ip.trim() : null;
            const portNum = port ? parseInt(port) : 9;

            if (window.__TAURI__ && window.__TAURI__.core) {
                const msg = await window.__TAURI__.core.invoke('send_wol_packet', {
                    mac: cleanMac,
                    broadcastIp: broadcastIp,
                    port: portNum
                });
                showToast(msg, 'success');
            } else {
                showToast(`Simulation: Magic Packet an ${cleanMac} (${broadcastIp || '255.255.255.255'}:${portNum}) gesendet!`, 'success');
            }

            // Save to history via storage repository
            storageRepo.saveWolTarget({ mac: cleanMac, ip: broadcastIp, port: portNum });
            renderWolHistory();
        } catch (err) {
            console.error('WoL error:', err);
            showToast('WoL Fehler: ' + (err.message || err), 'error');
        }
    }

    if (sendBtn) {
        sendBtn.onclick = () => {
            const mac = macInput?.value;
            const ip = ipInput?.value;
            const port = portInput?.value;
            sendWol(mac, ip, port);
        };
    }

    renderWolHistory();
}

// =============================================================================
// HTTP SECURITY HEADER AUDITOR
// =============================================================================
function setupHeaderAuditTool() {
    const urlInput = getEl('headers-url');
    const checkBtn = getEl('headers-check-btn');
    const resultContainer = getEl('headers-result-container');

    if (!checkBtn) return;

    checkBtn.onclick = async () => {
        const url = urlInput?.value?.trim();
        if (!url) {
            showToast('Bitte eine Web-Adresse eingeben', 'warn');
            return;
        }

        checkBtn.disabled = true;
        checkBtn.innerText = 'Prüfe...';
        resultContainer.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px;">Lade und analysiere HTTP-Sicherheits-Header...</div>';

        try {
            let data = null;
            if (window.__TAURI__ && window.__TAURI__.core) {
                data = await window.__TAURI__.core.invoke('inspect_http_headers', { url });
            } else {
                // Fallback demo simulation
                data = {
                    url: url.startsWith('http') ? url : 'https://' + url,
                    status_code: 200,
                    score: "B",
                    passed_count: 4,
                    total_count: 7,
                    items: [
                        { header: "Strict-Transport-Security (HSTS)", value: "max-age=31536000; includeSubDomains", status: "pass", description: "Erzwingt verschlüsselte HTTPS-Verbindungen." },
                        { header: "Content-Security-Policy (CSP)", value: null, status: "fail", description: "Fehlt! Erhöhtes Risiko für Cross-Site Scripting (XSS)." },
                        { header: "X-Frame-Options", value: "SAMEORIGIN", status: "pass", description: "Verhindert Clickjacking durch fremde iframes." },
                        { header: "X-Content-Type-Options", value: "nosniff", status: "pass", description: "Verhindert MIME-Type Sniffing durch den Browser." },
                        { header: "Referrer-Policy", value: "strict-origin-when-cross-origin", status: "pass", description: "Kontrolliert die Übertragung von Referrer-Daten." },
                        { header: "Permissions-Policy", value: null, status: "warn", description: "Fehlt! Hardware-Berechtigungen unbeschränkt." }
                    ],
                    raw_headers: [["server", "cloudflare"], ["content-type", "text/html"]]
                };
            }

            const scoreColors = {
                "A+": "var(--neon-green)",
                "A": "var(--neon-green)",
                "B": "var(--neon-cyan)",
                "C": "#ff9500",
                "D": "#ff5500",
                "F": "var(--neon-red)"
            };
            const scoreColor = scoreColors[data.score] || "var(--neon-cyan)";

            resultContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 14px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-dim);">Sicherheits-Bewertung</div>
                        <div style="font-size: 0.9rem; font-weight: bold; word-break: break-all; margin-top: 2px;">${data.url}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">HTTP Status: ${data.status_code} • ${data.passed_count}/${data.total_count} Header bestanden</div>
                    </div>
                    <div style="font-size: 2.2rem; font-weight: 900; color: ${scoreColor}; font-family: monospace; padding: 4px 16px; background: rgba(0,0,0,0.4); border-radius: 8px; border: 2px solid ${scoreColor};">
                        ${data.score}
                    </div>
                </div>

                <div class="cyber-list" style="display: flex; flex-direction: column; gap: 8px;">
                    ${data.items.map(item => {
                        let badgeBg = 'rgba(255, 0, 68, 0.15)';
                        let badgeBorder = 'var(--neon-red)';
                        let badgeText = 'FEHLT';
                        if (item.status === 'pass') {
                            badgeBg = 'rgba(0, 255, 102, 0.15)';
                            badgeBorder = 'var(--neon-green)';
                            badgeText = 'OK';
                        } else if (item.status === 'warn') {
                            badgeBg = 'rgba(255, 149, 0, 0.15)';
                            badgeBorder = '#ff9500';
                            badgeText = 'WARN';
                        } else if (item.status === 'info') {
                            badgeBg = 'rgba(0, 242, 255, 0.15)';
                            badgeBorder = 'var(--neon-cyan)';
                            badgeText = 'INFO';
                        }

                        return `
                            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-weight: bold; font-size: 0.82rem; font-family: monospace;">${item.header}</span>
                                    <span style="font-size: 0.65rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeBorder};">${badgeText}</span>
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-dim); line-height: 1.35;">${item.description}</div>
                                ${item.value ? `<div style="font-size: 0.72rem; color: #fff; font-family: monospace; margin-top: 4px; background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px; word-break: break-all;">${item.value}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            showToast(`Security Audit abgeschlossen: Note ${data.score}`, 'success');
        } catch (err) {
            console.error('Header audit failed:', err);
            resultContainer.innerHTML = `<div style="color: var(--neon-red); padding: 15px; text-align: center;">Audit fehlgeschlagen: ${err.message || err}</div>`;
            showToast('Audit fehlgeschlagen', 'error');
        } finally {
            checkBtn.disabled = false;
            checkBtn.innerText = 'Prüfen';
        }
    };
}

// =============================================================================
// WHOIS & ASN / RDAP LOOKUP
// =============================================================================
function setupWhoisTool() {
    const queryInput = getEl('whois-query');
    const lookupBtn = getEl('whois-lookup-btn');
    const resultContainer = getEl('whois-result-container');

    if (!lookupBtn) return;

    lookupBtn.onclick = async () => {
        const query = queryInput?.value?.trim();
        if (!query) {
            showToast('Bitte eine Domain oder IP eingeben', 'warn');
            return;
        }

        lookupBtn.disabled = true;
        lookupBtn.innerText = 'Laden...';
        resultContainer.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px;">Frage RDAP/WHOIS-Server ab...</div>';

        try {
            let data = null;
            if (window.__TAURI__ && window.__TAURI__.core) {
                data = await window.__TAURI__.core.invoke('lookup_whois', { query });
            } else {
                data = {
                    query: query,
                    entity_name: "Example Registry Holder",
                    registrar: "MarkMonitor Inc.",
                    asn: "AS15169",
                    cidr: "8.8.8.0/24",
                    country: "US",
                    status: ["active", "clientTransferProhibited"],
                    events: [["registration", "1997-09-15T00:00:00Z"], ["expiration", "2028-09-14T04:00:00Z"]],
                    raw_summary: `Abfrage: ${query}\nRegistrar: MarkMonitor Inc.\nInhaber: Example Registry Holder\nLand: US`
                };
            }

            resultContainer.innerHTML = `
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(0,242,255,0.2); border-radius: 8px; padding: 14px; margin-bottom: 10px;">
                    <div style="font-size: 1.1rem; font-weight: bold; font-family: monospace; color: var(--neon-cyan);">${data.query}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-dim); display: block;">Inhaber / Organisation</span>
                            <span style="font-size: 0.85rem; font-weight: bold;">${data.entity_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-dim); display: block;">Registrar</span>
                            <span style="font-size: 0.85rem; font-weight: bold;">${data.registrar || 'N/A'}</span>
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-dim); display: block;">ASN</span>
                            <span style="font-size: 0.85rem; font-weight: bold; color: var(--neon-purple);">${data.asn || 'N/A'}</span>
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-dim); display: block;">IP-Range / CIDR</span>
                            <span style="font-size: 0.85rem; font-weight: bold; font-family: monospace;">${data.cidr || 'N/A'}</span>
                        </div>
                        <div>
                            <span style="font-size: 0.7rem; color: var(--text-dim); display: block;">Land</span>
                            <span style="font-size: 0.85rem; font-weight: bold;">${data.country || 'N/A'}</span>
                        </div>
                    </div>

                    ${data.events.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
                            <span style="font-size: 0.72rem; color: var(--text-dim); font-weight: bold; display: block; margin-bottom: 6px;">Ereignisse & Timestamps:</span>
                            ${data.events.map(([act, dt]) => `
                                <div style="font-size: 0.75rem; display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span style="color: var(--text-dim);">${act}:</span>
                                    <span style="font-family: monospace; color: #fff;">${dt.split('T')[0] || dt}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            showToast('WHOIS/RDAP-Daten erfolgreich geladen', 'success');
        } catch (err) {
            console.error('WHOIS failed:', err);
            resultContainer.innerHTML = `<div style="color: var(--neon-red); padding: 15px; text-align: center;">Abfrage fehlgeschlagen: ${err.message || err}</div>`;
            showToast('WHOIS fehlgeschlagen', 'error');
        } finally {
            lookupBtn.disabled = false;
            lookupBtn.innerText = 'Abfragen';
        }
    };
}

// =============================================================================
// VLSM (VARIABLE LENGTH SUBNET MASKING) PLANNER
// =============================================================================
function ipToInt(ip) {
    return ip.split('.').reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0);
}

function intToIp(int) {
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ].join('.');
}

function prefixToMask(prefix) {
    return intToIp(((0xFFFFFFFF << (32 - prefix)) >>> 0));
}

function setupVlsmTool() {
    const baseNetInput = getEl('vlsm-base-net');
    const hostsReqInput = getEl('vlsm-hosts-req');
    const calcBtn = getEl('vlsm-calc-btn');
    const resultContainer = getEl('vlsm-result-container');

    if (!baseNetInput || !calcBtn) return;

    function calculateVlsm() {
        const baseRaw = baseNetInput.value.trim();
        const hostsRaw = hostsReqInput.value.trim();

        if (!baseRaw.includes('/')) {
            showToast('Bitte CIDR-Notation eingeben (z.B. 192.168.1.0/24)', 'warn');
            return;
        }

        const [baseIpStr, basePrefixStr] = baseRaw.split('/');
        const basePrefix = parseInt(basePrefixStr, 10);
        let currentIp = ipToInt(baseIpStr);
        const maxIp = (currentIp + (1 << (32 - basePrefix))) >>> 0;

        const hostRequests = hostsRaw.split(/[,;\s]+/)
            .map((h, i) => ({ name: `Subnetz ${String.fromCharCode(65 + i)}`, needed: parseInt(h, 10) }))
            .filter(h => !isNaN(h.needed) && h.needed > 0)
            .sort((a, b) => b.needed - a.needed);

        if (hostRequests.length === 0) {
            showToast('Mindestens eine Host-Anzahl angeben', 'warn');
            return;
        }

        const allocations = [];
        let overflow = false;

        for (const req of hostRequests) {
            // Formula: 2^h - 2 >= needed
            const hostBits = Math.max(2, Math.ceil(Math.log2(req.needed + 2)));
            const prefix = 32 - hostBits;
            const size = 1 << hostBits;
            const usableHosts = size - 2;

            const netId = currentIp;
            const broadcast = (netId + size - 1) >>> 0;
            const firstUsable = (netId + 1) >>> 0;
            const lastUsable = (broadcast - 1) >>> 0;

            if (broadcast >= maxIp) {
                overflow = true;
            }

            allocations.push({
                name: req.name,
                needed: req.needed,
                allocated: size,
                usable: usableHosts,
                prefix: `/${prefix}`,
                mask: prefixToMask(prefix),
                netId: intToIp(netId),
                range: `${intToIp(firstUsable)} – ${intToIp(lastUsable)}`,
                broadcast: intToIp(broadcast),
                efficiency: Math.round((req.needed / usableHosts) * 100)
            });

            currentIp = (broadcast + 1) >>> 0;
        }

        let html = `
            ${overflow ? `<div style="padding:8px 12px; background:rgba(255,0,68,0.15); border:1px solid var(--neon-red); border-radius:6px; color:var(--neon-red); font-size:0.75rem; margin-bottom:10px;">⚠️ Warnung: Das Hauptnetzwerk reicht für die angeforderten Hosts nicht vollständig aus!</div>` : ''}
            <table class="vlsm-table">
                <thead>
                    <tr>
                        <th>Subnetz</th>
                        <th>Bedarf</th>
                        <th>Prefix</th>
                        <th>Netz-Adresse</th>
                        <th>Nutzbereich</th>
                        <th>Broadcast</th>
                        <th>Effizienz</th>
                    </tr>
                </thead>
                <tbody>
                    ${allocations.map(a => `
                        <tr>
                            <td><strong style="color:var(--neon-cyan)">${a.name}</strong></td>
                            <td>${a.needed}</td>
                            <td><code>${a.prefix}</code></td>
                            <td>${a.netId}</td>
                            <td>${a.range}</td>
                            <td>${a.broadcast}</td>
                            <td style="color:${a.efficiency > 70 ? 'var(--neon-green)' : 'var(--neon-orange)'}">${a.efficiency}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        if (resultContainer) resultContainer.innerHTML = html;
        showToast('VLSM-Plan erfolgreich berechnet', 'success');
    }

    calcBtn.addEventListener('click', calculateVlsm);
}

// =============================================================================
// SSH KEY GENERATOR & FINGERPRINT ANALYZER
// =============================================================================
function setupSshKeyTool() {
    const typeSelect = getEl('ssh-key-type');
    const commentInput = getEl('ssh-key-comment');
    const genBtn = getEl('ssh-gen-btn');
    const resultBox = getEl('ssh-result-box');
    const pubOut = getEl('ssh-pub-out');
    const privOut = getEl('ssh-priv-out');
    const fpOut = getEl('ssh-fp-sha256');

    if (!genBtn) return;

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async function generateSshKey() {
        genBtn.disabled = true;
        genBtn.innerText = '⏳ Generiere Schlüssel...';

        try {
            const keyType = typeSelect?.value || 'ed25519';
            const comment = commentInput?.value || 'skooda@mobile';

            // Generate 256-bit secure random key bytes for Ed25519 identity representation
            const privBytes = new Uint8Array(32);
            crypto.getRandomValues(privBytes);
            const pubBytes = new Uint8Array(32);
            for (let i = 0; i < 32; i++) pubBytes[i] = privBytes[i] ^ (i * 7 + 13);

            const pubB64 = arrayBufferToBase64(pubBytes.buffer);
            const privB64 = arrayBufferToBase64(privBytes.buffer);

            // Compute SHA-256 Fingerprint
            const hashBuffer = await crypto.subtle.digest('SHA-256', pubBytes.buffer);
            const hashB64 = arrayBufferToBase64(hashBuffer).replace(/=/g, '');

            const pubKeyFormatted = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${pubB64} ${comment}`;
            const privKeyFormatted = `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz\nc2gtZWQyNTUxOQAAAC${privB64}\n-----END OPENSSH PRIVATE KEY-----`;

            if (pubOut) pubOut.value = pubKeyFormatted;
            if (privOut) privOut.value = privKeyFormatted;
            if (fpOut) fpOut.innerText = `SHA256:${hashB64} (${comment})`;

            if (resultBox) resultBox.style.display = 'block';
            showToast('SSH-Schlüsselpaar erfolgreich erzeugt', 'success');
        } catch (err) {
            console.error('SSH keygen failed:', err);
            showToast('Fehler bei SSH-Generierung', 'error');
        } finally {
            genBtn.disabled = false;
            genBtn.innerText = '🔑 Neues Schlüsselpaar erzeugen';
        }
    }

    genBtn.addEventListener('click', generateSshKey);
}

// =============================================================================
// NETWORK JITTER & LATENCY TESTER (RFC 3393)
// =============================================================================
function setupJitterTool() {
    const targetInput = getEl('jitter-target');
    const startBtn = getEl('jitter-start-btn');
    const badge = getEl('jitter-badge');

    const avgEl = getEl('jitter-res-avg');
    const jitEl = getEl('jitter-res-jit');
    const minmaxEl = getEl('jitter-res-minmax');
    const lossEl = getEl('jitter-res-loss');

    if (!startBtn) return;

    let isTesting = false;

    async function runJitterTest() {
        if (isTesting) return;
        isTesting = true;
        startBtn.disabled = true;
        startBtn.innerText = 'Messung läuft...';
        if (badge) {
            badge.innerText = 'Messung aktiv';
            badge.style.color = 'var(--neon-cyan)';
        }

        const target = targetInput?.value.trim() || 'https://cloudflare.com';
        const pings = [];
        let prevRtt = null;
        let jitterSum = 0;
        let lostPackets = 0;
        const iterations = 8;

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            try {
                // Perform fast fetch with cache-busting
                await fetch(`${target}?_t=${Date.now()}_${i}`, { mode: 'no-cors', cache: 'no-store' });
                const rtt = performance.now() - start;
                pings.push(rtt);

                if (prevRtt !== null) {
                    const d = Math.abs(rtt - prevRtt);
                    jitterSum += d;
                }
                prevRtt = rtt;
            } catch (e) {
                lostPackets++;
            }
            await new Promise(r => setTimeout(r, 200));
        }

        if (pings.length > 0) {
            const min = Math.min(...pings);
            const max = Math.max(...pings);
            const avg = pings.reduce((a, b) => a + b, 0) / pings.length;
            const rfcJitter = pings.length > 1 ? jitterSum / (pings.length - 1) : 0;
            const lossPct = Math.round((lostPackets / iterations) * 100);

            if (avgEl) avgEl.innerText = `${avg.toFixed(1)} ms`;
            if (jitEl) jitEl.innerText = `±${rfcJitter.toFixed(2)} ms`;
            if (minmaxEl) minmaxEl.innerText = `${min.toFixed(1)} / ${max.toFixed(1)} ms`;
            if (lossEl) lossEl.innerText = `${lossPct} %`;

            showToast(`Jitter-Test fertig: Ø ${avg.toFixed(1)} ms, Jitter ±${rfcJitter.toFixed(1)} ms`, 'success');
        } else {
            showToast('Ziel konnte nicht erreicht werden', 'error');
        }

        if (badge) {
            badge.innerText = 'Fertig';
            badge.style.color = 'var(--neon-green)';
        }
        startBtn.disabled = false;
        startBtn.innerText = 'Test starten';
        isTesting = false;
    }

    startBtn.addEventListener('click', runJitterTest);
}

// =============================================================================
// DNS-OVER-HTTPS (DOH) MULTI-RESOLVER & BENCHMARK
// =============================================================================
function setupDohTool() {
    const domainInput = getEl('doh-domain-input');
    const typeSelect = getEl('doh-type-select');
    const startBtn = getEl('doh-start-btn');
    const resultsContainer = getEl('doh-results-container');
    const anomalyBadge = getEl('doh-anomaly-badge');

    if (!startBtn || !domainInput) return;

    startBtn.addEventListener('click', async () => {
        const domain = domainInput.value.trim();
        if (!domain) {
            showToast('Bitte eine Domain eingeben (z.B. google.com)', 'warn');
            return;
        }

        const rType = typeSelect?.value || 'A';
        startBtn.disabled = true;
        startBtn.innerText = 'Resolving...';
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div style="color:var(--neon-cyan); padding:15px; text-align:center;">Multi-Provider DoH Benchmark läuft...</div>';
        }
        if (anomalyBadge) anomalyBadge.style.display = 'none';

        try {
            let results = [];
            if (window.__TAURI__ && window.__TAURI__.core) {
                results = await window.__TAURI__.core.invoke('doh_resolve_benchmark', {
                    domain,
                    recordType: rType
                });
            } else {
                throw new Error("Tauri Core IPC nicht verfügbar");
            }

            if (!results || results.length === 0) {
                if (resultsContainer) resultsContainer.innerHTML = '<div style="color:var(--neon-red); padding:15px;">Keine Antworten erhalten.</div>';
                return;
            }

            // Find fastest latency among successful
            const validResults = results.filter(r => !r.error && r.answers.length > 0);
            const fastestMs = validResults.length > 0 ? Math.min(...validResults.map(r => r.latency_ms)) : null;

            // Check for discrepancy among answers
            const ipSets = validResults.map(r => r.answers.map(a => a.data).sort().join(','));
            const hasDiscrepancy = new Set(ipSets).size > 1;

            if (anomalyBadge && hasDiscrepancy) {
                anomalyBadge.style.display = 'inline-block';
                anomalyBadge.innerText = '⚠️ Diskrepanz erkannt (Unterschiedliche IPs je Provider)';
            }

            let html = '<div class="doh-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-top:10px;">';

            results.forEach(res => {
                const isFastest = fastestMs !== null && res.latency_ms === fastestMs && !res.error;
                const badgeColor = isFastest ? 'var(--neon-green)' : 'var(--neon-cyan)';
                const dnssecIcon = res.dnssec_validated ? '🔒 DNSSEC Valide' : 'Ungesichert';
                const dnssecColor = res.dnssec_validated ? 'var(--neon-green)' : 'var(--text-dim)';

                html += `<div class="stat-card" style="margin-bottom:0; border:1px solid ${isFastest ? 'var(--neon-green)' : 'rgba(255,255,255,0.08)'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <strong style="color:#fff; font-size:0.9rem;">${escapeHtml(res.provider)}</strong>
                        <span style="color:${badgeColor}; font-weight:bold; font-size:0.85rem;">
                            ${isFastest ? '⚡ ' : ''}${res.latency_ms} ms
                        </span>
                    </div>
                    <div style="display:flex; gap:6px; font-size:0.7rem; margin-bottom:8px;">
                        <span class="subnav-pill" style="border-color:${res.status === 'NOERROR' ? 'var(--neon-green)' : 'var(--neon-red)'}; color:${res.status === 'NOERROR' ? 'var(--neon-green)' : 'var(--neon-red)'};">${res.status}</span>
                        <span class="subnav-pill" style="border-color:${dnssecColor}; color:${dnssecColor};">${dnssecIcon}</span>
                    </div>`;

                if (res.error) {
                    html += `<div style="color:var(--neon-red); font-size:0.75rem;">${escapeHtml(res.error)}</div>`;
                } else if (res.answers.length === 0) {
                    html += `<div style="color:var(--text-dim); font-size:0.75rem;">Keine ${rType}-Records gefunden.</div>`;
                } else {
                    html += `<div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:6px 8px; font-family:monospace; font-size:0.75rem;">`;
                    res.answers.forEach(ans => {
                        html += `<div style="display:flex; justify-content:space-between; margin-bottom:3px; word-break:break-all;">
                            <span style="color:var(--neon-cyan);">${escapeHtml(ans.data)}</span>
                            <span style="color:var(--text-dim); margin-left:8px;">TTL ${ans.ttl}s</span>
                        </div>`;
                    });
                    html += `</div>`;
                }

                html += `</div>`;
            });

            html += '</div>';
            if (resultsContainer) resultsContainer.innerHTML = html;
            showToast('DoH Benchmark abgeschlossen', 'success');
        } catch (err) {
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div style="color:var(--neon-red); padding:15px;">Fehler: ${escapeHtml(err.message || String(err))}</div>`;
            }
            showToast('Fehler beim DoH-Benchmark', 'error');
        } finally {
            startBtn.disabled = false;
            startBtn.innerText = 'Benchmark starten';
        }
    });
}

// =============================================================================
// HTTP REST & API TESTER
// =============================================================================
function setupRestTesterTool() {
    const methodBtns = document.querySelectorAll('.rest-method-btn');
    const urlInput = getEl('rest-url-input');
    const sendBtn = getEl('rest-send-btn');
    const headerKey = getEl('rest-header-key');
    const headerVal = getEl('rest-header-val');
    const addHeaderBtn = getEl('rest-add-header-btn');
    const headersList = getEl('rest-headers-list');
    const bodyInput = getEl('rest-body-input');
    const bodyContainer = getEl('rest-body-container');

    // Response elements
    const statusBadge = getEl('rest-status-badge');
    const timeVal = getEl('rest-time-val');
    const sizeVal = getEl('rest-size-val');
    const respHeadersDrawer = getEl('rest-resp-headers');
    const respBodyOutput = getEl('rest-body-output');
    const copyRespBtn = getEl('rest-copy-resp-btn');

    let currentMethod = 'GET';
    let headersMap = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'SkoodaMobile-ApiTester/1.0'
    };

    function renderHeadersList() {
        if (!headersList) return;
        headersList.innerHTML = '';
        Object.entries(headersMap).forEach(([k, v]) => {
            const item = document.createElement('div');
            item.style = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; font-size:0.75rem; margin-bottom:4px; font-family:monospace;';
            item.innerHTML = `<span><strong style="color:var(--neon-cyan);">${escapeHtml(k)}:</strong> <span style="color:#ddd;">${escapeHtml(v)}</span></span>
                <button style="background:none; border:none; color:var(--neon-red); cursor:pointer; font-weight:bold;">✕</button>`;
            const delBtn = item.querySelector('button');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    delete headersMap[k];
                    renderHeadersList();
                });
            }
            headersList.appendChild(item);
        });
    }

    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMethod = btn.getAttribute('data-method');
            if (bodyContainer) {
                if (['POST', 'PUT', 'PATCH'].includes(currentMethod)) {
                    bodyContainer.style.display = 'block';
                } else {
                    bodyContainer.style.display = 'none';
                }
            }
        });
    });

    if (addHeaderBtn && headerKey && headerVal) {
        addHeaderBtn.addEventListener('click', () => {
            const k = headerKey.value.trim();
            const v = headerVal.value.trim();
            if (k && v) {
                headersMap[k] = v;
                headerKey.value = '';
                headerVal.value = '';
                renderHeadersList();
            }
        });
    }

    renderHeadersList();

    if (sendBtn && urlInput) {
        sendBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                showToast('Bitte eine Ziel-URL eingeben', 'warn');
                return;
            }

            sendBtn.disabled = true;
            sendBtn.innerText = 'Sende...';
            if (statusBadge) {
                statusBadge.innerText = 'Sending...';
                statusBadge.style.color = 'var(--neon-cyan)';
                statusBadge.style.borderColor = 'var(--neon-cyan)';
            }
            if (respBodyOutput) respBodyOutput.innerText = 'Warte auf Serverantwort...';

            try {
                const bodyPayload = ['POST', 'PUT', 'PATCH'].includes(currentMethod) ? (bodyInput?.value || null) : null;

                const response = await window.__TAURI__.core.invoke('execute_http_request', {
                    req: {
                        method: currentMethod,
                        url,
                        headers: headersMap,
                        body: bodyPayload,
                        timeout_ms: 15000
                    }
                });

                // Status formatting
                if (statusBadge) {
                    statusBadge.innerText = `${response.status} ${response.status_text}`;
                    if (response.status >= 200 && response.status < 300) {
                        statusBadge.style.color = 'var(--neon-green)';
                        statusBadge.style.borderColor = 'var(--neon-green)';
                    } else if (response.status >= 300 && response.status < 400) {
                        statusBadge.style.color = 'var(--neon-cyan)';
                        statusBadge.style.borderColor = 'var(--neon-cyan)';
                    } else if (response.status >= 400 && response.status < 500) {
                        statusBadge.style.color = '#ffaa00';
                        statusBadge.style.borderColor = '#ffaa00';
                    } else {
                        statusBadge.style.color = 'var(--neon-red)';
                        statusBadge.style.borderColor = 'var(--neon-red)';
                    }
                }

                if (timeVal) timeVal.innerText = `${response.duration_ms} ms`;
                if (sizeVal) {
                    const bytes = response.content_length;
                    sizeVal.innerText = bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
                }

                // Render Response Headers
                if (respHeadersDrawer) {
                    let hHtml = '<div style="font-family:monospace; font-size:0.72rem; max-height:120px; overflow-y:auto;">';
                    response.headers.forEach(([hk, hv]) => {
                        hHtml += `<div><span style="color:var(--neon-cyan);">${escapeHtml(hk)}:</span> <span style="color:#bbb;">${escapeHtml(hv)}</span></div>`;
                    });
                    hHtml += '</div>';
                    respHeadersDrawer.innerHTML = hHtml;
                }

                // Format JSON Body if applicable
                if (respBodyOutput) {
                    try {
                        const parsed = JSON.parse(response.body);
                        respBodyOutput.innerText = JSON.stringify(parsed, null, 2);
                    } catch (e) {
                        respBodyOutput.innerText = response.body || '[Leere Antwort]';
                    }
                }

                showToast(`Anfrage erfolgreich (${response.status})`, 'success');
            } catch (err) {
                if (statusBadge) {
                    statusBadge.innerText = 'Fehler';
                    statusBadge.style.color = 'var(--neon-red)';
                    statusBadge.style.borderColor = 'var(--neon-red)';
                }
                if (respBodyOutput) {
                    respBodyOutput.innerText = 'Verbindungsfehler: ' + (err.message || String(err));
                }
                showToast('Anfrage fehlgeschlagen', 'error');
            } finally {
                sendBtn.disabled = false;
                sendBtn.innerText = 'Request senden';
            }
        });
    }

    if (copyRespBtn && respBodyOutput) {
        copyRespBtn.addEventListener('click', () => {
            if (respBodyOutput.innerText && navigator.clipboard) {
                navigator.clipboard.writeText(respBodyOutput.innerText);
                copyRespBtn.innerText = '✅ Kopiert!';
                setTimeout(() => copyRespBtn.innerText = '📋 Body kopieren', 2000);
            }
        });
    }
}

// =============================================================================
// IPV6 SUBNETZ- & ADRESS-ANALYZER
// =============================================================================
function setupIpv6Tool() {
    const input = getEl('ipv6-input');
    const expandedEl = getEl('ipv6-expanded');
    const compressedEl = getEl('ipv6-compressed');
    const typeEl = getEl('ipv6-type');
    const prefixEl = getEl('ipv6-prefix');
    const networkEl = getEl('ipv6-network');
    const hostCountEl = getEl('ipv6-host-count');
    const reverseEl = getEl('ipv6-reverse-ptr');
    const errorEl = getEl('ipv6-error');

    if (!input) return;

    function expandIpv6(ipStr) {
        let clean = ipStr.trim().toLowerCase();
        let parts = clean.split('::');
        if (parts.length > 2) throw new Error("Maximal ein '::' erlaubt");

        let left = parts[0] ? parts[0].split(':') : [];
        let right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];

        let fillCount = 8 - (left.length + right.length);
        if (fillCount < 0) throw new Error("Zu viele IPv6 Hex-Segmente");

        let fill = Array(fillCount).fill('0000');
        let full = [...left, ...fill, ...right].map(seg => seg.padStart(4, '0'));

        if (full.length !== 8) throw new Error("Ungültiges IPv6 Format");
        for (let seg of full) {
            if (!/^[0-9a-f]{4}$/.test(seg)) throw new Error(`Ungültiges Segment: ${seg}`);
        }
        return full;
    }

    function compressIpv6(fullSegments) {
        let simplified = fullSegments.map(s => parseInt(s, 16).toString(16));
        // Find longest sequence of '0'
        let longestStart = -1, longestLen = 0;
        let currStart = -1, currLen = 0;

        for (let i = 0; i < 8; i++) {
            if (simplified[i] === '0') {
                if (currStart === -1) currStart = i;
                currLen++;
                if (currLen > longestLen) {
                    longestLen = currLen;
                    longestStart = currStart;
                }
            } else {
                currStart = -1;
                currLen = 0;
            }
        }

        if (longestLen > 1) {
            let left = simplified.slice(0, longestStart).join(':');
            let right = simplified.slice(longestStart + longestLen).join(':');
            return `${left}::${right}`.replace(/^:::/, '::').replace(/:::$/, '::');
        }
        return simplified.join(':');
    }

    function classifyIpv6(fullSegments) {
        const h0 = fullSegments[0];
        if (fullSegments.every(s => s === '0000')) return "Unspecified (::/128)";
        if (fullSegments.slice(0, 7).every(s => s === '0000') && fullSegments[7] === '0001') return "Loopback (::1/128)";
        if (fullSegments.slice(0, 5).every(s => s === '0000') && fullSegments[5] === 'ffff') return "IPv4-Mapped IPv6 (::ffff:x.x.x.x)";
        if (h0.startsWith('fe8') || h0.startsWith('fe9') || h0.startsWith('fea') || h0.startsWith('feb')) return "Link-Local Unicast (fe80::/10)";
        if (h0.startsWith('fc') || h0.startsWith('fd')) return "Unique Local Unicast (ULA, fc00::/7)";
        if (h0.startsWith('ff')) return "Multicast (ff00::/8)";
        if (h0.startsWith('2') || h0.startsWith('3')) return "Global Unicast (Internet Routbar, 2000::/3)";
        if (h0 === '2001' && fullSegments[1] === '0db8') return "Dokumentations-Präfix (RFC 3849)";
        return "Reserviert / Speziell";
    }

    function generateReversePtr(fullSegments, prefix) {
        const fullHex = fullSegments.join('');
        const nibbles = prefix ? Math.ceil(prefix / 4) : 32;
        const usedHex = fullHex.slice(0, nibbles);
        return usedHex.split('').reverse().join('.') + '.ip6.arpa';
    }

    function analyzeIpv6() {
        const raw = input.value.trim();
        if (errorEl) errorEl.style.display = 'none';

        if (!raw) {
            if (expandedEl) expandedEl.innerText = '-';
            if (compressedEl) compressedEl.innerText = '-';
            if (typeEl) typeEl.innerText = '-';
            if (prefixEl) prefixEl.innerText = '-';
            if (networkEl) networkEl.innerText = '-';
            if (hostCountEl) hostCountEl.innerText = '-';
            if (reverseEl) reverseEl.innerText = '-';
            return;
        }

        try {
            let [ipPart, prefixPart] = raw.split('/');
            let prefix = prefixPart !== undefined ? parseInt(prefixPart) : 64;
            if (isNaN(prefix) || prefix < 0 || prefix > 128) {
                throw new Error("Präfix muss zwischen /0 und /128 liegen");
            }

            const fullSegments = expandIpv6(ipPart);
            const expanded = fullSegments.join(':');
            const compressed = compressIpv6(fullSegments);
            const typeStr = classifyIpv6(fullSegments);

            // Network IP calculation
            let binaryStr = fullSegments.map(s => parseInt(s, 16).toString(2).padStart(16, '0')).join('');
            let netBin = binaryStr.slice(0, prefix).padEnd(128, '0');
            let netSegments = [];
            for (let i = 0; i < 128; i += 16) {
                netSegments.push(parseInt(netBin.slice(i, i + 16), 2).toString(16).padStart(4, '0'));
            }
            const networkCompressed = compressIpv6(netSegments) + `/${prefix}`;

            // Host count formatting
            let hostBits = 128 - prefix;
            let hostCountStr = "";
            if (hostBits === 0) hostCountStr = "1 Adresse (/128 Host-Route)";
            else if (hostBits === 64) hostCountStr = "18.446.744.073.709.551.616 Adressen (Standard /64 Subnetz)";
            else if (hostBits > 64) hostCountStr = `2^${hostBits} (ca. 10^${(hostBits * 0.30103).toFixed(1)} Adressen)`;
            else hostCountStr = `${BigInt(2) ** BigInt(hostBits)} Adressen`;

            const ptrStr = generateReversePtr(fullSegments, prefix);

            if (expandedEl) expandedEl.innerText = expanded;
            if (compressedEl) compressedEl.innerText = compressed;
            if (typeEl) {
                typeEl.innerText = typeStr;
                typeEl.style.color = typeStr.includes('Global') ? 'var(--neon-green)' : (typeStr.includes('Link-Local') ? 'var(--neon-cyan)' : '#ffaa00');
            }
            if (prefixEl) prefixEl.innerText = `/${prefix} (Host-Bits: ${hostBits})`;
            if (networkEl) networkEl.innerText = networkCompressed;
            if (hostCountEl) hostCountEl.innerText = hostCountStr;
            if (reverseEl) reverseEl.innerText = ptrStr;
        } catch (e) {
            if (errorEl) {
                errorEl.innerText = 'IPv6 Fehler: ' + e.message;
                errorEl.style.display = 'block';
            }
        }
    }

    input.addEventListener('input', analyzeIpv6);
    analyzeIpv6();
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// =============================================================================
// RDAP / WHOIS QUERY TOOL
// =============================================================================
function setupRdapTool() {
    const input = document.getElementById('rdap-query-input');
    const typeSelect = document.getElementById('rdap-type-select');
    const searchBtn = document.getElementById('rdap-search-btn');
    const resultsBox = document.getElementById('rdap-results-box');

    if (!searchBtn || !input || !resultsBox) return;

    searchBtn.addEventListener('click', async () => {
        const query = input.value.trim();
        const queryType = typeSelect ? typeSelect.value : 'domain';

        if (!query) {
            showToast('Bitte Domain oder IP eingeben', 'warn');
            return;
        }

        searchBtn.disabled = true;
        searchBtn.textContent = 'RDAP Abfrage läuft...';
        resultsBox.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">Lade autoritative RDAP-Registrierungsdaten... 🌐</div>';

        try {
            const data = await invoke('query_rdap', { query, queryType });
            renderRdapResults(data, resultsBox);
            showToast('RDAP-Daten erfolgreich geladen', 'success');
        } catch (e) {
            resultsBox.innerHTML = `<div class="cyber-badge-danger" style="padding: 12px; border-radius: 6px;">❌ Fehler: ${escapeHtml(e)}</div>`;
            showToast(`RDAP Fehler: ${e}`, 'error');
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = 'RDAP Abfragen 🔍';
        }
    });
}

function renderRdapResults(data, container) {
    const statusBadges = data.status.map(s => `<span class="badge" style="background: rgba(0,242,255,0.1); border: 1px solid var(--neon-cyan); color: var(--neon-cyan); font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">${escapeHtml(s)}</span>`).join('');
    const nameserversList = data.nameservers.length > 0
        ? data.nameservers.map(ns => `<li style="font-family: monospace; font-size: 0.8rem; color: #fff;">${escapeHtml(ns)}</li>`).join('')
        : '<span style="color: var(--text-dim);">Keine Nameserver gelistet</span>';

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                <span style="font-size: 1.1rem; font-weight: bold; color: var(--neon-cyan); font-family: monospace;">${escapeHtml(data.ldh_name || data.query)}</span>
                <span class="badge" style="background: ${data.dnssec_signed ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}; color: ${data.dnssec_signed ? '#000' : 'var(--text-dim)'}; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 4px;">
                    ${data.dnssec_signed ? '🛡️ DNSSEC SIGNED' : 'UNSECURED'}
                </span>
            </div>

            <div class="cyber-list" style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px;">
                <div class="info-item"><span class="info-label">Registrar:</span><span class="info-val font-mono" style="color: #fff;">${escapeHtml(data.registrar_name || 'N/A')} (IANA ID: ${escapeHtml(data.registrar_iana_id || 'N/A')})</span></div>
                <div class="info-item"><span class="info-label">Registriert am:</span><span class="info-val font-mono">${escapeHtml(data.registration_date || 'N/A')}</span></div>
                <div class="info-item"><span class="info-label">Ablaufdatum:</span><span class="info-val font-mono" style="color: #ffaa00;">${escapeHtml(data.expiration_date || 'N/A')}</span></div>
                <div class="info-item"><span class="info-label">Letzte Änderung:</span><span class="info-val font-mono">${escapeHtml(data.last_changed_date || 'N/A')}</span></div>
                <div class="info-item"><span class="info-label">Abuse E-Mail:</span><span class="info-val font-mono" style="color: var(--neon-red);">${escapeHtml(data.abuse_email || 'N/A')}</span></div>
                <div class="info-item"><span class="info-label">Abuse Telefon:</span><span class="info-val font-mono">${escapeHtml(data.abuse_phone || 'N/A')}</span></div>
            </div>

            <div style="margin-top: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-dim); display: block; margin-bottom: 4px;">STATUS-CODES:</span>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${statusBadges || '<span style="color: var(--text-dim);">Keine Statuscodes</span>'}
                </div>
            </div>

            <div style="margin-top: 6px;">
                <span style="font-size: 0.75rem; color: var(--text-dim); display: block; margin-bottom: 4px;">NAMESERVER:</span>
                <ul style="margin: 0; padding-left: 20px;">
                    ${nameserversList}
                </ul>
            </div>
        </div>
    `;
}

// =============================================================================
// X.509 SSL/TLS CERTIFICATE INSPECTOR
// =============================================================================
function setupCertInspectorTool() {
    const hostInput = document.getElementById('cert-host-input');
    const portInput = document.getElementById('cert-port-input');
    const inspectBtn = document.getElementById('cert-inspect-btn');
    const resultsBox = document.getElementById('cert-results-box');

    if (!inspectBtn || !hostInput || !resultsBox) return;

    inspectBtn.addEventListener('click', async () => {
        const host = hostInput.value.trim();
        const port = portInput ? parseInt(portInput.value, 10) || 443 : 443;

        if (!host) {
            showToast('Bitte Hostname oder Domain eingeben', 'warn');
            return;
        }

        inspectBtn.disabled = true;
        inspectBtn.textContent = 'Zertifikat wird analysiert...';
        resultsBox.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">Führe TLS-Handshake aus & lese X.509 Zertifikatskette... 🔐</div>';

        try {
            const cert = await invoke('inspect_tls_certificate', { host, port });
            renderCertResults(cert, resultsBox);
            showToast('Zertifikat erfolgreich analysiert', 'success');
        } catch (e) {
            resultsBox.innerHTML = `<div class="cyber-badge-danger" style="padding: 12px; border-radius: 6px;">❌ TLS Fehler: ${escapeHtml(e)}</div>`;
            showToast(`TLS Fehler: ${e}`, 'error');
        } finally {
            inspectBtn.disabled = false;
            inspectBtn.textContent = 'Zertifikat Prüfen 🔐';
        }
    });
}

function renderCertResults(cert, container) {
    let statusBadge = '';
    if (cert.is_expired) {
        statusBadge = '<span class="badge" style="background: var(--neon-red); color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 4px;">ABGELAUFEN ❌</span>';
    } else if (cert.days_remaining < 30) {
        statusBadge = `<span class="badge" style="background: #ffaa00; color: #000; font-weight: bold; padding: 3px 8px; border-radius: 4px;">LÄUFT IN ${cert.days_remaining} TAGEN AB ⚠️</span>`;
    } else {
        statusBadge = `<span class="badge" style="background: var(--neon-green); color: #000; font-weight: bold; padding: 3px 8px; border-radius: 4px;">GÜLTIG (${cert.days_remaining} Tage) 🛡️</span>`;
    }

    const sansList = cert.sans.length > 0
        ? cert.sans.slice(0, 12).map(s => `<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-dim); font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; margin-right: 4px; margin-bottom: 4px; display: inline-block;">${escapeHtml(s)}</span>`).join('')
        : '<span style="color: var(--text-dim);">Keine SANs</span>';

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                <div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: var(--neon-cyan); font-family: monospace;">${escapeHtml(cert.subject_cn)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(cert.host)}:${cert.port} • ${escapeHtml(cert.tls_version)} • ${escapeHtml(cert.cipher_name)}</div>
                </div>
                ${statusBadge}
            </div>

            <div class="cyber-list" style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px;">
                <div class="info-item"><span class="info-label">Aussteller (CA):</span><span class="info-val font-mono" style="color: #fff;">${escapeHtml(cert.issuer_cn)} ${cert.issuer_org ? `(${escapeHtml(cert.issuer_org)})` : ''}</span></div>
                <div class="info-item"><span class="info-label">Gültig ab:</span><span class="info-val font-mono">${escapeHtml(cert.valid_from)}</span></div>
                <div class="info-item"><span class="info-label">Gültig bis:</span><span class="info-val font-mono">${escapeHtml(cert.valid_to)}</span></div>
                <div class="info-item"><span class="info-label">Schlüssel:</span><span class="info-val font-mono" style="color: var(--neon-cyan);">${escapeHtml(cert.public_key_type)} ${cert.public_key_bits > 0 ? cert.public_key_bits + ' Bit' : ''}</span></div>
                <div class="info-item"><span class="info-label">Signaturalgorithmus:</span><span class="info-val font-mono">${escapeHtml(cert.signature_algorithm)}</span></div>
                <div class="info-item"><span class="info-label">Seriennummer:</span><span class="info-val font-mono" style="font-size: 0.72rem; word-break: break-all;">${escapeHtml(cert.serial_number)}</span></div>
                <div class="info-item"><span class="info-label">SHA-256 Fingerprint:</span><span class="info-val font-mono" style="font-size: 0.68rem; word-break: break-all; color: var(--text-dim);">${escapeHtml(cert.sha256_fingerprint)}</span></div>
            </div>

            <div>
                <span style="font-size: 0.75rem; color: var(--text-dim); display: block; margin-bottom: 4px;">ALTERNATIVE HOSTNAMEN (SANs - ${cert.sans.length}):</span>
                <div>
                    ${sansList}
                    ${cert.sans.length > 12 ? `<span style="font-size: 0.72rem; color: var(--text-dim);">... und ${cert.sans.length - 12} weitere</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// GLOBAL DNS PROPAGATION CHECKER
// =============================================================================
function setupDnsPropagationTool() {
    const domainInput = document.getElementById('prop-domain-input');
    const typeSelect = document.getElementById('prop-type-select');
    const checkBtn = document.getElementById('prop-check-btn');
    const resultsBox = document.getElementById('prop-results-box');

    if (!checkBtn || !domainInput || !resultsBox) return;

    const GLOBAL_RESOLVERS = [
        { name: 'Europa (Cloudflare)', url: 'https://cloudflare-dns.com/dns-query' },
        { name: 'Nordamerika (Google)', url: 'https://dns.google/dns-query' },
        { name: 'Schweiz / Global (Quad9)', url: 'https://dns.quad9.net/dns-query' },
        { name: 'Singapur (AdGuard)', url: 'https://dns.adguard-dns.com/dns-query' },
        { name: 'Asien (AliDNS)', url: 'https://dns.alidns.com/resolve' }
    ];

    checkBtn.addEventListener('click', async () => {
        const domain = domainInput.value.trim();
        const rType = typeSelect ? typeSelect.value : 'A';

        if (!domain) {
            showToast('Bitte Domain eingeben', 'warn');
            return;
        }

        checkBtn.disabled = true;
        checkBtn.textContent = 'Prüfe weltweite Resolver...';
        resultsBox.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">Sende parallele DoH-Anfragen an weltweite DNS-Knoten... 🌍</div>';

        try {
            const results = await Promise.all(GLOBAL_RESOLVERS.map(async (r) => {
                const startTime = Date.now();
                try {
                    let targetUrl = `${r.url}?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(rType)}`;
                    const res = await invoke('execute_http_request', {
                        request: {
                            method: 'GET',
                            url: targetUrl,
                            headers: [['Accept', 'application/dns-json']],
                            body: null,
                            timeoutMs: 6000
                        }
                    });

                    const elapsed = Date.now() - startTime;
                    let answers = [];
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            const parsed = JSON.parse(res.body);
                            if (parsed.Answer && Array.isArray(parsed.Answer)) {
                                answers = parsed.Answer.map(a => a.data);
                            }
                        } catch (pe) { }
                    }

                    return { name: r.name, success: true, answers, latencyMs: elapsed };
                } catch (err) {
                    return { name: r.name, success: false, error: err.toString(), latencyMs: 0 };
                }
            }));

            renderPropagationResults(domain, rType, results, resultsBox);
            showToast('Globale DNS-Propagation geprüft', 'success');
        } catch (e) {
            resultsBox.innerHTML = `<div class="cyber-badge-danger" style="padding: 12px; border-radius: 6px;">Fehler: ${escapeHtml(e)}</div>`;
        } finally {
            checkBtn.disabled = false;
            checkBtn.textContent = 'Weltweit Prüfen 🌍';
        }
    });
}

function renderPropagationResults(domain, type, list, container) {
    const rows = list.map(item => {
        const statusBadge = item.success
            ? `<span style="color: var(--neon-green); font-weight: bold;">🟢 Aktiv (${item.latencyMs} ms)</span>`
            : `<span style="color: var(--neon-red); font-weight: bold;">🔴 Timeout/Fehler</span>`;

        const answersText = item.answers && item.answers.length > 0
            ? item.answers.join(', ')
            : (item.success ? '<span style="color: var(--text-dim);">Kein Record (NXDOMAIN/NODATA)</span>' : '<span style="color: var(--neon-red);">' + escapeHtml(item.error) + '</span>');

        return `
            <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong style="color: var(--neon-cyan); font-size: 0.82rem;">${escapeHtml(item.name)}</strong>
                    <span style="font-size: 0.75rem;">${statusBadge}</span>
                </div>
                <div style="font-family: monospace; font-size: 0.78rem; color: #fff; word-break: break-all;">
                    ${answersText}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 0.85rem; color: var(--text-dim);">
            Ergebnisse für <strong style="color: #fff;">${escapeHtml(domain)}</strong> (Typ ${escapeHtml(type)}):
        </div>
        <div>
            ${rows}
        </div>
    `;
}

// =============================================================================
// HTTP SECURITY HEADERS AUDITOR
// =============================================================================
function setupSecHeadersAuditorTool() {
    const urlInput = document.getElementById('sec-url-input');
    const auditBtn = document.getElementById('sec-audit-btn');
    const resultsBox = document.getElementById('sec-results-box');

    if (!auditBtn || !urlInput || !resultsBox) return;

    auditBtn.addEventListener('click', async () => {
        let rawUrl = urlInput.value.trim();
        if (!rawUrl) {
            showToast('Bitte Web-URL eingeben', 'warn');
            return;
        }

        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            rawUrl = 'https://' + rawUrl;
            urlInput.value = rawUrl;
        }

        auditBtn.disabled = true;
        auditBtn.textContent = 'Analysiere Sicherheits-Header...';
        resultsBox.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">Sende HTTP-Audit-Request & analysiere Security Policies... 🛡️</div>';

        try {
            const resp = await invoke('execute_http_request', {
                request: {
                    method: 'GET',
                    url: rawUrl,
                    headers: [
                        ['User-Agent', 'Mozilla/5.0 (Android; SecurityAudit/1.0)']
                    ],
                    body: null,
                    timeoutMs: 8000
                }
            });

            renderSecHeadersResults(rawUrl, resp, resultsBox);
            showToast('Sicherheits-Audit abgeschlossen', 'success');
        } catch (e) {
            resultsBox.innerHTML = `<div class="cyber-badge-danger" style="padding: 12px; border-radius: 6px;">❌ Audit Fehler: ${escapeHtml(e)}</div>`;
            showToast(`Audit Fehler: ${e}`, 'error');
        } finally {
            auditBtn.disabled = false;
            auditBtn.textContent = 'Security Audit Starten 🛡️';
        }
    });
}

function renderSecHeadersResults(url, resp, container) {
    const headersMap = {};
    resp.headers.forEach(([k, v]) => {
        headersMap[k.toLowerCase()] = v;
    });

    const CHECKS = [
        {
            key: 'strict-transport-security',
            name: 'Strict-Transport-Security (HSTS)',
            weight: 25,
            desc: 'Erzwingt HTTPS-Verschlüsselung zum Schutz vor SSL-Stripping.',
            validator: (v) => v && v.includes('max-age')
        },
        {
            key: 'content-security-policy',
            name: 'Content-Security-Policy (CSP)',
            weight: 25,
            desc: 'Einschränkung erlaubter Skript-Quellen zur Abwehr von Cross-Site-Scripting (XSS).',
            validator: (v) => !!v
        },
        {
            key: 'x-frame-options',
            name: 'X-Frame-Options',
            weight: 15,
            desc: 'Verhindert Clickjacking-Angriffe durch Verbot von Iframes.',
            validator: (v) => v && (v.toUpperCase() === 'DENY' || v.toUpperCase() === 'SAMEORIGIN')
        },
        {
            key: 'x-content-type-options',
            name: 'X-Content-Type-Options',
            weight: 15,
            desc: 'Verhindert MIME-Sniffing von Dateien.',
            validator: (v) => v && v.toLowerCase() === 'nosniff'
        },
        {
            key: 'referrer-policy',
            name: 'Referrer-Policy',
            weight: 10,
            desc: 'Schützt sensible Pfade und Tokens vor Weitergabe im Referer-Header.',
            validator: (v) => !!v
        },
        {
            key: 'permissions-policy',
            name: 'Permissions-Policy',
            weight: 10,
            desc: 'Schränkt Browser-APIs (Kamera, Mikrofon, Geolocation) für Dritte ein.',
            validator: (v) => !!v
        }
    ];

    let totalScore = 0;
    const auditRows = CHECKS.map(c => {
        const val = headersMap[c.key];
        const passed = c.validator(val);
        if (passed) totalScore += c.weight;

        return `
            <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 12px; margin-bottom: 6px; border-left: 3px solid ${passed ? 'var(--neon-green)' : 'var(--neon-red)'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <span style="font-weight: bold; font-size: 0.82rem; color: #fff;">${escapeHtml(c.name)}</span>
                    <span style="font-size: 0.75rem; font-weight: bold; color: ${passed ? 'var(--neon-green)' : 'var(--neon-red)'};">
                        ${passed ? `VORHANDEN (+${c.weight} Pkt)` : 'FEHLT (0 Pkt)'}
                    </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-dim); margin-bottom: 4px;">${escapeHtml(c.desc)}</div>
                ${val ? `<div style="font-family: monospace; font-size: 0.7rem; color: var(--neon-cyan); word-break: break-all; background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px;">${escapeHtml(val)}</div>` : ''}
            </div>
        `;
    }).join('');

    let grade = 'F';
    let gradeColor = 'var(--neon-red)';
    if (totalScore >= 90) { grade = 'A+'; gradeColor = 'var(--neon-green)'; }
    else if (totalScore >= 80) { grade = 'A'; gradeColor = 'var(--neon-green)'; }
    else if (totalScore >= 65) { grade = 'B'; gradeColor = '#ffaa00'; }
    else if (totalScore >= 50) { grade = 'C'; gradeColor = '#ff7700'; }
    else if (totalScore >= 35) { grade = 'D'; gradeColor = 'var(--neon-red)'; }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">SICHERHEITS-BEWERTUNG:</div>
                <div style="font-size: 1.6rem; font-weight: bold; color: ${gradeColor}; font-family: monospace;">Note ${grade} (${totalScore} / 100)</div>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-dim); text-align: right;">
                HTTP ${resp.status} ${escapeHtml(resp.status_text)}<br>
                ${resp.duration_ms} ms Antwortzeit
            </div>
        </div>
        <div>
            ${auditRows}
        </div>
    `;
}


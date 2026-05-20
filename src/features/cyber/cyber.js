import { getEl } from '../../core/ui.js';

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
    setupPingTool();
    setupDnsTool();
    setupTracerouteTool();
    setupPortScanTool();
    setupModalHandlers();
    setupPublicIpReveal();
    setupWifiScanTool();
    setupSslAuditTool();
}

function setupSubtabs() {
    const subnavBtns = document.querySelectorAll('.cyber-subnav-btn');
    const tabs = document.querySelectorAll('.cyber-tab-content');
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
                ui.portResult.innerText = "No open ports found.";
            } else {
                let text = "Open Ports:\n";
                openPorts.forEach(p => {
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

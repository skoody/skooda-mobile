// UI Elements
const getEl = (id) => document.getElementById(id);



// --- PERFORMANCE CACHE & DIFFING ---
const UI = {};
function getCached(id) {
    if (UI[id] === undefined) UI[id] = document.getElementById(id);
    return UI[id];
}
function setText(id, text) {
    const el = getCached(id);
    if (el && el.innerText !== String(text)) el.innerText = text;
}
function setWidth(id, pct) {
    const el = getCached(id);
    if (el) {
        const val = pct + '%';
        if (el.style.width !== val) el.style.width = val;
    }
}
function setBg(id, color) {
    const el = getCached(id);
    if (el && el.style.background !== color) el.style.background = color;
}
function setHTML(id, html) {
    const el = getCached(id);
    if (el && el.innerHTML !== html) el.innerHTML = html;
}
function setPos(id, x, y) {
    const el = getCached(id);
    if (el) {
        const left = x + '%';
        const top = y + '%';
        if (el.style.left !== left) el.style.left = left;
        if (el.style.top !== top) el.style.top = top;
    }
}

// Global Update Hook (called from Kotlin)
window.__skoodaUpdate = (stats) => {
  if (!stats) return;
  try {
    // Static Device Info
    if (stats.android_ver) setText('dev-android', stats.android_ver);
    if (stats.api_level) setText('dev-android', `Android ${stats.android_ver} (API ${stats.api_level})`);
    if (stats.resolution) setText('dev-res', stats.resolution);
    if (stats.refresh_rate) setText('dev-hz', `${stats.refresh_rate} Hz`);
    if (stats.bluetooth_ver) setText('dev-bt', stats.bluetooth_ver);
    if (stats.refresh_rate) setText('dev-hz', `${stats.refresh_rate} Hz`);
    if (stats.model) setText('dev-model', `${stats.manufacturer} ${stats.model}`);
    if (stats.cpu_model) setText('dev-hw', stats.cpu_model);

    // Battery
    if (stats.battery_percent !== undefined) {
      const pct = Math.round(stats.battery_percent);
      setText('battery-pct', pct);
      setWidth('battery-progress', pct);
      setText('battery-status', stats.battery_status || 'Active');
      setText('battery-volts', (stats.battery_voltage || 0).toFixed(1));
      if (stats.battery_current !== undefined) targetMA = stats.battery_current;
      if (stats.battery_health) setText('battery-health', "Health: " + stats.battery_health);
    }

    // CPU
    if (stats.cpu_usage !== undefined) {
      const cpu = Math.round(stats.cpu_usage);
      setText('cpu-usage', cpu);
      setWidth('cpu-progress', cpu);
      if (stats.temperature !== undefined) setText('cpu-temp', Math.round(stats.temperature));
    }

    // CPU Cores + Heatmap
    if (stats.cpu_cores) {
      const coresContainer = getCached('cpu-cores-container');
      if (coresContainer) {
        if (coresContainer.children.length === 0) {
          setHTML('cpu-cores-container', stats.cpu_cores.map((_, i) => `
                    <div class="core-item">
                        <div id="core-bar-${i}" class="core-bar"></div>
                        <span class="core-label">C${i}</span>
                    </div>
                `).join(''));
        }
        stats.cpu_cores.forEach((pct, i) => {
          const rounded = Math.round(pct);
          setWidth(`core-bar-${i}`, rounded);
          let color = 'var(--neon-cyan)';
          if (rounded >= 30 && rounded < 70) color = 'var(--neon-purple)';
          else if (rounded >= 70) color = '#ff4d00';
          setBg(`core-bar-${i}`, color);
        });
      }
    }

    // Sensors
    if (stats.sensors) {
      // 3D Crosshair
      const moveX = Math.max(-50, Math.min(50, stats.sensors.roll));
      const moveY = Math.max(-50, Math.min(50, stats.sensors.pitch));
      setPos('crosshair', 50 + moveX, 50 + moveY);

      // Proximity
      const isNear = stats.sensors.prox < 1.0;
      setText('prox-val', isNear ? "NEAR" : "FAR");
      const pVal = getCached('prox-val');
      if (pVal && pVal.style.color !== (isNear ? "var(--neon-purple)" : "var(--text-dim)")) {
          pVal.style.color = isNear ? "var(--neon-purple)" : "var(--text-dim)";
      }
      setText('prox-alert', isNear ? "⚠️ PROXIMITY ALERT" : "");

      // Bars & Peak Hold
      updatePeakBar('sensor-ax', Math.abs(stats.sensors.ax) * 10);
      updatePeakBar('sensor-gx', Math.abs(stats.sensors.gx) * 50);
      updatePeakBar('sensor-g', stats.sensors.gforce * 30);
      updatePeakBar('sensor-mag', (stats.sensors.mag_strength / 100) * 100);
      
      setText('gforce-val', stats.sensors.gforce.toFixed(2));
      setText('mag-val', Math.round(stats.sensors.mag_strength));
      
      // Update Map Heading
      updateMapHeading(stats.sensors);
    }

    // Network Identity
    if (stats.wifi_ssid) setText('wifi-ssid', stats.wifi_ssid);
    if (stats.local_ip) setText('local-ip', stats.local_ip);
    if (stats.public_ip) setText('public-ip', stats.public_ip);
    if (stats.wifi_rssi !== undefined) setText('wifi-rssi', stats.wifi_rssi + " dBm");

    // RAM
    if (stats.ram_used !== undefined && stats.ram_total !== undefined) {
      const usedGB = (stats.ram_used / (1024 * 1024 * 1024)).toFixed(1);
      const totalGB = (stats.ram_total / (1024 * 1024 * 1024)).toFixed(1);
      const pct = Math.round((stats.ram_used / stats.ram_total) * 100);
      setText('ram-pct', pct);
      setText('ram-used', usedGB);
      setText('ram-total', totalGB);
      setWidth('ram-progress', pct);
    }

    // Storage
    if (stats.storage_used !== undefined && stats.storage_total !== undefined) {
      const freeGB = ((stats.storage_total - stats.storage_used) / (1024 * 1024 * 1024)).toFixed(1);
      const pct = Math.round((stats.storage_used / stats.storage_total) * 100);
      setText('storage-pct', pct);
      setText('storage-free', freeGB);
      setWidth('storage-progress', pct);
    }

    // Network
    if (stats.net_down !== undefined && stats.net_up !== undefined) {
      const down = stats.net_down / 1024;
      const up = stats.net_up / 1024;
      setText('net-down', down < 1000 ? down.toFixed(1) : (down / 1024).toFixed(2) + "M");
      setText('net-up', up < 1000 ? up.toFixed(1) : (up / 1024).toFixed(2) + "M");
    }

    // Uptime
    if (stats.uptime !== undefined) {
      const h = Math.floor(stats.uptime / 3600);
      const m = Math.floor((stats.uptime % 3600) / 60);
      const s = Math.floor(stats.uptime % 60);
      setText('uptime-val', `${h}h ${m}m ${s}s`);
    }
  } catch (e) {
    console.error("UI Update Error", e);
  }
};

// --- CYBER TOOLS ---
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
                <div class="info-item device-item" onclick="openDeviceModal('${dev.ip}', '${name}', '${portsStr}')">
                    <div style="display:flex; flex-direction:column">
                        <span class="info-value" style="font-size:0.9rem">${name}</span>
                        <span class="info-label">${dev.ip}</span>
                    </div>
                    <div>${portsHtml}</div>
                </div>
            `;
    }).join('');
  }
};

// Privacy Reveal Logic
const pIpEl = getEl('public-ip');
if (pIpEl) {
  pIpEl.addEventListener('click', () => {
    pIpEl.classList.add('revealed');
    setTimeout(() => {
      pIpEl.classList.remove('revealed');
    }, 5000);
  });
}

// Smooth mA Interpolation
let targetMA = 0;
let currentMA = 0;
function updateSmoothMA() {
  const diff = targetMA - currentMA;
  if (Math.abs(diff) > 0.1) {
    currentMA += diff * 0.15; // Smooth transition factor
    const el = getEl('battery-current');
    if (el) el.innerText = Math.round(currentMA);
  }
  requestAnimationFrame(updateSmoothMA);
}
updateSmoothMA();

// Peak Hold System
const peaks = {};
function updatePeakBar(id, val) {
  const bar = getEl(id);
  if (!bar) return;
  const pct = Math.min(100, Math.max(0, val));
  bar.style.width = pct + '%';

  if (!peaks[id] || pct > peaks[id].val) {
    peaks[id] = { val: pct, time: Date.now() };
  } else if (Date.now() - peaks[id].time > 2000) {
    peaks[id].val = pct;
    peaks[id].time = Date.now();
  }

  const peakId = id.replace('sensor', 'peak');
  const peakEl = getEl(peakId);
  if (peakEl) {
    peakEl.style.left = peaks[id].val + '%';
    if (pct < 1 && peaks[id].val < 1) peakEl.style.display = 'none';
    else peakEl.style.display = 'block';
  }
}

// Modal Logic
const deviceModal = getEl('device-modal');
const modalName = getEl('modal-device-name');
const modalIp = getEl('modal-device-ip');
const actionCopy = getEl('action-copy');
const actionPing = getEl('action-ping');
const actionBrowser = getEl('action-browser');
const actionClose = getEl('action-close');

let currentModalIp = "";

window.openDeviceModal = (ip, name, portsStr) => {
  currentModalIp = ip;
  modalName.innerText = name;
  modalIp.innerText = ip;

  const ports = portsStr ? portsStr.split(',').map(p => parseInt(p)) : [];
  actionBrowser.style.display = (ports.includes(80) || ports.includes(443)) ? 'flex' : 'none';

  deviceModal.classList.add('active');
};

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
  // Switch to Cyber tab if not there
  const cyberId = 'cyber-toolset';
  subToolContainers.forEach(c => c.style.display = 'none');
  getEl(cyberId).style.display = 'block';
  getEl('tool-categories').style.display = 'none';

  const pingH = getEl('ping-host');
  if (pingH) {
    pingH.value = currentModalIp;
    getEl('start-ping').click();
  }
});

actionBrowser.addEventListener('click', () => {
  if (window.Android && window.Android.openExternalUrl) {
    window.Android.openExternalUrl(`http://${currentModalIp}`);
  } else {
    window.open(`http://${currentModalIp}`, '_blank');
  }
});

// Close modal on background click
deviceModal.addEventListener('click', (e) => {
  if (e.target === deviceModal) deviceModal.classList.remove('active');
});

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

// --- TAB SYSTEM & CATEGORIES ---
const toolCategories = document.getElementById('tool-categories');
const subToolContainers = document.querySelectorAll('.sub-tool-container');

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(target).classList.add('active');
    if (target === 'tools-tab') showCategories();
  });
});

document.querySelectorAll('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    const subId = card.getAttribute('data-sub');
    if (toolCategories) toolCategories.style.display = 'none';
    const target = document.getElementById(subId);
    if (target) target.style.display = 'block';
    
    // Start Map if selected
    if (subId === 'map-toolset') {
        setTimeout(initMap, 100);
    }
  });
});

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showCategories();
  });
});

function showCategories() {
  if (toolCategories) toolCategories.style.display = 'grid';
  subToolContainers.forEach(c => c.style.display = 'none');
  if (typeof stopESP === 'function') stopESP();
  if (window.html5QrCode) stopScanner();
}

// --- QR GENERATOR ---
const qrInput = document.getElementById('qr-input');
const qrResult = document.getElementById('qr-code-result');
const qrClear = document.getElementById('qr-clear');
const qrDownload = document.getElementById('qr-download');

if (qrInput) {
  qrInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (!val) {
      qrResult.innerHTML = '';
      qrDownload.style.display = 'none';
      return;
    }
    qrResult.innerHTML = '';
    new QRCode(qrResult, {
      text: val,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    qrDownload.style.display = 'block';
  });
}

if (qrClear) {
  qrClear.addEventListener('click', () => {
    qrInput.value = '';
    qrResult.innerHTML = '';
    qrDownload.style.display = 'none';
  });
}

if (qrDownload) {
  qrDownload.addEventListener('click', () => {
    const canvas = qrResult.querySelector('canvas');
    const img = qrResult.querySelector('img');
    let dataUrl = "";
    if (canvas) dataUrl = canvas.toDataURL("image/png");
    else if (img && img.src) dataUrl = img.src;
    if (dataUrl && window.Android) {
      const timestamp = Math.floor(Date.now() / 1000);
      window.Android.saveImage(dataUrl, `skooda-qr-${timestamp}.png`);
    }
  });
}

// --- QR SCANNER ---
const scanResult = document.getElementById('scan-result');
const startBtn = document.getElementById('start-scan');
const scannerActions = document.getElementById('scanner-actions');
const qrCopy = document.getElementById('qr-copy');
const qrOpen = document.getElementById('qr-open');
const qrTorch = document.getElementById('qr-torch');
const readerContainer = document.getElementById('reader-container');
window.html5QrCode = null;
let lastResult = "";
let torchActive = false;

if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (!window.html5QrCode) window.html5QrCode = new Html5Qrcode("reader");
    if (startBtn.innerText === "Stop Scanner") {
      stopScanner();
      return;
    }
    const boxSize = Math.min(250, window.innerWidth * 0.7);
    const config = { 
      fps: 20, 
      qrbox: { width: boxSize, height: boxSize }, 
      aspectRatio: 1.777778,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ]
    };
    if (scannerActions) scannerActions.style.display = 'none';
    if (readerContainer) readerContainer.classList.add('active');
    if (scanResult) scanResult.innerText = "Initializing...";
    window.html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        if (decodedText === lastResult) return;
        lastResult = decodedText;
        const format = decodedResult.result.format.formatName;
        if (scanResult) scanResult.innerText = `[${format}] ${decodedText}`;
        if (window.navigator.vibrate) window.navigator.vibrate(100);
        if (scannerActions) scannerActions.style.display = 'flex';
        if (qrOpen) qrOpen.style.display = decodedText.startsWith('http') ? 'block' : 'none';
        stopScanner();
      },
      () => { }
    ).then(() => {
      startBtn.innerText = "Stop Scanner";
      if (scanResult) scanResult.innerText = "Scanning...";
      setTimeout(() => {
        const video = document.querySelector('#reader video');
        if (video && video.srcObject) {
          const track = video.srcObject.getVideoTracks()[0];
          const caps = track.getCapabilities();
          if (caps && caps.torch && qrTorch) qrTorch.style.display = 'block';
          
          const zoomControls = document.getElementById('zoom-controls');
          const zoomSlider = document.getElementById('camera-zoom');
          const zoomMax = document.getElementById('zoom-max');
          if (zoomControls && zoomSlider) {
            zoomControls.style.display = 'flex';
            if (caps && caps.zoom) {
              zoomSlider.min = caps.zoom.min || 1;
              zoomSlider.max = caps.zoom.max || 5;
              zoomSlider.step = caps.zoom.step || 0.1;
            } else {
              zoomSlider.min = 1;
              zoomSlider.max = 5;
              zoomSlider.step = 0.1;
            }
            zoomSlider.value = (track.getSettings && track.getSettings().zoom) ? track.getSettings().zoom : 1;
            if (zoomMax) zoomMax.innerText = `${zoomSlider.max}x`;
            
            zoomSlider.oninput = async (e) => {
              const val = parseFloat(e.target.value);
              try { await track.applyConstraints({ advanced: [{ zoom: val }] }); } catch(err){
                try { await track.applyConstraints({ zoom: val }); } catch(err2){}
              }
            };
          }
          try {
            if (caps && caps.focusMode && caps.focusMode.includes('continuous')) {
              track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            }
          } catch(e) {}
        }
      }, 500);
    }).catch(err => {
      if (scanResult) scanResult.innerText = "Error: " + err;
      if (readerContainer) readerContainer.classList.remove('active');
    });
  });
}

function stopScanner() {
  if (window.html5QrCode) {
    try {
      window.html5QrCode.stop().then(() => {
        window.html5QrCode.clear();
        if (startBtn) startBtn.innerText = "Start Scanner";
        if (readerContainer) readerContainer.classList.remove('active');
        if (qrTorch) qrTorch.style.display = 'none';
        const zc1 = document.getElementById('zoom-controls');
        if (zc1) zc1.style.display = 'none';
        torchActive = false;
      }).catch(() => {
        try { window.html5QrCode.clear(); } catch(e) {}
        if (startBtn) startBtn.innerText = "Start Scanner";
        if (readerContainer) readerContainer.classList.remove('active');
        if (qrTorch) qrTorch.style.display = 'none';
        const zc2 = document.getElementById('zoom-controls');
        if (zc2) zc2.style.display = 'none';
        torchActive = false;
      });
    } catch(e) {}
  }
}

if (qrTorch) {
  qrTorch.addEventListener('click', () => {
    const video = document.querySelector('#reader video');
    if (video && video.srcObject) {
      const track = video.srcObject.getVideoTracks()[0];
      torchActive = !torchActive;
      track.applyConstraints({ advanced: [{ torch: torchActive }] });
      qrTorch.style.background = torchActive ? 'var(--accent-primary)' : 'rgba(0, 0, 0, 0.5)';
    }
  });
}

if (qrCopy) {
  qrCopy.addEventListener('click', () => {
    if (lastResult) {
      navigator.clipboard.writeText(lastResult).then(() => {
        const originalText = qrCopy.innerText;
        qrCopy.innerText = "Copied!";
        setTimeout(() => { qrCopy.innerText = originalText; }, 2000);
      });
    }
  });
}

if (qrOpen) {
  qrOpen.addEventListener('click', () => {
    if (window.Android && window.Android.openExternalUrl) {
      window.Android.openExternalUrl(lastResult);
    } else {
      window.open(lastResult, '_blank');
    }
  });
}
// --- Tactical Map Logic ---
let map = null;
let mapMarker = null;
let accuracyCircle = null;
let tacticalMarkers = [];
let smoothedHeading = 0;
let currentTiles = null;
let mapThemeMode = 0; // 0: Dark, 1: Light, 2: Satellite
let distanceLine = null;
let distanceLabel = null;
let isAutoCenter = true;
let isAutoRotate = false;

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  if (map) {
    setTimeout(() => { map.invalidateSize(); }, 200);
    return;
  }

  map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    fadeAnimation: true,
    zoomAnimation: true
  }).setView([51.505, -0.09], 13);

  // Tile Layer Manager
  const setTiles = (mode) => {
    if (currentTiles) map.removeLayer(currentTiles);
    
    let url = '';
    let filter = 'none';
    
    if (mode === 0) { // Dark
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      filter = 'brightness(1.6) contrast(1.1) saturate(1.1)';
    } else if (mode === 1) { // Light
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    } else { // Satellite
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    currentTiles = L.tileLayer(url, { maxZoom: 20 }).addTo(map);
    const pane = document.querySelector('.leaflet-tile-pane');
    if (pane) pane.style.filter = filter;
  };

  setTiles(mapThemeMode);
  loadMarkers(); // Load persisted markers

  // Fix rendering artifacts on zoom
  map.on('zoomend', () => {
    setTimeout(() => { map.invalidateSize(); }, 100);
  });

  // Player Marker with Heading Arrow
  const arrowIcon = L.divIcon({
    className: 'player-marker',
    html: `<div id="map-player-pointer" style="width: 20px; height: 20px; position: relative;">
            <div style="width: 100%; height: 100%; background: var(--neon-cyan); border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 10px var(--neon-cyan);"></div>
            <div id="map-direction" style="position: absolute; top: -10px; left: 5px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid #fff; transform-origin: 5px 20px;"></div>
           </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  mapMarker = L.marker([0, 0], { icon: arrowIcon }).addTo(map);
  accuracyCircle = L.circle([0, 0], { className: 'accuracy-circle', radius: 0 }).addTo(map);

  const coordsEl = document.getElementById('map-coords');
  const speedEl = document.getElementById('map-speed');
  const accEl = document.getElementById('map-acc');
  const altEl = document.getElementById('map-alt');

  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude, speed, accuracy, altitude } = pos.coords;
      const latlng = [latitude, longitude];
      
      if (mapMarker) mapMarker.setLatLng(latlng);
      if (accuracyCircle) {
          accuracyCircle.setLatLng(latlng);
          accuracyCircle.setRadius(accuracy);
      }
      
      if (map && isAutoCenter) {
          map.panTo(latlng, { animate: true, duration: 0.5 });
      }

      const kmh = speed ? (speed * 3.6).toFixed(1) : "0.0";
      if (coordsEl) coordsEl.innerText = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      if (speedEl) speedEl.innerText = `SPD: ${kmh} km/h`;
      if (altEl) altEl.innerText = `ALT: ${altitude ? Math.round(altitude) : 0} m`;
      if (accEl) accEl.innerText = `ACC: ${Math.round(accuracy)} m`;
    }, (err) => {
      if (coordsEl) coordsEl.innerText = "GPS Error: " + err.code;
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  // Tactical Marker System
  map.on('click', (e) => {
    addTacticalMarker(e.latlng.lat, e.latlng.lng, true);
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  });

  const fullscreenBtn = document.getElementById('fullscreen-map');
  const mapContainer = document.getElementById('map-container');
  const mapPlaceholder = document.createElement('div');
  if (fullscreenBtn && mapContainer) {
    fullscreenBtn.onclick = () => {
      const isFullscreen = mapContainer.classList.contains('map-fullscreen');
      if (!isFullscreen) {
        mapContainer.parentNode.insertBefore(mapPlaceholder, mapContainer);
        document.body.appendChild(mapContainer);
        mapContainer.classList.add('map-fullscreen');
        fullscreenBtn.innerText = '✖';
      } else {
        mapPlaceholder.parentNode.replaceChild(mapContainer, mapPlaceholder);
        mapContainer.classList.remove('map-fullscreen');
        fullscreenBtn.innerText = '⛶';
      }
      setTimeout(() => { if (map) map.invalidateSize(true); }, 50);
      setTimeout(() => { if (map) map.invalidateSize(true); }, 350);
    };
  }

  const clearRouteBtn = document.getElementById('clear-route');
  if (clearRouteBtn) {
    clearRouteBtn.onclick = () => {
      tacticalMarkers.forEach(m => map.removeLayer(m));
      tacticalMarkers = [];
      if (distanceLine) map.removeLayer(distanceLine);
      if (distanceLabel) map.removeLayer(distanceLabel);
      distanceLine = null;
      distanceLabel = null;
      localStorage.removeItem('skooda_markers');
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    };
  }

  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

  // Manual Interaction Detection
  map.on('movestart', () => { isAutoCenter = false; });

  const centerBtn = document.getElementById('center-map');
  if (centerBtn) {
    centerBtn.onclick = () => {
      isAutoCenter = true;
      if (map && mapMarker) {
        map.setView(mapMarker.getLatLng(), 16);
      }
    };
  }

  // Search Logic
  const searchInput = document.getElementById('map-search-input');
  if (searchInput) {
    searchInput.onkeydown = async (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            if (!query) return;
            isAutoCenter = false;
            try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                const data = await resp.json();
                if (data[0]) {
                    map.setView([data[0].lat, data[0].lon], 15);
                }
            } catch(err) {}
        }
    };
  }

  const themeBtn = document.getElementById('map-theme-toggle');
  if (themeBtn) themeBtn.remove(); // Remove old if exists
  
  const ThemeToggle = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function() {
      const btn = L.DomUtil.create('button', 'map-btn');
      btn.id = 'map-theme-toggle';
      btn.innerHTML = '🌓';
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        mapThemeMode = (mapThemeMode + 1) % 3;
        setTiles(mapThemeMode);
        const icons = ['🌑', '☀️', '🌍'];
        btn.innerHTML = icons[mapThemeMode];
      });
      return btn;
    }
  });

  const RotateToggle = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function() {
      const btn = L.DomUtil.create('button', 'map-btn');
      btn.id = 'map-rotate-toggle';
      btn.innerHTML = '🧭';
      btn.style.opacity = isAutoRotate ? '1' : '0.5';
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        isAutoRotate = !isAutoRotate;
        btn.style.opacity = isAutoRotate ? '1' : '0.5';
        if (!isAutoRotate) {
            const mapDiv = getCached('map');
            if (mapDiv) mapDiv.style.transform = 'rotate(0deg)';
        }
      });
      return btn;
    }
  });

  map.addControl(new ThemeToggle());
  map.addControl(new RotateToggle());
}

function addTacticalMarker(lat, lng, save = false) {
    const markerId = tacticalMarkers.length + 1;
    const icon = L.divIcon({
      className: 'tactical-marker',
      html: `<div class="marker-inner"></div><div class="marker-label">POI #${markerId}</div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
    
    const newMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
    tacticalMarkers.push(newMarker);

    if (save) saveMarkers();
    updateDistanceTool();
}

function updateDistanceTool() {
    if (tacticalMarkers.length < 2) {
        if (distanceLine) map.removeLayer(distanceLine);
        if (distanceLabel) map.removeLayer(distanceLabel);
        return;
    }
    
    const latlngs = tacticalMarkers.map(m => m.getLatLng());
    
    if (distanceLine) map.removeLayer(distanceLine);
    if (distanceLabel) map.removeLayer(distanceLabel);
    
    distanceLine = L.polyline(latlngs, { className: 'distance-line', color: 'var(--neon-cyan)', weight: 3, opacity: 0.8 }).addTo(map);
    
    let totalDist = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        totalDist += latlngs[i].distanceTo(latlngs[i+1]);
    }
    
    const distText = totalDist > 1000 ? (totalDist/1000).toFixed(2) + " km" : Math.round(totalDist) + " m";
    const lastM = latlngs[latlngs.length - 1];
    
    distanceLabel = L.marker([lastM.lat, lastM.lng], {
        icon: L.divIcon({
            className: 'distance-label',
            html: `<div style="background: rgba(0,0,0,0.8); color: var(--neon-cyan); padding: 2px 5px; border-radius: 4px; border: 1px solid var(--neon-cyan); margin-top: 15px; font-size: 0.7rem; white-space: nowrap;">Route: ${distText}</div>`,
            iconSize: [0, 0]
        })
    }).addTo(map);
}

function saveMarkers() {
    const data = tacticalMarkers.map(m => {
        const ll = m.getLatLng();
        return { lat: ll.lat, lng: ll.lng };
    });
    localStorage.setItem('skooda_markers', JSON.stringify(data));
}

function loadMarkers() {
    const saved = localStorage.getItem('skooda_markers');
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        data.forEach(m => addTacticalMarker(m.lat, m.lng, false));
    } catch(e) {}
}

// Update Heading with smoothing and Sensor Fusion
function updateMapHeading(sensors) {
    if (!sensors || sensors.mx === undefined) return;
    
    // Sensor Fusion: Pitch and Roll compensation for Magnetometer
    const ax = sensors.ax || 0;
    const ay = sensors.ay || 0;
    const az = sensors.az || 9.81;
    const mx = sensors.mx;
    const my = sensors.my;
    const mz = sensors.mz || 0;

    // Pitch & Roll
    const roll = Math.atan2(ay, az);
    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));

    // Tilt compensated magnetic field
    const cx = mx * Math.cos(pitch) + mz * Math.sin(pitch);
    const cy = mx * Math.sin(roll) * Math.sin(pitch) + my * Math.cos(roll) - mz * Math.sin(roll) * Math.cos(pitch);

    let rawHeading = Math.atan2(cy, cx) * (180 / Math.PI);
    
    // Normalize and smooth (Lerp)
    const diff = ((rawHeading - smoothedHeading + 180) % 360) - 180;
    smoothedHeading += diff * 0.15; 
    
    const mapDiv = getCached('map');
    if (mapDiv && isAutoRotate) {
        const transform = `rotate(${-smoothedHeading}deg)`;
        if (mapDiv.style.transform !== transform) {
            mapDiv.style.transform = transform;
        }
    }
}

// --- ESP KAMERA ---
window.espActive = false;
window.espModel = null;
window.espStream = null;
window.espReqId = null;
let detectionCanvas = document.createElement('canvas');
let dCtx = detectionCanvas.getContext('2d', { alpha: false });
detectionCanvas.width = 320;
detectionCanvas.height = 320;

const espVideo = document.getElementById('esp-video');
const espCanvas = document.getElementById('esp-canvas');
const espStatus = document.getElementById('esp-status');
const espSliders = document.getElementById('esp-sliders');
const toggleEspBtn = document.getElementById('toggle-esp-btn');
const filterPerson = document.getElementById('esp-filter-person');
const filterCar = document.getElementById('esp-filter-car');
const filterOther = document.getElementById('esp-filter-other');
const customFilter = document.getElementById('esp-custom-filter');
const captureBtn = document.getElementById('esp-capture-btn');

async function startESP() {
  if (window.espActive) { stopESP(); return; }
  window.espActive = true;
  if (toggleEspBtn) toggleEspBtn.innerText = 'Stoppe ESP';
  if (espSliders) espSliders.style.display = 'block';
  const reticle = getCached('esp-reticle');
  if (reticle) reticle.style.display = 'block';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }
    });
    window.espStream = stream;
    if (espVideo) {
      espVideo.srcObject = stream;
      await espVideo.play();
    }
  } catch(e) {
    if (espStatus) espStatus.innerText = 'Kamera Fehler: ' + e.message;
    window.espActive = false;
    if (toggleEspBtn) toggleEspBtn.innerText = 'Starte ESP';
    return;
  }

  if (espStatus) espStatus.innerText = 'Lade GPU KI...';
  try {
    if (!window.espModel) {
      const { ObjectDetector, FilesetResolver } = await import('./lib/mediapipe/vision_bundle.mjs');
      const vision = await FilesetResolver.forVisionTasks('./lib/mediapipe');
      window.espModel = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'models/mediapipe/detector.tflite',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        scoreThreshold: 0.5
      });
    }
    if (espStatus) espStatus.innerText = 'ESP AKTIV';
    
    if ('requestVideoFrameCallback' in espVideo) {
      espVideo.requestVideoFrameCallback(detectFrameCallback);
    } else {
      detectFrame();
    }
  } catch(e) {
    if (espStatus) espStatus.innerText = 'KI Fehler: ' + e.message;
    stopESP();
  }
}

function stopESP() {
  window.espActive = false;
  if (window.espReqId) cancelAnimationFrame(window.espReqId);
  if (window.espStream) {
    window.espStream.getTracks().forEach(t => t.stop());
    window.espStream = null;
  }
  if (espVideo) {
    espVideo.srcObject = null;
    if (espVideo.cancelVideoFrameCallback && window.vfcId) {
      espVideo.cancelVideoFrameCallback(window.vfcId);
    }
  }
  if (espCanvas) {
    const ctx = espCanvas.getContext('2d');
    ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  }
  if (toggleEspBtn) toggleEspBtn.innerText = 'Starte ESP';
  if (espStatus) espStatus.innerText = 'Offline';
  if (espSliders) espSliders.style.display = 'none';
  const reticle = getCached('esp-reticle');
  if (reticle) reticle.style.display = 'none';
}

function detectFrameCallback(now, metadata) {
  if (!window.espActive) return;
  detectLogic();
  window.vfcId = espVideo.requestVideoFrameCallback(detectFrameCallback);
}

function detectFrame() {
  if (!window.espActive) return;
  detectLogic();
  window.espReqId = requestAnimationFrame(detectFrame);
}

function detectLogic() {
  if (!espVideo || !window.espModel) return;

  if (espCanvas.width !== espVideo.clientWidth) {
    espCanvas.width = espVideo.clientWidth;
    espCanvas.height = espVideo.clientHeight;
  }

  // Optimize: Use small detection canvas to reduce AI processing time
  dCtx.drawImage(espVideo, 0, 0, 320, 320);
  const detections = window.espModel.detectForVideo(detectionCanvas, performance.now()).detections;
  drawDetections(detections);
}

function drawDetections(detections) {
  const ctx = espCanvas.getContext('2d');
  ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);

  // We detected on a 320x320 canvas, but we draw on the real canvas
  const scaleX = espCanvas.width / 320;
  const scaleY = espCanvas.height / 320;
  
  const espSens = document.getElementById('esp-sens');
  const threshold = espSens ? parseFloat(espSens.value) : 0.5;
  
  const animals = ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'];
  const cars = ['car', 'truck', 'bus', 'motorcycle'];
  const customQuery = customFilter?.value.toLowerCase().trim();

  detections.forEach(det => {
    if (det.categories[0].score < threshold) return;
    
    const label = det.categories[0].categoryName;
    const isPerson = label === 'person';
    const isAirplane = label === 'airplane';
    const isAnimal = animals.includes(label);
    const isCar = cars.includes(label);
    const isCustom = customQuery && label.includes(customQuery);

    let show = false;
    if (filterPerson?.checked && isPerson) show = true;
    if (filterCar?.checked && isCar) show = true;
    if (isAirplane || isAnimal) show = true; 
    if (filterOther?.checked && !isPerson && !isCar && !isAirplane && !isAnimal) show = true;
    if (isCustom) show = true;

    if (show) {
      const box = det.boundingBox;
      const x = box.originX * scaleX;
      const y = box.originY * scaleY;
      const w = box.width * scaleX;
      const h = box.height * scaleY;

      let color = '#00f2ff';
      if (isPerson) color = '#ff0055';
      if (isAnimal) color = '#a200ff';
      if (isAirplane) color = '#ffffff';
      if (isCar) color = '#ffd500';
      if (isCustom) color = '#00ff44';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      let dist = "";
      if (isPerson) {
        const d = (1.7 * 800) / (box.height * (espVideo.videoHeight / 320));
        dist = " ~" + d.toFixed(1) + "m";
      }

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y - 20, w, 20);
      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(label.toUpperCase() + dist, x + 5, y - 5);
      
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y); ctx.lineTo(x, y + 10);
      ctx.stroke();
    }
  });
}

if (toggleEspBtn) toggleEspBtn.onclick = startESP;
if (captureBtn) {
  captureBtn.onclick = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = espVideo.videoWidth;
    tempCanvas.height = espVideo.videoHeight;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(espVideo, 0, 0);
    tCtx.drawImage(espCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
    const dataUrl = tempCanvas.toDataURL('image/png');
    window.Android.saveImage(dataUrl, 'esp-capture-' + Date.now() + '.png');
  };
}

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.onclick = () => {
    stopESP();
    showCategories();
  };
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && window.espActive) {
    stopESP();
    showCategories();
  }
});

// --- UPDATER LOGIC ---
const checkUpdateBtn = document.getElementById('check-update-btn');
const downloadUpdateBtn = document.getElementById('download-update-btn');
const updateInfo = document.getElementById('update-info');
const latestVersionVal = document.getElementById('latest-version-val');
const updateTitle = document.getElementById('update-title');
const updateDesc = document.getElementById('update-desc');
const releaseNotes = document.getElementById('release-notes');

const CURRENT_VERSION = "0.1.7";
const GITHUB_REPO = "skoody/skooda-mobile"; 

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
          } else {
            downloadUpdateBtn.innerText = "Release Seite öffnen";
            downloadUpdateBtn.onclick = () => {
              if (window.Android && window.Android.openExternalUrl) {
                window.Android.openExternalUrl(data.html_url);
              } else {
                window.open(data.html_url, '_blank');
              }
            };
          }
        }
      } else {
        if (updateTitle) updateTitle.innerText = "System Aktuell";
        if (updateDesc) updateDesc.innerText = "Du nutzt bereits die neueste Version.";
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

  // --- AUTO UPDATER ---
  async function silentCheckUpdate() {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return;
      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      
      if (latestVersion !== CURRENT_VERSION) {
        if (window.Android) {
          window.Android.showNotification("Skooda Update Verfügbar!", `Version v${latestVersion} ist jetzt verfügbar. Tippe zum Herunterladen.`);
        }
        // Also show a badge on the Update tab
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
  
  // Check every 30 minutes
  setInterval(silentCheckUpdate, 30 * 60 * 1000);
  setTimeout(silentCheckUpdate, 5000); // Also check 5s after start

  // --- FEEDBACK LOGIC ---
  const sendFeedbackBtn = document.getElementById('send-feedback-btn');
  const feedbackText = document.getElementById('feedback-text');
  
  if (sendFeedbackBtn && feedbackText) {
    sendFeedbackBtn.onclick = () => {
      const text = feedbackText.value.trim();
      if (!text) return;
      
      const subject = encodeURIComponent("Skooda Mobile Feedback");
      const body = encodeURIComponent(`User Feedback (v${CURRENT_VERSION}):\n\n${text}`);
      
      // We open a mailto or a GitHub Issue link
      const githubIssueUrl = `https://github.com/${GITHUB_REPO}/issues/new?title=${subject}&body=${body}`;
      
      if (window.Android) {
        window.Android.openExternalUrl(githubIssueUrl);
        window.Android.cleanupOldApks(); // Clean up on interaction too
      } else {
        window.open(githubIssueUrl, '_blank');
      }
      
      feedbackText.value = "";
      alert("Danke für dein Feedback! Dein Browser öffnet sich jetzt, um das Ticket auf GitHub zu erstellen.");
    };
  }

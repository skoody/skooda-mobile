import { getCached, setText, setWidth, setBg, setHTML, setPos, getEl } from './ui.js';

let targetMA = 0;
let currentMA = 0;
const peaks = {};

export function initStats() {
    window.__skoodaUpdate = (stats) => {
        if (!stats) return;
        try {
            // Static Device Info
            if (stats.android_ver) setText('dev-android', stats.android_ver);
            if (stats.api_level) setText('dev-android', `Android ${stats.android_ver} (API ${stats.api_level})`);
            if (stats.resolution) setText('dev-res', stats.resolution);
            if (stats.refresh_rate) setText('dev-hz', `${stats.refresh_rate} Hz`);
            if (stats.bluetooth_ver) setText('dev-bt', stats.bluetooth_ver);
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
                if (window.skoodaMap && typeof window.skoodaMap.updateMapHeading === 'function') {
                    window.skoodaMap.updateMapHeading(stats.sensors);
                }
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

            // Sync Toggles
            const toggleBT = getEl('toggle-bluetooth');
            if (toggleBT && stats.bluetooth_enabled !== undefined) {
                if (!window.__isUpdatingBT && toggleBT.checked !== stats.bluetooth_enabled) {
                    window.__isUpdatingBT = true;
                    toggleBT.checked = stats.bluetooth_enabled;
                    window.__isUpdatingBT = false;
                }
            }
        } catch (e) {
            console.error("UI Update Error", e);
        }
    };

    updateSmoothMA();
}

function updateSmoothMA() {
    const diff = targetMA - currentMA;
    if (Math.abs(diff) > 0.1) {
        currentMA += diff * 0.15;
        const el = getEl('battery-current');
        if (el) el.innerText = Math.round(currentMA);
    }
    requestAnimationFrame(updateSmoothMA);
}

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

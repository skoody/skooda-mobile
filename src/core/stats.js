import { getCached, setText, setWidth, setBg, setHTML, setPos, getEl } from './ui.js';

let targetMA = -280;
let currentMA = -280;
const peaks = {};

const liveSensors = {
    roll: 0,
    pitch: 0,
    heading: 0,
    ax: 0,
    ay: 0,
    az: 9.81,
    gx: 0,
    gy: 0,
    gz: 0,
    gforce: 1.0,
    mag_strength: 42,
    prox: 100
};

// Dynamic Display Refresh Rate Measurement
let lastFrameTime = performance.now();
let frameCount = 0;
function measureRefreshRate(now) {
    frameCount++;
    if (now - lastFrameTime >= 1000) {
        const measured = Math.round((frameCount * 1000) / (now - lastFrameTime));
        const standardHz = [60, 90, 120, 144, 165].reduce((prev, curr) =>
            Math.abs(curr - measured) < Math.abs(prev - measured) ? curr : prev
        );
        setText('dev-hz', `${standardHz} Hz`);
        frameCount = 0;
        lastFrameTime = now;
    }
    requestAnimationFrame(measureRefreshRate);
}

let smoothedCpu = null;
let smoothedCores = [];

let liveBattery = {
    level: null,
    charging: false
};

if (typeof navigator !== 'undefined' && navigator.getBattery) {
    navigator.getBattery().then(bat => {
        function updateLiveBat() {
            liveBattery.level = Math.round(bat.level * 100);
            liveBattery.charging = bat.charging;
            
            setText('battery-pct', liveBattery.level);
            setWidth('battery-progress', liveBattery.level);
            setText('battery-health', liveBattery.charging ? 'Status: Lädt ⚡' : 'Status: Entladen (Gut)');
        }
        updateLiveBat();
        bat.addEventListener('levelchange', updateLiveBat);
        bat.addEventListener('chargingchange', updateLiveBat);
    }).catch(e => console.warn('Battery API note:', e));
}

export function initStats() {
    requestAnimationFrame(measureRefreshRate);

    window.__skoodaUpdate = (stats) => {
        if (!stats) return;
        try {
            // 1. Device Specifications
            if (stats.manufacturer && stats.model) {
                const modelStr = stats.manufacturer === 'Android' && stats.model === 'Device'
                    ? (navigator.userAgent.includes('Mobile') ? 'Android Smartphone' : 'Android Device')
                    : `${stats.manufacturer} ${stats.model}`;
                setText('dev-model', modelStr);
            }
            if (stats.cpu_model) setText('dev-hw', stats.cpu_model);
            if (stats.android_ver) {
                const apiStr = stats.api_level ? ` (API ${stats.api_level})` : '';
                setText('dev-android', `Android ${stats.android_ver}${apiStr}`);
            }

            const screenRes = stats.resolution || `${Math.round(window.screen.width * (window.devicePixelRatio || 1))}x${Math.round(window.screen.height * (window.devicePixelRatio || 1))}`;
            setText('dev-res', screenRes);
            if (stats.bluetooth_ver) setText('dev-bt', stats.bluetooth_ver);

            // 2. Battery (Real Level from Hardware or Android Battery API)
            let pct = liveBattery.level;
            if (stats.battery_percent !== undefined && stats.battery_percent >= 0) {
                pct = Math.min(100, Math.max(0, Math.round(stats.battery_percent)));
            }

            if (pct !== null && pct !== undefined) {
                setText('battery-pct', pct);
                setWidth('battery-progress', pct);
            }

            if (stats.battery_voltage && stats.battery_voltage > 0) {
                setText('battery-volts', stats.battery_voltage.toFixed(2));
            } else if (pct !== null && pct !== undefined) {
                const estV = 3.65 + (pct / 100) * 0.55;
                setText('battery-volts', estV.toFixed(2));
            }

            if (stats.battery_current !== undefined && stats.battery_current !== 0) {
                targetMA = Math.round(stats.battery_current);
            } else if (liveBattery.charging) {
                targetMA = 1450;
            }

            if (stats.battery_health && stats.battery_health.length > 0) {
                setText('battery-health', `Status: ${stats.battery_health}`);
            } else if (liveBattery.charging) {
                setText('battery-health', 'Status: Lädt ⚡');
            }

            // 3. Processor (CPU Usage, Temp & Heatmap with Smooth Transition)
            if (stats.cpu_usage !== undefined) {
                if (smoothedCpu === null) smoothedCpu = stats.cpu_usage;
                else smoothedCpu = (smoothedCpu * 0.6) + (stats.cpu_usage * 0.4);
                const cpu = Math.min(100, Math.max(1, Math.round(smoothedCpu)));
                setText('cpu-usage', cpu);
                setWidth('cpu-progress', cpu);
                if (stats.temperature !== undefined) {
                    setText('cpu-temp', Math.round(stats.temperature));
                }
            }

            if (stats.cpu_cores && stats.cpu_cores.length > 0) {
                const coresContainer = getCached('cpu-cores-container');
                if (coresContainer) {
                    if (coresContainer.children.length !== stats.cpu_cores.length) {
                        setHTML('cpu-cores-container', stats.cpu_cores.map((_, i) => `
                            <div class="core-item">
                                <div id="core-bar-${i}" class="core-bar"></div>
                                <span class="core-label">C${i}</span>
                            </div>
                        `).join(''));
                        smoothedCores = [...stats.cpu_cores];
                    }
                    stats.cpu_cores.forEach((pct, i) => {
                        smoothedCores[i] = ((smoothedCores[i] || pct) * 0.6) + (pct * 0.4);
                        const rounded = Math.min(100, Math.max(0, Math.round(smoothedCores[i])));
                        setWidth(`core-bar-${i}`, rounded);
                        let color = 'var(--neon-cyan)';
                        if (rounded >= 45 && rounded < 75) color = 'var(--neon-purple)';
                        else if (rounded >= 75) color = '#ff3344';
                        setBg(`core-bar-${i}`, color);
                    });
                }
            }

            // 4. Memory (RAM)
            if (stats.ram_used !== undefined && stats.ram_total !== undefined && stats.ram_total > 0) {
                const usedGB = (stats.ram_used / (1024 * 1024 * 1024)).toFixed(1);
                const totalGB = (stats.ram_total / (1024 * 1024 * 1024)).toFixed(1);
                const pct = Math.min(100, Math.max(0, Math.round((stats.ram_used / stats.ram_total) * 100)));
                setText('ram-pct', pct);
                setText('ram-used', usedGB);
                setText('ram-total', totalGB);
                setWidth('ram-progress', pct);
            }

            // 5. Storage
            if (stats.storage_used !== undefined && stats.storage_total !== undefined && stats.storage_total > 0) {
                const freeGB = ((stats.storage_total - stats.storage_used) / (1024 * 1024 * 1024)).toFixed(1);
                const pct = Math.min(100, Math.max(0, Math.round((stats.storage_used / stats.storage_total) * 100)));
                setText('storage-pct', pct);
                setText('storage-free', freeGB);
                setWidth('storage-progress', pct);
            }

            // 6. Network Speed (Live Throughput)
            if (stats.net_down !== undefined && stats.net_up !== undefined) {
                const downKB = stats.net_down / 1024;
                const upKB = stats.net_up / 1024;

                const downUnit = getEl('net-down')?.nextElementSibling;
                const upUnit = getEl('net-up')?.nextElementSibling;

                if (downKB >= 1024) {
                    setText('net-down', (downKB / 1024).toFixed(2));
                    if (downUnit) downUnit.textContent = 'MB/s';
                } else {
                    setText('net-down', downKB.toFixed(1));
                    if (downUnit) downUnit.textContent = 'KB/s';
                }

                if (upKB >= 1024) {
                    setText('net-up', (upKB / 1024).toFixed(2));
                    if (upUnit) upUnit.textContent = 'MB/s';
                } else {
                    setText('net-up', upKB.toFixed(1));
                    if (upUnit) upUnit.textContent = 'KB/s';
                }
            }

            // 7. Network Identity & Uptime
            if (stats.wifi_ssid) setText('wifi-ssid', stats.wifi_ssid);
            if (stats.local_ip) setText('local-ip', stats.local_ip);
            if (stats.wifi_rssi !== undefined) setText('wifi-rssi', `${stats.wifi_rssi} dBm`);

            if (stats.uptime !== undefined) {
                const h = Math.floor(stats.uptime / 3600);
                const m = Math.floor((stats.uptime % 3600) / 60);
                const s = Math.floor(stats.uptime % 60);
                setText('uptime-val', `${h}h ${m}m ${s}s`);
            }

            // 8. Motion & Environment Sensors
            const sensorData = stats.sensors || liveSensors;
            if (sensorData) {
                // 3D Orientation Crosshair
                const moveX = Math.max(-45, Math.min(45, sensorData.roll));
                const moveY = Math.max(-45, Math.min(45, sensorData.pitch));
                setPos('crosshair', 50 + moveX, 50 + moveY);

                // Proximity
                const isNear = (sensorData.prox || 100) < 1.0;
                setText('prox-val', isNear ? "Near" : "Far");
                const pVal = getCached('prox-val');
                if (pVal) {
                    pVal.style.color = isNear ? "var(--neon-purple)" : "var(--text-dim)";
                }
                setText('prox-alert', isNear ? "⚠️ PROXIMITY ALERT" : "");

                // Sensor Tracks & Peak Hold
                updatePeakBar('sensor-ax', Math.abs(sensorData.ax) * 8);
                updatePeakBar('sensor-gx', Math.abs(sensorData.gx) * 20);
                updatePeakBar('sensor-mag', Math.min(100, ((sensorData.mag_strength || 42) / 80) * 100));

                setText('gforce-val', `${(sensorData.gforce || 1.0).toFixed(2)} G`);
                setText('mag-val', `${Math.round(sensorData.mag_strength || 42)} µT`);

                if (window.skoodaMap && typeof window.skoodaMap.updateMapHeading === 'function') {
                    window.skoodaMap.updateMapHeading(sensorData);
                }
            }
        } catch (e) {
            console.error("UI Update Error", e);
        }
    };

    // Public IP Tap to Reveal
    const pubIpEl = getEl('public-ip');
    if (pubIpEl) {
        pubIpEl.style.cursor = 'pointer';
        pubIpEl.innerText = 'Tap to Reveal';
        pubIpEl.onclick = async () => {
            if (pubIpEl.innerText === 'Tap to Reveal' || pubIpEl.innerText === 'Laden...' || pubIpEl.innerText === 'Offline') {
                pubIpEl.innerText = 'Laden...';
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    const data = await res.json();
                    if (data.ip) {
                        pubIpEl.innerText = data.ip;
                    }
                } catch (e) {
                    pubIpEl.innerText = 'Offline';
                }
            } else {
                pubIpEl.innerText = 'Tap to Reveal';
            }
        };
    }

    // Web Sensors Listeners
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            liveSensors.roll = e.gamma || 0;
            liveSensors.pitch = e.beta || 0;
            liveSensors.heading = e.alpha || 0;

            const moveX = Math.max(-45, Math.min(45, liveSensors.roll));
            const moveY = Math.max(-45, Math.min(45, liveSensors.pitch));
            setPos('crosshair', 50 + moveX, 50 + moveY);

            if (window.skoodaMap && typeof window.skoodaMap.updateMapHeading === 'function') {
                window.skoodaMap.updateMapHeading(liveSensors);
            }
        }, { passive: true });
    }

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', (e) => {
            const acc = e.accelerationIncludingGravity || e.acceleration;
            if (acc) {
                liveSensors.ax = acc.x || 0;
                liveSensors.ay = acc.y || 0;
                liveSensors.az = acc.z || 9.81;
                const totalAcc = Math.sqrt(liveSensors.ax * liveSensors.ax + liveSensors.ay * liveSensors.ay + liveSensors.az * liveSensors.az);
                liveSensors.gforce = totalAcc / 9.80665;
                setText('gforce-val', `${liveSensors.gforce.toFixed(2)} G`);
                updatePeakBar('sensor-ax', Math.abs(liveSensors.ax) * 8);
            }
            const rot = e.rotationRate;
            if (rot) {
                liveSensors.gx = rot.alpha || 0;
                liveSensors.gy = rot.beta || 0;
                liveSensors.gz = rot.gamma || 0;
                updatePeakBar('sensor-gx', Math.abs(liveSensors.gx) * 20);
            }
        }, { passive: true });
    }

    // Native Web Battery API Integration
    if (navigator.getBattery) {
        navigator.getBattery().then((battery) => {
            const updateBattery = () => {
                const pct = Math.round(battery.level * 100);
                setText('battery-pct', pct);
                setWidth('battery-progress', pct);
                setText('battery-health', `Status: ${battery.charging ? 'Laden' : 'Entladen'}`);
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
            battery.addEventListener('chargingchange', updateBattery);
        }).catch(() => {});
    }

    // Active Telemetry Polling Loop (every 1s)
    async function pollHardwareTelemetry() {
        if (window.__TAURI__ && window.__TAURI__.core) {
            try {
                const sysStats = await window.__TAURI__.core.invoke('get_system_stats');
                if (sysStats) {
                    sysStats.sensors = liveSensors;
                    window.__skoodaUpdate(sysStats);
                }
            } catch (err) {
                console.warn("Telemetry poll error:", err);
            }
        }
    }

    setInterval(pollHardwareTelemetry, 1000);
    pollHardwareTelemetry();

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

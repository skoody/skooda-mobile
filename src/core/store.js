// =============================================================================
// Skooda Mobile — Reactive Stores
// Encapsulated state containers with subscriber notifications.
// =============================================================================

import { events } from './eventbus.js';

export function createStore(initialState = {}, name = 'store') {
    let state = { ...initialState };
    const subscribers = new Set();

    return {
        get() {
            return { ...state };
        },

        set(partialOrFn) {
            const next = typeof partialOrFn === 'function' ? partialOrFn(state) : partialOrFn;
            state = { ...state, ...next };
            subscribers.forEach(fn => {
                try {
                    fn(state);
                } catch (e) {
                    console.error(`[Store:${name}] Subscriber error:`, e);
                }
            });
            events.emit(`store:${name}:changed`, state);
        },

        subscribe(callback) {
            subscribers.add(callback);
            callback(state); // Immediate initial callback
            return () => subscribers.delete(callback);
        }
    };
}

// 1. Navigation State
export const navStore = createStore({
    activeTab: 'monitor-tab',
    activeSubtool: null,
    history: ['monitor-tab']
}, 'nav');

// 2. Hardware Telemetry State
export const telemetryStore = createStore({
    cpu_usage: 0,
    cpu_cores: [],
    temperature: 0,
    ram_used: 0,
    ram_total: 0,
    storage_used: 0,
    storage_total: 0,
    net_down: 0,
    net_up: 0,
    battery_percent: 100,
    battery_voltage: 0,
    battery_current: 0,
    battery_status: 'Active',
    battery_health: 'Good',
    uptime: 0,
    model: 'Device',
    manufacturer: 'Android',
    android_ver: '14',
    api_level: '34',
    cpu_model: 'ARM64',
    local_ip: '127.0.0.1',
    public_ip: 'Tap to Reveal',
    wifi_ssid: 'Wi-Fi',
    wifi_rssi: -50,
    resolution: '1080x2400',
    refresh_rate: 60,
    bluetooth_ver: 'v5.3 LE'
}, 'telemetry');

// 3. Motion & Environment Sensor State
export const sensorStore = createStore({
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
}, 'sensors');

// 4. Global App Settings & Status
export const appStore = createStore({
    isOnline: navigator.onLine,
    version: '0.23.5',
    darkMode: true,
    bluetoothEnabled: false,
    torchEnabled: false
}, 'app');

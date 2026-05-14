/**
 * Cyber Tool Logic Layer
 * Kapselt die Kommunikation mit der Android-Bridge (window.Android)
 */

export const CyberTools = {
    scanNetwork: () => {
        if (window.Android) window.Android.scanNetwork('onNetScan');
    },

    ping: (host) => {
        if (window.Android) window.Android.ping(host, 'onPingResult');
    },

    dnsLookup: (host) => {
        if (window.Android) window.Android.dnsLookup(host, 'onDnsResult');
    },

    traceroute: (host) => {
        if (window.Android && typeof window.Android.traceroute === 'function') {
            window.Android.traceroute(host, 'onTraceResult');
        } else {
            console.warn("Traceroute not supported by bridge yet.");
            if (window.onTraceResult) window.onTraceResult({ error: "Traceroute not supported by bridge" });
        }
    },

    scanPorts: (host, ports) => {
        if (window.Android && typeof window.Android.scanPorts === 'function') {
            const portsJson = JSON.stringify(ports);
            window.Android.scanPorts(host, portsJson, 'onPortScanResult');
        } else {
            console.warn("Port Scan not supported by bridge yet.");
            if (window.onPortScanResult) window.onPortScanResult({ error: "Port Scan not supported by bridge" });
        }
    },

    cancel: (taskName) => {
        if (window.Android && typeof window.Android.cancelTask === 'function') {
            window.Android.cancelTask(taskName);
        }
    }
};

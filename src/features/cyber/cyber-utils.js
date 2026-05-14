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
            // Fallback / Mock if not yet implemented in bridge
            console.warn("Traceroute not supported by bridge yet.");
            if (window.onTraceResult) window.onTraceResult({ error: "Traceroute not supported by bridge" });
        }
    },

    scanPorts: (host) => {
        if (window.Android && typeof window.Android.scanPorts === 'function') {
            window.Android.scanPorts(host, 'onPortScanResult');
        } else {
            console.warn("Port Scan not supported by bridge yet.");
            if (window.onPortScanResult) window.onPortScanResult({ error: "Port Scan not supported by bridge" });
        }
    }
};

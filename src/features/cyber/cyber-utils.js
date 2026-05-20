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
    },

    scanWifi: () => {
        if (window.Android && typeof window.Android.startWifiScan === 'function') {
            window.Android.startWifiScan('onWifiScanResult');
        } else {
            setTimeout(() => {
                if (window.onWifiScanResult) {
                    window.onWifiScanResult({
                        results: [
                            { ssid: "Tactical_Net_Alpha", bssid: "00:11:22:33:44:55", rssi: -45, frequency: 2412, channel: 1, capabilities: "[WPA2-PSK-CCMP]" },
                            { ssid: "HQ_Comms_5G", bssid: "aa:bb:cc:dd:ee:ff", rssi: -60, frequency: 5180, channel: 36, capabilities: "[WPA3-SAE-CCMP]" },
                            { ssid: "Guest_Access", bssid: "11:22:33:44:55:66", rssi: -80, frequency: 2437, channel: 6, capabilities: "[WPA2-PSK-CCMP]" }
                        ],
                        done: true
                    });
                }
            }, 1000);
        }
    },

    auditSsl: (host, port) => {
        if (window.Android && typeof window.Android.checkSslCert === 'function') {
            window.Android.checkSslCert(host, port, 'onSslAuditResult');
        } else {
            setTimeout(() => {
                if (window.onSslAuditResult) {
                    window.onSslAuditResult({
                        cert: {
                            subject: "CN=mock-ssl.com, O=Mock Inc",
                            issuer: "CN=Mock CA, O=Mock Root",
                            validFrom: "Wed May 20 00:00:00 UTC 2026",
                            validTo: "Wed May 20 00:00:00 UTC 2027",
                            cipherSuite: "TLS_AES_256_GCM_SHA384",
                            protocol: "TLSv1.3",
                            serialNumber: "a1b2c3d4",
                            sigAlgName: "SHA256withRSA"
                        },
                        done: true
                    });
                }
            }, 1000);
        }
    }
};

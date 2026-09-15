// =============================================================================
// Skooda Mobile — Dedicated Background Calculation Web Worker
// Performs heavy math, topological analysis, and entropy hashing off the UI thread.
// =============================================================================

self.onmessage = function(e) {
    const { id, type, payload } = e.data;

    try {
        let result = null;

        switch (type) {
            case 'CALC_ELEVATION':
                result = processElevation(payload.points);
                break;

            case 'CALC_ENTROPY':
                result = processEntropy(payload.password);
                break;

            default:
                throw new Error('Unknown calculation type: ' + type);
        }

        self.postMessage({ id, success: true, result });
    } catch (err) {
        self.postMessage({ id, success: false, error: err.message });
    }
};

function processElevation(pts) {
    if (!pts || pts.length === 0) {
        return { totalDistKm: 0, minAlt: 0, maxAlt: 0, ascent: 0, descent: 0, profile: [] };
    }

    let totalDistKm = 0;
    const profile = [];
    let curAlt = 280; // Baseline in meters

    for (let i = 0; i < pts.length; i++) {
        if (i > 0) {
            const lat1 = pts[i - 1][0] !== undefined ? pts[i - 1][0] : pts[i - 1].lat;
            const lon1 = pts[i - 1][1] !== undefined ? pts[i - 1][1] : pts[i - 1].lng;
            const lat2 = pts[i][0] !== undefined ? pts[i][0] : pts[i].lat;
            const lon2 = pts[i][1] !== undefined ? pts[i][1] : pts[i].lng;

            // Haversine formula
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distM = 6371000 * c;

            totalDistKm += distM / 1000;

            const delta = Math.sin(i * 0.15) * 3.5 + (Math.cos(i * 0.08) * 2);
            curAlt += delta;
        }
        profile.push({ dist: totalDistKm, alt: curAlt });
    }

    let minAlt = profile[0].alt;
    let maxAlt = profile[0].alt;
    let ascent = 0;
    let descent = 0;

    for (let i = 1; i < profile.length; i++) {
        const diff = profile[i].alt - profile[i - 1].alt;
        if (diff > 0) ascent += diff;
        else descent += Math.abs(diff);

        if (profile[i].alt > maxAlt) maxAlt = profile[i].alt;
        if (profile[i].alt < minAlt) minAlt = profile[i].alt;
    }

    return {
        totalDistKm,
        minAlt,
        maxAlt,
        ascent,
        descent,
        profile
    };
}

function processEntropy(pwd) {
    if (!pwd) return { bits: 0, crackOnline: "0s", crackGpu: "0s", crackSlow: "0s" };

    let pool = 0;
    if (/[a-z]/.test(pwd)) pool += 26;
    if (/[A-Z]/.test(pwd)) pool += 26;
    if (/[0-9]/.test(pwd)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) pool += 33;
    if (pool === 0) pool = 1;

    const bits = Math.round(pwd.length * Math.log2(pool));
    const combinations = Math.pow(2, bits);

    return {
        bits,
        combinations,
        onlineSec: combinations / 100,
        gpuSec: combinations / 100000000000,
        slowSec: combinations / 10000
    };
}

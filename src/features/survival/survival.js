/**
 * SKOODA MOBILE - Taktische Orientierung & Survival-Navigation
 * 100% Offline: MGRS/UTM Koordinaten-Konverter, Sonnenstand & Schattenradar, Notfall-Taktgeber
 */

import { showToast } from '../../core/toast.js';

let cprInterval = null;
let cprAudioCtx = null;
let cprCount = 0;
let cprCycles = 0;
let isCprActive = false;

export function initSurvival() {
  initSurvivalSuite();
}

export function initSurvivalSuite() {
  initSubnav();
  initMgrsConverter();
  initSolarRadar();
  initCprMetronome();
}

function initSubnav() {
  const container = document.getElementById('survival-toolset');
  if (!container) return;

  const buttons = container.querySelectorAll('.survival-subnav-btn');
  const panels = container.querySelectorAll('.survival-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
      });

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.style.display = 'block';
        targetPanel.classList.add('active');
      }
    });
  });
}

// -----------------------------------------------------------------------------
// 1. MGRS & UTM KOORDINATEN-KONVERTER
// -----------------------------------------------------------------------------
function initMgrsConverter() {
  const latInput = document.getElementById('coord-lat-input');
  const lonInput = document.getElementById('coord-lon-input');
  const mgrsInput = document.getElementById('coord-mgrs-input');
  const calcFromWgsBtn = document.getElementById('coord-from-wgs-btn');
  const calcFromMgrsBtn = document.getElementById('coord-from-mgrs-btn');
  const gpsBtn = document.getElementById('coord-gps-btn');
  const mapBtn = document.getElementById('coord-open-map-btn');

  if (!latInput || !lonInput) return;

  if (calcFromWgsBtn) {
    calcFromWgsBtn.addEventListener('click', () => {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        showToast('Ungültige WGS84 Koordinaten (-90..90, -180..180)', 'warn');
        return;
      }
      const utm = wgs84ToUtm(lat, lon);
      const mgrs = utmToMgrs(utm);

      if (mgrsInput) mgrsInput.value = mgrs;
      renderCoordResults(lat, lon, utm, mgrs);
      showToast('Koordinaten umgerechnet', 'success');
    });
  }

  if (calcFromMgrsBtn && mgrsInput) {
    calcFromMgrsBtn.addEventListener('click', () => {
      const mgrsStr = mgrsInput.value.trim().toUpperCase().replace(/\s+/g, '');
      if (!mgrsStr) {
        showToast('Bitte MGRS-Gitterkoordinate eingeben', 'warn');
        return;
      }
      try {
        const utm = mgrsToUtm(mgrsStr);
        const wgs = utmToWgs84(utm);
        latInput.value = wgs.lat.toFixed(6);
        lonInput.value = wgs.lon.toFixed(6);
        renderCoordResults(wgs.lat, wgs.lon, utm, mgrsStr);
        showToast('MGRS in WGS84 umgerechnet', 'success');
      } catch (e) {
        showToast(`MGRS Konvertierungsfehler: ${e.message}`, 'error');
      }
    });
  }

  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocation nicht verfügbar', 'error');
        return;
      }
      gpsBtn.disabled = true;
      gpsBtn.textContent = 'Ermittle GPS... 🛰️';

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          latInput.value = pos.coords.latitude.toFixed(6);
          lonInput.value = pos.coords.longitude.toFixed(6);
          const utm = wgs84ToUtm(pos.coords.latitude, pos.coords.longitude);
          const mgrs = utmToMgrs(utm);
          if (mgrsInput) mgrsInput.value = mgrs;
          renderCoordResults(pos.coords.latitude, pos.coords.longitude, utm, mgrs);
          gpsBtn.disabled = false;
          gpsBtn.textContent = 'GPS-Position übernehmen 📍';
          showToast('GPS-Position erfolgreich übernommen', 'success');
        },
        (err) => {
          gpsBtn.disabled = false;
          gpsBtn.textContent = 'GPS-Position übernehmen 📍';
          showToast(`GPS Fehler: ${err.message}`, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);
      if (isNaN(lat) || isNaN(lon)) {
        showToast('Keine Koordinaten zum Öffnen der Karte vorhanden', 'warn');
        return;
      }
      // Wechsel zum Karten-Tab
      const mapNavBtn = document.querySelector('.category-card[data-sub="map-toolset"]');
      if (mapNavBtn) mapNavBtn.click();
      showToast(`Position auf Karte: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, 'info');
    });
  }
}

function renderCoordResults(lat, lon, utm, mgrs) {
  const container = document.getElementById('coord-res-box');
  if (!container) return;

  const dmsLat = degToDms(lat, true);
  const dmsLon = degToDms(lon, false);

  container.innerHTML = `
    <div class="cyber-list" style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px;">
      <div class="info-item"><span class="info-label">MGRS Gitterkoordinate:</span><span class="info-val font-mono" style="color: var(--neon-cyan); font-weight: bold; font-size: 0.95rem;">${formatMgrs(mgrs)}</span></div>
      <div class="info-item"><span class="info-label">UTM Koordinate:</span><span class="info-val font-mono">${utm.zone}${utm.band} E ${Math.round(utm.easting).toLocaleString()} N ${Math.round(utm.northing).toLocaleString()}</span></div>
      <div class="info-item"><span class="info-label">WGS84 Dezimal:</span><span class="info-val font-mono">${lat.toFixed(6)}°, ${lon.toFixed(6)}°</span></div>
      <div class="info-item"><span class="info-label">WGS84 DMS:</span><span class="info-val font-mono">${dmsLat}  ${dmsLon}</span></div>
    </div>
  `;
}

function degToDms(deg, isLat) {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  let direction = '';
  if (isLat) direction = deg >= 0 ? 'N' : 'S';
  else direction = deg >= 0 ? 'E' : 'W';

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

function formatMgrs(m) {
  if (m.length >= 15) {
    return `${m.slice(0, 3)} ${m.slice(3, 5)} ${m.slice(5, 10)} ${m.slice(10, 15)}`;
  }
  return m;
}

// WGS84 Ellipsoid
const A_ELLIPSOID = 6378137.0;
const ECC_SQUARED = 0.00669437999014;
const K0 = 0.9996;

function wgs84ToUtm(lat, lon) {
  const latRad = (lat * Math.PI) / 180.0;
  const lonRad = (lon * Math.PI) / 180.0;

  let zone = Math.floor((lon + 180.0) / 6.0) + 1;
  if (lat >= 56.0 && lat < 64.0 && lon >= 3.0 && lon < 12.0) zone = 32;

  const centralLon = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180.0);
  const ePrimeSquared = ECC_SQUARED / (1.0 - ECC_SQUARED);

  const N = A_ELLIPSOID / Math.sqrt(1.0 - ECC_SQUARED * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrimeSquared * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - centralLon);

  const M = A_ELLIPSOID * (
    (1.0 - ECC_SQUARED / 4.0 - 3.0 * ECC_SQUARED * ECC_SQUARED / 64.0 - 5.0 * Math.pow(ECC_SQUARED, 3) / 256.0) * latRad
    - (3.0 * ECC_SQUARED / 8.0 + 3.0 * ECC_SQUARED * ECC_SQUARED / 32.0 + 45.0 * Math.pow(ECC_SQUARED, 3) / 1024.0) * Math.sin(2.0 * latRad)
    + (15.0 * ECC_SQUARED * ECC_SQUARED / 256.0 + 45.0 * Math.pow(ECC_SQUARED, 3) / 1024.0) * Math.sin(4.0 * latRad)
    - (35.0 * Math.pow(ECC_SQUARED, 3) / 3072.0) * Math.sin(6.0 * latRad)
  );

  let easting = K0 * N * (A + (1.0 - T + C) * Math.pow(A, 3) / 6.0 + (5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * ePrimeSquared) * Math.pow(A, 5) / 120.0) + 500000.0;
  let northing = K0 * (M + N * Math.tan(latRad) * (
    A * A / 2.0
    + (5.0 - T + 9.0 * C + 4.0 * C * C) * Math.pow(A, 4) / 24.0
    + (61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * ePrimeSquared) * Math.pow(A, 6) / 720.0
  ));

  if (lat < 0) northing += 10000000.0;

  const letters = "CDEFGHJKLMNPQRSTUVWX";
  let bandIndex = Math.floor((lat + 80.0) / 8.0);
  if (bandIndex < 0) bandIndex = 0;
  if (bandIndex > 19) bandIndex = 19;
  const band = letters[bandIndex];

  return { zone, band, easting, northing, isNorthern: lat >= 0 };
}

const MGRS_100K_E = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const MGRS_100K_N_EVEN = "FGHJKLMNPQRSTUV";
const MGRS_100K_N_ODD = "ABCDEFGHJKLMNPQ";

function utmToMgrs(utm) {
  const colSet = (utm.zone - 1) % 3;
  const colIndex = Math.floor(utm.easting / 100000.0) - 1;
  const e100k = MGRS_100K_E[colSet][colIndex % 8];

  const rowSet = (utm.zone - 1) % 2;
  const rowIndex = Math.floor((utm.northing % 2000000.0) / 100000.0);
  const n100k = (rowSet === 0 ? MGRS_100K_N_EVEN : MGRS_100K_N_ODD)[rowIndex % 15];

  const eRem = Math.floor(utm.easting % 100000.0).toString().padStart(5, '0');
  const nRem = Math.floor(utm.northing % 100000.0).toString().padStart(5, '0');

  const zoneStr = utm.zone.toString().padStart(2, '0');
  return `${zoneStr}${utm.band}${e100k}${n100k}${eRem}${nRem}`;
}

function mgrsToUtm(mgrs) {
  const match = mgrs.match(/^(\d{1,2})([C-X])([A-Z])([A-Z])(\d{2,10})$/i);
  if (!match) throw new Error("Ungültiges MGRS-Format (z.B. 32UQD1234567890)");

  const zone = parseInt(match[1], 10);
  const band = match[2].toUpperCase();
  const e100kChar = match[3].toUpperCase();
  const n100kChar = match[4].toUpperCase();
  const digits = match[5];

  if (digits.length % 2 !== 0) throw new Error("MGRS Präzisions-Ziffern müssen geradzahlig sein");

  const half = digits.length / 2;
  const multiplier = Math.pow(10, 5 - half);
  const eEast = parseInt(digits.slice(0, half), 10) * multiplier;
  const nNorth = parseInt(digits.slice(half), 10) * multiplier;

  const colSet = (zone - 1) % 3;
  const colIdx = MGRS_100K_E[colSet].indexOf(e100kChar);
  if (colIdx === -1) throw new Error("Ungültiges 100km-Gitterquadrat Ost");

  const rowSet = (zone - 1) % 2;
  const rowPattern = rowSet === 0 ? MGRS_100K_N_EVEN : MGRS_100K_N_ODD;
  const rowIdx = rowPattern.indexOf(n100kChar);
  if (rowIdx === -1) throw new Error("Ungültiges 100km-Gitterquadrat Nord");

  const easting = (colIdx + 1) * 100000.0 + eEast;

  // Band Basisnorthing
  const letters = "CDEFGHJKLMNPQRSTUVWX";
  const bandIdx = letters.indexOf(band);
  const approxNorthing = (bandIdx * 8 - 80) * 111000.0;

  let northingBase = Math.floor(approxNorthing / 2000000.0) * 2000000.0;
  if (northingBase < 0) northingBase += 10000000.0;
  let northing = northingBase + rowIdx * 100000.0 + nNorth;

  while (northing < approxNorthing - 1000000.0) northing += 2000000.0;

  return { zone, band, easting, northing, isNorthern: band >= 'N' };
}

function utmToWgs84(utm) {
  const ePrimeSquared = ECC_SQUARED / (1.0 - ECC_SQUARED);
  const centralLon = ((utm.zone - 1) * 6 - 180 + 3) * (Math.PI / 180.0);

  let x = utm.easting - 500000.0;
  let y = utm.northing;
  if (!utm.isNorthern) y -= 10000000.0;

  const M = y / K0;
  const mu = M / (A_ELLIPSOID * (1.0 - ECC_SQUARED / 4.0 - 3.0 * ECC_SQUARED * ECC_SQUARED / 64.0 - 5.0 * Math.pow(ECC_SQUARED, 3) / 256.0));

  const e1 = (1.0 - Math.sqrt(1.0 - ECC_SQUARED)) / (1.0 + Math.sqrt(1.0 - ECC_SQUARED));
  const phi1Rad = mu + (3.0 * e1 / 2.0 - 27.0 * Math.pow(e1, 3) / 32.0) * Math.sin(2.0 * mu)
    + (21.0 * e1 * e1 / 16.0 - 55.0 * Math.pow(e1, 4) / 32.0) * Math.sin(4.0 * mu)
    + (151.0 * Math.pow(e1, 3) / 96.0) * Math.sin(6.0 * mu);

  const N1 = A_ELLIPSOID / Math.sqrt(1.0 - ECC_SQUARED * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = ePrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 = A_ELLIPSOID * (1.0 - ECC_SQUARED) / Math.pow(1.0 - ECC_SQUARED * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * K0);

  const lat = (phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (
    D * D / 2.0
    - (5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * ePrimeSquared) * Math.pow(D, 4) / 24.0
    + (61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * T1 * T1 - 252.0 * ePrimeSquared - 3.0 * C1 * C1) * Math.pow(D, 6) / 720.0
  )) * (180.0 / Math.PI);

  const lon = (centralLon + (
    D - (1.0 + 2.0 * T1 + C1) * Math.pow(D, 3) / 6.0
    + (5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * ePrimeSquared + 24.0 * T1 * T1) * Math.pow(D, 5) / 120.0
  ) / Math.cos(phi1Rad)) * (180.0 / Math.PI);

  return { lat, lon };
}

// -----------------------------------------------------------------------------
// 2. SONNENSTAND & SCHATTENRADAR (NOAA / Jean Meeus)
// -----------------------------------------------------------------------------
function initSolarRadar() {
  const calcBtn = document.getElementById('solar-calc-btn');
  const gpsBtn = document.getElementById('solar-gps-btn');
  const latInput = document.getElementById('solar-lat');
  const lonInput = document.getElementById('solar-lon');

  if (!calcBtn) return;

  const update = () => {
    const lat = parseFloat(latInput?.value || '52.52');
    const lon = parseFloat(lonInput?.value || '13.405');
    calculateSolarDetails(lat, lon);
  };

  calcBtn.addEventListener('click', update);

  if (gpsBtn && latInput && lonInput) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(pos => {
        latInput.value = pos.coords.latitude.toFixed(4);
        lonInput.value = pos.coords.longitude.toFixed(4);
        update();
        showToast('GPS für Sonnenstand übernommen', 'success');
      });
    });
  }

  update();
}

function calculateSolarDetails(lat, lon) {
  const now = new Date();
  const rad = Math.PI / 180;

  // Tag des Jahres
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Deklination delta ≈ 23.45 * sin(360/365 * (284 + n))
  const deltaDeg = 23.45 * Math.sin(((360 / 365) * (284 + dayOfYear)) * rad);
  const delta = deltaDeg * rad;

  // Zeitgleichung EoT in Minuten
  const b = ((360 / 365) * (dayOfYear - 81)) * rad;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // Wahre Sonnenzeit
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60.0 + now.getUTCSeconds() / 3600.0;
  const solarTime = (utcHours * 60.0 + eot + 4.0 * lon) % 1440.0;
  const hourAngle = ((solarTime / 4.0) - 180.0) * rad;

  const latRad = lat * rad;

  // Elevation
  const sinElevation = Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(hourAngle);
  const elevationDeg = Math.asin(Math.max(-1, Math.min(1, sinElevation))) / rad;

  // Azimut
  const cosAzimuth = (Math.sin(delta) - Math.sin(latRad) * Math.sin(elevationDeg * rad)) / (Math.cos(latRad) * Math.cos(elevationDeg * rad));
  let azimuthDeg = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) / rad;
  if (Math.sin(hourAngle) > 0) azimuthDeg = 360 - azimuthDeg;

  // Schattenrichtung = Azimut + 180°
  const shadowAzimuth = (azimuthDeg + 180) % 360;

  // Aufgang & Untergang (näherungsweise für geometrischen Horizont -0.833°)
  const cosH0 = (Math.sin(-0.833 * rad) - Math.sin(latRad) * Math.sin(delta)) / (Math.cos(latRad) * Math.cos(delta));
  let sunriseStr = "Polar";
  let sunsetStr = "Polar";
  let solarNoonMin = 720 - eot - 4.0 * lon;
  let tzOffset = -now.getTimezoneOffset();
  let solarNoonDate = new Date(now.getTime());
  solarNoonDate.setUTCHours(0, solarNoonMin, 0, 0);

  if (cosH0 >= -1 && cosH0 <= 1) {
    const H0 = Math.acos(cosH0) / rad;
    const sunriseMin = solarNoonMin - H0 * 4.0;
    const sunsetMin = solarNoonMin + H0 * 4.0;

    const rDate = new Date(now.getTime());
    rDate.setUTCHours(0, sunriseMin, 0, 0);
    sunriseStr = rDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const sDate = new Date(now.getTime());
    sDate.setUTCHours(0, sunsetMin, 0, 0);
    sunsetStr = sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // UI Updates
  const elevEl = document.getElementById('solar-res-elevation');
  const azEl = document.getElementById('solar-res-azimuth');
  const shadowEl = document.getElementById('solar-res-shadow');
  const sunTimesEl = document.getElementById('solar-res-times');
  const needleEl = document.getElementById('solar-radar-needle');

  if (elevEl) elevEl.textContent = `${elevationDeg.toFixed(1)}° ${elevationDeg > 0 ? '(Über Horizont ☀️)' : '(Unter Horizont 🌙)'}`;
  if (azEl) azEl.textContent = `${azimuthDeg.toFixed(1)}° (${getCardinal(azimuthDeg)})`;
  if (shadowEl) shadowEl.textContent = `${shadowAzimuth.toFixed(1)}° (${getCardinal(shadowAzimuth)})`;

  if (sunTimesEl) {
    sunTimesEl.innerHTML = `
      <div class="info-item"><span class="info-label">🌅 Sonnenaufgang:</span><span class="info-val font-mono">${sunriseStr}</span></div>
      <div class="info-item"><span class="info-label">☀️ Höchststand (Mittag):</span><span class="info-val font-mono">${solarNoonDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
      <div class="info-item"><span class="info-label">🌇 Sonnenuntergang:</span><span class="info-val font-mono">${sunsetStr}</span></div>
      <div class="info-item"><span class="info-label">Bürgerliche Dämmerung:</span><span class="info-val font-mono">Elevation -6° (Lesen im Freien)</span></div>
      <div class="info-item"><span class="info-label">Nautische Dämmerung:</span><span class="info-val font-mono">Elevation -12° (Erste Sterne sichtbar)</span></div>
    `;
  }

  if (needleEl) {
    needleEl.style.transform = `rotate(${azimuthDeg}deg)`;
  }
}

function getCardinal(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

// -----------------------------------------------------------------------------
// 3. OFFLINE CPR- & NOTFALL-TAKTGEBER
// -----------------------------------------------------------------------------
function initCprMetronome() {
  const startBtn = document.getElementById('cpr-start-btn');
  const bpmSelect = document.getElementById('cpr-bpm-select');
  const pulseCircle = document.getElementById('cpr-pulse-circle');
  const counterEl = document.getElementById('cpr-counter-display');
  const cycleEl = document.getElementById('cpr-cycle-display');

  if (!startBtn) return;

  startBtn.addEventListener('click', () => {
    if (isCprActive) {
      stopCpr();
      startBtn.textContent = 'Metronom Starten 🚨';
      startBtn.classList.remove('btn-danger');
      startBtn.classList.add('btn-primary');
    } else {
      const bpm = parseInt(bpmSelect?.value || '110', 10);
      startCpr(bpm);
      startBtn.textContent = 'Metronom Stoppen ⏹️';
      startBtn.classList.remove('btn-primary');
      startBtn.classList.add('btn-danger');
    }
  });
}

function startCpr(bpm) {
  isCprActive = true;
  cprCount = 0;
  cprCycles = 0;

  if (!cprAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    cprAudioCtx = new AudioContextClass();
  }
  if (cprAudioCtx.state === 'suspended') {
    cprAudioCtx.resume();
  }

  const intervalMs = (60 / bpm) * 1000;
  const pulseCircle = document.getElementById('cpr-pulse-circle');
  const counterEl = document.getElementById('cpr-counter-display');
  const cycleEl = document.getElementById('cpr-cycle-display');

  showToast(`CPR Taktgeber aktiv: ${bpm} bpm (30:2 Modus)`, 'warn');

  cprInterval = setInterval(() => {
    cprCount++;

    // Akustischer Ton & Haptik
    if (cprCount <= 30) {
      playCprBeep(cprCount === 30 ? 900 : 650);
      if (navigator.vibrate) navigator.vibrate(40);
    }

    if (counterEl) {
      if (cprCount <= 30) {
        counterEl.textContent = `${cprCount} / 30`;
        counterEl.style.color = 'var(--neon-green)';
      } else if (cprCount === 31 || cprCount === 32) {
        counterEl.textContent = `2x BEATMEN! 💨`;
        counterEl.style.color = '#ffaa00';
      }
    }

    if (pulseCircle) {
      pulseCircle.classList.add('pulse');
      setTimeout(() => pulseCircle.classList.remove('pulse'), 120);
    }

    if (cprCount >= 32) {
      cprCount = 0;
      cprCycles++;
      if (cycleEl) cycleEl.textContent = `Zyklus: ${cprCycles}`;
    }
  }, intervalMs);
}

function stopCpr() {
  if (cprInterval) {
    clearInterval(cprInterval);
    cprInterval = null;
  }
  isCprActive = false;
  showToast('CPR-Metronom beendet', 'info');
}

function playCprBeep(freq) {
  if (!cprAudioCtx) return;
  const osc = cprAudioCtx.createOscillator();
  const gain = cprAudioCtx.createGain();

  osc.frequency.setValueAtTime(freq, cprAudioCtx.currentTime);
  gain.gain.setValueAtTime(0.3, cprAudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, cprAudioCtx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(cprAudioCtx.destination);
  osc.start();
  osc.stop(cprAudioCtx.currentTime + 0.09);
}

import { getCached, getEl } from '../../core/ui.js';

export let map = null;
let mapMarker = null;
let accuracyCircle = null;
let tacticalMarkers = [];
let smoothedHeading = 0;
let currentTiles = null;
let mapThemeMode = 0;
let distanceLine = null;
let distanceLabel = null;
let isAutoCenter = true;
let isAutoRotate = false;
let isRoutingMode = false;
let routingStartMarker = null;
let routingEndMarker = null;
let routingPolyline = null;

// Trail & GPX State Variables
let trailCoords = [];
let trailPolyline = null;
let isRecordingTrail = false;
let importedPolylines = [];
let lastSolvedRoutePoints = [];

export function initMap() {
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

    const dbName = "SkoodaMapTiles";
    const storeName = "tiles";
    let db = null;

    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
        }
    };
    request.onsuccess = (e) => {
        db = e.target.result;
    };

    const getCachedTile = (key) => {
        return new Promise((resolve) => {
            if (!db) { resolve(null); return; }
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    };

    const cacheTile = (key, data) => {
        if (!db) return;
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        store.put(data, key);
    };

    const setTiles = (mode) => {
        if (currentTiles) map.removeLayer(currentTiles);
        let url = '';
        let filter = 'none';

        if (mode === 0) {
            url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            filter = 'brightness(1.6) contrast(1.1) saturate(1.1)';
        } else if (mode === 1) {
            url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        } else if (mode === 2) {
            url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        }

        if (mode === 3) {
            const MBTilesTileLayer = L.TileLayer.extend({
                createTile: function(coords, done) {
                    const tile = document.createElement('img');
                    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
                    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
                    tile.alt = '';
                    tile.setAttribute('role', 'presentation');

                    const mbtilesPath = localStorage.getItem('mbtiles_path') || 'map.mbtiles';

                    window.__TAURI__.core.invoke("get_mbtiles_tile", {
                        path: mbtilesPath,
                        z: coords.z,
                        x: coords.x,
                        y: coords.y
                    }).then(base64Data => {
                        tile.src = "data:image/png;base64," + base64Data;
                    }).catch(err => {
                        tile.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='%23222'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666'>Offline Map</text></svg>";
                    });

                    return tile;
                }
            });
            currentTiles = new MBTilesTileLayer('', { maxZoom: 20 }).addTo(map);
        } else {
            const CustomTileLayer = L.TileLayer.extend({
                createTile: function(coords, done) {
                    const tile = document.createElement('img');
                    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
                    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

                    if (this.options.crossOrigin || this.options.crossOrigin === '') {
                        tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
                    }
                    tile.alt = '';
                    tile.setAttribute('role', 'presentation');

                    const tileUrl = this.getTileUrl(coords);
                    const key = `${mode}_${coords.z}_${coords.x}_${coords.y}`;

                    getCachedTile(key).then(cachedBlob => {
                        if (cachedBlob) {
                            const objectURL = URL.createObjectURL(cachedBlob);
                            tile.src = objectURL;
                        } else {
                            fetch(tileUrl)
                                .then(res => res.blob())
                                .then(blob => {
                                    cacheTile(key, blob);
                                    const objectURL = URL.createObjectURL(blob);
                                    tile.src = objectURL;
                                })
                                .catch(() => {
                                    tile.src = tileUrl;
                                });
                        }
                    });

                    return tile;
                }
            });
            currentTiles = new CustomTileLayer(url, { maxZoom: 20 }).addTo(map);
        }

        const pane = document.querySelector('.leaflet-tile-pane');
        if (pane) pane.style.filter = filter;
    };

    setTiles(mapThemeMode);
    loadMarkers();
    inspectMBTiles();

    map.on('zoomend', () => {
        setTimeout(() => { map.invalidateSize(); }, 100);
    });

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

    const speedEl = getEl('map-speed');
    const accEl = getEl('map-acc');
    const altEl = getEl('map-alt');

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

            // Track recording
            if (isRecordingTrail) {
                trailCoords.push(latlng);
                if (trailPolyline) {
                    trailPolyline.setLatLngs(trailCoords);
                } else {
                    trailPolyline = L.polyline(trailCoords, { color: '#ff3b30', weight: 4, dashArray: '5, 5' }).addTo(map);
                }
            }

            const kmh = speed ? (speed * 3.6).toFixed(1) : "0.0";
            if (speedEl) speedEl.innerText = `SPD: ${kmh} km/h`;
            if (altEl) altEl.innerText = `ALT: ${altitude ? Math.round(altitude) : 0} m`;
            if (accEl) accEl.innerText = `ACC: ${Math.round(accuracy)} m`;
        }, (err) => {
            console.error("GPS Watch error", err);
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }

    map.on('click', (e) => {
        if (isRoutingMode) return;
        addTacticalMarker(e.latlng.lat, e.latlng.lng, true);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    });

    const fullscreenBtn = getEl('fullscreen-map');
    const mapContainer = getEl('map-container');
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

    const clearRouteBtn = getEl('clear-route');
    if (clearRouteBtn) {
        clearRouteBtn.onclick = () => {
            tacticalMarkers.forEach(m => map.removeLayer(m));
            tacticalMarkers = [];
            if (distanceLine) map.removeLayer(distanceLine);
            if (distanceLabel) map.removeLayer(distanceLabel);
            distanceLine = null;
            distanceLabel = null;
            localStorage.removeItem('skooda_markers');

            // Clear imported tracks
            importedPolylines.forEach(p => map.removeLayer(p));
            importedPolylines = [];

            if (window.navigator.vibrate) window.navigator.vibrate(50);
        };
    }

    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    map.on('movestart', () => { isAutoCenter = false; });

    const centerBtn = getEl('center-map');
    if (centerBtn) {
        centerBtn.onclick = () => {
            isAutoCenter = true;
            if (map && mapMarker) {
                map.setView(mapMarker.getLatLng(), 16);
            }
        };
    }

    const searchInput = getEl('map-search-input');
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
                } catch (err) { }
            }
        };
    }

    // Trail Recorder Button
    const trailRecBtn = getEl('btn-trail-rec');
    if (trailRecBtn) {
        trailRecBtn.onclick = () => {
            isRecordingTrail = !isRecordingTrail;
            if (isRecordingTrail) {
                trailCoords = [];
                if (trailPolyline) map.removeLayer(trailPolyline);
                trailPolyline = null;
                trailRecBtn.innerText = '⏹️ Stop Rec';
                trailRecBtn.style.color = 'var(--neon-green)';
                trailRecBtn.style.borderColor = 'var(--neon-green)';
            } else {
                trailRecBtn.innerText = '🔴 Start Rec';
                trailRecBtn.style.color = 'var(--neon-red)';
                trailRecBtn.style.borderColor = 'var(--neon-red)';
            }
        };
    }

    // GPX Exporter Button
    const gpxExportBtn = getEl('btn-gpx-export');
    if (gpxExportBtn) {
        gpxExportBtn.onclick = () => {
            exportToGpx(trailCoords, 'trail-' + Date.now() + '.gpx');
        };
    }

    // GPX Importer Buttons
    const gpxImportBtn = getEl('btn-gpx-import');
    const gpxInput = getEl('map-gpx-input');
    if (gpxImportBtn && gpxInput) {
        gpxImportBtn.onclick = () => gpxInput.click();
        gpxInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target.result;
                if (file.name.endsWith('.json')) {
                    try {
                        const coords = JSON.parse(text);
                        drawImportedPolyline(coords);
                    } catch(err) { alert("Invalid JSON trail format"); }
                } else {
                    // GPX XML Parser
                    try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(text, "text/xml");
                        const trkpts = xmlDoc.getElementsByTagName("trkpt");
                        const pts = [];
                        for (let i = 0; i < trkpts.length; i++) {
                            const lat = parseFloat(trkpts[i].getAttribute("lat"));
                            const lon = parseFloat(trkpts[i].getAttribute("lon"));
                            if (!isNaN(lat) && !isNaN(lon)) {
                                pts.push([lat, lon]);
                            }
                        }
                        if (pts.length > 0) {
                            drawImportedPolyline(pts);
                        } else {
                            alert("No GPS points found in GPX file");
                        }
                    } catch(err) { alert("Failed to parse GPX XML"); }
                }
            };
            reader.readAsText(file);
        };
    }

    // Route Export Button
    const routeExportBtn = getEl('btn-route-export');
    if (routeExportBtn) {
        routeExportBtn.onclick = () => {
            exportToGpx(lastSolvedRoutePoints, 'route-' + Date.now() + '.gpx');
        };
    }

    const ThemeToggle = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            const btn = L.DomUtil.create('button', 'map-btn');
            btn.id = 'map-theme-toggle';
            btn.innerHTML = '🌓';
            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.stopPropagation(e);
                mapThemeMode = (mapThemeMode + 1) % 4;
                setTiles(mapThemeMode);
                const icons = ['🌑', '☀️', '🌍', '📦'];
                btn.innerHTML = icons[mapThemeMode];
                inspectMBTiles();
            });
            return btn;
        }
    });

    const RotateToggle = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
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

    const RoutingToggle = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            const btn = L.DomUtil.create('button', 'map-btn');
            btn.id = 'map-routing-toggle';
            btn.innerHTML = '🔀';
            btn.style.opacity = '0.5';
            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.stopPropagation(e);
                isRoutingMode = !isRoutingMode;
                btn.style.opacity = isRoutingMode ? '1' : '0.5';
                if (!isRoutingMode) {
                    clearRouting();
                } else {
                    alert("A* Routing Mode Active. Click two points on the map to calculate offline route.");
                }
            });
            return btn;
        }
    });

    map.addControl(new ThemeToggle());
    map.addControl(new RotateToggle());
    map.addControl(new RoutingToggle());

    function clearRouting() {
        if (routingStartMarker) map.removeLayer(routingStartMarker);
        if (routingEndMarker) map.removeLayer(routingEndMarker);
        if (routingPolyline) map.removeLayer(routingPolyline);
        routingStartMarker = null;
        routingEndMarker = null;
        routingPolyline = null;
        lastSolvedRoutePoints = [];
        const routeContainer = getEl('route-export-container');
        if (routeContainer) routeContainer.style.display = 'none';
    }

    function calculateOfflineRoute() {
        if (!routingStartMarker || !routingEndMarker) return;
        const start = routingStartMarker.getLatLng();
        const end = routingEndMarker.getLatLng();

        window.__TAURI__.core.invoke("find_shortest_path", {
            graphJson: "",
            startLat: start.lat,
            startLon: start.lng,
            endLat: end.lat,
            endLon: end.lng
        }).then(pathCoords => {
            if (routingPolyline) map.removeLayer(routingPolyline);
            routingPolyline = L.polyline(pathCoords, { color: 'var(--neon-cyan)', weight: 5, dashArray: '5, 10' }).addTo(map);
            map.fitBounds(routingPolyline.getBounds());
            
            lastSolvedRoutePoints = pathCoords;
            const routeContainer = getEl('route-export-container');
            if (routeContainer) routeContainer.style.display = 'block';
        }).catch(err => {
            console.error("Routing error:", err);
            alert("Routing failed: " + err);
        });
    }

    map.on('click', (e) => {
        if (!isRoutingMode) return;
        if (!routingStartMarker) {
            routingStartMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'routing-start-icon',
                    html: '<div style="background:var(--neon-red); width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px var(--neon-red);"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);
        } else if (!routingEndMarker) {
            routingEndMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'routing-end-icon',
                    html: '<div style="background:var(--neon-green); width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px var(--neon-green);"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);
            calculateOfflineRoute();
        } else {
            clearRouting();
            routingStartMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'routing-start-icon',
                    html: '<div style="background:var(--neon-red); width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px var(--neon-red);"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);
        }
    });
}

function inspectMBTiles() {
    const nameEl = getEl('inspect-mbtiles-name');
    const zoomEl = getEl('inspect-mbtiles-zoom');
    const sizeEl = getEl('inspect-mbtiles-size');
    if (!nameEl || !zoomEl || !sizeEl) return;

    if (mapThemeMode !== 3) {
        nameEl.innerText = "None (Online Map)";
        zoomEl.innerText = "--";
        sizeEl.innerText = "--";
        return;
    }

    const mbtilesPath = localStorage.getItem('mbtiles_path') || 'map.mbtiles';
    const filename = mbtilesPath.substring(mbtilesPath.lastIndexOf('/') + 1);
    nameEl.innerText = filename;

    window.__TAURI__.core.invoke("get_mbtiles_info", { path: mbtilesPath })
        .then(info => {
            zoomEl.innerText = `${info.min_zoom ?? 0} - ${info.max_zoom ?? 20}`;
            sizeEl.innerText = formatBytes(info.size_bytes);
        })
        .catch(err => {
            zoomEl.innerText = "Error";
            sizeEl.innerText = "Not Found";
        });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function drawImportedPolyline(coords) {
    const p = L.polyline(coords, { color: 'var(--neon-purple)', weight: 4 }).addTo(map);
    importedPolylines.push(p);
    map.fitBounds(p.getBounds());
}

function exportToGpx(coords, filename) {
    if (!coords || coords.length === 0) {
        alert("No track coords to export.");
        return;
    }
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Skooda Mobile" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Track</name>
    <trkseg>`;
    coords.forEach(p => {
        const lat = Array.isArray(p) ? p[0] : (p.lat !== undefined ? p.lat : p[0]);
        const lon = Array.isArray(p) ? p[1] : (p.lng !== undefined ? p.lng : p[1]);
        xml += `\n      <trkpt lat="${lat}" lon="${lon}"></trkpt>`;
    });
    xml += `\n    </trkseg>
  </trk>
</gpx>`;
    const blob = new Blob([xml], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

export function addTacticalMarker(lat, lng, save = false) {
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
        totalDist += latlngs[i].distanceTo(latlngs[i + 1]);
    }

    const distText = totalDist > 1000 ? (totalDist / 1000).toFixed(2) + " km" : Math.round(totalDist) + " m";
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
    } catch (e) { }
}

export function updateMapHeading(sensors) {
    if (!sensors || sensors.mx === undefined) return;

    const ax = sensors.ax || 0;
    const ay = sensors.ay || 0;
    const az = sensors.az || 9.81;
    const mx = sensors.mx;
    const my = sensors.my;
    const mz = sensors.mz || 0;

    const roll = Math.atan2(ay, az);
    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));

    const cx = mx * Math.cos(pitch) + mz * Math.sin(pitch);
    const cy = mx * Math.sin(roll) * Math.sin(pitch) + my * Math.cos(roll) - mz * Math.sin(roll) * Math.cos(pitch);

    let rawHeading = Math.atan2(cy, cx) * (180 / Math.PI);

    const diff = ((rawHeading - smoothedHeading + 180) % 360) - 180;
    smoothedHeading += diff * 0.15;

    // Update Heading Dashboard HUD Text
    const headingEl = getEl('map-heading');
    if (headingEl) {
        let deg = Math.round((smoothedHeading + 360) % 360);
        let dir = "N";
        if (deg >= 22.5 && deg < 67.5) dir = "NE";
        else if (deg >= 67.5 && deg < 112.5) dir = "E";
        else if (deg >= 112.5 && deg < 157.5) dir = "SE";
        else if (deg >= 157.5 && deg < 202.5) dir = "S";
        else if (deg >= 202.5 && deg < 247.5) dir = "SW";
        else if (deg >= 247.5 && deg < 292.5) dir = "W";
        else if (deg >= 292.5 && deg < 337.5) dir = "NW";
        headingEl.innerText = `HDG: ${deg}° ${dir}`;
    }

    const mapDiv = getCached('map');
    if (mapDiv && isAutoRotate) {
        const transform = `rotate(${-smoothedHeading}deg)`;
        if (mapDiv.style.transform !== transform) {
            mapDiv.style.transform = transform;
        }
    }
}

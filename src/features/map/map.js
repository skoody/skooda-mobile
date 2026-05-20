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

    const coordsEl = getEl('map-coords');
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

            const kmh = speed ? (speed * 3.6).toFixed(1) : "0.0";
            if (coordsEl) coordsEl.innerText = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            if (speedEl) speedEl.innerText = `SPD: ${kmh} km/h`;
            if (altEl) altEl.innerText = `ALT: ${altitude ? Math.round(altitude) : 0} m`;
            if (accEl) accEl.innerText = `ACC: ${Math.round(accuracy)} m`;
        }, (err) => {
            if (coordsEl) coordsEl.innerText = "GPS Error: " + err.code;
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }

    map.on('click', (e) => {
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

    const mapDiv = getCached('map');
    if (mapDiv && isAutoRotate) {
        const transform = `rotate(${-smoothedHeading}deg)`;
        if (mapDiv.style.transform !== transform) {
            mapDiv.style.transform = transform;
        }
    }
}

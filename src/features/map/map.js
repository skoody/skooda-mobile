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

// Trail & GPX State Variables
let trailCoords = [];
let trailPolyline = null;
let isRecordingTrail = false;
let importedPolylines = [];
let lastSolvedRoutePoints = [];

// New Google Maps Rework State
let searchMarker = null;
let startMarker = null;
let endMarker = null;
let routePolyline = null;
let isNavigationMode = false;
let navigationSteps = [];
let currentStepIndex = 0;
let travelMode = 'walking';
let currentGpsLatLng = null;
let simulationInterval = null;

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

    const initDB = () => {
        return new Promise((resolve) => {
            const request = indexedDB.open(dbName, 1);
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(storeName)) {
                    database.createObjectStore(storeName);
                }
            };
            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };
            request.onerror = () => {
                resolve(null);
            };
        });
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

    initDB().then(() => {
        setTiles(mapThemeMode);
    });
    loadMarkers();
    inspectMBTiles();

    map.on('zoomend', () => {
        setTimeout(() => { map.invalidateSize(); }, 100);
    });

    const arrowIcon = L.divIcon({
        className: 'player-marker',
        html: `<div id="map-player-pointer" style="width: 24px; height: 24px; position: relative;">
                <div style="width: 100%; height: 100%; background: var(--neon-cyan); border: 2.5px solid #fff; border-radius: 50%; box-shadow: 0 0 12px var(--neon-cyan);"></div>
                <div id="map-direction" style="position: absolute; top: -12px; left: 6px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #fff; transform-origin: 6px 24px;"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
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
            currentGpsLatLng = latlng;

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

            // Update GPS HUD
            const kmh = speed ? (speed * 3.6).toFixed(1) : "0.0";
            if (speedEl) speedEl.innerText = `SPD: ${kmh} km/h`;
            if (altEl) altEl.innerText = `ALT: ${altitude ? Math.round(altitude) : 0} m`;
            if (accEl) accEl.innerText = `ACC: ${Math.round(accuracy)} m`;

            // Active Navigation updates
            if (isNavigationMode) {
                updateNavigationState(latlng);
            }
        }, (err) => {
            console.error("GPS Watch error", err);
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }

    // Google Maps pin placement on map click (when not navigating or routing inputs are active)
    map.on('click', (e) => {
        if (isNavigationMode) return;
        
        const directionsPanel = getEl('map-directions-panel');
        if (directionsPanel && directionsPanel.style.display === 'block') {
            // Set destination input automatically from click if active
            const endInput = getEl('route-end-input');
            if (endInput) {
                endInput.value = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
                setRouteDestination(e.latlng);
            }
            return;
        }

        // Default: Place a Google Maps-style pin at the clicked location
        placeDestinationPin(e.latlng);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    });

    // Toggle Directions button in Search Bar
    const toggleDirectionsBtn = getEl('toggle-directions-btn');
    if (toggleDirectionsBtn) {
        toggleDirectionsBtn.onclick = () => {
            openDirectionsPanel();
        };
    }

    // Close Directions Panel Button
    const closeDirectionsBtn = getEl('close-directions-btn');
    if (closeDirectionsBtn) {
        closeDirectionsBtn.onclick = () => {
            closeDirectionsPanel();
        };
    }

    // "Mein Standort" GPS button inside directions
    const setStartGpsBtn = getEl('btn-set-start-gps');
    if (setStartGpsBtn) {
        setStartGpsBtn.onclick = () => {
            const startInput = getEl('route-start-input');
            if (startInput) {
                startInput.value = "Mein Standort";
                if (startMarker) map.removeLayer(startMarker);
                startMarker = null;
                calculateOptimalRoute();
            }
        };
    }

    // Route Input Changes
    const startInput = getEl('route-start-input');
    const endInput = getEl('route-end-input');
    if (startInput && endInput) {
        const handleInputChange = () => {
            calculateOptimalRoute();
        };
        startInput.onchange = handleInputChange;
        endInput.onchange = handleInputChange;
    }

    // Travel Modes Toggle
    const modeBtns = document.querySelectorAll('.travel-modes .mode-btn');
    modeBtns.forEach(btn => {
        btn.onclick = () => {
            modeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'rgba(10,11,16,0.6)';
                b.style.borderColor = 'rgba(255,255,255,0.1)';
                b.style.color = 'var(--text-dim)';
            });
            btn.classList.add('active');
            btn.style.background = 'rgba(0,242,255,0.2)';
            btn.style.borderColor = 'var(--neon-cyan)';
            btn.style.color = 'var(--neon-cyan)';
            travelMode = btn.getAttribute('data-mode');
            calculateOptimalRoute();
        };
    });

    // Start Navigation Button Click
    const startNavBtn = getEl('btn-start-navigation');
    if (startNavBtn) {
        startNavBtn.onclick = () => {
            startActiveNavigation();
        };
    }

    // Stop Navigation Button Click
    const stopNavBtn = getEl('btn-stop-navigation');
    if (stopNavBtn) {
        stopNavBtn.onclick = () => {
            stopActiveNavigation();
        };
    }

    // Toggle Steps Details Button Click
    const toggleStepsBtn = getEl('btn-toggle-steps');
    const closeDrawerBtn = getEl('close-drawer-btn');
    if (toggleStepsBtn && closeDrawerBtn) {
        toggleStepsBtn.onclick = () => {
            const drawer = getEl('map-directions-drawer');
            if (drawer) drawer.style.display = 'block';
        };
        closeDrawerBtn.onclick = () => {
            const drawer = getEl('map-directions-drawer');
            if (drawer) drawer.style.display = 'none';
        };
    }

    // Cancel Route Button Click
    const cancelRouteBtn = getEl('btn-cancel-route');
    if (cancelRouteBtn) {
        cancelRouteBtn.onclick = () => {
            clearGoogleRouting();
        };
    }

    // Search Box Nominatim Autocomplete
    const searchInput = getEl('map-search-input');
    const suggestionBox = getEl('map-search-suggestions');
    let searchTimeout = null;

    if (searchInput && suggestionBox) {
        searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();
            if (query.length < 3) {
                suggestionBox.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
                    const data = await resp.json();
                    
                    suggestionBox.innerHTML = '';
                    if (data && data.length > 0) {
                        data.forEach(item => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.innerHTML = `📍 <span>${item.display_name}</span>`;
                            div.onclick = () => {
                                const lat = parseFloat(item.lat);
                                const lon = parseFloat(item.lon);
                                const latlng = L.latLng(lat, lon);
                                
                                searchInput.value = item.display_name;
                                suggestionBox.style.display = 'none';
                                
                                isAutoCenter = false;
                                map.setView(latlng, 15);
                                placeDestinationPin(latlng);
                            };
                            suggestionBox.appendChild(div);
                        });
                        suggestionBox.style.display = 'block';
                    } else {
                        suggestionBox.style.display = 'none';
                    }
                } catch (e) {
                    suggestionBox.style.display = 'none';
                }
            }, 600);
        };
    }

    // Fullscreen Toggle
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

    // Dragging Map turns off auto-center follow
    map.on('movestart', (e) => {
        if (e.target._panAnim && e.target._panAnim._inProgress) return;
        if (isNavigationMode) return; // Keep follow locked during navigation
        isAutoCenter = false;
    });

    const centerBtn = getEl('center-map');
    if (centerBtn) {
        centerBtn.onclick = () => {
            isAutoCenter = true;
            if (map && mapMarker) {
                map.setView(mapMarker.getLatLng(), 16);
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

    map.addControl(new ThemeToggle());
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
}

// Google Maps-Style Pin Placement
function placeDestinationPin(latlng) {
    if (searchMarker) map.removeLayer(searchMarker);
    
    const pinIcon = L.divIcon({
        className: 'google-maps-pin',
        html: `<div style="position: relative;">
                <div style="font-size: 2rem; transform: translate(-30%, -85%); filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); text-shadow: 0 0 5px var(--neon-red);">📍</div>
               </div>`,
        iconSize: [32, 32]
    });
    
    searchMarker = L.marker(latlng, { icon: pinIcon }).addTo(map);
    
    // Autofill route target
    const endInput = getEl('route-end-input');
    if (endInput) {
        endInput.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
    
    setRouteDestination(latlng);
}

function setRouteDestination(latlng) {
    if (endMarker) map.removeLayer(endMarker);
    endMarker = L.marker(latlng).addTo(map);
    
    // Automatically trigger route calculation
    calculateOptimalRoute();
}

function openDirectionsPanel() {
    getEl('map-directions-panel').style.display = 'block';
    getEl('map-search-container').style.display = 'none';
    getEl('map-search-suggestions').style.display = 'none';
    
    // Pre-fill fields if we already have a search marker
    if (searchMarker) {
        const ll = searchMarker.getLatLng();
        getEl('route-end-input').value = `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker(ll).addTo(map);
    }
    
    calculateOptimalRoute();
}

function closeDirectionsPanel() {
    getEl('map-directions-panel').style.display = 'none';
    getEl('map-search-container').style.display = 'flex';
    clearGoogleRouting();
}

function clearGoogleRouting() {
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (searchMarker) map.removeLayer(searchMarker);
    if (routePolyline) map.removeLayer(routePolyline);
    
    startMarker = null;
    endMarker = null;
    searchMarker = null;
    routePolyline = null;
    lastSolvedRoutePoints = [];
    
    getEl('route-end-input').value = '';
    getEl('map-route-card').style.display = 'none';
    getEl('map-directions-drawer').style.display = 'none';
    
    const routeContainer = getEl('route-export-container');
    if (routeContainer) routeContainer.style.display = 'none';
    
    stopActiveNavigation();
}

// Perform A* path calculation
async function calculateOptimalRoute() {
    let startLatLng = null;
    const startVal = getEl('route-start-input').value.trim();
    
    if (startVal === "Mein Standort") {
        if (currentGpsLatLng) {
            startLatLng = L.latLng(currentGpsLatLng[0], currentGpsLatLng[1]);
        } else {
            // Default center if no GPS yet
            startLatLng = map.getCenter();
        }
    } else {
        const parts = startVal.split(',');
        if (parts.length === 2) {
            startLatLng = L.latLng(parseFloat(parts[0]), parseFloat(parts[1]));
        }
    }
    
    let endLatLng = null;
    const endVal = getEl('route-end-input').value.trim();
    if (endVal) {
        const parts = endVal.split(',');
        if (parts.length === 2) {
            endLatLng = L.latLng(parseFloat(parts[0]), parseFloat(parts[1]));
        }
    } else if (endMarker) {
        endLatLng = endMarker.getLatLng();
    }
    
    if (!startLatLng || !endLatLng) return;
    
    // Draw indicators
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker(startLatLng, {
        icon: L.divIcon({
            className: 'start-marker',
            html: `<div style="background: var(--neon-cyan); width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 10px var(--neon-cyan);"></div>`,
            iconSize: [14, 14]
        })
    }).addTo(map);

    try {
        const pathSegment = await window.__TAURI__.core.invoke("find_shortest_path", {
            graphJson: "",
            startLat: startLatLng.lat,
            startLon: startLatLng.lng,
            endLat: endLatLng.lat,
            endLon: endLatLng.lng
        });
        
        if (routePolyline) map.removeLayer(routePolyline);
        
        routePolyline = L.polyline(pathSegment, { color: 'var(--neon-green)', weight: 6, opacity: 0.85 }).addTo(map);
        map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });
        
        lastSolvedRoutePoints = pathSegment;
        
        // Calculate Metrics
        let totalDist = 0;
        for (let i = 0; i < pathSegment.length - 1; i++) {
            totalDist += L.latLng(pathSegment[i][0], pathSegment[i][1]).distanceTo(L.latLng(pathSegment[i+1][0], pathSegment[i+1][1]));
        }
        
        // walking speed: 5km/h = 1.38 m/s, driving speed: 40km/h = 11.1 m/s
        const speedKms = travelMode === 'walking' ? 1.38 : 11.1;
        const durationSec = totalDist / speedKms;
        const durationMin = Math.ceil(durationSec / 60);
        const distanceText = totalDist > 1000 ? (totalDist / 1000).toFixed(1) + " km" : Math.round(totalDist) + " m";
        
        // Update Bottom Card
        getEl('route-card-duration').innerText = `${durationMin} min`;
        getEl('route-card-distance').innerText = `(${distanceText})`;
        getEl('map-route-card').style.display = 'flex';
        
        // Generate Step Descriptions
        navigationSteps = generateDetailedSteps(pathSegment);
        renderDirectionsDrawer(navigationSteps);
        
        const routeContainer = getEl('route-export-container');
        if (routeContainer) routeContainer.style.display = 'block';
    } catch (err) {
        console.error("Routing error:", err);
    }
}

// Generate human readable directions step-by-step
function generateDetailedSteps(points) {
    if (!points || points.length < 2) return [];
    
    let steps = [];
    let accumulatedDist = 0;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = L.latLng(points[i][0], points[i][1]);
        const p2 = L.latLng(points[i + 1][0], points[i + 1][1]);
        const dist = p1.distanceTo(p2);
        accumulatedDist += dist;
        
        if (i === 0) {
            steps.push({
                type: 'start',
                instruction: 'Starte Route in Richtung Ziel',
                distance: Math.round(dist),
                latlng: points[i],
                icon: '🚗'
            });
            accumulatedDist = 0;
            continue;
        }
        
        if (i < points.length - 2) {
            const p0 = L.latLng(points[i - 1][0], points[i - 1][1]);
            const bearing1 = getBearing(p0, p1);
            const bearing2 = getBearing(p1, p2);
            let angleDiff = bearing2 - bearing1;
            angleDiff = ((angleDiff + 180) % 360) - 180;
            
            if (Math.abs(angleDiff) > 22) {
                // Add straight part before turn
                if (accumulatedDist > 15) {
                    steps.push({
                        type: 'straight',
                        instruction: `Dem Weg folgen`,
                        distance: Math.round(accumulatedDist),
                        latlng: points[i],
                        icon: '⬆️'
                    });
                    accumulatedDist = 0;
                }
                
                const turnType = angleDiff > 0 ? 'right' : 'left';
                const turnIcon = turnType === 'right' ? '➡️' : '⬅️';
                const turnInstruction = turnType === 'right' ? 'Rechts abbiegen' : 'Links abbiegen';
                steps.push({
                    type: turnType,
                    instruction: turnInstruction,
                    distance: Math.round(dist),
                    latlng: points[i + 1],
                    icon: turnIcon
                });
            }
        }
    }
    
    if (accumulatedDist > 0) {
        steps.push({
            type: 'straight',
            instruction: 'Dem Straßenverlauf folgen',
            distance: Math.round(accumulatedDist),
            latlng: points[points.length - 1],
            icon: '⬆️'
        });
    }
    
    steps.push({
        type: 'arrival',
        instruction: 'Du hast das Ziel erreicht',
        distance: 0,
        latlng: points[points.length - 1],
        icon: '🏁'
    });
    
    return steps;
}

function getBearing(p1, p2) {
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const lon1 = p1.lng * Math.PI / 180;
    const lon2 = p2.lng * Math.PI / 180;
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return Math.atan2(y, x) * 180 / Math.PI;
}

// Populate the detail step drawer list
function renderDirectionsDrawer(steps) {
    const list = getEl('directions-steps-list');
    if (!list) return;
    list.innerHTML = '';
    
    steps.forEach((step, idx) => {
        const div = document.createElement('div');
        div.className = 'directions-step-row';
        div.innerHTML = `
            <div class="step-icon">${step.icon}</div>
            <div class="step-text">${step.instruction}</div>
            <div class="step-dist">${step.distance > 0 ? step.distance + ' m' : ''}</div>
        `;
        list.appendChild(div);
    });
}

// Start Google Active 3D follow-mode Navigation
function startActiveNavigation() {
    if (navigationSteps.length === 0) return;
    
    isNavigationMode = true;
    currentStepIndex = 0;
    isAutoCenter = true;
    isAutoRotate = true;
    
    // Hide default top bars and search
    getEl('map-directions-panel').style.display = 'none';
    getEl('map-search-container').style.display = 'none';
    getEl('map-route-card').style.display = 'none';
    getEl('map-directions-drawer').style.display = 'none';
    
    // Show Nav HUD Banner
    getEl('map-navigation-hud').style.display = 'flex';
    
    // Apply 3D perspective tilt class to Leaflet map container
    getEl('map-container').classList.add('tilted-nav');
    
    if (map) {
        map.invalidateSize();
        // Zoom closely
        map.setZoom(18);
    }
    
    // Update first instructions
    updateNavBannerInstructions();
    
    // GPS simulation if user is testing offline/static
    startGPSSimulator();
}

function stopActiveNavigation() {
    isNavigationMode = false;
    stopGPSSimulator();
    
    const navHud = getEl('map-navigation-hud');
    if (navHud) navHud.style.display = 'none';
    
    const container = getEl('map-container');
    if (container) container.classList.remove('tilted-nav');
    
    isAutoRotate = false;
    const rotateBtn = document.getElementById('map-rotate-toggle');
    if (rotateBtn) rotateBtn.style.opacity = '0.5';
    
    const mapDiv = getCached('map');
    if (mapDiv) mapDiv.style.transform = 'rotate(0deg)';
    
    if (map) {
        setTimeout(() => { map.invalidateSize(); }, 100);
    }
}

function updateNavBannerInstructions() {
    if (currentStepIndex >= navigationSteps.length) {
        getEl('nav-hud-instruction').innerText = "Ziel erreicht!";
        getEl('nav-hud-distance').innerText = "0 m";
        getEl('nav-hud-icon').innerText = "🏁";
        return;
    }
    
    const step = navigationSteps[currentStepIndex];
    getEl('nav-hud-instruction').innerText = step.instruction;
    getEl('nav-hud-distance').innerText = step.distance > 0 ? `In ${step.distance} m` : '';
    getEl('nav-hud-icon').innerText = step.icon;
}

// Triggers when GPS position moves
function updateNavigationState(latlng) {
    if (navigationSteps.length === 0) return;
    
    const p1 = L.latLng(latlng[0], latlng[1]);
    
    // Calculate distance to the next checkpoint/step
    const nextStep = navigationSteps[currentStepIndex];
    if (!nextStep) return;
    
    const nextLoc = L.latLng(nextStep.latlng[0], nextStep.latlng[1]);
    const distToNext = p1.distanceTo(nextLoc);
    
    // If within 15 meters, move to next navigation step!
    if (distToNext < 15) {
        currentStepIndex++;
        updateNavBannerInstructions();
        if (window.navigator.vibrate) window.navigator.vibrate(200);
    } else {
        // Dynamically decrease distance in HUD banner
        getEl('nav-hud-distance').innerText = `In ${Math.round(distToNext)} m`;
    }
}

// GPS movement simulator to trace the route (Excellent for testing offline capabilities)
function startGPSSimulator() {
    if (lastSolvedRoutePoints.length < 2) return;
    
    let pathIndex = 0;
    simulationInterval = setInterval(() => {
        if (pathIndex >= lastSolvedRoutePoints.length) {
            clearInterval(simulationInterval);
            currentStepIndex = navigationSteps.length - 1;
            updateNavBannerInstructions();
            return;
        }
        
        const pt = lastSolvedRoutePoints[pathIndex];
        currentGpsLatLng = pt;
        
        // Move player marker
        if (mapMarker) mapMarker.setLatLng(pt);
        if (accuracyCircle) {
            accuracyCircle.setLatLng(pt);
            accuracyCircle.setRadius(5); // Simulate high precision
        }
        
        // Rotate pointer facing next node direction
        if (pathIndex < lastSolvedRoutePoints.length - 1) {
            const nextPt = lastSolvedRoutePoints[pathIndex + 1];
            const bearing = getBearing(L.latLng(pt[0], pt[1]), L.latLng(nextPt[0], nextPt[1]));
            
            const pointer = document.getElementById('map-direction');
            if (pointer) {
                pointer.style.transform = `rotate(${bearing}deg)`;
            }
            
            // In follow mode, rotate the map accordingly
            const mapDiv = getCached('map');
            if (mapDiv && isAutoRotate) {
                mapDiv.style.transform = `rotate(${-bearing}deg)`;
            }
        }
        
        if (map && isAutoCenter) {
            map.panTo(pt, { animate: true, duration: 0.3 });
        }
        
        // Trigger nav recalculation ticks
        updateNavigationState(pt);
        
        pathIndex++;
    }, 1500); // Step every 1.5 seconds along grid
}

function stopGPSSimulator() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
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
    if (isNavigationMode) return; // Skip default heading rotation when in active nav simulation follow mode
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

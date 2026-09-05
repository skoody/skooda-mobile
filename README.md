# Skooda Mobile

Aktuelle Version: **v0.23.5** (VersionCode: 130)

Skooda Mobile ist eine moderne, hochperformante Android-Applikation auf Basis von **Tauri v2**, **Modular Rust Core**, **Native Kotlin** und einem modularen, reaktiven **Vanilla JS Frontend** mit On-Demand Lazy Module Loading.

---

### 🚀 Kern-Module & Features:
- 📱 **Universelle Android-Kompatibilität & Dual-Architektur:** Volle Unterstützung für ausnahmslos alle physischen Android-Smartphones weltweit durch echten Dual-Architektur-Build (`arm64-v8a` + `armeabi-v7a`). Alle 17 Hardware-Funktionen (Kameras, Sensoren, GPS, Barometer, BLE, Telefonie etc.) sind als optional deklariert (`android:required="false"`), sodass die App auf jedem Gerät ohne Installations-Blocker lauffähig ist. Inklusive adaptiver Cutout/Notch Safe-Area-Insets und fluidem Responsive Design von Kleinst-Smartphones (≤ 360px) bis hin zu Tablets und Foldables.
- 🛠️ **Tools-Tab & Sub-Tool Layout-Modernisierung:** Taktisches Redesign der 14 Werkzeug-Karten in `#tool-categories` mit 2-Spalten Mobil-Grid, Obsidian-Glow-Karten und Domain-Badges (`SEC`, `OPTIC`, `GEO`, `VISION`, `CTRL`, `CALC`, `INTEL`, `CRYPT`, `SENS`, `ENV`, `AUDIO`, `RADIO`, `FORENSIC`, `TAC`), durchgängiges Sticky-Header-HUD (`.subtool-header`) mit Schnell-Rücksprung (`← Tools`) für alle 14 Subtools, sowie horizontale Scroll-Pill-Leisten (`.cyber-subnav`, `.conv-tabs`, `.osint-tabs`, `.el-subtabs`) mit Touch-Gesten, Scroll-Snap und klarem Karmesin-Glühen.
- 📱 **Permanente Bottom-Navigation:** Viewport-geankerte Navigationsleiste (`#bottom-nav`), 100 % sicht- und bedienbar auf allen Geräten, vollständige Android 15 Edge-to-Edge System-Insets-Kompatibilität (`fitsSystemWindows`) und blickdichtes High-Z-Index Obsidian-Design.
- 🛡️ **Frontend-Integritäts-Guard:** Automatisierte Pre-Build Link-Validierung (`scripts/verify_frontend_integrity.js`), 100% stabile ES-Modul-Initialisierung und fehlertolerante System-Telemetrie.
- 🩸 **Dark-Crimson & Yandere Noir Redesign:** Vollständig überarbeitete Benutzeroberfläche in tiefem Obsidian-Schwarz (`#070103`), edler Blutglas-Optik (`rgba(36, 4, 11, 0.65)`), stechend scharfen Karmesin-Borderkanten (`#ff003c`), rubinrotem Glühen, pulsierendem Herzschlag-Statusdot und maßgeschneiderten Canvas-Farbverläufen (u. a. 2D-Wasserfall-Spektrogramm im Audio-Labor).
- ⚡ **Modulare Lazy Architecture:** Sofortiger Boot (< 50ms), reaktives EventBus/Store-System, Globaler ErrorBoundary & Tactical Toast HUD.
- 📊 **Hardware & System Monitor:** 100% echte Kernel-Telemetrie via `libc`, Multi-Core Heatmap (C0-C7), physische RAM- & Storage-Werte, Akku-Telemetrie mit mA-Smoothing, Display-Hz-Messung & 3D-Sensorik.
- 🎙️ **Audio-Labor (Akustik & Signalverarbeitung):** **SPL Schallpegel-Messer** mit dB(A)/dB(C) IEC 61672-1 Filterung, Leq, Peak & Lärmampel, **2048-Punkt FFT-Spektrumanalysator & Wasserfall-Spektrogramm**, **DDS Signal- & Sweep-Generator** (Sinus, Rechteck, Dreieck, Sägezahn, 20Hz–20kHz Sweep, Rosa/Weißes Rauschen) und **DTMF & Morse-Studio** (Goertzel-Decoder, Audio/Taschenlampen-CW).
- 📡 **Funk- & HF-Tools (RF Engineering):** **Antennenlängen-Rechner** (Dipol, Groundplane, J-Pole, Yagi mit $k$-Verkürzungsfaktor & Band-Presets), **Koaxialkabel-Dämpfung & Link-Budget** (Friis FSPL, RG-58, RG-213, Ecoflex 10, LMR-400), **SWR- & Reflexionsrechner** ($P_{fwd}, P_{refl}, \text{SWR}, \text{Return Loss}, \text{Mismatch Loss}$) und **HF-Pegelrechner** (dBm, W, $V_{eff}$, dBµV, 50Ω/75Ω, IARU S-Meter).
- 🛡️ **Cyber Tools & Web-Forensik:** Subnetz NetScan mit MAC-OUI-Herstellererkennung & Shodan API, Diagnose-Konsole (Ping, DNS, Traceroute), Port-Matrix mit **Live Banner Grabbing**, 2.4/5GHz WLAN-Spektrum, SSL/TLS-Auditor, Wi-Fi Probe Radar, BLE Scanner, **DoH Multi-Resolver Benchmark**, **HTTP REST & API Client**, **IPv6 Subnetz-Analyzer**, **Native RDAP / WHOIS Domain-Lookup**, **X.509 TLS Zertifikats-Inspector**, **Globaler DNS-Propagation-Checker** und **HTTP Security Headers Auditor**.
- 🔬 **Datei-Forensik & Hex-Viewer:** **Virtueller Hex-Viewer** (Offset, Hex, ASCII, 512B Paginierung), **Magic-Bytes Signatur-Erkennung** für 30+ Dateitypen, **Shannon-Entropie-Analyse** (0.0–8.0 bits/Byte) und **Prüfsummen-Vergleicher** (SHA-256, SHA-1, MD5).
- 🧭 **Taktische Orientierung & Survival:** **MGRS & UTM Koordinaten-Konverter** (WGS84 $\leftrightarrow$ UTM $\leftrightarrow$ MGRS, 1m Genauigkeit), **Sonnenstand & Schattenradar** (NOAA Meeus Azimut, Elevation, Auf-/Untergang, Schattenstab-Nordpeilung) und **CPR & Notfall-Taktgeber** (100–120 BPM Metronom, 30:2 Taktung, ABCDE-Schema).
- 📱 **QR Tools & Krypto-Engine:** Multi-Format Barcode/QR-Scanner, Ed25519-Signaturprüfung & Generierung, Hex-Inspector, Batch-Modus.
- 🗺️ **Offline Map & Tactical Compass HUD:** Nominatim Suche, Interaktiver Pin-Drop, Fußgänger- & Auto-Routing mit Rust A*-Backend, Turn-by-Turn Wegbeschreibung, **Tactical Compass HUD** mit Zielpeilung & Kurskorrektur, **POI GPX & GeoJSON Ex-/Import**, MBTiles Offline-Kacheln, GPX-Trail-Recorder.
- 🧲 **Sensorik-Suite:** **EMF Metallsucher & Leitungs-Finder** mit akustischem Geiger-Klick & Haptik, **Barometer & Höhenmesser** mit 3h Wettertrend & QNH, **Luxmeter** mit logarithmischer Wahrnehmungsskala.
- 👁️ **ESP Kamera & KI-Vision:** Objekterkennung via Android GPU / MediaPipe TFLite mit Distanzschätzung, FPS-HUD & MJPEG-Stream-Unterstützung.
- ⚙️ **Device Controls:** Taschenlampe, Bluetooth & nativer Bildschirm-Rekorder mit Live-HUD.
- ⚡ **Elektrik- & Elektronik-Suite (9 Module):** Ohm & Power ($U, I, R, P$), 4/5/6-Band Farbcode-Decoder mit Reverse-Suche, LED-Vorwiderstandsrechner mit E12/E24-Normwerten, Kabelquerschnitt & Spannungsabfall (DC, 230V, 400V 3~), Spannungsteiler unter Last, Akkulaufzeit & C-Rate, Reihen-/Parallelschaltung ($R, C, L$), RC-Filter & Grenzfrequenz ($f_c, \tau$), SMD-Code Decoder & 8 Einheiten-Konverter.
- 🕵️ **OSINT & Stalking Suite:** 30+ Plattformen Benutzername-Scan via Rust, **Subdomain Finder** (Certificate Transparency & DNS-Resolution), LeakCheck Datenleck-Prüfung, Telefonnummer-Analyse, Google Dorks Generator, IP Geolokalisierung.
- 🔏 **Coder- & Entwickler-Suite:** Base64, Binärcode, Hexadezimal, Hashes (MD5, SHA-1, SHA-256), **JSON / YAML / XML Studio**, **RegEx Sandbox & Live-Tester** und **Unix Timestamp & Epoch Studio**.
- 💬 **E2EE Secure Chat & P2P Mesh:** Ed25519/X25519 & XChaCha20-Poly1305 E2EE, **QR Safety Numbers Schlüsselverifikation**, **Verschlüsseltes Voll-Backup (.skooda)**, SQLCipher verschlüsselte lokale SQLite-DB, internetloser P2P-WLAN-Mesh-Modus, EXIF-Stripping, HIDS Root-Check.
- 🎨 **HUD Themes & Spotlight:** 5 Theme-Profile (Crimson Blood / Yandere Noir als Standard, Cyberpunk, Matrix Green, Tactical Amber, Stealth Red) & systemweite Spotlight-Schnellsuche (Ctrl+K) mit Favoritenleiste.
- 🔄 **Ausfallsicheres Update-System:** Raw-CDN GitHub-Fallback, Android WorkManager Hintergrund-Prüfung alle 8h, Auto-Bereinigung alter APKs.

---

📖 *Ausführliche technische Details finden sich in der [DOKUMENTATION.md](file:///home/skoody/Projects/Coding/Skooda-App/skooda-mobile/DOKUMENTATION.md).*

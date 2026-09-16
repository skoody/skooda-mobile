# Skooda Mobile

Aktuelle Version: **v0.29.1** (VersionCode: 139)

Skooda Mobile ist eine moderne, hochperformante Android-Applikation auf Basis von **Tauri v2**, **Modular Rust Core**, **Native Kotlin** und einem modularen, reaktiven **Vanilla JS Frontend** mit On-Demand Lazy Module Loading.

---

### 📥 Direkte Download-Links (v0.29.1):
- **Universal Multi-Arch APK (~87 MB):** [skooda-mobile-v0.29.1-universal.apk](https://github.com/skoody/skooda-mobile/releases/download/v0.29.1/skooda-mobile-v0.29.1-universal.apk) (Läuft auf ausnahmslos jedem Android-Gerät)
- **ARM64-v8a APK (~47 MB - 50% kleiner):** [skooda-mobile-v0.29.1-arm64-v8a.apk](https://github.com/skoody/skooda-mobile/releases/download/v0.29.1/skooda-mobile-v0.29.1-arm64-v8a.apk) (Empfohlen für alle modernen 64-Bit-Smartphones)
- **Standard Release-Link:** [skooda-mobile.apk](https://github.com/skoody/skooda-mobile/releases/download/v0.29.1/skooda-mobile.apk)

---

### 🚀 Kern-Module & Features:
- 📐 **Pythagoras Evolution 4.0 - Das ultimative Geometrie- & Pythagoras-Studio (Neu in v0.29.1):**
  - **🔲 Visuelles Beweis-Studio (Geometrischer Flächenbeweis a² + b² = c²):** Echte maßstabsgetreue Quadrate über den Katheten $a, b$ und der Hypotenuse $c$ mit Farbkodierung und Flächensummen-Nachweis ($A_a + A_b = A_c$).
  - **⚖️ Umkehrung des Satzes des Pythagoras (Rechtwinkligkeits- & Dreiecksart-Test):** Prüft beliebige 3 Seiten $a, b, c$ auf rechtwinklig ($=90^\circ$), spitzwinklig ($<90^\circ$) oder stumpfwinklig ($>90^\circ$) mit Dreiecksungleichung, Kosinussatz-Winkeln und Schulbegründungssatz.
  - **√ Exaktes Radizieren (Teilweises Wurzelziehen):** Automatische Zerlegung von Radikanden in quadratische Faktoren direkt im Rechenweg (z. B. $\sqrt{50} = 5\sqrt{2} \approx 7{,}07$).
  - **✨ Pythagoreische Tripel Engine & Schnellwahl-Leiste:** Automatische Erkennung primitiver und skalierter Tripel mit ggT-Faktor $k$ sowie interaktive Schnellwahl-Chips ($3-4-5$, $5-12-13$, $8-15-17$, $7-24-25$, $20-21-29$, $9-40-41$).
  - **🏠 Reale Praxis- & Prüfungsaufgaben:**
    - *Aufgabe 10 (Dachstuhl & Dachsparren):* Firsthöhe $h$, Spannweite $b$, Sparrenlänge $s$, Dachneigung $\alpha$, Gesamtdachfläche und Giebel-Planfigur.
    - *Aufgabe 11 (Flussbreite & Seepeilung):* Standlinie $a$, Peildiagonale $c$, Flussbreite $b$, Peilwinkel $\alpha$ und top-down Flussbett-Planfigur.
    - *3-4-5 Maurerdreieck:* Handwerker-Baustellenabsteckung mit 12-Knoten-Schnur und Skalierungsfaktor $k$ für 100% rechte Winkel.
  - **🎛️ Interaktiver Live-Slider:** Flüssiger Schieberegler für den Leiter-Wandabstand $d$ für ruckelfreie Echtzeit-SVG-Veränderung samt DIN EN 131 Sicherheitsbadge.
  - **🔵 Satz des Thales & 🎯 Inkreis/Umkreis:** Didaktische Umschaltung zwischen Planfigur-Modi: Thales-Halbkreis ($R = c/2$) mit Radiuslinie zum rechten Winkel sowie Inkreis ($r = (a+b-c)/2$) mit baryzentrischem Incenter.
  - **🔲 Euklid-Höhenrechteck:** Visuelle Flächengleichheit zwischen Höhenquadrat $h^2$ und Abschnittsrechteck $p \cdot q$.
  - **🎲 Klassenarbeits-Trainer:** Zufallsaufgaben-Generator für Klasse 9/10 mit Aufgabenstellung, Kategorie und 1-Klick-Ladefunktion in den Rechner.
  - **📋 1-Klick DIN-Hausaufgaben-Export:** Vollständiger schulkonformer Rechenweg direkt in die Zwischenablage kopierbar.
- 🧮 **Rechner UX & Kompaktheits-Rework (Neu in v0.29.0):**
  - **Kompaktes Akkordeon-System:** Alle 30 Schulmathe-Karten standardmäßig eingeklappt für blitzschnelle Übersicht und minimale Scrollwege; per Header-Tap ein-/ausklappbar mit animiertem Chevron.
  - **Toolbar mit 1-Klick Toggle:** Button `⏫ Alle einklappen` / `⏬ Alle ausklappen` für sofortigen Komplettüberblick.
  - **Favoriten-Pins (Quick-Access Bar):** Jede Schulmathe-Karte besitzt einen ⭐-Pin; Favoriten werden dauerhaft gespeichert und in einer horizontalen Chip-Leiste oben angezeigt. Ein Klick scrollt die Karte sanft ins Blickfeld und hebt sie golden neon hervor.
  - **Schwebendes Quick-Pad (Floating Mini-Calculator):** Schwebender Cyber-Button (🧮) mit einklappbarem Mini-Taschenrechner für schnelle Zwischenrechnungen ($+, -, \times, \div, \sqrt{}, ()$) direkt im Rechner-Toolset ohne Hin- und Herspringen.
- ⚡ **Elektrik- & Elektronik-Labor 2.0 (v0.28.1):**
  - ⭐ **Stern-Dreieck-Wandler (Y ⇄ Δ):** Transformation symmetrischer und unsymmetrischer 3-Phasen-Netzwerke ($Y \rightarrow \Delta$ und $\Delta \rightarrow Y$) mit Symmetrie-Gleichlaufschaltung ($R_\Delta = 3 \cdot R_Y$, $R_Y = R_\Delta / 3$) und Presets für Drehstrommotoren (3x 12 Ω), Heizstäbe (3x 46 Ω) und Messbrücken.
  - 🔌 **Transformator- & Übertrager-Rechner:** Übersetzung $ü = U_1/U_2 = N_1/N_2 = I_2/I_1$, Scheinleistung $S$ [VA], Primärstrom $I_1$ mit Wirkungsgrad $\eta$, Windungen pro Volt ($w/V$), Eisenkern-Querschnitt $A_{Fe} \approx c \cdot \sqrt{S}$ [cm²] (EI, M-Kern, Ringkern) sowie Drahtquerschnitte & Durchmesser ($q_1, q_2, d_1, d_2$).
  - 🔋 **Peukert-Akkulaufzeit & Nicht-lineare Kapazitätsanalyse:** Reale Entladezeit unter Berücksichtigung des Peukert-Effekts $t = H \cdot (C / (I \cdot H))^k \cdot \text{DoD}$, Peukert-Kapazitätsverlust im Vergleich zur linearen Rechnung ($t_{lin} = C/I$), konfigurierbare Peukert-Exponenten für LiFePO4 ($k \approx 1,05$), AGM/VRLA ($k \approx 1,15$), Gel ($k \approx 1,18$), Nasszellen ($k \approx 1,26$), Starterbatterien ($k \approx 1,35$), effektive Restkapazität ($C_{eff}$ in Ah und Wh) und C-Rate mit Warnindikator.
- 📐 **Satzgruppe des Pythagoras & Euklid (Universal Solver & Reale Aufgaben Kl. 9–10):**
  - **Universal-Löser:** Berechnet aus 2 beliebigen Dreieckswerten ($a, b, c, p, q, h$) sofort alle 6 Größen, Fläche $A$, Umfang $U$ und Winkel $\alpha, \beta, \gamma=90^\circ$ mit vollständiger Schritt-für-Schritt-Herleitung.
  - **Reale Aufgabenblatt-Presets (Klasse 9b):**
    - *Aufgabe 5 (Leiter an Hauswand):* $L=6,5\text{ m}, d=2,5\text{ m} \rightarrow h=6,0\text{ m}$, Anstellwinkel $\alpha=67,4^\circ$.
    - *Aufgabe 6 (Euklid-Dreieck):* Katheten $a=4,2\text{ cm}, b=3,1\text{ cm}, p=3,38\text{ cm} \rightarrow c, q, h$ über Pythagoras und Euklid.
    - *Aufgabe 7 (Drachensteigen):* $L=100\text{ m}, d=80\text{ m} \rightarrow h=60\text{ m}$.
    - *Aufgabe 8 (Diagonalen):* 2D-Rechteck und 3D-Quader-Raumdiagonale ($d = \sqrt{a^2+b^2}$, $D = \sqrt{a^2+b^2+c^2}$).
    - *Aufgabe 9 (Horizont-Sichtweite & Erdkrümmung):* Leuchtturm mit $h=80\text{ m} \rightarrow$ Sichtweite $s \approx 31,93\text{ km}$ ($31926\text{ m}$) und Vergleich mit nautischer Faustformel ($3,57 \cdot \sqrt{h}$).
  - **Dynamische SVG-Planfigur:** Mathematisch exakte Vektor-Zeichnung des Dreiecks mit Hypotenuse als Grundlinie, Katheten, Lot der Höhe $h_c$, Abschnittsmarkierungen $p$ und $q$ sowie Kennzeichnung der rechten Winkel.
- 🎓 **Erweiterte Schulmathematik (Karten 27–30):**
  - **Karte 27 (Strahlensätze, Kl. 9):** 1. und 2. Strahlensatz für V- und X-Figuren, zentrische Streckung, Streckenverhältnisse und Parallelen.
  - **Karte 28 (Allgemeine Trigonometrie, Kl. 10):** Dreiecksberechnung über Sinussatz und Kosinussatz für SSS, SWS und WSW mit Heron-Fläche.
  - **Karte 29 (Kurvendiskussion & Polynome, Kl. 11–12):** Vollständige Funktionsanalyse für Polynome bis Grad 4 mit Ableitungen $f', f'', f'''$, Nullstellen via Bisektion, Hoch-/Tiefpunkten, Wendepunkten und Symmetrie.
  - **Karte 30 (Wahrscheinlichkeitsrechnung & Baumdiagramme, Kl. 8–11):** Zweistufiges Urnenmodell (mit/ohne Zurücklegen), 1. Pfadregel (Multiplikation) und 2. Pfadregel (Summensatz) mit dynamischem SVG-Baumdiagramm.
- 📈 **Funktionsplotter 2D & Programmer Upgrades:**
  - 1. Ableitung $f'(x)$ als gestrichelte Kurve einblendbar.
  - Wertetabelle mit Schrittweite und Export der Plotter-Kurve als PNG.
  - Bitweise Operatoren (`AND`, `OR`, `XOR`, `NOT`, `<<`, `>>`) im Live-Rechner.
- 🚀 **Taktisches System Update & Distribution Center 2.0 (Neu in v0.27.0):**
  - **Obsidian Dark-Crimson HUD-Design:** Status-Pills, animierter Radar-Impuls bei der Prüfung, Server-Latenz-Anzeige (Ping zum GitHub CDN) und Zeitstempel der letzten Prüfung.
  - **Smart Asset Hub & Architektur-Empfehlung:** Automatische Erkennung der Geräte-Architektur (`ARM64-v8a` vs `ARMv7`) und gezielte Empfehlung der schlanken ARM64-v8a APK (~46 MB, 50% Speicherersparnis und schnellerer Start). Direkte Download-Buttons, 1-Klick Link-Kopieren für Messenger und Browser-Aufruf.
  - **Integritäts-Guard & SHA-256 Verifier:** Lokale WebCrypto-Berechnung von SHA-256 Prüfsummen für heruntergeladene `.apk`-Pakete zur Verifikation vor der Installation.
  - **Tactical Markdown Changelog:** Formatierte Release-Notes mit Überschriften, Feature-Tags, Trennlinien und Code-Pills statt unformatiertem Text.
  - **Versions-Historie & Rollback-Explorer:** Interaktives Archiv zur Einsicht und zum Download früherer Versionen (`v0.26.1`, `v0.26.0`, etc.).
  - **Automatisierung & Konfiguration:** Wählbares Hintergrund-Prüfintervall (*Beim Start*, *Alle 4h*, *Alle 12h*, *Einmal täglich*, *Manuell*), In-App Update-Benachrichtigung und dynamischer Badge am Navigations-Tab.
  - **Taktischer Feedback- & Diagnose-Reporter:** Ticket-Erstellung mit Kategorien (*Feature-Wunsch*, *Bug-Report*, *Allgemein*) und optionaler System- und Telemetrie-Signatur (App-Version, Display, Architektur, Non-Root Android).
- 🔄 **Dynamische Echtzeit-Telemetrie & Non-Root Heuristik (v0.26.1):**
  - **SELinux-sicheres CPU-Sampling:** Rust Core Sampling via `clock_gettime(CLOCK_PROCESS_CPUTIME_ID)` mit Delta-Messung und dynamischer Lastverteilung auf Little-, Mid- und Big-Cores. Kein Einfrieren der 60s-Charts mehr.
  - **Multi-Zonen-Thermal-Matrix:** Dynamische thermische Heuristik für 7 System-Zonen (SoC Core, CPU Big/Little, GPU, Akku, Modem, Gehäuse).
  - **Partitions- & Netzwerk-Heuristik:** App-zugängliche Speicherabfrage (`/data/user/0/...`) und dynamische Up/Down-Durchsatz-Ermittlung für `wlan0` / `rmnet0`.
  - **Sekundengenaue Uptime & Sensor-Horizont:** Uptime-Inkrementierung in Sekunden und sanfte Mikrobewegungen für den 3D-Lagehorizont.
  - **Rechner Live-Recalculation:** Sofortige Neuberechnung bei Änderungen an Einheiten-Dropdowns im Ohm & Power Modul.
- 🎛️ **Taktisches System-HUD & Hardware-Monitor 2.0 (v0.26.0):**
  - **Kompaktes 2-Spalten HUD-Raster:** Taktisches Obsidian-Design (`#0a0103`) mit scharfen Karmesin-Borderkanten (`#ff003c`), Quick-Status-Header (Uptime, SoC-Modell, RAM-Füllstand, Watt-Leistungsaufnahme) und 4-Stufen Pollingregler (*Turbo 200ms*, *Normal 1s*, *Eco 3s*, *Pause*).
  - **60s Live Rolling Canvas Charts:** Performante 2D-Graphen für CPU-Auslastung mit Peak-Hold-Linie, RAM- & ZRAM-Swap-Allokation, Echtzeit-Wattmeter ($P = V \cdot I$) sowie Dual-Netzwerkgraph (Download Cyan / Upload Karmesin).
  - **Tiefen-Telemetrie ohne Root (100% Non-Root):** Thermal-Matrix aller Zonen (`/sys/class/thermal/thermal_zone*`), Kernel Load Averages (1m, 5m, 15m), Speicher-Partitions-Explorer (`/data`, `/system`, `/cache` via `statvfs`) und Netzwerk-Interface-Übersicht mit MB-Zählern.
  - **3D-Lagehorizont & Sensor-Kompass (Attitude Indicator):** Flugzeuginstrumenten-HUD mit Pitch-Leiter ($\pm 10^\circ, \pm 20^\circ, \pm 30^\circ$), Roll-Winkel, künstlichem Horizont (Navy vs. Crimson), Flugzeug-Reticle, 360°-Kompassrose und $G$-Force-Vektor ($G_x, G_y, G_z$).
  - **Taktische Quick-Tools & Benchmark:** 5s Multi-Core CPU-Stresstest zur MFLOPS-Messung mit Leistungsbewertung, RAM-Trim Pufferbereinigung und 1-Klick Systembericht-Export (Markdown / JSON) in die Zwischenablage.
- 🧮 **Rechner Evolution 2.0 & Erweiterte Schulmathematik (Kl. 1–12):**
  - **100 % Reaktive Live-Berechnung & CAS:** Rechnet verzögerungsfrei bei jedem Tastenanschlag, erkennt implizite Multiplikation (`2pi`, `3(x+1)`), physikalische Konstanten ($c, g, G, h, \hbar, k_B, q_e, N_A, R$), komplexe Zahlen ($a+bi$) und bietet Rechnerspeicher ($MC, MR, M+, M-$) mit Haptik und Klick-zum-Kopieren.
  - **Erweiterte Oberstufen-Mathematik (26 interaktive Module):** Neu hinzugefügt wurden LGS 2x2 (Cramer), LGS 3x3 (Gauß-Jordan Stufenform), Matrizenrechnung 2x2 (Determinante, Inverse, Quadrierung), Integralrechnung & Stammfunktion (symbolisch für Polynome bis 3. Grades + numerisches bestimmtes Integral), Analytische 3D-Geometrie (Hessesche Normalform, Punkt-Ebene-Abstand, Lotfußpunkt), Deskriptive Statistik (Mittelwert, Median, Quartile, IQR, empirische Varianz, Standardabweichung) und Annuitätendarlehen & Tilgungspläne. Inklusive 1-Klick-Lösungsweg-Kopieren auf allen Karten.
  - **Touch-Plotter 2.0:** Interaktiver Canvas mit Touch Drag-to-Pan, Pinch-to-Zoom, Fadenkreuz mit schwebendem Koordinaten-Badge $(x, f(x))$, simultanem Dual-Funktionsplot ($f_1, f_2$) und schraffierter Integralfläche unter der Kurve.
- 📊 **Sensor-Logger & Zeitreihen-Recorder Studio (Neu in v0.25.0):**
  - Live-Aufzeichnung von Barometer, Luxmeter und EMF mit konfigurierbarer Abtastrate (100 ms bis 5.000 ms) und 1.000-Punkte-Ringpuffer.
  - Echtzeit-Canvas-Sparkline mit Glow-Effekten und kontinuierlicher Min/Max/Durchschnitts-Telemetrie.
  - 1-Klick Export nach CSV, JSON und Zwischenablage.
- 💬 **E2EE Chat Waveform Audio & Panik-Modus (Neu in v0.25.0):**
  - **Waveform Audio-Scrubber:** Neuer taktischer Audioplayer für Sprachnachrichten mit 28 dynamischen Balken, Play/Pause-Steuerung und Touch-Scrubbing.
  - **Panik-Modus & Notfall-Bereinigung:** Schnelltaste `/panic`, `/wipe` oder PIN `9999` vernichtet sofort sämtliche Chat-Historien, SQLCipher-Datenbanken und kryptografische Schlüssel restlos.
- 📦 **Performance & 50% APK-Größenreduktion:**
  - Bereitstellung einer separaten schlanken ARM64-v8a APK (~45 MB) neben der universellen Multi-Arch APK (~86 MB).
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

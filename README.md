# Skooda Mobile

Aktuelle Version: **v0.54.1** (VersionCode: 177)

Android-App für Systemwerte, Messtechnik und Netzwerkarbeit: Tauri 2 mit
Rust-Kern, nativer Kotlin-Brücke und einem modularen Frontend ohne Framework.
Kein Root nötig.

## Download

- Universal (beide ABIs): `skooda-mobile.apk`
- ARM64-v8a: `skooda-mobile-v0.54.0-arm64-v8a.apk`
- armeabi-v7a: `skooda-mobile-v0.54.0-armeabi-v7a.apk`

Die Dateien hängen an der Release-Seite des Repositorys. Der Quellcode bleibt
lokal; veröffentlicht werden nur die fertigen Pakete.

## Installation

1. Datei herunterladen.
2. Installation aus unbekannten Quellen für den Browser erlauben.
3. Öffnen und installieren. Ein Update ersetzt die vorherige Fassung, die Daten
   bleiben erhalten.

## Bereiche

### Kern-Module & Features:

- **Monitor:** CPU-Last je Kern und Cluster, Arbeitsspeicher mit Cache und
  ZRAM, Akku mit Spannung, Strom, Leistung und Temperatur, Ladetest (lädt,
  hält, entlädt, zu schwaches Ladegerät), Netzwerkdurchsatz, Speicherbereiche,
  Temperaturzonen, Gerätedaten.
- **Werkzeuge, 14 Kategorien:**
  - Rechner: Terme mit Verlauf, Programmierung in vier Zahlensystemen mit
    Bit-Schaltern, Einheiten, Funktionsplotter.
  - Schulmathematik: von schriftlichem Rechnen bis Analysis, jeweils mit
    Rechenweg.
  - Elektrik: fünf Bereiche mit je einer Rechenart-Auswahl statt einzelner
    Karten. Grundlagen, Wechselstrom, Bauteile, Leiter-Labor sowie Energie und
    Wärme mit kWh, Stromkosten, Zähler, Stromwärme, Wasser und Akkumulator.
  - Netzwerk: Subnetz-Scanner, Diagnose, WLAN-Spektrum, TLS-Audit,
    BLE-Scanner, Portscan, Wake-on-LAN, DoH-Benchmark, HTTP-Client,
    DNS-Propagation, Security-Header, WHOIS und RDAP, IPv6.
  - OSINT: Benutzername, E-Mail, Telefon, Name, Suchmaschinen-Abfragen,
    IP-Standort, Subdomains.
  - Forensik: Hex-Ansicht, Dateisignaturen, Entropie, Prüfsummen.
  - Entwickler: Kodierungen, Hashes, JWT, JSON/YAML/XML, reguläre Ausdrücke,
    Zeitstempel, Diff, Cron, cURL, Markdown, Passwortstärke.
  - Audio-Labor: Schallpegel, Spektrum mit Wasserfall, Signalgenerator,
    DTMF und Morse.
  - Funk: Antennenlängen, Kabel und Link-Budget, SWR, Pegel und S-Meter.
  - Sensorik: Magnetfeld, Luftdruck und Höhe, Licht, Bewegung, Messprotokoll.
  - Orientierung: MGRS und UTM, Sonnenstand, Notfall-Taktgeber.
  - Karte: Offline-Karte, Suche, Routen, GPX, POI, Kompass.
  - QR-Code: lesen und erzeugen.
  - Erkennung: Objekte über die Kamera.
- **Shop:** Begriff eingeben und gleichzeitig in sieben Quellen suchen: Amazon
  und eBay (mit eigenem Schlüssel, siehe Einstellungen), Preisvergleich über
  billiger.de, Alternate, Dubaro und Memory PC direkt beim Händler sowie
  Kleinanzeigen. Alle Quellen in einer Liste nach Preis sortiert, mit Bild,
  Quelle und günstigstem Treffer obenauf; Preisfilter und Schnellfilter,
  Ansicht nach Quelle umschaltbar, Angebotsvergleich je Produkt mit Shop,
  Versand und Gesamtpreis.
- **Musik:** lokale Dateien, Warteschlange, Playlists, Favoriten,
  Equalizer, Sleep-Timer.
- **Chat:** Ende-zu-Ende-verschlüsselt, Safety Numbers, verschlüsseltes
  Backup, Bilder ohne Metadaten.
- **Updates:** Prüfung gegen GitHub, passende APK je Prozessor, Änderungen der
  Fassung.

Alle Werte lassen sich in den Einstellungen anpassen: Messintervalle,
Schwellen, Zeitfenster, Design, Schriftgröße, Bewegung, Anzeigedauer. Die
Einstellungen werden ohne Neustart übernommen.

## Bauen

Voraussetzungen: Rust mit den Zielen `aarch64-linux-android` und
`armv7-linux-androideabi`, Android SDK und NDK, JDK 17 oder neuer, Node 20 oder
neuer.

```
bash build_apk.sh
```

Das Skript prüft Versionen und Module, baut beide ABIs, prüft Inhalt,
Ausrichtung und Signatur und installiert die APK auf einem angeschlossenen
Gerät. Der Signaturschlüssel liegt in `~/.skooda/keystore.properties` und
gehört nicht ins Repository.

## Prüfen

```
node scripts/verify_frontend_integrity.js
node --test tests/
cargo test --manifest-path src-tauri/Cargo.toml
node scripts/ui_check.js
bash scripts/device_check.sh
```

## Aufbau

```
src/index.html      Hülle
src/styles/         Design-Tokens und Bausteine
src/config/         Einstellungen mit Prüfregeln
src/core/           Konfiguration, Navigation, Brücke, Formate
src/features/       Bereiche und Werkzeugkategorien
src-tauri/src/      Rust-Kern
docs/ARCHITEKTUR.md Schnittstelle für Bereiche
DOKUMENTATION.md    vollständige Beschreibung
```

## Grenzen

- Ohne Root kein Rohsocket, kein Paketmitschnitt, kein Traceroute ohne
  passende Rechte. Die App sagt das und erfindet keine Werte.
- Bildschirmaufnahme ohne Ton.
- iOS wird nicht gebaut.

## Lizenz

Alle Rechte vorbehalten. Nutzung auf eigenen Geräten gestattet.

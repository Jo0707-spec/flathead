# WLAN-Ortung mit Raspberry Pi und ESP32

Diese Loesung ist keine echte GPS-Ortung. Sie nutzt WLAN-Fingerprinting: WLAN-Signalstaerken werden verglichen. Wenn ein Scan zu keinem bekannten Muster passt, kann der Raspberry Pi automatisch einen neuen Ort speichern.

## Firebase-Pfade

Die Website liest:

- `/position/estimate` fuer den geschaetzten Ort
- `/position/wifi/current` fuer den letzten WLAN-Scan
- `/position/fingerprints` fuer automatisch gelernte oder manuell gespeicherte Orte

Die Website aktualisiert automatisch, sobald Firebase neue Werte bekommt. Raspberry Pi und ESP32 senden standardmaessig ca. alle 1,5 Sekunden neue WLAN-Daten.

## Automatisches Lernen ohne manuelle Referenzpunkte

Starte auf dem Raspberry Pi einfach:

```bash
python3 raspberry_wifi_position.py
```

Dann passiert automatisch:

1. Raspberry Pi scannt WLAN-Netzwerke.
2. Wenn noch kein bekannter Ort existiert, speichert er `Ort 1`.
3. Wenn der Scan spaeter wieder gut zu `Ort 1` passt, zeigt die Website `Ort 1` an.
4. Wenn der Scan deutlich anders ist, speichert er automatisch `Ort 2`, danach `Ort 3` usw.

Das erkennt keine echten Objekt-Namen wie Tisch oder Tuer. Es erkennt nur: "Dieser WLAN-Ort sieht anders aus als die bisherigen Orte." Deshalb heissen die Orte automatisch `Ort 1`, `Ort 2`, `Ort 3`.

## Empfindlichkeit einstellen

Standard:

```bash
python3 raspberry_wifi_position.py
```

Wenn zu viele neue Orte entstehen, mache die Erkennung toleranter:

```bash
python3 raspberry_wifi_position.py --auto-learn-threshold 25
```

Wenn zu wenige neue Orte entstehen, mache sie empfindlicher:

```bash
python3 raspberry_wifi_position.py --auto-learn-threshold 12
```

Auto-Lernen ausschalten:

```bash
python3 raspberry_wifi_position.py --no-auto-learn
```

Intervall setzen:

```bash
python3 raspberry_wifi_position.py --interval 1
python3 raspberry_wifi_position.py --interval 2
```

## Raspberry Pi vorbereiten

Kopiere `raspberry_wifi_position.py` auf den Raspberry Pi.

Falls keine Netzwerke gefunden werden, installiere/verwende eines dieser Tools:

```bash
sudo apt update
sudo apt install wireless-tools network-manager
```

## Manuelle Referenzpunkte optional

Du kannst Orte weiterhin selbst benennen:

```bash
python3 raspberry_wifi_position.py --calibrate Schreibtisch --x 0 --z 0
python3 raspberry_wifi_position.py --calibrate Tuer --x 3 --z 0
python3 raspberry_wifi_position.py --calibrate Fenster --x 1.5 --z 2
```

Diese Namen werden dann statt `Ort 1`, `Ort 2` angezeigt.

## ESP32 verwenden

Die Datei `esp32_wifi_scan_position.ino` scannt WLAN-Netzwerke mit dem ESP32 ca. alle 1,5 Sekunden und schreibt den aktuellen Scan nach:

```text
/position/wifi/current
```

Der ESP32-Code schaetzt noch keinen Ort. Die eigentliche Schaetzung und das automatische Lernen macht der Raspberry-Pi-Code, weil Python dafuer flexibler ist.

## Erwartete Genauigkeit

Realistisch ist ungefaehr:

- gleicher Raum / Bereich: oft gut erkennbar
- exakte Koordinaten: nur grob
- Fehler: je nach WLAN-Umgebung ca. 1-5 Meter

Die Werte koennen springen, wenn sich Tueren, Menschen, Router oder der Standort des Raspberry Pi veraendern.

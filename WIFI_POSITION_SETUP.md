# WLAN-Ortung mit Raspberry Pi und ESP32

Diese Loesung ist keine echte GPS-Ortung. Sie nutzt WLAN-Fingerprinting: An bekannten Orten werden WLAN-Signalstaerken gespeichert. Danach wird der aktuelle Scan mit diesen Referenzpunkten verglichen.

## Firebase-Pfade

Die Website liest:

- `/position/estimate` fuer den geschaetzten Ort
- `/position/wifi/current` fuer den letzten WLAN-Scan
- `/position/fingerprints` fuer gespeicherte Referenzpunkte

Die Website aktualisiert automatisch, sobald Firebase neue Werte bekommt. Raspberry Pi und ESP32 senden standardmaessig ca. alle 1,5 Sekunden neue WLAN-Daten.

## Raspberry Pi verwenden

Der Raspberry Pi kann Referenzpunkte kalibrieren und danach selbst die Position schaetzen.

### 1. Datei auf den Raspberry Pi kopieren

Kopiere `raspberry_wifi_position.py` auf den Raspberry Pi.

### 2. Testen, ob WLAN-Scan funktioniert

```bash
python3 raspberry_wifi_position.py --calibrate Test --x 0 --z 0
```

Falls keine Netzwerke gefunden werden, installiere/verwende eines dieser Tools:

```bash
sudo apt update
sudo apt install wireless-tools network-manager
```

### 3. Referenzpunkte speichern

Gehe mit dem Raspberry Pi an eine bekannte Position und fuehre aus:

```bash
python3 raspberry_wifi_position.py --calibrate Schreibtisch --x 0 --z 0
```

Dann an eine andere Position:

```bash
python3 raspberry_wifi_position.py --calibrate Tuer --x 3 --z 0
```

Und noch eine Position:

```bash
python3 raspberry_wifi_position.py --calibrate Fenster --x 1.5 --z 2
```

Je mehr Referenzpunkte du speicherst, desto besser wird die Schaetzung.

### 4. Ortung starten

```bash
python3 raspberry_wifi_position.py
```

Der Raspberry Pi scannt dann ca. alle 1,5 Sekunden und schreibt die geschaetzte Position nach Firebase. Die Website zeigt diese Daten automatisch an.

Du kannst das Intervall auch selbst setzen:

```bash
python3 raspberry_wifi_position.py --interval 1
python3 raspberry_wifi_position.py --interval 2
```

## ESP32 verwenden

Die Datei `esp32_wifi_scan_position.ino` scannt WLAN-Netzwerke mit dem ESP32 ca. alle 1,5 Sekunden und schreibt den aktuellen Scan nach:

```text
/position/wifi/current
```

Der ESP32-Code schaetzt noch keinen Ort. Die eigentliche Schaetzung macht der Raspberry-Pi-Code, weil Python dafuer flexibler ist.

## Erwartete Genauigkeit

Realistisch ist ungefaehr:

- gleicher Raum / Bereich: oft gut erkennbar
- exakte Koordinaten: nur grob
- Fehler: je nach WLAN-Umgebung ca. 1-5 Meter

Die Werte springen mehr, wenn sich Tueren, Menschen, Router oder der Standort des Raspberry Pi veraendern.

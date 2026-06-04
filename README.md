# flathead

Weboberfläche für das mobile Gefahrenerkennungssystem Flathead.

## Aufbau

Die Startseite hat drei Tabs:

1. **Sensor-Daten Dashboard**
   - Temperatur außen / innen
   - Luftfeuchtigkeit außen / innen
   - Himmelsrichtung
   - Distanz zu Objekten
2. **Aufenthaltsort des Raspberrys**
   - GPS-Daten
   - Karte
   - Wegpunkte
   - X/Z-Zielkoordinaten für den ESP32
3. **Live Kamera Feed**
   - MJPEG/Video-Stream über eine konfigurierbare URL

## Datenquelle

Die Website liest Sensordaten und Standortdaten aus Firebase Realtime Database.

Aktuell verwendete Pfade:

- `sensor`
- `location`

Die erwarteten Werte sind einfach gehalten:

```json
{
  "temperature": 22.1,
  "humidity": 45.2,
  "distance": 86
}
```

```json
{
  "lat": 48.2082,
  "lng": 16.3738
}
```

## ESP32-Steuerung

Zielkoordinaten werden per `POST` an die URL in `app.js` gesendet:

```js
espCommandUrl: "http://192.168.68.136:5000/api/esp32/target"
```

Für einen einzelnen Zielpunkt wird gesendet:

```json
{
  "x": 12.5,
  "z": 8.0,
  "timestamp": 1710000000000
}
```

Für mehrere Wegpunkte wird gesendet:

```json
{
  "type": "waypoints",
  "waypoints": [
    { "x": 12.5, "z": 8.0 }
  ],
  "createdAt": 1710000000000
}
```

## Schnellstart lokal

Starte im Projektordner einen einfachen lokalen Webserver:

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080
```

## Dateien

- `index.html`: Struktur der Oberfläche und Tabs
- `style.css`: Layout und Design
- `app.js`: Tab-Wechsel, Firebase-Daten, Karte, Kamera und ESP32-Kommandos

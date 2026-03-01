# flathead

Weboberfläche für das mobile Gefahrenerkennungssystem Flathead.

## Aufbau

Die Startseite hat drei Bereiche:

1. **Sensor-Daten Dashboard**
   - Temperatur außen / innen
   - Luftfeuchtigkeit außen / innen
   - Himmelsrichtung
   - Distanz zu Objekten (10s Update)
   - **Option 1:** Node-RED Dashboard direkt als iFrame eingebettet
   - **Option 2:** Eigene HTML-Grafiken (Chart.js) mit Daten aus Node-RED Backend
2. **Aufenthaltsort des Raspberry**
   - GPS-Daten
3. **Live Kamera Feed**
   - Frei konfigurierbare Stream-URL (z. B. MJPEG/HLS)

Zusätzlich gibt es einen Ideenblock für GPS-/LoRa-Integration.

## Erwartete Node-RED Endpunkte

- `GET /api/sensors/latest`

```json
{
  "temperature": { "outside": 13.4, "inside": 22.1 },
  "humidity": { "outside": 72.5, "inside": 45.2 },
  "heading": { "deg": 211, "cardinal": "SW" },
  "distanceCm": 86,
  "timestamp": 1710000000000
}
```

- `GET /api/sensors/history`

```json
[
  {
    "temperature": { "outside": 13.4, "inside": 22.1 },
    "humidity": { "outside": 72.5, "inside": 45.2 },
    "timestamp": 1710000000000
  },
  {
    "temperature": { "outside": 13.6, "inside": 22.0 },
    "humidity": { "outside": 72.1, "inside": 45.0 },
    "timestamp": 1710000060000
  }
]
```

- `GET /api/location/latest`

```json
{
  "lat": 48.2082,
  "lng": 16.3738,
  "accuracyM": 9,
  "source": "GPS + LoRa",
  "timestamp": 1710000000000
}
```

## Node-RED in Website einbetten (Lösung 1)

1. Öffne `app.js`
2. Setze:

```js
nodeRedDashboardUrl: 'http://RASPBERRY_PI:1880/ui'
```

3. Stelle in Node-RED sicher, dass `ui` erreichbar ist.
4. Falls die Website auf anderer Domain läuft, setze in Node-RED/Caddy/Nginx passende Header (`X-Frame-Options`/`Content-Security-Policy`), damit iFrame-Einbettung erlaubt ist.

## Eigene HTML-Grafiken aus Node-RED Daten (Lösung 2)

- Die Seite rendert Chart.js Grafiken in `index.html` (Canvas).
- `app.js` lädt periodisch `sensorHistoryUrl` und aktualisiert die Kurven.
- So bleibt das Frontend komplett in deiner Website, während Node-RED nur Daten liefert.

## Schnellstart

Öffne `index.html` lokal oder serviere das Repo mit einem simplen Webserver, zum Beispiel:

```bash
python3 -m http.server 8080
```

Dann im Browser:

`http://localhost:8080`

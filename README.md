# flathead

Weboberfläche für das mobile Gefahrenerkennungssystem Flathead.

## Aufbau

Die Startseite hat drei Bereiche:

1. **Sensor-Daten Dashboard**
   - Temperatur außen / innen
   - Humidity außen / innen
   - Himmelsrichtung
   - Distanz zu Objekten (10s Update)
2. **Aufenthaltsort des Raspberry**
   - GPS-Daten auf Leaflet-Karte
3. **Live Kamera Feed**
   - Frei konfigurierbare Stream-URL (z. B. MJPEG/HLS)

Zusätzlich gibt es einen Ideenblock für GPS-/LoRa-Integration.

## Erwartete Node-RED Endpunkte

- `GET /api/sensors`

```json
{
  "tempOutside": 13.4,
  "tempInside": 22.1,
  "humidityOutside": 72.5,
  "humidityInside": 45.2,
  "heading": 211,
  "direction": "SW",
  "distanceCm": 86
}
```

- `GET /api/location`

```json
{
  "lat": 48.2082,
  "lng": 16.3738,
  "accuracy": 9,
  "source": "GPS + LoRa",
  "ts": 1710000000000
}
```

Wenn kein Endpunkt erreichbar ist, zeigt die Oberfläche Demo-Werte an.

## Schnellstart

Öffne `index.html` lokal oder serviere das Repo mit einem simplen Webserver, zum Beispiel:

```bash
python3 -m http.server 8080
```

Dann im Browser:

`http://localhost:8080`

# flathead

Weboberfläche für das mobile Gefahrenerkennungssystem Flathead.

## Aufbau

Die Startseite hat drei Bereiche:

1. **Sensor-Daten Dashboard**
   - Temperatur außen / innen
   - Humidity außen / innen
   - Himmelsrichtung
   - Distanz zu Objekten (10s Update)
   - Verlaufsdiagramme (letzte 20 Werte) für Temperatur & Luftfeuchtigkeit
   - Optionales Embed eines bestehenden Node-RED Dashboards (`iframe`)
2. **Aufenthaltsort des Raspberry**
   - GPS-Daten
3. **Live Kamera Feed**
   - Frei konfigurierbare Stream-URL (z. B. MJPEG/HLS)

## Erwartete Node-RED Endpunkte

- `GET /api/sensors/latest`

```json
{
  "temperature": {
    "outside": 13.4,
    "inside": 22.1
  },
  "humidity": {
    "outside": 72.5,
    "inside": 45.2
  },
  "heading": {
    "deg": 211,
    "cardinal": "SW"
  },
  "distanceCm": 86
}
```

- `GET /api/location/latest`

```json
{
  "lat": 48.2082,
  "lng": 16.3738,
  "accuracyM": 9,
  "timestamp": 1710000000000
}
```

## Lösung 1: Node-RED Dashboard in Website einbetten

Wenn du bereits ein Node-RED Dashboard gebaut hast (z. B. unter `/ui`), kannst du es direkt einbetten:

1. Öffne `app.js`
2. Setze `nodeRedDashboardEmbedUrl`, z. B.:

```js
nodeRedDashboardEmbedUrl: 'http://localhost:1880/ui',
```

Dann erscheint es im Dashboard-Tab in der Karte **"Node-RED Dashboard einbetten (Lösung 1)"**.

## Lösung 2: Grafiken direkt aus Backend-Daten erzeugen

Ohne Node-RED UI kannst du nur JSON-Endpunkte liefern (`/api/sensors/latest`) und das Frontend zeichnet die Diagramme selbst. Diese Variante ist oft flexibler für Branding und Website-Integration.

## Schnellstart

Öffne `index.html` lokal oder serviere das Repo mit einem simplen Webserver, zum Beispiel:

```bash
python3 -m http.server 8080
```

Dann im Browser:

`http://localhost:8080`

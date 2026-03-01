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

---

## Lösung 2 (deine Wahl): Node-RED als Backend, Grafiken in deiner Website

Hier ist eine **sehr einfache Schritt-für-Schritt-Anleitung**, damit du genau weißt, was du wo machen musst.

### Schritt 1: Node-RED starten

Auf dem Raspberry (oder Server), wo Node-RED läuft:

```bash
node-red
```

Danach im Browser öffnen:

- `http://<DEINE-IP>:1880`

---

### Schritt 2: Sensor-Daten in Node-RED reinholen

In Node-RED brauchst du eine Datenquelle, z. B.:

- MQTT (`mqtt in` Node)
- HTTP (`http in` Node)
- Seriell / GPIO

Wichtig ist nur: Du musst am Ende ein JSON-Objekt bauen, das zur Struktur oben passt.

Tipp: Mit `function` Node kannst du dein Format erzwingen.

Beispiel in einer `function` Node:

```js
msg.payload = {
  temperature: { outside: 13.4, inside: 22.1 },
  humidity: { outside: 72.5, inside: 45.2 },
  heading: { deg: 211, cardinal: 'SW' },
  distanceCm: 86,
  timestamp: Date.now()
};
return msg;
```

---

### Schritt 3: Endpoint `/api/sensors/latest` bauen

1. Node hinzufügen: `http in`
   - Method: `GET`
   - URL: `/api/sensors/latest`
2. Dann `function` oder gespeicherten letzten Sensorwert anhängen
3. Dann `http response`

Ergebnis: Beim Aufruf `http://<DEINE-IP>:1880/api/sensors/latest` kommt dein JSON.

---

### Schritt 4: Endpoint `/api/sensors/history` bauen (für die Charts)

Die Website-Charts brauchen eine **Liste** mit Zeitpunkten.

1. Lege in Node-RED eine kleine Historie an (z. B. in `flow context`)
2. Speichere bei jedem neuen Sensorwert den Punkt in ein Array
3. Begrenze z. B. auf letzte 50–200 Einträge
4. Liefere dieses Array bei `GET /api/sensors/history`

Beispiel-Logik in `function` Node (beim Eintreffen neuer Messung):

```js
let hist = flow.get('hist') || [];
hist.push(msg.payload);
if (hist.length > 100) hist.shift();
flow.set('hist', hist);
return msg;
```

Beispiel für den History-Endpoint:

```js
msg.payload = flow.get('hist') || [];
return msg;
```

---

### Schritt 5: Endpoint `/api/location/latest` bauen (optional aber empfohlen)

Gleiches Prinzip wie bei Sensoren:

- `GET /api/location/latest`
- JSON mit `lat`, `lng`, `accuracyM`, `timestamp`

---

### Schritt 6: In dieser Website nur `app.js` anpassen

Öffne `app.js` und prüfe diese Einträge:

```js
sensorUrl: '/api/sensors/latest',
sensorHistoryUrl: '/api/sensors/history',
locationUrl: '/api/location/latest',
chartPollMs: 30000,
```

Wenn Website und Node-RED **nicht** auf derselben Domain/Port laufen, trage volle URLs ein, z. B.:

```js
sensorUrl: 'http://192.168.1.50:1880/api/sensors/latest',
sensorHistoryUrl: 'http://192.168.1.50:1880/api/sensors/history',
locationUrl: 'http://192.168.1.50:1880/api/location/latest',
```

---

### Schritt 7: CORS freigeben (nur wenn andere Domain/Port)

Wenn Browserfehler wie CORS kommen:

- Node-RED hinter Reverse Proxy (Nginx/Caddy) mit CORS Headern
- oder alles über dieselbe Domain bereitstellen

Einfachster Weg für Einsteiger: Website + API unter derselben Basis-URL hosten.

---

### Schritt 8: Testen

1. API im Browser testen:
   - `/api/sensors/latest`
   - `/api/sensors/history`
2. Website öffnen
3. Prüfen, ob Zahlen + Kurven erscheinen

Wenn Kurven leer sind, ist meistens `history` kein Array oder `timestamp` fehlt.

---

## Mini-Dokumentation (für deinen Bericht)

Du kannst diesen Block fast direkt übernehmen:

### Architektur
- Sensoren senden Daten an Node-RED.
- Node-RED normalisiert die Daten in ein JSON-Format.
- Node-RED stellt REST-Endpunkte bereit (`latest`, `history`, `location`).
- Das Frontend lädt die Endpunkte zyklisch und zeichnet eigene Charts mit Chart.js.

### Datenfluss
1. Sensor -> Node-RED Input
2. Node-RED Function (Mapping/Validierung)
3. Speicherung letzter Wert + Historie
4. HTTP API liefert Daten
5. Frontend aktualisiert Kacheln und Diagramme

### Vorteile dieser Lösung
- Dashboard-Design bleibt in deiner Website (kein UI-Lock-in).
- Node-RED bleibt nur Daten-/Logik-Backend.
- Leicht erweiterbar um weitere Sensoren und Alarme.

---

## Optional: Node-RED in Website einbetten (Lösung 1)

1. Öffne `app.js`
2. Setze:

```js
nodeRedDashboardUrl: 'http://RASPBERRY_PI:1880/ui'
```

3. Stelle in Node-RED sicher, dass `ui` erreichbar ist.
4. Falls die Website auf anderer Domain läuft, setze passende Header (`X-Frame-Options`/`Content-Security-Policy`), damit iFrame-Einbettung erlaubt ist.

---

## Schnellstart lokal

Öffne `index.html` lokal oder serviere das Repo mit einem simplen Webserver, zum Beispiel:

```bash
python3 -m http.server 8080
```

Dann im Browser:

`http://localhost:8080`

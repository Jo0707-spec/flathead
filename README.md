# flathead

Diese Website ist für das Zugreifen auf das mobile Gefahrenerkennungssystem Flathead.

## Was die aktuelle App macht

Die aktuelle Web-App ist ein **Wegpunkte-Editor**:
- Marker auf der Karte setzen/verschieben/löschen
- Export als GeoJSON/CSV
- Wegpunkt per HTTP an den Server senden (`POST /api/waypoints`)

Die Sendelogik ist bereits in `app.js` enthalten.

---

## Node-RED: So verbindest du die Website (Schritt für Schritt)

### 1) Node-RED starten

Auf dem Raspberry Pi z. B.:

```bash
node-red
```

Dann im Browser öffnen:

`http://<raspberry-ip>:1880`

---

### 2) Endpoint für Wegpunkte anlegen (`POST /api/waypoints`)

In Node-RED folgende Nodes verbinden:

`http in (POST /api/waypoints)` → `json` → `function` → `debug` → `http response`

#### Node-Konfiguration

1. **http in**
   - Method: `POST`
   - URL: `/api/waypoints`

2. **json**
   - konvertiert den Body zu JSON

3. **function** (optional, zum Validieren/Formatieren)

```js
// erwartet: { deviceId, id, lat, lng, meta, ts }
const p = msg.payload || {};

if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
    msg.statusCode = 400;
    msg.payload = { ok: false, error: 'lat/lng fehlen oder sind ungültig' };
    return [null, msg];
}

// Beispiel: in globalem Speicher sammeln
let list = flow.get('waypoints') || [];
list.push({
    id: p.id || `wp_${Date.now()}`,
    deviceId: p.deviceId || 'unknown',
    lat: p.lat,
    lng: p.lng,
    meta: p.meta || {},
    ts: p.ts || Date.now()
});
flow.set('waypoints', list);

msg.payload = { ok: true, saved: true, count: list.length };
return [msg, null];
```

> In der Function-Node 2 Ausgänge konfigurieren:
> - Ausgang 1 = Erfolg
> - Ausgang 2 = Fehler (400)

4. **http response**
   - Bei Erfolg: Standard 200 + JSON-Antwort
   - Bei Fehlerzweig: `msg.statusCode = 400` wird genutzt

5. **debug**
   - zum Testen im Node-RED Debug-Fenster

---

### 3) CORS aktivieren (wichtig, falls Website und Node-RED auf verschiedenen Hosts laufen)

In `~/.node-red/settings.js`:

```js
httpNodeCors: {
    origin: "*",
    methods: "GET,PUT,POST,DELETE"
},
```

Dann Node-RED neu starten.

---

### 4) URL in der Website anpassen

Aktuell sendet die Website relativ an:

`/api/waypoints`

Wenn Frontend **nicht** direkt über Node-RED ausgeliefert wird, setz in `app.js` bei `fetch('/api/waypoints', ...)` die volle URL, z. B.:

```js
fetch('http://raspberrypi.local:1880/api/waypoints', ...)
```

---

### 5) Schnell testen

Mit cURL:

```bash
curl -X POST http://<raspberry-ip>:1880/api/waypoints \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"all","id":"wp_test","lat":48.2082,"lng":16.3738,"meta":{"note":"test"},"ts":1710000000000}'
```

Du solltest eine JSON-Antwort wie `{ "ok": true, ... }` bekommen.

---

## Optional: Sensor/GPS/Kamera später über Node-RED ergänzen

Wenn du wieder zur 3-Bereiche-Ansicht willst (Sensoren, Standort, Kamera), kannst du in Node-RED zusätzlich Endpoints bereitstellen:

- `GET /api/sensors`
- `GET /api/location`
- Kamera-Stream z. B. unter `/camera/stream` (MJPEG/HLS)

Dann kann das Frontend diese Daten zyklisch abrufen.

---

## Typische Fehler & Fixes

- **404 auf `/api/waypoints`** → URL/Methode in `http in` prüfen (`POST`!).
- **CORS Fehler im Browser** → `httpNodeCors` in `settings.js` aktivieren.
- **Payload leer** → `json` Node zwischen `http in` und `function` setzen.
- **Frontend erreicht Node-RED nicht** → IP/Port prüfen, ggf. Firewall.

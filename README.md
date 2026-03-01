# flathead

Weboberfläche für das mobile Gefahrenerkennungssystem Flathead.

## TL;DR – Node-RED so einfach, dass es wirklich jeder schafft

Wenn du nur das Wichtigste willst, mach **genau diese 6 Schritte**:

1. **Node-RED starten**
   ```bash
   node-red
   ```
2. Im Browser öffnen: `http://DEINE-IP:1880`
3. In Node-RED oben rechts auf **Import** klicken und Datei `node-red-flow-basic.json` importieren.
4. Auf **Deploy** klicken.
5. Diese URLs im Browser testen:
   - `http://DEINE-IP:1880/api/sensors/latest`
   - `http://DEINE-IP:1880/api/sensors/history`
   - `http://DEINE-IP:1880/api/location/latest`
6. In `app.js` die URLs eintragen (falls Website nicht auf demselben Host läuft).

Wenn diese 6 Schritte laufen, zeigt deine Website Werte + Charts an.

---

## Baby-Check Schritt-für-Schritt (mit "wo klicken")

### 1) Node-RED öffnen

- Auf deinem Raspberry / Server:
  ```bash
  node-red
  ```
- Im Browser: `http://DEINE-IP:1880`

### 2) Fertigen Basic-Flow importieren

- In Node-RED oben rechts auf **☰**
- **Import**
- Datei `node-red-flow-basic.json` auswählen
- **Import** drücken

Dieser Flow liefert dir sofort Demo-Daten über API-Endpunkte.

### 3) Deploy klicken

- Oben rechts auf den roten Button **Deploy**.

### 4) API testen (wichtig)

Öffne im Browser:

- `http://DEINE-IP:1880/api/sensors/latest`
- `http://DEINE-IP:1880/api/sensors/history`
- `http://DEINE-IP:1880/api/location/latest`

Wenn JSON angezeigt wird: ✅ API ist ok.

### 5) Website mit Node-RED verbinden

Öffne `app.js` und prüfe diese Werte:

```js
sensorUrl: '/api/sensors/latest',
sensorHistoryUrl: '/api/sensors/history',
locationUrl: '/api/location/latest',
chartPollMs: 30000,
```

#### Fall A: Website läuft auf dem gleichen Host wie Node-RED
Dann **so lassen** (relative URLs).

#### Fall B: Website läuft woanders
Trage volle URLs ein:

```js
sensorUrl: 'http://192.168.1.50:1880/api/sensors/latest',
sensorHistoryUrl: 'http://192.168.1.50:1880/api/sensors/history',
locationUrl: 'http://192.168.1.50:1880/api/location/latest',
```

### 6) Website starten

```bash
python3 -m http.server 8080
```

Dann: `http://localhost:8080`

---

## Was ist in `node-red-flow-basic.json` drin?

Der Basic-Flow macht absichtlich nur 3 Dinge:

- liefert einen aktuellen Sensorwert (`/api/sensors/latest`)
- liefert einen kleinen Verlauf für Charts (`/api/sensors/history`)
- liefert eine Demo-Position (`/api/location/latest`)

So kannst du **ohne echte Hardware** zuerst Frontend + API prüfen.

---

## Häufige Fehler (ultra-kurz)

- **Leere Charts** → `/api/sensors/history` liefert kein Array.
- **Fehler im Browser (CORS)** → Frontend und Node-RED auf gleiche Domain/Port legen oder CORS korrekt setzen.
- **404 bei API** → Flow nicht deployed oder URL falsch.

---

## Danach: echte Sensoren anschließen

Wenn alles läuft, ersetze im Flow die Demo-Funktion durch echte Inputs (MQTT, GPIO, Serial etc.).
Die API-Struktur soll gleich bleiben, dann muss das Frontend nicht geändert werden.

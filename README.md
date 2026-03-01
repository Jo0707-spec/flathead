# Flathead

Diese Website dient als Frontend für ein mobiles Gefahrenerkennungssystem mit Raspberry Pi.

## Seitenstruktur

1. **Sensor-Daten Dashboard**
   - Temperatur innen/außen
   - Luftfeuchtigkeit innen/außen
   - Himmelsrichtung
   - Distanz zu Objekten (mind. alle 10 Sekunden)
2. **Aufenthaltsort des Raspberry**
   - GPS-Position auf Karte
   - Ideen für LoRa/Node-RED Anbindung
3. **Live Kamera Feed**
   - Eingabe einer Stream-URL (z. B. MJPEG)

## Node-RED Integration (Beispiel)

Das Frontend versucht zyklisch Daten von folgendem Endpoint zu laden:

- `GET /api/telemetry/latest`

Beispiel-JSON:

```json
{
  "tempOutside": 8.4,
  "tempInside": 21.6,
  "humOutside": 68.2,
  "humInside": 47.1,
  "distanceCm": 132,
  "heading": 270,
  "lat": 48.2082,
  "lng": 16.3738,
  "ts": 1711234567890
}
```

Wenn noch kein Backend verfügbar ist, zeigt die Seite simulierte Demo-Daten an.

# GPX-Datei zu X/Y/Z-Koordinaten umrechnen

Die Website exportiert Wegpunkte als GPX-Datei. Ein Wegpunkt sieht ungefaehr so aus:

```xml
<wpt lat="48.208174" lon="16.373819">
  <ele>0.0</ele>
  <name>Tisch</name>
</wpt>
```

Dabei bedeutet:

- `lat`: Breitengrad, also Nord/Sued-Position
- `lon`: Laengengrad, also Ost/West-Position
- `ele`: Hoehe in Meter
- `name`: Name des Wegpunktes

## Warum GPS nicht direkt X/Y ist

GPS-Koordinaten sind Winkel auf der Erde. Fuer einen Roboter oder eine Karte im Raum braucht man meistens lokale Meter-Koordinaten:

- `x`: Meter nach Osten
- `y`: Meter nach Norden
- `z`: Hoehe in Meter

Dafuer nimmt man einen Startpunkt als Ursprung.

Beispiel:

```text
Startpunkt:
lat0 = 48.208174
lon0 = 16.373819
z0 = 0
```

Dann wird jeder andere GPS-Punkt relativ zu diesem Startpunkt gerechnet.

## Einfache Umrechnung fuer kleine Strecken

Fuer kleine Bereiche reicht diese Naeherung:

```text
x = (lon - lon0) * cos(lat0) * 111320
y = (lat - lat0) * 110540
z = ele - ele0
```

Wichtig: `cos(lat0)` braucht den Winkel in Radiant, nicht Grad.

## Beispiel in Python

```python
import math
import xml.etree.ElementTree as ET

GPX_NS = {"gpx": "http://www.topografix.com/GPX/1/1"}

lat0 = 48.208174
lon0 = 16.373819
ele0 = 0.0

lat0_rad = math.radians(lat0)

tree = ET.parse("flathead-wegpunkte.gpx")
root = tree.getroot()

for wpt in root.findall("gpx:wpt", GPX_NS):
    lat = float(wpt.attrib["lat"])
    lon = float(wpt.attrib["lon"])
    ele_node = wpt.find("gpx:ele", GPX_NS)
    name_node = wpt.find("gpx:name", GPX_NS)

    ele = float(ele_node.text) if ele_node is not None else 0.0
    name = name_node.text if name_node is not None else "Wegpunkt"

    x = (lon - lon0) * math.cos(lat0_rad) * 111320
    y = (lat - lat0) * 110540
    z = ele - ele0

    print(name, "x=", round(x, 2), "y=", round(y, 2), "z=", round(z, 2))
```

## Beispiel-Ausgabe

```text
Tisch x= 1.24 y= -0.58 z= 0.0
Fenster x= 3.81 y= 2.10 z= 0.0
```

Diese Werte koenntest du dann als lokale Zielkoordinaten fuer einen Roboter verwenden.

## Genauigkeit

Diese einfache Formel ist gut fuer kleine Bereiche, zum Beispiel Garten, Hof oder ein Schulprojekt. Fuer sehr grosse Strecken sollte man UTM oder eine richtige Geodaten-Bibliothek verwenden.

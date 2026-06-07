import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU",
  authDomain: "flathead-d96d6.firebaseapp.com",
  databaseURL: "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flathead-d96d6",
};

const config = {
  cameraFeedUrl: "https://unretaliating-armani-offensively.ngrok-free.dev/video_feed",
  sensorRefreshMs: 1500,
  mapCenter: {
    lat: 48.208174,
    lng: 16.373819,
  },
  mapSpanDeg: 0.002,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const menuButtons = document.querySelectorAll(".menu-btn");
  const panels = document.querySelectorAll(".panel");

  const sensorStatus = document.getElementById("sensor-status");
  const lastUpdated = document.getElementById("last-updated");
  const cameraFeedEl = document.getElementById("camera-feed");
  const cameraPlaceholderEl = document.getElementById("camera-placeholder");

  const fields = {
    temperature: document.getElementById("temperature"),
    heading: document.getElementById("heading"),
    humidity: document.getElementById("humidity"),
    distance: document.getElementById("distance"),
  };

  const waypointState = {
    items: [],
    selectedLat: config.mapCenter.lat,
    selectedLng: config.mapCenter.lng,
  };

  const waypointEls = {
    map: document.getElementById("waypoint-map"),
    form: document.getElementById("waypoint-form"),
    name: document.getElementById("waypoint-name"),
    lat: document.getElementById("waypoint-lat"),
    lng: document.getElementById("waypoint-lng"),
    ele: document.getElementById("waypoint-ele"),
    status: document.getElementById("waypoint-status"),
    list: document.getElementById("waypoint-list"),
    count: document.getElementById("waypoint-count"),
    selectedLat: document.getElementById("selected-lat"),
    selectedLng: document.getElementById("selected-lng"),
    exportGpx: document.getElementById("export-gpx"),
    clear: document.getElementById("clear-waypoints"),
  };

  setupTabs(menuButtons, panels);
  setupCameraFeed(cameraFeedEl, cameraPlaceholderEl);
  setupWaypointTools();
  listenToFirebase();

  function setupTabs(buttons, panelElements) {
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetPanel = document.getElementById(button.dataset.target);
        if (!targetPanel) return;

        buttons.forEach((item) => item.classList.toggle("active", item === button));
        panelElements.forEach((panel) => panel.classList.toggle("active", panel === targetPanel));
      });
    });
  }

  function listenToFirebase() {
    const sensorRef = ref(db, "sensor");
    const temperatureRef = ref(db, "sensor/temperature");
    const humidityRef = ref(db, "sensor/humidity");
    const distanceRef = ref(db, "sensors/distance");

    onValue(temperatureRef, (snapshot) => {
      if (snapshot.exists()) updateTemperatureUI(snapshot.val());
    });

    onValue(humidityRef, (snapshot) => {
      if (snapshot.exists()) updateHumidityUI(snapshot.val());
    });

    onValue(distanceRef, (snapshot) => {
      if (snapshot.exists()) updateDistanceUI(snapshot.val());
    });

    onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (data.heading !== undefined) updateHeadingUI(data.heading);
      setStatus("ok", "Sensordaten empfangen");
    });

    refreshArduinoSensors(temperatureRef, humidityRef, distanceRef);
    setInterval(
      () => refreshArduinoSensors(temperatureRef, humidityRef, distanceRef),
      config.sensorRefreshMs,
    );
  }

  async function refreshArduinoSensors(temperatureRef, humidityRef, distanceRef) {
    try {
      const [temperatureSnapshot, humiditySnapshot, distanceSnapshot] = await Promise.all([
        get(temperatureRef),
        get(humidityRef),
        get(distanceRef),
      ]);

      if (temperatureSnapshot.exists()) updateTemperatureUI(temperatureSnapshot.val());
      if (humiditySnapshot.exists()) updateHumidityUI(humiditySnapshot.val());
      if (distanceSnapshot.exists()) updateDistanceUI(distanceSnapshot.val());

      setStatus("ok", "Sensordaten aktualisiert");
    } catch (error) {
      setStatus("error", `Sensordaten konnten nicht geladen werden: ${error.message}`);
    }
  }

  function setupWaypointTools() {
    if (!waypointEls.map || !waypointEls.form) return;

    updateSelectedCoordinate(config.mapCenter.lat, config.mapCenter.lng);
    renderWaypoints();

    waypointEls.map.addEventListener("click", (event) => {
      const rect = waypointEls.map.getBoundingClientRect();
      const xRatio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const yRatio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const lng = config.mapCenter.lng + (xRatio - 0.5) * config.mapSpanDeg;
      const lat = config.mapCenter.lat + (0.5 - yRatio) * config.mapSpanDeg;

      updateSelectedCoordinate(lat, lng);
      setWaypointStatus("Koordinate aus Karte übernommen. Name eintragen und speichern.");
    });

    waypointEls.form.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = waypointEls.name.value.trim();
      const lat = Number(waypointEls.lat.value);
      const lng = Number(waypointEls.lng.value);
      const ele = Number(waypointEls.ele.value || 0);

      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(ele)) {
        setWaypointStatus("Bitte gültigen Namen, Latitude, Longitude und Höhe eingeben.");
        return;
      }

      waypointState.items.push({ name, lat, lng, ele, createdAt: new Date().toISOString() });
      waypointEls.name.value = "";
      renderWaypoints();
      setWaypointStatus(`Wegpunkt gespeichert: ${name}`);
    });

    waypointEls.exportGpx?.addEventListener("click", () => exportGpx());
    waypointEls.clear?.addEventListener("click", () => {
      waypointState.items = [];
      renderWaypoints();
      setWaypointStatus("Alle Wegpunkte gelöscht.");
    });
  }

  function updateSelectedCoordinate(lat, lng) {
    waypointState.selectedLat = lat;
    waypointState.selectedLng = lng;
    setText(waypointEls.selectedLat, safeValue(lat, 6));
    setText(waypointEls.selectedLng, safeValue(lng, 6));
    if (waypointEls.lat) waypointEls.lat.value = lat.toFixed(6);
    if (waypointEls.lng) waypointEls.lng.value = lng.toFixed(6);
  }

  function renderWaypoints() {
    if (!waypointEls.map || !waypointEls.list) return;

    waypointEls.map.querySelectorAll(".map-point, .map-point-label").forEach((item) => item.remove());
    waypointEls.list.innerHTML = "";
    setText(waypointEls.count, String(waypointState.items.length));

    waypointState.items.forEach((waypoint, index) => {
      addWaypointToMap(waypoint, index);
      addWaypointToList(waypoint, index);
    });
  }

  function addWaypointToMap(waypoint, index) {
    const xRatio = clamp(0.5 + (waypoint.lng - config.mapCenter.lng) / config.mapSpanDeg, 0, 1);
    const yRatio = clamp(0.5 - (waypoint.lat - config.mapCenter.lat) / config.mapSpanDeg, 0, 1);

    const point = document.createElement("div");
    point.className = "map-point";
    point.style.left = `${xRatio * 100}%`;
    point.style.top = `${yRatio * 100}%`;
    point.title = `${waypoint.name}: ${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)}`;
    waypointEls.map.appendChild(point);

    const label = document.createElement("span");
    label.className = "map-point-label";
    label.style.left = `${xRatio * 100}%`;
    label.style.top = `${yRatio * 100}%`;
    label.textContent = String(index + 1);
    waypointEls.map.appendChild(label);
  }

  function addWaypointToList(waypoint, index) {
    const item = document.createElement("li");
    item.className = "waypoint-item";

    const text = document.createElement("span");
    text.textContent = `${index + 1}. ${waypoint.name} · Lat ${waypoint.lat.toFixed(6)}, Lng ${waypoint.lng.toFixed(6)}, Z ${waypoint.ele.toFixed(1)} m`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Löschen";
    remove.addEventListener("click", () => {
      waypointState.items.splice(index, 1);
      renderWaypoints();
    });

    item.append(text, remove);
    waypointEls.list.appendChild(item);
  }

  function exportGpx() {
    if (waypointState.items.length === 0) {
      setWaypointStatus("Keine Wegpunkte zum Exportieren vorhanden.");
      return;
    }

    const gpx = buildGpx(waypointState.items);
    const blob = new Blob([gpx], { type: "application/gpx+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flathead-wegpunkte-${new Date().toISOString().slice(0, 10)}.gpx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setWaypointStatus("GPX-Datei exportiert.");
  }

  function buildGpx(waypoints) {
    const points = waypoints.map((waypoint) => `  <wpt lat="${escapeXml(waypoint.lat.toFixed(6))}" lon="${escapeXml(waypoint.lng.toFixed(6))}">
    <ele>${escapeXml(waypoint.ele.toFixed(1))}</ele>
    <name>${escapeXml(waypoint.name)}</name>
    <time>${escapeXml(waypoint.createdAt)}</time>
  </wpt>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Flathead Control Center" xmlns="http://www.topografix.com/GPX/1/1">
${points}
</gpx>
`;
  }

  function setWaypointStatus(message) {
    setText(waypointEls.status, message);
  }

  function setStatus(type, message) {
    if (!sensorStatus) return;
    sensorStatus.className = `status ${type}`;
    sensorStatus.textContent = message;
  }

  function setText(field, value) {
    if (field) field.textContent = value;
  }

  function safeValue(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toFixed(digits);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function updateTemperatureUI(temperature) {
    setText(fields.temperature, safeValue(temperature, 1));
    updateLastUpdated();
  }

  function updateHumidityUI(humidity) {
    setText(fields.humidity, safeValue(humidity, 1));
    updateLastUpdated();
  }

  function updateDistanceUI(distanceCm) {
    setText(fields.distance, safeValue(distanceCm, 1));
    updateLastUpdated();
  }

  function updateHeadingUI(heading) {
    const value = heading?.cardinal
      ? `${heading.cardinal} (${safeValue(heading.deg, 0)}°)`
      : "--";

    setText(fields.heading, value);
  }

  function updateLastUpdated() {
    if (!lastUpdated) return;
    lastUpdated.textContent = `Letztes Update: ${new Date().toLocaleTimeString("de-DE")}`;
  }

  function setupCameraFeed(feedEl, placeholderEl) {
    if (!feedEl || !placeholderEl) return;

    if (!config.cameraFeedUrl) {
      feedEl.style.display = "none";
      placeholderEl.style.display = "grid";
      return;
    }

    feedEl.src = config.cameraFeedUrl;
    feedEl.style.display = "block";
    placeholderEl.style.display = "none";
  }
});

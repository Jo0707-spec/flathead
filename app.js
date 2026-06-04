import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU",
  authDomain: "flathead-d96d6.firebaseapp.com",
  databaseURL: "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flathead-d96d6",
};

const config = {
  espCommandUrl: "http://192.168.68.136:5000/api/esp32/target",
  cameraFeedUrl: "https://unretaliating-armani-offensively.ngrok-free.dev/video",
  coordinateMapRange: 100,
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
    tempOut: document.getElementById("temp-out"),
    tempIn: document.getElementById("temp-in"),
    heading: document.getElementById("heading"),
    humOut: document.getElementById("hum-out"),
    humIn: document.getElementById("hum-in"),
    distance: document.getElementById("distance"),
    lat: document.getElementById("lat"),
    lng: document.getElementById("lng"),
  };

  let map = null;
  let liveLocationMarker = null;
  const waypointState = {
    items: [],
    markerLayer: null,
  };

  setupTabs(menuButtons, panels);
  setupCameraFeed(cameraFeedEl, cameraPlaceholderEl);
  initMap();
  setupGpsWaypointForm();
  setupEspForm();
  setupCoordinateMap();
  setupManualCoordinateForm();
  listenToFirebase();

  function setupTabs(buttons, panelElements) {
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const targetPanel = document.getElementById(targetId);
        if (!targetPanel) return;

        buttons.forEach((item) => item.classList.toggle("active", item === button));
        panelElements.forEach((panel) => panel.classList.toggle("active", panel === targetPanel));

        if (targetId === "location" && map) {
          setTimeout(() => map.invalidateSize(), 0);
        }
      });
    });
  }

  function listenToFirebase() {
    onValue(ref(db, "sensor"), (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      updateSensorUI({
        temperature: {
          outside: data.temperature,
          inside: data.temperature,
        },
        humidity: {
          outside: data.humidity,
          inside: data.humidity,
        },
        distanceCm: data.distance || 0,
        heading: data.heading || null,
      });

      setStatus("ok", "Sensordaten empfangen");
    });

    onValue(ref(db, "location"), (snapshot) => {
      const data = snapshot.val();
      if (data) updateLocationUI(data);
    });
  }

  function setStatus(type, message) {
    if (!sensorStatus) return;
    sensorStatus.className = `status ${type}`;
    sensorStatus.textContent = message;
  }

  function safeValue(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toFixed(digits);
  }

  function updateSensorUI(data) {
    fields.tempOut.textContent = safeValue(data?.temperature?.outside);
    fields.tempIn.textContent = safeValue(data?.temperature?.inside);
    fields.humOut.textContent = safeValue(data?.humidity?.outside);
    fields.humIn.textContent = safeValue(data?.humidity?.inside);
    fields.distance.textContent = safeValue(data?.distanceCm, 0);

    const heading = data?.heading;
    fields.heading.textContent = heading?.cardinal
      ? `${heading.cardinal} (${safeValue(heading.deg, 0)}°)`
      : "--";

    lastUpdated.textContent = `Letztes Update: ${new Date().toLocaleTimeString("de-DE")}`;
  }

  function updateLocationUI(data) {
    const lat = Number(data?.lat);
    const lng = Number(data?.lng);

    fields.lat.textContent = safeValue(lat, 6);
    fields.lng.textContent = safeValue(lng, 6);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      updateMapLocation(lat, lng);
    }
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json().catch(() => ({}));
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

  function initMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement || typeof window.L === "undefined") return;

    map = window.L.map(mapElement).setView([48.2082, 16.3738], 13);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap-Mitwirkende",
    }).addTo(map);

    waypointState.markerLayer = window.L.layerGroup().addTo(map);
  }

  function updateMapLocation(lat, lng) {
    if (!map || typeof window.L === "undefined") return;

    const coords = [lat, lng];
    if (!liveLocationMarker) {
      liveLocationMarker = window.L.marker(coords).addTo(map).bindPopup("Aktuelle Position");
    } else {
      liveLocationMarker.setLatLng(coords);
    }

    map.setView(coords, 16);
  }

  function setupGpsWaypointForm() {
    const waypointForm = document.getElementById("waypoint-form");
    const waypointNameInput = document.getElementById("waypoint-name");
    const waypointLatInput = document.getElementById("waypoint-lat");
    const waypointLngInput = document.getElementById("waypoint-lng");
    const waypointList = document.getElementById("waypoint-list");

    if (!waypointForm || !waypointList) return;

    waypointForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const lat = Number.parseFloat(waypointLatInput.value);
      const lng = Number.parseFloat(waypointLngInput.value);
      const name = waypointNameInput.value.trim() || `Wegpunkt ${waypointState.items.length + 1}`;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      waypointState.items.push({ name, lat, lng });
      renderGpsWaypointList(waypointList);
      waypointForm.reset();
    });

    waypointList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-waypoint-index]");
      if (!button) return;

      const waypointIndex = Number.parseInt(button.dataset.waypointIndex, 10);
      waypointState.items = waypointState.items.filter((_, index) => index !== waypointIndex);
      renderGpsWaypointList(waypointList);
    });
  }

  function renderGpsWaypointList(waypointList) {
    if (!waypointList || !waypointState.markerLayer || typeof window.L === "undefined") return;

    waypointList.innerHTML = "";
    waypointState.markerLayer.clearLayers();

    waypointState.items.forEach((waypoint, index) => {
      const item = document.createElement("li");
      item.className = "waypoint-item";
      item.innerHTML = `
        <span><strong>${waypoint.name}</strong> (${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)})</span>
        <button type="button" data-waypoint-index="${index}">Löschen</button>
      `;
      waypointList.appendChild(item);

      const marker = window.L.marker([waypoint.lat, waypoint.lng]).addTo(waypointState.markerLayer);
      marker.bindPopup(waypoint.name);
    });
  }

  function setupEspForm() {
    const espForm = document.getElementById("esp-form");
    const espXInput = document.getElementById("esp-x");
    const espZInput = document.getElementById("esp-z");
    const espStatus = document.getElementById("esp-status");

    if (!espForm || !espStatus) return;

    espForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const x = Number.parseFloat(espXInput.value);
      const z = Number.parseFloat(espZInput.value);

      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        espStatus.textContent = "Bitte gültige Zahlen für X und Z eingeben.";
        return;
      }

      espStatus.textContent = "Sende an ESP32...";

      try {
        await postJson(config.espCommandUrl, { x, z, timestamp: Date.now() });
        espStatus.textContent = `Gesendet: X=${x.toFixed(2)}, Z=${z.toFixed(2)} (${new Date().toLocaleTimeString("de-DE")})`;
        espForm.reset();
      } catch (error) {
        espStatus.textContent = `Senden fehlgeschlagen: ${error.message}`;
      }
    });
  }

  function setupCoordinateMap() {
    const coordinateMap = document.getElementById("coordinate-map");
    const mapLastPoint = document.getElementById("map-last-point");
    const waypointCount = document.getElementById("waypoint-count");
    const waypointList = document.getElementById("coordinate-waypoint-list");
    const waypointStatus = document.getElementById("waypoint-status");
    const sendWaypointsBtn = document.getElementById("send-waypoints");
    const clearWaypointsBtn = document.getElementById("clear-waypoints");

    if (!coordinateMap || !waypointCount || !waypointList || !waypointStatus) return;

    const waypoints = [];

    coordinateMap.addEventListener("click", (event) => {
      const rect = coordinateMap.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeZ = (event.clientY - rect.top) / rect.height;

      const x = ((relativeX * 2) - 1) * config.coordinateMapRange;
      const z = (1 - relativeZ * 2) * config.coordinateMapRange;
      const point = { x: Number(x.toFixed(1)), z: Number(z.toFixed(1)) };

      waypoints.push(point);
      appendCoordinateMarker(coordinateMap, point);
      mapLastPoint.textContent = `X=${point.x.toFixed(1)}, Z=${point.z.toFixed(1)}`;
      renderCoordinateWaypoints(waypoints, waypointCount, waypointList, waypointStatus);
    });

    clearWaypointsBtn?.addEventListener("click", () => {
      waypoints.length = 0;
      coordinateMap.querySelectorAll(".map-point").forEach((node) => node.remove());
      mapLastPoint.textContent = "--";
      renderCoordinateWaypoints(waypoints, waypointCount, waypointList, waypointStatus);
    });

    sendWaypointsBtn?.addEventListener("click", async () => {
      if (!waypoints.length) {
        waypointStatus.textContent = "Bitte zuerst Wegpunkte setzen.";
        return;
      }

      waypointStatus.textContent = "Sende Wegpunkte an ESP32 ...";

      try {
        await postJson(config.espCommandUrl, {
          type: "waypoints",
          waypoints,
          createdAt: Date.now(),
        });
        waypointStatus.textContent = `${waypoints.length} Wegpunkt(e) erfolgreich gesendet.`;
      } catch (error) {
        waypointStatus.textContent = `Fehler beim Senden: ${error.message}`;
      }
    });

    renderCoordinateWaypoints(waypoints, waypointCount, waypointList, waypointStatus);
  }

  function appendCoordinateMarker(coordinateMap, point) {
    const marker = document.createElement("div");
    marker.className = "map-point";

    const normalizedX = (point.x + config.coordinateMapRange) / (2 * config.coordinateMapRange);
    const normalizedZ = 1 - (point.z + config.coordinateMapRange) / (2 * config.coordinateMapRange);

    marker.style.left = `${Math.max(0, Math.min(1, normalizedX)) * 100}%`;
    marker.style.top = `${Math.max(0, Math.min(1, normalizedZ)) * 100}%`;
    marker.title = `X=${point.x.toFixed(1)}, Z=${point.z.toFixed(1)}`;

    coordinateMap.append(marker);
  }

  function renderCoordinateWaypoints(waypoints, waypointCount, waypointList, waypointStatus) {
    waypointCount.textContent = String(waypoints.length);
    waypointList.innerHTML = "";

    waypoints.forEach((point, index) => {
      const li = document.createElement("li");
      li.textContent = `#${index + 1}: X=${point.x.toFixed(1)}, Z=${point.z.toFixed(1)}`;
      waypointList.append(li);
    });

    waypointStatus.textContent = waypoints.length
      ? `${waypoints.length} Wegpunkt(e) bereit.`
      : "Noch keine Wegpunkte gesetzt.";
  }

  function setupManualCoordinateForm() {
    const coordForm = document.getElementById("manual-coord-form");
    const manualXInput = document.getElementById("manual-x");
    const manualZInput = document.getElementById("manual-z");
    const manualSendStatus = document.getElementById("manual-send-status");

    if (!coordForm || !manualSendStatus) return;

    coordForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const x = Number(manualXInput.value);
      const z = Number(manualZInput.value);

      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        manualSendStatus.textContent = "Bitte gültige Zahlen für X und Z eingeben.";
        return;
      }

      manualSendStatus.textContent = "Sende Koordinaten an ESP32 ...";

      try {
        await postJson(config.espCommandUrl, {
          type: "single-coordinate",
          x,
          z,
          createdAt: Date.now(),
        });
        manualSendStatus.textContent = `Gesendet: X=${x.toFixed(1)}, Z=${z.toFixed(1)}`;
      } catch (error) {
        manualSendStatus.textContent = `Senden fehlgeschlagen: ${error.message}`;
      }
    });
  }
});

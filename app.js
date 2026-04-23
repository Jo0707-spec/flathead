async function sendWaypoint() {
    const x = document.getElementById("x").value;
    const y = document.getElementById("y").value;

    await fetch("http://ESP_IP/waypoint", {
        method: "POST",
        body: JSON.stringify({
            x: x,
            y: y
        })
    });

    alert("Gesendet!");
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {

const firebaseConfig = {
  apiKey: "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU",
  authDomain: "flathead-d96d6.firebaseapp.com",
  databaseURL: "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flathead-d96d6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const config = {
  sensorUrl: 'http://192.168.68.136:5000/api/sensors/latest',
  locationUrl: 'http://192.168.68.136:5000/api/location/latest',
  espCommandUrl: 'http://192.168.68.136:5000/api/esp32/target',
  cameraFeedUrl: 'https://unretaliating-armani-offensively.ngrok-free.dev/video',
  sensorPollMs: 10000,
  locationPollMs: 15000,
};

const sensorRef = ref(db, "sensor");

onValue(sensorRef, (snapshot) => {
  const data = snapshot.val();

  if (!data) return;

  updateSensorUI({
    temperature: {
      outside: data.temperature,
      inside: data.temperature
    },
    humidity: {
      outside: data.humidity,
      inside: data.humidity
    },
    distanceCm: data.distance || 0,
    heading: null
  });

  const locationRef = ref(db, "location");

  onValue(locationRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) return;

  updateLocationUI(data);
});
const menuButtons = document.querySelectorAll('.menu-btn');
const panels = document.querySelectorAll('.panel');

const sensorStatus = document.getElementById('sensor-status');
const lastUpdated = document.getElementById('last-updated');

const fields = {
  tempOut: document.getElementById('temp-out'),
  tempIn: document.getElementById('temp-in'),
  heading: document.getElementById('heading'),
  humOut: document.getElementById('hum-out'),
  humIn: document.getElementById('hum-in'),
  distance: document.getElementById('distance'),
  lat: document.getElementById('lat'),
  lng: document.getElementById('lng'),
  accuracy: document.getElementById('accuracy'),
  gpsTs: document.getElementById('gps-ts'),
};

const cameraFeedEl = document.getElementById('camera-feed');
const cameraPlaceholderEl = document.getElementById('camera-placeholder');
const waypointForm = document.getElementById('waypoint-form');
const waypointNameInput = document.getElementById('waypoint-name');
const waypointLatInput = document.getElementById('waypoint-lat');
const waypointLngInput = document.getElementById('waypoint-lng');
const waypointList = document.getElementById('waypoint-list');
const espForm = document.getElementById('esp-form');
const espXInput = document.getElementById('esp-x');
const espZInput = document.getElementById('esp-z');
const espStatus = document.getElementById('esp-status');

const waypointState = {
  items: [],
  markerLayer: null,
};

let map = null;
let liveLocationMarker = null;

menuButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    menuButtons.forEach((button) => button.classList.remove('active'));
    panels.forEach((panel) => panel.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');
  });

function setStatus(type, message) {
  sensorStatus.className = `status ${type}`;
  sensorStatus.textContent = message;
}

function safeValue(value, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return value.toFixed(digits);
}

function updateSensorUI(data) {
  fields.tempOut.textContent = safeValue(data?.temperature?.outside);
  fields.tempIn.textContent = safeValue(data?.temperature?.inside);
  fields.humOut.textContent = safeValue(data?.humidity?.outside);
  fields.humIn.textContent = safeValue(data?.humidity?.inside);

  const heading = data?.heading;
  fields.heading.textContent = heading?.cardinal
    ? `${heading.cardinal} (${safeValue(heading.deg, 0)}°)`
    : '--';

  fields.distance.textContent = safeValue(data?.distanceCm, 0);
  lastUpdated.textContent = `Letztes Update: ${new Date().toLocaleTimeString('de-DE')}`;
}

function updateLocationUI(data) {
  const lat = data?.lat;
  const lng = data?.lng;

  if (fields.lat) fields.lat.textContent = safeValue(lat, 6);
  if (fields.lng) fields.lng.textContent = safeValue(lng, 6);
  if (fields.accuracy) fields.accuracy.textContent = safeValue(data?.accuracyM, 1);
  if (fields.gpsTs) {
    fields.gpsTs.textContent = data?.timestamp
      ? new Date(data.timestamp).toLocaleString('de-DE')
      : '--';

    fields.distance.textContent = safeValue(data?.distanceCm, 0);
    lastUpdated.textContent = `Letztes Update: ${new Date().toLocaleTimeString('de-DE')}`;
  }

  if (typeof lat === 'number' && typeof lng === 'number') {
    updateMapLocation(lat, lng);
  }
}

  function updateLocationUI(data) {
    if (fields.lat) fields.lat.textContent = safeValue(data?.lat, 6);
    if (fields.lng) fields.lng.textContent = safeValue(data?.lng, 6);
    if (fields.accuracy) fields.accuracy.textContent = safeValue(data?.accuracyM, 1);
    if (fields.gpsTs) {
      fields.gpsTs.textContent = data?.timestamp
        ? new Date(data.timestamp).toLocaleString('de-DE')
        : '--';
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} auf ${url}`);
    }

    return response.json();
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  }

  function renderWaypoints() {
    waypointCount.textContent = String(waypoints.length);

    waypointList.innerHTML = '';
    waypoints.forEach((point, index) => {
      const li = document.createElement('li');
      li.textContent = `#${index + 1}: X=${point.x.toFixed(1)}, Z=${point.z.toFixed(1)}`;
      waypointList.append(li);
    });

    waypointStatus.textContent = waypoints.length
      ? `${waypoints.length} Wegpunkt(e) bereit.`
      : 'Noch keine Wegpunkte gesetzt.';
  }

  function appendWaypointToMap(point) {
    const marker = document.createElement('div');
    marker.className = 'map-point';

    const { width, height } = coordinateMap.getBoundingClientRect();
    const normalizedX = (point.x + config.coordinateMapRange) / (2 * config.coordinateMapRange);
    const normalizedZ = 1 - ((point.z + config.coordinateMapRange) / (2 * config.coordinateMapRange));

    marker.style.left = `${Math.max(0, Math.min(1, normalizedX)) * width}px`;
    marker.style.top = `${Math.max(0, Math.min(1, normalizedZ)) * height}px`;
    marker.title = `X=${point.x.toFixed(1)}, Z=${point.z.toFixed(1)}`;

    coordinateMap.append(marker);
  }

  function clearMapMarkers() {
    coordinateMap.querySelectorAll('.map-point').forEach((node) => node.remove());
  }

  function setupCoordinateMap() {
    coordinateMap.addEventListener('click', (event) => {
      const rect = coordinateMap.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeZ = (event.clientY - rect.top) / rect.height;

      const x = ((relativeX * 2) - 1) * config.coordinateMapRange;
      const z = (1 - (relativeZ * 2)) * config.coordinateMapRange;

      const point = {
        x: Number(x.toFixed(1)),
        z: Number(z.toFixed(1)),
      };

      waypoints.push(point);
      appendWaypointToMap(point);
      mapLastPoint.textContent = `X=${point.x.toFixed(1)}, Z=${point.z.toFixed(1)}`;
      renderWaypoints();
    });

    clearWaypointsBtn.addEventListener('click', () => {
      waypoints.length = 0;
      clearMapMarkers();
      mapLastPoint.textContent = '--';
      renderWaypoints();
    });

    sendWaypointsBtn.addEventListener('click', async () => {
      if (!waypoints.length) {
        waypointStatus.textContent = 'Bitte zuerst Wegpunkte setzen.';
        return;
      }

      waypointStatus.textContent = 'Sende Wegpunkte an ESP32 ...';

      try {
        await postJson(config.esp32ControlUrl, {
          type: 'waypoints',
          waypoints,
          createdAt: Date.now(),
        });
        waypointStatus.textContent = `${waypoints.length} Wegpunkt(e) erfolgreich gesendet.`;
      } catch (error) {
        waypointStatus.textContent = `Fehler beim Senden: ${error.message}`;
      }
    });
  }

  function setupManualCoordinateForm() {
    coordForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const x = Number(manualXInput.value);
      const z = Number(manualZInput.value);

      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        manualSendStatus.textContent = 'Bitte gültige Zahlen für X und Z eingeben.';
        return;
      }

      manualSendStatus.textContent = 'Sende Koordinaten an ESP32 ...';

      try {
        await postJson(config.esp32ControlUrl, {
          type: 'single-coordinate',
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

  async function refreshSensors() {
    try {
      const data = await fetchJson(config.sensorUrl);
      updateSensorUI(data);
      setStatus('ok', 'Sensordaten empfangen');
    } catch (error) {
      setStatus('error', `Keine Sensordaten: ${error.message}`);
    }
  }

  async function refreshLocation() {
    try {
      const data = await fetchJson(config.locationUrl);
      updateLocationUI(data);
    } catch (error) {
      if (fields.gpsTs) {
        fields.gpsTs.textContent = `Fehler: ${error.message}`;
      }
    }
  }

  function setupCameraFeed() {
    if (!config.cameraFeedUrl) {
      cameraFeedEl.style.display = 'none';
      cameraPlaceholderEl.style.display = 'grid';
      return;
    }

function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement || typeof window.L === 'undefined') return;

  map = window.L.map(mapElement).setView([48.2082, 16.3738], 13);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-Mitwirkende',
  }).addTo(map);

  waypointState.markerLayer = window.L.layerGroup().addTo(map);
}

function updateMapLocation(lat, lng) {
  if (!map || typeof window.L === 'undefined') return;
  const coords = [lat, lng];

  if (!liveLocationMarker) {
    liveLocationMarker = window.L.marker(coords).addTo(map).bindPopup('Aktuelle Position');
  } else {
    liveLocationMarker.setLatLng(coords);
  }

  map.setView(coords, 16);
}

function renderWaypointList() {
  if (!waypointList || !waypointState.markerLayer || typeof window.L === 'undefined') return;
  waypointList.innerHTML = '';
  waypointState.markerLayer.clearLayers();

  waypointState.items.forEach((waypoint, index) => {
    const item = document.createElement('li');
    item.className = 'waypoint-item';
    item.innerHTML = `
      <span><strong>${waypoint.name}</strong> (${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)})</span>
      <button type="button" data-waypoint-index="${index}">Löschen</button>
    `;
    waypointList.appendChild(item);

    const marker = window.L.marker([waypoint.lat, waypoint.lng]).addTo(waypointState.markerLayer);
    marker.bindPopup(waypoint.name);
  });
}

function setupWaypointForm() {
  if (!waypointForm) return;

  waypointForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const lat = Number.parseFloat(waypointLatInput.value);
    const lng = Number.parseFloat(waypointLngInput.value);
    const name = waypointNameInput.value.trim() || `Wegpunkt ${waypointState.items.length + 1}`;

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    waypointState.items.push({ name, lat, lng });
    renderWaypointList();
    waypointForm.reset();
  });

  waypointList?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-waypoint-index]');
    if (!button) return;

    const waypointIndex = Number.parseInt(button.dataset.waypointIndex, 10);
    waypointState.items = waypointState.items.filter((_, index) => index !== waypointIndex);
    renderWaypointList();
  });
}

async function sendEspTarget(x, z) {
  const response = await fetch(config.espCommandUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      x,
      z,
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`ESP32 HTTP ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

function setupEspForm() {
  if (!espForm || !espStatus) return;

  espForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const x = Number.parseFloat(espXInput.value);
    const z = Number.parseFloat(espZInput.value);

    if (Number.isNaN(x) || Number.isNaN(z)) {
      espStatus.textContent = 'Bitte gültige Zahlen für X und Z eingeben.';
      return;
    }

    espStatus.textContent = 'Sende an ESP32...';

    try {
      await sendEspTarget(x, z);
      espStatus.textContent = `Gesendet: X=${x.toFixed(2)}, Z=${z.toFixed(2)} (${new Date().toLocaleTimeString('de-DE')})`;
      espForm.reset();
    } catch (error) {
      espStatus.textContent = `Senden fehlgeschlagen: ${error.message}`;
    }
  });
}


  setupCoordinateMap();
  setupManualCoordinateForm();
  renderWaypoints();

setupCameraFeed();
initMap();
setupWaypointForm();
setupEspForm();

  setupCameraFeed();
});

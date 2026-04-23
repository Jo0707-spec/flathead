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
    cameraFeedUrl: 'https://unretaliating-armani-offensively.ngrok-free.dev/video',
    esp32ControlUrl: 'http://192.168.68.136:5000/api/esp32/coordinates',
    sensorPollMs: 10000,
    locationPollMs: 15000,
    coordinateMapRange: 100,
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

    setStatus("ok", "LIVE Daten von Firebase");
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

  const coordForm = document.getElementById('manual-coord-form');
  const manualXInput = document.getElementById('manual-x');
  const manualZInput = document.getElementById('manual-z');
  const manualSendStatus = document.getElementById('manual-send-status');

  const coordinateMap = document.getElementById('coordinate-map');
  const mapLastPoint = document.getElementById('map-last-point');
  const waypointCount = document.getElementById('waypoint-count');
  const waypointList = document.getElementById('waypoint-list');
  const waypointStatus = document.getElementById('waypoint-status');
  const sendWaypointsBtn = document.getElementById('send-waypoints');
  const clearWaypointsBtn = document.getElementById('clear-waypoints');

  const waypoints = [];

  menuButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      menuButtons.forEach((button) => button.classList.remove('active'));
      panels.forEach((panel) => panel.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.add('active');
    });
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

    cameraFeedEl.src = config.cameraFeedUrl;
    cameraFeedEl.style.display = 'block';
    cameraPlaceholderEl.style.display = 'none';
  }

  setupCoordinateMap();
  setupManualCoordinateForm();
  renderWaypoints();

  setInterval(refreshSensors, config.sensorPollMs);
  setInterval(refreshLocation, config.locationPollMs);

  setupCameraFeed();
});

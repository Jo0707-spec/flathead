import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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
  sensorPollMs: 10000,
  locationPollMs: 15000,
  waypointPath: 'commands/waypoints',
  axisPath: 'commands/axis',
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
const commandStatus = document.getElementById('command-status');

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

const waypointForm = document.getElementById('waypoint-form');
const waypointLatInput = document.getElementById('waypoint-lat');
const waypointLngInput = document.getElementById('waypoint-lng');
const waypointLabelInput = document.getElementById('waypoint-label');
const axisForm = document.getElementById('axis-form');
const axisXInput = document.getElementById('axis-x');
const axisZInput = document.getElementById('axis-z');

const cameraFeedEl = document.getElementById('camera-feed');
const cameraPlaceholderEl = document.getElementById('camera-placeholder');

let map;
let currentMarker;
let waypointMarkers = [];

menuButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    menuButtons.forEach((button) => button.classList.remove('active'));
    panels.forEach((panel) => panel.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.add('active');

    if (target?.id === 'location' && map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  });
});

function setStatus(type, message) {
  sensorStatus.className = `status ${type}`;
  sensorStatus.textContent = message;
}

function setCommandStatus(type, message) {
  if (!commandStatus) return;
  commandStatus.className = `status ${type}`;
  commandStatus.textContent = message;
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

  if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
    updateCurrentLocationOnMap(data.lat, data.lng);
  }
}

function initMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer || typeof L === 'undefined') {
    setCommandStatus('error', 'Karte konnte nicht geladen werden.');
    return;
  }

  map = L.map('map').setView([48.1372, 11.5756], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap-Mitwirkende',
  }).addTo(map);

  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    waypointLatInput.value = lat.toFixed(6);
    waypointLngInput.value = lng.toFixed(6);
  });
}

function updateCurrentLocationOnMap(lat, lng) {
  if (!map) return;

  const target = [lat, lng];
  if (!currentMarker) {
    currentMarker = L.marker(target).addTo(map).bindPopup('Aktuelle Position');
    map.setView(target, 15);
    return;
  }

  currentMarker.setLatLng(target);
}

function addWaypointMarker(lat, lng, label) {
  if (!map) return;
  const marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup(label || 'Wegpunkt');
  waypointMarkers.push(marker);
}

async function sendWaypoint(lat, lng, label) {
  const waypointRef = push(ref(db, config.waypointPath));
  await set(waypointRef, {
    lat,
    lng,
    label: label || 'Wegpunkt',
    timestamp: serverTimestamp(),
  });
}

async function sendAxisCoordinates(x, z) {
  await set(ref(db, config.axisPath), {
    x,
    z,
    timestamp: serverTimestamp(),
  });
}

waypointForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const lat = Number(waypointLatInput.value);
  const lng = Number(waypointLngInput.value);
  const label = waypointLabelInput.value.trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    setCommandStatus('error', 'Bitte gültige Lat/Lng Koordinaten eingeben.');
    return;
  }

  try {
    await sendWaypoint(lat, lng, label);
    addWaypointMarker(lat, lng, label);
    setCommandStatus('ok', `Wegpunkt gesendet: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    waypointForm.reset();
  } catch (error) {
    setCommandStatus('error', `Wegpunkt konnte nicht gesendet werden: ${error.message}`);
  }
});

axisForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const x = Number(axisXInput.value);
  const z = Number(axisZInput.value);

  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    setCommandStatus('error', 'Bitte gültige X/Z Werte eingeben.');
    return;
  }

  try {
    await sendAxisCoordinates(x, z);
    setCommandStatus('ok', `X/Z gesendet: X=${x.toFixed(2)}, Z=${z.toFixed(2)}`);
    axisForm.reset();
  } catch (error) {
    setCommandStatus('error', `X/Z konnte nicht gesendet werden: ${error.message}`);
  }
});

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

initMap();
setInterval(refreshSensors, config.sensorPollMs);
setInterval(refreshLocation, config.locationPollMs);

setupCameraFeed();

});

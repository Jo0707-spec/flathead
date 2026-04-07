import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

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
  cameraFeedUrl: 'http://192.168.68.136:5000/video',
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
  fields.lat.textContent = safeValue(data?.lat, 6);
  fields.lng.textContent = safeValue(data?.lng, 6);
  fields.accuracy.textContent = safeValue(data?.accuracyM, 1);
  fields.gpsTs.textContent = data?.timestamp
    ? new Date(data.timestamp).toLocaleString('de-DE')
    : '--';
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
    fields.gpsTs.textContent = `Fehler: ${error.message}`;
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


setInterval(refreshSensors, config.sensorPollMs);
setInterval(refreshLocation, config.locationPollMs);

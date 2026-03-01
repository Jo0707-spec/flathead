const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('[data-target]');

function showView(id) {
  views.forEach((view) => view.classList.toggle('active', view.id === id || view.id === 'ideas'));
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => showView(btn.dataset.target));
});

// --- Sensor dashboard ---
const sensorFields = {
  tempOut: document.getElementById('tempOut'),
  tempIn: document.getElementById('tempIn'),
  humOut: document.getElementById('humOut'),
  humIn: document.getElementById('humIn'),
  heading: document.getElementById('heading'),
  distance: document.getElementById('distance')
};
const sensorStatus = document.getElementById('sensorStatus');

function setSensorStatus(text, isError = false) {
  sensorStatus.textContent = text;
  sensorStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function renderSensorData(data) {
  sensorFields.tempOut.textContent = `${data.tempOutside.toFixed(1)} °C`;
  sensorFields.tempIn.textContent = `${data.tempInside.toFixed(1)} °C`;
  sensorFields.humOut.textContent = `${data.humidityOutside.toFixed(1)} %`;
  sensorFields.humIn.textContent = `${data.humidityInside.toFixed(1)} %`;
  sensorFields.heading.textContent = `${data.heading.toFixed(0)} ° (${data.direction})`;
  sensorFields.distance.textContent = `${data.distanceCm.toFixed(0)} cm`;
}

function demoSensorData() {
  const heading = Math.random() * 360;
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return {
    tempOutside: 5 + Math.random() * 20,
    tempInside: 15 + Math.random() * 12,
    humidityOutside: 45 + Math.random() * 45,
    humidityInside: 30 + Math.random() * 45,
    heading,
    direction: dirs[Math.round(heading / 45) % dirs.length],
    distanceCm: 15 + Math.random() * 300
  };
}

async function fetchSensors() {
  try {
    const res = await fetch('/api/sensors');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    renderSensorData(payload);
    setSensorStatus(`Sensoren live von Node-RED (${new Date().toLocaleTimeString('de-DE')})`);
  } catch {
    const fallback = demoSensorData();
    renderSensorData(fallback);
    setSensorStatus('Demo-Werte aktiv. Für Live-Daten Node-RED Endpoint /api/sensors verbinden.', true);
  }
}

// --- Location map ---
const locSource = document.getElementById('locSource');
const locAccuracy = document.getElementById('locAccuracy');
const locTime = document.getElementById('locTime');
const locationStatus = document.getElementById('locationStatus');

const map = L.map('map').setView([48.2082, 16.3738], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap-Mitwirkende'
}).addTo(map);

const marker = L.marker([48.2082, 16.3738]).addTo(map);

function setLocationStatus(text, isError = false) {
  locationStatus.textContent = text;
  locationStatus.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function renderLocation(data) {
  marker.setLatLng([data.lat, data.lng]);
  marker.bindPopup(`Raspberry Position<br>${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`);
  map.panTo([data.lat, data.lng]);
  locSource.textContent = data.source || 'GPS';
  locAccuracy.textContent = data.accuracy ? `± ${data.accuracy} m` : '--';
  locTime.textContent = new Date(data.ts || Date.now()).toLocaleString('de-DE');
}

function demoLocation() {
  const baseLat = 48.2082;
  const baseLng = 16.3738;
  return {
    lat: baseLat + (Math.random() - 0.5) * 0.01,
    lng: baseLng + (Math.random() - 0.5) * 0.01,
    accuracy: 8 + Math.floor(Math.random() * 8),
    source: 'Demo GPS',
    ts: Date.now()
  };
}

async function fetchLocation() {
  try {
    const res = await fetch('/api/location');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    renderLocation(payload);
    setLocationStatus('Standort live von Node-RED geladen.');
  } catch {
    renderLocation(demoLocation());
    setLocationStatus('Demo-Standort aktiv. Für Live-Daten Endpoint /api/location bereitstellen.', true);
  }
}

// --- Camera feed ---
const cameraFeed = document.getElementById('cameraFeed');
const cameraFallback = document.getElementById('cameraFallback');
const cameraUrlInput = document.getElementById('cameraUrl');
const applyCameraUrlBtn = document.getElementById('applyCameraUrl');
const cameraStatus = document.getElementById('cameraStatus');

function applyCameraUrl(url) {
  if (!url) {
    cameraFeed.style.display = 'none';
    cameraFallback.style.display = 'grid';
    cameraStatus.textContent = 'Noch keine Kamera-URL gesetzt.';
    return;
  }

  cameraFeed.src = url;
  cameraFeed.style.display = 'block';
  cameraFallback.style.display = 'none';
  localStorage.setItem('cameraFeedUrl', url);
  cameraStatus.textContent = `Kamera geladen: ${url}`;
}

applyCameraUrlBtn.addEventListener('click', () => {
  applyCameraUrl(cameraUrlInput.value.trim());
});

cameraFeed.addEventListener('error', () => {
  cameraFeed.style.display = 'none';
  cameraFallback.style.display = 'grid';
  cameraStatus.textContent = 'Stream nicht erreichbar. Prüfe URL, CORS und Node-RED Freigabe.';
});

function initCamera() {
  const saved = localStorage.getItem('cameraFeedUrl') || '';
  cameraUrlInput.value = saved;
  applyCameraUrl(saved);
}

fetchSensors();
fetchLocation();
initCamera();
setInterval(fetchSensors, 10000);
setInterval(fetchLocation, 10000);

const menuButtons = document.querySelectorAll('.menu-btn');
const panels = {
  dashboard: document.getElementById('panel-dashboard'),
  location: document.getElementById('panel-location'),
  camera: document.getElementById('panel-camera')
};

function switchPanel(target) {
  menuButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === target));
  Object.entries(panels).forEach(([name, panel]) => panel.classList.toggle('active', name === target));
}

menuButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.target));
});

// Karte für GPS-Position
const map = L.map('map').setView([48.2082, 16.3738], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap-Mitwirkende'
}).addTo(map);
const gpsMarker = L.marker([48.2082, 16.3738]).addTo(map).bindPopup('Raspberry Position');

function headingToText(angle) {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const i = Math.round(((angle % 360) / 45)) % 8;
  return dirs[i];
}

function applyTelemetry(data) {
  document.getElementById('tempOutside').textContent = `${data.tempOutside?.toFixed?.(1) ?? '--'} °C`;
  document.getElementById('tempInside').textContent = `${data.tempInside?.toFixed?.(1) ?? '--'} °C`;
  document.getElementById('humOutside').textContent = `${data.humOutside?.toFixed?.(1) ?? '--'} %`;
  document.getElementById('humInside').textContent = `${data.humInside?.toFixed?.(1) ?? '--'} %`;

  if (typeof data.heading === 'number') {
    document.getElementById('heading').textContent = `${data.heading.toFixed(0)}°`;
    document.getElementById('headingText').textContent = headingToText(data.heading);
  }

  document.getElementById('distance').textContent = `${data.distanceCm?.toFixed?.(0) ?? '--'} cm`;

  if (typeof data.lat === 'number' && typeof data.lng === 'number') {
    gpsMarker.setLatLng([data.lat, data.lng]);
    map.panTo([data.lat, data.lng]);
    document.getElementById('lat').textContent = data.lat.toFixed(6);
    document.getElementById('lng').textContent = data.lng.toFixed(6);
  }

  if (data.ts) {
    document.getElementById('gpsTimestamp').textContent = new Date(data.ts).toLocaleString();
  }
}

// Live-Fetch als einfaches Beispiel für Node-RED HTTP-In
async function fetchTelemetry() {
  try {
    const response = await fetch('/api/telemetry/latest', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    applyTelemetry(payload);
  } catch {
    // still okay in demo mode
  }
}

// Demo-Fallback: simulierte Daten, falls noch kein Backend läuft
let simulatedHeading = 0;
function simulateTelemetry() {
  simulatedHeading = (simulatedHeading + 12) % 360;
  const demo = {
    tempOutside: 7 + Math.random() * 2,
    tempInside: 21 + Math.random() * 1.2,
    humOutside: 62 + Math.random() * 8,
    humInside: 44 + Math.random() * 4,
    distanceCm: 45 + Math.random() * 120,
    heading: simulatedHeading,
    lat: 48.2082 + ((Math.random() - 0.5) * 0.01),
    lng: 16.3738 + ((Math.random() - 0.5) * 0.01),
    ts: Date.now()
  };
  applyTelemetry(demo);
}

setInterval(fetchTelemetry, 5000);
setInterval(simulateTelemetry, 10000); // Distanz-Anzeige wird so mind. alle 10 s erneuert
fetchTelemetry();
simulateTelemetry();

// Kamera-Verbindung
const cameraFeed = document.getElementById('cameraFeed');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const connectCamera = document.getElementById('connectCamera');
const cameraUrlInput = document.getElementById('cameraUrl');

connectCamera.addEventListener('click', () => {
  const url = cameraUrlInput.value.trim();
  if (!url) return;

  cameraFeed.src = url;
  cameraFeed.style.display = 'block';
  cameraPlaceholder.style.display = 'none';
});

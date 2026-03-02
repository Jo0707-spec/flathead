const config = {
  // Passe die Endpunkte auf deine Node-RED HTTP-In Nodes an:
  sensorUrl: '/api/sensors/latest',
  locationUrl: '/api/location/latest',
  cameraFeedUrl: '',
  nodeRedDashboardEmbedUrl: '',
  sensorPollMs: 10000,
  locationPollMs: 15000,
  historyLimit: 20,
};

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

const nodeRedEmbedEl = document.getElementById('nodered-embed');
const nodeRedEmbedPlaceholderEl = document.getElementById('embed-placeholder');

const tempChartEl = document.getElementById('temp-chart');
const humChartEl = document.getElementById('hum-chart');

const history = {
  tempOutside: [],
  tempInside: [],
  humidityOutside: [],
  humidityInside: [],
};

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

function pushHistoryEntry(series, value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return;
  series.push(value);
  if (series.length > config.historyLimit) {
    series.shift();
  }
}

function buildPolyline(values, color, min, max) {
  if (!values.length || Number.isNaN(min) || Number.isNaN(max) || min === max) {
    return '';
  }

  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 35 - ((value - min) / (max - min)) * 30;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" />`;
}

function renderSparkline(svgEl, firstSeries, secondSeries) {
  const values = [...firstSeries, ...secondSeries];
  if (!values.length) {
    svgEl.innerHTML = '<text x="50" y="24" text-anchor="middle">Noch keine Daten</text>';
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  svgEl.innerHTML = [
    '<rect x="0" y="0" width="100" height="40" fill="transparent"></rect>',
    '<line x1="0" y1="35" x2="100" y2="35" stroke="#dbe1ea" stroke-width="0.8"></line>',
    buildPolyline(firstSeries, '#14532d', min, max),
    buildPolyline(secondSeries, '#2563eb', min, max),
  ].join('');
}

function renderCharts() {
  renderSparkline(tempChartEl, history.tempOutside, history.tempInside);
  renderSparkline(humChartEl, history.humidityOutside, history.humidityInside);
}

function updateSensorUI(data) {
  fields.tempOut.textContent = safeValue(data?.temperature?.outside);
  fields.tempIn.textContent = safeValue(data?.temperature?.inside);
  fields.humOut.textContent = safeValue(data?.humidity?.outside);
  fields.humIn.textContent = safeValue(data?.humidity?.inside);

  pushHistoryEntry(history.tempOutside, data?.temperature?.outside);
  pushHistoryEntry(history.tempInside, data?.temperature?.inside);
  pushHistoryEntry(history.humidityOutside, data?.humidity?.outside);
  pushHistoryEntry(history.humidityInside, data?.humidity?.inside);
  renderCharts();

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

function setupNodeRedEmbed() {
  if (!config.nodeRedDashboardEmbedUrl) {
    nodeRedEmbedEl.style.display = 'none';
    nodeRedEmbedPlaceholderEl.style.display = 'grid';
    return;
  }

  nodeRedEmbedEl.src = config.nodeRedDashboardEmbedUrl;
  nodeRedEmbedEl.style.display = 'block';
  nodeRedEmbedPlaceholderEl.style.display = 'none';
}

renderCharts();
refreshSensors();
refreshLocation();
setupCameraFeed();
setupNodeRedEmbed();

setInterval(refreshSensors, config.sensorPollMs);
setInterval(refreshLocation, config.locationPollMs);

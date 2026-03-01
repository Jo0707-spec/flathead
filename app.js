const config = {
  // Passe die Endpunkte auf deine Node-RED HTTP-In Nodes an:
  sensorUrl: 'http://192.168.68.122:1880/api/sensors/latest',
  sensorHistoryUrl: 'http://192.168.68.122:1880/api/sensors/history',
  locationUrl: 'http://192.168.68.122:1880/api/location/latest',
  chartPollMs: 30000,
  // Beispiel: 'http://raspberrypi.local:1880/ui' oder '/ui'
  nodeRedDashboardUrl: '',
  sensorPollMs: 10000,
  locationPollMs: 15000,
  chartPollMs: 30000,
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
const nodeRedFrameEl = document.getElementById('node-red-frame');
const iframePlaceholderEl = document.getElementById('iframe-placeholder');

let tempChart;
let humidityChart;

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

function createLineChart(elementId, label, color) {
  const canvas = document.getElementById(elementId);
  if (!canvas || typeof Chart === 'undefined') return null;

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.25,
        pointRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { maxTicksLimit: 6 },
        },
      },
      plugins: {
        legend: { display: true },
      },
    },
  });
}

function setupCharts() {
  tempChart = createLineChart('temp-chart', 'Temperatur außen (°C)', '#0ea5e9');
  humidityChart = createLineChart('humidity-chart', 'Luftfeuchtigkeit außen (%)', '#16a34a');
}

function updateChart(chart, labels, values) {
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.update();
}

async function refreshCharts() {
  try {
    const points = await fetchJson(config.sensorHistoryUrl);
    if (!Array.isArray(points) || points.length === 0) return;

    const labels = points.map((point) => {
      const ts = point?.timestamp;
      return ts ? new Date(ts).toLocaleTimeString('de-DE') : '--';
    });

    updateChart(tempChart, labels, points.map((point) => point?.temperature?.outside ?? null));
    updateChart(humidityChart, labels, points.map((point) => point?.humidity?.outside ?? null));
  } catch {
    // Graphen bleiben einfach auf dem letzten Stand.
  }
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
  if (!config.nodeRedDashboardUrl) {
    nodeRedFrameEl.style.display = 'none';
    iframePlaceholderEl.style.display = 'grid';
    return;
  }

  nodeRedFrameEl.src = config.nodeRedDashboardUrl;
  nodeRedFrameEl.style.display = 'block';
  iframePlaceholderEl.style.display = 'none';
}

setupCharts();
refreshSensors();
refreshLocation();
refreshCharts();
setupCameraFeed();
setupNodeRedEmbed();

setInterval(refreshSensors, config.sensorPollMs);
setInterval(refreshLocation, config.locationPollMs);
setInterval(refreshCharts, config.chartPollMs);

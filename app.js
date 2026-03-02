const config = {
  // Passe die Endpunkte auf deine Node-RED HTTP-In Nodes an:
  sensorUrl: '/api/sensors/latest',
  sensorHistoryUrl: '/api/sensors/history',
  locationUrl: '/api/location/latest',
  cameraFeedUrl: '',
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

function createLineChart(elementId, datasets) {
  const canvas = document.getElementById(elementId);
  if (!canvas || typeof Chart === 'undefined') return null;

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  });
}

function setupCharts() {
  tempChart = createLineChart('temp-chart', [
    {
      label: 'Außen (°C)',
      data: [],
      borderColor: '#0284c7',
      backgroundColor: '#0284c722',
      fill: true,
      tension: 0.25,
      pointRadius: 2,
    },
    {
      label: 'Innen (°C)',
      data: [],
      borderColor: '#f97316',
      backgroundColor: '#f9731622',
      fill: false,
      tension: 0.25,
      pointRadius: 2,
    },
  ]);

  humidityChart = createLineChart('humidity-chart', [
    {
      label: 'Außen (%)',
      data: [],
      borderColor: '#16a34a',
      backgroundColor: '#16a34a22',
      fill: true,
      tension: 0.25,
      pointRadius: 2,
    },
    {
      label: 'Innen (%)',
      data: [],
      borderColor: '#7c3aed',
      backgroundColor: '#7c3aed22',
      fill: false,
      tension: 0.25,
      pointRadius: 2,
    },
  ]);
}

function updateChart(chart, labels, dataSeries) {
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets.forEach((dataset, index) => {
    dataset.data = dataSeries[index] || [];
  });
  chart.update();
}

function syncSummaryTableWithHistory(points) {
  const latest = points[points.length - 1];
  if (!latest) return;

  const mergedData = {
    temperature: {
      outside: latest?.temperature?.outside,
      inside: latest?.temperature?.inside,
    },
    humidity: {
      outside: latest?.humidity?.outside,
      inside: latest?.humidity?.inside,
    },
  };

  updateSensorUI(mergedData);
}

async function refreshCharts() {
  try {
    const points = await fetchJson(config.sensorHistoryUrl);
    if (!Array.isArray(points) || points.length === 0) return;

    const labels = points.map((point) => {
      const ts = point?.timestamp;
      return ts ? new Date(ts).toLocaleTimeString('de-DE') : '--';
    });

    updateChart(tempChart, labels, [
      points.map((point) => point?.temperature?.outside ?? null),
      points.map((point) => point?.temperature?.inside ?? null),
    ]);

    updateChart(humidityChart, labels, [
      points.map((point) => point?.humidity?.outside ?? null),
      points.map((point) => point?.humidity?.inside ?? null),
    ]);

    syncSummaryTableWithHistory(points);
  } catch {
    // Graphen bleiben auf letztem Stand.
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

setupCharts();
refreshSensors();
refreshLocation();
refreshCharts();
setupCameraFeed();

setInterval(refreshSensors, config.sensorPollMs);
setInterval(refreshLocation, config.locationPollMs);
setInterval(refreshCharts, config.chartPollMs);

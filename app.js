import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU",
  authDomain: "flathead-d96d6.firebaseapp.com",
  databaseURL: "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flathead-d96d6",
};

const config = {
  espCommandUrl: "http://192.168.68.136:5000/api/esp32/target",
  cameraFeedUrl: "https://unretaliating-armani-offensively.ngrok-free.dev/video_feed",
  sensorRefreshMs: 1500,
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
    temperature: document.getElementById("temperature"),
    tempOut: document.getElementById("temp-out"),
    tempIn: document.getElementById("temp-in"),
    heading: document.getElementById("heading"),
    humidity: document.getElementById("humidity"),
    humOut: document.getElementById("hum-out"),
    humIn: document.getElementById("hum-in"),
    distance: document.getElementById("distance"),
    lat: document.getElementById("lat"),
    lng: document.getElementById("lng"),
    wifiPlace: document.getElementById("wifi-place"),
    wifiConfidence: document.getElementById("wifi-confidence"),
    wifiX: document.getElementById("wifi-x"),
    wifiZ: document.getElementById("wifi-z"),
    wifiSource: document.getElementById("wifi-source"),
    wifiDevice: document.getElementById("wifi-device"),
    wifiNetworkCount: document.getElementById("wifi-network-count"),
    wifiUpdated: document.getElementById("wifi-updated"),
  };

  setupTabs(menuButtons, panels);
  setupCameraFeed(cameraFeedEl, cameraPlaceholderEl);
  setupManualCoordinateForm();
  listenToFirebase();

  function setupTabs(buttons, panelElements) {
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetPanel = document.getElementById(button.dataset.target);
        if (!targetPanel) return;

        buttons.forEach((item) => item.classList.toggle("active", item === button));
        panelElements.forEach((panel) => panel.classList.toggle("active", panel === targetPanel));
      });
    });
  }

  function listenToFirebase() {
    const sensorRef = ref(db, "sensor");
    const temperatureRef = ref(db, "sensor/temperature");
    const humidityRef = ref(db, "sensor/humidity");
    const distanceRef = ref(db, "sensors/distance");

    onValue(temperatureRef, (snapshot) => {
      if (snapshot.exists()) updateTemperatureUI(snapshot.val());
    });

    onValue(humidityRef, (snapshot) => {
      if (snapshot.exists()) updateHumidityUI(snapshot.val());
    });

    onValue(distanceRef, (snapshot) => {
      if (snapshot.exists()) updateDistanceUI(snapshot.val());
    });

    onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (data.heading !== undefined) updateHeadingUI(data.heading);
      setStatus("ok", "Sensordaten empfangen");
    });

    refreshArduinoSensors(temperatureRef, humidityRef, distanceRef);
    setInterval(
      () => refreshArduinoSensors(temperatureRef, humidityRef, distanceRef),
      config.sensorRefreshMs,
    );

    onValue(ref(db, "position/estimate"), (snapshot) => {
      updateWifiPositionUI(snapshot.val());
    });

    onValue(ref(db, "position/wifi/current"), (snapshot) => {
      updateWifiScanUI(snapshot.val());
    });

    onValue(ref(db, "location"), (snapshot) => {
      const data = snapshot.val();
      if (data) updateLocationUI(data);
    });
  }

  async function refreshArduinoSensors(temperatureRef, humidityRef, distanceRef) {
    try {
      const [temperatureSnapshot, humiditySnapshot, distanceSnapshot] = await Promise.all([
        get(temperatureRef),
        get(humidityRef),
        get(distanceRef),
      ]);

      if (temperatureSnapshot.exists()) updateTemperatureUI(temperatureSnapshot.val());
      if (humiditySnapshot.exists()) updateHumidityUI(humiditySnapshot.val());
      if (distanceSnapshot.exists()) updateDistanceUI(distanceSnapshot.val());

      setStatus("ok", "Sensordaten aktualisiert");
    } catch (error) {
      setStatus("error", `Sensordaten konnten nicht geladen werden: ${error.message}`);
    }
  }

  function setStatus(type, message) {
    if (!sensorStatus) return;
    sensorStatus.className = `status ${type}`;
    sensorStatus.textContent = message;
  }

  function setText(field, value) {
    if (field) field.textContent = value;
  }

  function safeValue(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toFixed(digits);
  }

  function formatTime(timestamp) {
    const number = Number(timestamp);
    if (!Number.isFinite(number)) return "--";
    return new Date(number).toLocaleTimeString("de-DE");
  }

  function countNetworks(networks) {
    if (!networks || typeof networks !== "object") return 0;
    return Object.keys(networks).length;
  }

  function updateTemperatureUI(temperature) {
    const value = safeValue(temperature, 1);
    setText(fields.temperature, value);
    setText(fields.tempOut, value);
    setText(fields.tempIn, value);
    updateLastUpdated();
  }

  function updateHumidityUI(humidity) {
    const value = safeValue(humidity, 1);
    setText(fields.humidity, value);
    setText(fields.humOut, value);
    setText(fields.humIn, value);
    updateLastUpdated();
  }

  function updateDistanceUI(distanceCm) {
    setText(fields.distance, safeValue(distanceCm, 1));
    updateLastUpdated();
  }

  function updateHeadingUI(heading) {
    const value = heading?.cardinal
      ? `${heading.cardinal} (${safeValue(heading.deg, 0)}°)`
      : "--";

    setText(fields.heading, value);
  }

  function updateWifiPositionUI(data) {
    if (!data) {
      setText(fields.wifiPlace, "--");
      setText(fields.wifiConfidence, "--");
      setText(fields.wifiX, "--");
      setText(fields.wifiZ, "--");
      setText(fields.wifiSource, "--");
      return;
    }

    setText(fields.wifiPlace, data.name || "Unbekannt");
    setText(fields.wifiConfidence, safeValue(data.confidence, 0));
    setText(fields.wifiX, safeValue(data.x, 2));
    setText(fields.wifiZ, safeValue(data.z, 2));
    setText(fields.wifiSource, data.source || "--");
  }

  function updateWifiScanUI(data) {
    if (!data) {
      setText(fields.wifiDevice, "--");
      setText(fields.wifiNetworkCount, "--");
      setText(fields.wifiUpdated, "--");
      return;
    }

    setText(fields.wifiDevice, data.device || "--");
    setText(fields.wifiNetworkCount, String(countNetworks(data.networks)));
    setText(fields.wifiUpdated, formatTime(data.updatedAt));
  }

  function updateLastUpdated() {
    if (!lastUpdated) return;
    lastUpdated.textContent = `Letztes Update: ${new Date().toLocaleTimeString("de-DE")}`;
  }

  function updateLocationUI(data) {
    setText(fields.lat, safeValue(data?.lat, 6));
    setText(fields.lng, safeValue(data?.lng, 6));
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

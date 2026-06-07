import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU",
  authDomain: "flathead-d96d6.firebaseapp.com",
  databaseURL: "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flathead-d96d6",
};

const config = {
  espCommandUrl: "http://192.168.68.136:5000/api/esp32/target",
  cameraFeedUrl: "https://unretaliating-armani-offensively.ngrok-free.dev/video_feed",
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
    tempOut: document.getElementById("temp-out"),
    tempIn: document.getElementById("temp-in"),
    heading: document.getElementById("heading"),
    humOut: document.getElementById("hum-out"),
    humIn: document.getElementById("hum-in"),
    distance: document.getElementById("distance"),
    lat: document.getElementById("lat"),
    lng: document.getElementById("lng"),
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
    onValue(ref(db, "sensor"), (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      updateSensorUI({
        temperature: {
          outside: data.temperature,
          inside: data.temperature,
        },
        humidity: {
          outside: data.humidity,
          inside: data.humidity,
        },
        distanceCm: data.distance || 0,
        heading: data.heading || null,
      });

      setStatus("ok", "Sensordaten empfangen");
    });

    onValue(ref(db, "location"), (snapshot) => {
      const data = snapshot.val();
      if (data) updateLocationUI(data);
    });
  }

  function setStatus(type, message) {
    if (!sensorStatus) return;
    sensorStatus.className = `status ${type}`;
    sensorStatus.textContent = message;
  }

  function safeValue(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toFixed(digits);
  }

  function updateSensorUI(data) {
    fields.tempOut.textContent = safeValue(data?.temperature?.outside);
    fields.tempIn.textContent = safeValue(data?.temperature?.inside);
    fields.humOut.textContent = safeValue(data?.humidity?.outside);
    fields.humIn.textContent = safeValue(data?.humidity?.inside);
    fields.distance.textContent = safeValue(data?.distanceCm, 0);

    const heading = data?.heading;
    fields.heading.textContent = heading?.cardinal
      ? `${heading.cardinal} (${safeValue(heading.deg, 0)}°)`
      : "--";

    lastUpdated.textContent = `Letztes Update: ${new Date().toLocaleTimeString("de-DE")}`;
  }

  function updateLocationUI(data) {
    fields.lat.textContent = safeValue(data?.lat, 6);
    fields.lng.textContent = safeValue(data?.lng, 6);
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

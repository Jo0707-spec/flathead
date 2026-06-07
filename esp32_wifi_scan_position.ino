#include <WiFi.h>
#include <Firebase_ESP_Client.h>

#define WIFI_SSID "mywlan"
#define WIFI_PASSWORD "cc305ag500"

#define API_KEY "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU"
#define DATABASE_URL "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app/"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const unsigned long SCAN_INTERVAL_MS = 2000;
unsigned long lastScanMs = 0;

String firebaseKey(String value) {
  value.replace(".", "_");
  value.replace("#", "_");
  value.replace("$", "_");
  value.replace("/", "_");
  value.replace("[", "_");
  value.replace("]", "_");
  if (value.length() == 0) return "unknown";
  return value;
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Verbinde WLAN");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WLAN verbunden");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void setupFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase SignUp OK");
  } else {
    Serial.print("SignUp Fehler: ");
    Serial.println(config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase gestartet");
}

void publishWifiScan() {
  Serial.println("Scanne WLAN-Netzwerke ...");

  int count = WiFi.scanNetworks(false, true);
  FirebaseJson root;
  FirebaseJson networks;

  root.set("device", "esp32");
  root.set("updatedAt", (int)(millis()));

  for (int i = 0; i < count; i++) {
    FirebaseJson network;
    String bssid = WiFi.BSSIDstr(i);
    String key = firebaseKey(bssid.length() ? bssid : WiFi.SSID(i));

    network.set("ssid", WiFi.SSID(i));
    network.set("bssid", bssid);
    network.set("rssi", WiFi.RSSI(i));

    networks.set(key, network);
  }

  root.set("networks", networks);

  if (Firebase.ready() && Firebase.RTDB.setJSON(&fbdo, "/position/wifi/current", &root)) {
    Serial.print("WLAN-Scan gesendet. Netzwerke: ");
    Serial.println(count);
  } else {
    Serial.print("Firebase Fehler: ");
    Serial.println(fbdo.errorReason());
  }

  WiFi.scanDelete();
}

void setup() {
  Serial.begin(115200);
  connectWifi();
  setupFirebase();
}

void loop() {
  if (millis() - lastScanMs >= SCAN_INTERVAL_MS) {
    lastScanMs = millis();
    publishWifiScan();
  }
}

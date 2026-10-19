/*#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

#define FW_VERSION "9.9.9"
enum BottleState {
  BOTTLE_CLOSED,
  BOTTLE_OPEN
};

BottleState bottleState = BOTTLE_CLOSED;

OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 5000;

int lastTiltLevel = HIGH;
unsigned long lastTiltChange = 0;

const char* bottleStateStr() {
  return bottleState == BOTTLE_OPEN ? "OPEN" : "CLOSED";
}

bool tiltIsActive() {
  int level = digitalRead(TILT_PIN);
  return level == TILT_ACTIVE_LEVEL;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("MEDIGUARD ESP32 TEST BUILD 1.0.1");
  Serial.println("================================");

  pinMode(TILT_PIN, INPUT_PULLUP);

  lastTiltLevel = digitalRead(TILT_PIN);
  lastTiltChange = millis();

  if (lastTiltLevel == TILT_ACTIVE_LEVEL) {
    bottleState = BOTTLE_OPEN;
  } else {
    bottleState = BOTTLE_CLOSED;
  }

  Serial.printf("[TILT] GPIO%d started\n", TILT_PIN);
  Serial.printf("[TILT] Initial GPIO level: %s\n",
                lastTiltLevel == LOW ? "LOW" : "HIGH");
  Serial.printf("[TILT] Initial bottle state: %s\n",
                bottleStateStr());

  sensors.begin();
  sensors.setWaitForConversion(false);

  Serial.println("[TEMP] DS18B20 initialized");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

Serial.print("[WIFI] Connecting");

unsigned long wifiStart = millis();

while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 15000) {
  delay(500);
  Serial.print(".");
}

Serial.println();

if (WiFi.status() == WL_CONNECTED) {
  Serial.print("[WIFI] Connected. IP: ");
  Serial.println(WiFi.localIP());
} else {
  Serial.println("[WIFI] FAILED - continuing without WiFi");
}

Serial.println("[READY] ESP32 ready");

  Serial.println("[READY] ESP32 ready");
}

void updateTilt() {
  int currentLevel = digitalRead(TILT_PIN);

  if (currentLevel != lastTiltLevel) {
    unsigned long now = millis();

    Serial.printf("[TILT] GPIO%d changed: %s -> %s\n",
                  TILT_PIN,
                  lastTiltLevel == LOW ? "LOW" : "HIGH",
                  currentLevel == LOW ? "LOW" : "HIGH");

    lastTiltLevel = currentLevel;
    lastTiltChange = now;
  }

  if (millis() - lastTiltChange < TILT_DEBOUNCE_MS) {
    return;
  }

  bool active = currentLevel == TILT_ACTIVE_LEVEL;

  if (active && bottleState == BOTTLE_CLOSED) {
    bottleState = BOTTLE_OPEN;

    Serial.println("[TILT] >>> BOTTLE OPEN <<<");

    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_WARNING_PIN, HIGH);
    digitalWrite(LED_SAFE_PIN, LOW);

    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
  }

  if (!active && bottleState == BOTTLE_OPEN) {
    if (millis() - lastTiltChange >= TILT_CLOSE_SETTLE_MS) {
      bottleState = BOTTLE_CLOSED;

      Serial.println("[TILT] >>> BOTTLE CLOSED <<<");

      digitalWrite(LED_WARNING_PIN, LOW);
      digitalWrite(LED_SAFE_PIN, HIGH);
    }
  }
}

void sendSensorData(float temperature) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Disconnected. Reconnecting...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;

  String url = String(BACKEND_URL);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"deviceId\":\"SD001-ESP32\",";
  json += "\"source\":\"esp32\",";
  json += "\"firmware\":\"";
  json += FW_VERSION;
  json += "\",";
  json += "\"bottleState\":\"";
  json += bottleStateStr();
  json += "\",";
  json += "\"bottleOpen\":";
  json += bottleState == BOTTLE_OPEN ? "true" : "false";
  json += ",";
  json += "\"temperature\":";
  json += String(temperature, 2);
  json += ",";
  json += "\"rssi\":";
  json += String(WiFi.RSSI());
  json += ",";
  json += "\"uptimeSec\":";
  json += String(millis() / 1000);
  json += "}";

  Serial.print("[SEND] ");
  Serial.println(json);

  int httpCode = http.POST(json);

  if (httpCode > 0) {
    Serial.print("[HTTP] ");
    Serial.print(httpCode);
    Serial.print(" -> ");
    Serial.println(http.getString());
  } else {
    Serial.print("[HTTP] Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

void loop() {
  Serial.println("TILT TEST RUNNING");
  
Serial.printf("GPIO27 raw value: %d\n", digitalRead(27));

  static int lastState = -1;
int currentState = digitalRead(27);
if (currentState != lastState) {
  Serial.printf("GPIO27 changed to %s\n", currentState == LOW ? "LOW" : "HIGH");
  lastState = currentState;
}
  updateTilt();

  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);

  if (temperature == DEVICE_DISCONNECTED_C) {
    Serial.println("[TEMP] DS18B20 disconnected");
  } else {
    Serial.printf("[TEMP] %.2f C | bottle %s\n",
                  temperature,
                  bottleStateStr());
  }

  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    if (temperature != DEVICE_DISCONNECTED_C) {
      sendSensorData(temperature);
    }
  }

  delay(100);
}*/




#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

#define FW_VERSION "9.9.9"

enum BottleState {
  BOTTLE_CLOSED,
  BOTTLE_OPEN
};

BottleState bottleState = BOTTLE_CLOSED;

OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 5000;

int lastTiltLevel = HIGH;
unsigned long lastTiltChange = 0;
unsigned long lastTempRead = 0;

const unsigned long TEMP_READ_INTERVAL = 2000;

float temperature = DEVICE_DISCONNECTED_C;

const char* bottleStateStr() {
  return bottleState == BOTTLE_OPEN ? "OPEN" : "CLOSED";
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println("MEDIGUARD ESP32 BUILD 1.0.2");
  Serial.println("================================");

  // Configure hardware pins
  pinMode(TILT_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_SAFE_PIN, OUTPUT);
  pinMode(LED_WARNING_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_WARNING_PIN, LOW);
  digitalWrite(LED_SAFE_PIN, HIGH);

  lastTiltLevel = digitalRead(TILT_PIN);
  lastTiltChange = millis();

  if (lastTiltLevel == TILT_ACTIVE_LEVEL) {
    bottleState = BOTTLE_OPEN;
    digitalWrite(LED_SAFE_PIN, LOW);
    digitalWrite(LED_WARNING_PIN, HIGH);
  }

  Serial.printf("[TILT] GPIO%d initialized\n", TILT_PIN);
  Serial.printf("[TILT] Initial level: %s\n",
                lastTiltLevel == LOW ? "LOW" : "HIGH");
  Serial.printf("[TILT] Active level: %s\n",
                TILT_ACTIVE_LEVEL == LOW ? "LOW" : "HIGH");
  Serial.printf("[TILT] Initial bottle state: %s\n",
                bottleStateStr());

  // Initialize temperature sensor
  sensors.begin();
  sensors.setWaitForConversion(true);

  Serial.printf("[TEMP] DS18B20 devices found: %d\n",
                sensors.getDeviceCount());

  sensors.requestTemperatures();
  temperature = sensors.getTempCByIndex(0);
  lastTempRead = millis();

  if (temperature == DEVICE_DISCONNECTED_C ||
      temperature == DEVICE_DISCONNECTED_F) {
    Serial.println("[TEMP] Sensor not detected. Check will continue.");
  } else {
    Serial.printf("[TEMP] Initial reading: %.2f C\n", temperature);
  }

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WIFI] Connecting");
  unsigned long wifiStart = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - wifiStart < 15000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WIFI] Connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WIFI] Connection failed; continuing offline.");
  }

  Serial.println("[READY] ESP32 ready");
}

/*void updateTilt() {
  int currentLevel = digitalRead(TILT_PIN);
  unsigned long now = millis();

  // Log every detected signal transition
  if (currentLevel != lastTiltLevel) {
    Serial.printf("[TILT] GPIO%d changed: %s -> %s\n",
                  TILT_PIN,
                  lastTiltLevel == LOW ? "LOW" : "HIGH",
                  currentLevel == LOW ? "LOW" : "HIGH");

    lastTiltLevel = currentLevel;
    lastTiltChange = now;
  }

  // Wait for the signal to remain stable
  if (now - lastTiltChange < TILT_DEBOUNCE_MS) {
    return;
  }

  bool active = (currentLevel == TILT_ACTIVE_LEVEL);

  if (active && bottleState == BOTTLE_CLOSED) {
    bottleState = BOTTLE_OPEN;

    Serial.println("[TILT] >>> BOTTLE OPEN <<<");

    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_WARNING_PIN, HIGH);
    digitalWrite(LED_SAFE_PIN, LOW);

    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
  }

  if (!active && bottleState == BOTTLE_OPEN) {
    if (now - lastTiltChange >= TILT_CLOSE_SETTLE_MS) {
      bottleState = BOTTLE_CLOSED;

      Serial.println("[TILT] >>> BOTTLE CLOSED <<<");

      digitalWrite(LED_WARNING_PIN, LOW);
      digitalWrite(LED_SAFE_PIN, HIGH);
    }
  }
}*/

void updateTilt() {
  int currentLevel = digitalRead(TILT_PIN);
  unsigned long now = millis();

  if (currentLevel != lastTiltLevel) {
    Serial.printf("[TILT] GPIO%d changed: %s -> %s\n",
                  TILT_PIN,
                  lastTiltLevel == LOW ? "LOW" : "HIGH",
                  currentLevel == LOW ? "LOW" : "HIGH");

    lastTiltLevel = currentLevel;
    lastTiltChange = now;

    // Register an opening event when the active signal is detected.
    if (currentLevel == TILT_ACTIVE_LEVEL &&
        bottleState == BOTTLE_CLOSED) {
      bottleState = BOTTLE_OPEN;

      Serial.println("[TILT] >>> BOTTLE OPEN <<<");

      digitalWrite(BUZZER_PIN, HIGH);
      digitalWrite(LED_WARNING_PIN, HIGH);
      digitalWrite(LED_SAFE_PIN, LOW);

      delay(100);
      digitalWrite(BUZZER_PIN, LOW);
    }
  }

  // Close only after the signal has been inactive and stable
  // for the configured settling period.
  if (bottleState == BOTTLE_OPEN &&
      currentLevel != TILT_ACTIVE_LEVEL &&
      now - lastTiltChange >= TILT_CLOSE_SETTLE_MS) {
    bottleState = BOTTLE_CLOSED;

    Serial.println("[TILT] >>> BOTTLE CLOSED <<<");

    digitalWrite(LED_WARNING_PIN, LOW);
    digitalWrite(LED_SAFE_PIN, HIGH);
  }
}


void sendSensorData(float temperature) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Offline; sensor data not sent.");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);

  String url = String(BACKEND_URL);

  if (!http.begin(url)) {
    Serial.println("[HTTP] Failed to initialize request.");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"deviceId\":\"SD001-ESP32\",";
  json += "\"source\":\"esp32\",";
  json += "\"firmware\":\"";
  json += FW_VERSION;
  json += "\",";
  json += "\"bottleState\":\"";
  json += bottleStateStr();
  json += "\",";
  json += "\"bottleOpen\":";
  json += bottleState == BOTTLE_OPEN ? "true" : "false";
  json += ",";
  json += "\"temperature\":";
  json += String(temperature, 2);
  json += ",";
  json += "\"rssi\":";
  json += String(WiFi.RSSI());
  json += ",";
  json += "\"uptimeSec\":";
  json += String(millis() / 1000);
  json += "}";

  Serial.print("[SEND] ");
  Serial.println(json);

  int httpCode = http.POST(json);

  if (httpCode > 0) {
    Serial.printf("[HTTP] Response code: %d\n", httpCode);
    Serial.println(http.getString());
  } else {
    Serial.print("[HTTP] Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

void loop() {
  updateTilt();

  unsigned long now = millis();

  // Read temperature after the conversion is complete
  if (now - lastTempRead >= TEMP_READ_INTERVAL) {
    lastTempRead = now;

    sensors.requestTemperatures();
    temperature = sensors.getTempCByIndex(0);

    if (temperature == DEVICE_DISCONNECTED_C ||
        temperature == DEVICE_DISCONNECTED_F) {
      Serial.println("[TEMP] DS18B20 disconnected");
    } else {
      Serial.printf("[TEMP] %.2f C | bottle %s\n",
                    temperature,
                    bottleStateStr());
    }
  }

  // Send sensor data at the configured interval
  if (now - lastSend >= SEND_INTERVAL) {
    lastSend = now;

    if (temperature != DEVICE_DISCONNECTED_C &&
        temperature != DEVICE_DISCONNECTED_F) {
      sendSensorData(temperature);
    }
  }

  delay(10);
}

#include <ESP8266WiFi.h>
#include <MQTT.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Ganti nilai ini sebelum mengunggah program.
const char* wifiName = "NAMA_WIFI";
const char* wifiPassword = "PASSWORD_WIFI";

const char* mqttServer = "ALAMAT_BROKER_EMQX";
const int mqttPort = 1883;
const char* mqttUsername = "";
const char* mqttPassword = "";

const char* telemetryTopic = "padiku/dryer/telemetry";
const char* commandTopic = "padiku/dryer/commands";
const char* ackTopic = "padiku/dryer/acks";

// Pin di bawah ini mengikuti nama pin pada board NodeMCU ESP8266.
const int dhtPin = D5;
const int machineRelayPin = D1;
const int batteryRelayPin = D2;

// Banyak modul relay aktif LOW. Ubah ke HIGH jika modul yang dipakai aktif HIGH.
const int relayOn = LOW;
const int relayOff = HIGH;

#define DHTTYPE DHT22

DHT dht(dhtPin, DHTTYPE);
WiFiClient network;
MQTTClient mqtt;

unsigned long lastSensorRead = 0;
const unsigned long sensorInterval = 5000;

bool emergencyStopActive = false;
String pendingCommandId = "";
String pendingCommandStatus = "";

void connectToMqtt() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(wifiName, wifiPassword);

    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println(" Wi-Fi terhubung.");
  }

  while (!mqtt.connected()) {
    Serial.print("Menghubungkan ke EMQX...");

    bool connected;
    if (mqttUsername[0] == '\0') {
      connected = mqtt.connect("padiku-esp8266");
    } else {
      connected = mqtt.connect("padiku-esp8266", mqttUsername, mqttPassword);
    }

    if (connected) {
      Serial.println(" terhubung.");
      mqtt.subscribe(commandTopic, 1);
    } else {
      Serial.println(" gagal. Coba lagi sebentar.");
      delay(3000);
    }
  }
}

void messageReceived(String &topic, String &payload) {
  if (topic != commandTopic) {
    return;
  }

  JsonDocument command;
  DeserializationError error = deserializeJson(command, payload);
  if (error) {
    Serial.println("Format perintah tidak bisa dibaca.");
    return;
  }

  String commandId = command["commandId"] | "";
  String action = command["action"] | "";

  if (commandId == "") {
    return;
  }

  pendingCommandId = commandId;
  pendingCommandStatus = "rejected";

  if (!command["value"].is<bool>()) {
    return;
  }

  bool requestedValue = command["value"].as<bool>();

  if (action == "machine_power") {
    if (!requestedValue || !emergencyStopActive) {
      digitalWrite(machineRelayPin, requestedValue ? relayOn : relayOff);
      pendingCommandStatus = "acknowledged";
    }
  } else if (action == "battery") {
    if (!requestedValue || !emergencyStopActive) {
      digitalWrite(batteryRelayPin, requestedValue ? relayOn : relayOff);
      pendingCommandStatus = "acknowledged";
    }
  } else if (action == "emergency_stop") {
    emergencyStopActive = requestedValue;

    if (emergencyStopActive) {
      digitalWrite(machineRelayPin, relayOff);
      digitalWrite(batteryRelayPin, relayOff);
    }

    pendingCommandStatus = "acknowledged";
  }
}

void sendPendingAcknowledgement() {
  if (pendingCommandId == "" || !mqtt.connected()) {
    return;
  }

  JsonDocument acknowledgement;
  acknowledgement["commandId"] = pendingCommandId;
  acknowledgement["status"] = pendingCommandStatus;

  String message;
  serializeJson(acknowledgement, message);
  if (mqtt.publish(ackTopic, message)) {
    pendingCommandId = "";
    pendingCommandStatus = "";
  }
}

void sendSensorReading() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Sensor DHT22 belum berhasil dibaca.");
    return;
  }

  JsonDocument reading;
  reading["temperature"] = temperature;
  reading["humidity"] = humidity;
  reading["source"] = "esp8266";

  String message;
  serializeJson(reading, message);
  mqtt.publish(telemetryTopic, message);

  Serial.print("Suhu: ");
  Serial.print(temperature);
  Serial.print(" C, kelembapan: ");
  Serial.print(humidity);
  Serial.println(" %");
}

void setup() {
  Serial.begin(115200);

  // Matikan relay lebih dulu saat ESP8266 mulai berjalan.
  digitalWrite(machineRelayPin, relayOff);
  digitalWrite(batteryRelayPin, relayOff);
  pinMode(machineRelayPin, OUTPUT);
  pinMode(batteryRelayPin, OUTPUT);

  dht.begin();

  WiFi.mode(WIFI_STA);
  mqtt.begin(mqttServer, mqttPort, network);
  mqtt.onMessage(messageReceived);

  connectToMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED || !mqtt.connected()) {
    connectToMqtt();
  }

  mqtt.loop();
  delay(10);
  sendPendingAcknowledgement();

  if (millis() - lastSensorRead >= sensorInterval) {
    lastSensorRead = millis();
    sendSensorReading();
  }
}

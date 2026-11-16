export const FIRMWARE_CPP = `/*
 * =====================================================================
 *  EnerClass — Firmware del concentrador IoT
 *  I.E. N° 2001 "Leoncio Prado" — Rímac, Lima, Perú
 * ---------------------------------------------------------------------
 *  Placa: ESP32 DevKit V1 (38 pines)
 *  Sensores: 4 x SCT-013-000 (100 A / 50 mA) no invasivos
 *  ADC: 12 bits (0-4095), atenuación 11 dB, referencia 3.3 V
 *  Circuito de acondicionamiento por canal:
 *    - Resistencia de carga (burden): 33 ohm entre los terminales
 *    - Divisor de tensión 10k/10k para polarizar a 1.65 V DC
 *    - Capacitor de 10 uF entre la señal y GND
 *  Pines ADC1 (compatibles con Wi-Fi): GPIO32, GPIO33, GPIO34, GPIO35
 * ---------------------------------------------------------------------
 *  Endpoint del servidor EnerClass:
 *    POST http://IP_DEL_SERVIDOR:3000/api/iot/telemetry
 *  Cambie WIFI_SSID, WIFI_PASSWORD y API_HOST antes de cargar.
 *  Arduino IDE: placa "ESP32 Dev Module" + librerías WiFi y HTTPClient.
 * =====================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

// ------------------------- CONFIGURACIÓN -----------------------------
const char* WIFI_SSID     = "NOMBRE_DE_LA_RED_WIFI";
const char* WIFI_PASSWORD = "CLAVE_DE_LA_RED_WIFI";

// IP LAN del equipo donde corre EnerClass (ej. 192.168.1.50)
const char* API_HOST   = "192.168.1.50";
const int   API_PORT   = 3000;
const char* API_PATH   = "/api/iot/telemetry";
const char* API_KEY    = "";  // Opcional: valor de IOT_API_KEY en .env

const char* DEVICE_ID  = "ESP32-LP-01";
const unsigned long SEND_INTERVAL_MS = 3000;
const double VOLTAGE_NOMINAL = 220.0;  // Tensión de red (V)
const double POWER_FACTOR    = 0.95;   // Factor de potencia estimado
const double TARIFF_SOLES    = 0.715;  // S/ por kWh (referencial BT3)

// ------------------- CALIBRACIÓN DE SENSORES SCT-013 ----------------
// SCT-013-000: 100 A primarios = 50 mA secundarios => relación 2000:1
const double CT_RATIO       = 2000.0;
const double BURDEN_OHMS    = 33.0;
const double ADC_MAX        = 4095.0;
const double ADC_VREF       = 3.3;
const int    SAMPLES        = 2000;   // Muestras por lectura (~150 ms)

struct SensorChannel {
  const char* zone;
  int pin;
  double calibration;
  double dcOffset;   // Offset medido (ideal: 1.65 V)
};

SensorChannel channels[4] = {
  { "COMPUTO",       32, 1.000, 1.65 },
  { "TALLERES",      33, 1.030, 1.65 },
  { "ALUMBRADO",     34, 0.980, 1.65 },
  { "ADMINISTRACION",35, 1.010, 1.65 }
};

// --------------------------- UTILIDADES -----------------------------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WiFi] Conectando a ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Conectado. IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("[WiFi] Sin conexión. Se reintentará en el próximo ciclo.");
  }
}

double readCurrentRMS(SensorChannel &ch) {
  double sum = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    double voltage = analogRead(ch.pin) * (ADC_VREF / ADC_MAX);
    double centered = voltage - ch.dcOffset;
    sum += centered * centered;
  }
  double rmsVolts = sqrt(sum / SAMPLES);
  // Ley de Ohm en el burden y relación del transformador
  double amps = (rmsVolts / BURDEN_OHMS) * CT_RATIO * ch.calibration;
  if (amps < 0.05) amps = 0.0;
  return amps;
}

void sendTelemetry(SensorChannel &ch, double amps) {
  if (WiFi.status() != WL_CONNECTED) return;

  double powerKw = (VOLTAGE_NOMINAL * amps * POWER_FACTOR) / 1000.0;

  char payload[360];
  snprintf(payload, sizeof(payload),
    "{\\"deviceId\\":\\"%s\\",\\"zone\\":\\"%s\\",\\"currentAmps\\":%.2f,"
    "\\"voltageVolts\\":%.1f,\\"powerKw\\":%.3f,\\"powerFactor\\":%.3f,"
    "\\"tariffSoles\\":%.3f,\\"intervalSeconds\\":%lu,\\"wifiRssi\\":%d}",
    DEVICE_ID, ch.zone, amps, VOLTAGE_NOMINAL, powerKw, POWER_FACTOR,
    TARIFF_SOLES, SEND_INTERVAL_MS / 1000, WiFi.RSSI());

  String url = String("http://") + API_HOST + ":" + API_PORT + API_PATH;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  if (strlen(API_KEY) > 0) http.addHeader("x-api-key", API_KEY);
  http.setTimeout(4000);

  int code = http.POST((uint8_t*)payload, strlen(payload));
  Serial.printf("[HTTP] %-14s %d  %s\\n", ch.zone, code, payload);
  http.end();
}

// ------------------------------- SETUP -------------------------------
void setup() {
  Serial.begin(115200);
  delay(800);
  Serial.println();
  Serial.println("=================================================");
  Serial.println(" EnerClass — Concentrador ESP32-LP-01");
  Serial.println(" I.E. N° 2001 Leoncio Prado — Rímac");
  Serial.println("=================================================");

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Estimación del offset DC de cada canal con el sensor sin carga
  for (int i = 0; i < 4; i++) {
    long sum = 0;
    for (int j = 0; j < 500; j++) sum += analogRead(channels[i].pin);
    double raw = (double)sum / 500.0;
    channels[i].dcOffset = raw * (ADC_VREF / ADC_MAX);
    Serial.printf("[ADC] Canal %s offset = %.3f V\\n", channels[i].zone, channels[i].dcOffset);
  }

  connectWiFi();
}

// -------------------------------- LOOP ------------------------------
void loop() {
  connectWiFi();

  for (int i = 0; i < 4; i++) {
    double amps = readCurrentRMS(channels[i]);
    sendTelemetry(channels[i], amps);
  }

  Serial.println("-------------------------------------------------");
  delay(SEND_INTERVAL_MS);
}
`;

export const TELEMETRY_EXAMPLE = `curl -X POST http://localhost:3000/api/iot/telemetry \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "ESP32-LP-01",
    "zone": "COMPUTO",
    "currentAmps": 12.84,
    "voltageVolts": 220.4,
    "powerKw": 2.69,
    "powerFactor": 0.95,
    "tariffSoles": 0.715
  }'`;

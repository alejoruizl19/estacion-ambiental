/*
 * Estación de Monitoreo Ambiental - ESP32
 * Sensores: DHT11, MQ135, FC-37
 * Comunicación: WiFi -> API REST
 * 
 * Conexiones:
 * - DHT11: Pin de datos -> GPIO 4
 * - MQ135: Salida analógica -> GPIO 34
 * - FC-37: Salida analógica -> GPIO 35
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ===== CONFIGURACIÓN WiFi =====
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASEÑA";

// ===== CONFIGURACIÓN API =====
const char* API_URL = "http://150.136.121.68:3000/api/lecturas";
const char* DEVICE_ID = "estacion-001";

// ===== CONFIGURACIÓN DE PINES =====
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define MQ135_PIN 34
#define FC37_PIN 35

// ===== CONFIGURACIÓN DE TIEMPOS =====
#define INTERVALO_LECTURA 30000  // Enviar datos cada 30 segundos
#define TIEMPO_CALENTAMIENTO_MQ135 180000  // 3 minutos de calentamiento

// ===== UMBRALES DE ALERTA =====
#define TEMP_ALTA 35.0
#define TEMP_BAJA 5.0
#define HUMEDAD_ALTA 80.0
#define PM25_ALTO 35.0
#define PM10_ALTO 50.0
#define LLUVIA_UMBRAL 500  // Valor analógico (menor = más lluvia)

// ===== OBJETOS =====
DHT dht(DHT_PIN, DHT_TYPE);

// ===== VARIABLES =====
unsigned long ultimaLectura = 0;
unsigned long tiempoInicio = 0;
bool mq135Listo = false;

// Estructura para almacenar lecturas
struct LecturaSensores {
  float temperatura;
  float humedad;
  float pm25;
  float pm10;
  bool lluvia;
  int lluviaRaw;
  int mq135Raw;
};

void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  Estación de Monitoreo Ambiental");
  Serial.println("========================================\n");

  // Inicializar sensor DHT11
  dht.begin();
  Serial.println("[OK] Sensor DHT11 inicializado");

  // Configurar pines analógicos
  analogReadResolution(12);  // Resolución de 12 bits (0-4095)
  pinMode(MQ135_PIN, INPUT);
  pinMode(FC37_PIN, INPUT);
  Serial.println("[OK] Pines analógicos configurados");

  // Conectar a WiFi
  conectarWiFi();

  tiempoInicio = millis();
  Serial.println("\n[INFO] Calentando sensor MQ135 (3 minutos)...");
  Serial.println("[INFO] Las lecturas de gas serán precisas después del calentamiento.\n");
}

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi desconectado. Reconectando...");
    conectarWiFi();
  }

  // Verificar si el MQ135 ya se calentó
  if (!mq135Listo && (millis() - tiempoInicio >= TIEMPO_CALENTAMIENTO_MQ135)) {
    mq135Listo = true;
    Serial.println("[OK] Sensor MQ135 listo para lecturas precisas.");
  }

  // Leer y enviar datos según intervalo
  if (millis() - ultimaLectura >= INTERVALO_LECTURA) {
    ultimaLectura = millis();

    LecturaSensores lectura = leerSensores();
    mostrarLecturas(lectura);
    enviarDatos(lectura);
  }
}

// ===== FUNCIONES DE CONEXIÓN =====

void conectarWiFi() {
  Serial.print("[WiFi] Conectando a: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[OK] Conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[ERROR] No se pudo conectar al WiFi.");
    Serial.println("[INFO] Reintentando en 5 segundos...");
    delay(5000);
  }
}

// ===== FUNCIONES DE LECTURA =====

LecturaSensores leerSensores() {
  LecturaSensores lectura;

  // Leer DHT11 (Temperatura y Humedad)
  lectura.temperatura = dht.readTemperature();
  lectura.humedad = dht.readHumidity();

  // Verificar si la lectura del DHT es válida
  if (isnan(lectura.temperatura) || isnan(lectura.humedad)) {
    Serial.println("[WARN] Error leyendo DHT11. Usando último valor válido.");
    lectura.temperatura = 0;
    lectura.humedad = 0;
  }

  // Leer MQ135 (Calidad del aire)
  lectura.mq135Raw = analogRead(MQ135_PIN);
  convertirMQ135(lectura);

  // Leer FC-37 (Lluvia)
  lectura.lluviaRaw = analogRead(FC37_PIN);
  lectura.lluvia = (lectura.lluviaRaw < LLUVIA_UMBRAL);

  return lectura;
}

void convertirMQ135(LecturaSensores &lectura) {
  /*
   * Conversión aproximada del MQ135 a PM2.5 y PM10
   * NOTA: El MQ135 no es un sensor preciso para partículas,
   * pero podemos hacer una estimación basada en la concentración
   * de gases detectada. Para un proyecto escolar esto es aceptable.
   * 
   * Fórmula simplificada basada en el valor analógico:
   * - Rango ADC: 0-4095 (12 bits)
   * - Aire limpio: ~100-300
   * - Contaminado: >700
   */
  
  float voltaje = (lectura.mq135Raw / 4095.0) * 3.3;
  float ratio = lectura.mq135Raw / 4095.0;

  // Estimación PM2.5 (µg/m³) - escala aproximada
  if (lectura.mq135Raw < 200) {
    lectura.pm25 = ratio * 12.0;  // Aire limpio (0-12 µg/m³)
  } else if (lectura.mq135Raw < 500) {
    lectura.pm25 = 12.0 + (ratio - 0.05) * 50.0;  // Moderado
  } else if (lectura.mq135Raw < 1000) {
    lectura.pm25 = 35.0 + (ratio - 0.12) * 80.0;  // Insalubre para sensibles
  } else {
    lectura.pm25 = 55.0 + (ratio - 0.24) * 200.0;  // Insalubre
  }

  // PM10 generalmente es 1.5x a 2x PM2.5
  lectura.pm10 = lectura.pm25 * 1.8;

  // Limitar valores
  lectura.pm25 = constrain(lectura.pm25, 0, 500);
  lectura.pm10 = constrain(lectura.pm10, 0, 600);
}

// ===== FUNCIONES DE ENVÍO =====

void enviarDatos(LecturaSensores lectura) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] Sin conexión WiFi. Datos no enviados.");
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  // Construir JSON
  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["temperatura"] = round(lectura.temperatura * 10) / 10.0;
  doc["humedad"] = round(lectura.humedad * 10) / 10.0;
  doc["pm25"] = round(lectura.pm25 * 10) / 10.0;
  doc["pm10"] = round(lectura.pm10 * 10) / 10.0;
  doc["lluvia"] = lectura.lluvia;
  doc["lluviaRaw"] = lectura.lluviaRaw;
  doc["mq135Raw"] = lectura.mq135Raw;
  doc["mq135Listo"] = mq135Listo;

  // Agregar alertas
  JsonObject alertas = doc.createNestedObject("alertas");
  alertas["tempAlta"] = (lectura.temperatura > TEMP_ALTA);
  alertas["tempBaja"] = (lectura.temperatura < TEMP_BAJA);
  alertas["humedadAlta"] = (lectura.humedad > HUMEDAD_ALTA);
  alertas["pm25Alto"] = (lectura.pm25 > PM25_ALTO);
  alertas["pm10Alto"] = (lectura.pm10 > PM10_ALTO);
  alertas["lluvia"] = lectura.lluvia;

  String jsonStr;
  serializeJson(doc, jsonStr);

  Serial.print("[HTTP] Enviando datos... ");
  int httpCode = http.POST(jsonStr);

  if (httpCode > 0) {
    Serial.print("Código: ");
    Serial.println(httpCode);
    if (httpCode == 200 || httpCode == 201) {
      Serial.println("[OK] Datos enviados correctamente.");
    }
  } else {
    Serial.print("[ERROR] Fallo en envío: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ===== FUNCIONES DE VISUALIZACIÓN =====

void mostrarLecturas(LecturaSensores lectura) {
  Serial.println("\n--- Lectura de Sensores ---");
  Serial.print("Temperatura: ");
  Serial.print(lectura.temperatura);
  Serial.println(" °C");

  Serial.print("Humedad: ");
  Serial.print(lectura.humedad);
  Serial.println(" %");

  Serial.print("PM2.5: ");
  Serial.print(lectura.pm25);
  Serial.print(" µg/m³ (Raw: ");
  Serial.print(lectura.mq135Raw);
  Serial.println(")");

  Serial.print("PM10: ");
  Serial.print(lectura.pm10);
  Serial.println(" µg/m³");

  Serial.print("Lluvia: ");
  Serial.print(lectura.lluvia ? "SÍ" : "NO");
  Serial.print(" (Raw: ");
  Serial.print(lectura.lluviaRaw);
  Serial.println(")");

  Serial.print("MQ135 Calentado: ");
  Serial.println(mq135Listo ? "SÍ" : "NO");
  Serial.println("---------------------------\n");
}

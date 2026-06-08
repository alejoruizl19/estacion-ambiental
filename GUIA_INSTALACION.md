# 📖 Guía de Instalación Completa

---

## 1. 🔌 Hardware - Conexiones ESP32

### Componentes:
- 1x ESP32 DevKit
- 1x DHT11 (temperatura y humedad)
- 1x MQ135 (calidad del aire - PM2.5/PM10)
- 1x FC-37 (sensor de lluvia)
- Cables jumper y protoboard

### Conexiones:

```
ESP32          DHT11
------         ------
3.3V  ------  VCC
GND   ------  GND
GPIO4 ------  DATA (con resistencia 10K pull-up a VCC)

ESP32          MQ135
------         ------
5V    ------  VCC (¡Requiere 5V!)
GND   ------  GND
GPIO34 -----  A0 (salida analógica)

ESP32          FC-37
------         ------
3.3V  ------  VCC
GND   ------  GND
GPIO35 -----  A0 (salida analógica)
```

### Notas:
- El MQ135 necesita 5V para funcionar (no sirve con 3.3V)
- El DHT11 necesita resistencia pull-up de 10KΩ entre DATA y VCC
- El MQ135 necesita 3-5 minutos de calentamiento al encender

---

## 2. 💻 Firmware ESP32 (Arduino IDE)

### Requisitos:
1. Arduino IDE: https://www.arduino.cc/en/software
2. Soporte ESP32 en Arduino IDE:
   - Archivo → Preferencias → URLs de Gestor de Tarjetas:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
   - Herramientas → Placa → Gestor de tarjetas → Buscar "ESP32" → Instalar

### Librerías necesarias (Administrar Bibliotecas):
- `DHT sensor library` (Adafruit)
- `Adafruit Unified Sensor`
- `ArduinoJson` (Benoit Blanchon)

### Configurar antes de subir:

En `esp32-firmware/estacion_ambiental.ino`, cambiar:
```cpp
const char* WIFI_SSID = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASEÑA_WIFI";
const char* API_URL = "http://150.136.121.68:3000/api/lecturas";
```

### Subir el código:
1. Conectar ESP32 por USB
2. Herramientas → Placa: **ESP32 Dev Module**
3. Herramientas → Puerto: seleccionar el COM correcto
4. Click en ➡️ (Subir)
5. Abrir Monitor Serial (115200 baud) para verificar

---

## 3. 🖥️ API Backend

### Requisitos:
- Node.js 20+ (https://nodejs.org)

### Instalar localmente (para desarrollo):
```bash
cd api-backend
npm install
node server.js
```

El servidor corre en `http://localhost:3000`

### Desplegar en Oracle Cloud:
Ver archivo `GUIA_ORACLE_CLOUD.md` para la guía completa.

### Endpoints de la API:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/lecturas | Recibir datos del ESP32 |
| GET | /api/lecturas/ultima | Última lectura registrada |
| GET | /api/lecturas/historial?horas=24&limite=50 | Historial |
| GET | /api/lecturas/promedio?horas=24 | Promedios por hora |
| GET | /api/alertas | Listado de alertas |
| GET | /api/alertas?noLeidas=true | Solo alertas no leídas |
| PUT | /api/alertas/:id/leer | Marcar alerta como leída |
| GET | /api/estado | Estado general del sistema |

---

## 4. 📱 App Web (PWA)

La app es una Progressive Web App servida desde el mismo backend. No necesita compilar ni instalar APK.

### Acceder:
Abrir en el navegador del celular: `http://150.136.121.68:3000`

### Instalar como app en Android:
1. Abrir Chrome en el celular
2. Ir a `http://150.136.121.68:3000`
3. Menú ⋮ → **"Agregar a pantalla de inicio"**
4. Se instala como app con icono propio

### Funcionalidades:
- Dashboard con datos en tiempo real (actualiza cada 10s)
- Indicador de calidad del aire con colores
- Tarjetas de temperatura, humedad, PM10, lluvia
- Lista de alertas con historial
- Notificaciones con vibración cuando hay alertas
- Configuración para activar/desactivar alertas

---

## 5. 🧪 Pruebas sin hardware

Ver archivo `GUIA_SIMULADOR_Y_PRUEBAS.md` para:
- Ejecutar el simulador de datos
- Probar la API manualmente
- Limpiar datos de prueba

---

## 6. 🔧 Solución de Problemas

### El ESP32 no se conecta al WiFi:
- Solo soporta WiFi 2.4 GHz (no 5 GHz)
- Verificar SSID y contraseña en el código
- Acercar el ESP32 al router

### El MQ135 da lecturas extrañas:
- Necesita 3-5 minutos de calentamiento
- Requiere 5V (no funciona bien con 3.3V)
- Las primeras lecturas no son confiables

### La app muestra "No se pudo conectar":
- Verificar que el servidor esté corriendo: `pm2 status`
- Verificar la IP del servidor
- El celular necesita internet (WiFi o datos)

### La hora se muestra mal:
- La base de datos guarda en UTC
- El frontend convierte a hora Colombia (America/Bogota) automáticamente
- Si la hora del celular está mal configurada, la conversión será incorrecta

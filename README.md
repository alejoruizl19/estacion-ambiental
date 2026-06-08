# 🌍 Estación de Monitoreo Ambiental

## ¿Qué es este proyecto?

Es un sistema que mide la calidad del aire y el clima en tiempo real. Usa una tarjeta electrónica (ESP32) con sensores que detectan la temperatura, humedad, contaminación del aire y si está lloviendo. Toda esa información se envía por internet a un servidor y se puede ver desde el celular en una aplicación.

## ¿Para qué sirve?

- Saber si el aire que respiramos está contaminado
- Recibir alertas cuando la contaminación es alta
- Saber la temperatura y humedad del ambiente
- Detectar si está lloviendo
- Ver todo en tiempo real desde el celular

## ¿Qué mide?

| Sensor | ¿Qué mide? | ¿Para qué sirve? |
|--------|-------------|-------------------|
| DHT11 | Temperatura (°C) y Humedad (%) | Saber si hace calor/frío y qué tan húmedo está el aire |
| MQ135 | Partículas PM2.5 y PM10 | Detectar contaminación del aire (humo, gases, polvo) |
| FC-37 | Lluvia | Saber si está lloviendo en la zona del sensor |

### ¿Qué son PM2.5 y PM10?

Son partículas muy pequeñas que flotan en el aire. PM2.5 son las más chiquitas (las más peligrosas porque entran a los pulmones). PM10 son un poco más grandes. Cuando hay mucho humo, polvo o contaminación, estos números suben.

## ¿Cómo funciona?

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  ESP32 + Sensores│  WiFi   │  Servidor en la  │  Internet│  App en el       │
│  (en el colegio) │ ──────> │  nube (Oracle)   │ <────── │  celular         │
│                  │         │                  │         │                  │
│ • Lee temperatura│         │ • Guarda datos   │         │ • Muestra datos  │
│ • Lee humedad   │         │ • Genera alertas │         │ • Muestra alertas│
│ • Lee aire      │         │ • Sirve la app   │         │ • Mapa           │
│ • Detecta lluvia│         │                  │         │ • Notificaciones │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

1. **El ESP32** lee los sensores cada 30 segundos y envía los datos por WiFi
2. **El servidor** recibe los datos, los guarda y revisa si hay alertas
3. **La app del celular** consulta el servidor cada 10 segundos y muestra todo bonito

## ¿Qué tiene la app?

### 📱 Pantallas:
- **Inicio** — Muestra los datos actuales: temperatura, humedad, PM2.5, PM10, lluvia y la calidad del aire con colores
- **Alertas** — Lista de todas las alertas que se han generado (cuando algo está mal)
- **Mapa** — Muestra en un mapa dónde está ubicado el sensor

### ⚙️ Configuración (menú hamburguesa ☰):
- Activar/desactivar notificaciones con vibración
- Cambiar el tema de colores (Azul, Oscuro, Verde)
- Ver el estado del servidor

### 🎨 Temas de colores:
| Tema | Descripción |
|------|-------------|
| Azul (Default) | Colores azules, fondo claro |
| Oscuro | Fondo negro, para usar de noche |
| Verde Naturaleza | Colores verdes, estilo ecológico |

### 🔔 Alertas automáticas:
La app avisa cuando:
- La temperatura es mayor a 35°C (mucho calor)
- La temperatura es menor a 5°C (mucho frío)
- La humedad es mayor a 80% (muy húmedo)
- El PM2.5 es mayor a 35 µg/m³ (aire contaminado)
- El PM10 es mayor a 50 µg/m³ (muchas partículas)
- Está lloviendo

## Tecnologías que usamos

| Tecnología | ¿Qué es? | ¿Para qué la usamos? |
|------------|----------|----------------------|
| ESP32 | Tarjeta electrónica con WiFi | Leer sensores y enviar datos |
| Arduino IDE | Programa para programar el ESP32 | Escribir el código del ESP32 |
| Node.js | Lenguaje de programación para servidores | Crear la API que recibe los datos |
| SQLite | Base de datos pequeña | Guardar todas las lecturas |
| HTML/CSS/JS | Lenguajes de páginas web | Crear la app del celular |
| Oracle Cloud | Servidor en la nube (gratis) | Tener el servidor siempre prendido |
| PM2 | Programa que mantiene procesos activos | Que el servidor no se apague nunca |
| Leaflet | Librería de mapas | Mostrar el mapa con la ubicación |
| OpenStreetMap | Mapas gratuitos | Los mapas que se ven en la app |

## Archivos del proyecto

```
├── esp32-firmware/
│   ├── estacion_ambiental.ino    ← Código que va en el ESP32
│   └── CONEXIONES.md             ← Cómo conectar los cables
├── api-backend/
│   ├── server.js                 ← El servidor que recibe datos
│   ├── simulador.js              ← Simulador para probar sin sensores
│   ├── package.json              ← Lista de librerías necesarias
│   └── public/
│       ├── index.html            ← La app del celular (toda la interfaz)
│       ├── manifest.json         ← Para instalar como app
│       └── sw.js                 ← Para que funcione sin internet
├── README.md                     ← Este archivo
├── GUIA_ORACLE_CLOUD.md          ← Cómo montar el servidor en la nube
├── GUIA_SIMULADOR_Y_PRUEBAS.md   ← Cómo probar sin tener los sensores
└── GUIA_INSTALACION.md           ← Cómo instalar todo paso a paso
```

## ¿Cómo ver la app?

### Desde el celular:
1. Abrir Chrome
2. Ir a `http://150.136.121.68:3000`
3. Para instalarla como app: menú ⋮ → "Agregar a pantalla de inicio"

### Desde la computadora:
Abrir cualquier navegador y ir a `http://150.136.121.68:3000`

## ¿Cómo probamos sin los sensores?

Tenemos un simulador que genera datos falsos para probar que todo funciona:

```bash
cd api-backend
node simulador.js
```

Esto envía datos aleatorios cada 30 segundos, como si fuera el ESP32 real.

## ¿Cuánto costó?

| Cosa | Costo |
|------|-------|
| Servidor Oracle Cloud | $0 (gratis para siempre) |
| App del celular | $0 (es una página web) |
| Mapas OpenStreetMap | $0 (gratis) |
| Dominio / URL | $0 (usamos la IP directa) |
| **Solo los sensores y el ESP32** | ~$15-20 USD |

## Conexiones del hardware

```
ESP32          DHT11 (Temperatura/Humedad)
------         ------
3.3V  ------  VCC
GND   ------  GND
GPIO4 ------  DATA (con resistencia 10K)

ESP32          MQ135 (Calidad del aire)
------         ------
5V    ------  VCC (¡necesita 5 voltios!)
GND   ------  GND
GPIO34 -----  A0

ESP32          FC-37 (Lluvia)
------         ------
3.3V  ------  VCC
GND   ------  GND
GPIO35 -----  A0
```

## Integrantes del equipo

- Alejandro Ruiz
- [Escribir nombres aquí]

## Profesor/a

- [Escribir nombre aquí]

## Colegio

- [Colegio Rogelio Salmona IED]

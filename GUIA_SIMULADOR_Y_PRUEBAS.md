# 🧪 Guía: Simulador y Pruebas

## Simulador de ESP32

El simulador envía datos aleatorios a la API cada 30 segundos, imitando al ESP32 real. Es útil para:
- Probar la API sin tener la tarjeta física
- Verificar que las alertas se generan correctamente
- Llenar de datos la app para demostraciones

### Ejecutar el simulador

Desde tu computadora (necesita Node.js instalado):

```bash
cd api-backend
node simulador.js
```

Salida esperada:
```
🚀 Simulador de ESP32 iniciado
📡 Enviando datos a: http://150.136.121.68:3000/api/lecturas
⏱️  Intervalo: 30 segundos
──────────────────────────────────────────────────
[4:30:00 PM] ✅ Enviado - T:28.5°C H:65% PM2.5:42.3 Lluvia:NO
  ⚠️ Alerta: PM2.5 alto
[4:30:30 PM] ✅ Enviado - T:22.1°C H:71% PM2.5:8.2 Lluvia:SÍ
  ⚠️ Alerta: Lluvia detectada
```

Presionar `Ctrl+C` para detener.

### Datos que genera el simulador

| Medición | Rango aleatorio |
|----------|-----------------|
| Temperatura | 15°C a 40°C |
| Humedad | 30% a 90% |
| PM2.5 | 5 a 80 µg/m³ |
| PM10 | PM2.5 × 1.8 |
| Lluvia | 20% de probabilidad |

---

## Probar la API manualmente

### Ver última lectura:
```bash
curl http://150.136.121.68:3000/api/lecturas/ultima
```

### Ver estado del sistema:
```bash
curl http://150.136.121.68:3000/api/estado
```

### Ver alertas:
```bash
curl http://150.136.121.68:3000/api/alertas
```

### Enviar una lectura manual (simular un envío del ESP32):
```bash
curl -X POST http://150.136.121.68:3000/api/lecturas -H "Content-Type: application/json" -d "{\"deviceId\":\"test\",\"temperatura\":38,\"humedad\":85,\"pm25\":45,\"pm10\":81,\"lluvia\":true,\"lluviaRaw\":200,\"mq135Raw\":750,\"mq135Listo\":true,\"alertas\":{\"tempAlta\":true,\"tempBaja\":false,\"humedadAlta\":true,\"pm25Alto\":true,\"pm10Alto\":true,\"lluvia\":true}}"
```

### Ver historial (últimas 24 horas):
```bash
curl http://150.136.121.68:3000/api/lecturas/historial?horas=24&limite=10
```

### Ver promedios por hora:
```bash
curl http://150.136.121.68:3000/api/lecturas/promedio?horas=12
```

---

## Probar desde el navegador

Abrir en cualquier navegador:
- http://150.136.121.68:3000 → App completa
- http://150.136.121.68:3000/api/estado → JSON del estado
- http://150.136.121.68:3000/api/lecturas/ultima → Última lectura
- http://150.136.121.68:3000/api/alertas → Lista de alertas

---

## Limpiar datos de prueba

Si quieres borrar todos los datos y empezar de cero, conéctate al servidor:

```bash
ssh -i "ruta/llave.key" ubuntu@150.136.121.68
pm2 stop estacion-api
rm /home/ubuntu/api-backend/estacion.db
pm2 restart estacion-api
```

---

## Verificar que el servidor sigue corriendo

```bash
ssh -i "ruta/llave.key" ubuntu@150.136.121.68
pm2 status
```

Debe mostrar `estacion-api` con status **online**.

Si dice **errored** o **stopped**:
```bash
pm2 restart estacion-api
pm2 logs estacion-api --lines 10
```

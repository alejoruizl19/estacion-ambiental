/**
 * Simulador de ESP32 - Envía datos aleatorios a la API
 * Úsalo para probar sin tener la tarjeta física
 * 
 * Ejecutar: node simulador.js
 */

const API_URL = 'http://150.136.121.68:3000/api/lecturas';
const INTERVALO = 30000; // 30 segundos (igual que el ESP32)

function generarLecturaAleatoria() {
  // Temperatura entre 15°C y 40°C
  const temperatura = +(15 + Math.random() * 25).toFixed(1);

  // Humedad entre 30% y 90%
  const humedad = +(30 + Math.random() * 60).toFixed(1);

  // PM2.5 entre 5 y 80 µg/m³
  const pm25 = +(5 + Math.random() * 75).toFixed(1);

  // PM10 es aproximadamente 1.8x PM2.5
  const pm10 = +(pm25 * 1.8).toFixed(1);

  // Lluvia aleatoria (20% de probabilidad)
  const lluvia = Math.random() < 0.2;
  const lluviaRaw = lluvia ? Math.floor(100 + Math.random() * 400) : Math.floor(2500 + Math.random() * 1500);

  // MQ135 raw proporcional al PM2.5
  const mq135Raw = Math.floor(100 + (pm25 / 80) * 900);

  return {
    deviceId: 'simulador-001',
    temperatura,
    humedad,
    pm25,
    pm10,
    lluvia,
    lluviaRaw,
    mq135Raw,
    mq135Listo: true,
    alertas: {
      tempAlta: temperatura > 35,
      tempBaja: temperatura < 5,
      humedadAlta: humedad > 80,
      pm25Alto: pm25 > 35,
      pm10Alto: pm10 > 50,
      lluvia: lluvia
    }
  };
}

async function enviarLectura() {
  const lectura = generarLecturaAleatoria();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lectura)
    });

    const data = await response.json();

    const hora = new Date().toLocaleTimeString();
    console.log(`[${hora}] ✅ Enviado - T:${lectura.temperatura}°C H:${lectura.humedad}% PM2.5:${lectura.pm25} Lluvia:${lectura.lluvia ? 'SÍ' : 'NO'}`);

    if (lectura.alertas.tempAlta) console.log('  ⚠️ Alerta: Temperatura alta');
    if (lectura.alertas.pm25Alto) console.log('  ⚠️ Alerta: PM2.5 alto');
    if (lectura.lluvia) console.log('  ⚠️ Alerta: Lluvia detectada');

  } catch (error) {
    console.log(`[ERROR] No se pudo enviar: ${error.message}`);
  }
}

// Enviar primera lectura inmediatamente
console.log('🚀 Simulador de ESP32 iniciado');
console.log(`📡 Enviando datos a: ${API_URL}`);
console.log(`⏱️  Intervalo: ${INTERVALO / 1000} segundos`);
console.log('─'.repeat(50));
console.log('Presiona Ctrl+C para detener\n');

enviarLectura();

// Enviar lecturas periódicamente
setInterval(enviarLectura, INTERVALO);

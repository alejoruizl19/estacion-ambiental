/**
 * API Backend - Estación de Monitoreo Ambiental
 * Recibe datos del ESP32 y los almacena en SQLite
 * Proporciona endpoints para la app Android
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== BASE DE DATOS =====
const dbPath = process.env.DB_PATH || path.join(__dirname, 'estacion.db');
const db = new Database(dbPath);

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS lecturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    temperatura REAL,
    humedad REAL,
    pm25 REAL,
    pm10 REAL,
    lluvia INTEGER DEFAULT 0,
    lluvia_raw INTEGER,
    mq135_raw INTEGER,
    mq135_listo INTEGER DEFAULT 0,
    alerta_temp_alta INTEGER DEFAULT 0,
    alerta_temp_baja INTEGER DEFAULT 0,
    alerta_humedad_alta INTEGER DEFAULT 0,
    alerta_pm25_alto INTEGER DEFAULT 0,
    alerta_pm10_alto INTEGER DEFAULT 0,
    alerta_lluvia INTEGER DEFAULT 0,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear tabla de alertas
db.exec(`
  CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    valor REAL,
    leida INTEGER DEFAULT 0,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('[DB] Base de datos inicializada correctamente');

// ===== UMBRALES DE ALERTA =====
const UMBRALES = {
  tempAlta: 35.0,
  tempBaja: 5.0,
  humedadAlta: 80.0,
  pm25Alto: 35.0,
  pm10Alto: 50.0
};

// ===== ENDPOINTS =====

// POST /api/lecturas - Recibir datos del ESP32
app.post('/api/lecturas', (req, res) => {
  try {
    const {
      deviceId, temperatura, humedad, pm25, pm10,
      lluvia, lluviaRaw, mq135Raw, mq135Listo, alertas
    } = req.body;

    // Validar datos requeridos
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId es requerido' });
    }

    // Insertar lectura
    const stmt = db.prepare(`
      INSERT INTO lecturas (
        device_id, temperatura, humedad, pm25, pm10,
        lluvia, lluvia_raw, mq135_raw, mq135_listo,
        alerta_temp_alta, alerta_temp_baja, alerta_humedad_alta,
        alerta_pm25_alto, alerta_pm10_alto, alerta_lluvia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      deviceId, temperatura, humedad, pm25, pm10,
      lluvia ? 1 : 0, lluviaRaw, mq135Raw, mq135Listo ? 1 : 0,
      alertas?.tempAlta ? 1 : 0, alertas?.tempBaja ? 1 : 0,
      alertas?.humedadAlta ? 1 : 0, alertas?.pm25Alto ? 1 : 0,
      alertas?.pm10Alto ? 1 : 0, alertas?.lluvia ? 1 : 0
    );

    // Generar alertas si aplica
    generarAlertas(deviceId, { temperatura, humedad, pm25, pm10, lluvia });

    console.log(`[OK] Lectura recibida de ${deviceId} - T:${temperatura}°C H:${humedad}% PM2.5:${pm25}`);

    res.status(201).json({
      message: 'Lectura registrada',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/lecturas/ultima - Última lectura
app.get('/api/lecturas/ultima', (req, res) => {
  try {
    const lectura = db.prepare(
      'SELECT * FROM lecturas ORDER BY id DESC LIMIT 1'
    ).get();

    if (!lectura) {
      return res.status(404).json({ error: 'No hay lecturas registradas' });
    }

    res.json(formatearLectura(lectura));
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/lecturas/historial - Historial de lecturas
app.get('/api/lecturas/historial', (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 50;
    const horas = parseInt(req.query.horas) || 24;

    const lecturas = db.prepare(`
      SELECT * FROM lecturas 
      WHERE fecha >= datetime('now', '-${horas} hours')
      ORDER BY id DESC 
      LIMIT ?
    `).all(limite);

    res.json({
      total: lecturas.length,
      horas,
      lecturas: lecturas.map(formatearLectura)
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/lecturas/promedio - Promedios por hora
app.get('/api/lecturas/promedio', (req, res) => {
  try {
    const horas = parseInt(req.query.horas) || 24;

    const promedios = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00', fecha) as hora,
        ROUND(AVG(temperatura), 1) as temp_promedio,
        ROUND(AVG(humedad), 1) as humedad_promedio,
        ROUND(AVG(pm25), 1) as pm25_promedio,
        ROUND(AVG(pm10), 1) as pm10_promedio,
        SUM(CASE WHEN lluvia = 1 THEN 1 ELSE 0 END) as lecturas_lluvia,
        COUNT(*) as total_lecturas
      FROM lecturas
      WHERE fecha >= datetime('now', '-${horas} hours')
      GROUP BY strftime('%Y-%m-%d %H:00', fecha)
      ORDER BY hora DESC
    `).all();

    res.json({ horas, promedios });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/alertas - Obtener alertas
app.get('/api/alertas', (req, res) => {
  try {
    const soloNoLeidas = req.query.noLeidas === 'true';
    const limite = parseInt(req.query.limite) || 20;

    let query = 'SELECT * FROM alertas';
    if (soloNoLeidas) {
      query += ' WHERE leida = 0';
    }
    query += ' ORDER BY id DESC LIMIT ?';

    const alertas = db.prepare(query).all(limite);

    res.json({
      total: alertas.length,
      alertas: alertas.map(a => ({
        id: a.id,
        deviceId: a.device_id,
        tipo: a.tipo,
        mensaje: a.mensaje,
        valor: a.valor,
        leida: a.leida === 1,
        fecha: a.fecha
      }))
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/alertas/:id/leer - Marcar alerta como leída
app.put('/api/alertas/:id/leer', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE alertas SET leida = 1 WHERE id = ?').run(id);
    res.json({ message: 'Alerta marcada como leída' });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/estado - Estado del sistema
app.get('/api/estado', (req, res) => {
  try {
    const ultimaLectura = db.prepare(
      'SELECT fecha FROM lecturas ORDER BY id DESC LIMIT 1'
    ).get();

    const totalLecturas = db.prepare(
      'SELECT COUNT(*) as total FROM lecturas'
    ).get();

    const alertasNoLeidas = db.prepare(
      'SELECT COUNT(*) as total FROM alertas WHERE leida = 0'
    ).get();

    res.json({
      estado: 'activo',
      ultimaLectura: ultimaLectura?.fecha || null,
      totalLecturas: totalLecturas.total,
      alertasNoLeidas: alertasNoLeidas.total,
      umbrales: UMBRALES
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== FUNCIONES AUXILIARES =====

function generarAlertas(deviceId, datos) {
  const stmtAlerta = db.prepare(
    'INSERT INTO alertas (device_id, tipo, mensaje, valor) VALUES (?, ?, ?, ?)'
  );

  if (datos.temperatura > UMBRALES.tempAlta) {
    stmtAlerta.run(deviceId, 'TEMP_ALTA',
      `⚠️ Temperatura alta: ${datos.temperatura}°C (umbral: ${UMBRALES.tempAlta}°C)`,
      datos.temperatura);
  }

  if (datos.temperatura < UMBRALES.tempBaja) {
    stmtAlerta.run(deviceId, 'TEMP_BAJA',
      `🥶 Temperatura baja: ${datos.temperatura}°C (umbral: ${UMBRALES.tempBaja}°C)`,
      datos.temperatura);
  }

  if (datos.humedad > UMBRALES.humedadAlta) {
    stmtAlerta.run(deviceId, 'HUMEDAD_ALTA',
      `💧 Humedad alta: ${datos.humedad}% (umbral: ${UMBRALES.humedadAlta}%)`,
      datos.humedad);
  }

  if (datos.pm25 > UMBRALES.pm25Alto) {
    stmtAlerta.run(deviceId, 'PM25_ALTO',
      `🌫️ PM2.5 alto: ${datos.pm25} µg/m³ (umbral: ${UMBRALES.pm25Alto} µg/m³)`,
      datos.pm25);
  }

  if (datos.pm10 > UMBRALES.pm10Alto) {
    stmtAlerta.run(deviceId, 'PM10_ALTO',
      `🌫️ PM10 alto: ${datos.pm10} µg/m³ (umbral: ${UMBRALES.pm10Alto} µg/m³)`,
      datos.pm10);
  }

  if (datos.lluvia) {
    stmtAlerta.run(deviceId, 'LLUVIA',
      '🌧️ Se detectó lluvia', 1);
  }
}

function formatearLectura(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    temperatura: row.temperatura,
    humedad: row.humedad,
    pm25: row.pm25,
    pm10: row.pm10,
    lluvia: row.lluvia === 1,
    lluviaRaw: row.lluvia_raw,
    mq135Raw: row.mq135_raw,
    mq135Listo: row.mq135_listo === 1,
    alertas: {
      tempAlta: row.alerta_temp_alta === 1,
      tempBaja: row.alerta_temp_baja === 1,
      humedadAlta: row.alerta_humedad_alta === 1,
      pm25Alto: row.alerta_pm25_alto === 1,
      pm10Alto: row.alerta_pm10_alto === 1,
      lluvia: row.alerta_lluvia === 1
    },
    fecha: row.fecha
  };
}

// ===== INICIAR SERVIDOR =====
// Configurar zona horaria para Colombia
process.env.TZ = 'America/Bogota';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  Estación Ambiental - API Backend`);
  console.log(`  Servidor corriendo en puerto ${PORT}`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================\n`);
});

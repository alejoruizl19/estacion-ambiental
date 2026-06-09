# Diagrama de Conexiones ESP32

## Pines del ESP32 que usamos:

En tu tarjeta busca estos pines (están impresos en la placa):
- **3V3** = 3.3 voltios
- **VIN** = 5 voltios (¡importante para el MQ135!)
- **GND** = tierra (hay varios, cualquiera sirve)
- **D4** = GPIO4 (para el DHT11)
- **D34** = GPIO34 (para el MQ135)
- **D35** = GPIO35 (para el FC-37 lluvia)

---

## Sensor DHT11 (Temperatura y Humedad)

El DHT11 tiene 3 pines (algunos tienen 4, pero uno no se usa):

```
DHT11          ESP32
─────          ─────
VCC  ───────>  3V3
DATA ───────>  D4
GND  ───────>  GND
```

⚠️ IMPORTANTE: Pon una resistencia de 10KΩ entre VCC y DATA del DHT11 (pull-up). Si no tienes la resistencia y funciona (como en tu caso), déjalo así.

---

## Sensor MQ135 (Calidad del aire - PM2.5 y PM10)

La placa azul del MQ135 tiene 4 pines: VCC, GND, D0 (digital) y A0 (analógico).
**Solo usamos A0** (NO el D0).

```
MQ135          ESP32
─────          ─────
VCC  ───────>  VIN  (¡¡5 voltios!! NO 3V3)
GND  ───────>  GND
A0   ───────>  D34
D0   ───────>  (no conectar, dejar suelto)
```

⚠️ MUY IMPORTANTE:
- El VCC del MQ135 va al pin **VIN** (5V), NO al 3V3
- Usar el pin **A0** del sensor (analógico), NO el D0 (digital)
- El sensor necesita 3-5 minutos calentando antes de dar lecturas buenas
- Si el valor "mq135Raw" sale menor a 50, revisa que esté en VIN (5V)

---

## Sensor FC-37 (Lluvia)

La placa del sensor de lluvia tiene 3 o 4 pines. Usa la salida **analógica (A0)** si la tiene, o la que diga **OUT** si solo tiene 3 pines.

```
FC-37          ESP32
─────          ─────
VCC  ───────>  3V3
GND  ───────>  GND
A0   ───────>  D35  (o el pin que diga "OUT")
```

Nota: Si tu módulo dice "+" y "-" y "out":
- (+) va a 3V3
- (-) va a GND  
- (out) va a D35

---

## Resumen visual

```
ESP32 (vista de los pines que necesitas):

        VIN ─────────── VCC del MQ135 (5V)
        GND ─────────── GND de los 3 sensores
        3V3 ─────────── VCC del DHT11 y FC-37
         D4 ─────────── DATA del DHT11
        D34 ─────────── A0 del MQ135
        D35 ─────────── A0/OUT del FC-37
```

---

## Colores de cables sugeridos (para no confundirse):

| Cable | Color sugerido | Conexión |
|-------|----------------|----------|
| VCC 5V (MQ135) | Rojo | VIN → MQ135 VCC |
| VCC 3.3V (DHT11, FC-37) | Naranja | 3V3 → DHT11 VCC, FC-37 VCC |
| GND (todos) | Negro | GND → todos los GND |
| Datos DHT11 | Amarillo | D4 → DHT11 DATA |
| Datos MQ135 | Azul | D34 → MQ135 A0 |
| Datos FC-37 | Verde | D35 → FC-37 A0/OUT |

---

## ¿Cómo saber si funciona?

Abre el Monitor Serial en Arduino IDE (115200 baud) y deberías ver:

```
--- Lectura de Sensores ---
Temperatura: 22.8 °C        ← debe ser un número razonable
Humedad: 66.0 %             ← debe ser un número razonable
PM2.5: 15.3 µg/m³ (Raw: 350) ← el Raw debe ser > 100
PM10: 27.5 µg/m³
Lluvia: NO (Raw: 4095)      ← 4095 = seco, < 500 = mojado
```

Si "mq135Raw" sale menor a 50:
→ Revisa que el cable VCC del MQ135 esté en **VIN** (5V)
→ Revisa que estés usando el pin **A0** del MQ135 (no D0)
→ Espera 3-5 minutos a que caliente

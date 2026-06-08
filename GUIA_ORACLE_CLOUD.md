# ☁️ Guía: Desplegar el Backend en Oracle Cloud (Gratis)

Guía probada paso a paso. Tiempo estimado: 30-45 minutos con ayuda.

---

## Resumen de lo que se necesita

- Cuenta en Oracle Cloud (gratis, pide tarjeta pero NO cobra)
- Un servidor Ubuntu con IP pública
- Node.js 20 instalado
- PM2 para mantener el proceso corriendo

---

## Paso 1: Crear cuenta en Oracle Cloud

1. Ir a: https://www.oracle.com/cloud/free/
2. Click en **"Start for free"**
3. Llenar formulario con datos personales
4. Seleccionar región cercana (ej: US East - Ashburn)
5. Tipo de cuenta: **Free Tier**
6. Verificación con tarjeta (NO cobra nada)
7. Esperar email de confirmación (5-30 minutos)

---

## Paso 2: Crear la red (VCN) primero

**IMPORTANTE**: Crear la red ANTES de la instancia para evitar problemas con la IP pública.

1. Menú ☰ → **Networking** → **Virtual Cloud Networks**
2. Click en **"Start VCN Wizard"**
3. Seleccionar **"Create VCN with Internet Connectivity"**
4. Configurar:
   - Name: `vcn-estacion-ambiental`
   - Compartment: el que tengas (root)
   - Dejar CIDRs por defecto
5. Click **Next** → **Create**
6. Esperar a que se cree (crea VCN + subnet pública + internet gateway + route tables)

---

## Paso 3: Crear el servidor (Instancia Compute)

1. Menú ☰ → **Compute** → **Instances** → **Create Instance**

### Configurar:

| Campo | Valor |
|-------|-------|
| Name | `estacion-ambiental` |
| Image | **Ubuntu 22.04** (cambiar de Oracle Linux a Ubuntu) |
| Shape | VM.Standard.E2.1.Micro (Always Free) |
| Availability Domain | AD 2 (donde dice que está disponible E2.1.Micro) |

### Placement:
- Dejar **AD 2** (donde indica disponibilidad)

### Advanced options:
- **On-demand capacity** (la primera opción, ya marcada)
- Security: no tocar nada, dejar todo desactivado

### Networking:
- **Select existing virtual cloud network**: `vcn-estacion-ambiental`
- **Select existing subnet**: la subnet pública que se creó
- **Automatically assign public IPv4 address**: ✅ ACTIVAR (toggle azul)
- IPv6: dejar desactivado

### SSH Keys:
- **Generate a key pair for me**
- **DESCARGAR AMBAS LLAVES** (privada y pública) ← MUY IMPORTANTE
- Guardarlas en lugar seguro (ej: carpeta del proyecto)

### Storage:
- No tocar nada, dejar por defecto (46.6 GB)

2. Click **Create**
3. Esperar 2-3 minutos hasta que diga **RUNNING**
4. **Anotar la IP pública** (ej: 150.136.121.68)

---

## Paso 4: Abrir puerto 3000 en Oracle Cloud

1. En la página de la instancia → click en la **Subnet**
2. Click en la **Security List** (Default)
3. Click en **"Add Ingress Rules"**
4. Configurar:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Source Port Range: (vacío)
   - **Destination Port Range**: `3000`
   - Description: `API Estacion Ambiental`
5. Click **Add Ingress Rules**

---

## Paso 5: Conectarse por SSH

Desde PowerShell en Windows:

```powershell
ssh -i "C:\ruta\a\tu\ssh-key.key" ubuntu@TU_IP_PUBLICA
```

### Si da error "Permission denied":
```powershell
icacls "C:\ruta\a\tu\ssh-key.key" /inheritance:r /grant:r "%username%:R"
```

### Si la imagen es Oracle Linux (no Ubuntu):
```powershell
ssh -i "C:\ruta\a\tu\ssh-key.key" opc@TU_IP_PUBLICA
```

### Si dice "No such file or directory":
Verificar la ruta exacta del archivo .key con:
```powershell
dir "C:\Users\TU_USUARIO\Downloads\*key*"
```

---

## Paso 6: Instalar Node.js 20

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # Debe decir v20.x.x
npm --version
```

**Si `apt update` da error "Could not get lock"**: Esperar 2-3 minutos (hay un proceso del sistema corriendo). Verificar con `ps aux | grep apt` y matar si está en estado T (stopped): `sudo kill -9 PID`

---

## Paso 7: Instalar PM2 y Git

```bash
sudo npm install -g pm2
sudo apt install -y git
```

---

## Paso 8: Abrir puerto 3000 en el firewall de Ubuntu

```bash
sudo iptables -L INPUT -n --line-numbers
```

Buscar la regla REJECT (ej: línea 5). La regla del puerto 3000 debe ir ANTES del REJECT:

```bash
sudo iptables -I INPUT 5 -p tcp --dport 3000 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

(Decir "Yes" a todo lo que pregunte)

**IMPORTANTE**: Si la regla queda DESPUÉS del REJECT, no funcionará. Verificar con:
```bash
sudo iptables -L INPUT -n --line-numbers
```
La regla del puerto 3000 debe estar en un número MENOR que la regla REJECT.

---

## Paso 9: Subir el código

### Opción A: Con scp desde Windows

```powershell
scp -i "C:\ruta\llave.key" -r api-backend ubuntu@TU_IP:/home/ubuntu/
```

### Opción B: Con Git (si está en GitHub)

```bash
cd ~
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO/api-backend
```

---

## Paso 10: Instalar dependencias y ejecutar

```bash
cd ~/api-backend
npm install
pm2 start server.js --name "estacion-api"
pm2 logs estacion-api --lines 5
```

Debe mostrar:
```
[DB] Base de datos inicializada correctamente
Estación Ambiental - API Backend
Servidor corriendo en puerto 3000
```

---

## Paso 11: Configurar auto-inicio

```bash
pm2 startup
```

Esto imprime un comando con `sudo`. **Copiar y ejecutar ese comando completo**. Ejemplo:
```bash
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Después:
```bash
pm2 save
```

---

## Paso 12: Verificar

### Desde el servidor:
```bash
curl http://localhost:3000/api/estado
```

### Desde tu navegador:
```
http://TU_IP:3000/api/estado
```

### Desde tu celular:
```
http://TU_IP:3000
```

---

## Comandos útiles del día a día

```bash
# Ver estado del servidor
pm2 status

# Ver logs en tiempo real
pm2 logs estacion-api

# Reiniciar después de actualizar código
pm2 restart estacion-api

# Detener
pm2 stop estacion-api

# Ver uso de CPU/RAM
pm2 monit

# Actualizar archivos desde Windows
# (desde PowerShell en tu PC):
scp -i "ruta/llave.key" archivo.js ubuntu@IP:/home/ubuntu/api-backend/
# Luego en SSH:
pm2 restart estacion-api
```

---

## Solución de Problemas Encontrados

### Node.js se instala pero sigue en versión 10:
```bash
sudo apt remove -y nodejs
sudo rm -f /etc/apt/sources.list.d/nodesource.list*
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Error "SyntaxError: Unexpected token ." (optional chaining):
Significa que Node.js es viejo (<14). Verificar `node --version` e instalar v20.

### Error "ERR_DLOPEN_FAILED" / "libnode.so.64":
Los módulos nativos se compilaron con otra versión de Node. Solución:
```bash
cd ~/api-backend
rm -rf node_modules
npm install
pm2 restart estacion-api
```

### Puerto 3000 no accesible desde internet:
1. Verificar Security List en Oracle Cloud (Destination Port Range: 3000)
2. Verificar iptables: la regla 3000 debe estar ANTES del REJECT
3. Verificar que PM2 muestra "online": `pm2 status`

### "Could not get lock /var/lib/apt/lists/lock":
```bash
ps aux | grep apt
sudo kill -9 PID_DEL_PROCESO
```

---

## Costos

| Recurso | Costo |
|---------|-------|
| Servidor (1 CPU, 1GB RAM) | $0/mes |
| Disco 50GB | $0/mes |
| IP Pública fija | $0/mes |
| Tráfico (10TB/mes) | $0/mes |
| **TOTAL** | **$0/mes - Gratis para siempre** |

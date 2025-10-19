# 🚀 GUÍA DE INSTALACIÓN Y DESPLIEGUE RÁPIDO
# Sistema de Sincronización Inteligente - NubeDistribuible

## ⚡ Instalación Rápida (5 minutos)

### 1. 📋 Pre-requisitos
```bash
# Verificar Node.js (requiere v16+)
node --version

# Verificar npm
npm --version
```

### 2. 🗄️ Instalar MongoDB

#### Windows:
```powershell
# Descargar e instalar MongoDB Community Server desde:
# https://www.mongodb.com/try/download/community

# O usando Chocolatey:
choco install mongodb

# Iniciar MongoDB:
mongod --dbpath C:\data\db
```

#### macOS:
```bash
# Usando Homebrew:
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu):
```bash
# Instalar MongoDB:
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 3. 🔧 Configurar el Sistema

```bash
# 1. Ejecutar inicializador automático:
npm run init-sync

# 2. Verificar estado del sistema:
npm run health-check

# 3. Si todo está OK, iniciar el sistema:
npm run dev
```

## 🌐 Acceder a la Aplicación

Una vez iniciado, la aplicación estará disponible en:

- **Frontend (Usuario)**: http://localhost:3000
- **Backend (API)**: http://localhost:5000  
- **Servicio Sync**: http://localhost:5001
- **Panel Admin**: http://localhost:3000/admin

## 🎯 Uso del Sistema de Sincronización

### Activar Sincronización:
1. Hacer clic en el botón flotante "⚡ Sync" (esquina inferior derecha)
2. Seleccionar carpetas a sincronizar
3. Configurar preferencias de resolución de conflictos
4. ¡Listo! El sistema monitoreará automáticamente

### Características Principales:
- ✅ **Sincronización Bidireccional** automática
- 🤖 **IA para resolución de conflictos**
- ⚡ **Detección en tiempo real** de cambios
- 🔒 **Cifrado AES-256** para archivos sensibles
- 📱 **Interfaz moderna** y responsiva
- 📊 **Métricas de rendimiento** en tiempo real

## 🔧 Comandos Útiles

```bash
# Desarrollo y testing
npm run dev              # Iniciar en modo desarrollo
npm run server-only      # Solo backend
npm run client           # Solo frontend
npm run health-check     # Verificar estado del sistema

# Mantenimiento
npm run init-sync        # Reinicializar sistema
npm run test-sync        # Probar servicio de sincronización  
npm run logs             # Ver logs en tiempo real
npm run backup-db        # Backup de base de datos

# Producción
npm run build            # Construir para producción
npm start                # Iniciar en producción
```

## 🐛 Solución de Problemas

### MongoDB no se conecta:
```bash
# Verificar que MongoDB esté corriendo:
mongosh

# Si no funciona, iniciar MongoDB:
# Windows: mongod --dbpath C:\data\db  
# macOS/Linux: sudo systemctl start mongodb
```

### Puerto en uso:
```bash
# Ver qué está usando el puerto:
netstat -ano | findstr :5000

# Cambiar puerto en .env:
PORT=5002
```

### Dependencias faltantes:
```bash
# Reinstalar dependencias:
npm run clean
npm install
```

### Problemas de permisos:
```bash
# Windows - ejecutar como administrador
# macOS/Linux:
sudo chown -R $(whoami) .
chmod -R 755 .
```

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                 NUBE DISTRIBUIBLE                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (React)     Backend (Express)    MongoDB     │
│  ┌─────────────┐     ┌─────────────────┐  ┌─────────┐   │
│  │• SyncPanel  │ ◄── │• SyncEngine     │◄─│• Files  │   │
│  │• Calendar   │     │• FileWatcher    │  │• Users  │   │
│  │• FileEditor │     │• AI Engine      │  │• Sync   │   │
│  │• Auth       │     │• WebSocket      │  │• Logs   │   │
│  └─────────────┘     └─────────────────┘  └─────────┘   │
│                                                         │
│  Real-time Sync ◄────► AI Optimization ◄────► Security │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Seguridad

### Configuración por defecto:
- ✅ JWT Authentication con expiración automática
- ✅ AES-256-GCM para archivos sensibles
- ✅ SHA-256 checksums para integridad
- ✅ Rate limiting y validación de entrada
- ✅ HTTPS ready (configurar certificados)

### Recomendaciones para producción:
1. **Cambiar claves secretas** en `.env`
2. **Usar HTTPS** con certificados válidos
3. **Configurar firewall** apropiadamente
4. **Backup automático** de base de datos
5. **Monitoreo** de logs y métricas

## 📈 Métricas y Monitoreo

### Panel de Control incluye:
- 📊 **Estadísticas en tiempo real** de sincronización
- 🔄 **Estado de cola** de archivos pendientes
- ⚡ **Rendimiento** de transferencias
- 🎯 **Precisión de IA** en resolución de conflictos
- 📈 **Uso de ancho de banda** por usuario
- 🕒 **Historial** de operaciones

### Logs estructurados:
```bash
# Ver logs en tiempo real:
npm run logs

# Logs disponibles en:
./logs/app.log          # Aplicación general
./logs/sync.log         # Servicio de sincronización  
./logs/ai.log          # Motor de IA
./logs/error.log       # Errores del sistema
```

## 🚀 Despliegue en Producción

### Configuración recomendada:
```bash
# 1. Variables de producción en .env:
NODE_ENV=production
PORT=5000
MONGODB_URL=mongodb://tu-servidor:27017/nube_distribuible

# 2. Construir aplicación:
npm run build

# 3. Iniciar con PM2 (recomendado):
npm install -g pm2
pm2 start ecosystem.config.js
```

### Docker (opcional):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000 5001
CMD ["npm", "start"]
```

### Cloudflare Tunnels:
```bash
# Configurar tunnel para acceso remoto seguro:
cloudflared tunnel create nube-distribuible
cloudflared tunnel route dns nube-distribuible sync.tudominio.com
cloudflared tunnel run nube-distribuible
```

## 📞 Soporte y Recursos

### Documentación completa:
- 📚 **Manual técnico**: `SYNC_SYSTEM_README.md`
- ⚙️ **Configuración**: `.env.example`
- 🔍 **API Reference**: Endpoints documentados en README principal

### Comandos de diagnóstico:
```bash
npm run health-check     # Verificación completa del sistema
npm run status          # Estado actual (alias de health-check)
npm run test-sync       # Probar conectividad de sincronización
```

### Soporte técnico:
- 🐛 **Reportar bugs**: GitHub Issues
- 💬 **Discusiones**: GitHub Discussions  
- 📧 **Email**: soporte@nubedistribuible.com
- 📖 **Wiki**: Documentación extendida en GitHub

---

**¡Tu Sistema de Sincronización Inteligente está listo! 🎉**

> **Tip**: Ejecuta `npm run health-check` regularmente para mantener el sistema en óptimas condiciones.
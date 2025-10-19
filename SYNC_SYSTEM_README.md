# Sistema de Sincronización Inteligente - NubeDistribuible

## 📋 Descripción General

El Sistema de Sincronización Inteligente de NubeDistribuible es una solución completa que combina sincronización bidireccional de archivos, inteligencia artificial para optimización automática, y una interfaz de usuario moderna para pequeñas empresas.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                   NUBE DISTRIBUIBLE SYNC SYSTEM                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   FRONTEND      │  │    BACKEND       │  │   BASE DATOS    │ │
│  │                 │  │                  │  │                 │ │
│  │ • SyncPanel     │◄─┤ • SyncEngine     │◄─┤ • MongoDB       │ │
│  │ • SyncButton    │  │ • FileWatcher    │  │ • Redis Cache   │ │
│  │ • ConflictUI    │  │ • AI Engine      │  │ • Queue System  │ │
│  │ • StatusWidget  │  │ • WebSocket      │  │                 │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   AI COMPONENTS                             │ │
│  │ • Pattern Learning  • Conflict Resolution  • Optimization  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Sincronización

1. **Detección**: FileWatcher detecta cambios usando chokidar
2. **Cola**: Los cambios se añaden a SyncQueue con prioridad IA
3. **Procesamiento**: SyncEngine procesa elementos de la cola
4. **Conflictos**: Si hay conflictos, la IA sugiere resoluciones
5. **Sincronización**: Los archivos se sincronizan bidireccionalmente
6. **Notificación**: WebSocket notifica al frontend en tiempo real

## 🚀 Características Principales

### ✅ Sincronización Bidireccional
- **Local → Nube**: Cambios locales se reflejan en el servidor
- **Nube → Local**: Cambios remotos se descargan automáticamente
- **Tiempo Real**: Detección inmediata usando file watchers
- **Compresión**: Archivos grandes se comprimen antes de transferir

### 🤖 Inteligencia Artificial Integrada
- **Aprendizaje de Patrones**: Analiza horas de trabajo, tipos de archivo, carpetas frecuentes
- **Optimización Automática**: Prioriza archivos según patrones de uso
- **Resolución de Conflictos**: Sugiere resoluciones basadas en historial
- **Predicción de Red**: Optimiza sincronización según condiciones de red

### ⚡ Modo Offline Inteligente
- **Cola Persistente**: Cambios se guardan localmente cuando no hay conexión
- **Sincronización Automática**: Al reconectar, procesa cola pendiente
- **Detección de Conflictos**: Maneja conflictos offline/online automáticamente
- **Recuperación**: Sistema robusto de recuperación ante fallos

### 🔒 Seguridad Avanzada
- **Cifrado**: AES-256-GCM para contenido sensible
- **Autenticación**: JWT tokens con expiración automática
- **Integridad**: SHA-256 checksums para validar transferencias
- **Permisos**: Control granular de acceso por usuario/carpeta

### 📊 Monitoreo en Tiempo Real
- **Panel de Control**: Interfaz moderna con estado en tiempo real
- **Métricas**: Estadísticas de rendimiento y uso
- **Alertas**: Notificaciones de errores y conflictos
- **Historial**: Log completo de operaciones de sincronización

## 🗂️ Estructura de Archivos

```
sync-system/
├── ai/
│   └── SyncAI.js                 # Motor de inteligencia artificial
├── core/
│   ├── FileWatcher.js            # Monitoreo de archivos
│   └── SyncEngine.js             # Motor de sincronización
├── models/
│   ├── SyncFile.js               # Modelo de archivo
│   ├── SyncQueue.js              # Modelo de cola
│   └── UserSyncConfig.js         # Configuración de usuario
├── services/
│   └── SyncService.js            # Servicio principal
├── utils/
│   └── SyncUtils.js              # Utilidades comunes
└── syncIntegration.js            # Integración con servidor principal

src/components/
├── SyncButton.jsx                # Botón flotante de sincronización
└── SyncPanel/
    ├── SyncPanel.jsx             # Panel principal
    ├── SyncStatusIndicator.jsx   # Indicador de estado
    ├── SyncQueueList.jsx         # Lista de cola
    ├── ConflictResolutionPanel.jsx # Resolución de conflictos
    ├── SyncSettings.jsx          # Configuración
    ├── SyncStats.jsx             # Estadísticas
    └── *.css                     # Estilos correspondientes
```

## 🔧 Configuración e Instalación

### Requisitos Previos
- Node.js 16+ 
- MongoDB 5.0+
- Redis 6.0+ (opcional, para caché)
- NPM o Yarn

### Instalación

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
```env
# .env
MONGODB_URL=mongodb://localhost:27017/nube_distribuible
SYNC_PORT=5001
SESSION_SECRET=tu_clave_secreta_aqui
CLIENT_URL=http://localhost:3000
```

3. **Inicializar base de datos**:
```bash
# MongoDB se inicializa automáticamente
# Las colecciones se crean en el primer uso
```

4. **Iniciar el sistema**:
```bash
npm run dev
```

## 🎯 Uso del Sistema

### Para Usuarios

1. **Activar Sincronización**:
   - Hacer clic en el botón flotante "⚡ Sync"
   - Configurar carpetas a sincronizar
   - Establecer preferencias de resolución de conflictos

2. **Monitorear Estado**:
   - El icono cambia de color según el estado
   - Verde: Sincronizado
   - Azul: Sincronizando
   - Rojo: Error
   - Amarillo: Conflictos pendientes

3. **Resolver Conflictos**:
   - Abrir panel de sincronización
   - Ir a pestaña "Conflictos"
   - Revisar sugerencias de IA
   - Elegir resolución apropiada

### Para Administradores

1. **Configuración Global**:
   - Acceder a `/api/sync/service-status`
   - Configurar límites de ancho de banda
   - Establecer políticas de sincronización

2. **Monitoreo**:
   - Ver estadísticas en tiempo real
   - Revisar logs de sincronización
   - Gestionar usuarios activos

## 🔌 API Endpoints

### Estado del Servicio
```http
GET /api/sync/service-status
```
Retorna el estado actual del servicio de sincronización.

### Configuración de Usuario
```http
GET /api/sync/user-config/:userId
PUT /api/sync/user-config/:userId
```
Obtiene o actualiza la configuración de sincronización del usuario.

### Inicializar Sincronización
```http
POST /api/sync/initialize/:userId
```
Inicializa la sincronización para un usuario específico.

### Estadísticas
```http
GET /api/sync/stats/:userId
```
Obtiene estadísticas detalladas de sincronización.

### Control de Sincronización
```http
POST /api/sync/toggle/:userId
```
Activa o desactiva la sincronización para un usuario.

## 🤖 Sistema de IA

### Algoritmos de Aprendizaje

1. **Análisis de Patrones Temporales**:
   ```javascript
   // Detecta horas pico de trabajo
   analyzeWorkingHours(files) {
     // Analiza timestamps de modificación
     // Identifica patrones semanales/diarios
     // Calcula horas de mayor actividad
   }
   ```

2. **Priorización Inteligente**:
   ```javascript
   // Calcula prioridad basada en múltiples factores
   calculateAIPriority(userId, fileInfo, operation) {
     // Factor de tipo de archivo
     // Factor de frecuencia de uso
     // Factor de tamaño
     // Factor de ubicación
     // Factor de hora actual
   }
   ```

3. **Resolución de Conflictos**:
   ```javascript
   // Sugiere resolución basada en historial
   suggestConflictResolution(userId, conflict) {
     // Analiza conflictos previos
     // Considera tipo de archivo
     // Evalúa timestamps
     // Propone solución con confianza
   }
   ```

### Métricas de IA

- **Confianza**: Porcentaje de certeza en sugerencias
- **Precisión**: Tasa de éxito de predicciones
- **Adaptación**: Velocidad de aprendizaje de nuevos patrones
- **Optimización**: Mejora en tiempos de sincronización

## 📈 Escalabilidad

### Arquitectura Multi-Usuario

```javascript
// Servicio principal maneja múltiples usuarios
class SyncService {
  constructor() {
    this.fileWatchers = new Map(); // userId -> FileWatcher
    this.activeSessions = new Map(); // userId -> socket
    this.syncQueues = new Map();    // userId -> queue
  }
}
```

### Balanceado de Carga

1. **Distribución por Usuario**: Cada usuario tiene su propia instancia de watcher
2. **Cola de Prioridades**: Procesamiento basado en prioridad IA
3. **Límites de Concurrencia**: Control de operaciones simultáneas
4. **Throttling**: Límites de ancho de banda por usuario

### Base de Datos

```javascript
// Índices optimizados para rendimiento
syncFileSchema.index({ userId: 1, syncStatus: 1 });
syncFileSchema.index({ lastModified: -1 });
syncFileSchema.index({ 'syncMetadata.priority': -1 });
```

## 🔍 Monitoreo y Debugging

### Logs del Sistema

```javascript
// Logs estructurados para debugging
console.log(`File change detected for user ${userId}:`, {
  type: eventData.type,
  path: eventData.path,
  timestamp: eventData.timestamp
});
```

### Métricas de Rendimiento

- **Throughput**: Archivos procesados por segundo
- **Latencia**: Tiempo promedio de sincronización
- **Error Rate**: Porcentaje de operaciones fallidas
- **Queue Depth**: Elementos pendientes en cola

### Herramientas de Diagnóstico

1. **Panel de Estado**: Interfaz web para monitoreo
2. **API de Métricas**: Endpoints para obtener estadísticas
3. **Logs Centralizados**: Sistema de logging estructurado
4. **Alertas**: Notificaciones automáticas de problemas

## 🚀 Despliegue

### Desarrollo Local
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000 5001
CMD ["npm", "start"]
```

### Cloudflare Tunnels
```bash
# Configurar tunnel para acceso remoto
cloudflared tunnel create nube-distribuible
cloudflared tunnel route dns nube-distribuible sync.tudominio.com
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Servidor principal
PORT=5000
MONGODB_URL=mongodb://localhost:27017/nube_distribuible
SESSION_SECRET=tu_clave_secreta_super_segura

# Servicio de sincronización
SYNC_PORT=5001
MAX_CONCURRENT_SYNCS=5
SYNC_INTERVAL=30000
RETRY_ATTEMPTS=3
BATCH_SIZE=10

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Seguridad
JWT_SECRET=jwt_secret_key
ENCRYPTION_KEY=encryption_key_32_chars_long

# IA
AI_LEARNING_INTERVAL=86400000  # 24 horas
AI_CONFIDENCE_THRESHOLD=0.7
```

### Configuración de MongoDB

```javascript
// Configuración recomendada para producción
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: "majority"
}
```

## 🛠️ Resolución de Problemas

### Problemas Comunes

1. **Conexión fallida a MongoDB**:
   ```bash
   # Verificar que MongoDB esté corriendo
   mongosh
   # Verificar permisos de usuario
   ```

2. **Socket.IO no conecta**:
   ```javascript
   // Verificar configuración CORS
   const io = socketIo(server, {
     cors: {
       origin: process.env.CLIENT_URL,
       methods: ["GET", "POST"],
       credentials: true
     }
   });
   ```

3. **Watcher no detecta cambios**:
   ```javascript
   // Verificar permisos de archivos
   // Aumentar límite de file descriptors
   ulimit -n 65536
   ```

### Debug Mode

```javascript
// Activar logs detallados
process.env.DEBUG = 'sync:*';
```

## 📚 Ejemplos de Uso

### Configurar Sincronización Programáticamente

```javascript
// Inicializar para un usuario
const response = await fetch('/api/sync/initialize/user123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    syncPaths: [{
      path: '/Users/usuario/Documentos/Trabajo',
      isEnabled: true,
      priority: 8,
      excludePatterns: ['*.tmp', '*.log'],
      maxFileSize: 100 * 1024 * 1024
    }],
    preferences: {
      syncInterval: 30000,
      autoResolveConflicts: false,
      conflictResolution: 'ai_suggest'
    }
  })
});
```

### Escuchar Eventos de Sincronización

```javascript
// Frontend - Conectar a WebSocket
const socket = io('http://localhost:5001');

socket.on('file_detected', (data) => {
  console.log('Archivo detectado:', data.file.fileName);
});

socket.on('sync_completed', (data) => {
  console.log('Sincronización completada:', data.queueId);
});

socket.on('conflict_detected', (data) => {
  console.log('Conflicto detectado:', data.conflict.filePath);
});
```

## 🤝 Contribuir

### Estructura de Desarrollo

1. **Fork** el repositorio
2. **Crear** rama feature: `git checkout -b feature/nueva-caracteristica`
3. **Commit** cambios: `git commit -am 'Añadir nueva característica'`
4. **Push** a la rama: `git push origin feature/nueva-caracteristica`
5. **Crear** Pull Request

### Convenciones de Código

- **ESLint**: Seguir configuración del proyecto
- **Prettier**: Formateo automático
- **JSDoc**: Documentar funciones públicas
- **Tests**: Añadir tests para nuevas características

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles.

## 🆘 Soporte

- **Documentación**: Este archivo README
- **Issues**: GitHub Issues para reportar bugs
- **Discusiones**: GitHub Discussions para preguntas
- **Email**: soporte@nubedistribuible.com

---

**NubeDistribuible Sync System v1.0.0**
Sistema de Sincronización Inteligente para Pequeñas Empresas
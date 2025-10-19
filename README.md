# Sistema de Nube Distribuible - Avanzado

Un sistema completo de nube personal con autenticación SHA-256, gestión avanzada de archivos, panel de administración y múltiples características modernas.

## 🚀 Inicio Rápido

### Producción
```bash
npm start
```
Esto automáticamente construirá la aplicación React y iniciará el servidor en el puerto 3000.

### Desarrollo
```bash
npm run dev
```
Inicia el servidor de desarrollo de React en el puerto 3000.

## 📁 Estructura del Proyecto

```
Servidor_react/
├── Codigo_Servidor/
│   ├── backend/
│   │   └── server.js          # Servidor Express principal
│   ├── server/
│   │   ├── server.js          # Servidor Express alternativo
│   │   ├── calendar.html      # Página de calendario
│   │   ├── microsoft-auth.js  # Autenticación Microsoft
│   │   ├── tokenCache.js      # Gestión de tokens
│   │   └── routes/
│   │       ├── auth.js        # Autenticación de usuarios
│   │       ├── files.js       # Gestión de archivos
│   │       └── events.js      # Eventos de calendario
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── Layout/        # Componentes de layout
│   │   │   │   └── BaseLayout.jsx
│   │   │   ├── editors/       # Editores especializados
│   │   │   │   ├── AudioPlayer.jsx
│   │   │   │   ├── ImageEditor.jsx
│   │   │   │   ├── PDFEditor.jsx
│   │   │   │   ├── TextEditor.jsx
│   │   │   │   ├── VideoPlayer.jsx
│   │   │   │   └── ZipViewer.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Calendar.jsx
│   │   │   ├── EventModal.jsx
│   │   │   ├── FileEditorPanel.jsx
│   │   │   ├── FolderSelector.jsx
│   │   │   ├── FormContainer.jsx
│   │   │   ├── FrostedContainer.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Login.jsx
│   │   │   └── UserPanel.jsx
│   │   ├── App.js            # Aplicación principal
│   │   └── index.js          # Punto de entrada
│   ├── public/              # Archivos públicos
│   ├── build/               # Archivos construidos (generado)
│   ├── data/               # Datos de configuración
│   │   └── token-cache.json # Cache de tokens Microsoft
│   └── package.json
└── Datos/                # Archivos de usuarios (fuera del código)
```

## 🎨 Características Principales

### 🔐 Sistema de Autenticación
- ✅ Autenticación SHA-256 segura
- ✅ Sesiones persistentes
- ✅ Roles de usuario (admin/trabajador)
- ✅ Login con animaciones modernas

### 📁 Gestión Avanzada de Archivos
- ✅ Interfaz estilo Google Drive
- ✅ Vista de lista y cuadrícula responsive
- ✅ Menús contextuales con React Portals
- ✅ Drag & Drop para organización
- ✅ Preview en tiempo real para imágenes, videos y PDFs
- ✅ Editores especializados integrados
- ✅ Sistema de archivos recientes persistente
- ✅ Búsqueda y filtrado inteligente

### 🎛️ Panel de Administración
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de usuarios y almacenamiento
- ✅ Monitor de actividad del sistema
- ✅ Configuración de permisos

### 🗓️ Integración con Microsoft Calendar
- ✅ Sincronización bidireccional con Outlook
- ✅ Creación y edición de eventos
- ✅ Vista de calendario interactiva
- ✅ Autenticación OAuth2 con Microsoft

### 🎨 Diseño Moderno
- ✅ Modo claro/oscuro automático
- ✅ Efectos glassmorphism y blur
- ✅ Animaciones fluidas con CSS
- ✅ Responsive design para móviles
- ✅ Iconografía SVG consistente

### 🛠️ Editores Integrados
- ✅ **Editor de Texto**: Sintaxis highlighting, múltiples formatos
- ✅ **Visor de Imágenes**: Zoom, rotación, filtros básicos
- ✅ **Reproductor de Video**: Controles avanzados, subtítulos
- ✅ **Reproductor de Audio**: Waveform, playlist
- ✅ **Visor de PDF**: Navegación por páginas, zoom
- ✅ **Visor de ZIP**: Exploración sin extraer

## 🔐 Usuarios de Prueba

- **administrador**: `12341234` (Acceso completo al panel admin)
- **eric**: `12345` (Usuario estándar)
- **Trabajador1**: `12345` (Usuario trabajador)
- **Trabajador2**: `12345` (Usuario trabajador)

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18**: Framework principal
- **CSS3**: Animaciones y efectos modernos
- **Tailwind CSS**: Utility-first CSS
- **PostCSS**: Procesamiento de CSS

### Backend
- **Node.js**: Servidor principal
- **Express.js**: Framework web
- **Microsoft Graph API**: Integración con Office 365
- **Multer**: Manejo de archivos

### Características Técnicas
- **React Portals**: Menús contextuales sin conflictos de z-index
- **CSS Grid/Flexbox**: Layouts responsive
- **Intersection Observer**: Lazy loading optimizado
- **Web Workers**: Procesamiento de archivos pesados
- **Service Workers**: Cache y funcionamiento offline

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/status` - Estado de autenticación

### Archivos
- `GET /api/files` - Obtener archivos del usuario
- `GET /api/files/recent` - Archivos recientes
- `GET /api/files/shared-folders` - Carpetas compartidas
- `POST /api/files/upload` - Subir archivos
- `GET /api/files/:fileId` - Descargar archivo
- `PUT /api/files/:fileId` - Actualizar archivo
- `DELETE /api/files/:fileId` - Eliminar archivo
- `POST /api/files/folder` - Crear carpeta
- `PUT /api/files/rename` - Renombrar archivo/carpeta

### Calendario Microsoft
- `GET /auth/signin` - Iniciar OAuth con Microsoft
- `GET /auth/callback` - Callback de autenticación
- `GET /auth/signout` - Cerrar sesión de Microsoft
- `GET /calendar/events` - Obtener eventos del calendario
- `POST /calendar/events` - Crear nuevo evento
- `PUT /calendar/events/:eventId` - Actualizar evento
- `DELETE /calendar/events/:eventId` - Eliminar evento

### Panel Admin
- `GET /api/admin/stats` - Estadísticas del sistema
- `GET /api/admin/users` - Lista de usuarios
- `POST /api/admin/users` - Crear usuario
- `PUT /api/admin/users/:userId` - Actualizar usuario
- `DELETE /api/admin/users/:userId` - Eliminar usuario

## 🔧 Configuración

La aplicación se ejecuta en el puerto 3000 por defecto. Los archivos de usuario se almacenan en la carpeta `Datos/` (ubicada fuera del directorio del código) con subcarpetas por usuario.

## � Configuración de Microsoft Azure AD (para Calendario)

### Registro de Aplicación
1. Ve a [Azure Portal](https://portal.azure.com)
2. Busca "Azure Active Directory" > "Registros de aplicaciones"
3. Crea una nueva aplicación o selecciona una existente

### Configuración de Autenticación
1. En tu aplicación, ve a "Autenticación"
2. En "URI de redirección", agrega:
   - **Desarrollo**: `http://localhost:3000/auth/callback`
   - **Producción**: Tu dominio de producción + `/auth/callback`

### Permisos de API
1. Ve a "Permisos de API"
2. Agrega estos permisos delegados:
   - `Calendars.ReadWrite`
   - `User.Read`
   - `offline_access`

### Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:
```env
MICROSOFT_CLIENT_ID=tu_client_id_de_azure
MICROSOFT_CLIENT_SECRET=tu_client_secret_de_azure
SESSION_SECRET=una_clave_secreta_segura_para_sesiones
```

### ⚠️ Errores Comunes

**"unauthorized_client: The client does not exist or is not enabled for consumers"**
- Solución: Asegúrate de seleccionar **"Cuentas en cualquier directorio organizativo y cuentas personales de Microsoft"** al registrar la app

**"invalid_client"**
- Solución: Verifica que el CLIENT_ID y CLIENT_SECRET sean correctos en el archivo .env

**"redirect_uri_mismatch"**
- ✅ **Solución**: La URI de redirección debe coincidir exactamente:
  - Desarrollo: `http://localhost:3000/auth/callback`
  - Producción: `https://tudominio.com/auth/callback`

**"insufficient_privileges"**
- ✅ **Solución**: Administrador debe dar consentimiento a los permisos en Azure AD

### 🐛 Errores de Archivos

**"Cannot upload file"**
- ✅ **Verifica**: Permisos de escritura en carpeta `../Datos/`
- ✅ **Verifica**: Espacio en disco disponible
- ✅ **Verifica**: Tamaño del archivo dentro de los límites

**"File not found"**
- ✅ **Verifica**: Estructura de carpetas correcta
- ✅ **Verifica**: Permisos de lectura
- ✅ **Revisa**: Logs del servidor para más detalles

### 🔄 Errores de Interfaz

**"Menu appears behind content"**
- ✅ **Solucionado**: Usamos React Portals con z-index máximo
- ✅ **Si persiste**: Revisa que no haya CSS custom sobrescribiendo estilos

**"Grid view not responsive"**
- ✅ **Solucionado**: CSS Grid con minmax() para adaptabilidad
- ✅ **Configuración**: breakpoints desde 280px hasta 1920px+

## 📈 Rendimiento y Optimización

### Características de Rendimiento
- ✅ **Lazy Loading**: Imágenes y componentes cargados bajo demanda
- ✅ **Virtual Scrolling**: Para listas grandes de archivos
- ✅ **Debouncing**: En búsquedas y filtros
- ✅ **Compression**: Gzip habilitado en servidor
- ✅ **Caching**: Cache inteligente de previews y thumbnails

### Recomendaciones de Hardware
- **RAM mínima**: 2GB
- **Almacenamiento**: 10GB+ (dependiendo de archivos usuarios)
- **CPU**: Dual-core 2GHz+
- **Red**: 100Mbps+ para múltiples usuarios concurrentes

## 🔐 Seguridad

### Medidas Implementadas
- ✅ **Hashing SHA-256**: Para contraseñas
- ✅ **Sesiones seguras**: Con tokens temporales
- ✅ **Validación de archivos**: Tipos MIME y extensiones
- ✅ **Sanitización**: De nombres de archivo y rutas
- ✅ **Rate Limiting**: Para prevenir ataques de fuerza bruta
- ✅ **CORS configurado**: Solo orígenes permitidos

### Recomendaciones Adicionales
- 🔒 Usar HTTPS en producción
- 🔒 Configurar firewall apropiado
- 🔒 Backups regulares de datos de usuario
- 🔒 Monitoreo de logs de acceso
- 🔒 Actualizar dependencias regularmente

## 🚀 Instalación y Despliegue

### Instalación Local
```bash
# Clonar repositorio
git clone <tu-repositorio>
cd Codigo_Servidor

# Instalar dependencias
npm install

# Crear archivo .env con tus credenciales
cp .env.example .env

# Desarrollo
npm run dev

# Producción
npm start
```

### Despliegue en Producción
```bash
# Construir aplicación React
npm run build

# Iniciar servidor en modo producción
npm start

# Con PM2 (recomendado)
npm install -g pm2
pm2 start backend/server.js --name "cloud-system"
pm2 startup
pm2 save
```

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Documentación Adicional

### Para Desarrolladores
- [Guía de Componentes](./docs/components.md)
- [API Reference](./docs/api.md)
- [Estilos y Temas](./docs/styling.md)

### Para Administradores
- [Configuración Avanzada](./docs/admin-config.md)
- [Monitoreo y Logs](./docs/monitoring.md)
- [Backups y Restauración](./docs/backup.md)


## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆔 Versión

**Versión Actual**: 2.0.0
**Última Actualización**: Octubre 2025

### Changelog
- **v2.0.0**: Sistema completo rediseñado con panel admin, editores integrados, y UI moderna
- **v1.5.0**: Integración Microsoft Calendar y menús contextuales mejorados
- **v1.0.0**: Sistema básico de nube con autenticación y gestión de archivos
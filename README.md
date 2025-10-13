# Sistema de Nube Distribuible

Un sistema completo de nube personal con autenticación SHA-256 y gestión de archivos.

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
│   ├── server/
│   │   ├── server.js          # Servidor Express principal
│   │   └── routes/
│   │       ├── auth.js        # Autenticación
│   │       └── files.js       # Gestión de archivos
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── App.js            # Aplicación principal
│   │   └── index.js          # Punto de entrada
│   ├── build/               # Archivos construidos (generado)
│   └── package.json
└── Datos/                # Archivos de usuarios (fuera del código)
```

## 🔐 Usuarios de Prueba

- **administrador**: `12341234`
- **eric**: `12345`
- **Trabajador1**: `12345`
- **Trabajador2**: `12345`

## 🛠️ Características

- ✅ Autenticación con hash SHA-256
- ✅ Gestión de archivos por usuario
- ✅ Navegación por carpetas
- ✅ Interfaz React moderna
- ✅ API REST completa
- ✅ Servidor único para frontend y backend

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Archivos
- `GET /api/files` - Obtener archivos del usuario
- `GET /api/files/shared-folders` - Obtener carpetas compartidas
- `POST /api/files/upload` - Subir archivos
- `GET /api/files/:fileId` - Descargar archivo

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
   - **Desarrollo**: `http://localhost:4000/auth/callback`
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

**Redirección a URL externa**
- Solución: Asegúrate de que la URI de redirección en Azure AD sea `http://localhost:4000/auth/callback`
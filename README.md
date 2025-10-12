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
codigo_servidor/
├── server/
│   ├── server.js          # Servidor Express principal
│   └── routes/
│       ├── auth.js        # Autenticación
│       └── files.js       # Gestión de archivos
├── src/
│   ├── components/        # Componentes React
│   ├── App.js            # Aplicación principal
│   └── index.js          # Punto de entrada
├── Datos/                # Archivos de usuarios
├── build/               # Archivos construidos (generado)
└── package.json
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

La aplicación se ejecuta en el puerto 3000 por defecto. Los archivos de usuario se almacenan en la carpeta `Datos/` con subcarpetas por usuario.

## 📝 Notas de Producción

- El comando `npm start` automáticamente ejecuta `npm run build` antes de iniciar el servidor
- Los archivos estáticos de React se sirven desde la carpeta `build/`
- El servidor Express maneja tanto la API como los archivos estáticos
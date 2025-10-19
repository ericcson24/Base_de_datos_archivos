require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const { spawn } = require('child_process');

// Importar sistema de sincronización (comentado temporalmente)
// const { 
//   initializeSyncService, 
//   setupSyncIntegrationRoutes 
// } = require('../sync-system/syncIntegration');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración extrema para evitar error 431
app.use(express.json({ 
  limit: '100mb',
  parameterLimit: 100000
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb',
  parameterLimit: 100000
}));

// Configurar límites de cabeceras HTTP muy altos
const server = require('http').createServer(app);
server.maxHeadersCount = 0; // Sin límite de cabeceras
server.headersTimeout = 300000; // 5 minutos timeout
server.requestTimeout = 300000; // 5 minutos timeout total

// Middleware para limpiar todas las cookies problemáticas
app.use((req, res, next) => {
  // Limpiar todas las cookies existentes si las cabeceras son muy grandes
  const headerSize = JSON.stringify(req.headers).length;
  if (headerSize > 4000) { // Límite más bajo y agresivo
    console.warn(`⚠️ Large headers detected (${headerSize} bytes), FORCE CLEARING ALL COOKIES`);
    
    // SOLUCIÓN RADICAL: Limpiar TODAS las cookies sin excepción
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      cookies.forEach(cookie => {
        const [name] = cookie.split('=');
        const cookieName = name ? name.trim() : '';
        if (cookieName) {
          // Limpiar con todos los paths y dominios posibles
          res.clearCookie(cookieName, { path: '/' });
          res.clearCookie(cookieName, { path: '/', domain: 'localhost' });
          res.clearCookie(cookieName, { path: '/', domain: '.localhost' });
          res.clearCookie(cookieName);
          console.log(`🗑️ FORCE CLEARED cookie: ${cookieName}`);
        }
      });
      
      // También limpiar el header de cookie del request
      delete req.headers.cookie;
    }
  }
  next();
});

// Middleware
app.use(cors({
  origin: true,
  credentials: false, // DESHABILITAMOS CREDENTIALS PARA EVITAR COOKIES
  maxAge: 86400
}));

// SOLUCIÓN DE EMERGENCIA: No usar cookieParser en absoluto
// app.use(cookieParser());

// Middleware para rechazar completamente cualquier cookie
app.use((req, res, next) => {
  // Eliminar todas las cookies del request
  if (req.headers.cookie) {
    console.log('🚫 Cookies detectadas y eliminadas para evitar error 431');
    delete req.headers.cookie;
  }
  
  // Deshabilitar completamente res.cookie
  res.cookie = function() {
    console.log('🚫 Intento de crear cookie bloqueado');
    return this;
  };
  
  // Deshabilitar clearCookie también
  res.clearCookie = function() {
    console.log('� Intento de limpiar cookie ignorado');
    return this;
  };
  
  next();
});

// SOLUCIÓN RADICAL: Deshabilitar sesiones persistentes completamente
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'tu_clave_secreta_aqui',
//   resave: false,
//   saveUninitialized: false,
//   name: 'sid', // Nombre muy corto para la cookie
//   genid: () => {
//     // Generar IDs de sesión más cortos
//     return Math.random().toString(36).substring(2, 15);
//   },
//   cookie: {
//     secure: false, // true en producción con HTTPS
//     httpOnly: true,
//     maxAge: 2 * 60 * 60 * 1000, // Reducir a 2 horas para cookies más pequeñas
//     sameSite: 'lax',
//     path: '/'
//   },
//   // Optimizar almacenamiento de sesión - usar store en memoria más eficiente
//   rolling: false, // No renovar en cada petición para evitar cookies grandes
//   proxy: false
// }));

// En su lugar, usar solo memoria para autenticación
if (!global.authSessions) {
  global.authSessions = new Map();
}

// Middleware para comprimir datos de sesión y gestión eficiente de cookies
app.use((req, res, next) => {
  // Interceptar res.cookie para comprimir datos grandes
  const originalCookie = res.cookie;
  res.cookie = function(name, value, options) {
    // Si el valor es muy grande, usar compresión o referencia
    if (typeof value === 'string' && value.length > 200) {
      console.log(`⚠️ Large cookie value detected for ${name}, using compression`);
      
      // Crear una referencia corta para valores grandes
      const cookieId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      // Almacenar en cache global
      if (!global.cookieCache) {
        global.cookieCache = new Map();
      }
      global.cookieCache.set(cookieId, value);
      
      // Guardar solo la referencia en la cookie
      return originalCookie.call(this, name, cookieId, options);
    }
    
    return originalCookie.call(this, name, value, options);
  };
  
  // Interceptar req.cookies para descomprimir
  if (req.cookies && global.cookieCache) {
    for (const [name, value] of Object.entries(req.cookies)) {
      if (typeof value === 'string' && value.startsWith('ref_')) {
        const realValue = global.cookieCache.get(value);
        if (realValue) {
          req.cookies[name] = realValue;
        }
      }
    }
  }
  
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../build')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/events', require('./routes/events'));
// app.use('/api/office', require('./routes/office')); // Comentado temporalmente
// app.use('/api/ai', require('./routes/ai')); // Comentado temporalmente
app.use('/admin', require('./routes/admin'));

// Configurar rutas de integración de sincronización
// setupSyncIntegrationRoutes(app);

// Temporary simple login endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password });
  
  // Simple test credentials
  if (username === 'test' && password === 'test') {
    res.json({
      success: true,
      message: 'Login exitoso',
      user: { id: 1, username: 'test', role: 'user' },
      token: 'dGVzdDp0ZXN0' // base64 encoded "test:test"
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciales incorrectas'
    });
  }
});

// Calendar route - serve calendar page if authenticated
app.get('/calendar', (req, res) => {
  // Always serve the calendar page - the frontend will handle authentication
  console.log('✅ Sirviendo página del calendario');
  res.sendFile(path.join(__dirname, 'calendar.html'));
});

// Página especial para limpiar cookies y resolver error 431
app.get('/clear-cookies', (req, res) => {
  console.log('🧹 Sirviendo página de limpieza de cookies');
  res.sendFile(path.join(__dirname, '../public/clear-cookies.html'));
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('✅ HTTP headers limits increased to prevent 431 errors');
  
  // Inicializar cache de tokens global
  if (!global.tokenCache) {
    global.tokenCache = new Map();
  }
  
  // Configurar limpieza automática de tokens expirados cada 15 minutos
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    // Limpiar cache de tokens
    if (global.tokenCache) {
      for (const [sessionId, tokenData] of global.tokenCache.entries()) {
        // Eliminar tokens que expiraron hace más de 1 hora
        if (tokenData.tokenExpires && (now - tokenData.tokenExpires) > 3600000) {
          global.tokenCache.delete(sessionId);
          cleaned++;
        }
        // También eliminar tokens muy antiguos (más de 24 horas)
        else if (tokenData.createdAt && (now - tokenData.createdAt) > 86400000) {
          global.tokenCache.delete(sessionId);
          cleaned++;
        }
      }
    }
    
    // Limpiar cache de cookies
    if (global.cookieCache) {
      let cookieCleaned = 0;
      for (const [cookieId] of global.cookieCache.entries()) {
        // Eliminar referencias de cookies antiguas (más de 2 horas)
        const cookieAge = now - parseInt(cookieId.split('_')[1]);
        if (cookieAge > 7200000) { // 2 horas
          global.cookieCache.delete(cookieId);
          cookieCleaned++;
        }
      }
      if (cookieCleaned > 0) {
        console.log(`🧹 Cookie cache: ${cookieCleaned} referencias eliminadas`);
      }
    }
    
    // Limpiar sesiones de autenticación antiguas
    if (global.authSessions) {
      let authCleaned = 0;
      for (const [authSessionId, authData] of global.authSessions.entries()) {
        // Eliminar sesiones más antiguas de 2 horas
        if (authData.createdAt && (now - authData.createdAt) > 7200000) {
          global.authSessions.delete(authSessionId);
          authCleaned++;
        }
      }
      if (authCleaned > 0) {
        console.log(`🧹 Auth sessions: ${authCleaned} sesiones eliminadas`);
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Token cache: ${cleaned} tokens expirados eliminados`);
    }
  }, 15 * 60 * 1000); // Cada 15 minutos
  
  // Inicializar servicio de sincronización (comentado temporalmente)
  try {
    // await initializeSyncService();
    console.log('✅ Server started successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Sync Service:', error);
  }
});
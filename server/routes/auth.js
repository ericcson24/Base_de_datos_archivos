const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { msalClient, scopes } = require('../microsoft-auth');

// Función para validar credenciales usando el sistema Python
function validateCredentials(username, password) {
  return new Promise((resolve, reject) => {
    // TEMPORAL: Simular validación exitosa para testing
    console.log(`🔐 Validando credenciales para: ${username} (simulado)`);

    // Simular usuarios válidos
    const validUsers = {
      'administrador': '12341234',
      'eric': '12345',
      'Trabajador1': '12345',
      'Trabajador2': '12345'
    };

    if (validUsers[username] && validUsers[username] === password) {
      resolve({
        success: true,
        message: 'Autenticación exitosa',
        info: {
          role: username === 'administrador' ? 'admin' : 'user',
          validation_type: 'simulated'
        }
      });
    } else {
      resolve({
        success: false,
        message: 'Credenciales incorrectas',
        info: {}
      });
    }

    /*
    // Código original comentado - será restaurado cuando se arregle el problema de Python
    const fs = require('fs');
    const os = require('os');
    const crypto = require('crypto');

    // Crear un script temporal
    const scriptContent = `
import sys
import os
import json

# Añadir el directorio del servidor al path
server_dir = r"${path.join(__dirname, '../../Servidor').replace(/\\/g, '\\\\')}"
sys.path.insert(0, server_dir)

try:
    from auth_validator import validate_user_credentials
    success, message, info = validate_user_credentials('${username}', '${password}')
    result = {
        'success': success,
        'message': message,
        'info': info
    }
    print(json.dumps(result))
except Exception as e:
    result = {
        'success': False,
        'message': str(e),
        'info': {}
    }
    print(json.dumps(result))
`;

    // Crear archivo temporal
    const tempScript = path.join(os.tmpdir(), `auth_${crypto.randomBytes(8).toString('hex')}.py`);
    fs.writeFileSync(tempScript, scriptContent);

    const python = spawn('C:\\Users\\eric2\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe', [tempScript], {
      cwd: path.join(__dirname, '../../Servidor')
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      // Limpiar archivo temporal
      try {
        fs.unlinkSync(tempScript);
      } catch (e) {
        console.error('Error limpiando archivo temporal:', e);
      }

      try {
        console.log('Python exit code:', code);
        console.log('Python stdout:', output);
        console.log('Python stderr:', errorOutput);

        if (code === 0 && output.trim()) {
          const result = JSON.parse(output.trim());
          resolve(result);
        } else {
          console.error('Python validation error:', errorOutput);
          resolve({
            success: false,
            message: 'Error en validación: ' + errorOutput,
            info: {}
          });
        }
      } catch (e) {
        console.error('Error parsing Python output:', e, 'Output:', output);
        resolve({
          success: false,
          message: 'Error procesando respuesta: ' + e.message,
          info: {}
        });
      }
    });

    python.on('error', (error) => {
      console.error('Error ejecutando Python:', error);
      // Limpiar archivo temporal en caso de error
      try {
        fs.unlinkSync(tempScript);
      } catch (e) {}
      resolve({
        success: false,
        message: 'Error del sistema: ' + error.message,
        info: {}
      });
    });
    */
  });
}

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y contraseña son requeridos'
    });
  }

  try {
    console.log(`🔐 Validando credenciales para: ${username}`);

    const result = await validateCredentials(username, password);

    if (result.success) {
      // Crear token simple (en producción usar JWT)
      const userData = {
        id: Date.now(),
        username: username,
        role: result.info.role || 'user'
      };
      const token = Buffer.from(JSON.stringify(userData)).toString('base64');

      console.log(`✅ Login exitoso para: ${username}`);

      // Guardar token en cookie HTTP-only segura
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/'
      });

      res.json({
        success: true,
        message: result.message,
        user: userData,
        token: token // También devolver el token para el frontend
      });
    } else {
      console.log(`❌ Login fallido para: ${username} - ${result.message}`);

      res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Limpiar la cookie de autenticación
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

// Verify session endpoint
router.get('/verify', (req, res) => {
  try {
    // Intentar obtener token de cookie primero, luego del header Authorization
    let token = req.cookies.auth_token;

    if (!token) {
      // Si no hay cookie, intentar del header Authorization
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay sesión activa'
      });
    }

    // Decodificar y validar token
    const userData = JSON.parse(Buffer.from(token, 'base64').toString());

    // Verificar que el token no haya expirado (simplificado)
    // En producción usar JWT con expiración real
    if (!userData.username) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    res.json({
      success: true,
      message: 'Sesión válida',
      user: userData
    });
  } catch (error) {
    console.error('Error verificando sesión:', error);
    res.status(401).json({
      success: false,
      message: 'Sesión inválida'
    });
  }
});

// Configurar cache para MSAL
// Cache is now configured in microsoft-auth.js constructor
// msalClient.getTokenCache().addBeforeCacheAccess(beforeCacheAccess);
// msalClient.getTokenCache().addAfterCacheAccess(afterCacheAccess);

// Middleware para inicializar sesión si no existe
router.use((req, res, next) => {
  if (!req.session) {
    req.session = {};
  }
  next();
});

// Microsoft Auth routes

// Login con Microsoft
router.get('/login', async (req, res) => {
  try {
    console.log('🚀 Iniciando login con Microsoft...');

    // Usar el puerto del backend para el redirectUri
    const PORT = process.env.PORT || 5000;
    const redirectUri = `http://localhost:${PORT}/api/auth/callback`;

    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: scopes,
      redirectUri: redirectUri,
      responseMode: 'query'
    });

    console.log('🔗 URL de autenticación generada con redirectUri:', redirectUri);
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Error generando URL de login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Callback de Microsoft
router.get('/callback', async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    console.log('🔍 Callback recibido. Query params:', req.query);

    if (error) {
      console.error('❌ Error en callback de Microsoft:', error, error_description);
      return res.redirect(`http://localhost:3000/?error=${error}&description=${encodeURIComponent(error_description || '')}`);
    }

    if (!code) {
      console.log('❌ No se recibió código de autorización');
      return res.redirect('http://localhost:3000/?error=no_code');
    }

    console.log('📨 Recibido código de autorización de Microsoft');

    // Usar el mismo puerto del backend
    const PORT = process.env.PORT || 5000;
    const redirectUri = `http://localhost:${PORT}/api/auth/callback`;

    console.log('🔄 Intercambiando código por tokens...');

    const tokenResponse = await msalClient.acquireTokenByCode({
      code: code,
      scopes: scopes,
      redirectUri: redirectUri
    });

    console.log('✅ Tokens adquiridos exitosamente');
    console.log('📊 Token response keys:', Object.keys(tokenResponse));

    // Guardar tokens en sesión
    req.session.accessToken = tokenResponse.accessToken;
    req.session.refreshToken = tokenResponse.refreshToken;
    req.session.tokenExpires = tokenResponse.expiresOn.getTime();
    req.session.account = tokenResponse.account;

    console.log('💾 Sesión de Outlook guardada');
    console.log('👤 Cuenta guardada:', {
      name: req.session.account?.name,
      username: req.session.account?.username
    });

    // Redirigir al calendario en localhost
    console.log('🔀 Redirigiendo a calendario...');
    res.redirect('http://localhost:3000/calendar');
  } catch (error) {
    console.error('❌ Error en callback de Microsoft:', error);
    console.error('❌ Stack trace:', error.stack);
    res.redirect(`http://localhost:3000/?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

// Verificar estado de autenticación
router.get('/status', (req, res) => {
  try {
    const authenticated = !!(req.session.accessToken && req.session.account);

    console.log('📊 Estado de autenticación:', {
      authenticated,
      hasAccessToken: !!req.session.accessToken,
      hasAccount: !!req.session.account,
      accountName: req.session.account?.name || 'N/A'
    });

    res.json({
      authenticated,
      account: req.session.account ? {
        name: req.session.account.name,
        username: req.session.account.username
      } : null
    });
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Renovar token
router.post('/refresh', async (req, res) => {
  try {
    if (!req.session.account) {
      return res.status(401).json({ error: 'No hay cuenta activa' });
    }

    console.log('🔄 Intentando renovar token...');

    const tokenResponse = await msalClient.acquireTokenSilent({
      account: req.session.account,
      scopes: scopes
    });

    // Actualizar sesión
    req.session.accessToken = tokenResponse.accessToken;
    req.session.refreshToken = tokenResponse.refreshToken;
    req.session.tokenExpires = tokenResponse.expiresOn.getTime();

    console.log('✅ Token renovado exitosamente');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error renovando token:', error);
    res.status(401).json({ error: 'No se pudo renovar el token' });
  }
});

// Logout de Microsoft
router.post('/logout', (req, res) => {
  try {
    console.log('👋 Cerrando sesión de Microsoft');

    // Limpiar sesión
    req.session.accessToken = null;
    req.session.refreshToken = null;
    req.session.tokenExpires = null;
    req.session.account = null;

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { msalClient, scopes } = require('../microsoft-auth');
const jwt = require('jsonwebtoken');

// Middleware para verificar JWT en lugar de cookies
function verifyJWT(req, res, next) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'nube_distribuible_jwt_secret_key_2024';
    
    // Buscar JWT en headers de authorization o query parameter
    let token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
      return res.status(401).json({ error: 'No JWT token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.jwtData = decoded;
    next();
  } catch (error) {
    console.error('❌ Error verificando JWT:', error);
    return res.status(401).json({ error: 'Invalid JWT token' });
  }
}

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
      // Crear JWT en lugar de cookies
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'nube_distribuible_jwt_secret_key_2024';
      
      const tokenData = {
        id: Date.now(),
        username: username,
        role: result.info.role || 'user',
        iat: Date.now(),
        exp: Date.now() + (2 * 60 * 60 * 1000) // 2 horas
      };
      
      const jwtToken = jwt.sign(tokenData, JWT_SECRET);

      console.log(`✅ Login exitoso para: ${username}`);

      // NO usar cookies - solo enviar JWT en la respuesta
      // El frontend lo guardará en localStorage
      res.json({
        success: true,
        message: result.message,
        user: {
          id: tokenData.id,
          username: tokenData.username,
          role: tokenData.role
        },
        token: jwtToken // JWT para localStorage
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

    // Crear un ID único para esta sesión de tokens
    const tokenSessionId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Almacenar tokens en memoria (en producción, usar Redis o base de datos)
    if (!global.tokenCache) {
      global.tokenCache = new Map();
    }
    
    // Guardar tokens en cache con expiración
    global.tokenCache.set(tokenSessionId, {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenExpires: tokenResponse.expiresOn.getTime(),
      account: tokenResponse.account,
      createdAt: Date.now()
    });
    
    // Solo guardar el ID de la sesión de tokens en la cookie de sesión
    // CAMBIO RADICAL: No usar cookies en absoluto, usar JWT
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'nube_distribuible_jwt_secret_key_2024';
    
    const authSessionId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    if (!global.authSessions) {
      global.authSessions = new Map();
    }
    
    global.authSessions.set(authSessionId, {
      tokenSessionId: tokenSessionId,
      hasMicrosoftAuth: true,
      accountSummary: {
        name: tokenResponse.account?.name,
        username: tokenResponse.account?.username,
        localAccountId: tokenResponse.account?.localAccountId
      },
      createdAt: Date.now()
    });
    
    // Crear JWT con la información de sesión
    const sessionJWT = jwt.sign({
      authSessionId: authSessionId,
      hasMicrosoftAuth: true,
      account: {
        name: tokenResponse.account?.name,
        username: tokenResponse.account?.username
      },
      iat: Date.now(),
      exp: Date.now() + (2 * 60 * 60 * 1000)
    }, JWT_SECRET);
    
    console.log('💾 Sesión de Outlook guardada con ID:', tokenSessionId);
    console.log('🔐 Auth session ID:', authSessionId);

    // Redirigir al calendario con JWT como parámetro de query
    console.log('🔀 Redirigiendo a calendario con JWT...');
    res.redirect(`http://localhost:3000/calendar?token=${encodeURIComponent(sessionJWT)}`);

    console.log('💾 Sesión de Outlook guardada con ID:', tokenSessionId);
    console.log('� Auth session ID:', authSessionId);

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
    const authSessionId = req.cookies?.auth_session;
    const authSession = global.authSessions?.get(authSessionId);
    const tokenSessionId = authSession?.tokenSessionId;
    const tokensData = global.tokenCache?.get(tokenSessionId);
    
    if (!tokensData || !tokensData.account) {
      return res.status(401).json({ error: 'No hay cuenta activa' });
    }

    console.log('🔄 Intentando renovar token...');

    const tokenResponse = await msalClient.acquireTokenSilent({
      account: tokensData.account,
      scopes: scopes
    });

    // Actualizar cache de tokens
    global.tokenCache.set(tokenSessionId, {
      ...tokensData,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenExpires: tokenResponse.expiresOn.getTime()
    });

    console.log('✅ Token renovado exitosamente');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error renovando token:', error);
    res.status(401).json({ error: 'No se pudo renovar el token' });
  }
});

// Verificar si tiene sesión de Microsoft
router.get('/verify-microsoft', (req, res) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'nube_distribuible_jwt_secret_key_2024';
    
    // Buscar JWT en headers de authorization o query parameter
    let token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
      return res.json({ hasMicrosoftAuth: false, account: null, accessToken: null });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const authSessionId = decoded.authSessionId;
    
    // Función helper para obtener tokens del cache
    const getTokensFromCache = (sessionId) => {
      if (!global.tokenCache || !sessionId) return null;
      return global.tokenCache.get(sessionId);
    };
    
    // Función helper para obtener sesión de autenticación
    const getAuthSession = (authSessionId) => {
      if (!global.authSessions || !authSessionId) return null;
      return global.authSessions.get(authSessionId);
    };
    
    const authSession = getAuthSession(authSessionId);
    const tokensData = authSession ? getTokensFromCache(authSession.tokenSessionId) : null;
    const hasMicrosoftAuth = !!(authSession?.hasMicrosoftAuth && tokensData && tokensData.accessToken);
    
    console.log('🔍 Verificando sesión de Microsoft con JWT:', {
      tieneJWT: !!token,
      authSessionId: authSessionId,
      tieneAuthSession: !!authSession,
      tieneTokensData: !!tokensData,
      resultado: hasMicrosoftAuth
    });

    res.json({
      hasMicrosoftAuth,
      accessToken: hasMicrosoftAuth ? tokensData.accessToken : null,
      account: hasMicrosoftAuth ? authSession.accountSummary : null
    });
  } catch (error) {
    console.error('❌ Error verificando sesión de Microsoft:', error);
    res.json({ hasMicrosoftAuth: false, account: null, accessToken: null });
  }
});

// Logout de Microsoft
router.post('/logout', (req, res) => {
  try {
    console.log('👋 Cerrando sesión de Microsoft');

    const JWT_SECRET = process.env.JWT_SECRET || 'nube_distribuible_jwt_secret_key_2024';
    
    // Buscar JWT en headers de authorization o query parameter
    let token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const authSessionId = decoded.authSessionId;
        
        // Obtener sesión de autenticación
        const authSession = global.authSessions?.get(authSessionId);
        const tokenSessionId = authSession?.tokenSessionId;

        // Limpiar cache de tokens
        if (tokenSessionId && global.tokenCache) {
          global.tokenCache.delete(tokenSessionId);
          console.log('🗑️ Tokens eliminados del cache:', tokenSessionId);
        }
        
        // Limpiar sesión de autenticación
        if (authSessionId && global.authSessions) {
          global.authSessions.delete(authSessionId);
          console.log('🗑️ Auth session eliminada:', authSessionId);
        }
      } catch (jwtError) {
        console.log('⚠️ JWT inválido en logout, continuando...');
      }
    }

    res.json({ 
      success: true, 
      message: 'Logout completado. Elimina el token del localStorage.' 
    });
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ENDPOINT RADICAL: Limpiar todas las cookies del navegador
router.post('/clear-all-cookies', (req, res) => {
  try {
    console.log('🧹 LIMPIEZA RADICAL: Sistema sin cookies activado');
    
    // Limpiar caches del servidor
    if (global.tokenCache) {
      global.tokenCache.clear();
      console.log('🗑️ Token cache limpiado');
    }
    
    if (global.cookieCache) {
      global.cookieCache.clear();
      console.log('🗑️ Cookie cache limpiado');
    }
    
    if (global.authSessions) {
      global.authSessions.clear();
      console.log('🗑️ Auth sessions limpiadas');
    }
    
    console.log('✅ LIMPIEZA RADICAL COMPLETADA - Sistema sin cookies');
    
    res.json({ 
      success: true, 
      message: 'Sistema cambiado a modo sin cookies. Usa JWT tokens en localStorage.',
      instructions: 'El sistema ahora funciona 100% sin cookies para evitar error 431.'
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza radical:', error);
    res.status(500).json({ error: 'Error en limpieza radical' });
  }
});

module.exports = router;
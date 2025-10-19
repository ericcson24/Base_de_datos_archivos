const express = require('express');
const { Client } = require('@microsoft/microsoft-graph-client');
const { PublicClientApplication } = require('@azure/msal-node');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Configuración de Microsoft Graph
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'your-client-secret',
    authority: 'https://login.microsoftonline.com/common',
  },
};

const pca = new PublicClientApplication(msalConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'tu-clave-secreta-jwt';

// Almacenamiento temporal de tokens (en producción usar base de datos)
const tokenStore = new Map();

// Ruta para iniciar autenticación con Microsoft
router.get('/login', (req, res) => {
  const authCodeUrlParameters = {
    scopes: [
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/Files.ReadWrite.All'
    ],
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
  };

  // Generar URL de autorización
  pca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => {
    console.error('Error generando URL de autorización:', error);
    res.status(500).json({ error: 'Error al iniciar autenticación' });
  });
});

// Callback después de autenticación con Microsoft
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Código de autorización requerido' });
  }

  try {
    const tokenRequest = {
      code: code,
      scopes: [
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Files.ReadWrite.All'
      ],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
      clientSecret: msalConfig.auth.clientSecret,
    };

    const response = await pca.acquireTokenByCode(tokenRequest);
    
    // Obtener información del usuario
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      }
    });

    const userInfo = await graphClient.api('/me').get();

    // Crear JWT para la sesión
    const sessionToken = jwt.sign(
      { 
        userId: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Almacenar token de Microsoft Graph
    tokenStore.set(userInfo.id, {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresOn,
      userInfo: userInfo
    });

    // Configurar cookie de sesión
    res.cookie('microsoft_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: 'lax'
    });

    // Redirigir a la aplicación
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');

  } catch (error) {
    console.error('Error en callback de autenticación:', error);
    res.status(500).json({ error: 'Error al procesar autenticación' });
  }
});

// Verificar estado de autenticación con Microsoft
router.get('/verify-microsoft', (req, res) => {
  const sessionToken = req.cookies.microsoft_session;

  if (!sessionToken) {
    return res.json({ hasMicrosoftAuth: false });
  }

  try {
    const decoded = jwt.verify(sessionToken, JWT_SECRET);
    const userData = tokenStore.get(decoded.userId);

    if (!userData) {
      return res.json({ hasMicrosoftAuth: false });
    }

    // Verificar si el token no ha expirado
    if (new Date() > userData.expiresAt) {
      tokenStore.delete(decoded.userId);
      return res.json({ hasMicrosoftAuth: false });
    }

    res.json({ 
      hasMicrosoftAuth: true,
      accessToken: userData.accessToken,
      userInfo: userData.userInfo
    });

  } catch (error) {
    console.error('Error verificando sesión de Microsoft:', error);
    res.json({ hasMicrosoftAuth: false });
  }
});

// Cerrar sesión de Microsoft
router.post('/logout-microsoft', (req, res) => {
  const sessionToken = req.cookies.microsoft_session;

  if (sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET);
      tokenStore.delete(decoded.userId);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  res.clearCookie('microsoft_session');
  res.json({ success: true });
});

// Obtener token de acceso válido para el usuario actual
router.get('/access-token', (req, res) => {
  const sessionToken = req.cookies.microsoft_session;

  if (!sessionToken) {
    return res.status(401).json({ error: 'No hay sesión activa' });
  }

  try {
    const decoded = jwt.verify(sessionToken, JWT_SECRET);
    const userData = tokenStore.get(decoded.userId);

    if (!userData) {
      return res.status(401).json({ error: 'Token no encontrado' });
    }

    // Verificar si el token no ha expirado
    if (new Date() > userData.expiresAt) {
      tokenStore.delete(decoded.userId);
      return res.status(401).json({ error: 'Token expirado' });
    }

    res.json({ 
      accessToken: userData.accessToken,
      userInfo: userData.userInfo
    });

  } catch (error) {
    console.error('Error obteniendo token de acceso:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');
const si = require('systeminformation');
const { dbAsync } = require('../database/db');
const { msalClient, scopes } = require('../utils/microsoft-auth');

// Función para validar credenciales usando la base de datos SQLite
async function validateCredentials(username, password) {
  try {
    console.log(`🔐 Validando credenciales para: ${username}`);

    // Buscar usuario en la base de datos
    const user = await dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        info: {}
      };
    }

    if (user.is_locked) {
      return {
        success: false,
        message: 'Cuenta bloqueada. Contacte al administrador.',
        info: {}
      };
    }

    // Verificar contraseña
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      // Resetear intentos fallidos y actualizar último login
      await dbAsync.run("UPDATE users SET failed_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
      
      // Registrar log de login exitoso
      await dbAsync.run("INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)", 
        [user.id, user.username, 'LOGIN', 'Inicio de sesión exitoso', '::1']);

      return {
        success: true,
        message: 'Autenticación exitosa',
        info: {
          role: user.role,
          validation_type: 'database'
        }
      };
    } else {
      // Incrementar intentos fallidos
      const newAttempts = (user.failed_attempts || 0) + 1;
      await dbAsync.run("UPDATE users SET failed_attempts = ? WHERE id = ?", [newAttempts, user.id]);

      // Bloquear si supera 5 intentos
      if (newAttempts >= 5) {
        await dbAsync.run("UPDATE users SET is_locked = 1 WHERE id = ?", [user.id]);
        return {
          success: false,
          message: 'Cuenta bloqueada por demasiados intentos fallidos.',
          info: {}
        };
      }

      // Registrar log de login fallido
      await dbAsync.run("INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)", 
        [user.id, user.username, 'LOGIN_FAILED', `Intento fallido (${newAttempts}/5)`, '::1']);

      return {
        success: false,
        message: 'Credenciales incorrectas',
        info: {}
      };
    }
  } catch (error) {
    console.error('Error en validación DB:', error);
    return {
      success: false,
      message: 'Error interno del servidor',
      info: {}
    };
  }
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
        sameSite: 'lax',
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

// Recuperar contraseña (Simulado)
router.post('/recover-password', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de usuario es requerido'
    });
  }

  console.log(`🔄 Solicitud de recuperación de contraseña para: ${username}`);

  try {
    const user = await dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);

    if (user) {
      // En un sistema real, aquí se enviaría un correo electrónico
      // Para este entorno de desarrollo, simulamos éxito
      console.log(`🔑 [DEBUG] Usuario encontrado: ${username}. ID: ${user.id}`);
      
      // Registrar solicitud de recuperación
      await dbAsync.run("INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)", 
        [user.id, user.username, 'PASSWORD_RECOVERY_REQUEST', 'Solicitud de recuperación de contraseña', '::1']);

      return res.json({
        success: true,
        message: 'Se han enviado las instrucciones de recuperación a tu correo electrónico (Simulado).'
      });
    } else {
      // Por seguridad, no indicamos si el usuario existe o no
      return res.json({
        success: true,
        message: 'Si el usuario existe, se han enviado las instrucciones a su correo electrónico.'
      });
    }
  } catch (error) {
    console.error('Error en recuperación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Verificar si tiene sesión de Microsoft
router.get('/verify-microsoft', (req, res) => {
  try {
    const hasMicrosoftAuth = !!(req.session && req.session.accessToken && req.session.account);
    
    console.log('🔍 Verificando sesión de Microsoft:', {
      tieneSession: !!req.session,
      tieneAccessToken: !!req.session?.accessToken,
      tieneAccount: !!req.session?.account,
      resultado: hasMicrosoftAuth
    });

    res.json({
      hasMicrosoftAuth,
      account: hasMicrosoftAuth ? {
        name: req.session.account.name,
        email: req.session.account.username
      } : null
    });
  } catch (error) {
    console.error('❌ Error verificando sesión de Microsoft:', error);
    res.json({ hasMicrosoftAuth: false, account: null });
  }
});

// Verificar token de sesión (Cookie o Header)
router.get('/verify', async (req, res) => {
  try {
    // Obtener token de cookie o header
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No hay sesión activa' });
    }

    // Decodificar token (simple base64 como en login)
    const userDataString = Buffer.from(token, 'base64').toString('utf-8');
    const userData = JSON.parse(userDataString);

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
});

// Middleware de autenticación (copiado de files.js para consistencia)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (token) {
    try {
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());
      req.user = userData;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
};

// Obtener configuración de usuario
router.get('/settings', authenticate, async (req, res) => {
  try {
    const user = await dbAsync.get(
      "SELECT id, username, role, avatar_url, theme_preference, language, notifications FROM users WHERE username = ?", 
      [req.user.username]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Obtener información de almacenamiento (del disco donde corre el servidor)
    let storageInfo = { used: 0, size: 1024 * 1024 * 1024 }; // Default 1GB
    try {
      const fsSize = await si.fsSize();
      // Buscar el drive donde estamos o usar el primero
      const drive = fsSize.find(d => __dirname.toLowerCase().startsWith(d.mount.toLowerCase())) || fsSize[0];
      if (drive) {
        storageInfo = {
          used: drive.used,
          size: drive.size
        };
      }
    } catch (err) {
      console.error('Error obteniendo info de disco:', err);
    }

    res.json({
      success: true,
      settings: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatar_url,
        theme: user.theme_preference || 'light',
        language: user.language || 'es',
        notifications: user.notifications === 1,
        storageUsed: storageInfo.used,
        storageLimit: storageInfo.size,
        microsoftLinked: !!user.microsoft_access_token,
        microsoftEmail: user.microsoft_email
      }
    });
  } catch (error) {
    console.error('Error obteniendo settings:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Actualizar configuración de usuario
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { theme, avatarUrl, language, notifications, newPassword } = req.body;
    const username = req.user.username;

    if (theme) {
      await dbAsync.run("UPDATE users SET theme_preference = ? WHERE username = ?", [theme, username]);
    }
    
    if (avatarUrl !== undefined) {
      await dbAsync.run("UPDATE users SET avatar_url = ? WHERE username = ?", [avatarUrl, username]);
    }

    if (language) {
      await dbAsync.run("UPDATE users SET language = ? WHERE username = ?", [language, username]);
    }

    if (notifications !== undefined) {
      await dbAsync.run("UPDATE users SET notifications = ? WHERE username = ?", [notifications ? 1 : 0, username]);
    }

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      await dbAsync.run("UPDATE users SET password = ? WHERE username = ?", [hash, username]);
    }

    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error actualizando settings:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Vincular cuenta Microsoft
router.post('/link-microsoft', authenticate, async (req, res) => {
  try {
    const { accessToken, refreshToken, email, accountId } = req.body;
    const username = req.user.username;

    await dbAsync.run(
      "UPDATE users SET microsoft_access_token = ?, microsoft_refresh_token = ?, microsoft_email = ?, microsoft_id = ? WHERE username = ?",
      [accessToken, refreshToken, email, accountId, username]
    );

    res.json({ success: true, message: 'Cuenta de Microsoft vinculada correctamente' });
  } catch (error) {
    console.error('Error vinculando Microsoft:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Desvincular cuenta Microsoft
router.post('/unlink-microsoft', authenticate, async (req, res) => {
  try {
    const username = req.user.username;

    await dbAsync.run(
      "UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL, microsoft_email = NULL, microsoft_id = NULL WHERE username = ?",
      [username]
    );

    res.json({ success: true, message: 'Cuenta de Microsoft desvinculada' });
  } catch (error) {
    console.error('Error desvinculando Microsoft:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Obtener URL de login de Microsoft
router.get('/microsoft/url', authenticate, async (req, res) => {
  try {
    console.log('🔵 [DEBUG] Solicitud de URL Microsoft recibida');
    
    if (!msalClient) {
      return res.status(500).json({ success: false, message: 'Configuración de Microsoft no disponible' });
    }

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const redirectUri = `${backendUrl}/api/auth/microsoft/callback`;

    const authCodeUrlParameters = {
      scopes: scopes,
      redirectUri: redirectUri,
      state: req.user.username
    };

    console.log('🔵 [DEBUG] Redirect URI:', redirectUri);
    const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    
    res.json({ url: response });
  } catch (error) {
    console.error('🔴 [DEBUG] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Callback de Microsoft
router.get('/microsoft/callback', async (req, res) => {
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${backendUrl}/api/auth/microsoft/callback`;

    const tokenRequest = {
      code: req.query.code,
      scopes: scopes,
      redirectUri: redirectUri,
    };

    const response = await msalClient.acquireTokenByCode(tokenRequest);
    const username = req.query.state;

    if (username) {
        await dbAsync.run(
          "UPDATE users SET microsoft_access_token = ?, microsoft_refresh_token = ?, microsoft_email = ?, microsoft_id = ? WHERE username = ?",
          [response.accessToken, response.refreshToken || '', response.account.username, response.account.homeAccountId, username]
        );
        
        res.redirect(`${frontendUrl}/panel?settings=true&tab=integrations&status=success`);
    } else {
        res.redirect(`${frontendUrl}/login?error=state_missing`);
    }

  } catch (error) {
    console.error('🔴 Error en callback Microsoft:', error);
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/panel?error=microsoft_auth_failed`);
  }
});

module.exports = router;

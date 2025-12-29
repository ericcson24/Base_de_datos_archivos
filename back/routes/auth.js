const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');
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

module.exports = router;

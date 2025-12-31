const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');
const si = require('systeminformation');
const multer = require('multer');
const fs = require('fs');
const { dbAsync } = require('../database/db');
const { msalClient, scopes } = require('../utils/microsoft-auth');

// Configuración de Multer para avatares
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/avatars/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

const { encrypt, decrypt } = require('../utils/cryptoUtils');
const { sendEmail } = require('../utils/emailService');

// Función para validar credenciales usando la base de datos SQLite
async function validateCredentials(username, password) {
  try {
    console.log(`Validando credenciales para: ${username}`);

    // 1. Buscar usuario
    const user = await dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user) {
      return { success: false, message: 'Usuario no encontrado', errorCode: 'USER_NOT_FOUND', info: {} };
    }

    // 2. Buscar credenciales en la nueva tabla
    let credentials = await dbAsync.get("SELECT * FROM user_credentials WHERE user_id = ?", [user.id]);

    // Fallback: Si no hay credenciales en la nueva tabla, intentar usar la antigua (migración al vuelo)
    if (!credentials && user.password) {
      console.log(`Migrando credenciales al vuelo para ${username}...`);
      await dbAsync.run("INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)", [user.id, user.password]);
      credentials = await dbAsync.get("SELECT * FROM user_credentials WHERE user_id = ?", [user.id]);
    }

    if (!credentials) {
      return { success: false, message: 'Credenciales no encontradas', errorCode: 'CREDENTIALS_MISSING', info: {} };
    }

    // Verificar bloqueo temporal
    if (credentials.lockout_until) {
      const lockoutTime = new Date(credentials.lockout_until);
      if (lockoutTime > new Date()) {
        return { 
          success: false, 
          message: `Cuenta bloqueada temporalmente. Intente de nuevo en ${Math.ceil((lockoutTime - new Date()) / 60000)} minutos.`, 
          errorCode: 'ACCOUNT_LOCKED_TEMP', 
          info: {} 
        };
      } else {
        // Desbloquear si pasó el tiempo
        await dbAsync.run("UPDATE user_credentials SET is_locked = 0, lockout_until = NULL, failed_attempts = 0 WHERE user_id = ?", [user.id]);
        credentials.is_locked = 0;
      }
    }

    if (credentials.is_locked) {
      return { success: false, message: 'Cuenta bloqueada. Contacte al administrador.', errorCode: 'ACCOUNT_LOCKED', info: {} };
    }

    // 3. Verificar contraseña
    const match = await bcrypt.compare(password, credentials.password_hash);

    if (match) {
      // Resetear intentos y actualizar login
      await dbAsync.run("UPDATE user_credentials SET failed_attempts = 0, last_login = CURRENT_TIMESTAMP, lockout_until = NULL, is_locked = 0 WHERE user_id = ?", [user.id]);
      
      await dbAsync.run("INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)", 
        [user.id, user.username, 'LOGIN', 'Inicio de sesión exitoso', '::1']);

      return {
        success: true,
        message: 'Autenticación exitosa',
        info: { id: user.id, role: user.role, validation_type: 'database' }
      };
    } else {
      // Incrementar intentos
      const newAttempts = (credentials.failed_attempts || 0) + 1;
      let updateSql = "UPDATE user_credentials SET failed_attempts = ? WHERE user_id = ?";
      let params = [newAttempts, user.id];

      // Bloquear si supera 5 intentos
      if (newAttempts >= 5) {
        // Bloqueo temporal de 15 minutos
        const lockoutTime = new Date(Date.now() + 15 * 60000).toISOString();
        updateSql = "UPDATE user_credentials SET failed_attempts = ?, is_locked = 1, lockout_until = ? WHERE user_id = ?";
        params = [newAttempts, lockoutTime, user.id];
        
        // Notificar al admin si es una cuenta importante o si es el propio admin
        if (user.role === 'admin') {
           // Buscar email de recuperación del admin
           const adminSettings = await dbAsync.get("SELECT * FROM security_settings WHERE user_id = ?", [user.id]);
           if (adminSettings && adminSettings.recovery_email_enc) {
             const email = decrypt({ iv: adminSettings.recovery_email_iv, encryptedData: adminSettings.recovery_email_enc });
             if (email) {
               sendEmail(email, 'ALERTA DE SEGURIDAD: Cuenta de Administrador Bloqueada', 
                 `<p>Su cuenta de administrador ha sido bloqueada temporalmente debido a múltiples intentos fallidos.</p>
                  <p>Se desbloqueará automáticamente en 15 minutos.</p>
                  <p>Si no fue usted, contacte a soporte inmediatamente.</p>`
               );
             }
           }
        }

        await dbAsync.run(updateSql, params);
        return { success: false, message: 'Cuenta bloqueada temporalmente por demasiados intentos fallidos.', errorCode: 'ACCOUNT_LOCKED_TEMP', info: {} };
      } else {
        await dbAsync.run(updateSql, params);
      }

      await dbAsync.run("INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)", 
        [user.id, user.username, 'LOGIN_FAILED', `Intento fallido (${newAttempts}/5)`, '::1']);

      return { success: false, message: 'Credenciales incorrectas', errorCode: 'INVALID_CREDENTIALS', info: {} };
    }
  } catch (error) {
    console.error('Error en validación DB:', error);
    return { success: false, message: 'Error interno del servidor', info: {} };
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
        id: result.info.id,
        username: username,
        role: result.info.role || 'user'
      };
      const token = Buffer.from(JSON.stringify(userData)).toString('base64');

      console.log(`✅ Login exitoso para: ${username}`);

      // Guardar token en cookie HTTP-only segura
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/'
      };
      res.cookie('auth_token', token, cookieOptions);

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
        message: result.message,
        errorCode: result.errorCode || 'AUTH_FAILED'
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
    console.log('👋 Cerrando sesión. Cookies recibidas:', req.cookies);

    // Destruir sesión de servidor primero
    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
    }

    // Usar setHeader directamente para enviar múltiples Set-Cookie con todas las variaciones posibles
    // Esto es "fuerza bruta" para asegurar que el navegador borre la cookie
    const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Construir lista de cookies a borrar
    const cookiesToClear = [
      // Variaciones genéricas
      `auth_token=; Path=/; Expires=${pastDate}; HttpOnly`,
      `auth_token=; Path=/; Expires=${pastDate}; HttpOnly; SameSite=Lax`,
      `auth_token=; Path=/; Expires=${pastDate}; HttpOnly; SameSite=Strict`,
      `auth_token=; Path=/; Expires=${pastDate}; HttpOnly; SameSite=None; Secure`,
      
      // Variaciones con Domain explícito (localhost)
      `auth_token=; Path=/; Domain=localhost; Expires=${pastDate}; HttpOnly; SameSite=Lax`,
      `auth_token=; Path=/; Domain=localhost; Expires=${pastDate}; HttpOnly`,
      
      // Variaciones para connect.sid
      `connect.sid=; Path=/; Expires=${pastDate}; HttpOnly; SameSite=Lax`,
      `connect.sid=; Path=/; Expires=${pastDate}; HttpOnly`
    ];

    // Agregar variación con el dominio actual de la petición si es diferente a localhost
    if (req.hostname && req.hostname !== 'localhost') {
      cookiesToClear.push(`auth_token=; Path=/; Domain=${req.hostname}; Expires=${pastDate}; HttpOnly; SameSite=Lax`);
      cookiesToClear.push(`auth_token=; Path=/; Domain=${req.hostname}; Expires=${pastDate}; HttpOnly`);
    }

    res.setHeader('Set-Cookie', cookiesToClear);

    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
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
      // console.log('Verify: No token found');
      return res.status(401).json({ success: false, message: 'No hay sesión activa' });
    }

    // Decodificar token (simple base64 como en login)
    const userDataString = Buffer.from(token, 'base64').toString('utf-8');
    const userData = JSON.parse(userDataString);

    // console.log('Verify: Token valid for', userData.username);

    // Si el token es válido, refrescar la cookie para mantener la sesión viva
    // Solo si no es una petición de verificación rápida (opcional)
    
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
      "SELECT id, username, role, avatar_url, theme_preference, language, notifications, microsoft_access_token, microsoft_email FROM users WHERE username = ?", 
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
    console.error(' [DEBUG] Error:', error);
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

    console.log(' [DEBUG] Callback Microsoft:', { 
      username, 
      hasToken: !!response.accessToken,
      account: response.account?.username 
    });

    if (username) {
        // Verificar si el usuario existe antes de actualizar
        const user = await dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);
        
        if (user) {
          await dbAsync.run(
            "UPDATE users SET microsoft_access_token = ?, microsoft_refresh_token = ?, microsoft_email = ?, microsoft_id = ? WHERE username = ?",
            [response.accessToken, response.refreshToken || '', response.account.username, response.account.homeAccountId, username]
          );
          console.log(' [DEBUG] Usuario actualizado con tokens Microsoft');
          res.redirect(`${frontendUrl}/panel?settings=true&tab=integrations&status=success`);
        } else {
          console.error(' [DEBUG] Usuario no encontrado en DB:', username);
          res.redirect(`${frontendUrl}/panel?error=user_not_found`);
        }
    } else {
        console.error(' [DEBUG] State (username) missing in callback');
        res.redirect(`${frontendUrl}/login?error=state_missing`);
    }

  } catch (error) {
    console.error(' Error en callback Microsoft:', error);
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/panel?error=microsoft_auth_failed`);
  }
});

// Obtener lista de avatares predeterminados
router.get('/avatars', async (req, res) => {
  try {
    const defaultsDir = path.join(__dirname, '../public/avatars/defaults');
    if (!fs.existsSync(defaultsDir)) {
      fs.mkdirSync(defaultsDir, { recursive: true });
    }
    
    const files = fs.readdirSync(defaultsDir);
    const avatarUrls = files.map(file => `/avatars/defaults/${file}`);
    
    res.json({ success: true, avatars: avatarUrls });
  } catch (error) {
    console.error('Error listando avatares:', error);
    res.status(500).json({ success: false, message: 'Error al obtener avatares' });
  }
});

// Subir avatar personalizado
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const avatarUrl = `/avatars/uploads/${req.file.filename}`;
    const username = req.user.username;

    await dbAsync.run("UPDATE users SET avatar_url = ? WHERE username = ?", [avatarUrl, username]);

    res.json({ success: true, avatarUrl, message: 'Avatar actualizado correctamente' });
  } catch (error) {
    console.error('Error subiendo avatar:', error);
    res.status(500).json({ success: false, message: 'Error al subir avatar' });
  }
});

// Eliminar avatar personalizado
router.delete('/avatar', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await dbAsync.get("SELECT avatar_url FROM users WHERE username = ?", [username]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const currentAvatar = user.avatar_url;
    if (currentAvatar && currentAvatar.startsWith('/avatars/uploads/')) {
      const filePath = path.join(__dirname, '../public', currentAvatar);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error('No se pudo borrar avatar:', err);
        });
      }
    }

    await dbAsync.run("UPDATE users SET avatar_url = NULL WHERE username = ?", [username]);

    res.json({ success: true, avatarUrl: null, message: 'Avatar eliminado' });
  } catch (error) {
    console.error('Error eliminando avatar:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar avatar' });
  }
});

// Endpoint para recuperar contraseña
router.post('/recover-password', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: 'Usuario requerido' });
  }

  try {
    const user = await dbAsync.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user) {
      // Por seguridad, no decimos si el usuario existe o no
      return res.json({ success: true, message: 'Si el usuario existe, se ha enviado una solicitud al administrador.' });
    }

    // Crear notificación para el administrador
    await dbAsync.run(
      "INSERT INTO admin_inbox (type, user_id, message) VALUES (?, ?, ?)",
      ['RESET_REQUEST', user.id, `El usuario ${username} ha solicitado restablecer su contraseña.`]
    );

    // Buscar si hay un administrador con email configurado para notificarle
    const admins = await dbAsync.all("SELECT u.id, u.username FROM users u WHERE u.role = 'admin'");
    
    for (const admin of admins) {
      const settings = await dbAsync.get("SELECT * FROM security_settings WHERE user_id = ?", [admin.id]);
      if (settings && settings.recovery_email_enc) {
        const email = decrypt({ iv: settings.recovery_email_iv, encryptedData: settings.recovery_email_enc });
        if (email) {
          await sendEmail(email, 'Solicitud de Restablecimiento de Contraseña', 
            `<p>El usuario <strong>${username}</strong> ha solicitado restablecer su contraseña.</p>
             <p>Por favor, inicie sesión en el panel de administración para gestionar esta solicitud.</p>`
          );
        }
      }
    }

    res.json({ success: true, message: 'Solicitud enviada al administrador.' });

  } catch (error) {
    console.error('Error en recuperación:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('./database/db');
const { encrypt, decrypt } = require('./utils/cryptoUtils');
const multer = require('multer');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

const app = express();
const PORT = process.env.PORT || 5001;
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://email-service:5007';

app.set('trust proxy', 1);

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const user = (req.body && req.body.username ? String(req.body.username).toLowerCase().trim() : '').slice(0, 64);
  const key = `${ip}|${user}`;
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (record && now < record.resetTime) {
    if (record.count >= RATE_LIMIT_MAX) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      console.log(`[Blocked] Rate limit exceeded for ${key} (${record.count} attempts)`);
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos de login. Intente de nuevo más tarde.',
        retryAfter
      });
    }
    record.count++;
  } else {
    loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now >= record.resetTime) loginAttempts.delete(key);
  }
}, 30 * 60 * 1000);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext)
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir));

async function sendEmail(to, subject, html) {
    try {
        await axios.post(`${EMAIL_SERVICE_URL}/send`, { to, subject, html });
        return true;
    } catch (error) {
        console.error('Error sending email via service:', error.message);
        return false;
    }
}


async function validateCredentials(username, password) {
  try {
    console.log(`Validando credenciales para: ${username}`);

    const user = await dbAsync.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return { success: false, message: 'Usuario no encontrado', errorCode: 'USER_NOT_FOUND', info: {} };
    }

    let credentials = await dbAsync.get('SELECT * FROM user_credentials WHERE user_id = ?', [user.id]);

    if (!credentials && user.password) {
      console.log(`Migrando credenciales al vuelo para ${username}...`);
      await dbAsync.run('INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)', [user.id, user.password]);
      credentials = await dbAsync.get('SELECT * FROM user_credentials WHERE user_id = ?', [user.id]);
    }

    if (!credentials) {
      return { success: false, message: 'Credenciales no encontradas', errorCode: 'CREDENTIALS_MISSING', info: {} };
    }

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
        await dbAsync.run('UPDATE user_credentials SET is_locked = FALSE, lockout_until = NULL, failed_attempts = 0 WHERE user_id = ?', [user.id]);
        credentials.is_locked = 0;
      }
    }

    if (credentials.is_locked) {
      return { success: false, message: 'Cuenta bloqueada. Contacte al administrador.', errorCode: 'ACCOUNT_LOCKED', info: {} };
    }

    const match = await bcrypt.compare(password, credentials.password_hash);

    if (match) {
      await dbAsync.run('UPDATE user_credentials SET failed_attempts = 0, last_login = CURRENT_TIMESTAMP, lockout_until = NULL, is_locked = FALSE WHERE user_id = ?', [user.id]);
      
      await dbAsync.run('INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)', 
        [user.id, user.username, 'LOGIN', 'Inicio de sesión exitoso', '::1']);

      return {
        success: true,
        message: 'Autenticación exitosa',
        info: { id: user.id, role: user.role, validation_type: 'database' }
      };
    } else {
      const newAttempts = (credentials.failed_attempts || 0) + 1;
      let updateSql = 'UPDATE user_credentials SET failed_attempts = ? WHERE user_id = ?';
      let params = [newAttempts, user.id];

      if (newAttempts >= 5) {
        const lockoutTime = new Date(Date.now() + 15 * 60000).toISOString();
        updateSql = 'UPDATE user_credentials SET failed_attempts = ?, is_locked = TRUE, lockout_until = ? WHERE user_id = ?';
        params = [newAttempts, lockoutTime, user.id];
        
        if (user.role === 'admin') {
           const adminSettings = await dbAsync.get('SELECT * FROM security_settings WHERE user_id = ?', [user.id]);
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

      await dbAsync.run('INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)', 
        [user.id, user.username, 'LOGIN_FAILED', `Intento fallido (${newAttempts}/5)`, '::1']);

      return { success: false, message: 'Credenciales incorrectas', errorCode: 'INVALID_CREDENTIALS', info: {} };
    }
  } catch (error) {
    console.error('Error en validación DB:', error);
    return { success: false, message: 'Error interno del servidor', info: {} };
  }
}

app.post('/login', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Usuario y contraseña son requeridos'
    });
  }

  try {
    console.log(`[Secure] Validando credenciales para: ${username}`);

    const result = await validateCredentials(username, password);

    if (result.success) {
      const userData = {
        id: result.info.id,
        username: username,
        role: result.info.role || 'user'
      };
      const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

      console.log(`✅ Login exitoso para: ${username}`);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      };
      res.cookie('auth_token', token, cookieOptions);

      res.json({
        success: true,
        message: result.message,
        user: userData,
        token: token
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

app.post('/logout', (req, res) => {
  try {
    console.log('👋 Cerrando sesión. Cookies recibidas:', req.cookies);

    const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const cookiesToClear = [
      `auth_token=; Path=/; Expires=${pastDate}; HttpOnly`,
      `auth_token=; Path=/; Expires=${pastDate}; HttpOnly; SameSite=Lax`,
      `auth_token=; Path=/; Domain=localhost; Expires=${pastDate}; HttpOnly`
    ];

    if (req.hostname && req.hostname !== 'localhost') {
      cookiesToClear.push(`auth_token=; Path=/; Domain=${req.hostname}; Expires=${pastDate}; HttpOnly`);
    }

    res.setHeader('Set-Cookie', cookiesToClear);
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
  }
});

app.post('/recover-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Usuario requerido' });

  try {
    const user = await dbAsync.get('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
      await dbAsync.run('INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)', 
        [user.id, user.username, 'PASSWORD_RECOVERY_REQUEST', 'Solicitud de recuperación', '::1']);
    }
    res.json({ success: true, message: 'Instrucciones enviadas (Simulado)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

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
      const userData = jwt.verify(token, JWT_SECRET);
      req.user = userData;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
};

app.get('/verify', async (req, res) => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No hay sesión activa' });

    const userData = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: { id: userData.id, username: userData.username, role: userData.role } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
});

app.get('/settings', authenticate, async (req, res) => {
  try {
    const user = await dbAsync.get(
      'SELECT id, username, role, avatar_url, theme_preference, language, notifications, microsoft_access_token, microsoft_email FROM users WHERE username = ?', 
      [req.user.username]
    );

    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

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
        microsoftLinked: !!user.microsoft_access_token,
        microsoftEmail: user.microsoft_email
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.put('/settings', authenticate, async (req, res) => {
  try {
    const { theme, avatarUrl, language, notifications, newPassword, currentPassword } = req.body;
    const username = req.user.username;

    if (theme) await dbAsync.run('UPDATE users SET theme_preference = ? WHERE username = ?', [theme, username]);
    if (avatarUrl !== undefined) await dbAsync.run('UPDATE users SET avatar_url = ? WHERE username = ?', [avatarUrl, username]);
    if (language) await dbAsync.run('UPDATE users SET language = ? WHERE username = ?', [language, username]);
    if (notifications !== undefined) await dbAsync.run('UPDATE users SET notifications = ? WHERE username = ?', [notifications ? 1 : 0, username]);
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' });
      }
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ success: false, message: 'Debes introducir tu contraseña actual' });
      }
      const user = await dbAsync.get('SELECT id FROM users WHERE username = ?', [username]);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      const creds = await dbAsync.get('SELECT password_hash FROM user_credentials WHERE user_id = ?', [user.id]);
      if (!creds) return res.status(400).json({ success: false, message: 'Credenciales no encontradas' });
      const ok = await bcrypt.compare(currentPassword, creds.password_hash);
      if (!ok) return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
      const hash = await bcrypt.hash(newPassword, 10);
      await dbAsync.run('UPDATE user_credentials SET password_hash = ? WHERE user_id = ?', [hash, user.id]);
    }

    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.post('/link-microsoft', authenticate, async (req, res) => {
  try {
    const { accessToken, refreshToken, email, accountId } = req.body;
    const username = req.user.username;

    await dbAsync.run(
      'UPDATE users SET microsoft_access_token = ?, microsoft_refresh_token = ?, microsoft_email = ?, microsoft_id = ? WHERE username = ?',
      [accessToken, refreshToken, email, accountId, username]
    );

    res.json({ success: true, message: 'Cuenta de Microsoft vinculada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.post('/unlink-microsoft', authenticate, async (req, res) => {
  try {
    const username = req.user.username;
    await dbAsync.run(
      'UPDATE users SET microsoft_access_token = NULL, microsoft_refresh_token = NULL, microsoft_email = NULL, microsoft_id = NULL WHERE username = ?',
      [username]
    );
    res.json({ success: true, message: 'Cuenta de Microsoft desvinculada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.get('/microsoft/url', authenticate, (req, res) => {
  const clientId = process.env.MICROSOFT_CLIENT_ID || 'YOUR_CLIENT_ID';
  
  let redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  
  if (!redirectUri || redirectUri.includes('localhost')) {
      const host = req.get('host');
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          const protocol = 'https'; 
          redirectUri = `${protocol}://${host}/api/auth/microsoft/callback`;
      }
  }
  if (!redirectUri) redirectUri = 'http://localhost/api/auth/microsoft/callback';

  console.log('[Auth] Generated Redirect URI:', redirectUri);

  const scope = 'user.read calendars.readwrite offline_access';
  
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scope)}&state=${req.user.username}`;
  
  res.json({ url });
});

app.get('/microsoft/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    
    let redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    if (!redirectUri || redirectUri.includes('localhost')) {
        const host = req.get('host');
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            const protocol = 'https';
            redirectUri = `${protocol}://${host}/api/auth/microsoft/callback`;
        }
    }
    if (!redirectUri) redirectUri = 'http://localhost/api/auth/microsoft/callback';

    console.log('[Auth] Callback Redirect URI used:', redirectUri);

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        scope: 'user.read calendars.readwrite offline_access',
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        client_secret: clientSecret
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }

    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    await dbAsync.run(
      'UPDATE users SET microsoft_access_token = ?, microsoft_refresh_token = ?, microsoft_email = ?, microsoft_id = ? WHERE username = ?',
      [tokenData.access_token, tokenData.refresh_token, userData.mail || userData.userPrincipalName, userData.id, state]
    );

    let baseUrl = 'http://localhost';
    const host = req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        baseUrl = `https://${host}`;
    }

    res.redirect(`${baseUrl}/calendar?linked=true`);
  } catch (error) {
    console.error('Error linking Microsoft account:', error);
    
    let baseUrl = 'http://localhost';
    const host = req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        baseUrl = `https://${host}`;
    }
    
    res.redirect(`${baseUrl}/calendar?error=linking_failed`);
  }
});

app.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const avatarUrl = `/api/auth/uploads/${req.file.filename}`;
        const username = req.user.username;

        await dbAsync.run('UPDATE users SET avatar_url = ? WHERE username = ?', [avatarUrl, username]);

        res.json({ success: true, avatarUrl: avatarUrl });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ success: false, message: 'Error uploading avatar' });
    }
});

app.delete('/avatar', authenticate, async (req, res) => {
    try {
        const username = req.user.username;
        await dbAsync.run('UPDATE users SET avatar_url = NULL WHERE username = ?', [username]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting avatar' });
    }
});

app.get('/avatars', async (req, res) => {
    res.json({ success: true, avatars: [] });
});


const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
};

app.get('/security/rate-limits', authenticate, requireAdmin, (req, res) => {
  try {
    const now = Date.now();
    const blocked = [];
    for (const [ip, record] of loginAttempts) {
      if (now < record.resetTime) {
        blocked.push({
          ip,
          attempts: record.count,
          maxAttempts: RATE_LIMIT_MAX,
          isBlocked: record.count >= RATE_LIMIT_MAX,
          expiresAt: new Date(record.resetTime).toISOString(),
          remainingSeconds: Math.ceil((record.resetTime - now) / 1000)
        });
      }
    }
    res.json({ success: true, rateLimits: blocked, total: blocked.length, blockedCount: blocked.filter(b => b.isBlocked).length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/security/rate-limits/:ip', authenticate, requireAdmin, (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    if (loginAttempts.has(ip)) {
      loginAttempts.delete(ip);
      console.log(`[Unlock] Admin ${req.user.username} unblocked rate-limit for IP: ${ip}`);
      dbAsync.run('INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, req.user.username, 'RATE_LIMIT_CLEAR', `IP desbloqueada: ${ip}`, '::1']);
      return res.json({ success: true, message: `IP ${ip} desbloqueada` });
    }
    res.status(404).json({ success: false, message: 'IP no encontrada en rate limits' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/security/rate-limits', authenticate, requireAdmin, (req, res) => {
  try {
    const count = loginAttempts.size;
    loginAttempts.clear();
    console.log(`[Unlock] Admin ${req.user.username} cleared all rate limits (${count} entries)`);
    dbAsync.run('INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, 'RATE_LIMIT_CLEAR_ALL', `Se limpiaron ${count} entradas de rate limit`, '::1']);
    res.json({ success: true, message: `${count} entradas de rate limit eliminadas` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/security/blocked-accounts', authenticate, requireAdmin, async (req, res) => {
  try {
    const accounts = await dbAsync.all(`
      SELECT u.id, u.username, u.role, uc.failed_attempts, uc.is_locked, uc.lockout_until, uc.last_login
      FROM users u
      JOIN user_credentials uc ON u.id = uc.user_id
      WHERE uc.is_locked = TRUE OR uc.failed_attempts > 0
      ORDER BY uc.failed_attempts DESC
    `);
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/security/unlock-account/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await dbAsync.run('UPDATE user_credentials SET is_locked = FALSE, lockout_until = NULL, failed_attempts = 0 WHERE user_id = ?', [userId]);
    const user = await dbAsync.get('SELECT username FROM users WHERE id = ?', [userId]);
    console.log(`[Unlock] Admin ${req.user.username} unlocked account for user ID: ${userId}`);
    await dbAsync.run('INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, 'ACCOUNT_UNLOCK', `Cuenta desbloqueada: ${user?.username || userId}`, '::1']);
    res.json({ success: true, message: `Cuenta desbloqueada` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/security/audit-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const filter = req.query.filter || 'all';
    
    let whereClause = '';
    if (filter === 'logins') {
      whereClause = "WHERE action IN ('LOGIN', 'LOGIN_FAILED')";
    } else if (filter === 'failures') {
      whereClause = "WHERE action = 'LOGIN_FAILED'";
    } else if (filter === 'blocks') {
      whereClause = "WHERE action IN ('ACCOUNT_UNLOCK', 'RATE_LIMIT_CLEAR', 'RATE_LIMIT_CLEAR_ALL')";
    } else if (filter === 'admin_actions') {
      whereClause = "WHERE action LIKE 'RATE_LIMIT%' OR action LIKE 'ACCOUNT_%' OR action = 'PASSWORD_RECOVERY_REQUEST'";
    }
    
    const logs = await dbAsync.all(`SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ?`, [limit]);
    
    const stats = await dbAsync.get(`
      SELECT 
        COUNT(*) FILTER (WHERE action = 'LOGIN' AND timestamp > NOW() - INTERVAL '24 hours') as logins_24h,
        COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED' AND timestamp > NOW() - INTERVAL '24 hours') as failures_24h,
        COUNT(*) FILTER (WHERE action = 'LOGIN' AND timestamp > NOW() - INTERVAL '7 days') as logins_7d,
        COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED' AND timestamp > NOW() - INTERVAL '7 days') as failures_7d
      FROM audit_logs
    `);
    
    res.json({ success: true, logs, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Auth Service is running');
});

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
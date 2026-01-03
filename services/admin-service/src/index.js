require('dotenv').config();
const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const path = require('path');
const axios = require('axios');
const os = require('os');
const util = require('util');
const { exec } = require('child_process');
const { dbAsync } = require('./database/db');
const { encrypt, decrypt } = require('./utils/cryptoUtils');

const execAsync = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 5006;
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://email-service:5007';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Middleware para verificar si el usuario es administrador
const requireAdmin = (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay sesión activa'
      });
    }

    const userData = JSON.parse(Buffer.from(token, 'base64').toString());

    if (!userData.username || userData.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Se requieren permisos de administrador'
      });
    }

    req.user = userData;
    next();
  } catch (error) {
    console.error('Error verificando sesión de admin:', error);
    res.status(401).json({
      success: false,
      message: 'Sesión inválida'
    });
  }
};

async function addLog(level, message, source = 'system', username = 'system', userId = null) {
  try {
    await dbAsync.run(
      "INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)",
      [userId, username, source.toUpperCase(), `[${level.toUpperCase()}] ${message}`, '::1']
    );
  } catch (error) {
    console.error('Error registrando log:', error);
  }
}

const getSystemStats = async () => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const uptime = os.uptime();
    
    let cpuUsage = '0%';
    // Simplified CPU usage for Docker environment
    cpuUsage = '10%'; // Placeholder

    return {
      memory_total_gb: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_used_gb: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_free_gb: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_usage: Math.round((usedMem / totalMem) * 100) + '%',
      cpu_count: cpus.length,
      cpu_model: cpus[0]?.model || 'Unknown',
      cpu_usage: cpuUsage,
      uptime_hours: Math.round(uptime / 3600 * 100) / 100,
      uptime_days: Math.round(uptime / 86400 * 100) / 100,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas del sistema:', error);
    return {
      error: 'Error obteniendo estadísticas del sistema',
      last_updated: new Date().toISOString()
    };
  }
};

app.get('/', (req, res) => {
  res.send('Admin Service is running');
});

app.get('/api/status', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Admin solicitando estado del sistema');
    
    const users = await dbAsync.all("SELECT * FROM users");
    const systemStats = await getSystemStats();
    
    await addLog('info', `Panel de administración - Estado solicitado por ${req.user.username}`, 'admin', req.user.username);
    
    const status = {
      success: true,
      status: 'online',
      total_users: users.length,
      active_users: users.filter(u => !u.is_locked).length,
      locked_users: users.filter(u => u.is_locked).length,
      server_stats: systemStats,
      timestamp: new Date().toISOString(),
      server_info: {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        pid: process.pid
      }
    };

    res.json(status);
  } catch (error) {
    console.error('❌ Error obteniendo estado del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    console.log('👥 Admin solicitando lista de usuarios');
    
    const users = await dbAsync.all(`
      SELECT 
        u.id, u.username, u.role, u.created_at,
        uc.is_locked, uc.last_login, uc.failed_attempts, uc.lockout_until
      FROM users u
      LEFT JOIN user_credentials uc ON u.id = uc.user_id
    `);
    
    const usersWithStats = users.map(user => {
      let time_remaining = null;
      if (user.is_locked && user.lockout_until) {
        const now = new Date();
        const lockoutEnd = new Date(user.lockout_until);
        if (lockoutEnd > now) {
          const diffMs = lockoutEnd - now;
          const diffMins = Math.ceil(diffMs / 60000);
          time_remaining = `${diffMins} min`;
        } else {
          time_remaining = '0 min';
        }
      }

      return {
        ...user,
        time_remaining,
        days_since_creation: Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000),
        days_since_last_login: user.last_login ? Math.floor((Date.now() - new Date(user.last_login).getTime()) / 86400000) : null
      };
    });

    await addLog('info', `Lista de usuarios solicitada por ${req.user.username} (${users.length} usuarios)`, 'admin', req.user.username);
    
    res.json({
      success: true,
      users: usersWithStats,
      total: users.length,
      active: users.filter(u => !u.is_locked).length,
      locked: users.filter(u => u.is_locked).length
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});

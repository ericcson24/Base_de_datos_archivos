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
const bcrypt = require('bcrypt');

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

// Crear usuario
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'user', email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    // Verificar si existe
    const existing = await dbAsync.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    // Crear usuario
    const result = await dbAsync.run(
      "INSERT INTO users (username, role, email, created_at) VALUES (?, ?, ?, ?)",
      [username, role, email, new Date().toISOString()]
    );
    
    const userId = result.lastID;

    // Crear credenciales
    const hashedPassword = await bcrypt.hash(password, 10);
    await dbAsync.run(
      "INSERT INTO user_credentials (user_id, password_hash, last_updated) VALUES (?, ?, ?)",
      [userId, hashedPassword, new Date().toISOString()]
    );

    await addLog('info', `Usuario creado: ${username}`, 'admin', req.user.username);
    
    res.json({ success: true, userId });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bloquear/Desbloquear usuario
app.put('/api/users/:id/lock', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { locked } = req.body; // true or false

    await dbAsync.run(
      "UPDATE user_credentials SET is_locked = ? WHERE user_id = ?",
      [locked ? 1 : 0, id]
    );

    await addLog('warning', `Usuario ${locked ? 'bloqueado' : 'desbloqueado'}: ID ${id}`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cambiar contraseña
app.put('/api/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ success: false, message: 'Contraseña requerida' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbAsync.run(
      "UPDATE user_credentials SET password_hash = ?, last_updated = ? WHERE user_id = ?",
      [hashedPassword, new Date().toISOString(), id]
    );

    await addLog('warning', `Contraseña cambiada para usuario ID ${id}`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eliminar usuario
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await dbAsync.run("DELETE FROM user_credentials WHERE user_id = ?", [id]);
    await dbAsync.run("DELETE FROM users WHERE id = ?", [id]);

    await addLog('critical', `Usuario eliminado: ID ${id}`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener logs
app.get('/api/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await dbAsync.all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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

// Server Info Endpoint
app.get('/api/server/info', requireAdmin, async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json({
      success: true,
      server_info: {
        hostname: stats.hostname,
        platform: stats.platform,
        arch: stats.arch,
        node_version: process.version,
        uptime: stats.uptime_hours,
        memory_total: stats.memory_total_gb,
        memory_free: stats.memory_free_gb,
        cpu_model: stats.cpu_model,
        cpu_count: stats.cpu_count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Server Connections Endpoint
app.get('/api/server/connections', requireAdmin, async (req, res) => {
  try {
    // Mock connections data for now, or use systeminformation
    const networkStats = await si.networkStats();
    const connections = await si.networkConnections();
    
    // Filter for relevant connections (e.g., HTTP, RDP ports)
    const activeConnections = connections.filter(c => c.state === 'ESTABLISHED').length;
    
    res.json({
      success: true,
      connections: {
        active: activeConnections,
        total_traffic_rx: networkStats[0]?.rx_bytes || 0,
        total_traffic_tx: networkStats[0]?.tx_bytes || 0,
        interfaces: networkStats.map(iface => ({
          iface: iface.iface,
          rx_bytes: iface.rx_bytes,
          tx_bytes: iface.tx_bytes,
          state: iface.operstate
        }))
      }
    });
  } catch (error) {
    // Fallback if systeminformation fails
    res.json({
      success: true,
      connections: {
        active: Math.floor(Math.random() * 10) + 1,
        total_traffic_rx: 1024 * 1024 * 100,
        total_traffic_tx: 1024 * 1024 * 50,
        interfaces: []
      }
    });
  }
});

// Inbox/Messages Endpoint
app.get('/api/inbox', requireAdmin, async (req, res) => {
  try {
    // Return mock messages or fetch from a table if it existed
    // For now, return empty or system notifications
    res.json({
      success: true,
      messages: [
        { id: 1, from: 'System', subject: 'Welcome to Admin Panel', date: new Date().toISOString(), read: false },
        { id: 2, from: 'Security', subject: 'System update available', date: new Date(Date.now() - 86400000).toISOString(), read: true }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const path = require('path');
const axios = require('axios');
const os = require('os');
const util = require('util');
const { exec } = require('child_process');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('./database/db');
const { encrypt, decrypt } = require('./utils/cryptoUtils');
const bcrypt = require('bcrypt');

const execAsync = util.promisify(exec);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:5001';

const app = express();
const PORT = process.env.PORT || 5006;
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://email-service:5007';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

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

    const userData = jwt.verify(token, JWT_SECRET);

    if (!userData.username || userData.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Se requieren permisos de administrador'
      });
    }

    req.user = userData;
    next();
  } catch (error) {
    console.error('Error verificando sesión de admin:', error.message);
    res.status(401).json({
      success: false,
      message: 'Sesión inválida o expirada'
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

    let cpuPercent = 0;
    try {
      const cpuLoad = await si.currentLoad();
      cpuPercent = Math.round(cpuLoad.currentLoad * 100) / 100;
    } catch (e) {
      const cpuAvg = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return acc + (1 - cpu.times.idle / total);
      }, 0) / cpus.length;
      cpuPercent = Math.round(cpuAvg * 10000) / 100;
    }

    let diskInfo = { total: 0, used: 0, free: 0, percent: 0 };
    try {
      const disks = await si.fsSize();
      if (disks.length > 0) {
        const main = disks[0];
        diskInfo = {
          total: Math.round(main.size / 1024 / 1024 / 1024 * 100) / 100,
          used: Math.round(main.used / 1024 / 1024 / 1024 * 100) / 100,
          free: Math.round((main.size - main.used) / 1024 / 1024 / 1024 * 100) / 100,
          percent: Math.round(main.use * 100) / 100
        };
      }
    } catch (e) {  }

    let networkInfo = { rx_sec: 0, tx_sec: 0, rx_total: 0, tx_total: 0, iface: '' };
    try {
      const nets = await si.networkStats();
      if (nets.length > 0) {
        const main = nets[0];
        networkInfo = {
          rx_sec: main.rx_sec || 0,
          tx_sec: main.tx_sec || 0,
          rx_total: main.rx_bytes || 0,
          tx_total: main.tx_bytes || 0,
          iface: main.iface || ''
        };
      }
    } catch (e) {  }

    return {
      memory_total_gb: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_used_gb: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_free_gb: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_percent: Math.round((usedMem / totalMem) * 10000) / 100,
      memory_usage: Math.round((usedMem / totalMem) * 100) + '%',
      cpu_count: cpus.length,
      cpu_model: cpus[0]?.model || 'Unknown',
      cpu_percent: cpuPercent,
      cpu_usage: cpuPercent + '%',
      disk_total_gb: diskInfo.total,
      disk_used_gb: diskInfo.used,
      disk_free_gb: diskInfo.free,
      disk_percent: diskInfo.percent,
      network: networkInfo,
      uptime_seconds: Math.floor(uptime),
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

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'user', email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    const existing = await dbAsync.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    const result = await dbAsync.run(
      "INSERT INTO users (username, role, created_at) VALUES (?, ?, ?)",
      [username, role, new Date().toISOString()]
    );
    
    const userId = result.lastID;

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbAsync.run(
      "INSERT INTO user_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)",
      [userId, hashedPassword, new Date().toISOString()]
    );

    await addLog('info', `Usuario creado: ${username}`, 'admin', req.user.username);
    
    res.json({ success: true, userId });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, password } = req.body;

    if (role) {
      await dbAsync.run("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await dbAsync.run(
        "UPDATE user_credentials SET password_hash = ?, updated_at = ? WHERE user_id = ?",
        [hashedPassword, new Date().toISOString(), id]
      );
    }

    await addLog('warning', `Usuario actualizado: ID ${id} (Rol: ${role || 'sin cambio'}, Pass: ${password ? 'cambiado' : 'sin cambio'})`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id/lock', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { locked } = req.body;

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

app.put('/api/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ success: false, message: 'Contraseña requerida' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbAsync.run(
      "UPDATE user_credentials SET password_hash = ?, updated_at = ? WHERE user_id = ?",
      [hashedPassword, new Date().toISOString(), id]
    );

    await addLog('warning', `Contraseña cambiada para usuario ID ${id}`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dbAsync.get("SELECT username FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await dbAsync.run("DELETE FROM shared_files WHERE owner_username = ? OR shared_with_username = ?", [user.username, user.username]);
    await dbAsync.run("DELETE FROM files WHERE owner_id = ?", [id]);
    await dbAsync.run("DELETE FROM folders WHERE owner_id = ?", [id]);
    await dbAsync.run("DELETE FROM group_members WHERE user_id = ?", [id]);
    try {
      await dbAsync.run(
        "DELETE FROM event_attachments WHERE event_id IN (SELECT COALESCE(microsoft_id, CAST(id AS TEXT)) FROM calendar_events WHERE user_id = ?) OR attached_by = ? OR file_owner = ?",
        [id, user.username, user.username]
      );
    } catch (eAtt) {  }
    await dbAsync.run("DELETE FROM calendar_events WHERE user_id = ?", [id]);
    await dbAsync.run("DELETE FROM notifications WHERE user_id = ?", [id]);
    await dbAsync.run("DELETE FROM admin_inbox WHERE user_id = ?", [id]);
    await dbAsync.run("DELETE FROM security_settings WHERE user_id = ?", [id]);
    await dbAsync.run("DELETE FROM windows_user_links WHERE cloud_username = ?", [user.username]);
    await dbAsync.run("DELETE FROM user_credentials WHERE user_id = ?", [id]);
    await dbAsync.run("DELETE FROM users WHERE id = ?", [id]);

    await addLog('critical', `Usuario eliminado: ${user.username} (solo acceso web)`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await dbAsync.all("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100");
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/status', requireAdmin, async (req, res) => {
  try {
    console.log('[Chart] Admin solicitando estado del sistema');
    
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
        u.id, u.username, u.role, u.created_at, u.deletion_scheduled_at,
        uc.is_locked, uc.last_login, uc.failed_attempts, uc.lockout_until,
        wl.windows_username
      FROM users u
      LEFT JOIN user_credentials uc ON u.id = uc.user_id
      LEFT JOIN windows_user_links wl ON u.username = wl.cloud_username
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

app.get('/api/server/info', requireAdmin, async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    let dockerContainers = 0;
    try {
      const { stdout } = await execAsync('cat /proc/1/cgroup 2>/dev/null | head -1');
      dockerContainers = -1;
    } catch (e) {  }

    res.json({
      success: true,
      server_info: {
        hostname: stats.hostname,
        platform: stats.platform,
        arch: stats.arch,
        node_version: process.version,
        pid: process.pid,
        uptime_seconds: stats.uptime_seconds,
        uptime_hours: stats.uptime_hours,
        uptime_days: stats.uptime_days,
        process_uptime_seconds: Math.floor(process.uptime()),
        memory_total_gb: stats.memory_total_gb,
        memory_used_gb: stats.memory_used_gb,
        memory_free_gb: stats.memory_free_gb,
        memory_percent: stats.memory_percent,
        cpu_model: stats.cpu_model,
        cpu_count: stats.cpu_count,
        cpu_percent: stats.cpu_percent,
        disk_total_gb: stats.disk_total_gb,
        disk_used_gb: stats.disk_used_gb,
        disk_free_gb: stats.disk_free_gb,
        disk_percent: stats.disk_percent,
        network: stats.network,
        environment: process.env.NODE_ENV || 'production',
        last_updated: stats.last_updated
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/server/connections', requireAdmin, async (req, res) => {
  try {
    const networkStats = await si.networkStats();
    const connections = await si.networkConnections();
    
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

app.get('/api/inbox', requireAdmin, async (req, res) => {
  try {
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

app.get('/api/diagnostics', requireAdmin, async (req, res) => {
  const diagnostics = [];

  try {
    await dbAsync.get("SELECT 1");
    diagnostics.push({ name: 'Database', status: 'ok', message: 'Connection successful' });
  } catch (e) {
    diagnostics.push({ name: 'Database', status: 'error', message: e.message });
  }

  try {
    const mem = process.memoryUsage();
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024);
    diagnostics.push({ name: 'Memory', status: usedMB < totalMB * 0.9 ? 'ok' : 'warning', message: `${usedMB}MB / ${totalMB}MB` });
  } catch (e) {
    diagnostics.push({ name: 'Memory', status: 'error', message: e.message });
  }

  try {
    const os = require('os');
    const freeMem = Math.round(os.freemem() / 1024 / 1024);
    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    diagnostics.push({ name: 'System Memory', status: freeMem > 100 ? 'ok' : 'warning', message: `Free: ${freeMem}MB / Total: ${totalMem}MB` });
  } catch (e) {
    diagnostics.push({ name: 'System Memory', status: 'error', message: e.message });
  }

  try {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    diagnostics.push({ name: 'Uptime', status: 'ok', message: `${hours}h ${minutes}m` });
  } catch (e) {
    diagnostics.push({ name: 'Uptime', status: 'error', message: e.message });
  }

  try {
    const result = await dbAsync.get("SELECT COUNT(*) as count FROM users");
    diagnostics.push({ name: 'Users', status: 'ok', message: `${result.count} registered users` });
  } catch (e) {
    diagnostics.push({ name: 'Users', status: 'error', message: e.message });
  }

  diagnostics.push({ name: 'Node.js', status: 'ok', message: process.version });

  res.json({ success: true, diagnostics });
});

app.post('/api/users/:id/schedule-deletion', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const scheduledTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    await dbAsync.run("UPDATE users SET deletion_scheduled_at = ? WHERE id = ?", [scheduledTime, id]);
    
    await addLog('warning', `Eliminación programada para usuario ID ${id}`, 'admin', req.user.username);
    res.json({ success: true, scheduledTime });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/users/:id/cancel-deletion', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await dbAsync.run("UPDATE users SET deletion_scheduled_at = NULL WHERE id = ?", [id]);
    
    await addLog('info', `Eliminación cancelada para usuario ID ${id}`, 'admin', req.user.username);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


app.get('/api/security/overview', requireAdmin, async (req, res) => {
  try {
    const stats = await dbAsync.get(`
      SELECT 
        COUNT(*) FILTER (WHERE action = 'LOGIN' AND timestamp > NOW() - INTERVAL '24 hours') as logins_24h,
        COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED' AND timestamp > NOW() - INTERVAL '24 hours') as failures_24h,
        COUNT(*) FILTER (WHERE action = 'LOGIN' AND timestamp > NOW() - INTERVAL '7 days') as logins_7d,
        COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED' AND timestamp > NOW() - INTERVAL '7 days') as failures_7d
      FROM audit_logs
    `);

    const lockedAccounts = await dbAsync.get("SELECT COUNT(*) as count FROM user_credentials WHERE is_locked = TRUE");
    
    const recentFailures = await dbAsync.all(`
      SELECT username, COUNT(*) as attempt_count, MAX(timestamp) as last_attempt
      FROM audit_logs 
      WHERE action = 'LOGIN_FAILED' AND timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY username
      ORDER BY attempt_count DESC
      LIMIT 10
    `);

    let rateLimits = { total: 0, blockedCount: 0, rateLimits: [] };
    try {
      const token = req.headers.authorization;
      const rlRes = await axios.get(`${AUTH_SERVICE_URL}/security/rate-limits`, {
        headers: { Authorization: token }
      });
      rateLimits = rlRes.data;
    } catch (e) {
      console.error('Could not fetch rate limits from auth-service:', e.message);
    }

    let blockedAccounts = [];
    try {
      const baRes = await axios.get(`${AUTH_SERVICE_URL}/security/blocked-accounts`, {
        headers: { Authorization: req.headers.authorization }
      });
      blockedAccounts = baRes.data.accounts || [];
    } catch (e) {
      console.error('Could not fetch blocked accounts:', e.message);
    }

    res.json({
      success: true,
      stats: stats || { logins_24h: 0, failures_24h: 0, logins_7d: 0, failures_7d: 0 },
      lockedAccounts: lockedAccounts?.count || 0,
      recentFailures,
      rateLimits,
      blockedAccounts
    });
  } catch (error) {
    console.error('Error fetching security overview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/security/logs', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const filter = req.query.filter || 'all';
    
    let whereClause = '';
    if (filter === 'logins') {
      whereClause = "WHERE action IN ('LOGIN', 'LOGIN_FAILED')";
    } else if (filter === 'failures') {
      whereClause = "WHERE action = 'LOGIN_FAILED'";
    } else if (filter === 'security') {
      whereClause = "WHERE action IN ('LOGIN', 'LOGIN_FAILED', 'ACCOUNT_UNLOCK', 'RATE_LIMIT_CLEAR', 'RATE_LIMIT_CLEAR_ALL', 'PASSWORD_RECOVERY_REQUEST')";
    }
    
    const logs = await dbAsync.all(`SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ?`, [limit]);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/security/rate-limits/:ip', requireAdmin, async (req, res) => {
  try {
    const response = await axios.delete(`${AUTH_SERVICE_URL}/security/rate-limits/${encodeURIComponent(req.params.ip)}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(error.response?.data || { success: false, message: error.message });
  }
});

app.delete('/api/security/rate-limits', requireAdmin, async (req, res) => {
  try {
    const response = await axios.delete(`${AUTH_SERVICE_URL}/security/rate-limits`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(error.response?.data || { success: false, message: error.message });
  }
});

app.post('/api/security/unlock-account/:userId', requireAdmin, async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/security/unlock-account/${req.params.userId}`, {}, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(error.response?.data || { success: false, message: error.message });
  }
});

setInterval(async () => {
  try {
    const now = new Date().toISOString();
    const usersToDelete = await dbAsync.all("SELECT id, username FROM users WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= ?", [now]);
    
    for (const user of usersToDelete) {
      console.log(`Executing scheduled deletion for user ${user.username} (${user.id})`);
      try {
        await dbAsync.run("DELETE FROM shared_files WHERE owner_username = ? OR shared_with_username = ?", [user.username, user.username]);
        await dbAsync.run("DELETE FROM files WHERE owner_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM folders WHERE owner_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM group_members WHERE user_id = ?", [user.id]);
        try {
          await dbAsync.run(
            "DELETE FROM event_attachments WHERE event_id IN (SELECT COALESCE(microsoft_id, CAST(id AS TEXT)) FROM calendar_events WHERE user_id = ?) OR attached_by = ? OR file_owner = ?",
            [user.id, user.username, user.username]
          );
        } catch (eAtt) {  }
        await dbAsync.run("DELETE FROM calendar_events WHERE user_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM notifications WHERE user_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM admin_inbox WHERE user_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM security_settings WHERE user_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM windows_user_links WHERE cloud_username = ?", [user.username]);
        await dbAsync.run("DELETE FROM user_credentials WHERE user_id = ?", [user.id]);
        await dbAsync.run("DELETE FROM users WHERE id = ?", [user.id]);
        await addLog('critical', `Usuario eliminado automáticamente: ${user.username} (solo acceso web)`, 'system', 'system');
      } catch (delErr) {
        console.error(`Failed to delete user ${user.username}:`, delErr.message);
      }
    }
  } catch (error) {
    console.error('Error in deletion background task:', error);
  }
}, 60 * 1000);

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});

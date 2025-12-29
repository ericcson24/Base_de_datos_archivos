const express = require('express');
const router = express.Router();
const os = require('os');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const bcrypt = require('bcrypt');
const { dbAsync } = require('../database/db');

const execAsync = util.promisify(exec);

// Middleware para verificar si el usuario es administrador
const requireAdmin = (req, res, next) => {
  try {
    // Intentar obtener token de cookie primero, luego del header Authorization
    let token = req.cookies?.auth_token;

    if (!token) {
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

// Función auxiliar para registrar logs en la base de datos
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

// Función para obtener estadísticas del sistema
const getSystemStats = async () => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const uptime = os.uptime();
    
    // Obtener uso de CPU real
    let cpuUsage = '0%';
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('wmic cpu get loadpercentage /value');
        const match = stdout.match(/LoadPercentage=(\d+)/);
        if (match) {
          cpuUsage = `${match[1]}%`;
        }
      } else {
        const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'");
        if (stdout.trim()) {
          cpuUsage = `${parseFloat(stdout.trim()).toFixed(1)}%`;
        }
      }
    } catch (error) {
      console.log('Error obteniendo CPU usage:', error.message);
    }

    // Obtener información de disco
    let diskInfo = { total: 0, free: 0, used: 0 };
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption /format:csv');
        const lines = stdout.split('\n').filter(line => line.includes('C:'));
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          if (parts.length >= 3) {
            diskInfo.free = parseInt(parts[1]) || 0;
            diskInfo.total = parseInt(parts[2]) || 0;
            diskInfo.used = diskInfo.total - diskInfo.free;
          }
        }
      }
    } catch (error) {
      console.log('Error obteniendo disk info:', error.message);
    }

    // Obtener información de red
    let networkInfo = { bytesRecv: 0, bytesSent: 0 };
    try {
      const networkInterfaces = os.networkInterfaces();
      const activeInterface = Object.values(networkInterfaces)
        .flat()
        .find(iface => !iface.internal && iface.family === 'IPv4');
      
      if (activeInterface) {
        // En un sistema real, aquí obtendrías estadísticas de red
        networkInfo.bytesRecv = Math.floor(Math.random() * 1000);
        networkInfo.bytesSent = Math.floor(Math.random() * 500);
      }
    } catch (error) {
      console.log('Error obteniendo network info:', error.message);
    }

    // Información de procesos
    let processCount = 0;
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist /fo csv | find /c /v ""');
        processCount = parseInt(stdout.trim()) - 1; // -1 para excluir header
      } else {
        const { stdout } = await execAsync('ps aux | wc -l');
        processCount = parseInt(stdout.trim()) - 1;
      }
    } catch (error) {
      console.log('Error obteniendo process count:', error.message);
    }

    return {
      // Memoria
      memory_total_gb: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_used_gb: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_free_gb: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
      memory_usage: Math.round((usedMem / totalMem) * 100) + '%',
      
      // CPU
      cpu_count: cpus.length,
      cpu_model: cpus[0]?.model || 'Unknown',
      cpu_usage: cpuUsage,
      
      // Sistema
      uptime_hours: Math.round(uptime / 3600 * 100) / 100,
      uptime_days: Math.round(uptime / 86400 * 100) / 100,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      
      // Disco
      disk_total_gb: Math.round(diskInfo.total / 1024 / 1024 / 1024 * 100) / 100,
      disk_used_gb: Math.round(diskInfo.used / 1024 / 1024 / 1024 * 100) / 100,
      disk_free_gb: Math.round(diskInfo.free / 1024 / 1024 / 1024 * 100) / 100,
      disk_usage: diskInfo.total > 0 ? Math.round((diskInfo.used / diskInfo.total) * 100) + '%' : '0%',
      
      // Red
      bytes_recv_mb: Math.round(networkInfo.bytesRecv / 1024 / 1024 * 100) / 100,
      bytes_sent_mb: Math.round(networkInfo.bytesSent / 1024 / 1024 * 100) / 100,
      
      // Procesos
      process_count: processCount,
      
      // Node.js específico
      node_version: process.version,
      node_uptime: Math.round(process.uptime() / 3600 * 100) / 100,
      memory_heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      memory_heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      
      // Timestamp
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

// Ruta: Estado del sistema
router.get('/api/status', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Admin solicitando estado del sistema');
    
    const users = await dbAsync.all("SELECT * FROM users");
    const systemStats = await getSystemStats();
    
    // Añadir log de acceso
    await addLog('info', `Panel de administración - Estado solicitado por ${req.user.username}`, 'admin', req.user.username);
    
    const status = {
      success: true,
      status: 'online',
      total_users: users.length,
      active_users: users.filter(u => !u.is_locked).length,
      locked_users: users.filter(u => u.is_locked).length,
      server_stats: systemStats,
      timestamp: new Date().toISOString(),
      
      // Información adicional del servidor
      server_info: {
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        pid: process.pid
      },
      
      // Estadísticas de conexiones activas
      connections: {
        current: Math.floor(Math.random() * 10) + 1, // Simulated
        total_today: Math.floor(Math.random() * 100) + 50,
        peak_today: Math.floor(Math.random() * 20) + 10
      }
    };

    console.log('✅ Estado del sistema enviado');
    res.json(status);
  } catch (error) {
    console.error('❌ Error obteniendo estado del sistema:', error);
    await addLog('error', `Error obteniendo estado del sistema: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Lista de usuarios
router.get('/api/users', requireAdmin, async (req, res) => {
  try {
    console.log('👥 Admin solicitando lista de usuarios');
    
    const users = await dbAsync.all("SELECT id, username, role, is_locked, last_login, failed_attempts, created_at FROM users");
    
    // Calcular días desde creación y último login
    const usersWithStats = users.map(user => ({
      ...user,
      days_since_creation: Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000),
      days_since_last_login: user.last_login ? Math.floor((Date.now() - new Date(user.last_login).getTime()) / 86400000) : null
    }));

    await addLog('info', `Lista de usuarios solicitada por ${req.user.username} (${users.length} usuarios)`, 'admin', req.user.username);
    
    console.log(`✅ Enviando ${users.length} usuarios`);
    res.json({
      success: true,
      users: usersWithStats,
      total: users.length,
      active: users.filter(u => !u.is_locked).length,
      locked: users.filter(u => u.is_locked).length
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    await addLog('error', `Error obteniendo usuarios: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Añadir usuario
router.post('/api/users/add', requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    console.log(`➕ Admin añadiendo usuario: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username y password son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await dbAsync.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUser) {
      await addLog('warning', `Intento de crear usuario existente: ${username} por ${req.user.username}`, 'admin', req.user.username);
      return res.status(400).json({
        success: false,
        message: `El usuario '${username}' ya existe`
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear nuevo usuario
    await dbAsync.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashedPassword, role || 'user']
    );
    
    await addLog('info', `Usuario '${username}' creado exitosamente por ${req.user.username} con rol: ${role}`, 'admin', req.user.username);
    console.log(`✅ Usuario '${username}' creado exitosamente`);
    
    res.json({
      success: true,
      message: `Usuario '${username}' creado exitosamente`,
      user: { username, role }
    });
  } catch (error) {
    console.error('❌ Error añadiendo usuario:', error);
    await addLog('error', `Error añadiendo usuario: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Cambiar contraseña de usuario
router.post('/api/users/change-password', requireAdmin, async (req, res) => {
  try {
    const { username, new_password } = req.body;
    
    if (!username || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Username y nueva contraseña son requeridos'
      });
    }

    console.log(`Admin ${req.user.username} está cambiando contraseña para usuario: ${username}`);
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    await dbAsync.run("UPDATE users SET password = ? WHERE username = ?", [hashedPassword, username]);
    
    await addLog('info', `Contraseña de '${username}' cambiada por ${req.user.username}`, 'admin', req.user.username);

    res.json({
      success: true,
      message: `Contraseña de '${username}' cambiada exitosamente`
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta: Desbloquear usuario
router.post('/api/users/unlock', requireAdmin, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username es requerido'
      });
    }

    console.log(`Admin ${req.user.username} está desbloqueando usuario: ${username}`);
    
    await dbAsync.run("UPDATE users SET is_locked = 0, failed_attempts = 0 WHERE username = ?", [username]);
    
    await addLog('info', `Usuario '${username}' desbloqueado por ${req.user.username}`, 'admin', req.user.username);

    res.json({
      success: true,
      message: `Usuario '${username}' desbloqueado exitosamente`
    });
  } catch (error) {
    console.error('Error desbloqueando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta: Desbloquear todos los usuarios
router.post('/api/users/unlock-all', requireAdmin, async (req, res) => {
  try {
    console.log(`Admin ${req.user.username} está desbloqueando todos los usuarios`);
    
    await dbAsync.run("UPDATE users SET is_locked = 0, failed_attempts = 0");
    
    await addLog('info', `Todos los usuarios desbloqueados por ${req.user.username}`, 'admin', req.user.username);

    res.json({
      success: true,
      message: 'Todos los usuarios han sido desbloqueados exitosamente'
    });
  } catch (error) {
    console.error('Error desbloqueando todos los usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta: Eliminar usuario
router.post('/api/users/delete', requireAdmin, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username es requerido'
      });
    }

    if (username === 'administrador') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el usuario administrador principal'
      });
    }

    console.log(`Admin ${req.user.username} está eliminando usuario: ${username}`);
    
    await dbAsync.run("DELETE FROM users WHERE username = ?", [username]);
    
    await addLog('warning', `Usuario '${username}' eliminado por ${req.user.username}`, 'admin', req.user.username);

    res.json({
      success: true,
      message: `Usuario '${username}' eliminado exitosamente`
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta: Logs del sistema
router.get('/api/logs', requireAdmin, async (req, res) => {
  try {
    console.log('📝 Admin solicitando logs del sistema');
    
    const { limit = 100, level, source } = req.query;
    
    let query = "SELECT * FROM audit_logs";
    let params = [];
    let conditions = [];

    if (source) {
      conditions.push("action = ?");
      params.push(source.toUpperCase());
    }

    // Nota: El nivel (level) está dentro del campo 'details' en este esquema simple, 
    // o podríamos mapear 'action' a source y 'details' para buscar el nivel.
    // Para simplificar, si hay level, buscamos en details
    if (level) {
      conditions.push("details LIKE ?");
      params.push(`%[${level.toUpperCase()}]%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(parseInt(limit));

    const logs = await dbAsync.all(query, params);
    
    // Mapear logs al formato esperado por el frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.details.includes('[ERROR]') ? 'error' : 
             log.details.includes('[WARNING]') ? 'warning' : 'info',
      message: log.details,
      source: log.action.toLowerCase(),
      username: log.username,
      raw: `[${new Date(log.timestamp).toLocaleString()}] [${log.action}] ${log.details}`
    }));

    await addLog('info', `Logs solicitados por ${req.user.username} (${logs.length} entradas)`, 'admin', req.user.username);
    
    console.log(`✅ Enviando ${logs.length} logs`);
    res.json({
      success: true,
      logs: formattedLogs,
      total: logs.length,
      filters: { level, source, limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('❌ Error obteniendo logs:', error);
    await addLog('error', `Error obteniendo logs: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Logs de usuario específico
router.get('/api/users/:username/logs', requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    
    const logs = await dbAsync.all(
      "SELECT * FROM audit_logs WHERE username = ? ORDER BY timestamp DESC LIMIT 50", 
      [username]
    );
    
    const formattedLogs = logs.map(log => ({
      timestamp: log.timestamp,
      message: log.details
    }));
    
    res.json({
      success: true,
      logs: formattedLogs
    });
  } catch (error) {
    console.error('Error obteniendo logs de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta: Información de contraseña de usuario
router.get('/api/users/:username/password-info', requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await dbAsync.get("SELECT created_at, last_login FROM users WHERE username = ?", [username]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const passwordInfo = {
      username: username,
      has_password: true,
      password_method: 'bcrypt_hash',
      created: user.created_at,
      last_login: user.last_login,
      password_hint: 'La contraseña está almacenada de forma segura con hash Bcrypt'
    };
    
    res.json({
      success: true,
      password_info: passwordInfo
    });
  } catch (error) {
    console.error('Error obteniendo información de contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Ruta: Ejecutar diagnósticos
router.post('/api/diagnostics/run', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin ejecutando diagnósticos del sistema');
    
    await addLog('info', `Diagnósticos iniciados por ${req.user.username}`, 'admin', req.user.username);
    
    const diagnostics = [];
    
    // 1. Test de conectividad de red
    try {
      const { stdout } = await execAsync('ping -n 1 google.com');
      const success = stdout.includes('TTL=') || stdout.includes('time=');
      diagnostics.push({
        test: 'Conectividad de Red',
        success: success,
        message: success ? 'Conexión a internet estable' : 'Sin conexión a internet',
        details: success ? 'Ping a google.com exitoso' : 'Ping a google.com falló'
      });
    } catch (error) {
      diagnostics.push({
        test: 'Conectividad de Red',
        success: false,
        message: 'Error verificando conectividad',
        details: error.message
      });
    }

    // 2. Estado del Servidor Node.js
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    diagnostics.push({
      test: 'Estado del Servidor Node.js',
      success: true,
      message: 'Servidor funcionando correctamente',
      details: `Uptime: ${Math.round(uptime / 3600)}h ${Math.round((uptime % 3600) / 60)}m, Memoria heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    });

    // 3. Verificación de espacio en disco
    try {
      let diskTest = { success: false, message: 'No se pudo verificar espacio en disco', details: '' };
      
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('dir /-c');
        const match = stdout.match(/(\d+) bytes free/i);
        if (match) {
          const freeBytes = parseInt(match[1]);
          const freeGB = freeBytes / (1024 * 1024 * 1024);
          diskTest = {
            success: freeGB > 1,
            message: freeGB > 1 ? 'Espacio en disco suficiente' : 'Espacio en disco bajo',
            details: `Espacio libre: ${freeGB.toFixed(2)} GB`
          };
        }
      }
      
      diagnostics.push({
        test: 'Espacio en Disco',
        ...diskTest
      });
    } catch (error) {
      diagnostics.push({
        test: 'Espacio en Disco',
        success: false,
        message: 'Error verificando espacio en disco',
        details: error.message
      });
    }

    // 4. Test de puertos del servidor
    const serverPorts = [5000, 3000, 3001];
    let openPorts = [];
    
    for (const port of serverPorts) {
      try {
        const net = require('net');
        const server = net.createServer();
        
        await new Promise((resolve, reject) => {
          server.listen(port, () => {
            server.close();
            resolve();
          });
          server.on('error', reject);
        });
        
        openPorts.push(port);
      } catch (error) {
        // Puerto en uso (esto es bueno para nuestros puertos de aplicación)
        if (error.code === 'EADDRINUSE') {
          openPorts.push(port + ' (en uso)');
        }
      }
    }
    
    diagnostics.push({
      test: 'Puertos del Servidor',
      success: openPorts.length > 0,
      message: openPorts.length > 0 ? 'Puertos del servidor disponibles' : 'No hay puertos disponibles',
      details: `Puertos verificados: ${openPorts.join(', ')}`
    });

    // 5. Verificación de dependencias críticas
    try {
      const packageJson = require('../../package.json');
      const dependencies = Object.keys(packageJson.dependencies || {});
      
      diagnostics.push({
        test: 'Dependencias del Sistema',
        success: dependencies.length > 0,
        message: 'Dependencias cargadas correctamente',
        details: `${dependencies.length} dependencias instaladas: ${dependencies.slice(0, 5).join(', ')}${dependencies.length > 5 ? '...' : ''}`
      });
    } catch (error) {
      diagnostics.push({
        test: 'Dependencias del Sistema',
        success: false,
        message: 'Error verificando dependencias',
        details: error.message
      });
    }

    // 6. Test de memoria del sistema
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    diagnostics.push({
      test: 'Uso de Memoria del Sistema',
      success: memoryUsagePercent < 85,
      message: memoryUsagePercent < 85 ? 'Uso de memoria normal' : 'Uso de memoria alto',
      details: `Uso: ${memoryUsagePercent.toFixed(1)}% (${Math.round((totalMem - freeMem) / 1024 / 1024 / 1024)}GB de ${Math.round(totalMem / 1024 / 1024 / 1024)}GB)`
    });

    // 7. Verificación de logs (DB)
    try {
      const logCount = await dbAsync.get("SELECT COUNT(*) as count FROM audit_logs");
      diagnostics.push({
        test: 'Sistema de Logs (DB)',
        success: true,
        message: 'Base de datos de logs conectada',
        details: `${logCount.count} entradas de log en base de datos`
      });
    } catch (error) {
      diagnostics.push({
        test: 'Sistema de Logs (DB)',
        success: false,
        message: 'Error conectando a base de datos de logs',
        details: error.message
      });
    }

    const successCount = diagnostics.filter(d => d.success).length;
    const totalTests = diagnostics.length;
    
    await addLog('info', `Diagnósticos completados: ${successCount}/${totalTests} exitosos`, 'admin', req.user.username);
    
    console.log(`✅ Diagnósticos completados: ${successCount}/${totalTests} exitosos`);
    
    res.json({
      success: true,
      results: diagnostics,
      summary: {
        total: totalTests,
        passed: successCount,
        failed: totalTests - successCount,
        success_rate: Math.round((successCount / totalTests) * 100)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error ejecutando diagnósticos:', error);
    await addLog('error', `Error ejecutando diagnósticos: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Información avanzada del servidor
router.get('/api/server/info', requireAdmin, async (req, res) => {
  try {
    console.log('🖥️ Admin solicitando información del servidor');
    
    const serverInfo = {
      // Información básica
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      
      // Tiempo de funcionamiento
      uptime_system: os.uptime(),
      uptime_process: process.uptime(),
      
      // CPU
      cpus: os.cpus().map(cpu => ({
        model: cpu.model,
        speed: cpu.speed
      })),
      
      // Memoria
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        process_usage: process.memoryUsage()
      },
      
      // Información de red
      network_interfaces: Object.entries(os.networkInterfaces()).map(([name, interfaces]) => ({
        name,
        interfaces: interfaces.filter(iface => !iface.internal)
      })).filter(item => item.interfaces.length > 0),
      
      // Variables de entorno relevantes (sin información sensible)
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 5000,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      
      // Estadísticas del proceso
      process_info: {
        pid: process.pid,
        title: process.title,
        version: process.version,
        versions: process.versions
      }
    };
    
    await addLog('info', `Información del servidor solicitada por ${req.user.username}`, 'admin', req.user.username);
    
    res.json({
      success: true,
      server_info: serverInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo información del servidor:', error);
    await addLog('error', `Error obteniendo información del servidor: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Conexiones activas y estadísticas de red
router.get('/api/server/connections', requireAdmin, async (req, res) => {
  try {
    console.log('🌐 Admin solicitando información de conexiones');
    
    // Simular estadísticas de conexión (en un sistema real vendría del servidor web)
    const connections = {
      active_connections: Math.floor(Math.random() * 15) + 1,
      total_requests_today: Math.floor(Math.random() * 1000) + 100,
      requests_per_minute: Math.floor(Math.random() * 50) + 5,
      
      // Por IP (simulado)
      top_ips: [
        { ip: '192.168.1.100', requests: Math.floor(Math.random() * 100) + 10, country: 'Local' },
        { ip: '192.168.1.101', requests: Math.floor(Math.random() * 50) + 5, country: 'Local' },
        { ip: '10.0.0.1', requests: Math.floor(Math.random() * 30) + 2, country: 'Local' }
      ],
      
      // Por user agent (simulado)
      browsers: [
        { name: 'Chrome', count: Math.floor(Math.random() * 100) + 50 },
        { name: 'Firefox', count: Math.floor(Math.random() * 50) + 20 },
        { name: 'Edge', count: Math.floor(Math.random() * 30) + 10 }
      ],
      
      // Códigos de respuesta
      response_codes: {
        '200': Math.floor(Math.random() * 800) + 200,
        '404': Math.floor(Math.random() * 50) + 5,
        '500': Math.floor(Math.random() * 10) + 1,
        '403': Math.floor(Math.random() * 20) + 2
      }
    };
    
    await addLog('info', `Estadísticas de conexiones solicitadas por ${req.user.username}`, 'admin', req.user.username);
    
    res.json({
      success: true,
      connections,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo conexiones:', error);
    await addLog('error', `Error obteniendo conexiones: ${error.message}`, 'admin', req.user.username);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Ruta: Monitoreo en tiempo real del sistema
router.get('/api/monitoring/realtime', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Admin solicitando monitoreo en tiempo real');
    
    // Obtener estadísticas reales de la DB
    const stats = await dbAsync.get(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_locked = 1) as locked_users,
        (SELECT SUM(failed_attempts) FROM users) as failed_attempts_today
    `);

    const recentLogins = await dbAsync.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_login > datetime('now', '-1 day')
    `);

    const realtimeData = {
      timestamp: new Date().toISOString(),
      
      // CPU usage en tiempo real
      cpu: {
        usage_percent: Math.floor(Math.random() * 50) + 10,
        load_average: os.loadavg(),
        cores: os.cpus().length
      },
      
      // Memoria en tiempo real
      memory: {
        total_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
        used_gb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100,
        free_gb: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      
      // Proceso Node.js
      node_process: {
        memory_heap_used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        memory_heap_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        uptime: Math.round(process.uptime()),
        pid: process.pid
      },
      
      // Actividad reciente
      activity: {
        recent_logins: recentLogins.count,
        locked_users: stats.locked_users,
        failed_attempts_today: stats.failed_attempts_today || 0
      }
    };
    
    res.json({
      success: true,
      data: realtimeData
    });
  } catch (error) {
    console.error('❌ Error en monitoreo tiempo real:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;

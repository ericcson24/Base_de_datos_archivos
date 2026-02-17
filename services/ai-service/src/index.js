const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const db = require('./utils/database');
const dualNodeIndexing = require('./utils/dualNodeIndexing');
const { syncDatabaseWithDisk } = require('./utils/diskSync');
const { initRedis } = require('./utils/notificationClient');
const { getCacheStats, getDetailedCacheStats } = require('./utils/cache');
const searchController = require('./controllers/searchController');
const calendarController = require('./controllers/calendarController');
const documentController = require('./controllers/documentController');
const roadmapController = require('./controllers/roadmapController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5009;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!process.env.GEMINI_API_KEY) {
  console.error(' GEMINI_API_KEY no está configurado - AI Service funcionará limitado');
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const userData = jwt.verify(token, JWT_SECRET);
      req.user = userData;
      next();
    } catch (error) {
      console.log('[AUTH ERROR]', error.message);
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
  } else {
    return res.status(401).json({ error: 'Token requerido' });
  }
};

// ===================================
// ENDPOINTS
// ===================================

// --- Search & Panel Commands ---
app.post('/command', authenticateToken, searchController.handleCommand);
app.post('/search', authenticateToken, searchController.searchFiles);
app.post('/edit', authenticateToken, searchController.editContent);
app.post('/analyze-file', authenticateToken, searchController.analyzeFile);

// --- Calendar ---
app.post('/create-event', authenticateToken, calendarController.createEvent);
app.post('/suggest-files', authenticateToken, calendarController.suggestFiles);

// --- Roadmap ---
app.post('/roadmap-command', authenticateToken, roadmapController.handleRoadmapCommand);
app.post('/cross-search', authenticateToken, roadmapController.crossSearch);

// --- Document Editor ---
app.post('/analyze-document', authenticateToken, documentController.analyzeDocument);
app.post('/explain-text', authenticateToken, documentController.explainText);
app.post('/edit-suggestion', authenticateToken, documentController.editSuggestion);
app.post('/highlight-analysis', authenticateToken, documentController.highlightAnalysis);

// --- Indexing Status ---
app.get('/indexing-status', authenticateToken, (req, res) => {
  const status = dualNodeIndexing.getUserStatus(req.user.id);
  const systemStats = dualNodeIndexing.getStats();
  const cacheStats = getCacheStats();
  
  res.json({
    ...status,
    system: {
      lastUpdate: systemStats.lastUpdate,
      lastChangeDetection: systemStats.lastChangeDetection,
      totalIndexedEntries: systemStats.primarySize,
      uptime: Math.floor(process.uptime()),
    },
    cache: {
      hits: cacheStats.hits || 0,
      misses: cacheStats.misses || 0,
      keys: cacheStats.keys || 0,
    }
  });
});

// --- System & Stats ---
app.post('/test-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token = req.query.token;
  }

  if (!token) {
    return res.json({ 
      error: 'No token provided',
      headers: req.headers
    });
  }

  try {
    const userData = jwt.verify(token, JWT_SECRET);
    return res.json({ 
      success: true,
      decoded: { id: userData.id, username: userData.username, role: userData.role },
      tokenLength: token.length
    });
  } catch (error) {
    return res.json({ 
      error: error.message,
      tokenPreview: token.substring(0, 50)
    });
  }
});

app.get('/stats', authenticateToken, (req, res) => {
  // Verificar que sea admin
  if (req.user.role !== 'admin' && req.user.role !== 'boss') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const stats = getCacheStats();
  const detailedStats = getDetailedCacheStats();
  const indexingStats = dualNodeIndexing.getStats();
  
  res.json({
    success: true,
    basicCache: stats,
    detailedCache: detailedStats,
    indexing: indexingStats,
    uptime: process.uptime(),
    memory: {
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`
    }
  });
});

app.post('/force-index-update', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'boss') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    await dualNodeIndexing.forceUpdate();
    res.json({
      success: true,
      message: 'Actualización de índices forzada'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error forzando actualización',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  const stats = getCacheStats();
  res.json({ 
    status: 'ok', 
    service: 'ai-service',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    cache: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%'
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(` AI Service running on port ${PORT}`);
  
  // Initialize Redis for Notifications
  await initRedis();
  
  // 1. Initial Sync & Analysis: Ejecutar al arranque
  setTimeout(async () => {
    try {
        await syncDatabaseWithDisk();
        await dualNodeIndexing.forceUpdate();
    } catch (err) {
      console.error(' Error en inicio post-arranque:', err);
    }
  }, 3000); 

  // 2. Scheduled Sync: Ejecutar sincronización de disco cada 30 segundos
  // Esto detecta archivos que se hayan subido por FTP o copiado manualmente
  setInterval(async () => {
      try {
          // Sync disco -> DB
          await syncDatabaseWithDisk();
          // El sistema incremental detectará los nuevos registros en DB automáticamente en su ciclo de 30s
      } catch (err) {
          console.error(' Error en sincronización programada:', err);
      }
  }, 30 * 1000); // 30 segundos
});

module.exports = app;

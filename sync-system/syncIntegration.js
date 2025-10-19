const SyncService = require('./sync-system/services/SyncService');

// Configuración del servicio de sincronización
const syncServiceConfig = {
  port: process.env.SYNC_PORT || 5001,
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/nube_distribuible',
  engine: {
    maxConcurrentSyncs: 5,
    syncInterval: 30000, // 30 segundos
    retryAttempts: 3,
    batchSize: 10
  }
};

// Instancia global del servicio de sincronización
let syncService = null;

/**
 * Inicializa el servicio de sincronización
 */
async function initializeSyncService() {
  try {
    if (syncService) {
      console.log('Sync service already initialized');
      return syncService;
    }

    console.log('Initializing Sync Service...');
    syncService = new SyncService(syncServiceConfig);
    
    // Inicializar y arrancar el servicio
    await syncService.start();
    
    // Programar limpieza de datos antiguos (cada 24 horas)
    setInterval(async () => {
      await syncService.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
    
    console.log('Sync Service initialized and running');
    return syncService;
    
  } catch (error) {
    console.error('Failed to initialize Sync Service:', error);
    throw error;
  }
}

/**
 * Obtiene la instancia del servicio de sincronización
 */
function getSyncService() {
  return syncService;
}

/**
 * Detiene el servicio de sincronización
 */
async function stopSyncService() {
  if (syncService) {
    await syncService.stop();
    syncService = null;
    console.log('Sync Service stopped');
  }
}

/**
 * Middleware para verificar el estado del servicio de sincronización
 */
function syncServiceMiddleware(req, res, next) {
  if (!syncService || !syncService.isInitialized) {
    return res.status(503).json({
      error: 'Sync service not available',
      message: 'El servicio de sincronización no está disponible'
    });
  }
  
  req.syncService = syncService;
  next();
}

/**
 * Rutas de integración con el sistema principal
 */
function setupSyncIntegrationRoutes(app) {
  // Ruta para obtener el estado del servicio de sincronización
  app.get('/api/sync/service-status', (req, res) => {
    const isRunning = syncService && syncService.isInitialized;
    res.json({
      isRunning,
      port: syncServiceConfig.port,
      metrics: isRunning ? syncService.getMetrics() : null
    });
  });

  // Ruta para inicializar sincronización para un usuario
  app.post('/api/sync/initialize/:userId', syncServiceMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const { syncPaths, preferences } = req.body;
      
      // Crear o actualizar configuración de usuario
      const UserSyncConfig = require('./sync-system/models/UserSyncConfig');
      
      const config = await UserSyncConfig.findOneAndUpdate(
        { userId },
        {
          $set: {
            isActive: true,
            syncPaths: syncPaths || [],
            preferences: { ...preferences },
            'deviceInfo.lastSeen': new Date(),
            'deviceInfo.isOnline': true
          }
        },
        { upsert: true, new: true }
      );
      
      // Inicializar aprendizaje de IA
      await syncService.restartUserAILearning(userId);
      
      res.json({
        success: true,
        config,
        message: 'Sincronización inicializada correctamente'
      });
      
    } catch (error) {
      console.error('Error initializing user sync:', error);
      res.status(500).json({
        error: error.message,
        message: 'Error al inicializar la sincronización'
      });
    }
  });

  // Ruta para obtener configuración de usuario
  app.get('/api/sync/user-config/:userId', syncServiceMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const UserSyncConfig = require('./sync-system/models/UserSyncConfig');
      
      let config = await UserSyncConfig.findOne({ userId });
      
      if (!config) {
        config = new UserSyncConfig({
          userId,
          isActive: false
        });
        await config.save();
      }
      
      res.json(config);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta para obtener estadísticas de sincronización
  app.get('/api/sync/stats/:userId', syncServiceMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const SyncFile = require('./sync-system/models/SyncFile');
      const SyncQueue = require('./sync-system/models/SyncQueue');
      
      const [
        totalFiles,
        syncedFiles,
        pendingFiles,
        conflictFiles,
        queueItems
      ] = await Promise.all([
        SyncFile.countDocuments({ userId }),
        SyncFile.countDocuments({ userId, syncStatus: 'synced' }),
        SyncFile.countDocuments({ userId, syncStatus: 'pending' }),
        SyncFile.countDocuments({ userId, 'conflicts.0': { $exists: true } }),
        SyncQueue.countDocuments({ userId, status: { $in: ['pending', 'processing'] } })
      ]);
      
      const aiStats = syncService.syncAI.getAIStats(userId);
      
      res.json({
        files: {
          total: totalFiles,
          synced: syncedFiles,
          pending: pendingFiles,
          conflicts: conflictFiles
        },
        queue: {
          pending: queueItems
        },
        ai: aiStats,
        lastUpdate: new Date()
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta para activar/desactivar sincronización
  app.post('/api/sync/toggle/:userId', syncServiceMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      const UserSyncConfig = require('./sync-system/models/UserSyncConfig');
      
      const config = await UserSyncConfig.findOneAndUpdate(
        { userId },
        { $set: { isActive } },
        { new: true }
      );
      
      res.json({
        success: true,
        isActive: config.isActive,
        message: isActive ? 'Sincronización activada' : 'Sincronización desactivada'
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  initializeSyncService,
  getSyncService,
  stopSyncService,
  syncServiceMiddleware,
  setupSyncIntegrationRoutes
};
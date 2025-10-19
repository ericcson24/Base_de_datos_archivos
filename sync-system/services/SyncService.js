const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const SyncEngine = require('../core/SyncEngine');
const SyncAI = require('../ai/SyncAI');
const UserSyncConfig = require('../models/UserSyncConfig');

class SyncService {
  constructor(options = {}) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.syncEngine = new SyncEngine(this.io, options.engine);
    this.syncAI = new SyncAI();
    
    this.options = {
      port: options.port || 5001,
      mongoUrl: options.mongoUrl || process.env.MONGODB_URL || 'mongodb://localhost:27017/nube_distribuible',
      ...options
    };
    
    this.isInitialized = false;
  }

  /**
   * Inicializa el servicio de sincronización
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Sync service already initialized');
      return;
    }

    console.log('Initializing Sync Service...');
    
    try {
      // Conectar a MongoDB
      await this.connectToDatabase();
      
      // Configurar middleware
      this.setupMiddleware();
      
      // Configurar rutas API
      this.setupRoutes();
      
      // Configurar eventos de Socket.IO personalizados
      this.setupSocketEvents();
      
      // Inicializar motor de sincronización
      await this.syncEngine.start();
      
      this.isInitialized = true;
      console.log('Sync Service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Sync Service:', error);
      throw error;
    }
  }

  /**
   * Conecta a la base de datos MongoDB
   */
  async connectToDatabase() {
    try {
      await mongoose.connect(this.options.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB for Sync Service');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Configura middleware de Express
   */
  setupMiddleware() {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', true);
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * Configura las rutas de la API
   */
  setupRoutes() {
    const apiRouter = express.Router();

    // Ruta de estado del servicio
    apiRouter.get('/status', (req, res) => {
      res.json({
        status: 'running',
        uptime: process.uptime(),
        stats: this.syncEngine.getStats(),
        timestamp: new Date().toISOString()
      });
    });

    // Configuración de usuario
    apiRouter.get('/config/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        let config = await UserSyncConfig.findOne({ userId });
        
        if (!config) {
          config = new UserSyncConfig({ userId });
          await config.save();
        }
        
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    apiRouter.put('/config/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const updates = req.body;
        
        const config = await UserSyncConfig.findOneAndUpdate(
          { userId },
          { $set: updates },
          { new: true, upsert: true }
        );
        
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Estadísticas de IA
    apiRouter.get('/ai/stats/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const stats = this.syncAI.getAIStats(userId);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Forzar aprendizaje de IA
    apiRouter.post('/ai/learn/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const patterns = await this.syncAI.learnUserPatterns(userId);
        res.json({ success: true, patterns });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Obtener cola de sincronización
    apiRouter.get('/queue/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { status, limit = 50 } = req.query;
        
        const query = { userId };
        if (status) query.status = status;
        
        const SyncQueue = require('../models/SyncQueue');
        const queueItems = await SyncQueue.find(query)
          .sort({ priority: -1, scheduledFor: 1 })
          .limit(parseInt(limit));
        
        res.json(queueItems);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Archivos de sincronización
    apiRouter.get('/files/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { status, limit = 100 } = req.query;
        
        const query = { userId };
        if (status) query.syncStatus = status;
        
        const SyncFile = require('../models/SyncFile');
        const files = await SyncFile.find(query)
          .sort({ lastModified: -1 })
          .limit(parseInt(limit));
        
        res.json(files);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Montar router
    this.app.use('/api/sync', apiRouter);

    // Ruta de salud
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'sync-service',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Configura eventos adicionales de Socket.IO
   */
  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      
      // Evento para obtener sugerencia de IA
      socket.on('ai_suggest_resolution', async (data) => {
        try {
          const { userId, conflict } = data;
          const suggestion = await this.syncAI.suggestConflictResolution(userId, conflict);
          socket.emit('ai_suggestion', { conflictId: conflict.conflictId, suggestion });
        } catch (error) {
          socket.emit('ai_error', { message: error.message });
        }
      });

      // Evento para actualizar configuración
      socket.on('update_config', async (data) => {
        try {
          const userId = socket.userId;
          if (!userId) return;
          
          await UserSyncConfig.findOneAndUpdate(
            { userId },
            { $set: data },
            { upsert: true }
          );
          
          socket.emit('config_updated', { success: true });
        } catch (error) {
          socket.emit('config_error', { message: error.message });
        }
      });

      // Evento para obtener estadísticas en tiempo real
      socket.on('request_stats', () => {
        const stats = this.syncEngine.getStats();
        socket.emit('stats_update', stats);
      });

      // Evento para pausar/reanudar sincronización global
      socket.on('admin_pause_all', () => {
        // Solo permitir a administradores
        if (socket.isAdmin) {
          this.pauseAllSync();
          this.io.emit('sync_paused_globally');
        }
      });

      socket.on('admin_resume_all', () => {
        if (socket.isAdmin) {
          this.resumeAllSync();
          this.io.emit('sync_resumed_globally');
        }
      });
    });
  }

  /**
   * Inicia el servidor
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.server.listen(this.options.port, () => {
        console.log(`Sync Service running on port ${this.options.port}`);
        resolve();
      });
    });
  }

  /**
   * Detiene el servidor
   */
  async stop() {
    console.log('Stopping Sync Service...');
    
    if (this.syncEngine) {
      await this.syncEngine.stop();
    }
    
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Sync Service stopped');
        resolve();
      });
    });
  }

  /**
   * Pausa la sincronización para todos los usuarios
   */
  pauseAllSync() {
    // Implementar pausa global
    console.log('Pausing sync for all users');
    // TODO: Implementar lógica de pausa global
  }

  /**
   * Reanuda la sincronización para todos los usuarios
   */
  resumeAllSync() {
    // Implementar reanudación global
    console.log('Resuming sync for all users');
    // TODO: Implementar lógica de reanudación global
  }

  /**
   * Obtiene métricas del servicio
   */
  getMetrics() {
    return {
      engine: this.syncEngine.getStats(),
      connections: this.io.engine.clientsCount,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  }

  /**
   * Reinicia el aprendizaje de IA para un usuario
   */
  async restartUserAILearning(userId) {
    try {
      await this.syncAI.initializeUserLearning(userId);
      console.log(`AI learning restarted for user: ${userId}`);
    } catch (error) {
      console.error(`Error restarting AI learning for user ${userId}:`, error);
    }
  }

  /**
   * Limpia datos antiguos
   */
  async cleanupOldData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 días atrás
      
      // Limpiar archivos de cola completados antiguos
      const SyncQueue = require('../models/SyncQueue');
      await SyncQueue.deleteMany({
        status: 'completed',
        completedAt: { $lt: cutoffDate }
      });
      
      // Limpiar versiones antigas de archivos
      const SyncFile = require('../models/SyncFile');
      await SyncFile.updateMany(
        {},
        {
          $pull: {
            versions: {
              timestamp: { $lt: cutoffDate }
            }
          }
        }
      );
      
      console.log('Old data cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = SyncService;
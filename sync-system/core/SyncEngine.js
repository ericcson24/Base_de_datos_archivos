const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const FileWatcher = require('./FileWatcher');
const SyncUtils = require('../utils/SyncUtils');
const SyncFile = require('../models/SyncFile');
const SyncQueue = require('../models/SyncQueue');
const UserSyncConfig = require('../models/UserSyncConfig');

class SyncEngine extends EventEmitter {
  constructor(io, options = {}) {
    super();
    
    this.io = io; // Socket.IO instance
    this.fileWatchers = new Map(); // userId -> FileWatcher
    this.activeSessions = new Map(); // userId -> socket connection
    this.syncQueues = new Map(); // userId -> processing queue
    
    this.options = {
      maxConcurrentSyncs: options.maxConcurrentSyncs || 5,
      syncInterval: options.syncInterval || 30000, // 30 segundos
      retryAttempts: options.retryAttempts || 3,
      batchSize: options.batchSize || 10,
      ...options
    };
    
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      activeUsers: 0,
      startTime: new Date()
    };
    
    this.isRunning = false;
    this.processingTimer = null;
  }

  /**
   * Inicia el motor de sincronización
   */
  async start() {
    if (this.isRunning) {
      console.log('Sync engine is already running');
      return;
    }

    console.log('Starting Sync Engine');
    
    // Configurar Socket.IO events
    this.setupSocketEvents();
    
    // Iniciar procesamiento periódico de cola
    this.startQueueProcessing();
    
    this.isRunning = true;
    this.emit('engineStarted');
  }

  /**
   * Detiene el motor de sincronización
   */
  async stop() {
    if (!this.isRunning) return;

    console.log('Stopping Sync Engine');
    
    // Detener timers
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    // Detener todos los watchers
    for (const [userId, watcher] of this.fileWatchers) {
      await watcher.stopWatching();
    }
    
    this.fileWatchers.clear();
    this.activeSessions.clear();
    this.syncQueues.clear();
    
    this.isRunning = false;
    this.emit('engineStopped');
  }

  /**
   * Configura eventos de Socket.IO
   */
  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      socket.on('user_authenticated', async (data) => {
        await this.handleUserAuthentication(socket, data);
      });
      
      socket.on('sync_request', async (data) => {
        await this.handleSyncRequest(socket, data);
      });
      
      socket.on('resolve_conflict', async (data) => {
        await this.handleConflictResolution(socket, data);
      });
      
      socket.on('pause_sync', async (data) => {
        await this.pauseUserSync(data.userId);
      });
      
      socket.on('resume_sync', async (data) => {
        await this.resumeUserSync(data.userId);
      });
      
      socket.on('disconnect', () => {
        this.handleUserDisconnection(socket);
      });
    });
  }

  /**
   * Maneja la autenticación del usuario
   */
  async handleUserAuthentication(socket, data) {
    try {
      const { userId, deviceId } = data;
      
      // Registrar sesión activa
      this.activeSessions.set(userId, socket);
      socket.userId = userId;
      socket.deviceId = deviceId;
      
      // Obtener configuración del usuario
      let userConfig = await UserSyncConfig.findOne({ userId });
      
      if (!userConfig) {
        // Crear configuración por defecto
        userConfig = new UserSyncConfig({
          userId,
          deviceInfo: {
            deviceId,
            lastSeen: new Date(),
            isOnline: true
          }
        });
        await userConfig.save();
      } else {
        // Actualizar información del dispositivo
        userConfig.deviceInfo.lastSeen = new Date();
        userConfig.deviceInfo.isOnline = true;
        userConfig.deviceInfo.deviceId = deviceId;
        await userConfig.save();
      }
      
      // Inicializar watcher si está configurado
      if (userConfig.isActive && userConfig.syncPaths.length > 0) {
        await this.initializeUserWatcher(userId, userConfig);
      }
      
      // Enviar configuración inicial
      socket.emit('sync_initialized', {
        config: userConfig,
        status: 'ready'
      });
      
      this.stats.activeUsers++;
      console.log(`User authenticated: ${userId}`);
      
    } catch (error) {
      console.error('Error in user authentication:', error);
      socket.emit('sync_error', { message: 'Authentication failed' });
    }
  }

  /**
   * Inicializa el watcher para un usuario
   */
  async initializeUserWatcher(userId, userConfig) {
    // Detener watcher existente si existe
    if (this.fileWatchers.has(userId)) {
      await this.fileWatchers.get(userId).stopWatching();
    }

    const watcher = new FileWatcher(userConfig.syncPaths, {
      debounceDelay: userConfig.preferences.syncInterval
    });
    
    // Configurar eventos del watcher
    watcher.on('fileChange', async (eventData) => {
      await this.handleFileChange(userId, eventData);
    });
    
    watcher.on('watcherError', (error) => {
      console.error(`Watcher error for user ${userId}:`, error);
      this.notifyUser(userId, 'watcher_error', error);
    });
    
    await watcher.startWatching();
    this.fileWatchers.set(userId, watcher);
    
    console.log(`Initialized file watcher for user: ${userId}`);
  }

  /**
   * Maneja cambios en archivos
   */
  async handleFileChange(userId, eventData) {
    try {
      console.log(`File change detected for user ${userId}:`, eventData);
      
      // Crear o actualizar registro de archivo
      let syncFile = await SyncFile.findOne({
        userId,
        filePath: eventData.path
      });
      
      if (!syncFile) {
        syncFile = new SyncFile({
          userId,
          filePath: eventData.path,
          fileName: path.basename(eventData.path),
          isDirectory: eventData.type === 'addDir'
        });
      }
      
      // Actualizar información del archivo
      if (eventData.fileInfo) {
        syncFile.fileSize = eventData.fileInfo.size;
        syncFile.contentHash = eventData.fileInfo.hash;
        syncFile.lastModified = eventData.fileInfo.lastModified;
      }
      
      syncFile.syncStatus = 'pending';
      await syncFile.save();
      
      // Añadir a cola de sincronización
      await this.addToSyncQueue(userId, {
        operation: this.mapEventToOperation(eventData.type),
        filePath: eventData.path,
        fileData: eventData
      });
      
      // Notificar al cliente
      this.notifyUser(userId, 'file_detected', {
        file: syncFile,
        event: eventData
      });
      
    } catch (error) {
      console.error('Error handling file change:', error);
    }
  }

  /**
   * Mapea eventos de archivo a operaciones de sincronización
   */
  mapEventToOperation(eventType) {
    const operationMap = {
      'add': 'create',
      'change': 'update',
      'unlink': 'delete',
      'addDir': 'create',
      'unlinkDir': 'delete'
    };
    
    return operationMap[eventType] || 'update';
  }

  /**
   * Añade una operación a la cola de sincronización
   */
  async addToSyncQueue(userId, operationData) {
    const queueItem = new SyncQueue({
      queueId: SyncUtils.generateOperationId(),
      userId,
      operation: operationData.operation,
      filePath: operationData.filePath,
      targetPath: operationData.targetPath,
      data: operationData,
      priority: this.calculatePriority(operationData),
      metadata: {
        fileSize: operationData.fileData?.fileInfo?.size,
        contentHash: operationData.fileData?.fileInfo?.hash,
        originalTimestamp: new Date(),
        deviceId: this.getDeviceId(userId)
      }
    });
    
    await queueItem.save();
    console.log(`Added to sync queue: ${queueItem.queueId}`);
    
    return queueItem;
  }

  /**
   * Calcula la prioridad de una operación
   */
  calculatePriority(operationData) {
    let priority = 5; // Prioridad base
    
    // Operaciones de eliminación tienen mayor prioridad
    if (operationData.operation === 'delete') {
      priority = 8;
    }
    
    // Archivos pequeños tienen mayor prioridad
    if (operationData.fileData?.fileInfo?.size < 1024 * 1024) { // < 1MB
      priority += 2;
    }
    
    return Math.min(priority, 10);
  }

  /**
   * Obtiene el device ID de un usuario
   */
  getDeviceId(userId) {
    const socket = this.activeSessions.get(userId);
    return socket?.deviceId || 'unknown';
  }

  /**
   * Inicia el procesamiento periódico de la cola
   */
  startQueueProcessing() {
    this.processingTimer = setInterval(async () => {
      await this.processAllQueues();
    }, this.options.syncInterval);
    
    console.log('Queue processing started');
  }

  /**
   * Procesa todas las colas de sincronización
   */
  async processAllQueues() {
    if (!this.isRunning) return;
    
    try {
      // Obtener elementos pendientes de todas las colas
      const pendingItems = await SyncQueue.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() }
      })
      .sort({ priority: -1, scheduledFor: 1 })
      .limit(this.options.batchSize);
      
      if (pendingItems.length === 0) return;
      
      console.log(`Processing ${pendingItems.length} queue items`);
      
      // Procesar en paralelo con límite de concurrencia
      const batches = this.chunkArray(pendingItems, this.options.maxConcurrentSyncs);
      
      for (const batch of batches) {
        await Promise.all(batch.map(item => this.processQueueItem(item)));
      }
      
    } catch (error) {
      console.error('Error processing queues:', error);
    }
  }

  /**
   * Procesa un elemento individual de la cola
   */
  async processQueueItem(queueItem) {
    try {
      console.log(`Processing queue item: ${queueItem.queueId}`);
      
      // Marcar como en procesamiento
      queueItem.status = 'processing';
      await queueItem.save();
      
      // Notificar al usuario
      this.notifyUser(queueItem.userId, 'sync_progress', {
        queueId: queueItem.queueId,
        status: 'processing'
      });
      
      const startTime = Date.now();
      
      // Ejecutar la operación según el tipo
      let result;
      switch (queueItem.operation) {
        case 'create':
          result = await this.syncCreateFile(queueItem);
          break;
        case 'update':
          result = await this.syncUpdateFile(queueItem);
          break;
        case 'delete':
          result = await this.syncDeleteFile(queueItem);
          break;
        case 'move':
          result = await this.syncMoveFile(queueItem);
          break;
        default:
          throw new Error(`Unknown operation: ${queueItem.operation}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Marcar como completado
      await queueItem.markCompleted(result);
      
      // Actualizar estadísticas
      this.stats.totalSyncs++;
      this.stats.successfulSyncs++;
      
      // Notificar éxito
      this.notifyUser(queueItem.userId, 'sync_completed', {
        queueId: queueItem.queueId,
        duration,
        result
      });
      
      console.log(`Queue item completed: ${queueItem.queueId} (${duration}ms)`);
      
    } catch (error) {
      console.error(`Error processing queue item ${queueItem.queueId}:`, error);
      
      // Marcar como fallido
      await queueItem.markFailed(error);
      
      // Actualizar estadísticas
      this.stats.totalSyncs++;
      this.stats.failedSyncs++;
      
      // Notificar error
      this.notifyUser(queueItem.userId, 'sync_failed', {
        queueId: queueItem.queueId,
        error: error.message
      });
    }
  }

  /**
   * Sincroniza la creación de un archivo
   */
  async syncCreateFile(queueItem) {
    // Implementar lógica de sincronización de creación
    const filePath = queueItem.filePath;
    
    // Leer el archivo
    const content = await fs.readFile(filePath);
    const hash = SyncUtils.generateContentHash(content);
    
    // Actualizar registro en base de datos
    await SyncFile.findOneAndUpdate(
      { userId: queueItem.userId, filePath },
      {
        contentHash: hash,
        syncStatus: 'synced',
        lastModified: new Date()
      },
      { upsert: true }
    );
    
    return { hash, size: content.length };
  }

  /**
   * Sincroniza la actualización de un archivo
   */
  async syncUpdateFile(queueItem) {
    // Similar a syncCreateFile pero con detección de conflictos
    return await this.syncCreateFile(queueItem);
  }

  /**
   * Sincroniza la eliminación de un archivo
   */
  async syncDeleteFile(queueItem) {
    const filePath = queueItem.filePath;
    
    // Actualizar registro en base de datos
    await SyncFile.findOneAndUpdate(
      { userId: queueItem.userId, filePath },
      { syncStatus: 'synced' }
    );
    
    return { deleted: true };
  }

  /**
   * Sincroniza el movimiento de un archivo
   */
  async syncMoveFile(queueItem) {
    const { filePath, targetPath } = queueItem;
    
    // Actualizar registro en base de datos
    await SyncFile.findOneAndUpdate(
      { userId: queueItem.userId, filePath },
      { 
        filePath: targetPath,
        fileName: path.basename(targetPath),
        syncStatus: 'synced'
      }
    );
    
    return { moved: true, newPath: targetPath };
  }

  /**
   * Divide un array en chunks
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Notifica a un usuario específico
   */
  notifyUser(userId, event, data) {
    const socket = this.activeSessions.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Maneja la solicitud de sincronización manual
   */
  async handleSyncRequest(socket, data) {
    try {
      const userId = socket.userId;
      const { filePath, operation } = data;
      
      await this.addToSyncQueue(userId, {
        operation,
        filePath,
        fileData: data
      });
      
      socket.emit('sync_queued', { filePath, operation });
      
    } catch (error) {
      socket.emit('sync_error', { message: error.message });
    }
  }

  /**
   * Maneja la resolución de conflictos
   */
  async handleConflictResolution(socket, data) {
    try {
      const { conflictId, resolution } = data;
      
      // Buscar el archivo con el conflicto
      const syncFile = await SyncFile.findOne({
        'conflicts.conflictId': conflictId
      });
      
      if (syncFile) {
        await syncFile.resolveConflict(conflictId, resolution);
        socket.emit('conflict_resolved', { conflictId, resolution });
      }
      
    } catch (error) {
      socket.emit('sync_error', { message: error.message });
    }
  }

  /**
   * Pausa la sincronización para un usuario
   */
  async pauseUserSync(userId) {
    const watcher = this.fileWatchers.get(userId);
    if (watcher) {
      watcher.pause();
    }
    
    this.notifyUser(userId, 'sync_paused', { userId });
  }

  /**
   * Reanuda la sincronización para un usuario
   */
  async resumeUserSync(userId) {
    const watcher = this.fileWatchers.get(userId);
    if (watcher) {
      watcher.resume();
    }
    
    this.notifyUser(userId, 'sync_resumed', { userId });
  }

  /**
   * Maneja la desconexión del usuario
   */
  handleUserDisconnection(socket) {
    if (socket.userId) {
      console.log(`User disconnected: ${socket.userId}`);
      this.activeSessions.delete(socket.userId);
      this.stats.activeUsers--;
    }
  }

  /**
   * Obtiene estadísticas del motor
   */
  getStats() {
    return {
      ...this.stats,
      activeUsers: this.activeSessions.size,
      activeWatchers: this.fileWatchers.size,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }
}

module.exports = SyncEngine;
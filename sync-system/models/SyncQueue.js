const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema({
  queueId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  operation: {
    type: String,
    enum: ['create', 'update', 'delete', 'move', 'copy'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  targetPath: String, // Para operaciones de move/copy
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    fileSize: Number,
    contentHash: String,
    originalTimestamp: Date,
    deviceId: String,
    isOfflineOperation: { type: Boolean, default: false }
  },
  error: {
    message: String,
    code: String,
    timestamp: Date,
    stack: String
  },
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date,
  estimatedDuration: Number, // En milisegundos
  aiMetrics: {
    predictedSuccess: Number, // 0-1 probabilidad de éxito
    optimalTime: Date, // Mejor momento para procesar según IA
    networkCondition: String, // 'poor', 'good', 'excellent'
    userActivity: String // 'active', 'idle', 'away'
  }
}, {
  timestamps: true,
  collection: 'sync_queue'
});

// Índices para optimización
syncQueueSchema.index({ userId: 1, status: 1, priority: -1 });
syncQueueSchema.index({ scheduledFor: 1, status: 1 });
syncQueueSchema.index({ 'aiMetrics.optimalTime': 1 });

// Método para marcar como completado
syncQueueSchema.methods.markCompleted = function(result = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.data.result = result;
  return this.save();
};

// Método para marcar como fallido
syncQueueSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    code: error.code || 'UNKNOWN',
    timestamp: new Date(),
    stack: error.stack
  };
  this.attempts += 1;
  
  // Reintento automático si no se han agotado los intentos
  if (this.attempts < this.maxAttempts) {
    this.status = 'pending';
    // Incrementar tiempo de espera exponencialmente
    this.scheduledFor = new Date(Date.now() + Math.pow(2, this.attempts) * 1000);
  }
  
  return this.save();
};

// Método para reprogramar
syncQueueSchema.methods.reschedule = function(newTime) {
  this.scheduledFor = newTime;
  this.status = 'pending';
  return this.save();
};

module.exports = mongoose.model('SyncQueue', syncQueueSchema);
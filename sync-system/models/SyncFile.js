const mongoose = require('mongoose');

const syncFileSchema = new mongoose.Schema({
  filePath: {
    type: String,
    required: true,
    unique: true
  },
  fileName: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  contentHash: {
    type: String,
    required: true,
    index: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict', 'error', 'offline_queue'],
    default: 'pending',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  versions: [{
    version: Number,
    contentHash: String,
    timestamp: Date,
    userId: String,
    changes: String,
    size: Number
  }],
  conflicts: [{
    conflictId: String,
    timestamp: Date,
    localVersion: {
      contentHash: String,
      userId: String,
      timestamp: Date
    },
    remoteVersion: {
      contentHash: String,
      userId: String,
      timestamp: Date
    },
    resolution: {
      type: String,
      enum: ['manual', 'auto_local', 'auto_remote', 'merge', 'pending'],
      default: 'pending'
    },
    aiSuggestion: String
  }],
  syncMetadata: {
    lastSyncAttempt: Date,
    syncAttempts: { type: Number, default: 0 },
    priority: { type: Number, default: 1 }, // IA learning: 1-10
    userAccess: { type: Number, default: 0 }, // IA learning: frequency
    averageSyncTime: { type: Number, default: 0 }
  },
  isDirectory: {
    type: Boolean,
    default: false
  },
  parentPath: String,
  tags: [String],
  encryption: {
    isEncrypted: { type: Boolean, default: false },
    algorithm: String,
    keyId: String
  }
}, {
  timestamps: true,
  collection: 'sync_files'
});

// Índices compuestos para optimización
syncFileSchema.index({ userId: 1, syncStatus: 1 });
syncFileSchema.index({ lastModified: -1 });
syncFileSchema.index({ 'syncMetadata.priority': -1 });
syncFileSchema.index({ 'syncMetadata.userAccess': -1 });

// Middleware para actualizar el hash de contenido
syncFileSchema.pre('save', function(next) {
  if (this.isModified('lastModified')) {
    this.syncStatus = 'pending';
  }
  next();
});

// Método para agregar una nueva versión
syncFileSchema.methods.addVersion = function(contentHash, userId, changes, size) {
  this.versions.push({
    version: this.version + 1,
    contentHash,
    timestamp: new Date(),
    userId,
    changes,
    size
  });
  
  this.version += 1;
  this.contentHash = contentHash;
  
  // Mantener solo las últimas 10 versiones
  if (this.versions.length > 10) {
    this.versions = this.versions.slice(-10);
  }
  
  return this.save();
};

// Método para resolver conflictos
syncFileSchema.methods.resolveConflict = function(conflictId, resolution) {
  const conflict = this.conflicts.find(c => c.conflictId === conflictId);
  if (conflict) {
    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();
    
    if (resolution !== 'pending') {
      this.syncStatus = 'synced';
    }
  }
  return this.save();
};

module.exports = mongoose.model('SyncFile', syncFileSchema);
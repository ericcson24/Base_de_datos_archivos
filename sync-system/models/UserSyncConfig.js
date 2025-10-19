const mongoose = require('mongoose');

const userSyncConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  syncPaths: [{
    path: String,
    isEnabled: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    excludePatterns: [String], // *.tmp, *.log, etc.
    includePatterns: [String],
    maxFileSize: { type: Number, default: 100 * 1024 * 1024 }, // 100MB
    autoSync: { type: Boolean, default: true }
  }],
  preferences: {
    autoResolveConflicts: { type: Boolean, default: false },
    conflictResolution: {
      type: String,
      enum: ['ask', 'local_wins', 'remote_wins', 'newest_wins', 'ai_suggest'],
      default: 'ask'
    },
    compressionLevel: { type: Number, default: 6, min: 0, max: 9 },
    encryptionEnabled: { type: Boolean, default: true },
    syncInterval: { type: Number, default: 30000 }, // 30 segundos
    maxConcurrentUploads: { type: Number, default: 3 },
    bandwidthLimit: { type: Number, default: 0 }, // 0 = sin límite, en bytes/s
    syncOnlyOnWifi: { type: Boolean, default: false },
    pauseDuringCalls: { type: Boolean, default: true }
  },
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    platform: String,
    lastSeen: Date,
    isOnline: { type: Boolean, default: false },
    networkType: String, // 'wifi', 'cellular', 'ethernet'
    availableSpace: Number,
    totalSpace: Number
  },
  aiProfile: {
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      timezone: { type: String, default: 'UTC' }
    },
    mostUsedFolders: [{
      path: String,
      accessCount: { type: Number, default: 0 },
      lastAccess: Date,
      avgFileSize: Number
    }],
    behaviorPatterns: {
      peakUsageHours: [Number], // 0-23
      preferredSyncTimes: [Date],
      conflictResolutionHistory: [{
        conflictType: String,
        resolution: String,
        timestamp: Date
      }],
      networkUsagePattern: {
        lowUsage: [Number], // Horas de bajo uso
        highUsage: [Number], // Horas de alto uso
        avgSpeed: Number
      }
    },
    learningData: {
      totalSyncOperations: { type: Number, default: 0 },
      successfulSyncs: { type: Number, default: 0 },
      failedSyncs: { type: Number, default: 0 },
      avgSyncDuration: { type: Number, default: 0 },
      lastLearningUpdate: Date
    }
  },
  security: {
    encryptionKey: String,
    lastKeyRotation: Date,
    allowedDevices: [String],
    sessionTimeout: { type: Number, default: 24 * 60 * 60 * 1000 }, // 24 horas
    requireMFA: { type: Boolean, default: false }
  },
  quotas: {
    maxFiles: { type: Number, default: 10000 },
    maxStorage: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB
    usedStorage: { type: Number, default: 0 },
    usedFiles: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'user_sync_configs'
});

// Métodos para actualizar patrones de IA
userSyncConfigSchema.methods.updateUsagePattern = function(folderPath) {
  const folder = this.aiProfile.mostUsedFolders.find(f => f.path === folderPath);
  
  if (folder) {
    folder.accessCount += 1;
    folder.lastAccess = new Date();
  } else {
    this.aiProfile.mostUsedFolders.push({
      path: folderPath,
      accessCount: 1,
      lastAccess: new Date()
    });
  }
  
  // Mantener solo los 20 folders más usados
  this.aiProfile.mostUsedFolders.sort((a, b) => b.accessCount - a.accessCount);
  this.aiProfile.mostUsedFolders = this.aiProfile.mostUsedFolders.slice(0, 20);
  
  return this.save();
};

userSyncConfigSchema.methods.addConflictResolution = function(conflictType, resolution) {
  this.aiProfile.behaviorPatterns.conflictResolutionHistory.push({
    conflictType,
    resolution,
    timestamp: new Date()
  });
  
  // Mantener solo los últimos 100 registros
  if (this.aiProfile.behaviorPatterns.conflictResolutionHistory.length > 100) {
    this.aiProfile.behaviorPatterns.conflictResolutionHistory = 
      this.aiProfile.behaviorPatterns.conflictResolutionHistory.slice(-100);
  }
  
  return this.save();
};

userSyncConfigSchema.methods.updateSyncStats = function(success, duration) {
  this.aiProfile.learningData.totalSyncOperations += 1;
  
  if (success) {
    this.aiProfile.learningData.successfulSyncs += 1;
  } else {
    this.aiProfile.learningData.failedSyncs += 1;
  }
  
  // Calcular nueva duración promedio
  const total = this.aiProfile.learningData.totalSyncOperations;
  const currentAvg = this.aiProfile.learningData.avgSyncDuration || 0;
  this.aiProfile.learningData.avgSyncDuration = 
    ((currentAvg * (total - 1)) + duration) / total;
  
  this.aiProfile.learningData.lastLearningUpdate = new Date();
  
  return this.save();
};

module.exports = mongoose.model('UserSyncConfig', userSyncConfigSchema);
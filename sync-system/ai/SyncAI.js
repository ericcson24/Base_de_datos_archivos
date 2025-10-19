const SyncFile = require('../models/SyncFile');
const UserSyncConfig = require('../models/UserSyncConfig');
const SyncUtils = require('../utils/SyncUtils');

class SyncAI {
  constructor() {
    this.patterns = new Map(); // userId -> patterns
    this.learningHistory = new Map(); // userId -> learning data
    this.networkConditions = new Map(); // userId -> network info
  }

  /**
   * Analiza y aprende de los patrones de uso del usuario
   */
  async learnUserPatterns(userId) {
    try {
      const userConfig = await UserSyncConfig.findOne({ userId });
      if (!userConfig) return;

      const files = await SyncFile.find({ userId }).sort({ lastModified: -1 }).limit(1000);
      
      const patterns = {
        workingHours: this.analyzeWorkingHours(files),
        fileTypePriorities: this.analyzeFileTypePriorities(files),
        folderUsage: this.analyzeFolderUsage(files),
        syncFrequency: this.analyzeSyncFrequency(files),
        conflictResolutionPreferences: this.analyzeConflictResolutions(files),
        networkUsagePattern: await this.analyzeNetworkPattern(userId),
        seasonalPatterns: this.analyzeSeasonalPatterns(files)
      };

      this.patterns.set(userId, patterns);
      
      // Actualizar el perfil de IA en la base de datos
      await this.updateUserAIProfile(userId, patterns);
      
      console.log(`AI patterns updated for user: ${userId}`);
      return patterns;
      
    } catch (error) {
      console.error('Error learning user patterns:', error);
      return null;
    }
  }

  /**
   * Analiza las horas de trabajo del usuario
   */
  analyzeWorkingHours(files) {
    const hourCounts = new Array(24).fill(0);
    const dayOfWeekCounts = new Array(7).fill(0);
    
    files.forEach(file => {
      if (file.lastModified) {
        const date = new Date(file.lastModified);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        hourCounts[hour]++;
        dayOfWeekCounts[dayOfWeek]++;
      }
    });

    // Encontrar horas pico
    const peakHours = [];
    const avgActivity = hourCounts.reduce((a, b) => a + b, 0) / 24;
    
    hourCounts.forEach((count, hour) => {
      if (count > avgActivity * 1.5) {
        peakHours.push(hour);
      }
    });

    // Encontrar días laborales
    const workingDays = [];
    const avgDayActivity = dayOfWeekCounts.reduce((a, b) => a + b, 0) / 7;
    
    dayOfWeekCounts.forEach((count, day) => {
      if (count > avgDayActivity * 0.8) {
        workingDays.push(day);
      }
    });

    return {
      peakHours,
      workingDays,
      totalActivity: files.length,
      hourlyDistribution: hourCounts,
      weeklyDistribution: dayOfWeekCounts
    };
  }

  /**
   * Analiza las prioridades de tipos de archivo
   */
  analyzeFileTypePriorities(files) {
    const typeCounts = {};
    const typeFrequency = {};
    const typeImportance = {};

    files.forEach(file => {
      const ext = file.fileName.split('.').pop()?.toLowerCase() || 'no-ext';
      
      typeCounts[ext] = (typeCounts[ext] || 0) + 1;
      
      // Calcular frecuencia basada en modificaciones recientes
      const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified <= 7) {
        typeFrequency[ext] = (typeFrequency[ext] || 0) + 1;
      }
    });

    // Calcular importancia basada en frecuencia y recencia
    Object.keys(typeCounts).forEach(ext => {
      const count = typeCounts[ext];
      const frequency = typeFrequency[ext] || 0;
      const importance = (count * 0.3) + (frequency * 0.7);
      typeImportance[ext] = Math.min(importance / 10, 1); // Normalizar a 0-1
    });

    return {
      counts: typeCounts,
      frequency: typeFrequency,
      importance: typeImportance,
      priorityList: Object.entries(typeImportance)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  /**
   * Analiza el uso de carpetas
   */
  analyzeFolderUsage(files) {
    const folderCounts = {};
    const folderSizes = {};
    const folderActivity = {};

    files.forEach(file => {
      const folder = file.filePath.substring(0, file.filePath.lastIndexOf('/'));
      
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
      folderSizes[folder] = (folderSizes[folder] || 0) + (file.fileSize || 0);
      
      // Actividad reciente
      const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified <= 7) {
        folderActivity[folder] = (folderActivity[folder] || 0) + 1;
      }
    });

    // Calcular prioridades de carpetas
    const folderPriorities = {};
    Object.keys(folderCounts).forEach(folder => {
      const count = folderCounts[folder];
      const activity = folderActivity[folder] || 0;
      const priority = Math.log(count + 1) + (activity * 2);
      folderPriorities[folder] = Math.min(priority / 5, 10); // Escala 1-10
    });

    return {
      counts: folderCounts,
      sizes: folderSizes,
      activity: folderActivity,
      priorities: folderPriorities,
      mostUsed: Object.entries(folderPriorities)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  /**
   * Analiza la frecuencia de sincronización
   */
  analyzeSyncFrequency(files) {
    const syncTimes = files
      .filter(f => f.lastModified)
      .map(f => f.lastModified.getTime())
      .sort((a, b) => a - b);

    if (syncTimes.length < 2) {
      return { avgInterval: 3600000, pattern: 'insufficient_data' }; // 1 hora por defecto
    }

    const intervals = [];
    for (let i = 1; i < syncTimes.length; i++) {
      intervals.push(syncTimes[i] - syncTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];

    // Detectar patrones
    let pattern = 'regular';
    if (avgInterval < 300000) { // < 5 minutos
      pattern = 'very_frequent';
    } else if (avgInterval < 1800000) { // < 30 minutos
      pattern = 'frequent';
    } else if (avgInterval < 7200000) { // < 2 horas
      pattern = 'regular';
    } else if (avgInterval < 86400000) { // < 1 día
      pattern = 'infrequent';
    } else {
      pattern = 'rare';
    }

    return {
      avgInterval,
      medianInterval,
      pattern,
      totalSyncs: syncTimes.length,
      variance: this.calculateVariance(intervals)
    };
  }

  /**
   * Analiza las preferencias de resolución de conflictos
   */
  analyzeConflictResolutions(files) {
    const resolutions = {};
    let totalConflicts = 0;

    files.forEach(file => {
      if (file.conflicts && file.conflicts.length > 0) {
        file.conflicts.forEach(conflict => {
          if (conflict.resolution && conflict.resolution !== 'pending') {
            resolutions[conflict.resolution] = (resolutions[conflict.resolution] || 0) + 1;
            totalConflicts++;
          }
        });
      }
    });

    // Calcular preferencias
    const preferences = {};
    Object.keys(resolutions).forEach(resolution => {
      preferences[resolution] = resolutions[resolution] / totalConflicts;
    });

    return {
      resolutions,
      preferences,
      totalConflicts,
      mostPreferred: Object.entries(preferences)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'manual'
    };
  }

  /**
   * Analiza patrones de red
   */
  async analyzeNetworkPattern(userId) {
    const networkData = this.networkConditions.get(userId) || {
      measurements: [],
      conditions: [],
      timeOfDay: {}
    };

    const now = new Date();
    const hour = now.getHours();
    
    // Simular medición de red (en implementación real se mediría)
    const simulatedSpeed = this.simulateNetworkSpeed(hour);
    
    networkData.measurements.push({
      timestamp: now,
      speed: simulatedSpeed,
      hour,
      dayOfWeek: now.getDay()
    });

    // Mantener solo las últimas 100 mediciones
    if (networkData.measurements.length > 100) {
      networkData.measurements = networkData.measurements.slice(-100);
    }

    // Analizar patrones por hora
    networkData.measurements.forEach(measurement => {
      const h = measurement.hour;
      if (!networkData.timeOfDay[h]) {
        networkData.timeOfDay[h] = { speeds: [], avg: 0 };
      }
      networkData.timeOfDay[h].speeds.push(measurement.speed);
    });

    // Calcular promedios por hora
    Object.keys(networkData.timeOfDay).forEach(hour => {
      const speeds = networkData.timeOfDay[hour].speeds;
      networkData.timeOfDay[hour].avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    });

    this.networkConditions.set(userId, networkData);
    return networkData;
  }

  /**
   * Simula velocidad de red (en implementación real se mediría realmente)
   */
  simulateNetworkSpeed(hour) {
    // Simular variaciones típicas de velocidad según la hora
    let baseSpeed = 100; // Mbps base
    
    // Horas pico (menor velocidad)
    if (hour >= 19 && hour <= 23) {
      baseSpeed *= 0.7;
    } else if (hour >= 8 && hour <= 18) {
      baseSpeed *= 0.85;
    }
    
    // Añadir variación aleatoria
    const variation = (Math.random() - 0.5) * 0.4; // ±20%
    return Math.max(baseSpeed * (1 + variation), 10);
  }

  /**
   * Analiza patrones estacionales/cíclicos
   */
  analyzeSeasonalPatterns(files) {
    const monthlyActivity = new Array(12).fill(0);
    const weeklyActivity = new Array(7).fill(0);
    
    files.forEach(file => {
      if (file.lastModified) {
        const date = new Date(file.lastModified);
        monthlyActivity[date.getMonth()]++;
        weeklyActivity[date.getDay()]++;
      }
    });

    return {
      monthlyActivity,
      weeklyActivity,
      peakMonth: monthlyActivity.indexOf(Math.max(...monthlyActivity)),
      peakDay: weeklyActivity.indexOf(Math.max(...weeklyActivity))
    };
  }

  /**
   * Predice el mejor momento para sincronizar
   */
  predictOptimalSyncTime(userId) {
    const patterns = this.patterns.get(userId);
    if (!patterns) {
      return new Date(Date.now() + 300000); // 5 minutos por defecto
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Verificar si estamos en horas de trabajo
    const isWorkingHour = patterns.workingHours.peakHours.includes(currentHour);
    const isWorkingDay = patterns.workingHours.workingDays.includes(currentDay);

    // Obtener condición de red actual
    const networkPattern = patterns.networkUsagePattern;
    const networkScore = networkPattern.timeOfDay[currentHour]?.avg || 50;

    let optimalTime = new Date();

    if (!isWorkingHour || !isWorkingDay || networkScore < 30) {
      // Buscar próxima ventana óptima
      const nextOptimalHour = this.findNextOptimalHour(patterns);
      optimalTime.setHours(nextOptimalHour, 0, 0, 0);
      
      if (optimalTime <= now) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
    } else {
      // Sincronizar ahora pero con pequeño retraso para batching
      optimalTime = new Date(now.getTime() + 30000); // 30 segundos
    }

    return optimalTime;
  }

  /**
   * Encuentra la próxima hora óptima para sincronización
   */
  findNextOptimalHour(patterns) {
    const peakHours = patterns.workingHours.peakHours;
    const networkPattern = patterns.networkUsagePattern;
    
    // Encontrar horas con buena red y alta actividad
    const candidates = peakHours.filter(hour => {
      const networkScore = networkPattern.timeOfDay[hour]?.avg || 0;
      return networkScore > 50; // Velocidad decente
    });

    if (candidates.length > 0) {
      return candidates[0];
    }

    // Fallback a la primera hora pico
    return peakHours[0] || 9;
  }

  /**
   * Sugiere resolución de conflictos usando IA
   */
  async suggestConflictResolution(userId, conflict) {
    const patterns = this.patterns.get(userId);
    if (!patterns) {
      return 'manual'; // Fallback
    }

    const preferences = patterns.conflictResolutionPreferences;
    const fileType = conflict.filePath.split('.').pop()?.toLowerCase();
    const timeDiff = Math.abs(
      conflict.localVersion.timestamp.getTime() - 
      conflict.remoteVersion.timestamp.getTime()
    );

    let suggestion = preferences.mostPreferred || 'manual';
    let confidence = 0.5;
    let reasoning = [];

    // Reglas basadas en el tipo de archivo
    if (['doc', 'docx', 'txt', 'md'].includes(fileType)) {
      if (timeDiff > 3600000) { // > 1 hora
        suggestion = 'newest_wins';
        confidence += 0.3;
        reasoning.push('Archivo de texto con diferencia temporal significativa');
      } else {
        suggestion = 'merge';
        confidence += 0.2;
        reasoning.push('Archivo de texto reciente, intentar fusión');
      }
    }

    // Reglas basadas en historial de usuario
    if (preferences.totalConflicts > 5) {
      const userPreference = preferences.mostPreferred;
      if (preferences.preferences[userPreference] > 0.7) {
        suggestion = userPreference;
        confidence += 0.4;
        reasoning.push(`Usuario prefiere ${userPreference} en el 70% de casos`);
      }
    }

    // Reglas basadas en tamaño de archivo
    const isLargeFile = conflict.localVersion.size > 10 * 1024 * 1024; // > 10MB
    if (isLargeFile) {
      suggestion = 'newest_wins';
      confidence += 0.2;
      reasoning.push('Archivo grande, priorizar versión más reciente');
    }

    return {
      suggestion,
      confidence: Math.min(confidence, 1),
      reasoning: reasoning.join('. '),
      alternatives: this.getAlternativeSuggestions(suggestion)
    };
  }

  /**
   * Obtiene sugerencias alternativas
   */
  getAlternativeSuggestions(primary) {
    const all = ['auto_local', 'auto_remote', 'newest_wins', 'merge', 'manual'];
    return all.filter(option => option !== primary).slice(0, 2);
  }

  /**
   * Calcula la prioridad de sincronización usando IA
   */
  calculateAIPriority(userId, fileInfo, operation) {
    const patterns = this.patterns.get(userId);
    if (!patterns) {
      return SyncUtils.calculateSyncPriority(fileInfo, {}, {});
    }

    let priority = 5; // Prioridad base

    // Factor de tipo de archivo
    const fileType = fileInfo.extension?.substring(1)?.toLowerCase();
    const typeImportance = patterns.fileTypePriorities.importance[fileType] || 0.5;
    priority += typeImportance * 3;

    // Factor de carpeta
    const folder = fileInfo.path?.substring(0, fileInfo.path.lastIndexOf('/'));
    const folderPriority = patterns.folderUsage.priorities[folder] || 1;
    priority += folderPriority * 0.5;

    // Factor de tiempo (horas pico)
    const currentHour = new Date().getHours();
    const isPeakHour = patterns.workingHours.peakHours.includes(currentHour);
    if (isPeakHour) {
      priority += 1;
    }

    // Factor de operación
    switch (operation) {
      case 'delete':
        priority += 2;
        break;
      case 'create':
        priority += 1;
        break;
      case 'update':
        priority += 0.5;
        break;
    }

    // Factor de red
    const networkCondition = this.getCurrentNetworkCondition(userId);
    if (networkCondition === 'excellent') {
      priority += 1;
    } else if (networkCondition === 'poor') {
      priority -= 1;
    }

    return Math.min(Math.max(Math.round(priority), 1), 10);
  }

  /**
   * Obtiene la condición actual de red
   */
  getCurrentNetworkCondition(userId) {
    const networkData = this.networkConditions.get(userId);
    if (!networkData || networkData.measurements.length === 0) {
      return 'good'; // Asunción por defecto
    }

    const recent = networkData.measurements.slice(-5); // Últimas 5 mediciones
    const avgSpeed = recent.reduce((sum, m) => sum + m.speed, 0) / recent.length;

    if (avgSpeed > 80) return 'excellent';
    if (avgSpeed > 30) return 'good';
    return 'poor';
  }

  /**
   * Actualiza el perfil de IA del usuario en la base de datos
   */
  async updateUserAIProfile(userId, patterns) {
    try {
      await UserSyncConfig.findOneAndUpdate(
        { userId },
        {
          $set: {
            'aiProfile.behaviorPatterns.peakUsageHours': patterns.workingHours.peakHours,
            'aiProfile.behaviorPatterns.networkUsagePattern.lowUsage': this.getHoursByCondition(patterns.networkUsagePattern, 'low'),
            'aiProfile.behaviorPatterns.networkUsagePattern.highUsage': this.getHoursByCondition(patterns.networkUsagePattern, 'high'),
            'aiProfile.learningData.lastLearningUpdate': new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error updating AI profile:', error);
    }
  }

  /**
   * Obtiene horas por condición de red
   */
  getHoursByCondition(networkPattern, condition) {
    const hours = [];
    const threshold = condition === 'high' ? 70 : 30;
    
    Object.entries(networkPattern.timeOfDay).forEach(([hour, data]) => {
      if (condition === 'high' && data.avg > threshold) {
        hours.push(parseInt(hour));
      } else if (condition === 'low' && data.avg < threshold) {
        hours.push(parseInt(hour));
      }
    });
    
    return hours;
  }

  /**
   * Calcula la varianza de un array
   */
  calculateVariance(array) {
    if (array.length === 0) return 0;
    
    const mean = array.reduce((a, b) => a + b, 0) / array.length;
    const squaredDiffs = array.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / array.length;
  }

  /**
   * Inicializa el aprendizaje para un usuario
   */
  async initializeUserLearning(userId) {
    console.log(`Initializing AI learning for user: ${userId}`);
    await this.learnUserPatterns(userId);
    
    // Programar aprendizaje periódico (cada 24 horas)
    setInterval(async () => {
      await this.learnUserPatterns(userId);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Obtiene estadísticas de IA para un usuario
   */
  getAIStats(userId) {
    const patterns = this.patterns.get(userId);
    const networkData = this.networkConditions.get(userId);
    
    return {
      hasPatterns: !!patterns,
      lastLearning: patterns ? new Date() : null,
      totalMeasurements: networkData ? networkData.measurements.length : 0,
      currentNetworkCondition: this.getCurrentNetworkCondition(userId),
      confidence: patterns ? this.calculateOverallConfidence(patterns) : 0
    };
  }

  /**
   * Calcula la confianza general del modelo
   */
  calculateOverallConfidence(patterns) {
    let confidence = 0;
    let factors = 0;

    // Factor de datos de trabajo
    if (patterns.workingHours.totalActivity > 10) {
      confidence += 0.3;
      factors++;
    }

    // Factor de datos de red
    if (Object.keys(patterns.networkUsagePattern.timeOfDay).length > 10) {
      confidence += 0.3;
      factors++;
    }

    // Factor de resolución de conflictos
    if (patterns.conflictResolutionPreferences.totalConflicts > 3) {
      confidence += 0.2;
      factors++;
    }

    // Factor de uso de carpetas
    if (Object.keys(patterns.folderUsage.counts).length > 5) {
      confidence += 0.2;
      factors++;
    }

    return factors > 0 ? confidence / factors : 0;
  }
}

module.exports = SyncAI;
/**
 * Sistema de batch processing paralelo para análisis de documentos
 * Permite procesar múltiples análisis de forma paralela y eficiente
 */

class ParallelAnalysisBatcher {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.active = 0;
    this.results = new Map();
  }

  /**
   * Agrega una tarea de análisis a la cola
   */
  async add(taskId, analysisFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        taskId,
        analysisFunction,
        resolve,
        reject,
        createdAt: Date.now()
      });
      this.process();
    });
  }

  /**
   * Procesa tareas de la cola en paralelo
   */
  async process() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      this.active++;
      const task = this.queue.shift();
      
      try {
        const result = await task.analysisFunction();
        this.results.set(task.taskId, {
          success: true,
          result,
          processingTime: Date.now() - task.createdAt
        });
        task.resolve(result);
      } catch (error) {
        this.results.set(task.taskId, {
          success: false,
          error: error.message,
          processingTime: Date.now() - task.createdAt
        });
        task.reject(error);
      } finally {
        this.active--;
        this.process();
      }
    }
  }

  /**
   * Obtiene resultados de análisis completados
   */
  getResult(taskId) {
    return this.results.get(taskId);
  }

  /**
   * Limpia resultados antiguos
   */
  clearOldResults(maxAge = 60 * 60 * 1000) {
    const now = Date.now();
    for (const [taskId, result] of this.results) {
      if (now - result.timestamp > maxAge) {
        this.results.delete(taskId);
      }
    }
  }

  /**
   * Obtiene estadísticas del batcher
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      activeProcessing: this.active,
      maxConcurrent: this.maxConcurrent,
      completedTasks: this.results.size,
      successfulTasks: Array.from(this.results.values()).filter(r => r.success).length,
      failedTasks: Array.from(this.results.values()).filter(r => !r.success).length,
      averageProcessingTime: this.getAverageProcessingTime()
    };
  }

  /**
   * Calcula tiempo promedio de procesamiento
   */
  getAverageProcessingTime() {
    if (this.results.size === 0) return 0;
    const times = Array.from(this.results.values()).map(r => r.processingTime);
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
  }
}

/**
 * Gestor de pool de conexiones para base de datos
 * Optimiza queries frecuentes
 */
class QueryOptimizer {
  constructor(db, maxPoolConnections = 10) {
    this.db = db;
    this.maxPoolConnections = maxPoolConnections;
    this.queryCache = new Map();
    this.activeQueries = 0;
  }

  /**
   * Ejecuta query con caching automático
   */
  async execute(query, params, cacheKey = null, cacheDuration = 300000) {
    const fullCacheKey = cacheKey || this.generateCacheKey(query, params);

    // Intentar obtener del cache
    const cached = this.queryCache.get(fullCacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.result;
    }

    // Ejecutar query
    try {
      this.activeQueries++;
      const result = await this.db.query(query, params);
      
      // Guardar en cache
      this.queryCache.set(fullCacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;
    } finally {
      this.activeQueries--;
    }
  }

  /**
   * Ejecuta múltiples queries en paralelo
   */
  async executeBatch(queries) {
    return Promise.all(
      queries.map(q => this.execute(q.query, q.params, q.cacheKey, q.cacheDuration))
    );
  }

  /**
   * Genera clave para cachear query
   */
  generateCacheKey(query, params) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const paramString = JSON.stringify(params || []);
    return `query_${normalizedQuery}_${paramString}`.substring(0, 100);
  }

  /**
   * Invalida cache
   */
  invalidateCache(pattern) {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      cacheSize: this.queryCache.size,
      activeQueries: this.activeQueries,
      maxPoolConnections: this.maxPoolConnections,
      cacheKeys: Array.from(this.queryCache.keys())
    };
  }

  /**
   * Limpia cache antiguo
   */
  cleanup(maxAge = 60 * 60 * 1000) {
    const now = Date.now();
    for (const [key, entry] of this.queryCache) {
      if (now - entry.timestamp > maxAge) {
        this.queryCache.delete(key);
      }
    }
  }
}

/**
 * Sistema de rate limiting para APIs
 */
class RateLimiter {
  constructor(maxRequestsPerMinute = 60) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.userRequests = new Map();
  }

  /**
   * Verifica si usuario puede hacer request
   */
  canMakeRequest(userId) {
    const now = Date.now();
    const userKey = `user_${userId}`;
    
    if (!this.userRequests.has(userKey)) {
      this.userRequests.set(userKey, []);
    }

    const requests = this.userRequests.get(userKey);
    const recentRequests = requests.filter(t => now - t < 60000); // Último minuto

    if (recentRequests.length >= this.maxRequestsPerMinute) {
      return {
        allowed: false,
        remainingTime: Math.ceil((recentRequests[0] + 60000 - now) / 1000),
        message: 'Rate limit exceeded'
      };
    }

    recentRequests.push(now);
    this.userRequests.set(userKey, recentRequests);

    return {
      allowed: true,
      remaining: this.maxRequestsPerMinute - recentRequests.length,
      message: 'Request allowed'
    };
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats() {
    return {
      activeUsers: this.userRequests.size,
      totalRequests: Array.from(this.userRequests.values())
        .reduce((sum, reqs) => sum + reqs.length, 0)
    };
  }

  /**
   * Limpia datos antiguos
   */
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.userRequests) {
      const recent = requests.filter(t => now - t < 60000);
      if (recent.length === 0) {
        this.userRequests.delete(key);
      } else {
        this.userRequests.set(key, recent);
      }
    }
  }
}

/**
 * Monitor de performance del sistema
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errors: 0
    };
  }

  /**
   * Registra una llamada API
   */
  recordApiCall(responseTime, cacheHit = false, error = false) {
    this.metrics.apiCalls++;
    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    if (error) {
      this.metrics.errors++;
    }

    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-500);
    }

    this.updateAverageResponseTime();
  }

  /**
   * Actualiza tiempo promedio de respuesta
   */
  updateAverageResponseTime() {
    if (this.metrics.responseTimes.length === 0) {
      this.metrics.averageResponseTime = 0;
      return;
    }

    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = (sum / this.metrics.responseTimes.length).toFixed(2);
  }

  /**
   * Obtiene reporte de performance
   */
  getReport() {
    const hitRate = this.metrics.apiCalls > 0
      ? ((this.metrics.cacheHits / this.metrics.apiCalls) * 100).toFixed(2)
      : 0;

    const errorRate = this.metrics.apiCalls > 0
      ? ((this.metrics.errors / this.metrics.apiCalls) * 100).toFixed(2)
      : 0;

    return {
      totalApiCalls: this.metrics.apiCalls,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      hitRate: `${hitRate}%`,
      averageResponseTime: `${this.metrics.averageResponseTime}ms`,
      errors: this.metrics.errors,
      errorRate: `${errorRate}%`,
      uptimeQuality: this.calculateQuality()
    };
  }

  /**
   * Calcula calidad del uptime (0-100)
   */
  calculateQuality() {
    const errorRate = this.metrics.apiCalls > 0
      ? (this.metrics.errors / this.metrics.apiCalls)
      : 0;

    return Math.max(0, 100 - (errorRate * 100)).toFixed(2);
  }

  /**
   * Resetea métricas
   */
  reset() {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errors: 0
    };
  }
}

module.exports = {
  ParallelAnalysisBatcher,
  QueryOptimizer,
  RateLimiter,
  PerformanceMonitor
};

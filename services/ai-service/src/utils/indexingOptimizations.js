/**
 * Optimizaciones avanzadas para indexing de documentos y caché
 * Objetivo: Acelerar el análisis y la búsqueda de documentos
 */

const NodeCache = require('node-cache');

/**
 * Cache de dos niveles para máximo rendimiento
 * Nivel 1: Cache rápido en memoria (hot cache) - 100 items, 2 minutos
 * Nivel 2: Cache extendido (warm cache) - 1000 items, 15 minutos
 */
const hotCache = new NodeCache({ 
  stdTTL: 120,        // 2 minutos
  checkperiod: 60,    // Validar cada 1 minuto
  useClones: false    // No clonar objetos para mejorar velocidad
});

const warmCache = new NodeCache({ 
  stdTTL: 900,        // 15 minutos
  checkperiod: 300,   // Validar cada 5 minutos
  useClones: false
});

/**
 * Índice de contenido para búsqueda rápida
 * Mapea palabras clave a documentos
 */
const contentIndex = new Map();

/**
 * Mapeo de usuarios a sus documentos analizados
 * Para invalidación rápida cuando se actualiza contenido
 */
const userDocumentMap = new Map();

/**
 * Estadísticas de rendimiento
 */
const performanceMetrics = {
  hotCacheHits: 0,
  warmCacheHits: 0,
  cacheMisses: 0,
  indexedDocuments: 0,
  totalQueryTime: 0,
  queryCount: 0,
  averageQueryTime: 0,
};

/**
 * Obtiene resultado del caché con prioridad en hot cache
 */
function getCachedAnalysis(userId, documentId, analysisType) {
  const hotKey = generateHotCacheKey(userId, documentId, analysisType);
  
  // Intentar hot cache primero
  let result = hotCache.get(hotKey);
  if (result) {
    performanceMetrics.hotCacheHits++;
    return { result, cached: true, cacheLevel: 'hot' };
  }

  // Intentar warm cache
  const warmKey = generateWarmCacheKey(userId, documentId, analysisType);
  result = warmCache.get(warmKey);
  if (result) {
    performanceMetrics.warmCacheHits++;
    // Promover a hot cache
    hotCache.set(hotKey, result);
    return { result, cached: true, cacheLevel: 'warm' };
  }

  performanceMetrics.cacheMisses++;
  return { result: null, cached: false, cacheLevel: null };
}

/**
 * Guarda resultado en ambos niveles de caché
 */
function cacheAnalysis(userId, documentId, analysisType, result) {
  const hotKey = generateHotCacheKey(userId, documentId, analysisType);
  const warmKey = generateWarmCacheKey(userId, documentId, analysisType);
  
  // Guardar en hot cache (con menos TTL)
  hotCache.set(hotKey, result, 120);
  
  // Guardar en warm cache (con más TTL)
  warmCache.set(warmKey, result, 900);

  // Indexar contenido para búsqueda
  indexDocumentContent(userId, documentId, result);

  // Registrar en mapeo de usuario
  if (!userDocumentMap.has(userId)) {
    userDocumentMap.set(userId, new Set());
  }
  userDocumentMap.get(userId).add(documentId);
}

/**
 * Genera clave para hot cache (más selectiva)
 */
function generateHotCacheKey(userId, documentId, analysisType) {
  return `hot_${userId}_${documentId}_${analysisType}`;
}

/**
 * Genera clave para warm cache (más amplia)
 */
function generateWarmCacheKey(userId, documentId, analysisType) {
  return `warm_${userId}_${documentId}_${analysisType}`;
}

/**
 * Indexa contenido de análisis para búsqueda rápida
 */
function indexDocumentContent(userId, documentId, analysisResult) {
  // Extraer palabras clave del análisis
  const keywords = extractKeywords(analysisResult.analysis || '');
  
  const indexKey = `${userId}_${documentId}`;
  contentIndex.set(indexKey, {
    userId,
    documentId,
    keywords,
    analysisType: analysisResult.analysisType,
    timestamp: Date.now(),
    documentTitle: analysisResult.documentTitle || 'Unknown'
  });

  performanceMetrics.indexedDocuments++;
}

/**
 * Extrae palabras clave del contenido (simples pero efectivas)
 */
function extractKeywords(text, maxKeywords = 10) {
  if (!text) return [];

  // Dividir en palabras y filtrar palabras vacías comunes
  const stopWords = new Set([
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se',
    'no', 'por', 'con', 'para', 'una', 'su', 'al', 'lo', 'como',
    'más', 'o', 'esto', 'este', 'del', 'las', 'los', 'si', 'fue',
    'son', 'será', 'han', 'sea', 'donde', 'hacer', 'he', 'his'
  ]);

  const words = text
    .toLowerCase()
    .match(/\b[\w\u00E0-\u00FC]+\b/g) || [];

  // Contar frecuencia de palabras
  const wordFreq = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Obtener top palabras por frecuencia
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Busca en el índice de contenido
 */
function searchIndex(userId, searchTerm, limit = 5) {
  const searchLower = searchTerm.toLowerCase();
  const results = [];

  for (const [key, indexEntry] of contentIndex.entries()) {
    if (indexEntry.userId !== userId) continue;

    const matchScore = indexEntry.keywords.reduce((score, keyword) => {
      if (keyword.includes(searchLower) || searchLower.includes(keyword)) {
        return score + 2;
      }
      return score;
    }, 0);

    if (matchScore > 0) {
      results.push({ ...indexEntry, matchScore });
    }
  }

  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Invalida caché de un usuario
 */
function invalidateUserCache(userId) {
  // Borrar de hot cache
  const hotKeys = hotCache.keys()
    .filter(key => key.includes(`_${userId}_`));
  hotCache.del(hotKeys);

  // Borrar de warm cache
  const warmKeys = warmCache.keys()
    .filter(key => key.includes(`_${userId}_`));
  warmCache.del(warmKeys);

  // Borrar índice
  const indexKeys = Array.from(contentIndex.keys())
    .filter(key => key.startsWith(`${userId}_`));
  indexKeys.forEach(key => contentIndex.delete(key));

  // Borrar mapeo
  userDocumentMap.delete(userId);
}

/**
 * Invalida caché de un documento específico
 */
function invalidateDocumentCache(userId, documentId) {
  // Borrar hot cache
  const hotKeys = hotCache.keys()
    .filter(key => key.includes(`_${userId}_${documentId}_`));
  hotCache.del(hotKeys);

  // Borrar warm cache
  const warmKeys = warmCache.keys()
    .filter(key => key.includes(`_${userId}_${documentId}_`));
  warmCache.del(warmKeys);

  // Borrar índice
  const indexKey = `${userId}_${documentId}`;
  contentIndex.delete(indexKey);
}

/**
 * Obtiene estadísticas detalladas del sistema de caché
 */
function getDetailedCacheStats() {
  const totalCacheHits = performanceMetrics.hotCacheHits + performanceMetrics.warmCacheHits;
  const totalRequests = totalCacheHits + performanceMetrics.cacheMisses;
  const hitRate = totalRequests > 0 ? ((totalCacheHits / totalRequests) * 100).toFixed(2) : 0;

  const avgQueryTime = performanceMetrics.queryCount > 0 
    ? (performanceMetrics.totalQueryTime / performanceMetrics.queryCount).toFixed(2)
    : 0;

  return {
    cacheHitRate: `${hitRate}%`,
    hotCacheHits: performanceMetrics.hotCacheHits,
    warmCacheHits: performanceMetrics.warmCacheHits,
    cacheMisses: performanceMetrics.cacheMisses,
    totalRequests,
    indexedDocuments: performanceMetrics.indexedDocuments,
    hotCacheSize: hotCache.keys().length,
    warmCacheSize: warmCache.keys().length,
    indexSize: contentIndex.size,
    averageQueryTime: `${avgQueryTime}ms`,
    totalQueryTime: `${performanceMetrics.totalQueryTime}ms`,
    queryCount: performanceMetrics.queryCount
  };
}

/**
 * Registra tiempo de query para métricas
 */
function recordQueryTime(durationMs) {
  performanceMetrics.totalQueryTime += durationMs;
  performanceMetrics.queryCount++;
}

/**
 * Limpia estadísticas
 */
function resetMetrics() {
  performanceMetrics.hotCacheHits = 0;
  performanceMetrics.warmCacheHits = 0;
  performanceMetrics.cacheMisses = 0;
  performanceMetrics.indexedDocuments = 0;
  performanceMetrics.totalQueryTime = 0;
  performanceMetrics.queryCount = 0;
  performanceMetrics.averageQueryTime = 0;
}

/**
 * Limpia caché antiguo para evitar memory leaks
 */
function cleanupOldCache() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  // Limpiar índice antiguo
  for (const [key, entry] of contentIndex.entries()) {
    if (now - entry.timestamp > maxAge) {
      contentIndex.delete(key);
    }
  }
}

// Limpiar caché antiguo cada hora
setInterval(cleanupOldCache, 60 * 60 * 1000);

module.exports = {
  getCachedAnalysis,
  cacheAnalysis,
  invalidateUserCache,
  invalidateDocumentCache,
  searchIndex,
  getDetailedCacheStats,
  recordQueryTime,
  resetMetrics,
  extractKeywords,
  performanceMetrics
};

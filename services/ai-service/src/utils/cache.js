const NodeCache = require('node-cache');

// Cache para resultados de búsqueda IA
// TTL: 30 segundos (solo para evitar doble-envío accidental)
// checkperiod: 60 segundos
const aiCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

/**
 * Genera una clave única para el cache basada en userId y query
 */
function generateCacheKey(userId, query) {
  const normalizedQuery = query.toLowerCase().trim();
  return `ai_search_${userId}_${normalizedQuery}`;
}

/**
 * Obtiene resultado del cache si existe
 */
function getCachedResult(userId, query) {
  const key = generateCacheKey(userId, query);
  return aiCache.get(key);
}

/**
 * Guarda resultado en el cache
 */
function setCachedResult(userId, query, result) {
  const key = generateCacheKey(userId, query);
  aiCache.set(key, result);
}

/**
 * Invalida cache de un usuario específico
 */
function invalidateUserCache(userId) {
  const keys = aiCache.keys();
  const userKeys = keys.filter(key => key.startsWith(`ai_search_${userId}_`));
  aiCache.del(userKeys);
}

/**
 * Obtiene estadísticas del cache
 */
function getCacheStats() {
  return aiCache.getStats();
}

module.exports = {
  getCachedResult,
  setCachedResult,
  invalidateUserCache,
  getCacheStats
};

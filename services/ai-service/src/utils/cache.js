const NodeCache = require('node-cache');

const aiCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

function generateCacheKey(userId, query) {
  const normalizedQuery = query.toLowerCase().trim();
  return `ai_search_${userId}_${normalizedQuery}`;
}

function getCachedResult(userId, query) {
  const key = generateCacheKey(userId, query);
  return aiCache.get(key);
}

function setCachedResult(userId, query, result) {
  const key = generateCacheKey(userId, query);
  aiCache.set(key, result);
}

function invalidateUserCache(userId) {
  const keys = aiCache.keys();
  const userKeys = keys.filter(key => key.startsWith(`ai_search_${userId}_`));
  aiCache.del(userKeys);
}

function getCacheStats() {
  return aiCache.getStats();
}

function getDetailedCacheStats() {
  const stats = aiCache.getStats();
  const keys = aiCache.keys();

  return {
    ...stats,
    totalKeys: keys.length,
    sampleKeys: keys.slice(0, 10)
  };
}

module.exports = {
  getCachedResult,
  setCachedResult,
  invalidateUserCache,
  getCacheStats,
  getDetailedCacheStats
};

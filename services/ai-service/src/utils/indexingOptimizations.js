
const NodeCache = require('node-cache');

const hotCache = new NodeCache({ 
  stdTTL: 120,
  checkperiod: 60,
  useClones: false
});

const warmCache = new NodeCache({ 
  stdTTL: 900,
  checkperiod: 300,
  useClones: false
});

const contentIndex = new Map();

const userDocumentMap = new Map();

const performanceMetrics = {
  hotCacheHits: 0,
  warmCacheHits: 0,
  cacheMisses: 0,
  indexedDocuments: 0,
  totalQueryTime: 0,
  queryCount: 0,
  averageQueryTime: 0,
};

function getCachedAnalysis(userId, documentId, analysisType) {
  const hotKey = generateHotCacheKey(userId, documentId, analysisType);
  
  let result = hotCache.get(hotKey);
  if (result) {
    performanceMetrics.hotCacheHits++;
    return { result, cached: true, cacheLevel: 'hot' };
  }

  const warmKey = generateWarmCacheKey(userId, documentId, analysisType);
  result = warmCache.get(warmKey);
  if (result) {
    performanceMetrics.warmCacheHits++;
    hotCache.set(hotKey, result);
    return { result, cached: true, cacheLevel: 'warm' };
  }

  performanceMetrics.cacheMisses++;
  return { result: null, cached: false, cacheLevel: null };
}

function cacheAnalysis(userId, documentId, analysisType, result) {
  const hotKey = generateHotCacheKey(userId, documentId, analysisType);
  const warmKey = generateWarmCacheKey(userId, documentId, analysisType);
  
  hotCache.set(hotKey, result, 120);
  
  warmCache.set(warmKey, result, 900);

  indexDocumentContent(userId, documentId, result);

  if (!userDocumentMap.has(userId)) {
    userDocumentMap.set(userId, new Set());
  }
  userDocumentMap.get(userId).add(documentId);
}

function generateHotCacheKey(userId, documentId, analysisType) {
  return `hot_${userId}_${documentId}_${analysisType}`;
}

function generateWarmCacheKey(userId, documentId, analysisType) {
  return `warm_${userId}_${documentId}_${analysisType}`;
}

function indexDocumentContent(userId, documentId, analysisResult) {
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

function extractKeywords(text, maxKeywords = 10) {
  if (!text) return [];

  const stopWords = new Set([
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se',
    'no', 'por', 'con', 'para', 'una', 'su', 'al', 'lo', 'como',
    'más', 'o', 'esto', 'este', 'del', 'las', 'los', 'si', 'fue',
    'son', 'será', 'han', 'sea', 'donde', 'hacer', 'he', 'his'
  ]);

  const words = text
    .toLowerCase()
    .match(/\b[\w\u00E0-\u00FC]+\b/g) || [];

  const wordFreq = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

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

function invalidateUserCache(userId) {
  const hotKeys = hotCache.keys()
    .filter(key => key.includes(`_${userId}_`));
  hotCache.del(hotKeys);

  const warmKeys = warmCache.keys()
    .filter(key => key.includes(`_${userId}_`));
  warmCache.del(warmKeys);

  const indexKeys = Array.from(contentIndex.keys())
    .filter(key => key.startsWith(`${userId}_`));
  indexKeys.forEach(key => contentIndex.delete(key));

  userDocumentMap.delete(userId);
}

function invalidateDocumentCache(userId, documentId) {
  const hotKeys = hotCache.keys()
    .filter(key => key.includes(`_${userId}_${documentId}_`));
  hotCache.del(hotKeys);

  const warmKeys = warmCache.keys()
    .filter(key => key.includes(`_${userId}_${documentId}_`));
  warmCache.del(warmKeys);

  const indexKey = `${userId}_${documentId}`;
  contentIndex.delete(indexKey);
}

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

function recordQueryTime(durationMs) {
  performanceMetrics.totalQueryTime += durationMs;
  performanceMetrics.queryCount++;
}

function resetMetrics() {
  performanceMetrics.hotCacheHits = 0;
  performanceMetrics.warmCacheHits = 0;
  performanceMetrics.cacheMisses = 0;
  performanceMetrics.indexedDocuments = 0;
  performanceMetrics.totalQueryTime = 0;
  performanceMetrics.queryCount = 0;
  performanceMetrics.averageQueryTime = 0;
}

function cleanupOldCache() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [key, entry] of contentIndex.entries()) {
    if (now - entry.timestamp > maxAge) {
      contentIndex.delete(key);
    }
  }
}

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

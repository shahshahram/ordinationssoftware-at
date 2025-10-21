const NodeCache = require('node-cache');

// Cache-Konfiguration
const cache = new NodeCache({
  stdTTL: 300, // 5 Minuten Standard-TTL
  checkperiod: 60, // Cache-Cleanup alle 60 Sekunden
  useClones: false // Bessere Performance
});

// Cache-Keys
const CACHE_KEYS = {
  SEARCH: (query, year, options) => `search:${query}:${year}:${JSON.stringify(options)}`,
  TOP_CODES: (scope, year) => `top:${scope}:${year}`,
  RECENT_CODES: (scope, year) => `recent:${scope}:${year}`,
  CHAPTERS: (year) => `chapters:${year}`,
  ANALYTICS: (scope, year) => `analytics:${scope}:${year}`,
  HIERARCHY: (year) => `hierarchy:${year}`,
  CHILDREN: (parentCode, year) => `children:${year}:${parentCode}`,
  PARENT: (code, year) => `parent:${year}:${code}`,
  SIBLINGS: (code, year) => `siblings:${year}:${code}`,
  RELATED: (code, year, limit) => `related:${year}:${code}:${limit}`,
  BREADCRUMB: (code, year) => `breadcrumb:${year}:${code}`
};

class ICD10Cache {
  // Cache für Suchanfragen
  static setSearchResult(query, year, options, result) {
    const key = CACHE_KEYS.SEARCH(query, year, options);
    cache.set(key, result, 300); // 5 Minuten
  }

  static getSearchResult(query, year, options) {
    const key = CACHE_KEYS.SEARCH(query, year, options);
    return cache.get(key);
  }

  // Cache für Top Codes
  static setTopCodes(scope, year, result) {
    const key = CACHE_KEYS.TOP_CODES(scope, year);
    cache.set(key, result, 600); // 10 Minuten
  }

  static getTopCodes(scope, year) {
    const key = CACHE_KEYS.TOP_CODES(scope, year);
    return cache.get(key);
  }

  // Cache für Recent Codes
  static setRecentCodes(scope, year, result) {
    const key = CACHE_KEYS.RECENT_CODES(scope, year);
    cache.set(key, result, 300); // 5 Minuten
  }

  static getRecentCodes(scope, year) {
    const key = CACHE_KEYS.RECENT_CODES(scope, year);
    return cache.get(key);
  }

  // Cache für Chapters
  static setChapters(year, result) {
    const key = CACHE_KEYS.CHAPTERS(year);
    cache.set(key, result, 1800); // 30 Minuten
  }

  static getChapters(year) {
    const key = CACHE_KEYS.CHAPTERS(year);
    return cache.get(key);
  }

  // Cache für Analytics
  static setAnalytics(scope, year, result) {
    const key = CACHE_KEYS.ANALYTICS(scope, year);
    cache.set(key, result, 1800); // 30 Minuten
  }

  static getAnalytics(scope, year) {
    const key = CACHE_KEYS.ANALYTICS(scope, year);
    return cache.get(key);
  }

  // Cache für Hierarchie
  static setHierarchy(year, result) {
    const key = CACHE_KEYS.HIERARCHY(year);
    cache.set(key, result, 1800); // 30 Minuten
  }

  static getHierarchy(year) {
    const key = CACHE_KEYS.HIERARCHY(year);
    return cache.get(key);
  }

  // Cache für Children
  static setChildren(parentCode, year, result) {
    const key = CACHE_KEYS.CHILDREN(parentCode, year);
    cache.set(key, result, 600); // 10 Minuten
  }

  static getChildren(parentCode, year) {
    const key = CACHE_KEYS.CHILDREN(parentCode, year);
    return cache.get(key);
  }

  // Cache für Parent
  static setParent(code, year, result) {
    const key = CACHE_KEYS.PARENT(code, year);
    cache.set(key, result, 600); // 10 Minuten
  }

  static getParent(code, year) {
    const key = CACHE_KEYS.PARENT(code, year);
    return cache.get(key);
  }

  // Cache für Siblings
  static setSiblings(code, year, result) {
    const key = CACHE_KEYS.SIBLINGS(code, year);
    cache.set(key, result, 600); // 10 Minuten
  }

  static getSiblings(code, year) {
    const key = CACHE_KEYS.SIBLINGS(code, year);
    return cache.get(key);
  }

  // Cache für Related
  static setRelated(code, year, limit, result) {
    const key = CACHE_KEYS.RELATED(code, year, limit);
    cache.set(key, result, 600); // 10 Minuten
  }

  static getRelated(code, year, limit) {
    const key = CACHE_KEYS.RELATED(code, year, limit);
    return cache.get(key);
  }

  // Cache für Breadcrumb
  static setBreadcrumb(code, year, result) {
    const key = CACHE_KEYS.BREADCRUMB(code, year);
    cache.set(key, result, 600); // 10 Minuten
  }

  static getBreadcrumb(code, year) {
    const key = CACHE_KEYS.BREADCRUMB(code, year);
    return cache.get(key);
  }

  // Cache invalidieren
  static invalidateSearch(query, year) {
    const pattern = `search:${query}:${year}:*`;
    const keys = cache.keys().filter(key => key.startsWith(`search:${query}:${year}:`));
    cache.del(keys);
  }

  static invalidateTopCodes(scope, year) {
    const key = CACHE_KEYS.TOP_CODES(scope, year);
    cache.del(key);
  }

  static invalidateRecentCodes(scope, year) {
    const key = CACHE_KEYS.RECENT_CODES(scope, year);
    cache.del(key);
  }

  static invalidateChapters(year) {
    const key = CACHE_KEYS.CHAPTERS(year);
    cache.del(key);
  }

  static invalidateAnalytics(scope, year) {
    const key = CACHE_KEYS.ANALYTICS(scope, year);
    cache.del(key);
  }

  // Cache-Statistiken
  static getStats() {
    return {
      keys: cache.keys().length,
      hits: cache.getStats().hits,
      misses: cache.getStats().misses,
      ksize: cache.getStats().ksize,
      vsize: cache.getStats().vsize
    };
  }

  // Cache leeren
  static clear() {
    cache.flushAll();
  }
}

module.exports = ICD10Cache;

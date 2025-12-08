import { logger } from '../utils/logger.js';

class ResponseOptimizationService {
  constructor() {
    this.responseCache = new Map();
    this.chartCache = new Map();
    this.llmCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 1000;
  }

  /**
   * Generate cache key for responses
   */
  generateCacheKey(userId, query, context = {}) {
    const contextStr = JSON.stringify(context);
    return `${userId}_${this.hashString(query)}_${this.hashString(contextStr)}`;
  }

  /**
   * Simple hash function for strings
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache response with TTL
   */
  cacheResponse(key, response) {
    // Clean up old cache entries if needed
    if (this.responseCache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }

    this.responseCache.set(key, {
      data: response,
      timestamp: Date.now()
    });

    logger.info('Response cached', { 
      cacheKey: key.substring(0, 20) + '...',
      cacheSize: this.responseCache.size 
    });
  }

  /**
   * Get cached response if valid
   */
  getCachedResponse(key) {
    const cached = this.responseCache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.responseCache.delete(key);
      return null;
    }

    logger.info('Cache hit', { 
      cacheKey: key.substring(0, 20) + '...',
      age: Date.now() - cached.timestamp 
    });

    return cached.data;
  }

  /**
   * Cache chart data for faster access
   */
  cacheCharts(userId, charts) {
    const key = `charts_${userId}`;
    this.chartCache.set(key, {
      data: charts,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached chart data
   */
  getCachedCharts(userId) {
    const key = `charts_${userId}`;
    const cached = this.chartCache.get(key);
    
    if (!cached) {
      return null;
    }

    // Chart cache expires after 10 minutes
    if (Date.now() - cached.timestamp > 10 * 60 * 1000) {
      this.chartCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    // Clean response cache
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.responseCache.delete(key);
        cleaned++;
      }
    }

    // Clean chart cache
    for (const [key, value] of this.chartCache.entries()) {
      if (now - value.timestamp > 10 * 60 * 1000) {
        this.chartCache.delete(key);
        cleaned++;
      }
    }

    logger.info('Cache cleanup completed', { 
      entriesCleaned: cleaned,
      remainingResponseCache: this.responseCache.size,
      remainingChartCache: this.chartCache.size
    });
  }

  /**
   * Optimize LLM parameters for faster responses
   */
  getOptimizedLLMParams(queryType = 'general') {
    const baseParams = {
      temperature: 0.7,
      maxTokens: 1000, // Limit response length for faster generation
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1
    };

    // Optimize based on query type
    switch (queryType) {
      case 'brief':
        return {
          ...baseParams,
          maxTokens: 500,
          temperature: 0.6
        };
      
      case 'detailed':
        return {
          ...baseParams,
          maxTokens: 1500,
          temperature: 0.8
        };
      
      case 'matchmaking':
        return {
          ...baseParams,
          maxTokens: 800,
          temperature: 0.7
        };
      
      default:
        return baseParams;
    }
  }

  /**
   * Pre-process query to determine optimization strategy
   */
  analyzeQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Determine query type for optimization
    if (queryLower.includes('brief') || queryLower.includes('short') || queryLower.includes('summary')) {
      return { type: 'brief', priority: 'speed' };
    }
    
    if (queryLower.includes('detailed') || queryLower.includes('comprehensive') || queryLower.includes('full')) {
      return { type: 'detailed', priority: 'quality' };
    }
    
    if (queryLower.includes('compatibility') || queryLower.includes('match') || queryLower.includes('partner')) {
      return { type: 'matchmaking', priority: 'balanced' };
    }
    
    return { type: 'general', priority: 'balanced' };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      responseCache: {
        size: this.responseCache.size,
        maxSize: this.maxCacheSize
      },
      chartCache: {
        size: this.chartCache.size
      },
      totalMemoryUsage: this.responseCache.size + this.chartCache.size
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.responseCache.clear();
    this.chartCache.clear();
    this.llmCache.clear();
    
    logger.info('All caches cleared');
  }
}

export const responseOptimizationService = new ResponseOptimizationService();

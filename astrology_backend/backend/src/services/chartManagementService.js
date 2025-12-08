import { firestoreRAGService } from './firestoreRAGService.js';
import { astrologyAPIService } from './astrologyAPIService.js';
import { responseOptimizationService } from './responseOptimizationService.js';
import { logger } from '../utils/logger.js';

/**
 * Chart Management Service
 * Handles dual storage (DB + RAG) and intelligent chart retrieval for LLM context
 */
class ChartManagementService {
  constructor() {
    this.chartCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    logger.info('Chart Management Service initialized');
  }

  /**
   * Handle user login and chart initialization
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - Success status and chart summary
   */
  async handleUserLogin(userId) {
    const sessionId = `LOGIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('🔐 [CHART_MANAGEMENT] Starting user login chart initialization', { 
        userId, 
        sessionId,
        timestamp: new Date().toISOString(),
        step: 'START_LOGIN_INIT'
      });

      // Step 1: Get user profile and birth data
      logger.info('📋 [CHART_MANAGEMENT] Step 1: Retrieving user profile', { 
        userId, 
        sessionId,
        step: 'GET_USER_PROFILE'
      });
      
      const userProfile = await firestoreRAGService.getUserProfile(userId);
      
      if (!userProfile || !userProfile.profile) {
        logger.warn('⚠️ [CHART_MANAGEMENT] No user profile found during login', { 
          userId, 
          sessionId,
          step: 'PROFILE_NOT_FOUND',
          error: 'User profile not found'
        });
        return {
          success: false,
          error: 'User profile not found',
          message: 'Please complete your profile setup first',
          sessionId,
          step: 'PROFILE_NOT_FOUND'
        };
      }

      // Step 2: Check if charts exist in DB
      logger.info('🔍 [CHART_MANAGEMENT] Step 2: Checking existing charts in database', { 
        userId, 
        sessionId,
        step: 'CHECK_EXISTING_CHARTS'
      });
      
      const existingCharts = await firestoreRAGService.getAllUserCharts(userId);
      
      logger.info('📊 [CHART_MANAGEMENT] Existing charts check result', { 
        userId, 
        sessionId,
        step: 'EXISTING_CHARTS_RESULT',
        hasCharts: !!existingCharts.charts,
        chartCount: existingCharts.charts ? Object.keys(existingCharts.charts).length : 0,
        chartTypes: existingCharts.charts ? Object.keys(existingCharts.charts) : []
      });
      
      // Step 3: If no charts exist, generate comprehensive charts
      if (!existingCharts.charts || Object.keys(existingCharts.charts).length === 0) {
        logger.info('🆕 [CHART_MANAGEMENT] Step 3: No existing charts found, generating comprehensive charts', { 
          userId, 
          sessionId,
          step: 'GENERATE_COMPREHENSIVE_CHARTS',
          birthData: userProfile.profile.birthData
        });
        
        const comprehensiveCharts = await this.generateComprehensiveCharts(
          userId, 
          userProfile.profile.birthData
        );
        
        if (comprehensiveCharts.success) {
          // Step 4: Store charts in both DB and RAG
          logger.info('💾 [CHART_MANAGEMENT] Step 4: Storing charts in dual storage', { 
            userId, 
            sessionId,
            step: 'STORE_CHARTS_DUAL',
            chartTypes: Object.keys(comprehensiveCharts.charts)
          });
          
          await this.storeChartsDual(userId, comprehensiveCharts.charts);
          
          logger.info('✅ [CHART_MANAGEMENT] Comprehensive charts generated and stored successfully', { 
            userId, 
            sessionId,
            step: 'CHARTS_STORED_SUCCESS',
            chartTypes: Object.keys(comprehensiveCharts.charts),
            totalCharts: Object.keys(comprehensiveCharts.charts).length
          });
        } else {
          logger.error('❌ [CHART_MANAGEMENT] Failed to generate comprehensive charts', { 
            userId, 
            sessionId,
            step: 'CHARTS_GENERATION_FAILED',
            error: comprehensiveCharts.error,
            message: comprehensiveCharts.message
          });
          return {
            ...comprehensiveCharts,
            sessionId,
            step: 'CHARTS_GENERATION_FAILED'
          };
        }
      } else {
        logger.info('📋 [CHART_MANAGEMENT] Step 3: Existing charts found, processing for RAG', { 
          userId, 
          sessionId,
          step: 'PROCESS_EXISTING_CHARTS',
          chartTypes: Object.keys(existingCharts.charts),
          totalCharts: Object.keys(existingCharts.charts).length
        });
      }
      
      // Step 5: Load charts into RAG for immediate use
      logger.info('🧠 [CHART_MANAGEMENT] Step 5: Loading charts into RAG for immediate use', { 
        userId, 
        sessionId,
        step: 'LOAD_CHARTS_INTO_RAG'
      });
      
      const ragResult = await firestoreRAGService.processChartsForRAG(userId);
      
      if (ragResult.success) {
        logger.info('✅ [CHART_MANAGEMENT] Charts loaded into RAG successfully', { 
          userId, 
          sessionId,
          step: 'RAG_LOAD_SUCCESS',
          totalCharts: ragResult.totalCharts,
          chartTypes: ragResult.chartTypes || []
        });
      } else {
        logger.warn('⚠️ [CHART_MANAGEMENT] Failed to load charts into RAG, but continuing', { 
          userId, 
          sessionId,
          step: 'RAG_LOAD_FAILED',
          error: ragResult.error,
          message: ragResult.message
        });
      }

      // Step 6: Return chart summary
      logger.info('📊 [CHART_MANAGEMENT] Step 6: Generating final chart summary', { 
        userId, 
        sessionId,
        step: 'GENERATE_CHART_SUMMARY'
      });
      
      const chartSummary = await this.generateChartSummary(userId);
      
      logger.info('🎉 [CHART_MANAGEMENT] User login chart initialization completed successfully', { 
        userId, 
        sessionId,
        step: 'LOGIN_INIT_COMPLETE',
        totalCharts: existingCharts.totalCharts || 0,
        chartTypes: existingCharts.chartTypes || [],
        chartSummary: chartSummary.status,
        ragStatus: ragResult.success ? 'success' : 'failed'
      });
      
      return {
        success: true,
        message: 'User login chart initialization completed',
        chartSummary,
        totalCharts: existingCharts.totalCharts || 0,
        chartTypes: existingCharts.chartTypes || [],
        sessionId,
        step: 'LOGIN_INIT_COMPLETE',
        ragStatus: ragResult.success ? 'success' : 'failed'
      };

    } catch (error) {
      logger.error('Error during user login chart initialization:', error);
      return {
        success: false,
        error: 'Chart initialization failed',
        message: error.message
      };
    }
  }

  /**
   * Generate comprehensive charts for user
   * @param {string} userId - Firebase Auth UID
   * @param {object} birthData - User birth data
   * @returns {object} - Generated charts
   */
  async generateComprehensiveCharts(userId, birthData) {
    try {
      logger.info('Generating comprehensive charts', { userId, birthData: birthData.name });

      // Use the comprehensive astrology service
      const charts = await astrologyAPIService.getComprehensiveChart(userId, birthData);
      
      if (charts.success) {
        return {
          success: true,
          charts: charts.charts,
          message: 'Comprehensive charts generated successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to generate charts',
          message: charts.error || 'Unknown error occurred'
        };
      }
    } catch (error) {
      logger.error('Error generating comprehensive charts:', error);
      return {
        success: false,
        error: 'Chart generation failed',
        message: error.message
      };
    }
  }

  /**
   * Store charts in both DB and RAG
   * @param {string} userId - Firebase Auth UID
   * @param {object} charts - Chart data
   * @returns {object} - Storage result
   */
  async storeChartsDual(userId, charts) {
    try {
      logger.info('Storing charts in dual storage', { userId, chartTypes: Object.keys(charts) });

      // 1. Store in Firestore (persistent storage)
      const dbResult = await firestoreRAGService.storeUserCharts(userId, charts);
      
      if (!dbResult.success) {
        logger.error('Failed to store charts in database', { userId, error: dbResult.error });
        return dbResult;
      }

      // 2. Process and store in RAG (searchable context)
      const ragResult = await firestoreRAGService.processChartsForRAG(userId);
      
      if (!ragResult.success) {
        logger.warn('Failed to store charts in RAG, but DB storage succeeded', { 
          userId, 
          error: ragResult.error 
        });
      }

      // 3. Create chart metadata for quick access
      const chartMetadata = {
        userId,
        chartTypes: Object.keys(charts),
        lastUpdated: new Date(),
        totalCharts: Object.keys(charts).length,
        storageStatus: {
          database: 'success',
          rag: ragResult.success ? 'success' : 'failed'
        }
      };

      // Store metadata (you'll need to implement this in firestoreService)
      // await firestoreService.storeChartMetadata(userId, chartMetadata);

      logger.info('Charts stored in dual storage successfully', { 
        userId, 
        chartTypes: Object.keys(charts),
        dbSuccess: dbResult.success,
        ragSuccess: ragResult.success
      });

      return {
        success: true,
        message: 'Charts stored in dual storage successfully',
        database: dbResult.success,
        rag: ragResult.success
      };

    } catch (error) {
      logger.error('Error storing charts in dual storage:', error);
      return {
        success: false,
        error: 'Dual storage failed',
        message: error.message
      };
    }
  }

  /**
   * Get charts optimized for LLM context
   * @param {string} userId - Firebase Auth UID
   * @param {string} query - User query for context relevance
   * @returns {object} - Optimized chart data for LLM
   */
  async getChartsForLLMContext(userId, query) {
    const sessionId = `LLM_CTX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queryHash = this.hashQuery(query);
    
    // Check cache first
    const cachedCharts = responseOptimizationService.getCachedCharts(userId);
    if (cachedCharts) {
      logger.info('✅ [CHART_MANAGEMENT] Using cached charts for LLM context', { 
        userId, 
        sessionId,
        step: 'CACHE_HIT',
        totalRelevantCharts: cachedCharts.totalRelevantCharts
      });
      return cachedCharts;
    }
    
    try {
      logger.info('🧠 [CHART_MANAGEMENT] Starting LLM context chart retrieval', { 
        userId, 
        sessionId,
        query: query.substring(0, 100),
        queryHash,
        timestamp: new Date().toISOString(),
        step: 'START_LLM_CONTEXT'
      });

      // 1. Check cache first
      const cacheKey = `${userId}_${queryHash}`;
      logger.info('💾 [CHART_MANAGEMENT] Step 1: Checking cache for existing charts', { 
        userId, 
        sessionId,
        step: 'CHECK_CACHE',
        cacheKey,
        cacheSize: this.chartCache.size
      });
      
      const cachedCharts = this.chartCache.get(cacheKey);
      
      if (cachedCharts && Date.now() - cachedCharts.timestamp < this.cacheExpiry) {
        const cacheAge = Date.now() - cachedCharts.timestamp;
        logger.info('✅ [CHART_MANAGEMENT] Cache hit! Returning cached charts for LLM context', { 
          userId, 
          sessionId,
          step: 'CACHE_HIT',
          cacheKey,
          cacheAge: `${Math.round(cacheAge / 1000)}s`,
          totalCharts: cachedCharts.data.totalRelevantCharts || 0
        });
        return {
          ...cachedCharts.data,
          sessionId,
          step: 'CACHE_HIT',
          cacheAge: cacheAge
        };
      }

      // 2. Get from RAG if available
      logger.info('🔍 [CHART_MANAGEMENT] Step 2: Attempting to retrieve charts from RAG', { 
        userId, 
        sessionId,
        step: 'RAG_RETRIEVAL',
        query: query.substring(0, 50)
      });
      
      const ragCharts = await firestoreRAGService.searchChartsByQuery(userId, query);
      
      if (ragCharts.success && ragCharts.charts) {
        logger.info('✅ [CHART_MANAGEMENT] RAG retrieval successful, optimizing charts for LLM', { 
          userId, 
          sessionId,
          step: 'RAG_SUCCESS',
          totalCharts: Object.keys(ragCharts.charts).length,
          chartTypes: Object.keys(ragCharts.charts)
        });
        
        const optimizedCharts = this.optimizeChartsForLLM(ragCharts.charts, query);
        
        // Cache the result
        this.chartCache.set(cacheKey, {
          data: optimizedCharts,
          timestamp: Date.now()
        });

        logger.info('💾 [CHART_MANAGEMENT] Charts cached for future use', { 
          userId, 
          sessionId,
          step: 'CACHE_STORE',
          cacheKey,
          totalRelevantCharts: optimizedCharts.totalRelevantCharts
        });

        const result = {
          ...optimizedCharts,
          sessionId,
          step: 'RAG_SUCCESS',
          source: 'RAG'
        };
        
        // Cache the result
        responseOptimizationService.cacheCharts(userId, result);
        
        return result;
      }

      // 3. Fallback to direct DB if RAG fails
      logger.info('⚠️ [CHART_MANAGEMENT] RAG failed, falling back to direct DB access', { 
        userId, 
        sessionId,
        step: 'RAG_FALLBACK',
        ragError: ragCharts.error || 'Unknown RAG error'
      });
      
      const dbCharts = await firestoreRAGService.getAllUserCharts(userId);
      
      if (dbCharts.success && dbCharts.charts) {
        logger.info('📊 [CHART_MANAGEMENT] DB fallback successful, optimizing charts for LLM', { 
          userId, 
          sessionId,
          step: 'DB_FALLBACK_SUCCESS',
          totalCharts: Object.keys(dbCharts.charts).length,
          chartTypes: Object.keys(dbCharts.charts)
        });
        
        const optimizedCharts = this.optimizeChartsForLLM(dbCharts.charts, query);
        
        // Cache the result
        this.chartCache.set(cacheKey, {
          data: optimizedCharts,
          timestamp: Date.now()
        });

        logger.info('💾 [CHART_MANAGEMENT] Charts cached from DB fallback', { 
          userId, 
          sessionId,
          step: 'CACHE_STORE_FALLBACK',
          cacheKey,
          totalRelevantCharts: optimizedCharts.totalRelevantCharts
        });

        const result = {
          ...optimizedCharts,
          sessionId,
          step: 'DB_FALLBACK_SUCCESS',
          source: 'Database'
        };
        
        // Cache the result
        responseOptimizationService.cacheCharts(userId, result);
        
        return result;
      }

      // 4. Return empty if no charts found
      logger.warn('No charts found for LLM context', { userId });
      return {
        success: false,
        charts: {},
        message: 'No charts available for context'
      };

    } catch (error) {
      logger.error('Error getting charts for LLM context:', error);
      return {
        success: false,
        error: 'Failed to get charts for LLM context',
        message: error.message
      };
    }
  }

  /**
   * Optimize charts for LLM context based on query
   * @param {object} charts - Raw chart data
   * @param {string} query - User query
   * @returns {object} - Optimized chart data
   */
  optimizeChartsForLLM(charts, query) {
    try {
      const optimizedCharts = {};
      const queryLower = query.toLowerCase();

      // Analyze query to determine relevant chart types
      const queryAnalysis = this.analyzeQueryContext(queryLower);

      // Prioritize charts based on query relevance
      Object.keys(charts).forEach(chartType => {
        const chartData = charts[chartType];
        
        if (chartData && chartData.length > 0) {
          // Check if this chart type is relevant to the query
          const relevance = this.calculateChartRelevance(chartType, queryAnalysis);
          
          if (relevance > 0.3) { // Only include relevant charts
            optimizedCharts[chartType] = {
              data: chartData,
              relevance,
              priority: this.getChartPriority(chartType, queryAnalysis)
            };
          }
        }
      });

      // Sort charts by priority and relevance
      const sortedChartTypes = Object.keys(optimizedCharts).sort((a, b) => {
        const aScore = optimizedCharts[a].priority * optimizedCharts[a].relevance;
        const bScore = optimizedCharts[b].priority * optimizedCharts[b].relevance;
        return bScore - aScore;
      });

      // Rebuild charts object with sorted order
      const sortedCharts = {};
      sortedChartTypes.forEach(chartType => {
        sortedCharts[chartType] = optimizedCharts[chartType];
      });

      return {
        success: true,
        charts: sortedCharts,
        queryAnalysis,
        totalRelevantCharts: Object.keys(sortedCharts).length
      };

    } catch (error) {
      logger.error('Error optimizing charts for LLM:', error);
      return charts; // Return original charts if optimization fails
    }
  }

  /**
   * Analyze query context to determine relevant chart types
   * @param {string} query - User query
   * @returns {object} - Query analysis
   */
  analyzeQueryContext(query) {
    const analysis = {
      topics: [],
      chartTypes: [],
      priority: 'medium'
    };

    // Topic detection
    if (query.includes('personality') || query.includes('character') || query.includes('traits')) {
      analysis.topics.push('personality');
      analysis.chartTypes.push('basic', 'planets', 'ascendant');
    }

    if (query.includes('career') || query.includes('job') || query.includes('profession')) {
      analysis.topics.push('career');
      analysis.chartTypes.push('basic', 'planets', 'houses', 'dasha');
    }

    if (query.includes('love') || query.includes('relationship') || query.includes('marriage')) {
      analysis.topics.push('relationships');
      analysis.chartTypes.push('basic', 'planets', 'houses', 'compatibility');
    }

    if (query.includes('health') || query.includes('wellness') || query.includes('medical')) {
      analysis.topics.push('health');
      analysis.chartTypes.push('basic', 'planets', 'houses', 'ashtakvarga');
    }

    if (query.includes('future') || query.includes('prediction') || query.includes('forecast')) {
      analysis.topics.push('predictions');
      analysis.chartTypes.push('dasha', 'predictive', 'transits');
    }

    // Priority determination
    if (analysis.topics.length > 2) {
      analysis.priority = 'high';
    } else if (analysis.topics.length === 1) {
      analysis.priority = 'low';
    }

    return analysis;
  }

  /**
   * Calculate chart relevance to query
   * @param {string} chartType - Type of chart
   * @param {object} queryAnalysis - Query analysis
   * @returns {number} - Relevance score (0-1)
   */
  calculateChartRelevance(chartType, queryAnalysis) {
    let relevance = 0;

    // Basic charts are always relevant
    if (chartType === 'basic') {
      relevance += 0.8;
    }

    // Check if chart type matches query topics
    if (queryAnalysis.chartTypes.includes(chartType)) {
      relevance += 0.6;
    }

    // Specific chart type relevance
    switch (chartType) {
      case 'planets':
        relevance += 0.7;
        break;
      case 'houses':
        relevance += 0.6;
        break;
      case 'dasha':
        if (queryAnalysis.topics.includes('predictions')) {
          relevance += 0.9;
        }
        break;
      case 'ashtakvarga':
        if (queryAnalysis.topics.includes('health')) {
          relevance += 0.8;
        }
        break;
      case 'compatibility':
        if (queryAnalysis.topics.includes('relationships')) {
          relevance += 0.9;
        }
        break;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Get chart priority based on query analysis
   * @param {string} chartType - Type of chart
   * @param {object} queryAnalysis - Query analysis
   * @returns {number} - Priority score (0-1)
   */
  getChartPriority(chartType, queryAnalysis) {
    let priority = 0.5; // Default priority

    // High priority for basic charts
    if (chartType === 'basic') {
      priority = 0.9;
    }

    // High priority for charts matching query topics
    if (queryAnalysis.chartTypes.includes(chartType)) {
      priority = 0.8;
    }

    // Adjust based on query priority
    if (queryAnalysis.priority === 'high') {
      priority += 0.2;
    } else if (queryAnalysis.priority === 'low') {
      priority -= 0.2;
    }

    return Math.max(0.1, Math.min(priority, 1.0));
  }

  /**
   * Generate chart summary for user
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - Chart summary
   */
  async generateChartSummary(userId) {
    try {
      const charts = await firestoreRAGService.getAllUserCharts(userId);
      
      if (!charts.success || !charts.charts) {
        return {
          totalCharts: 0,
          chartTypes: [],
          lastUpdated: null,
          status: 'No charts available'
        };
      }

      const chartTypes = Object.keys(charts.charts);
      const totalCharts = charts.totalCharts || 0;

      return {
        totalCharts,
        chartTypes,
        lastUpdated: new Date(),
        status: 'Charts available',
        summary: `You have ${totalCharts} charts across ${chartTypes.length} categories: ${chartTypes.join(', ')}`
      };

    } catch (error) {
      logger.error('Error generating chart summary:', error);
      return {
        totalCharts: 0,
        chartTypes: [],
        lastUpdated: null,
        status: 'Error generating summary',
        error: error.message
      };
    }
  }

  /**
   * Hash query for cache key generation
   * @param {string} query - User query
   * @returns {string} - Hashed query
   */
  hashQuery(query) {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.chartCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.chartCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.chartCache.size,
      cacheExpiry: this.cacheExpiry,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  /**
   * Get comprehensive system status for debugging
   * @returns {object} - System status information
   */
  getSystemStatus() {
    const now = Date.now();
    const cacheEntries = Array.from(this.chartCache.entries()).map(([key, value]) => ({
      key: key.substring(0, 50) + '...',
      age: Math.round((now - value.timestamp) / 1000),
      dataSize: JSON.stringify(value.data).length
    }));

    return {
      timestamp: new Date().toISOString(),
      service: 'ChartManagementService',
      status: 'operational',
      cache: {
        totalEntries: this.chartCache.size,
        cacheExpiry: this.cacheExpiry,
        memoryUsage: process.memoryUsage().heapUsed,
        entries: cacheEntries.slice(0, 10) // Show first 10 entries
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
  }
}

export default ChartManagementService;

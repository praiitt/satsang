import express from 'express';
import ChartManagementService from '../services/chartManagementService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Initialize the chart management service
const chartManagementService = new ChartManagementService();

/**
 * @route   POST /api/chart-management/login-init
 * @desc    Handle user login and chart initialization
 * @access  Private (requires authentication)
 */
router.post('/login-init', async (req, res) => {
  const requestId = `LOGIN_INIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { userId } = req.body;

    logger.info('🚀 [CHART_MANAGEMENT_ROUTE] Login initialization request received', {
      requestId,
      userId,
      timestamp: new Date().toISOString(),
      step: 'ROUTE_REQUEST_RECEIVED'
    });

    if (!userId) {
      logger.warn('⚠️ [CHART_MANAGEMENT_ROUTE] Missing userId in request', {
        requestId,
        step: 'VALIDATION_FAILED',
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'userId is required',
        requestId
      });
    }

    logger.info('✅ [CHART_MANAGEMENT_ROUTE] Request validation passed, calling chart management service', {
      requestId,
      userId,
      step: 'CALLING_SERVICE'
    });

    const result = await chartManagementService.handleUserLogin(userId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          chartSummary: result.chartSummary,
          totalCharts: result.totalCharts,
          chartTypes: result.chartTypes
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

  } catch (error) {
    logger.error('Error in login-init:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to initialize user charts'
    });
  }
});

/**
 * @route   POST /api/chart-management/generate-charts
 * @desc    Generate comprehensive charts for user
 * @access  Private (requires authentication)
 */
router.post('/generate-charts', async (req, res) => {
  try {
    const { userId, birthData } = req.body;

    if (!userId || !birthData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'userId and birthData are required'
      });
    }

    logger.info('Generating comprehensive charts for user', { userId, name: birthData.name });

    const result = await chartManagementService.generateComprehensiveCharts(userId, birthData);

    if (result.success) {
      // Store charts in dual storage
      const storageResult = await chartManagementService.storeChartsDual(userId, result.charts);

      res.json({
        success: true,
        message: 'Charts generated and stored successfully',
        data: {
          charts: result.charts,
          storage: storageResult,
          chartTypes: Object.keys(result.charts)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

  } catch (error) {
    logger.error('Error generating charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate charts'
    });
  }
});

/**
 * @route   POST /api/chart-management/llm-context
 * @desc    Get charts optimized for LLM context
 * @access  Private (requires authentication)
 */
router.post('/llm-context', async (req, res) => {
  const requestId = `LLM_CTX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { userId, query } = req.body;

    logger.info('🧠 [CHART_MANAGEMENT_ROUTE] LLM context request received', {
      requestId,
      userId,
      query: query ? query.substring(0, 100) : 'No query',
      timestamp: new Date().toISOString(),
      step: 'ROUTE_REQUEST_RECEIVED'
    });

    if (!userId || !query) {
      logger.warn('⚠️ [CHART_MANAGEMENT_ROUTE] Missing required data in LLM context request', {
        requestId,
        step: 'VALIDATION_FAILED',
        hasUserId: !!userId,
        hasQuery: !!query,
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'userId and query are required',
        requestId
      });
    }

    logger.info('✅ [CHART_MANAGEMENT_ROUTE] LLM context request validation passed, calling service', {
      requestId,
      userId,
      step: 'CALLING_SERVICE',
      queryLength: query.length
    });

    const result = await chartManagementService.getChartsForLLMContext(userId, query);

    if (result.success) {
      res.json({
        success: true,
        message: 'Charts retrieved for LLM context',
        data: {
          charts: result.charts,
          queryAnalysis: result.queryAnalysis,
          totalRelevantCharts: result.totalRelevantCharts
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

  } catch (error) {
    logger.error('Error getting LLM context charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get charts for LLM context'
    });
  }
});

/**
 * @route   GET /api/chart-management/summary/:userId
 * @desc    Get chart summary for user
 * @access  Private (requires authentication)
 */
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'userId is required'
      });
    }

    logger.info('Getting chart summary for user', { userId });

    const result = await chartManagementService.generateChartSummary(userId);

    res.json({
      success: true,
      message: 'Chart summary retrieved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Error getting chart summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get chart summary'
    });
  }
});

/**
 * @route   GET /api/chart-management/cache-stats
 * @desc    Get cache statistics
 * @access  Public (for monitoring)
 */
router.get('/cache-stats', (req, res) => {
  try {
    const stats = chartManagementService.getCacheStats();

    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get cache statistics'
    });
  }
});

/**
 * @route   POST /api/chart-management/clear-cache
 * @desc    Clear expired cache entries
 * @access  Public (for maintenance)
 */
router.post('/clear-cache', (req, res) => {
  try {
    chartManagementService.clearExpiredCache();

    res.json({
      success: true,
      message: 'Expired cache entries cleared successfully'
    });

  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to clear cache'
    });
  }
});

/**
 * @route   GET /api/chart-management/system-status
 * @desc    Get comprehensive system status for debugging
 * @access  Public (for monitoring)
 */
router.get('/system-status', (req, res) => {
  try {
    const status = chartManagementService.getSystemStatus();

    res.json({
      success: true,
      message: 'System status retrieved successfully',
      data: status
    });

  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get system status'
    });
  }
});

/**
 * @route   POST /api/chart-management/refresh-charts
 * @desc    Refresh user charts and reload into RAG
 * @access  Private (requires authentication)
 */
router.post('/refresh-charts', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'userId is required'
      });
    }

    logger.info('Refreshing charts for user', { userId });

    // Get existing charts
    const existingCharts = await chartManagementService.generateChartSummary(userId);

    if (existingCharts.totalCharts === 0) {
      return res.status(400).json({
        success: false,
        error: 'No charts found',
        message: 'User has no charts to refresh'
      });
    }

    // Reload charts into RAG
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    const ragResult = await firestoreRAGService.processChartsForRAG(userId);

    if (ragResult.success) {
      res.json({
        success: true,
        message: 'Charts refreshed and reloaded into RAG successfully',
        data: {
          totalCharts: existingCharts.totalCharts,
          chartTypes: existingCharts.chartTypes,
          ragStatus: 'success'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'RAG reload failed',
        message: 'Charts exist but failed to reload into RAG'
      });
    }

  } catch (error) {
    logger.error('Error refreshing charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to refresh charts'
    });
  }
});

export default router;

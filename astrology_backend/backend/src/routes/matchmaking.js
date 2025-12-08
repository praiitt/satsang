import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { matchmakingService } from '../services/matchmakingService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireCoins, deductCoins } from '../middleware/coinMiddleware.js';

// New: history route validation
const historyQuerySchema = Joi.object({
  userId: Joi.string().required()
});

const router = express.Router();

// Validation schemas
const birthDataSchema = Joi.object({
  name: Joi.string().required(),
  day: Joi.number().integer().min(1).max(31).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(1900).max(2100).required(),
  hour: Joi.number().integer().min(0).max(23).required(),
  minute: Joi.number().integer().min(0).max(59).required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  timezone: Joi.number().optional(),
  placeOfBirth: Joi.string().optional()
});

const matchmakingSchema = Joi.object({
  userId: Joi.string().optional(),
  maleData: birthDataSchema.required(),
  femaleData: birthDataSchema.required(),
  matchType: Joi.string().valid('romantic', 'marriage', 'friendship', 'business').optional(),
  focusAreas: Joi.array().items(Joi.string().valid('emotional', 'intellectual', 'physical', 'spiritual', 'financial', 'social', 'communication')).optional()
});

// Comprehensive matchmaking analysis
router.post('/comprehensive-analysis', async (req, res) => {
  try {
    const { error, value } = matchmakingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, maleData, femaleData, matchType = 'marriage', focusAreas = ['emotional', 'intellectual', 'communication'] } = value;

    logger.info('Starting comprehensive matchmaking analysis', {
      male: maleData.name,
      female: femaleData.name,
      matchType,
      focusAreas
    });

    // Get comprehensive analysis using the new service
    const result = await matchmakingService.getMatchmakingAnalysis(maleData, femaleData, matchType, userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate matchmaking analysis'
      });
    }

    res.json({
      success: true,
      analysis: result.analysis,
      chartData: result.chartData,
      matchType,
      focusAreas,
      confidence: result.confidence,
      sources: result.sources,
      male: maleData.name,
      female: femaleData.name,
      importedCharts: result.chartData ? Object.keys(result.chartData.charts) : [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in comprehensive matchmaking analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate matchmaking analysis'
    });
  }
});

// Import specific chart
router.post('/import-chart', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      maleData: birthDataSchema.required(),
      femaleData: birthDataSchema.required(),
      chartType: Joi.string().valid(
        'match_birth_details',
        'match_astro_details', 
        'match_planet_details',
        'match_ashtakoot_points',
        'match_making_report',
        'match_manglik_report',
        'match_obstructions',
        'match_simple_report'
      ).required()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { maleData, femaleData, chartType } = value;

    logger.info('Importing specific matchmaking chart', {
      male: maleData.name,
      female: femaleData.name,
      chartType
    });

    const result = await matchmakingService.getSpecificChart(maleData, femaleData, chartType);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to import chart'
      });
    }

    res.json({
      success: true,
      chartType,
      data: result.data,
      male: maleData.name,
      female: femaleData.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error importing specific chart:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to import chart'
    });
  }
});

// Import all matchmaking charts
router.post('/import-all-charts', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      maleData: birthDataSchema.required(),
      femaleData: birthDataSchema.required()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { maleData, femaleData } = value;

    logger.info('Importing all matchmaking charts', {
      male: maleData.name,
      female: femaleData.name
    });

    const result = await matchmakingService.importMatchmakingCharts(maleData, femaleData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to import charts'
      });
    }

    res.json({
      success: true,
      chartData: result.chartData,
      importedCharts: result.importedCharts,
      male: maleData.name,
      female: femaleData.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error importing all charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to import charts'
    });
  }
});

// Partner exploration chat - NEW FEATURE! 🌟
router.post('/partner-chat', authenticateToken, requireCoins('matchmaking_chat'), async (req, res) => {
  try {
    logger.info('Debug: Partner chat endpoint called', { body: req.body });
    
    const { error, value } = Joi.object({
      userId: Joi.string().required(),
      matchId: Joi.string().optional(), // Optional: specific match to explore
      query: Joi.string().required(),
      perspective: Joi.string().valid('male', 'female').required(), // Who is asking
      conversationHistory: Joi.array().optional(),
      conversationId: Joi.string().optional() // Optional: conversation ID for chat history
    }).validate(req.body);

    if (error) {
      logger.info('Debug: Validation error', { error: error.details[0].message });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, matchId, query, perspective, conversationHistory = [], conversationId = null } = value;

    logger.info('Starting partner exploration chat', {
      userId,
      matchId,
      perspective,
      query: query.substring(0, 50) + '...'
    });

    logger.info('Debug: About to call getMatchmakingDataForChat', { userId, matchId });

    // Get matchmaking data for this user
    const matchmakingData = await matchmakingService.getMatchmakingDataForChat(userId, matchId);
    
    logger.info('Debug: getMatchmakingDataForChat result', { 
      success: matchmakingData.success, 
      error: matchmakingData.error 
    });
    
    if (!matchmakingData.success) {
      return res.status(404).json({
        success: false,
        error: 'No matchmaking data found',
        message: 'Please complete a matchmaking analysis first to explore your partner'
      });
    }

    // Create partner exploration context
    const partnerContext = {
      isPartnerExplorationChat: true,
      perspective: perspective, // 'male' or 'female'
      matchmakingData: matchmakingData.data,
      maleData: matchmakingData.data.maleData,
      femaleData: matchmakingData.data.femaleData,
      matchmakingCharts: matchmakingData.data.chartData,
      compatibilityScore: matchmakingData.data.compatibilityScore,
      matchType: matchmakingData.data.matchType || 'marriage',
      userId: userId,
      conversationHistory: conversationHistory
    };

    // Process the partner exploration query
    const response = await langChainService.processPartnerExplorationQuery(query, partnerContext, conversationHistory);

    if (!response.success) {
      return res.status(500).json({
        success: false,
        error: response.error || 'Failed to process partner exploration query'
      });
    }

    // Generate conversation ID (always needed for response)
    const finalConversationId = conversationId || `matchmaking_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Matchmaking conversation ID handling', {
      receivedConversationId: conversationId,
      generatedConversationId: finalConversationId,
      isNewConversation: !conversationId,
      userId: userId
    });
    
    // Save messages to database for conversation history
    try {
      const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
      
      // Save user message
      await firestoreRAGService.saveChatMessage(
        userId,
        'user',
        query,
        { 
          userContext: partnerContext, 
          perspective: perspective,
          matchId: matchId,
          timestamp: new Date().toISOString() 
        },
        finalConversationId
      );

      // Save assistant response
      await firestoreRAGService.saveChatMessage(
        userId,
        'assistant',
        response.response,
        { 
          confidence: response.confidence,
          sources: response.sources,
          briefAnswer: response.briefAnswer,
          detailedDescription: response.detailedDescription,
          perspective: perspective,
          partnerName: perspective === 'male' ? matchmakingData.data.femaleData.name : matchmakingData.data.maleData.name,
          compatibilityScore: matchmakingData.data.compatibilityScore,
          timestamp: new Date().toISOString()
        },
        finalConversationId
      );

      logger.info('Matchmaking chat messages saved to database', { userId, conversationId: finalConversationId });
    } catch (saveError) {
      logger.error('Error saving matchmaking chat messages:', saveError);
      // Don't fail the request if saving fails
    }

    // Deduct coins for matchmaking chat usage
    const deductResult = await deductCoins('matchmaking_chat')(req, res, () => {});

    res.json({
      success: true,
      response: response.response,
      briefAnswer: response.briefAnswer,
      detailedDescription: response.detailedDescription,
      perspective: perspective,
      partnerName: perspective === 'male' ? matchmakingData.data.femaleData.name : matchmakingData.data.maleData.name,
      compatibilityScore: matchmakingData.data.compatibilityScore,
      confidence: response.confidence,
      sources: response.sources,
      conversationId: finalConversationId,
      coinUsage: res.locals?.coinDeduction || null, // Include coin usage info
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in partner exploration chat:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process partner exploration query'
    });
  }
});

// Health check for matchmaking service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'matchmaking',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Get matchmaking history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = historyQuerySchema.validate({ userId });
    if (error) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }

    const rows = await matchmakingService.getMatchmakingHistory(userId);
    return res.json({ success: true, items: rows });
  } catch (err) {
    logger.error('Error fetching matchmaking history:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 
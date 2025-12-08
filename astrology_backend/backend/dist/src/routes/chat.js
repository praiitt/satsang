import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation schemas
const chatQuerySchema = Joi.object({
  query: Joi.string().required().min(1).max(1000),
  userContext: Joi.object({
    userId: Joi.string().optional(),
    birthData: Joi.object({
      name: Joi.string().optional(),
      day: Joi.number().integer().min(1).max(31).optional(),
      month: Joi.number().integer().min(1).max(12).optional(),
      year: Joi.number().integer().min(1900).max(2100).optional(),
      hour: Joi.number().integer().min(0).max(23).optional(),
      minute: Joi.number().integer().min(0).max(59).optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      place_of_birth: Joi.string().allow('').optional(),
      birthDate: Joi.string().optional(),
      birthTime: Joi.string().optional(),
      placeOfBirth: Joi.string().optional()
    }).optional(),
    userProfile: Joi.object().optional(),
    person1Data: Joi.object().optional(),
    person2Data: Joi.object().optional(),
    // Matchmaking context fields
    isMatchmakingChat: Joi.boolean().optional(),
    hasCompleteChartData: Joi.boolean().optional(),
    maleData: Joi.object({
      name: Joi.string().optional(),
      day: Joi.number().integer().min(1).max(31).optional(),
      month: Joi.number().integer().min(1).max(12).optional(),
      year: Joi.number().integer().min(1900).max(2100).optional(),
      hour: Joi.number().integer().min(0).max(23).optional(),
      minute: Joi.number().integer().min(0).max(59).optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      timezone: Joi.number().optional(),
      placeOfBirth: Joi.string().optional()
    }).optional(),
    femaleData: Joi.object({
      name: Joi.string().optional(),
      day: Joi.number().integer().min(1).max(31).optional(),
      month: Joi.number().integer().min(1).max(12).optional(),
      year: Joi.number().integer().min(1900).max(2100).optional(),
      hour: Joi.number().integer().min(0).max(23).optional(),
      minute: Joi.number().integer().min(0).max(59).optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      timezone: Joi.number().optional(),
      placeOfBirth: Joi.string().optional()
    }).optional(),
    matchmakingCharts: Joi.object().optional(),
    compatibilityScore: Joi.number().min(0).max(100).optional(),
    matchType: Joi.string().optional()
  }).optional(),
  conversationHistory: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().required(),
      timestamp: Joi.date().optional()
    })
  ).optional()
});

const birthChartSchema = Joi.object({
  birthData: Joi.object({
    name: Joi.string().required(),
    birthDate: Joi.string().required(),
    birthTime: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    placeOfBirth: Joi.string().optional()
  }).required()
});

const readingSchema = Joi.object({
  readingType: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'career', 'love', 'health', 'spiritual').required(),
  birthData: Joi.object({
    name: Joi.string().required(),
    birthDate: Joi.string().required(),
    birthTime: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required()
  }).required(),
  focus: Joi.string().optional()
});

// Main chat endpoint
router.post('/', optionalAuth, async (req, res) => {
  try {
    // Validate request
    const { error, value } = chatQuerySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { query, userContext = {}, conversationHistory = [] } = value;

    logger.info('Processing chat query', {
      query: query.substring(0, 100),
      userId: userContext.userId,
      hasBirthData: !!userContext.birthData
    });

    // Process query with LangChain
    const response = await langChainService.processChatQuery(query, userContext, conversationHistory);

    if (!response.success) {
      return res.status(500).json({
        ...response,
        timestamp: new Date().toISOString(),
        success: false
      });
    }

    // Log successful response
    logger.info('Chat query processed successfully', {
      userId: userContext.userId,
      responseLength: response.response.length,
      confidence: response.confidence
    });

    res.json({
      ...response,
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    logger.error('Error in chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process chat query'
    });
  }
});

// Analyze birth chart endpoint
router.post('/analyze-birth-chart', async (req, res) => {
  try {
    // Validate request
    const { error, value } = birthChartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid birth data',
        details: error.details[0].message
      });
    }

    const { birthData } = value;

    logger.info('Analyzing birth chart', {
      name: birthData.name,
      birthDate: birthData.birthDate
    });

    // Process birth chart analysis
    const response = await langChainService.processChatQuery(
      'Please analyze my birth chart and provide detailed insights about my personality, strengths, challenges, and life path.',
      { birthData }
    );

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      analysis: response.response,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in birth chart analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze birth chart'
    });
  }
});

// Get personalized reading endpoint
router.post('/get-reading', async (req, res) => {
  try {
    // Validate request
    const { error, value } = readingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reading request',
        details: error.details[0].message
      });
    }

    const { readingType, birthData, focus } = value;

    logger.info('Getting personalized reading', {
      readingType,
      name: birthData.name,
      focus
    });

    // Process reading request
    const query = focus 
      ? `Please provide a detailed ${readingType} reading focusing on ${focus} aspects of my life.`
      : `Please provide a comprehensive ${readingType} reading based on my birth chart.`;

    const response = await langChainService.processChatQuery(query, { birthData });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      reading: response.response,
      readingType,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in personalized reading:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get personalized reading'
    });
  }
});

// Get current transits endpoint
router.post('/current-transits', async (req, res) => {
  try {
    // Validate request
    const { error, value } = birthChartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid birth data',
        details: error.details[0].message
      });
    }

    const { birthData } = value;

    logger.info('Getting current transits', {
      name: birthData.name
    });

    // Process transit request
    const response = await langChainService.processChatQuery(
      'Please analyze the current planetary transits and how they are affecting my birth chart. What should I be aware of and how can I work with these energies?',
      { birthData }
    );

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      transits: response.response,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in current transits:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get current transits'
    });
  }
});

// Health check for chat service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'chat',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 
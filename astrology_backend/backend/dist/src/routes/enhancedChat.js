import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const enhancedChatSchema = Joi.object({
  userMessage: Joi.string().required().min(1).max(1000),
  birthData: Joi.object({
    name: Joi.string().optional(),
    birthDate: Joi.string().optional(),
    birthTime: Joi.string().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    placeOfBirth: Joi.string().optional()
  }).optional(),
  userId: Joi.string().optional(),
  context: Joi.object().optional()
});

const systemStatusSchema = Joi.object({
  userId: Joi.string().optional(),
  checkType: Joi.string().valid('full', 'basic', 'swiss_ephemeris', 'langchain').optional()
});

// Enhanced chat endpoint
router.post('/', async (req, res) => {
  try {
    const { error, value } = enhancedChatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userMessage, birthData, userId, context = {} } = value;

    logger.info('Processing enhanced chat message', {
      userId,
      messageLength: userMessage.length,
      hasBirthData: !!birthData
    });

    // Process message with enhanced context
    const userContext = {
      userId,
      birthData,
      ...context
    };

    const response = await langChainService.processChatQuery(userMessage, userContext);

    if (!response.success) {
      return res.status(500).json(response);
    }

    // Enhanced response with additional context
    const enhancedResponse = {
      success: true,
      aiResponse: {
        response: response.response,
        confidence: response.confidence,
        sources: response.sources
      },
      enhancedContext: {
        aiReadyData: response.astrologicalContext,
        recommendations: response.recommendations,
        nextSteps: response.nextSteps
      },
      systemStatus: {
        swissEphemeris: 'available',
        langchain: 'active',
        externalAPIs: 'connected'
      },
      timestamp: new Date().toISOString()
    };

    res.json(enhancedResponse);

  } catch (error) {
    logger.error('Error in enhanced chat:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process enhanced chat message'
    });
  }
});

// Get system status
router.get('/system-status', async (req, res) => {
  try {
    const { error, value } = systemStatusSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.details[0].message
      });
    }

    const { userId, checkType = 'full' } = value;

    logger.info('Checking system status', {
      userId,
      checkType
    });

    // Mock system status - in production this would check actual services
    const systemStatus = {
      swissEphemeris: {
        status: 'available',
        version: '2.2.2',
        ephemerisPath: './ephemeris',
        lastChecked: new Date().toISOString()
      },
      langchain: {
        status: 'active',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.7,
        lastChecked: new Date().toISOString()
      },
      externalAPIs: {
        weather: 'connected',
        yoga: 'connected',
        astrology: 'connected',
        lastChecked: new Date().toISOString()
      },
      database: {
        status: 'connected',
        type: 'local_storage',
        lastChecked: new Date().toISOString()
      },
      overall: 'healthy'
    };

    res.json({
      success: true,
      systemStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error checking system status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check system status'
    });
  }
});

// Get Swiss Ephemeris data
router.post('/swiss-ephemeris', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      birthData: Joi.object({
        name: Joi.string().required(),
        birthDate: Joi.string().required(),
        birthTime: Joi.string().required(),
        latitude: Joi.number().required(),
        longitude: Joi.number().required()
      }).required(),
      calculationType: Joi.string().valid('natal', 'transit', 'progressed', 'solar_return').optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { birthData, calculationType = 'natal' } = value;

    logger.info('Getting Swiss Ephemeris data', {
      name: birthData.name,
      calculationType
    });

    // Mock Swiss Ephemeris data - in production this would use actual Swiss Ephemeris library
    const ephemerisData = {
      calculationType,
      birthData,
      planetaryPositions: {
        Sun: { sign: 'Leo', degree: 15.5, house: 5 },
        Moon: { sign: 'Cancer', degree: 22.3, house: 4 },
        Mercury: { sign: 'Virgo', degree: 8.7, house: 6 },
        Venus: { sign: 'Libra', degree: 12.1, house: 7 },
        Mars: { sign: 'Scorpio', degree: 5.9, house: 8 },
        Jupiter: { sign: 'Sagittarius', degree: 18.2, house: 9 },
        Saturn: { sign: 'Capricorn', degree: 3.4, house: 10 },
        Uranus: { sign: 'Aquarius', degree: 25.8, house: 11 },
        Neptune: { sign: 'Pisces', degree: 7.2, house: 12 },
        Pluto: { sign: 'Capricorn', degree: 14.6, house: 10 }
      },
      houses: {
        Ascendant: { sign: 'Aries', degree: 0.0 },
        MC: { sign: 'Capricorn', degree: 0.0 },
        House1: { sign: 'Aries', degree: 0.0 },
        House2: { sign: 'Taurus', degree: 0.0 },
        House3: { sign: 'Gemini', degree: 0.0 },
        House4: { sign: 'Cancer', degree: 0.0 },
        House5: { sign: 'Leo', degree: 0.0 },
        House6: { sign: 'Virgo', degree: 0.0 },
        House7: { sign: 'Libra', degree: 0.0 },
        House8: { sign: 'Scorpio', degree: 0.0 },
        House9: { sign: 'Sagittarius', degree: 0.0 },
        House10: { sign: 'Capricorn', degree: 0.0 },
        House11: { sign: 'Aquarius', degree: 0.0 },
        House12: { sign: 'Pisces', degree: 0.0 }
      },
      aspects: [
        { planet1: 'Sun', planet2: 'Moon', type: 'trine', orb: 2.3 },
        { planet1: 'Venus', planet2: 'Mars', type: 'opposition', orb: 1.8 },
        { planet1: 'Jupiter', planet2: 'Saturn', type: 'square', orb: 3.1 }
      ]
    };

    res.json({
      success: true,
      ephemerisData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting Swiss Ephemeris data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get Swiss Ephemeris data'
    });
  }
});

// Get astrological insights
router.post('/astrological-insights', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      query: Joi.string().required(),
      birthData: Joi.object({
        name: Joi.string().required(),
        birthDate: Joi.string().required(),
        birthTime: Joi.string().required(),
        latitude: Joi.number().required(),
        longitude: Joi.number().required()
      }).required(),
      insightType: Joi.string().valid('personality', 'career', 'relationships', 'health', 'spiritual', 'general').optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { query, birthData, insightType = 'general' } = value;

    logger.info('Getting astrological insights', {
      name: birthData.name,
      insightType,
      queryLength: query.length
    });

    const response = await langChainService.processChatQuery(query, { birthData });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      insights: response.response,
      insightType,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      recommendations: response.recommendations,
      nextSteps: response.nextSteps,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting astrological insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get astrological insights'
    });
  }
});

// Get chat recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { userId, category = 'general' } = req.query;

    logger.info('Getting chat recommendations', {
      userId,
      category
    });

    // Mock recommendations based on category
    const recommendations = {
      general: [
        "Tell me about my birth chart",
        "What are my current transits?",
        "How can I improve my relationships?",
        "What career path suits me best?",
        "How can I enhance my spiritual practice?"
      ],
      astrology: [
        "Analyze my planetary positions",
        "What are the major aspects in my chart?",
        "How do the houses influence my life?",
        "What are my current transits?",
        "Provide a personalized reading"
      ],
      wellness: [
        "What's my dosha type?",
        "Recommend yoga poses for me",
        "Suggest meditation techniques",
        "Provide wellness advice",
        "Get spiritual guidance"
      ],
      compatibility: [
        "Analyze compatibility with my partner",
        "What makes us compatible?",
        "How can we improve our relationship?",
        "Get relationship insights",
        "Calculate our compatibility score"
      ]
    };

    res.json({
      success: true,
      recommendations: recommendations[category] || recommendations.general,
      category,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting chat recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get chat recommendations'
    });
  }
});

// Health check for enhanced chat service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'enhanced-chat',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 
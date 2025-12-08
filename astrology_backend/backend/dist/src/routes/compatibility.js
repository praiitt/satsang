import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const birthDataSchema = Joi.object({
  name: Joi.string().required(),
  birthDate: Joi.string().required(),
  birthTime: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  placeOfBirth: Joi.string().optional()
});

const compatibilitySchema = Joi.object({
  person1Data: birthDataSchema.required(),
  person2Data: birthDataSchema.required(),
  relationshipType: Joi.string().valid('romantic', 'friendship', 'business', 'family', 'general').optional(),
  focusAreas: Joi.array().items(Joi.string().valid('communication', 'emotional', 'intellectual', 'physical', 'spiritual', 'financial', 'social')).optional()
});

const groupCompatibilitySchema = Joi.object({
  groupMembers: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      birthDate: Joi.string().required(),
      birthTime: Joi.string().required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      role: Joi.string().optional()
    })
  ).min(2).max(10).required(),
  groupType: Joi.string().valid('family', 'work', 'friendship', 'romantic', 'spiritual', 'business').optional(),
  analysisFocus: Joi.string().valid('dynamics', 'leadership', 'communication', 'harmony', 'conflict', 'growth').optional()
});

// Analyze compatibility between two people
router.post('/analyze', async (req, res) => {
  try {
    const { error, value } = compatibilitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { person1Data, person2Data, relationshipType = 'romantic', focusAreas = ['communication', 'emotional', 'intellectual'] } = value;

    logger.info('Analyzing compatibility', {
      person1: person1Data.name,
      person2: person2Data.name,
      relationshipType,
      focusAreas
    });

    // Create compatibility analysis query
    const query = `Please analyze the compatibility between ${person1Data.name} and ${person2Data.name} for a ${relationshipType} relationship. Focus on ${focusAreas.join(', ')} aspects and provide detailed insights about their compatibility, challenges, and opportunities.`;

    const response = await langChainService.processChatQuery(query, {
      person1Data,
      person2Data
    });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      compatibility: response.response,
      relationshipType,
      focusAreas,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      person1: person1Data.name,
      person2: person2Data.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in compatibility analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze compatibility'
    });
  }
});

// Get relationship insights for specific aspects
router.post('/relationship-insights', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      person1Data: birthDataSchema.required(),
      person2Data: birthDataSchema.required(),
      aspect: Joi.string().valid('sun_moon', 'venus_mars', 'mercury_mercury', 'jupiter_saturn', 'ascendant', 'midheaven', 'composite').required(),
      timeFrame: Joi.string().valid('current', 'monthly', 'yearly', 'long_term').optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { person1Data, person2Data, aspect, timeFrame = 'current' } = value;

    logger.info('Getting relationship insights', {
      person1: person1Data.name,
      person2: person2Data.name,
      aspect,
      timeFrame
    });

    const query = `Please provide detailed insights about the ${aspect} aspect between ${person1Data.name} and ${person2Data.name} for the ${timeFrame} time frame. Explain how this aspect influences their relationship dynamics.`;

    const response = await langChainService.processChatQuery(query, {
      person1Data,
      person2Data
    });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      insights: response.response,
      aspect,
      timeFrame,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      person1: person1Data.name,
      person2: person2Data.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in relationship insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get relationship insights'
    });
  }
});

// Calculate synastry chart
router.post('/synastry', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      person1Data: birthDataSchema.required(),
      person2Data: birthDataSchema.required(),
      chartType: Joi.string().valid('synastry', 'composite', 'davison').optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { person1Data, person2Data, chartType = 'synastry' } = value;

    logger.info('Calculating synastry chart', {
      person1: person1Data.name,
      person2: person2Data.name,
      chartType
    });

    const query = `Please calculate and analyze the ${chartType} chart between ${person1Data.name} and ${person2Data.name}. Provide detailed insights about their relationship dynamics, strengths, challenges, and potential for growth.`;

    const response = await langChainService.processChatQuery(query, {
      person1Data,
      person2Data
    });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      synastryChart: response.response,
      chartType,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      person1: person1Data.name,
      person2: person2Data.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in synastry calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to calculate synastry chart'
    });
  }
});

// Get compatibility score
router.post('/compatibility-score', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      person1Data: birthDataSchema.required(),
      person2Data: birthDataSchema.required(),
      scoringMethod: Joi.string().valid('harmonic', 'aspect_based', 'elemental', 'comprehensive').optional(),
      includeAreas: Joi.array().items(Joi.string().valid('emotional', 'intellectual', 'physical', 'spiritual', 'communication', 'values', 'lifestyle')).optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { person1Data, person2Data, scoringMethod = 'comprehensive', includeAreas = ['emotional', 'intellectual', 'communication'] } = value;

    logger.info('Calculating compatibility score', {
      person1: person1Data.name,
      person2: person2Data.name,
      scoringMethod,
      includeAreas
    });

    const query = `Please calculate a comprehensive compatibility score between ${person1Data.name} and ${person2Data.name} using ${scoringMethod} method. Focus on ${includeAreas.join(', ')} areas and provide detailed analysis with numerical scores.`;

    const response = await langChainService.processChatQuery(query, {
      person1Data,
      person2Data
    });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      compatibilityScore: response.response,
      scoringMethod,
      includeAreas,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      person1: person1Data.name,
      person2: person2Data.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in compatibility score calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to calculate compatibility score'
    });
  }
});

// Get relationship forecast
router.post('/relationship-forecast', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      person1Data: birthDataSchema.required(),
      person2Data: birthDataSchema.required(),
      forecastPeriod: Joi.string().valid('3_months', '6_months', '1_year', '2_years', '5_years').optional(),
      focusEvents: Joi.array().items(Joi.string().valid('communication', 'emotional', 'commitment', 'challenges', 'growth', 'harmony')).optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { person1Data, person2Data, forecastPeriod = '1_year', focusEvents = ['communication', 'emotional', 'growth'] } = value;

    logger.info('Getting relationship forecast', {
      person1: person1Data.name,
      person2: person2Data.name,
      forecastPeriod,
      focusEvents
    });

    const query = `Please provide a ${forecastPeriod} relationship forecast for ${person1Data.name} and ${person2Data.name}. Focus on ${focusEvents.join(', ')} events and provide insights about their relationship development.`;

    const response = await langChainService.processChatQuery(query, {
      person1Data,
      person2Data
    });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      relationshipForecast: response.response,
      forecastPeriod,
      focusEvents,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      person1: person1Data.name,
      person2: person2Data.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in relationship forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get relationship forecast'
    });
  }
});

// Analyze group compatibility
router.post('/group-analysis', async (req, res) => {
  try {
    const { error, value } = groupCompatibilitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { groupMembers, groupType = 'friendship', analysisFocus = 'dynamics' } = value;

    logger.info('Analyzing group compatibility', {
      memberCount: groupMembers.length,
      groupType,
      analysisFocus
    });

    const memberNames = groupMembers.map(member => member.name).join(', ');
    const query = `Please analyze the group compatibility for a ${groupType} group consisting of ${memberNames}. Focus on ${analysisFocus} and provide insights about group dynamics, potential challenges, and opportunities for harmony.`;

    const response = await langChainService.processChatQuery(query, {
      groupMembers
    });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      groupAnalysis: response.response,
      groupType,
      analysisFocus,
      memberCount: groupMembers.length,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in group compatibility analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze group compatibility'
    });
  }
});

// Health check for compatibility service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'compatibility',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 
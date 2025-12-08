import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { matchmakingService } from '../services/matchmakingService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

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

    const { maleData, femaleData, matchType = 'marriage', focusAreas = ['emotional', 'intellectual', 'communication'] } = value;

    logger.info('Starting comprehensive matchmaking analysis', {
      male: maleData.name,
      female: femaleData.name,
      matchType,
      focusAreas
    });

    // Get comprehensive analysis using the new service
    const result = await matchmakingService.getMatchmakingAnalysis(maleData, femaleData, matchType);

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

// Health check for matchmaking service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'matchmaking',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 
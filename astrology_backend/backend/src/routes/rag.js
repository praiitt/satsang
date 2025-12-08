import express from 'express';
import { firestoreRAGService } from '../services/firestoreRAGService.js';
import { astrologyAPIService } from '../services/astrologyAPIService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const birthDataSchema = Joi.object({
  name: Joi.string().optional(), // Made optional since user name is in userData.name
  
  // Support both formats: individual fields and combined date/time
  day: Joi.number().integer().min(1).max(31).optional(),
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(1900).max(2100).optional(),
  hour: Joi.number().integer().min(0).max(23).optional(),
  minute: Joi.number().integer().min(0).max(59).optional(),
  
  // Alternative format from auth signup
  birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  birthTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  timezone: Joi.number().optional(),
  placeOfBirth: Joi.string().optional(),
  place_of_birth: Joi.string().optional() // Support both naming conventions
}).custom((value, helpers) => {
  // Validate that either individual fields OR combined date/time is provided
  const hasIndividualFields = value.day && value.month && value.year && value.hour !== undefined && value.minute !== undefined;
  const hasCombinedFields = value.birthDate && value.birthTime;
  
  if (!hasIndividualFields && !hasCombinedFields) {
    return helpers.error('any.invalid', { message: 'Either provide day/month/year/hour/minute OR birthDate/birthTime' });
  }
  
  return value;
});

const querySchema = Joi.object({
  userId: Joi.string().required(),
  query: Joi.string().required().min(1).max(500)
});

// Store user profile in RAG
router.post('/store-user-profile', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      userId: Joi.string().required(),
      userData: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().optional(),
        birthData: birthDataSchema.required(),
        preferences: Joi.object().optional()
      }).required()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, userData } = value;

    logger.info('Storing user profile in RAG', { userId });

    // Store user profile data
    const profileData = {
      userId,
      type: 'user_profile',
      name: userData.name,
      email: userData.email,
      birthData: userData.birthData,
      preferences: userData.preferences,
      timestamp: new Date().toISOString()
    };

    const result = await firestoreRAGService.storeUserProfile(userId, profileData);

    if (result.success) {
      res.json({
        success: true,
        message: 'User profile stored successfully',
        documentCount: result.documentCount
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to store user profile',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('Error storing user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to store user profile'
    });
  }
});

// Store chart data in RAG
router.post('/store-chart-data', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      userId: Joi.string().required(),
      chartData: Joi.object({
        type: Joi.string().required(),
        data: Joi.object().required()
      }).required()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, chartData } = value;

    logger.info('Storing chart data in RAG', { userId, chartType: chartData.type });

    const result = await firestoreRAGService.storeChartData(userId, {
      ...chartData.data,
      userId,
      type: chartData.type
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Chart data stored successfully',
        documentCount: result.documentCount
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to store chart data',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('Error storing chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to store chart data'
    });
  }
});

// Get comprehensive chart data for user
router.post('/get-comprehensive-chart', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      userId: Joi.string().required(),
      birthData: birthDataSchema.required()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, birthData } = value;

    logger.info('Getting comprehensive chart data', { userId });

    const result = await astrologyAPIService.getComprehensiveChart(userId, birthData);

    if (result.success) {
      res.json({
        success: true,
        charts: result.charts,
        errors: result.errors || [],
        message: 'Comprehensive chart data generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get comprehensive chart',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('Error getting comprehensive chart:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get comprehensive chart'
    });
  }
});

// Get chart data for specific query
router.post('/get-chart-for-query', async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, query } = value;

    logger.info('Getting chart data for query', { userId, query });

    // First, try to get from RAG
    const ragResult = await firestoreRAGService.searchChartsByQuery(userId, query);

    if (ragResult.success && ragResult.charts && Object.keys(ragResult.charts).length > 0) {
      // Found relevant charts in RAG
      res.json({
        success: true,
        charts: ragResult.charts,
        source: 'RAG',
        message: 'Retrieved relevant charts from RAG'
      });
    } else {
      // No charts in RAG, need to fetch from API
      // This would require birth data, so we'll return an error
      res.status(404).json({
        success: false,
        error: 'No chart data available',
        message: 'Please generate comprehensive chart data first'
      });
    }
  } catch (error) {
    logger.error('Error getting chart for query:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get chart for query'
    });
  }
});

// Get all user charts
router.get('/user-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Getting all user charts', { userId });

    const result = await firestoreRAGService.getAllUserCharts(userId);

    if (result.success) {
      res.json({
        success: true,
        charts: result.charts,
        totalCharts: result.totalCharts
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No chart data found',
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Error getting user charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user charts'
    });
  }
});

// Delete user charts
router.delete('/user-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Deleting user charts', { userId });

    const result = await firestoreRAGService.deleteUserCharts(userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User charts deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete user charts',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('Error deleting user charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete user charts'
    });
  }
});

// Check if user has charts
router.get('/user-charts/:userId/exists', async (req, res) => {
  try {
    const { userId } = req.params;

    const hasCharts = await firestoreRAGService.hasUserCharts(userId);

    res.json({
      success: true,
      hasCharts,
      userId
    });
  } catch (error) {
    logger.error('Error checking user charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check user charts'
    });
  }
});

export default router; 
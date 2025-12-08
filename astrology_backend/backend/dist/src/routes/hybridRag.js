import express from 'express';
import { hybridRAGService } from '../services/hybridRAGService.js';
import { astrologyAPIService } from '../services/astrologyAPIService.js';
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
  timezone: Joi.number().optional()
});

const querySchema = Joi.object({
  userId: Joi.string().required(),
  query: Joi.string().required().min(1).max(500)
});

// Store user profile in hybrid system
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

    logger.info('Storing user profile in hybrid system', { userId });

    const result = await hybridRAGService.storeUserProfile(userId, userData);

    if (result.success) {
      res.json({
        success: true,
        message: 'User profile stored successfully in database',
        storage: 'Database + RAG'
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

// Store chart data in hybrid system
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

    logger.info('Storing chart data in hybrid system', { userId, chartType: chartData.type });

    const result = await hybridRAGService.storeUserChartData(userId, {
      ...chartData.data,
      userId,
      type: chartData.type
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Chart data stored successfully in hybrid system',
        documentCount: result.documentCount,
        storage: 'Database + RAG'
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

    logger.info('Getting comprehensive chart data using hybrid system', { userId });

    const result = await astrologyAPIService.getComprehensiveChart(userId, birthData);

    if (result.success) {
      res.json({
        success: true,
        charts: result.charts,
        errors: result.errors || [],
        message: 'Comprehensive chart data generated and stored in hybrid system',
        storage: 'Database + RAG'
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

// Get chart data for specific query using hybrid RAG
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

    logger.info('Getting chart data for query using hybrid RAG', { userId, query });

    const result = await hybridRAGService.retrieveRelevantCharts(userId, query);

    if (result.success && result.charts && Object.keys(result.charts).length > 0) {
      res.json({
        success: true,
        charts: result.charts,
        source: 'Hybrid RAG (Database + Semantic Search)',
        message: 'Retrieved relevant charts using hybrid approach',
        totalResults: result.totalResults
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No chart data available',
        message: 'Please generate comprehensive chart data first',
        suggestion: 'Use /get-comprehensive-chart endpoint to generate charts'
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

// Get all user charts from database
router.get('/user-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Getting all user charts from database', { userId });

    const result = await hybridRAGService.getAllUserCharts(userId);

    if (result.success) {
      res.json({
        success: true,
        charts: result.charts,
        totalCharts: result.totalCharts,
        source: 'Database'
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

// Get user profile from database
router.get('/user-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Getting user profile from database', { userId });

    const profile = await hybridRAGService.getUserProfile(userId);

    if (profile) {
      res.json({
        success: true,
        profile: profile,
        source: 'Database'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User profile not found',
        message: 'No profile data available for this user'
      });
    }
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
});

// Delete user charts from hybrid system
router.delete('/user-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Deleting user charts from hybrid system', { userId });

    const result = await hybridRAGService.deleteUserCharts(userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'User charts deleted successfully from hybrid system',
        storage: 'Database + RAG'
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

    const hasCharts = await hybridRAGService.hasUserCharts(userId);

    res.json({
      success: true,
      hasCharts,
      userId,
      source: 'Database'
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

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await hybridRAGService.getDatabaseStats();

    if (stats) {
      res.json({
        success: true,
        stats: stats,
        source: 'Database'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get database statistics'
      });
    }
  } catch (error) {
    logger.error('Error getting database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get database statistics'
    });
  }
});

// Import existing charts to RAG system
router.post('/import-charts-to-rag/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.info('Importing existing charts to RAG', { userId });
    
    const result = await hybridRAGService.importExistingChartsToRAG(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Charts imported to RAG successfully',
        importedCount: result.importedCount
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to import charts to RAG'
      });
    }
  } catch (error) {
    logger.error('Error importing charts to RAG:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to import charts to RAG'
    });
  }
});

// Get user's contacts
router.get('/user-contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.info('Getting user contacts', { userId });
    
    const result = await hybridRAGService.getUserContacts(userId);
    
    if (result.success) {
      res.json({
        success: true,
        contacts: result.contacts
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get contacts'
      });
    }
  } catch (error) {
    logger.error('Error getting user contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get contacts'
    });
  }
});

// Store user contact
router.post('/user-contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const contactData = req.body;
    
    logger.info('Storing user contact', { userId, contactName: contactData.name });
    
    const result = await hybridRAGService.storeUserContact(userId, contactData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Contact stored successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to store contact'
      });
    }
  } catch (error) {
    logger.error('Error storing user contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to store contact'
    });
  }
});

// Update contact's chart data
router.put('/user-contacts/:userId/:contactName/chart-data', async (req, res) => {
  try {
    const { userId, contactName } = req.params;
    const { chartData } = req.body;
    
    logger.info('Updating contact chart data', { userId, contactName });
    
    const result = await hybridRAGService.updateContactChartData(userId, contactName, chartData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Contact chart data updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to update contact chart data'
      });
    }
  } catch (error) {
    logger.error('Error updating contact chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update contact chart data'
    });
  }
});

export default router; 
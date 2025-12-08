import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { firestoreRAGService } from '../services/firestoreRAGService.js';
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
  hour: Joi.number().integer().min(0).max(23).optional(),
  minute: Joi.number().integer().min(0).max(59).optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  place_of_birth: Joi.string().allow('').optional(),
  timezone: Joi.number().optional()
});

const comprehensiveAnalysisSchema = Joi.object({
  userId: Joi.string().required(),
  birthData: birthDataSchema.required(),
  analysisType: Joi.string().valid('comprehensive', 'personality', 'career', 'love', 'health', 'spiritual').optional()
});

const chartImportSchema = Joi.object({
  userId: Joi.string().required(),
  birthData: birthDataSchema.required()
});

// Comprehensive astrological analysis
router.post('/comprehensive-analysis', async (req, res) => {
  try {
    const { error, value } = comprehensiveAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, birthData, analysisType = 'comprehensive' } = value;

    logger.info('Starting comprehensive astrological analysis', {
      userId,
      name: birthData.name,
      analysisType
    });

    // Generate comprehensive analysis query
    let query;
    switch (analysisType) {
      case 'personality':
        query = 'Please provide a detailed analysis of my personality traits, strengths, weaknesses, and behavioral patterns based on my birth chart.';
        break;
      case 'career':
        query = 'Please analyze my career potential, suitable professions, work style, and professional development based on my birth chart.';
        break;
      case 'love':
        query = 'Please provide insights about my love life, relationship patterns, romantic compatibility, and what I seek in partnerships based on my birth chart.';
        break;
      case 'health':
        query = 'Please analyze my health predispositions, wellness areas to focus on, and lifestyle recommendations based on my birth chart.';
        break;
      case 'spiritual':
        query = 'Please provide spiritual insights, soul purpose, karmic lessons, and spiritual development path based on my birth chart.';
        break;
      default:
        query = 'Please provide a comprehensive analysis of my birth chart including personality, career, relationships, health, and spiritual aspects.';
    }

    const response = await langChainService.processChatQuery(query, { userId, birthData });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      analysis: response.response,
      analysisType,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      recommendations: response.recommendations,
      nextSteps: response.nextSteps,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in comprehensive analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to perform comprehensive analysis'
    });
  }
});

// Import astrological charts
router.post('/import-charts', async (req, res) => {
  try {
    const { error, value } = chartImportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chart import data',
        details: error.details[0].message
      });
    }

    const { userId, birthData } = value;

    logger.info('Importing astrological charts', {
      userId,
      name: birthData.name
    });

    // Use the external API service to generate actual chart data
    const astrologyService = astrologyAPIService;
    
    // Generate comprehensive chart data for the user
    const chartResults = await astrologyService.getComprehensiveChart(userId, birthData);
    
    if (!chartResults.success) {
      logger.error('Failed to import user charts via external API', {
        userId,
        name: birthData.name,
        error: chartResults.error
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to import charts via external API',
        message: chartResults.error
      });
    }

    // Store user profile in hybrid RAG service
    await firestoreRAGService.storeUserProfile(userId, {
      name: birthData.name,
      birthData: JSON.stringify(birthData)
    });

    // Store chart data in hybrid RAG service
    await firestoreRAGService.storeChartData(userId, chartResults.data);

    logger.info('User charts imported successfully', {
      userId,
      name: birthData.name,
      chartTypes: chartResults.charts ? chartResults.charts.map(chart => chart.type) : []
    });

    res.json({
      success: true,
      charts: chartResults.charts || [],
      analysis: `Comprehensive astrological charts have been generated for ${birthData.name}`,
      confidence: 0.9,
      sources: ['External Astrology API'],
      astrologicalContext: {
        chartTypes: chartResults.charts ? chartResults.charts.map(chart => chart.type) : [],
        totalCharts: chartResults.charts ? chartResults.charts.length : 0
      },
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in chart import:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to import charts'
    });
  }
});

// Import contact astrological charts
router.post('/import-contact-charts', async (req, res) => {
  try {
    console.log('Received contact chart import request:', req.body);
    
    const { error, value } = Joi.object({
      userId: Joi.string().required(),
      contactId: Joi.string().required(),
      contactName: Joi.string().required(),
      birthData: Joi.object({
        name: Joi.string().required(),
        day: Joi.number().integer().min(1).max(31).required(),
        month: Joi.number().integer().min(1).max(12).required(),
        year: Joi.number().integer().min(1900).max(2100).required(),
        hour: Joi.number().integer().min(0).max(23).optional(),
        minute: Joi.number().integer().min(0).max(59).optional(),
        latitude: Joi.number().optional(),
        longitude: Joi.number().optional(),
        place_of_birth: Joi.string().allow('').optional(),
        timezone: Joi.number().optional()
      }).required()
    }).validate(req.body);

    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        success: false,
        error: 'Invalid contact chart import data',
        details: error.details[0].message
      });
    }

    const { userId, contactId, contactName, birthData } = value;
    console.log('Validated data:', { userId, contactId, contactName, birthData });

    logger.info('Importing contact astrological charts', {
      userId,
      contactId,
      contactName,
      name: birthData.name
    });

    // Use the external API service to generate actual chart data
    const astrologyService = astrologyAPIService;
    
    // Generate comprehensive chart data for the contact
    // Use contactName as the identifier for the external API, similar to how user charts work
    // Mark this as a contact so the storage uses the name as identifier
    const contactBirthData = { ...birthData, isContact: true };
    const chartResults = await astrologyService.getComprehensiveChart(contactName, contactBirthData);
    
    if (!chartResults.success) {
      logger.error('Failed to import contact charts via external API', {
        contactId,
        contactName,
        error: chartResults.error
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to import contact charts via external API',
        message: chartResults.error
      });
    }

    // Ensure charts array exists
    const charts = chartResults.charts || [];
    
    // Check if contact already exists and update chart data
    const existingContact = await firestoreRAGService.getContactByName(userId, contactName);
    
    if (existingContact.success) {
      // Contact exists, just update the chart data
      logger.info('Contact already exists, updating chart data only', { userId, contactName });
      await firestoreRAGService.updateContactChartData(userId, contactName, charts);
    } else {
      // Contact doesn't exist, create new contact with chart data
      logger.info('Creating new contact with chart data', { userId, contactName });
      await firestoreRAGService.storeUserContact(userId, {
        name: contactName,
        contactId: contactId,
        birthData: typeof birthData === 'string' ? birthData : JSON.stringify(birthData),
        chartData: charts,
        relationship: 'contact'
      });
    }

    logger.info('Contact charts imported successfully', {
      contactId,
      contactName,
      chartCount: charts.length,
      chartTypes: charts.map(chart => chart.type || 'unknown')
    });

    res.json({
      success: true,
      contactId,
      contactName,
      charts: charts,
      analysis: `Comprehensive astrological charts have been generated for ${contactName}`,
      confidence: 0.9,
      sources: ['External Astrology API'],
      astrologicalContext: {
        contactName,
        chartTypes: charts.map(chart => chart.type || 'unknown'),
        totalCharts: charts.length
      },
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in contact chart import:', {
      error: error.message,
      stack: error.stack,
      userId,
      contactId,
      contactName
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to import contact charts',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

// Get user's imported charts
router.get('/user-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Retrieving user charts', { userId });

    // Get actual chart data from hybrid RAG service
    const chartResult = await firestoreRAGService.getAllUserCharts(userId);
    
    if (!chartResult.success) {
      return res.json({
        success: true,
        userId,
        charts: {},
        message: 'No chart data available',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      userId,
      charts: chartResult.charts,
      totalCharts: chartResult.totalCharts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving user charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve user charts'
    });
  }
});

// Get contact's imported charts
router.get('/contact-charts/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { userId } = req.query; // Get userId from query params
    
    logger.info('Retrieving contact charts', { contactId, userId });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId parameter',
        message: 'userId is required to retrieve contact charts'
      });
    }
    
    // Get contact chart data from hybrid RAG service
    const chartResult = await firestoreRAGService.getContactCharts(userId, contactId);
      
    if (!chartResult.success) {
      return res.json({
        success: false,
        message: 'No chart data available for contact'
      });
    }

    return res.json({
      success: true,
      chartData: chartResult.chartData
    });
  } catch (error) {
    logger.error('Error retrieving contact charts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve contact charts'
    });
  }
});

// Delete a contact
router.delete('/contacts/:contactName', async (req, res) => {
  try {
    const { contactName } = req.params;
    const { userId } = req.query;
    
    logger.info('Deleting contact', { contactName, userId });

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId parameter',
        message: 'userId is required to delete contact'
      });
    }
    
    const result = await firestoreRAGService.deleteContact(userId, contactName);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: `Contact '${contactName}' deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error deleting contact:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    });
  }
});

// Get chart image (placeholder for future implementation)
router.get('/chart-image/:chartId', async (req, res) => {
  try {
    const { chartId } = req.params;

    logger.info('Retrieving chart image', { chartId });

    // Placeholder response - in production this would generate/retrieve chart images
    res.json({
      success: true,
      chartId,
      imageUrl: `/api/astrology/chart-images/${chartId}.png`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error retrieving chart image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve chart image'
    });
  }
});

// Get planetary positions analysis
router.post('/planetary-positions', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      birthData: birthDataSchema.required(),
      planets: Joi.array().items(Joi.string().valid('Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto')).optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { birthData, planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'] } = value;

    logger.info('Analyzing planetary positions', {
      name: birthData.name,
      planets
    });

    const query = `Please analyze the positions of ${planets.join(', ')} in my birth chart and explain their significance, strengths, challenges, and how they influence my personality and life path.`;

    const response = await langChainService.processChatQuery(query, { birthData });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      planetaryAnalysis: response.response,
      planets,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in planetary positions analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze planetary positions'
    });
  }
});

// Get aspects analysis
router.post('/aspects-analysis', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      birthData: birthDataSchema.required(),
      aspectType: Joi.string().valid('conjunction', 'opposition', 'trine', 'square', 'sextile', 'all').optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { birthData, aspectType = 'all' } = value;

    logger.info('Analyzing aspects', {
      name: birthData.name,
      aspectType
    });

    const query = aspectType === 'all' 
      ? 'Please analyze all the major aspects in my birth chart and explain their significance, challenges, and opportunities they present.'
      : `Please analyze the ${aspectType} aspects in my birth chart and explain their specific influence on my personality and life experiences.`;

    const response = await langChainService.processChatQuery(query, { birthData });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      aspectsAnalysis: response.response,
      aspectType,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in aspects analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze aspects'
    });
  }
});

// Get house analysis
router.post('/house-analysis', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      birthData: birthDataSchema.required(),
      houses: Joi.array().items(Joi.number().min(1).max(12)).optional()
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { birthData, houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } = value;

    logger.info('Analyzing houses', {
      name: birthData.name,
      houses
    });

    const query = `Please analyze houses ${houses.join(', ')} in my birth chart and explain their significance, what they represent in my life, and how they influence different areas of my experience.`;

    const response = await langChainService.processChatQuery(query, { birthData });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      houseAnalysis: response.response,
      houses,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in house analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze houses'
    });
  }
});

// Get user's existing charts
router.get('/user-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Getting user charts', { userId });

    // Check if user has charts in the database
    const userCharts = await firestoreRAGService.getAllUserCharts(userId);

    if (userCharts && userCharts.length > 0) {
      res.json({
        success: true,
        charts: userCharts,
        count: userCharts.length,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        charts: {},
        count: 0,
        message: 'No charts found for user',
        timestamp: new Date().toISOString()
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

// Auto-import missing charts to make user online
router.post('/auto-import-missing-charts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required',
        message: 'Please provide a user ID'
      });
    }

    logger.info('Auto-importing missing charts for user', { userId });

    // Get user profile to get birth data
    const userProfile = await firestoreRAGService.getUserProfile(userId);
    
    if (!userProfile || !userProfile.birthData) {
      return res.status(400).json({
        success: false,
        error: 'No birth data found',
        message: 'User must have birth data to generate charts'
      });
    }

    // Get current chart status
    const currentCharts = await firestoreRAGService.getAllUserCharts(userId);
    const essentialCharts = ['astro_details', 'planets', 'horo_chart'];
    
    let missingCharts = [];
    if (currentCharts.success && currentCharts.charts) {
      missingCharts = essentialCharts.filter(chartType => 
        !currentCharts.charts[chartType] || currentCharts.charts[chartType].length === 0
      );
    } else {
      missingCharts = essentialCharts;
    }

    if (missingCharts.length === 0) {
      return res.json({
        success: true,
        message: 'All essential charts already available',
        isOnline: true,
        missingCharts: [],
        importedCharts: []
      });
    }

    logger.info('Missing charts identified', { userId, missingCharts });

    // Import missing charts using astrology API
    const { astrologyChartAPI } = await import('../services/astrologyChartAPI.js');
    
    const importPromises = missingCharts.map(async (chartType) => {
      try {
        const result = await astrologyChartAPI.importSpecificChart(userId, userProfile.birthData, chartType);
        return { chartType, success: result.success, data: result.data };
      } catch (error) {
        logger.error(`Error importing ${chartType}:`, error);
        return { chartType, success: false, error: error.message };
      }
    });

    const importResults = await Promise.all(importPromises);
    const successfulImports = importResults.filter(result => result.success);
    const failedImports = importResults.filter(result => !result.success);

    // Convert imported charts to RAG documents
    if (successfulImports.length > 0) {
      await firestoreRAGService.importExistingChartsToRAG(userId);
    }

    // Check final status
    const finalCharts = await firestoreRAGService.getAllUserCharts(userId);
    const finalMissingCharts = essentialCharts.filter(chartType => 
      !finalCharts.charts[chartType] || finalCharts.charts[chartType].length === 0
    );
    
    const isOnline = finalMissingCharts.length === 0;

    logger.info('Auto-import completed', { 
      userId, 
      successfulImports: successfulImports.length,
      failedImports: failedImports.length,
      isOnline,
      finalMissingCharts
    });

    res.json({
      success: true,
      isOnline,
      missingCharts: finalMissingCharts,
      importedCharts: successfulImports.map(result => result.chartType),
      failedImports: failedImports.map(result => ({ chartType: result.chartType, error: result.error })),
      message: isOnline 
        ? 'All essential charts imported successfully. User is now online.' 
        : `Imported ${successfulImports.length} charts. ${finalMissingCharts.length} charts still missing.`
    });

  } catch (error) {
    logger.error('Error auto-importing missing charts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to auto-import missing charts'
    });
  }
});

// Health check for astrology service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'astrology',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 
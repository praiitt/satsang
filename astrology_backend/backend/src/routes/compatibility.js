import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireCoins, deductCoins } from '../middleware/coinMiddleware.js';

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
  ).max(10).optional(), // Made optional - will be loaded from context if conversationId exists
  groupType: Joi.string().valid('family', 'work', 'friendship', 'romantic', 'spiritual', 'business').optional(),
  analysisFocus: Joi.string().valid('dynamics', 'leadership', 'communication', 'harmony', 'conflict', 'growth').optional(),
  userId: Joi.string().optional(),
  conversationId: Joi.string().optional() // Optional: conversation ID for chat history
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
// TODO: Re-enable coin check after testing: requireCoins('group_compatibility')
router.post('/group-analysis', authenticateToken, async (req, res) => {
  try {
    const { error, value } = groupCompatibilitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    let { groupMembers = [], groupType = 'friendship', analysisFocus = 'dynamics', userId, conversationId = null } = value;

    // Load context from conversation history if groupMembers is incomplete or empty
    let contextLoaded = false;
    if (conversationId && userId && (!groupMembers || groupMembers.length < 2)) {
      try {
        const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
        const context = await firestoreRAGService.getGroupCompatibilityContext(userId, conversationId);
        
        if (context && context.groupMembers && context.groupMembers.length >= 2) {
          logger.info('Loaded group compatibility context from conversation', {
            conversationId,
            previousMemberCount: context.groupMembers.length,
            currentMemberCount: groupMembers.length,
            previousGroupType: context.groupType,
            previousAnalysisFocus: context.analysisFocus
          });
          
          // Merge current tags with previous context
          // Create a map of existing members by name for deduplication
          const existingMembersMap = new Map();
          context.groupMembers.forEach(member => {
            existingMembersMap.set(member.name.toLowerCase(), member);
          });
          
          // Add new tagged members (they will override if name matches)
          if (groupMembers && groupMembers.length > 0) {
            groupMembers.forEach(member => {
              existingMembersMap.set(member.name.toLowerCase(), member);
            });
          }
          
          // Convert back to array
          groupMembers = Array.from(existingMembersMap.values());
          
          // Use previous groupType and analysisFocus if not provided in current request
          if (!value.groupType || value.groupType === 'friendship') {
            groupType = context.groupType || groupType;
          }
          if (!value.analysisFocus || value.analysisFocus === 'dynamics') {
            analysisFocus = context.analysisFocus || analysisFocus;
          }
          
          contextLoaded = true;
          logger.info('Merged group compatibility context', {
            conversationId,
            finalMemberCount: groupMembers.length,
            finalGroupType: groupType,
            finalAnalysisFocus: analysisFocus
          });
        }
      } catch (contextError) {
        logger.warn('Failed to load conversation context, continuing with provided data', {
          conversationId,
          error: contextError.message
        });
      }
    }

    // Validate we have at least 2 members after context loading
    if (!groupMembers || groupMembers.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient group members',
        message: contextLoaded 
          ? 'Please tag at least 2 contacts with complete birth details using @mention, or provide group members in the request.'
          : 'Please tag at least 2 contacts with complete birth details using @mention to start a group compatibility analysis.',
        requiredMembers: 2,
        providedMembers: groupMembers?.length || 0
      });
    }

    logger.info('Analyzing group compatibility', {
      memberCount: groupMembers.length,
      groupType,
      analysisFocus,
      userId,
      conversationId,
      contextLoaded
    });

    // Get user's charts from RAG system (same as personal chat)
    let userChartData = null;
    if (userId) {
      try {
        const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
        const userCharts = await firestoreRAGService.getAllUserCharts(userId);
        if (userCharts.success && userCharts.charts) {
          userChartData = userCharts.charts;
          logger.info('Retrieved user charts for group compatibility analysis', {
            userId,
            chartTypes: Object.keys(userChartData)
          });
        }
      } catch (chartError) {
        logger.warn('Could not retrieve user charts for group compatibility:', chartError);
      }
    }

    const memberNames = groupMembers.map(member => member.name).join(', ');
    const query = `Please analyze the group compatibility for a ${groupType} group consisting of ${memberNames}. Focus on ${analysisFocus} and provide insights about group dynamics, potential challenges, and opportunities for harmony.`;

    // Use the same function calling flow as personal chat
    const userContext = {
      userId,
      birthData: groupMembers[0], // Primary user's birth data
      userProfile: {
        name: groupMembers[0].name,
        birthData: groupMembers[0]
      },
      chartData: userChartData, // User's charts from RAG
      groupMembers: groupMembers, // All group members for context - ensure this is passed correctly
      groupType: groupType,
      analysisFocus: analysisFocus
    };

    logger.info('Calling LangChain service with user context:', {
      hasGroupMembers: !!userContext.groupMembers,
      groupMembersCount: userContext.groupMembers?.length,
      groupType: userContext.groupType,
      analysisFocus: userContext.analysisFocus
    });

    const response = await langChainService.processChatQuery(query, userContext);

    if (!response.success) {
      return res.status(500).json(response);
    }

    // Extract brief and detailed sections from the response
    const { briefAnswer, detailedDescription } = langChainService.extractBriefAndDetailed(response.response);

    // Generate conversation ID (always needed for response)
    const finalConversationId = conversationId || `group_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Group compatibility conversation ID handling', {
      receivedConversationId: conversationId,
      generatedConversationId: finalConversationId,
      isNewConversation: !conversationId,
      userId: userId
    });
    
    // Save messages to database for conversation history (if userId provided)
    if (userId) {
      try {
        const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
        
        // Create a query-like message for the user
        const userQuery = `Please analyze the group compatibility for a ${groupType} group with ${groupMembers.length} members. Focus on ${analysisFocus}.`;
        
        // Save user message
        await firestoreRAGService.saveChatMessage(
          userId,
          'user',
          userQuery,
          { 
            userContext: userContext, 
            groupMembers: groupMembers,
            groupType: groupType,
            analysisFocus: analysisFocus,
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
            briefAnswer: briefAnswer,
            detailedDescription: detailedDescription,
            groupType: groupType,
            analysisFocus: analysisFocus,
            memberCount: groupMembers.length,
            astrologicalContext: response.astrologicalContext,
            timestamp: new Date().toISOString()
          },
          finalConversationId
        );

        logger.info('Group compatibility chat messages saved to database', { userId, conversationId: finalConversationId });
      } catch (saveError) {
        logger.error('Error saving group compatibility chat messages:', saveError);
        // Don't fail the request if saving fails
      }
    }

    // TODO: Re-enable coin deduction after testing
    // const deductResult = await deductCoins('group_compatibility')(req, res, () => {});

    res.json({
      success: true,
      groupAnalysis: response.response,
      briefAnswer: briefAnswer,
      detailedDescription: detailedDescription,
      groupType,
      analysisFocus,
      memberCount: groupMembers.length,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      conversationId: finalConversationId,
      coinUsage: res.locals?.coinDeduction || null, // Include coin usage info
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
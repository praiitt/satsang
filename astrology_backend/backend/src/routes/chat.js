import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';
import { jwtService } from '../services/jwtService.js';
import { requireCoins, deductCoins, addCoinBalanceToResponse } from '../middleware/coinMiddleware.js';

const router = express.Router();

// Function to make responses more friendly and engaging
function makeResponseFriendly(text) {
  if (!text) return text;
  
  let friendlyText = text;
  
  // Add friendly greetings and excitement at the beginning
  if (friendlyText.toLowerCase().includes('based on your birth chart data')) {
    friendlyText = friendlyText.replace(/based on your birth chart data/i, 'Oh my stars! 🌟 Based on your incredible birth chart data');
  }
  
  // Add emojis to astrological terms
  friendlyText = friendlyText.replace(/your sun sign is aquarius/gi, 'your Sun sign is Aquarius ✨');
  friendlyText = friendlyText.replace(/aquarius/gi, 'Aquarius 💫');
  friendlyText = friendlyText.replace(/libra/gi, 'Libra ⚖️');
  friendlyText = friendlyText.replace(/jupiter/gi, 'Jupiter 🪐');
  friendlyText = friendlyText.replace(/venus/gi, 'Venus 💖');
  friendlyText = friendlyText.replace(/nakshatra/gi, 'Nakshatra 🌟');
  friendlyText = friendlyText.replace(/purva bhadrapad/gi, 'Purva Bhadrapad ✨');
  
  // Make language more conversational and enthusiastic
  friendlyText = friendlyText.replace(/suggests/gi, 'suggests that you\'re such an');
  friendlyText = friendlyText.replace(/indicates/gi, 'indicates you have such incredible');
  friendlyText = friendlyText.replace(/shows/gi, 'shows such amazing');
  friendlyText = friendlyText.replace(/means/gi, 'means you have such wonderful');
  
  // Add encouraging phrases with emojis
  friendlyText = friendlyText.replace(/innovative/gi, 'innovative and forward-thinking 🌟');
  friendlyText = friendlyText.replace(/independent/gi, 'independent and unique ✨');
  friendlyText = friendlyText.replace(/harmony/gi, 'harmony and balance 💫');
  friendlyText = friendlyText.replace(/creative/gi, 'creative and artistic 🎨');
  friendlyText = friendlyText.replace(/intellectual/gi, 'intellectual and wise 🧠');
  friendlyText = friendlyText.replace(/philosophical/gi, 'philosophical and deep-thinking 💭');
  
  // Add excitement and warmth
  friendlyText = friendlyText.replace(/unique/gi, 'unique and special ✨');
  friendlyText = friendlyText.replace(/beautiful/gi, 'beautiful and wonderful 💖');
  friendlyText = friendlyText.replace(/amazing/gi, 'amazing and incredible 🌟');
  
  // Make it more conversational
  friendlyText = friendlyText.replace(/you are/gi, 'you\'re such an');
  friendlyText = friendlyText.replace(/you have/gi, 'you have such incredible');
  friendlyText = friendlyText.replace(/you possess/gi, 'you possess such amazing');
  
  // Add excitement to the end of sentences (but be careful not to overdo it)
  friendlyText = friendlyText.replace(/\. /g, '! ✨ ');
  friendlyText = friendlyText.replace(/! ✨ $/, '! ✨');
  
  // Clean up any double emojis or excessive punctuation
  friendlyText = friendlyText.replace(/! ✨ ! ✨/g, '! ✨');
  friendlyText = friendlyText.replace(/✨ ✨/g, '✨');
  
  return friendlyText;
}

// Debug endpoint to check authentication
router.get('/debug-auth', authenticateToken, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  res.json({
    success: true,
    debug: {
      hasAuthHeader: !!authHeader,
      token: token ? `${token.substring(0, 20)}...` : null,
      isDevToken: token ? token.startsWith('dev_') : false,
      user: req.user || null,
      uid: req.uid || null,
      headers: Object.keys(req.headers).filter(key => key.toLowerCase().includes('auth')),
      timestamp: new Date().toISOString()
    }
  });
});

// Test RAG system endpoint
router.get('/test-rag/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.info('Testing RAG system for user', { userId });
    
    // Test if we can access the user's chart data from RAG
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    
    // Try to get user profile from RAG
    const profileResult = await firestoreRAGService.getUserProfile(userId);
    logger.info('RAG profile result', { 
      userId, 
      hasProfile: !!profileResult,
      profileKeys: profileResult ? Object.keys(profileResult) : []
    });
    
    // Try to process charts for RAG
    const chartResult = await firestoreRAGService.processChartsForRAG(userId);
    logger.info('RAG chart result', { 
      userId, 
      success: chartResult?.success,
      chartCount: chartResult?.charts?.length || 0,
      chartTypes: chartResult?.charts?.map(c => c.type || c.chartType) || []
    });
    
    res.json({
      success: true,
      userId,
      profile: {
        hasProfile: !!profileResult,
        profileKeys: profileResult ? Object.keys(profileResult) : []
      },
      charts: {
        success: chartResult?.success,
        chartCount: chartResult?.charts?.length || 0,
        chartTypes: chartResult?.charts?.map(c => c.type || c.chartType) || []
      },
      message: 'RAG system test completed'
    });
    
  } catch (error) {
    logger.error('Error testing RAG system:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to test RAG system',
      details: error.message
    });
  }
});

// Test endpoint to generate JWT token (for development only)
router.post('/test-token', (req, res) => {
  try {
    const { userId = 'test_user_123' } = req.body;
    
    const tokenResult = jwtService.generateToken(userId, {
      name: 'Test User',
      email: 'test@example.com'
    });
    
    if (tokenResult.success) {
      res.json({
        success: true,
        token: tokenResult.token,
        expiresIn: tokenResult.expiresIn,
        message: 'Test JWT token generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate token',
        details: tokenResult.error
      });
    }
  } catch (error) {
    logger.error('Error generating test token:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate test token'
    });
  }
});

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
      placeOfBirth: Joi.string().optional(),
      timezone: Joi.number().optional()
    }).optional(),
    userProfile: Joi.object().optional(),
    person1Data: Joi.object().optional(),
    person2Data: Joi.object().optional(),
    // Chart context fields
    chartContext: Joi.object({
      charts: Joi.object().optional(),
      queryAnalysis: Joi.object().optional(),
      totalRelevantCharts: Joi.number().optional()
    }).optional(),
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
      type: Joi.string().valid('user', 'assistant', 'system').required(),
      content: Joi.string().required(),
      timestamp: Joi.date().optional()
    })
  ).optional(),
  conversationId: Joi.string().optional()
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
router.post('/', authenticateToken, requireCoins('basic_chat'), async (req, res) => {
  try {
    // Log the incoming request for debugging
    logger.info('Received chat request', {
      bodyKeys: Object.keys(req.body),
      hasQuery: !!req.body.query,
      hasUserContext: !!req.body.userContext,
      hasConversationHistory: !!req.body.conversationHistory,
      bodyPreview: JSON.stringify(req.body).substring(0, 200) + '...'
    });

    // Validate request
    const { error, value } = chatQuerySchema.validate(req.body);
    if (error) {
      logger.error('Request validation failed', {
        error: error.details[0].message,
        receivedBody: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { query, userContext = {}, conversationHistory = [], conversationId = null } = value;

    logger.info('Processing chat query', {
      query: query.substring(0, 100),
      userId: userContext.userId,
      hasBirthData: !!userContext.birthData,
      conversationHistoryLength: conversationHistory.length,
      conversationHistory: conversationHistory.map(msg => ({
        type: msg.type,
        content: msg.content.substring(0, 50) + '...',
        timestamp: msg.timestamp
      }))
    });

    // Process query with LangChain
    const response = await langChainService.processChatQuery(query, userContext, conversationHistory);
    
    // Debug: Log response structure
    logger.info('LangChain response structure', {
      hasResponse: !!response.response,
      hasBriefAnswer: !!response.brief_answer,
      hasDetailedDescription: !!response.detailed_description,
      briefAnswerLength: response.brief_answer?.length || 0,
      detailedDescriptionLength: response.detailed_description?.length || 0,
      responseLength: response.response?.length || 0
    });

    // Handle both success and failure cases
    if (!response.success) {
      logger.info('Chat query failed, returning error response', {
        success: response.success,
        error: response.response || 'Unknown error'
      });
      
      return res.status(400).json({
        success: false,
        response: response.response || 'An error occurred while processing your request',
        confidence: response.confidence || 0,
        sources: response.sources || ['Error Handling'],
        timestamp: new Date().toISOString()
      });
    }

    // Generate conversation ID (always needed for response)
    const finalConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Conversation ID handling', {
      receivedConversationId: conversationId,
      generatedConversationId: finalConversationId,
      isNewConversation: !conversationId,
      userId: userContext.userId
    });
    
    // Save messages to database if user is authenticated
    if (req.uid) {
      try {
        const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
        
        // Save user message
        await firestoreRAGService.saveChatMessage(
          req.uid,
          'user',
          query,
          { userContext, timestamp: new Date().toISOString() },
          finalConversationId
        );

        // Save assistant response
        await firestoreRAGService.saveChatMessage(
          req.uid,
          'assistant',
          response.response,
          { 
            confidence: response.confidence,
            sources: response.sources,
            astrologicalContext: response.astrologicalContext,
            timestamp: new Date().toISOString()
          },
          finalConversationId
        );

        logger.info('Chat messages saved to database', { userId: req.uid });
      } catch (saveError) {
        logger.error('Error saving chat messages:', saveError);
        // Don't fail the request if saving fails
      }
    }

    // Log response
    logger.info('Chat query processed', {
      userId: userContext.userId,
      conversationId: finalConversationId
    });

    // Extract brief and detailed responses if not provided by langchain service
    let briefAnswer = response.brief_answer;
    let detailedDescription = response.detailed_description;
    
    if (!briefAnswer || !detailedDescription || briefAnswer === detailedDescription) {
      logger.info('🔍 [CHAT_ROUTE] Extracting brief/detailed from response', {
        hasBriefAnswer: !!briefAnswer,
        hasDetailedDescription: !!detailedDescription,
        areEqual: briefAnswer === detailedDescription
      });
      
      // Simple extraction logic
      const content = response.response;
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences.length >= 2) {
        // For simple questions, extract first 1-2 sentences as brief
        const firstSentence = sentences[0].trim();
        if (firstSentence.toLowerCase().includes('your sun sign is') || 
            firstSentence.toLowerCase().includes('you are') ||
            firstSentence.toLowerCase().includes('you have')) {
          briefAnswer = sentences.slice(0, Math.min(2, sentences.length))
            .join('. ').trim() + '.';
          detailedDescription = content;
        } else {
          // Fallback: first paragraph as brief
          const paragraphs = content.split('\n\n').filter(p => p.trim());
          briefAnswer = paragraphs[0]?.trim() || content.substring(0, 200) + '...';
          detailedDescription = content;
        }
      } else {
        briefAnswer = content.substring(0, 200) + '...';
        detailedDescription = content;
      }
      
      logger.info('🔍 [CHAT_ROUTE] Extraction completed', {
        briefLength: briefAnswer?.length || 0,
        detailedLength: detailedDescription?.length || 0
      });
    }

    // Post-process responses to make them more friendly and engaging
    briefAnswer = makeResponseFriendly(briefAnswer);
    detailedDescription = makeResponseFriendly(detailedDescription);

    // Deduct coins for chat usage
    const deductResult = await deductCoins('basic_chat')(req, res, () => {});
    
    // Return response with conversation ID
    res.json({
      success: true,
      response: response.response,
      brief_answer: briefAnswer,
      detailed_description: detailedDescription,
      confidence: response.confidence,
      sources: response.sources,
      astrologicalContext: response.astrologicalContext,
      conversationId: finalConversationId, // Include the conversation ID
      coinUsage: res.locals?.coinDeduction || null, // Include coin usage info
      timestamp: new Date().toISOString()
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
router.post('/birth-chart', optionalAuth, async (req, res) => {
  try {
    // Validate request
    const { error, value } = birthChartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { birthData } = value;

    // Process birth chart analysis with LangChain
    const response = await langChainService.analyzeBirthChart(birthData);

    if (!response.success) {
      return res.status(500).json({
        ...response,
        timestamp: new Date().toISOString(),
        success: false
      });
    }

    res.json({
      ...response,
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    logger.error('Error in birth chart endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze birth chart'
    });
  }
});





// Start new conversation endpoint
router.post('/new-conversation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Generate a new conversation ID
    const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Starting new conversation', {
      userId,
      newConversationId
    });

    res.json({
      success: true,
      conversationId: newConversationId,
      message: 'New conversation started successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error starting new conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to start new conversation'
    });
  }
});

// Get conversation by ID endpoint
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    logger.info('Getting conversation details', {
      userId,
      conversationId
    });

    // Import firestoreRAGService dynamically
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    
    // Get conversation messages
    const messages = await firestoreRAGService.getConversationMessages(userId, conversationId);
    
    if (!messages || messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        message: 'No messages found for this conversation'
      });
    }

    res.json({
      success: true,
      conversationId,
      messages,
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch conversation'
    });
  }
});

// Get recent conversations endpoint
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, type } = req.query; // type can be 'group', 'personal', or undefined for all

    // Import firestoreRAGService dynamically
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    
    let conversations = await firestoreRAGService.getRecentConversations(
      userId, 
      parseInt(limit) * 2 // Get more to filter, then limit
    );

    // Filter by conversation type if specified
    if (type === 'group') {
      // Filter for group compatibility conversations (conversationId starts with 'group_conv_')
      conversations = conversations.conversations || conversations;
      conversations = conversations.filter(conv => 
        conv.conversationId && conv.conversationId.startsWith('group_conv_')
      );
      conversations = conversations.slice(0, parseInt(limit));
      conversations = { success: true, conversations };
    } else if (type === 'personal') {
      // Filter out group compatibility conversations
      conversations = conversations.conversations || conversations;
      conversations = conversations.filter(conv => 
        !conv.conversationId || !conv.conversationId.startsWith('group_conv_')
      );
      conversations = conversations.slice(0, parseInt(limit));
      conversations = { success: true, conversations };
    }

    res.json({
      success: true,
      conversations: conversations.conversations || conversations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch conversations'
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

// Delete conversation endpoint
router.delete('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.uid;
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }

    // Import firestoreRAGService dynamically
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    
    const result = await firestoreRAGService.deleteConversation(userId, conversationId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Conversation deleted successfully',
        deletedRows: result.deletedRows,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete conversation',
        details: result.error
      });
    }

  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete conversation'
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

// Get recent conversations for a user
router.get('/recent-conversations', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId parameter'
      });
    }

    logger.info('Getting recent conversations', { userId, limit });
    
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    const conversations = await firestoreRAGService.getRecentConversations(userId, limit);
    
    res.json({
      success: true,
      conversations: conversations.conversations || []
    });

  } catch (error) {
    logger.error('Error getting recent conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get recent conversations'
    });
  }
});

// Get chat history for a specific conversation
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { conversationId, limit = 50 } = req.query;
    
    // Convert limit to integer and validate
    const limitInt = parseInt(limit, 10);
    if (isNaN(limitInt) || limitInt < 1 || limitInt > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be a number between 1 and 1000.'
      });
    }
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing conversationId parameter'
      });
    }

    logger.info('Getting chat history', { conversationId, limit, limitType: typeof limit, limitInt, limitIntType: typeof limitInt });
    
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    const messages = await firestoreRAGService.getChatHistory(req.uid, limitInt, conversationId);
    
    res.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get chat history'
    });
  }
});

// Save a single message to a conversation
router.post('/save-message', authenticateToken, async (req, res) => {
  try {
    logger.info('Save message request received:', { 
      body: req.body, 
      headers: req.headers,
      userId: req.uid 
    });
    
    const { role, content, conversationId, metadata = {} } = req.body;
    
    if (!role || !content || !conversationId) {
      logger.error('Missing required fields:', { role, content, conversationId, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: role, content, conversationId'
      });
    }

    logger.info('Saving message to conversation', { 
      userId: req.uid, 
      role, 
      conversationId, 
      contentLength: content.length 
    });
    
    const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
    const result = await firestoreRAGService.saveChatMessage(
      req.uid, 
      role, 
      content, 
      metadata, 
      conversationId
    );
    
    res.json({
      success: true,
      messageId: result.messageId,
      conversationId: result.conversationId
    });

  } catch (error) {
    logger.error('Error saving message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to save message'
    });
  }
});

// Test endpoint for debugging
router.post('/test-save', authenticateToken, async (req, res) => {
  try {
    logger.info('Test save endpoint hit:', { 
      body: req.body, 
      headers: req.headers,
      userId: req.uid,
      method: req.method,
      url: req.url
    });
    
    res.json({
      success: true,
      message: 'Test endpoint working',
      receivedBody: req.body,
      headers: req.headers
    });
  } catch (error) {
    logger.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Test endpoint error',
      message: error.message
    });
  }
});

export default router; 
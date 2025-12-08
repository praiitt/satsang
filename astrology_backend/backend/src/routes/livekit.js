import express from 'express';
import { livekitService } from '../services/livekitService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireCoins, deductCoins } from '../middleware/coinMiddleware.js';

const router = express.Router();

// Validation schemas
const createRoomSchema = Joi.object({
  roomName: Joi.string().required().min(1).max(100),
  roomType: Joi.string().valid('personal_chat', 'group_compatibility', 'voice_consultation').required(),
  conversationId: Joi.string().optional(),
  groupId: Joi.string().optional(),
  consultationId: Joi.string().optional(),
  participants: Joi.array().items(Joi.string()).optional(),
  maxParticipants: Joi.number().integer().min(2).max(100).optional(),
  validFor: Joi.string().pattern(/^\d+[hms]$/).default('24h'),
  // User context for Rraasi agent
  userContext: Joi.object({
    userId: Joi.string().optional(),
    birthData: Joi.object().optional(),
    charts: Joi.array().optional(),
    preferences: Joi.object().optional()
  }).optional()
});

const joinRoomSchema = Joi.object({
  roomName: Joi.string().required().min(1).max(100),
  participantName: Joi.string().optional(),
  canPublish: Joi.boolean().default(true),
  canSubscribe: Joi.boolean().default(true),
  canPublishData: Joi.boolean().default(true),
  validFor: Joi.string().pattern(/^\d+[hms]$/).default('24h')
});

/**
 * Create a new LiveKit room with Rraasi agent support
 * POST /api/livekit/create-room
 */
router.post('/create-room', authenticateToken, requireCoins('livekit_room'), async (req, res) => {
  try {
    // Validate request
    const { error, value } = createRoomSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { 
      roomName, 
      roomType, 
      conversationId, 
      groupId, 
      consultationId,
      participants = [],
      maxParticipants,
      validFor,
      userContext = {}
    } = value;

    const userId = req.uid;
    const userEmail = req.user?.email || req.email || ''; // Get user email from auth
    let result;

    logger.info('Creating LiveKit room with agent support', {
      userId,
      userEmail,
      roomName,
      roomType,
      conversationId,
      groupId,
      consultationId,
      hasUserContext: !!userContext
    });

    // Enhance user context with authenticated user info
    const enhancedUserContext = {
      ...userContext,
      userId: userId,
      email: userEmail,
      authenticatedAt: new Date().toISOString()
    };

    // Create room based on type with enhanced metadata for Rraasi agent
    switch (roomType) {
      case 'personal_chat':
        if (!conversationId) {
          return res.status(400).json({
            success: false,
            error: 'conversationId is required for personal_chat rooms'
          });
        }
        result = await livekitService.createPersonalChatToken(userId, conversationId, {
          email: userEmail
        });
        break;

      case 'group_compatibility':
        if (!groupId) {
          return res.status(400).json({
            success: false,
            error: 'groupId is required for group_compatibility rooms'
          });
        }
        result = await livekitService.createGroupChatToken(groupId, userId, participants);
        break;

      case 'voice_consultation':
        if (!consultationId) {
          return res.status(400).json({
            success: false,
            error: 'consultationId is required for voice_consultation rooms'
          });
        }
        result = await livekitService.createVoiceConsultationToken(consultationId, userId);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid room type'
        });
    }

    if (!result.success) {
      return res.status(500).json(result);
    }

    // If room creation successful, update room metadata with user context for Rraasi agent
    try {
      const roomMetadata = {
        ...result.roomInfo?.metadata,
        userContext: enhancedUserContext,
        rraasi_agent_enabled: true,
        agent_name: 'rraasi',
        created_at: new Date().toISOString()
      };

      // Update room metadata (this helps Rraasi agent understand user context)
      await livekitService.roomService.updateRoomMetadata(result.roomName, JSON.stringify(roomMetadata));
      
      logger.info('Room metadata updated for Rraasi agent', {
        roomName: result.roomName,
        hasUserContext: !!enhancedUserContext.userId
      });
    } catch (metadataError) {
      logger.warn('Failed to update room metadata for agent', { error: metadataError.message });
      // Don't fail the request if metadata update fails
    }

    // Deduct coins for room creation
    await deductCoins('livekit_room')(req, res, () => {});

    logger.info('LiveKit room created successfully with agent support', {
      userId,
      roomName: result.roomName,
      roomType
    });

    res.json({
      ...result,
      roomType,
      agentEnabled: true,
      agentName: 'Rraasi',
      coinUsage: res.locals?.coinDeduction || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating LiveKit room:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create room'
    });
  }
});

/**
 * Join an existing room (get access token)
 * POST /api/livekit/join-room
 */
router.post('/join-room', authenticateToken, async (req, res) => {
  try {
    // Validate request
    const { error, value } = joinRoomSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { 
      roomName, 
      participantName, 
      canPublish, 
      canSubscribe, 
      canPublishData,
      validFor 
    } = value;

    const userId = req.uid;
    const finalParticipantName = participantName || `user_${userId}`;

    logger.info('Joining LiveKit room', {
      userId,
      roomName,
      participantName: finalParticipantName
    });

    const result = await livekitService.createRoomToken(
      roomName, 
      finalParticipantName,
      {
        canPublish,
        canSubscribe,
        canPublishData,
        validFor,
        metadata: {
          userId,
          joinedAt: new Date().toISOString()
        }
      }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    logger.info('Successfully joined LiveKit room', {
      userId,
      roomName,
      participantName: finalParticipantName
    });

    res.json({
      ...result,
      agentEnabled: true,
      agentName: 'Rraasi',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error joining LiveKit room:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to join room'
    });
  }
});

/**
 * Create a voice consultation with Rraasi agent
 * POST /api/livekit/voice-consultation
 */
router.post('/voice-consultation', authenticateToken, requireCoins('voice_consultation'), async (req, res) => {
  try {
    const { consultationType = 'general', userContext = {} } = req.body;
    const userId = req.uid;
    const consultationId = `consult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Creating voice consultation with Rraasi', {
      userId,
      consultationId,
      consultationType
    });

    // Get user's birth data and charts for personalized consultation
    let enhancedUserContext = { ...userContext, userId };
    
    try {
      // Try to fetch user's birth data from your existing services
      const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
      const userProfile = await firestoreRAGService.getUserProfile(userId);
      
      if (userProfile) {
        enhancedUserContext.birthData = userProfile.birthData;
        enhancedUserContext.preferences = userProfile.preferences;
      }

      // Get user's charts for context
      const chartResult = await firestoreRAGService.processChartsForRAG(userId);
      if (chartResult?.success) {
        enhancedUserContext.charts = chartResult.charts;
      }
    } catch (contextError) {
      logger.warn('Could not fetch user context for consultation', { error: contextError.message });
    }

    // Create voice consultation room
    const result = await livekitService.createVoiceConsultationToken(consultationId, userId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Update room metadata with consultation context
    try {
      const roomMetadata = {
        type: 'voice_consultation',
        consultationType,
        userContext: enhancedUserContext,
        rraasi_agent_enabled: true,
        agent_name: 'rraasi',
        consultation_started_at: new Date().toISOString()
      };

      await livekitService.roomService.updateRoomMetadata(result.roomName, JSON.stringify(roomMetadata));
    } catch (metadataError) {
      logger.warn('Failed to update consultation metadata', { error: metadataError.message });
    }

    // Deduct coins for voice consultation
    await deductCoins('voice_consultation')(req, res, () => {});

    logger.info('Voice consultation room created successfully', {
      userId,
      consultationId,
      roomName: result.roomName
    });

    res.json({
      ...result,
      consultationId,
      consultationType,
      agentEnabled: true,
      agentName: 'Rraasi',
      instructions: 'Rraasi will join automatically. Start speaking when you see her connected.',
      coinUsage: res.locals?.coinDeduction || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating voice consultation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create voice consultation'
    });
  }
});

/**
 * List active rooms for the authenticated user
 * GET /api/livekit/rooms
 */
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.uid;
    
    logger.info('Listing LiveKit rooms', { userId });

    const result = await livekitService.listRooms();

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Filter rooms that the user has access to (basic filtering)
    // In a production app, you'd want more sophisticated access control
    const userRooms = result.rooms.filter(room => {
      const metadata = room.metadata || {};
      return metadata.userId === userId || 
             (metadata.participants && metadata.participants.includes(userId));
    });

    res.json({
      success: true,
      rooms: userRooms.map(room => ({
        ...room,
        agentEnabled: room.metadata?.rraasi_agent_enabled || false,
        agentName: 'Rraasi'
      })),
      totalRooms: userRooms.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error listing LiveKit rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list rooms'
    });
  }
});

/**
 * Get participants in a specific room
 * GET /api/livekit/room/:roomName/participants
 */
router.get('/room/:roomName/participants', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.params;
    const userId = req.uid;

    logger.info('Getting room participants', { userId, roomName });

    const result = await livekitService.getRoomParticipants(roomName);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Check if Rraasi agent is in the room
    const hasRraasi = result.participants.some(p => 
      p.identity.includes('rraasi') || p.identity.includes('agent')
    );

    res.json({
      ...result,
      roomName,
      hasRraasi,
      agentStatus: hasRraasi ? 'connected' : 'connecting',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting room participants:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get room participants'
    });
  }
});

/**
 * End a room session
 * DELETE /api/livekit/room/:roomName
 */
router.delete('/room/:roomName', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.params;
    const userId = req.uid;

    logger.info('Ending LiveKit room', { userId, roomName });

    // TODO: Add authorization check to ensure user can end this room

    const result = await livekitService.endRoom(roomName);

    if (!result.success) {
      return res.status(500).json(result);
    }

    logger.info('LiveKit room ended successfully', { userId, roomName });

    res.json({
      ...result,
      message: 'Room ended successfully. Rraasi has been disconnected.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error ending LiveKit room:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to end room'
    });
  }
});

/**
 * Send data message to room
 * POST /api/livekit/room/:roomName/send-data
 */
router.post('/room/:roomName/send-data', authenticateToken, async (req, res) => {
  try {
    const { roomName } = req.params;
    const { message, destinationSids = [] } = req.body;
    const userId = req.uid;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Sending data to LiveKit room', { 
      userId, 
      roomName, 
      messageLength: message.length 
    });

    // Prepare data payload
    const dataPayload = JSON.stringify({
      type: 'chat_message',
      userId,
      message,
      timestamp: new Date().toISOString()
    });

    const result = await livekitService.sendDataToRoom(roomName, dataPayload, destinationSids);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error sending data to room:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to send data to room'
    });
  }
});

/**
 * Health check for LiveKit service
 * GET /api/livekit/health
 */
router.get('/health', async (req, res) => {
  try {
    const result = await livekitService.healthCheck();
    
    const statusCode = result.success ? 200 : 503;
    res.status(statusCode).json({
      ...result,
      agentSupported: true,
      agentName: 'Rraasi'
    });

  } catch (error) {
    logger.error('Error in LiveKit health check:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      agentSupported: false,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Quick start endpoint for personal chat with Rraasi
 * POST /api/livekit/quick-personal-chat
 */
router.post('/quick-personal-chat', authenticateToken, requireCoins('basic_chat'), async (req, res) => {
  try {
    const { conversationId, userContext = {} } = req.body;
    const userId = req.uid;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required'
      });
    }

    logger.info('Creating quick personal chat room with Rraasi', { userId, conversationId });

    // Enhance user context with available data
    let enhancedUserContext = { ...userContext, userId };
    
    try {
      const { firestoreRAGService } = await import('../services/firestoreRAGService.js');
      const userProfile = await firestoreRAGService.getUserProfile(userId);
      
      if (userProfile) {
        enhancedUserContext.birthData = userProfile.birthData;
        enhancedUserContext.preferences = userProfile.preferences;
      }
    } catch (contextError) {
      logger.warn('Could not fetch user context for personal chat', { error: contextError.message });
    }

    const result = await livekitService.createPersonalChatToken(userId, conversationId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Update room metadata for Rraasi agent
    try {
      const roomMetadata = {
        type: 'personal_chat',
        conversationId,
        userContext: enhancedUserContext,
        rraasi_agent_enabled: true,
        agent_name: 'rraasi',
        chat_started_at: new Date().toISOString()
      };

      await livekitService.roomService.updateRoomMetadata(result.roomName, JSON.stringify(roomMetadata));
    } catch (metadataError) {
      logger.warn('Failed to update personal chat metadata', { error: metadataError.message });
    }

    // Deduct coins
    await deductCoins('basic_chat')(req, res, () => {});

    res.json({
      ...result,
      roomType: 'personal_chat',
      quickStart: true,
      agentEnabled: true,
      agentName: 'Rraasi',
      instructions: 'Rraasi will join automatically. You can start chatting with voice or text.',
      coinUsage: res.locals?.coinDeduction || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating quick personal chat:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create quick personal chat'
    });
  }
});

export default router;
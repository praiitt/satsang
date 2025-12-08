import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { logger } from '../utils/logger.js';

class LiveKitService {
  constructor() {
    // Debug environment variables - environment should be loaded by server.js
    logger.info('LiveKit Service constructor - checking environment', {
      LIVEKIT_URL: process.env.LIVEKIT_URL,
      hasApiKey: !!process.env.LIVEKIT_API_KEY,
      hasApiSecret: !!process.env.LIVEKIT_API_SECRET
    });

    // LiveKit server configuration
    this.apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    this.wsUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL || 'ws://localhost:7880';

    // Convert WebSocket URL to HTTP URL for RoomService API calls
    this.httpUrl = this.wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    // Initialize RoomService client
    this.roomService = new RoomServiceClient(this.httpUrl, this.apiKey, this.apiSecret);

    logger.info('LiveKit service initialized', {
      wsUrl: this.wsUrl,
      httpUrl: this.httpUrl,
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret
    });
  }

  /**
   * Create or join a room and generate access token
   * @param {string} roomName - Name of the room
   * @param {string} participantName - Name of the participant
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Token and room info
   */
  async createRoomToken(roomName, participantName, options = {}) {
    try {
      const {
        canPublish = true,
        canSubscribe = true,
        canPublishData = true,
        validFor = '24h', // 24 hours
        metadata = {}
      } = options;

      logger.info('Creating LiveKit room token', {
        roomName,
        participantName,
        canPublish,
        canSubscribe,
        canPublishData
      });

      // Create access token with user metadata for agent authentication
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantName,
        ttl: this.parseDuration(validFor),
        // CRITICAL: Embed user metadata for LiveKit agent access
        metadata: JSON.stringify({
          userId: metadata.userId || '',
          email: metadata.email || '',
          timestamp: metadata.timestamp || new Date().toISOString(),
          ...metadata
        })
      });

      // Set permissions
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish,
        canSubscribe,
        canPublishData
      });

      // Generate JWT token
      const jwt = await token.toJwt();

      // Try to create/get room info
      let roomInfo = null;
      try {
        const roomOptions = {
          name: roomName,
          emptyTimeout: 10 * 60, // 10 minutes
          maxParticipants: options.maxParticipants || 50,
          metadata: JSON.stringify(metadata)
        };

        // Add agent dispatch if agentName is specified
        if (options.agentName) {
          roomOptions.agents = [{
            agentName: options.agentName
          }];
        }

        roomInfo = await this.roomService.createRoom(roomOptions);
        logger.info('Room created/retrieved', { roomName, roomSid: roomInfo.sid });
      } catch (roomError) {
        // Room might already exist, that's okay
        logger.info('Room already exists or error creating room', {
          roomName,
          error: roomError.message
        });
      }

      return {
        success: true,
        token: jwt,
        wsUrl: this.wsUrl,
        roomName,
        participantName,
        roomInfo,
        expiresAt: new Date(Date.now() + this.parseDuration(validFor) * 1000)
      };

    } catch (error) {
      logger.error('Error creating LiveKit room token:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to create room token'
      };
    }
  }

  /**
   * Create a personal chat room token (1:1 with AI)
   * @param {string} userId - User ID
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Additional options (like email)
   * @returns {Promise<Object>} Token for personal chat
   */
  async createPersonalChatToken(userId, conversationId, options = {}) {
    const roomName = `personal_chat_${conversationId}`;
    const participantName = `user_${userId}`;

    return await this.createRoomToken(roomName, participantName, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      maxParticipants: 2, // User + AI agent
      agentName: 'rraasi',  // Dispatch Rraasi agent
      metadata: {
        type: 'personal_chat',
        userId,
        email: options.email || '',
        conversationId,
        createdAt: new Date().toISOString()
      }
    });
  }

  /**
   * Create a group compatibility chat token
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {Array} participants - List of participants
   * @returns {Promise<Object>} Token for group chat
   */
  async createGroupChatToken(groupId, userId, participants = []) {
    const roomName = `group_compat_${groupId}`;
    const participantName = `user_${userId}`;

    return await this.createRoomToken(roomName, participantName, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      maxParticipants: Math.max(participants.length + 1, 10), // Participants + buffer
      metadata: {
        type: 'group_compatibility',
        groupId,
        participants,
        createdAt: new Date().toISOString()
      }
    });
  }

  /**
   * Create a voice consultation room token
   * @param {string} consultationId - Consultation ID
   * @param {string} userId - User ID
   * @param {string} astrologerId - Astrologer ID (optional)
   * @returns {Promise<Object>} Token for voice consultation
   */
  async createVoiceConsultationToken(consultationId, userId, astrologerId = 'ai_astrologer') {
    const roomName = `voice_consult_${consultationId}`;
    const participantName = `user_${userId}`;

    return await this.createRoomToken(roomName, participantName, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      maxParticipants: 2, // User + Astrologer
      metadata: {
        type: 'voice_consultation',
        consultationId,
        userId,
        astrologerId,
        createdAt: new Date().toISOString()
      }
    });
  }

  /**
   * List active rooms
   * @returns {Promise<Array>} List of active rooms
   */
  async listRooms() {
    try {
      const rooms = await this.roomService.listRooms();

      logger.info('Listed LiveKit rooms', { count: rooms.length });

      return {
        success: true,
        rooms: rooms.map(room => ({
          name: room.name,
          sid: room.sid,
          numParticipants: room.numParticipants,
          maxParticipants: room.maxParticipants,
          creationTime: room.creationTime,
          metadata: this.parseMetadata(room.metadata)
        }))
      };
    } catch (error) {
      logger.error('Error listing rooms:', error);
      return {
        success: false,
        error: error.message,
        rooms: []
      };
    }
  }

  /**
   * Get room participants
   * @param {string} roomName - Name of the room
   * @returns {Promise<Object>} Room participants info
   */
  async getRoomParticipants(roomName) {
    try {
      const participants = await this.roomService.listParticipants(roomName);

      logger.info('Listed room participants', {
        roomName,
        count: participants.length
      });

      return {
        success: true,
        participants: participants.map(p => ({
          identity: p.identity,
          name: p.name,
          state: p.state,
          joinedAt: p.joinedAt,
          metadata: this.parseMetadata(p.metadata)
        }))
      };
    } catch (error) {
      logger.error('Error getting room participants:', error);
      return {
        success: false,
        error: error.message,
        participants: []
      };
    }
  }

  /**
   * End a room session
   * @param {string} roomName - Name of the room to end
   * @returns {Promise<Object>} Success status
   */
  async endRoom(roomName) {
    try {
      await this.roomService.deleteRoom(roomName);

      logger.info('Room ended successfully', { roomName });

      return {
        success: true,
        message: 'Room ended successfully',
        roomName
      };
    } catch (error) {
      logger.error('Error ending room:', error);
      return {
        success: false,
        error: error.message,
        roomName
      };
    }
  }

  /**
   * Send data message to room participants
   * @param {string} roomName - Name of the room
   * @param {string} data - Data to send
   * @param {Array} destinationSids - Specific participants (optional)
   * @returns {Promise<Object>} Success status
   */
  async sendDataToRoom(roomName, data, destinationSids = []) {
    try {
      // Ensure payload is a Buffer/Uint8Array and include required fields
      const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf-8');

      // Prefer explicit kind using the SDK's enum value if available, otherwise omit
      // Remove kind entirely; server defaults to RELIABLE and avoids JSON enum errors across SDK versions
      await this.roomService.sendData(roomName, payload, { topic: 'chat', destinationSids });

      logger.info('Data sent to room', {
        roomName,
        dataLength: data.length,
        destinationCount: destinationSids.length
      });

      return {
        success: true,
        message: 'Data sent successfully',
        roomName,
        dataLength: data.length
      };
    } catch (error) {
      logger.error('Error sending data to room:', error);
      return {
        success: false,
        error: error.message,
        roomName
      };
    }
  }

  /**
   * Parse duration string to seconds
   * @param {string} duration - Duration string (e.g., '24h', '30m', '3600s')
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    const match = duration.match(/^(\d+)([hms])$/);
    if (!match) return 24 * 60 * 60; // Default 24 hours

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 'h': return num * 60 * 60;
      case 'm': return num * 60;
      case 's': return num;
      default: return 24 * 60 * 60;
    }
  }

  /**
   * Parse JSON metadata safely
   * @param {string} metadata - JSON string
   * @returns {Object} Parsed metadata or empty object
   */
  parseMetadata(metadata) {
    try {
      return metadata ? JSON.parse(metadata) : {};
    } catch {
      return {};
    }
  }

  /**
   * Health check for LiveKit service
   * @returns {Promise<Object>} Service health status
   */
  async healthCheck() {
    try {
      // Try to list rooms as a health check
      await this.roomService.listRooms();

      return {
        success: true,
        status: 'healthy',
        wsUrl: this.wsUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('LiveKit health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        wsUrl: this.wsUrl,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const livekitService = new LiveKitService();
export default livekitService;

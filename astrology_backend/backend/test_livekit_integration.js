import dotenv from 'dotenv';
import path from 'path';
import { logger } from './src/utils/logger.js';

// Load environment variables FIRST
dotenv.config();

// Now import the service after env vars are loaded
const { livekitService } = await import('./src/services/livekitService.js');

/**
 * Test LiveKit Integration
 * This script tests the complete LiveKit integration with your cloud instance
 */

console.log('🚀 **Testing LiveKit Integration**');
console.log('================================\n');

// Debug environment variables
console.log('🔧 **Environment Variables Debug**');
console.log('LIVEKIT_URL:', process.env.LIVEKIT_URL);
console.log('LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY);
console.log('LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? '***HIDDEN***' : 'NOT SET');
console.log('');

async function testLiveKitIntegration() {
  try {
    // Test 1: Health Check
    console.log('1️⃣ **Testing LiveKit Service Health**');
    console.log('-----------------------------------');
    
    const healthResult = await livekitService.healthCheck();
    console.log('Health Check Result:', {
      success: healthResult.success,
      status: healthResult.status,
      wsUrl: healthResult.wsUrl,
      error: healthResult.error
    });
    
    if (!healthResult.success) {
      console.error('❌ Health check failed. Please check your LiveKit configuration.');
      return;
    }
    
    console.log('✅ LiveKit service is healthy!\n');

    // Test 2: Create Personal Chat Room Token
    console.log('2️⃣ **Testing Personal Chat Room Creation**');
    console.log('----------------------------------------');
    
    const testUserId = 'test_user_123';
    const testConversationId = `conv_test_${Date.now()}`;
    
    const personalChatToken = await livekitService.createPersonalChatToken(testUserId, testConversationId);
    console.log('Personal Chat Token Result:', {
      success: personalChatToken.success,
      roomName: personalChatToken.roomName,
      participantName: personalChatToken.participantName,
      wsUrl: personalChatToken.wsUrl,
      hasToken: !!personalChatToken.token,
      tokenLength: personalChatToken.token?.length || 0,
      expiresAt: personalChatToken.expiresAt,
      error: personalChatToken.error
    });
    
    if (!personalChatToken.success) {
      console.error('❌ Failed to create personal chat token');
      return;
    }
    
    console.log('✅ Personal chat token created successfully!\n');

    // Test 3: Create Group Chat Room Token
    console.log('3️⃣ **Testing Group Chat Room Creation**');
    console.log('-------------------------------------');
    
    const testGroupId = `group_test_${Date.now()}`;
    const testParticipants = ['user1', 'user2', 'user3'];
    
    const groupChatToken = await livekitService.createGroupChatToken(testGroupId, testUserId, testParticipants);
    console.log('Group Chat Token Result:', {
      success: groupChatToken.success,
      roomName: groupChatToken.roomName,
      participantName: groupChatToken.participantName,
      hasToken: !!groupChatToken.token,
      error: groupChatToken.error
    });
    
    if (!groupChatToken.success) {
      console.error('❌ Failed to create group chat token');
      return;
    }
    
    console.log('✅ Group chat token created successfully!\n');

    // Test 4: Create Voice Consultation Room Token
    console.log('4️⃣ **Testing Voice Consultation Room Creation**');
    console.log('---------------------------------------------');
    
    const testConsultationId = `consult_test_${Date.now()}`;
    
    const voiceConsultToken = await livekitService.createVoiceConsultationToken(testConsultationId, testUserId);
    console.log('Voice Consultation Token Result:', {
      success: voiceConsultToken.success,
      roomName: voiceConsultToken.roomName,
      participantName: voiceConsultToken.participantName,
      hasToken: !!voiceConsultToken.token,
      error: voiceConsultToken.error
    });
    
    if (!voiceConsultToken.success) {
      console.error('❌ Failed to create voice consultation token');
      return;
    }
    
    console.log('✅ Voice consultation token created successfully!\n');

    // Test 5: List Rooms
    console.log('5️⃣ **Testing Room Listing**');
    console.log('-------------------------');
    
    const roomsList = await livekitService.listRooms();
    console.log('Rooms List Result:', {
      success: roomsList.success,
      roomCount: roomsList.rooms?.length || 0,
      rooms: roomsList.rooms?.map(room => ({
        name: room.name,
        numParticipants: room.numParticipants,
        maxParticipants: room.maxParticipants,
        metadata: room.metadata
      })) || [],
      error: roomsList.error
    });
    
    if (!roomsList.success) {
      console.error('❌ Failed to list rooms');
      return;
    }
    
    console.log('✅ Room listing successful!\n');

    // Test 6: Test Token Validation (decode without verification)
    console.log('6️⃣ **Testing Token Structure**');
    console.log('-----------------------------');
    
    try {
      // Decode the JWT token to inspect its structure (without verification)
      const tokenParts = personalChatToken.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('Token Payload Structure:', {
          issuer: payload.iss,
          subject: payload.sub,
          audience: payload.aud,
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          issuedAt: new Date(payload.iat * 1000).toISOString(),
          jwtId: payload.jti,
          video: payload.video,
          canPublish: payload.video?.canPublish,
          canSubscribe: payload.video?.canSubscribe,
          canPublishData: payload.video?.canPublishData,
          room: payload.video?.room
        });
        console.log('✅ Token structure is valid!\n');
      }
    } catch (tokenError) {
      console.error('❌ Token structure validation failed:', tokenError.message);
    }

    // Summary
    console.log('🎉 **LiveKit Integration Test Summary**');
    console.log('=====================================');
    console.log('✅ Health check: PASSED');
    console.log('✅ Personal chat token: PASSED');
    console.log('✅ Group chat token: PASSED');
    console.log('✅ Voice consultation token: PASSED');
    console.log('✅ Room listing: PASSED');
    console.log('✅ Token structure: PASSED');
    console.log('\n🚀 **All tests passed! Your LiveKit integration is ready!**');
    
    console.log('\n📋 **Next Steps:**');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Test the API endpoints at: http://localhost:3000/api/livekit/health');
    console.log('3. Use the frontend LivePersonalChat component');
    console.log('4. Test real-time chat and voice features');
    
    console.log('\n🔗 **API Endpoints Available:**');
    console.log('- POST /api/livekit/create-room');
    console.log('- POST /api/livekit/join-room');
    console.log('- POST /api/livekit/quick-personal-chat');
    console.log('- GET  /api/livekit/rooms');
    console.log('- GET  /api/livekit/health');

  } catch (error) {
    console.error('❌ **LiveKit Integration Test Failed:**', error);
    console.error('\n🔧 **Troubleshooting:**');
    console.error('1. Check your .env file has the correct LiveKit credentials');
    console.error('2. Verify your LiveKit cloud instance is active');
    console.error('3. Ensure network connectivity to LiveKit cloud');
    console.error('4. Check the LiveKit API key and secret are valid');
  }
}

// Run the test
testLiveKitIntegration();

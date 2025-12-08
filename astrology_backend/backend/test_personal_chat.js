import { firestoreRAGService } from './src/services/firestoreRAGService.js';
import { logger } from './src/utils/logger.js';

async function testPersonalChat() {
  try {
    logger.info('=== TESTING PERSONAL CHAT FUNCTIONALITY ===');
    
    const testUserId = `test_user_chat_${Date.now()}`;
    
    // Test 1: Create User Profile
    logger.info('Test 1: Creating user profile for chat...');
    const userData = {
      name: 'Chat Test User',
      email: 'chat.test@example.com',
      birthData: {
        birthDate: '1990-06-15',
        birthTime: '14:30',
        latitude: 28.6139,
        longitude: 77.2090,
        placeOfBirth: 'New Delhi'
      },
      preferences: {
        notifications: true,
        theme: 'light'
      }
    };

    const profileResult = await firestoreRAGService.storeUserProfile(testUserId, userData);
    logger.info('✅ Profile created:', profileResult.success);

    // Test 2: Store Birth Chart
    logger.info('Test 2: Storing birth chart...');
    const chartData = {
      type: 'birth_chart',
      planets: [
        { name: 'Sun', sign: 'Gemini', house: 2, degree: 25 },
        { name: 'Moon', sign: 'Cancer', house: 3, degree: 18 },
        { name: 'Mercury', sign: 'Gemini', house: 2, degree: 30 },
        { name: 'Venus', sign: 'Taurus', house: 1, degree: 45 },
        { name: 'Mars', sign: 'Aries', house: 12, degree: 12 }
      ],
      houses: [
        { number: 1, sign: 'Taurus', degree: 15 },
        { number: 2, sign: 'Gemini', degree: 25 },
        { number: 3, sign: 'Cancer', degree: 18 }
      ]
    };

    const chartResult = await firestoreRAGService.storeChartData(testUserId, chartData);
    logger.info('✅ Chart stored:', chartResult.success);

    // Test 3: Test Chat Message Storage
    logger.info('Test 3: Testing chat message storage...');
    
    // Simulate a chat conversation
    const conversationId = `conv_${Date.now()}`;
    
    const userMessage = {
      role: 'user',
      content: 'What is my sun sign and what does it mean?',
      timestamp: new Date()
    };

    const systemMessage = {
      role: 'system',
      content: 'Based on your birth chart, your Sun is in Gemini at 25 degrees in the 2nd house. Gemini Sun individuals are known for their intellectual curiosity, adaptability, and excellent communication skills. With your Sun in the 2nd house, you likely have a strong focus on personal values, finances, and material security.',
      timestamp: new Date()
    };

    // Store messages
    const userMsgResult = await firestoreRAGService.firestoreService.storeChatMessage(
      testUserId, 
      conversationId, 
      userMessage
    );
    logger.info('✅ User message stored:', userMsgResult.success);

    const systemMsgResult = await firestoreRAGService.firestoreService.storeChatMessage(
      testUserId, 
      conversationId, 
      systemMessage
    );
    logger.info('✅ System message stored:', systemMsgResult.success);

    // Test 4: Retrieve Chat History
    logger.info('Test 4: Retrieving chat history...');
    const chatHistory = await firestoreRAGService.firestoreService.getChatHistory(conversationId, 10);
    logger.info('✅ Chat history retrieved:', {
      messageCount: chatHistory.length,
      hasUserMessage: chatHistory.some(msg => msg.role === 'user'),
      hasSystemMessage: chatHistory.some(msg => msg.role === 'system')
    });

    // Test 5: Test RAG Document Search
    logger.info('Test 5: Testing RAG document search...');
    const searchResults = await firestoreRAGService.searchRelevantDocuments(
      'What is my sun sign?', 
      testUserId, 
      3
    );
    logger.info('✅ RAG search completed:', {
      resultCount: searchResults.length,
      hasResults: searchResults.length > 0
    });

    // Test 6: Test Chart Retrieval for Chat Context
    logger.info('Test 6: Testing chart retrieval for chat context...');
    const userCharts = await firestoreRAGService.getAllUserCharts(testUserId);
    logger.info('✅ Charts retrieved for chat context:', {
      success: userCharts.success,
      totalCharts: userCharts.totalCharts,
      chartTypes: userCharts.chartTypes
    });

    // Test 7: Test Profile Retrieval for Chat Context
    logger.info('Test 7: Testing profile retrieval for chat context...');
    const userProfile = await firestoreRAGService.getUserProfile(testUserId);
    logger.info('✅ Profile retrieved for chat context:', {
      found: !!userProfile,
      name: userProfile?.profile?.name,
      birthData: !!userProfile?.profile?.birthData
    });

    // Test 8: Simulate Multiple Chat Sessions
    logger.info('Test 8: Testing multiple chat sessions...');
    const conversationId2 = `conv_${Date.now()}_2`;
    
    const followUpMessage = {
      role: 'user',
      content: 'Tell me more about my moon sign',
      timestamp: new Date()
    };

    const followUpResponse = {
      role: 'system',
      content: 'Your Moon is in Cancer at 18 degrees in the 3rd house. Cancer Moon individuals are deeply emotional, intuitive, and nurturing. With the Moon in the 3rd house, you likely have strong emotional connections to communication, siblings, and short-distance travel.',
      timestamp: new Date()
    };

    await firestoreRAGService.firestoreService.storeChatMessage(testUserId, conversationId2, followUpMessage);
    await firestoreRAGService.firestoreService.storeChatMessage(testUserId, conversationId2, followUpResponse);
    
    const chatHistory2 = await firestoreRAGService.firestoreService.getChatHistory(conversationId2, 10);
    logger.info('✅ Second chat session created:', {
      messageCount: chatHistory2.length,
      conversationId: conversationId2
    });

    logger.info('=== PERSONAL CHAT FUNCTIONALITY TEST COMPLETED ===');
    logger.info('Test User ID:', testUserId);
    logger.info('Conversation IDs:', [conversationId, conversationId2]);

    return {
      success: true,
      testUserId,
      conversationIds: [conversationId, conversationId2],
      results: {
        profile: profileResult.success,
        chart: chartResult.success,
        userMessage: userMsgResult.success,
        systemMessage: systemMsgResult.success,
        chatHistory: chatHistory.length === 2,
        ragSearch: searchResults.length >= 0,
        chartsForContext: userCharts.success,
        profileForContext: !!userProfile,
        multipleSessions: chatHistory2.length === 2
      }
    };

  } catch (error) {
    logger.error('Personal chat test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPersonalChat()
    .then(result => {
      if (result.success) {
        logger.info('✅ Personal chat functionality test passed successfully!');
        logger.info('Results:', JSON.stringify(result.results, null, 2));
        logger.info('Test User ID:', result.testUserId);
        logger.info('Conversation IDs:', result.conversationIds);
      } else {
        logger.error('❌ Personal chat functionality test failed!');
        logger.error('Error:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      logger.error('💥 Personal chat test crashed:', error);
      process.exit(1);
    });
}

export { testPersonalChat };

const testChatContext = async () => {
  console.log('🧪 Testing Chat Context with Conversation History...\n');
  
  // Use a real user that has chart data
  const realUserId = 'JhsRHjOheDfz0lugMwXCB5vZm5o1';
  
  const testData = {
    query: "go ahead",
    userContext: {
      userId: realUserId,
      birthData: {
        name: "Test User", day: 15, month: 6, year: 1990,
        hour: 14, minute: 30, latitude: 40.7128, longitude: -74.0060,
        place_of_birth: "New York"
      }
    },
    conversationHistory: [
      { type: "user", content: "which chart will have these data the specific planetary positions within the houses are not provided, so I'll base this analysis on the provided information and general astrological principles", timestamp: new Date().toISOString() },
      { type: "assistant", content: "To find the specific planetary positions within the houses for a detailed and accurate astrological analysis, you would look into the \"horo_chart\" (Horoscope Chart). The Horoscope Chart, or Natal Chart, maps out the exact positions of the planets in the various zodiac signs and the 12 houses at the time of your birth. This chart is foundational in astrology, as it provides a personal celestial snapshot of the energies and potentialities that influence your life, personality, and future. Would you like me to fetch and analyze your Horoscope Chart to provide you with insights based on the specific planetary positions within the houses?", timestamp: new Date().toISOString() }
    ],
    conversationId: "test_conv_123"
  };
  
  console.log('📤 Sending request with conversation history:');
  console.log(`- Real User ID: ${realUserId}`);
  console.log(`- Query: "${testData.query}"`);
  console.log(`- History Length: ${testData.conversationHistory.length}`);
  console.log(`- Previous User Message: "${testData.conversationHistory[0].content.substring(0, 100)}..."`);
  console.log(`- Previous Assistant Message: "${testData.conversationHistory[1].content.substring(0, 100)}..."\n`);
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dev_test_token_123' },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) { 
      throw new Error(`HTTP ${response.status}: ${response.statusText}`); 
    }
    
    const data = await response.json();
    console.log('✅ Response received successfully!');
    console.log(`- Success: ${data.success}`);
    console.log(`- Response Length: ${data.response?.length || 0} characters`);
    console.log(`- Response Preview: "${data.response?.substring(0, 200)}..."\n`);
    
    const maintainsContext = data.response && (
      data.response.toLowerCase().includes('horo_chart') ||
      data.response.toLowerCase().includes('birth chart') ||
      data.response.toLowerCase().includes('planetary positions') ||
      data.response.toLowerCase().includes('fetch') ||
      data.response.toLowerCase().includes('analyze')
    );
    
    console.log(`🎯 Context Maintenance: ${maintainsContext ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (maintainsContext) { 
      console.log('The AI maintained conversation context and continued the previous discussion about charts and analysis.'); 
    } else { 
      console.log('The AI lost conversation context and gave a generic response.'); 
    }
    
  } catch (error) { 
    console.error('❌ Error testing chat context:', error.message); 
  }
};

// Run the test
testChatContext();

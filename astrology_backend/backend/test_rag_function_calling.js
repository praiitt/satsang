#!/usr/bin/env node

/**
 * Test RAG Function Calling for Personal Chat
 * This demonstrates how charts should be chosen and passed to LLM context
 */

import ChartManagementService from './src/services/chartManagementService.js';
import { langChainService } from './src/services/langchainService.js';

// Mock data for testing (simulating what would come from Firestore)
const mockUserProfile = {
  userId: 'test_user_123',
  birth_data: JSON.stringify({
    name: 'Test User',
    birthDate: '1990-06-15',
    birthTime: '14:30',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 5.5
  })
};

const mockCharts = {
  'vedic_birth_chart': {
    type: 'vedic_birth_chart',
    data: {
      ascendant: 'Libra',
      moonSign: 'Cancer',
      sunSign: 'Gemini',
      planets: {
        sun: { sign: 'Gemini', house: 3, degree: 15.5 },
        moon: { sign: 'Cancer', house: 4, degree: 22.3 },
        mars: { sign: 'Aries', house: 1, degree: 8.7 }
      }
    },
    relevance: 0.95
  },
  'vedic_dasha': {
    type: 'vedic_dasha',
    data: {
      currentDasha: 'Jupiter',
      subDasha: 'Saturn',
      period: '2024-2027',
      predictions: 'Favorable period for career growth'
    },
    relevance: 0.88
  },
  'vedic_compatibility': {
    type: 'vedic_compatibility',
    data: {
      overallScore: 85,
      emotionalCompatibility: 90,
      intellectualCompatibility: 80,
      recommendations: 'Strong emotional bond, good communication needed'
    },
    relevance: 0.92
  }
};

console.log('🧠 **Testing RAG Function Calling for Personal Chat**');
console.log('==================================================\n');

// Test 1: Chart Management Service - Chart Selection
console.log('📊 **Test 1: Chart Selection for LLM Context**');
console.log('=============================================');

const chartManagementService = new ChartManagementService();

// Simulate user query
const userQuery = "What does my current dasha period mean for my career?";
console.log(`User Query: "${userQuery}"`);

// Test chart optimization
const optimizedCharts = chartManagementService.optimizeChartsForLLM(mockCharts, userQuery);
console.log('\nOptimized Charts for LLM:');
console.log('========================');

Object.entries(optimizedCharts.charts).forEach(([chartType, chartData]) => {
  console.log(`\n📈 ${chartType.toUpperCase()}:`);
  console.log(`   Relevance Score: ${chartData.relevance}`);
  console.log(`   Data Keys: ${Object.keys(chartData.data).join(', ')}`);
});

console.log(`\nTotal Relevant Charts: ${optimizedCharts.totalRelevantCharts}`);
console.log(`Query Analysis: ${optimizedCharts.queryAnalysis}`);

// Test 2: LLM Context Enhancement
console.log('\n\n🧠 **Test 2: LLM Context Enhancement**');
console.log('=====================================');

// Use existing langchain service instance
const langchainServiceInstance = langChainService;

// Simulate user context
const userContext = {
  userId: 'test_user_123',
  query: userQuery,
  message: userQuery,
  timestamp: new Date().toISOString()
};

console.log('User Context:', {
  userId: userContext.userId,
  query: userContext.query,
  timestamp: userContext.timestamp
});

// Mock the chart management service response
langchainServiceInstance.chartManagementService = {
  getChartsForLLMContext: async (userId, query) => {
    return {
      success: true,
      charts: optimizedCharts.charts,
      totalRelevantCharts: optimizedCharts.totalRelevantCharts,
      queryAnalysis: optimizedCharts.queryAnalysis,
      sessionId: 'TEST_SESSION_123'
    };
  }
};

// Test context enhancement
console.log('\nEnhancing user context for LLM...');
const enhancedContext = await langchainServiceInstance.enhanceUserContext(userContext);

console.log('\nEnhanced Context Result:');
console.log('========================');
console.log(`Has Chart Data: ${enhancedContext.hasChartData}`);
console.log(`Total Relevant Charts: ${enhancedContext.totalRelevantCharts}`);
console.log(`Chart Types: ${Object.keys(enhancedContext.chartData || {}).join(', ')}`);
console.log(`Query Analysis: ${enhancedContext.chartSummary}`);
console.log(`Session ID: ${enhancedContext.sessionId}`);

// Test 3: Function Calling Simulation
console.log('\n\n🔮 **Test 3: Function Calling Simulation**');
console.log('=======================================');

console.log('Based on the user query, the system should:');
console.log('1. Analyze query intent: Career-related dasha inquiry');
console.log('2. Select relevant charts: Vedic dasha chart (relevance: 0.88)');
console.log('3. Extract specific data: Current dasha period, predictions');
console.log('4. Pass to LLM context for personalized response');

console.log('\nLLM Context Data:');
console.log('==================');
if (enhancedContext.chartData) {
  Object.entries(enhancedContext.chartData).forEach(([chartType, chartData]) => {
    console.log(`\n📊 ${chartType}:`);
    console.log(`   Relevance: ${chartData.relevance}`);
    if (chartData.data.currentDasha) {
      console.log(`   Current Dasha: ${chartData.data.currentDasha}`);
      console.log(`   Period: ${chartData.data.period}`);
      console.log(`   Predictions: ${chartData.data.predictions}`);
    }
  });
}

// Test 4: Expected LLM Response
console.log('\n\n💬 **Test 4: Expected LLM Response**');
console.log('===================================');

console.log('The LLM should now generate a response like:');
console.log('"Based on your Vedic astrology chart, you are currently in a Jupiter-Saturn dasha period (2024-2027).');
console.log('This is a favorable time for career growth and professional development. Jupiter represents wisdom and');
console.log('expansion, while Saturn brings discipline and structure. Focus on long-term career planning and consider');
console.log('taking on leadership roles or advanced training opportunities."');

console.log('\n🎯 **Key Benefits of This System:**');
console.log('===================================');
console.log('✅ Intelligent chart selection based on query relevance');
console.log('✅ Contextual data extraction for personalized responses');
console.log('✅ Session tracking for debugging and optimization');
console.log('✅ Fallback mechanisms when RAG fails');
console.log('✅ Performance optimization through caching');

console.log('\n🚀 **System Ready for Integration!**');
console.log('===================================');
console.log('Once Firestore credentials are configured, this system will:');
console.log('1. Retrieve user charts from database');
console.log('2. Process them through RAG for semantic search');
console.log('3. Select most relevant charts for the query');
console.log('4. Enhance LLM context with personalized astrological data');
console.log('5. Generate contextually relevant responses');

console.log('\n📝 **Next Steps:**');
console.log('==================');
console.log('1. Configure Google Cloud credentials for Firestore');
console.log('2. Test with real user data and charts');
console.log('3. Monitor the debug logs we added');
console.log('4. Optimize chart selection algorithms based on usage');

console.log('\n🎉 **RAG Function Calling Test Complete!**');

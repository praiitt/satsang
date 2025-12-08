#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { langChainService } from './src/services/langchainService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testPineconeFunctionCalling() {
  console.log('\n🔍 Testing Pinecone Function Calling Integration\n');

  try {
    // Initialize LangChain service
    langChainService.initialize();
    console.log('✅ LangChain service initialized');

    // Test user context with mock data
    const userContext = {
      userId: 'test_user_pinecone',
      birthData: {
        name: 'Test User',
        day: 15,
        month: 6,
        year: 1990,
        hour: 14,
        minute: 30,
        latitude: 28.6139,
        longitude: 77.2090,
        placeOfBirth: 'New Delhi'
      },
      chartData: {
        astro_details: [{
          data: {
            ascendant: 'Scorpio',
            sign: 'Cancer',
            Naksahtra: 'Purva Bhadrapad'
          }
        }]
      },
      hasChartData: true
    };

    // Test query
    const query = "What's my personality like?";
    console.log(`📝 Test Query: "${query}"`);

    // Process the query
    console.log('\n🔄 Processing query with Pinecone function calling...');
    const response = await langChainService.processChatQuery(query, userContext, []);

    console.log('\n📊 Response Analysis:');
    console.log('✅ Success:', response.success);
    console.log('📝 Response Length:', response.response?.length || 0);
    console.log('🎯 Confidence:', response.confidence);
    console.log('📚 Sources:', response.sources);
    
    if (response.astrologicalContext) {
      console.log('🔍 Astrological Context:');
      console.log('  - Pinecone Search:', response.astrologicalContext.pineconeSearch);
      console.log('  - Chart Types Used:', response.astrologicalContext.chartDataUsed);
      console.log('  - Results Found:', response.astrologicalContext.resultsFound);
    }

    console.log('\n📄 Response Preview:');
    console.log(response.response?.substring(0, 300) + '...');

    if (response.success) {
      console.log('\n🎉 Pinecone Function Calling Test PASSED!');
      console.log('✅ The system successfully used Pinecone for chart data retrieval');
    } else {
      console.log('\n❌ Pinecone Function Calling Test FAILED');
      console.log('Error:', response.response);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPineconeFunctionCalling();

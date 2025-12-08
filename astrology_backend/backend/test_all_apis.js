import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  birthData: {
    birthDate: '1990-01-01',
    birthTime: '12:00',
    latitude: 28.6139,
    longitude: 77.2090,
    placeOfBirth: 'New Delhi'
  }
};

const testBirthData = {
  name: 'John Doe',
  day: 15,
  month: 5,
  year: 1990,
  hour: 14,
  minute: 30,
  latitude: 28.6139,
  longitude: 77.2090,
  place_of_birth: 'New Delhi'
};

let authToken = '';
let userId = '';

// Helper function to make requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 0, 
      error: error.message,
      data: error.response?.data 
    };
  }
}

// Test function
async function testEndpoint(name, method, endpoint, data = null, headers = {}, expectedStatus = 200) {
  testResults.total++;
  console.log(`Testing ${name}...`);
  
  const result = await makeRequest(method, endpoint, data, headers);
  
  const testResult = {
    name,
    method,
    endpoint,
    expectedStatus,
    actualStatus: result.status,
    success: result.success && result.status === expectedStatus,
    responseTime: result.responseTime || 0
  };
  
  if (testResult.success) {
    testResults.passed++;
    console.log(`✅ ${name} - PASSED (${result.status})`);
  } else {
    testResults.failed++;
    testResults.errors.push({
      name,
      error: result.error,
      status: result.status,
      data: result.data
    });
    console.log(`❌ ${name} - FAILED (${result.status}) - ${result.error}`);
  }
  
  testResults.details.push(testResult);
  return result;
}

// Main testing function
async function runAllTests() {
  console.log('🚀 Starting RRAASI API Testing...\n');
  
  // 1. Authentication Tests
  console.log('📝 Testing Authentication Endpoints...');
  
  // Sign Up
  const signupResult = await testEndpoint('Sign Up', 'POST', '/auth/signup', testUser, {}, 201);
  if (signupResult.success && signupResult.data.user) {
    userId = signupResult.data.user.uid;
    authToken = signupResult.data.token;
  }
  
  // Sign In
  const signinResult = await testEndpoint('Sign In', 'POST', '/auth/signin', {
    email: testUser.email,
    password: testUser.password
  }, {}, 200);
  
  if (signinResult.success && signinResult.data.token) {
    authToken = signinResult.data.token;
    userId = signinResult.data.user.uid;
  }
  
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  // Get User Profile
  await testEndpoint('Get User Profile', 'GET', '/auth/me', null, authHeaders, 200);
  
  // Verify Token
  await testEndpoint('Verify Token', 'POST', '/auth/verify-token', { token: authToken }, {}, 200);
  
  // 2. Chat Tests
  console.log('\n💬 Testing Chat Endpoints...');
  
  await testEndpoint('Basic Chat', 'POST', '/chat', {
    query: 'Tell me about my personality',
    conversationId: 'test_conv_123'
  }, authHeaders, 200);
  
  await testEndpoint('Birth Chart Chat', 'POST', '/chat/birth-chart', {
    birthData: testBirthData,
    query: 'Tell me about my personality'
  }, {}, 200);
  
  await testEndpoint('Get Reading', 'POST', '/chat/get-reading', {
    birthData: testBirthData,
    readingType: 'comprehensive'
  }, {}, 200);
  
  await testEndpoint('Current Transits', 'POST', '/chat/current-transits', {
    birthData: testBirthData
  }, {}, 200);
  
  await testEndpoint('New Conversation', 'POST', '/chat/new-conversation', {
    title: 'Test Chat',
    type: 'general'
  }, authHeaders, 200);
  
  await testEndpoint('Get All Conversations', 'GET', '/chat/conversations?limit=10', null, authHeaders, 200);
  
  await testEndpoint('Get Chat History', 'GET', '/chat/history?limit=10', null, authHeaders, 200);
  
  await testEndpoint('Chat Health Check', 'GET', '/chat/health', null, {}, 200);
  
  // 3. Matchmaking Tests
  console.log('\n💕 Testing Matchmaking Endpoints...');
  
  const maleData = {
    name: 'John Doe',
    day: 15,
    month: 5,
    year: 1990,
    hour: 14,
    minute: 30,
    latitude: 28.6139,
    longitude: 77.2090,
    placeOfBirth: 'New Delhi'
  };
  
  const femaleData = {
    name: 'Jane Smith',
    day: 20,
    month: 8,
    year: 1992,
    hour: 10,
    minute: 15,
    latitude: 19.0760,
    longitude: 72.8777,
    placeOfBirth: 'Mumbai'
  };
  
  await testEndpoint('Matchmaking Comprehensive Analysis', 'POST', '/matchmaking/comprehensive-analysis', {
    maleData,
    femaleData,
    matchType: 'marriage',
    focusAreas: ['emotional', 'intellectual']
  }, {}, 200);
  
  await testEndpoint('Partner Chat', 'POST', '/matchmaking/partner-chat', {
    userId: userId,
    query: 'What is our compatibility?',
    perspective: 'male',
    conversationId: 'match_conv_123'
  }, authHeaders, 200);
  
  await testEndpoint('Import Specific Chart', 'POST', '/matchmaking/import-chart', {
    maleData,
    femaleData,
    chartType: 'match_making_report'
  }, {}, 200);
  
  await testEndpoint('Import All Charts', 'POST', '/matchmaking/import-all-charts', {
    maleData,
    femaleData
  }, {}, 200);
  
  await testEndpoint('Get Matchmaking History', 'GET', `/matchmaking/history/${userId}`, null, {}, 200);
  
  await testEndpoint('Matchmaking Health Check', 'GET', '/matchmaking/health', null, {}, 200);
  
  // 4. Compatibility Tests
  console.log('\n🤝 Testing Compatibility Endpoints...');
  
  await testEndpoint('Group Analysis', 'POST', '/compatibility/group-analysis', {
    groupMembers: [
      {
        name: 'Alice',
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 28.6139,
        longitude: 77.2090,
        role: 'Leader'
      },
      {
        name: 'Bob',
        birthDate: '1988-12-03',
        birthTime: '09:15',
        latitude: 19.0760,
        longitude: 72.8777,
        role: 'Creative'
      }
    ],
    groupType: 'work',
    analysisFocus: 'dynamics',
    userId: userId,
    conversationId: 'group_conv_123'
  }, authHeaders, 200);
  
  await testEndpoint('Analyze Compatibility', 'POST', '/compatibility/analyze', {
    person1: {
      name: 'John Doe',
      birthDate: '1990-05-15',
      birthTime: '14:30',
      latitude: 28.6139,
      longitude: 77.2090,
      placeOfBirth: 'New Delhi'
    },
    person2: {
      name: 'Jane Smith',
      birthDate: '1988-12-03',
      birthTime: '09:15',
      latitude: 19.0760,
      longitude: 72.8777,
      placeOfBirth: 'Mumbai'
    },
    analysisType: 'comprehensive'
  }, {}, 200);
  
  await testEndpoint('Compatibility Health Check', 'GET', '/compatibility/health', null, {}, 200);
  
  // 5. Coins Tests
  console.log('\n🪙 Testing Coins Endpoints...');
  
  await testEndpoint('Get Coin Balance', 'GET', '/coins/balance', null, authHeaders, 200);
  
  await testEndpoint('Get Transaction History', 'GET', '/coins/transactions?limit=10', null, authHeaders, 200);
  
  await testEndpoint('Get Feature Costs', 'GET', '/coins/features', null, {}, 200);
  
  await testEndpoint('Check Feature Access', 'POST', '/coins/check-access', {
    featureId: 'basic_chat'
  }, authHeaders, 200);
  
  await testEndpoint('Add Bonus Coins', 'POST', '/coins/bonus', {
    userId: userId,
    amount: 100,
    reason: 'Test bonus'
  }, authHeaders, 200);
  
  await testEndpoint('Get Coin System Stats', 'GET', '/coins/stats', null, authHeaders, 200);
  
  // 6. Payments Tests
  console.log('\n💳 Testing Payments Endpoints...');
  
  await testEndpoint('Create Order', 'POST', '/payments/create-order', {
    planId: 'premium_monthly',
    userEmail: testUser.email
  }, {}, 200);
  
  await testEndpoint('Get Subscription Status', 'GET', `/payments/subscription-status?userId=${userId}`, null, {}, 200);
  
  // 7. Astrology Tests
  console.log('\n🔮 Testing Astrology Endpoints...');
  
  await testEndpoint('Comprehensive Analysis', 'POST', '/astrology/comprehensive-analysis', {
    userId: userId,
    birthData: testBirthData,
    analysisType: 'comprehensive'
  }, {}, 200);
  
  await testEndpoint('Import Charts', 'POST', '/astrology/import-charts', {
    userId: userId,
    birthData: testBirthData
  }, {}, 200);
  
  // 8. Comprehensive Astrology Tests
  console.log('\n🌟 Testing Comprehensive Astrology Endpoints...');
  
  await testEndpoint('Comprehensive Astrology Health Check', 'GET', '/comprehensive-astrology/health', null, {}, 200);
  
  await testEndpoint('Get Available Systems', 'GET', '/comprehensive-astrology/systems', null, {}, 200);
  
  await testEndpoint('Generate Birth Chart (Vedic)', 'POST', '/comprehensive-astrology/vedic/birth-chart', {
    birthData: {
      name: 'John Doe',
      day: 15,
      month: 5,
      year: 1990,
      hour: 14,
      minute: 30,
      latitude: 28.6139,
      longitude: 77.2090,
      placeOfBirth: 'New Delhi'
    },
    options: {
      includeAspects: true,
      includeHouses: true
    }
  }, {}, 200);
  
  await testEndpoint('Generate Predictions (Vedic)', 'POST', '/comprehensive-astrology/vedic/predictions', {
    birthData: {
      name: 'John Doe',
      day: 15,
      month: 5,
      year: 1990,
      hour: 14,
      minute: 30,
      latitude: 28.6139,
      longitude: 77.2090,
      placeOfBirth: 'New Delhi'
    },
    options: {
      predictionType: 'yearly',
      duration: 1
    }
  }, {}, 200);
  
  await testEndpoint('Generate Dasha', 'POST', '/comprehensive-astrology/vedic/dasha', {
    birthData: {
      name: 'John Doe',
      day: 15,
      month: 5,
      year: 1990,
      hour: 14,
      minute: 30,
      latitude: 28.6139,
      longitude: 77.2090,
      placeOfBirth: 'New Delhi'
    },
    options: {
      dashaType: 'major',
      duration: 5
    }
  }, {}, 200);
  
  // 9. Chart Management Tests
  console.log('\n📊 Testing Chart Management Endpoints...');
  
  await testEndpoint('Login Init', 'POST', '/chart-management/login-init', {
    userId: userId
  }, {}, 200);
  
  await testEndpoint('Generate Charts', 'POST', '/chart-management/generate-charts', {
    userId: userId,
    birthData: {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      latitude: 28.6139,
      longitude: 77.2090,
      placeOfBirth: 'New Delhi'
    }
  }, {}, 200);
  
  await testEndpoint('Get Chart Summary', 'GET', `/chart-management/summary/${userId}`, null, {}, 200);
  
  await testEndpoint('Get System Status', 'GET', '/chart-management/system-status', null, {}, 200);
  
  // 10. RAG Tests
  console.log('\n🔍 Testing RAG Endpoints...');
  
  await testEndpoint('Search Charts by Query', 'POST', '/rag/search', {
    userId: userId,
    query: 'Tell me about my personality'
  }, {}, 200);
  
  await testEndpoint('Get Chat History', 'GET', `/rag/chat-history/${userId}?limit=10`, null, {}, 200);
  
  // 11. Enhanced Chat Tests
  console.log('\n✨ Testing Enhanced Chat Endpoints...');
  
  await testEndpoint('Enhanced Chat Query', 'POST', '/enhanced-chat', {
    query: 'Tell me about my career prospects',
    conversationId: 'enhanced_conv_123'
  }, {}, 200);
  
  // 12. Hybrid RAG Tests
  console.log('\n🔄 Testing Hybrid RAG Endpoints...');
  
  await testEndpoint('Hybrid RAG Query', 'POST', '/hybrid-rag', {
    userId: userId,
    query: 'What are my lucky colors?'
  }, {}, 200);
  
  // 13. Waitlist Tests
  console.log('\n📝 Testing Waitlist Endpoints...');
  
  await testEndpoint('Join Waitlist', 'POST', '/waitlist', {
    email: 'waitlist@example.com',
    name: 'Waitlist User',
    interest: 'astrology'
  }, {}, 200);
  
  await testEndpoint('Get Waitlist Status', 'GET', '/waitlist/status?email=waitlist@example.com', null, {}, 200);
  
  // 14. Admin Tests
  console.log('\n👑 Testing Admin Endpoints...');
  
  await testEndpoint('Get All Users', 'GET', '/admin/users', null, {}, 200);
  
  await testEndpoint('Get User by ID', 'GET', `/admin/users/${userId}`, null, {}, 200);
  
  await testEndpoint('Get System Health', 'GET', '/admin/system/health', null, {}, 200);
  
  // Generate Report
  console.log('\n📊 TESTING COMPLETE - GENERATING REPORT...\n');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  console.log('='.repeat(60));
  console.log('🎯 RRAASI API TESTING REPORT');
  console.log('='.repeat(60));
  console.log(`📈 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  console.log('='.repeat(60));
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('-'.repeat(40));
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Error: ${error.error}`);
      if (error.data) {
        console.log(`   Response: ${JSON.stringify(error.data).substring(0, 100)}...`);
      }
      console.log('');
    });
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  console.log('-'.repeat(40));
  testResults.details.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name} (${test.method} ${test.endpoint}) - ${test.actualStatus}`);
  });
  
  console.log('\n🎉 Testing completed!');
  
  return testResults;
}

// Run the tests
runAllTests().catch(console.error);

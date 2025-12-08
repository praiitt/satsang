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
const testBirthData = {
  name: 'John Doe',
  gender: 'male',
  day: 15,
  month: 5,
  year: 1990,
  hour: 14,
  minute: 30,
  latitude: 28.6139,
  longitude: 77.2090,
  place: 'New Delhi, India'
};

const testFemaleData = {
  name: 'Jane Smith',
  gender: 'female',
  day: 20,
  month: 8,
  year: 1992,
  hour: 10,
  minute: 15,
  latitude: 19.0760,
  longitude: 72.8777,
  place: 'Mumbai, India'
};

const customization = {
  language: 'en',
  chart_style: 'NORTH_INDIAN',
  company_name: 'Rraasi Test',
  company_info: 'Testing PDF Generation'
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
      },
      timeout: 120000 // 2 minutes timeout for PDF generation
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
  console.log(`\n🧪 Testing ${name}...`);
  
  const startTime = Date.now();
  const result = await makeRequest(method, endpoint, data, headers);
  const responseTime = Date.now() - startTime;
  
  const testResult = {
    name,
    method,
    endpoint,
    expectedStatus,
    actualStatus: result.status,
    success: result.success && result.status === expectedStatus,
    responseTime: `${responseTime}ms`,
    data: result.data
  };
  
  if (testResult.success) {
    testResults.passed++;
    console.log(`✅ ${name} - PASSED (${result.status}) - ${responseTime}ms`);
    
    // Log PDF URL if available
    if (result.data && result.data.data && result.data.data.pdfUrl) {
      console.log(`📄 PDF URL: ${result.data.data.pdfUrl}`);
    }
  } else {
    testResults.failed++;
    testResults.errors.push({
      name,
      error: result.error,
      status: result.status,
      data: result.data,
      responseTime: `${responseTime}ms`
    });
    console.log(`❌ ${name} - FAILED (${result.status}) - ${responseTime}ms`);
    if (result.data && result.data.error) {
      console.log(`   Error: ${result.data.error}`);
    }
  }
  
  testResults.details.push(testResult);
  return result;
}

// Authentication helper
async function authenticate() {
  console.log('🔐 Authenticating...');
  
  const signinResult = await testEndpoint('Sign In', 'POST', '/auth/signin', {
    email: 'test@example.com',
    password: 'password123'
  }, {}, 200);
  
  if (signinResult.success && signinResult.data.token) {
    authToken = signinResult.data.token;
    userId = signinResult.data.user.uid;
    console.log(`✅ Authentication successful. User ID: ${userId}`);
    return true;
  } else {
    console.log('❌ Authentication failed');
    return false;
  }
}

// Main testing function
async function runPDFTests() {
  console.log('🚀 Starting PDF Generation API Testing...\n');
  console.log('=' .repeat(60));
  
  // Authenticate first
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  console.log('\n📋 Testing PDF Service Endpoints...');
  console.log('-'.repeat(40));
  
  // 1. Test PDF Types Endpoint
  await testEndpoint('Get PDF Types', 'GET', '/pdf/types', null, {}, 200);
  
  // 2. Test PDF Pricing Endpoint
  await testEndpoint('Get PDF Pricing', 'GET', '/pdf/pricing', null, {}, 200);
  
  // 3. Test PDF Health Check
  await testEndpoint('PDF Service Health Check', 'GET', '/pdf/health', null, {}, 200);
  
  console.log('\n📄 Testing PDF Generation...');
  console.log('-'.repeat(40));
  
  // 4. Test Mini Horoscope PDF (Lowest cost for testing)
  await testEndpoint('Generate Mini Horoscope PDF', 'POST', '/pdf/mini-horoscope', {
    birthData: testBirthData,
    customization: customization
  }, authHeaders, 200);
  
  // 5. Test Basic Horoscope PDF
  await testEndpoint('Generate Basic Horoscope PDF', 'POST', '/pdf/basic-horoscope', {
    birthData: testBirthData,
    customization: customization
  }, authHeaders, 200);
  
  // 6. Test Professional Horoscope PDF (Most expensive)
  await testEndpoint('Generate Professional Horoscope PDF', 'POST', '/pdf/professional-horoscope', {
    birthData: testBirthData,
    customization: customization
  }, authHeaders, 200);
  
  // 7. Test Match Making PDF
  await testEndpoint('Generate Match Making PDF', 'POST', '/pdf/match-making', {
    maleData: testBirthData,
    femaleData: testFemaleData,
    customization: customization
  }, authHeaders, 200);
  
  // 8. Test Universal PDF Generation Endpoint
  await testEndpoint('Universal PDF Generation - Mini', 'POST', '/pdf/generate', {
    type: 'mini_horoscope',
    birthData: testBirthData,
    customization: customization
  }, authHeaders, 200);
  
  // 9. Test PDF History
  await testEndpoint('Get PDF History', 'GET', '/pdf/history?limit=5', null, authHeaders, 200);
  
  console.log('\n🚫 Testing Error Cases...');
  console.log('-'.repeat(40));
  
  // 10. Test with missing birth data
  await testEndpoint('PDF Generation - Missing Birth Data', 'POST', '/pdf/mini-horoscope', {
    customization: customization
  }, authHeaders, 400);
  
  // 11. Test with invalid birth data
  await testEndpoint('PDF Generation - Invalid Birth Data', 'POST', '/pdf/mini-horoscope', {
    birthData: {
      name: 'Invalid User',
      day: 50, // Invalid day
      month: 15, // Invalid month
      year: 1800 // Too old
    },
    customization: customization
  }, authHeaders, 400);
  
  // 12. Test without authentication
  await testEndpoint('PDF Generation - No Auth', 'POST', '/pdf/mini-horoscope', {
    birthData: testBirthData,
    customization: customization
  }, {}, 401);
  
  // 13. Test unsupported PDF type
  await testEndpoint('PDF Generation - Invalid Type', 'POST', '/pdf/generate', {
    type: 'invalid_type',
    birthData: testBirthData,
    customization: customization
  }, authHeaders, 400);
  
  // 14. Test Match Making PDF with missing female data
  await testEndpoint('Match Making PDF - Missing Female Data', 'POST', '/pdf/match-making', {
    maleData: testBirthData,
    customization: customization
  }, authHeaders, 400);
  
  console.log('\n🌐 Testing Different Languages...');
  console.log('-'.repeat(40));
  
  // 15. Test Hindi PDF
  await testEndpoint('Mini PDF - Hindi Language', 'POST', '/pdf/mini-horoscope', {
    birthData: testBirthData,
    customization: { ...customization, language: 'hi' }
  }, authHeaders, 200);
  
  // Generate Report
  console.log('\n📊 PDF TESTING COMPLETE - GENERATING REPORT...\n');
  console.log('=' .repeat(60));
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  console.log('🎯 PDF GENERATION API TESTING REPORT');
  console.log('=' .repeat(60));
  console.log(`📈 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  console.log('=' .repeat(60));
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('-'.repeat(40));
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Response Time: ${error.responseTime}`);
      console.log(`   Error: ${error.error}`);
      if (error.data && error.data.error) {
        console.log(`   API Error: ${error.data.error}`);
      }
      console.log('');
    });
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  console.log('-'.repeat(40));
  testResults.details.forEach((test, index) => {
    const status = test.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name} (${test.method} ${test.endpoint}) - ${test.actualStatus} - ${test.responseTime}`);
  });
  
  // Summary of PDF URLs generated
  console.log('\n📄 GENERATED PDF URLS:');
  console.log('-'.repeat(40));
  let pdfCount = 0;
  testResults.details.forEach((test) => {
    if (test.success && test.data && test.data.data && test.data.data.pdfUrl) {
      pdfCount++;
      console.log(`${pdfCount}. ${test.name}: ${test.data.data.pdfUrl}`);
    }
  });
  
  if (pdfCount === 0) {
    console.log('No PDFs were successfully generated during testing.');
  } else {
    console.log(`\n🎉 Successfully generated ${pdfCount} PDF(s)!`);
  }
  
  console.log('\n🎉 PDF Testing completed!');
  console.log('\n💡 Next Steps:');
  console.log('   - Check generated PDF URLs to verify content');
  console.log('   - Test PDF download functionality');
  console.log('   - Verify coin deduction is working correctly');
  console.log('   - Test with different birth data variations');
  
  return testResults;
}

// Run the tests
runPDFTests().catch(console.error);

import { firestoreRAGService } from './src/services/firestoreRAGService.js';
import { logger } from './src/utils/logger.js';

async function testFirestoreOnly() {
  try {
    logger.info('=== STARTING FIRESTORE-ONLY TEST ===');
    
    const testUserId = `test_user_firestore_${Date.now()}`;
    
    // Test 1: Store User Profile
    logger.info('Test 1: Storing user profile...');
    const userData = {
      name: 'Test User Firestore',
      email: 'test.firestore@example.com',
      birthData: {
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 25.5941,
        longitude: 85.1376,
        placeOfBirth: 'Test City'
      },
      preferences: {
        notifications: true,
        theme: 'dark'
      }
    };

    const profileResult = await firestoreRAGService.storeUserProfile(testUserId, userData);
    logger.info('Profile storage result:', profileResult);

    // Test 2: Store Chart Data
    logger.info('Test 2: Storing chart data...');
    const chartData = {
      type: 'birth_chart',
      planets: [
        { name: 'Sun', sign: 'Capricorn', house: 1, degree: 15 },
        { name: 'Moon', sign: 'Pisces', house: 3, degree: 22 }
      ],
      houses: [
        { number: 1, sign: 'Capricorn', degree: 15 },
        { number: 2, sign: 'Aquarius', degree: 30 }
      ]
    };

    const chartResult = await firestoreRAGService.storeChartData(testUserId, chartData);
    logger.info('Chart storage result:', chartResult);

    // Test 3: Store User Contact
    logger.info('Test 3: Storing user contact...');
    const contactData = {
      name: 'Test Contact Firestore',
      email: 'contact.firestore@example.com',
      birthData: {
        birthDate: '1995-05-15',
        birthTime: '14:30',
        latitude: 28.6139,
        longitude: 77.2090
      },
      relationship: 'friend'
    };

    const contactResult = await firestoreRAGService.storeUserContact(testUserId, contactData);
    logger.info('Contact storage result:', contactResult);

    // Test 4: Retrieve Data
    logger.info('Test 4: Retrieving data...');

    const retrievedProfile = await firestoreRAGService.getUserProfile(testUserId);
    logger.info('Retrieved profile:', {
      found: !!retrievedProfile,
      source: retrievedProfile?.source,
      name: retrievedProfile?.profile?.name
    });

    const retrievedCharts = await firestoreRAGService.getAllUserCharts(testUserId);
    logger.info('Retrieved charts:', {
      success: retrievedCharts.success,
      totalCharts: retrievedCharts.totalCharts,
      chartTypes: retrievedCharts.chartTypes
    });

    const retrievedContacts = await firestoreRAGService.getUserContacts(testUserId);
    logger.info('Retrieved contacts:', {
      success: retrievedContacts.success,
      totalContacts: retrievedContacts.totalContacts,
      source: retrievedContacts.source
    });

    // Test 5: Health Check
    logger.info('Test 5: Health check...');
    const healthCheck = await firestoreRAGService.healthCheck();
    logger.info('Health check result:', {
      success: healthCheck.success,
      status: healthCheck.status,
      services: healthCheck.services
    });

    // Test 6: Vector Store Initialization
    logger.info('Test 6: Initializing vector store...');
    const vectorStoreInitialized = await firestoreRAGService.initializeVectorStore(testUserId);
    logger.info('Vector store initialization result:', { success: vectorStoreInitialized });

    // Test 7: Document Search
    logger.info('Test 7: Testing document search...');
    const searchResults = await firestoreRAGService.searchRelevantDocuments('Sun in Capricorn', testUserId, 3);
    logger.info('Search results:', {
      resultCount: searchResults.length,
      hasResults: searchResults.length > 0
    });

    logger.info('=== FIRESTORE-ONLY TEST COMPLETED SUCCESSFULLY ===');
    logger.info('Test User ID:', testUserId);

    return {
      success: true,
      testUserId,
      results: {
        profile: profileResult.success,
        chart: chartResult.success,
        contact: contactResult.success,
        retrieval: {
          profile: !!retrievedProfile,
          charts: retrievedCharts.success,
          contacts: retrievedContacts.success
        },
        healthCheck: healthCheck.success,
        vectorStore: vectorStoreInitialized,
        search: searchResults.length > 0
      }
    };

  } catch (error) {
    logger.error('Firestore-only test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFirestoreOnly()
    .then(result => {
      if (result.success) {
        logger.info('✅ Firestore-only test passed successfully!');
        logger.info('Results:', JSON.stringify(result.results, null, 2));
      } else {
        logger.error('❌ Firestore-only test failed!');
        logger.error('Error:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      logger.error('❌ Firestore-only test crashed:', error);
      process.exit(1);
    });
}

export { testFirestoreOnly };

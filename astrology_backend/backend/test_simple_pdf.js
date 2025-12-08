import { pdfGenerationService } from './src/services/pdfGenerationService.js';
import { logger } from './src/utils/logger.js';

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

const customization = {
  language: 'en',
  chart_style: 'NORTH_INDIAN',
  company_name: 'Rraasi',
  company_info: 'Your Personal Astrology Guide'
};

async function testPDFService() {
  console.log('🧪 Testing PDF Generation Service Directly...\n');
  
  try {
    // Test 1: Check service health
    console.log('1. Testing PDF Service Health...');
    const healthCheck = await pdfGenerationService.checkPDFServiceHealth();
    console.log('Health Status:', healthCheck);
    console.log('');
    
    // Test 2: Get available PDF types
    console.log('2. Getting Available PDF Types...');
    const pdfTypes = pdfGenerationService.getAvailablePDFTypes();
    console.log('Available Types:', Object.keys(pdfTypes));
    console.log('');
    
    // Test 3: Validate birth data
    console.log('3. Testing Birth Data Validation...');
    const formattedData = pdfGenerationService.formatBirthDataForPDF(testBirthData, customization);
    const isValid = pdfGenerationService.validateBirthData(formattedData);
    console.log('Formatted Data:', formattedData);
    console.log('Is Valid:', isValid);
    console.log('');
    
    if (isValid && healthCheck.status === 'healthy') {
      // Test 4: Generate Mini Horoscope PDF
      console.log('4. Generating Mini Horoscope PDF...');
      const startTime = Date.now();
      const result = await pdfGenerationService.generateMiniHoroscopePDF(testBirthData, customization);
      const duration = Date.now() - startTime;
      
      console.log('Result:', result);
      console.log('Duration:', `${duration}ms`);
      
      if (result.success) {
        console.log('✅ PDF Generated Successfully!');
        console.log('📄 PDF URL:', result.pdfUrl);
        console.log('📊 Type:', result.type);
        console.log('📄 Pages:', result.pages);
      } else {
        console.log('❌ PDF Generation Failed:', result.error);
        console.log('Error Type:', result.errorType);
      }
    } else {
      console.log('⚠️ Skipping PDF generation due to validation or health issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testPDFService();

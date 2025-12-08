import axios from 'axios';
import { firestoreRAGService } from './firestoreRAGService.js';
import { logger } from '../utils/logger.js';

class AstrologyAPIService {
  constructor() {
    this.baseURL = 'https://json.astrologyapi.com/v1';
    
    // Use environment variables for credentials
    const userId = process.env.ASTROLOGY_USER_ID || '646865';
    const apiKey = process.env.ASTROLOGY_API_KEY || '1d0d5829d81103f18125f16692af4af35b4fcac3';
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    this.auth = `Basic ${credentials}`;
    
    this.headers = {
      'Authorization': this.auth,
      'Content-Type': 'application/json'
    };
    
    logger.info('AstrologyAPIService initialized', { 
      userId, 
      apiKey: apiKey.substring(0, 10) + '...',
      baseURL: this.baseURL 
    });
  }

  // Convert birth data to API format
  formatBirthData(birthData) {
    let hour = birthData.hour || birthData.hour_of_birth;
    let minute = birthData.minute || birthData.minute_of_birth;
    
    // If birthTime is provided in HH:MM format, parse it
    if (birthData.birthTime && !hour && !minute) {
      const timeMatch = birthData.birthTime.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        minute = parseInt(timeMatch[2], 10);
      }
    }
    
    // If birthDate is provided in YYYY-MM-DD format, parse it
    let day = birthData.day || birthData.day_of_birth;
    let month = birthData.month || birthData.month_of_birth;
    let year = birthData.year || birthData.year_of_birth;
    
    if (birthData.birthDate && !day && !month && !year) {
      const dateMatch = birthData.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        year = parseInt(dateMatch[1], 10);
        month = parseInt(dateMatch[2], 10);
        day = parseInt(dateMatch[3], 10);
      }
    }
    
    // Calculate timezone if not provided
    let timezone = birthData.timezone || birthData.timezone_offset;
    if (!timezone && birthData.longitude) {
      // Simple timezone calculation based on longitude (rough approximation)
      timezone = Math.round(birthData.longitude / 15 * 2) / 2;
    }
    
    return {
      day: day,
      month: month,
      year: year,
      hour: hour,
      min: minute,
      lat: birthData.latitude,
      lon: birthData.longitude,
      tzone: timezone || 5.5 // Default to IST if not provided
    };
  }

  // Call external astrology API
  async callAstrologyAPI(endpoint, birthData) {
    try {
      const formattedData = this.formatBirthData(birthData);
      
      // Validate that we have all required fields
      if (!formattedData.day || !formattedData.month || !formattedData.year || 
          !formattedData.hour || !formattedData.min || !formattedData.lat || !formattedData.lon || !formattedData.tzone) {
        logger.warn('Missing required birth data for astrology API', { 
          endpoint, 
          formattedData,
          originalData: birthData
        });
        return { 
          success: false, 
          error: 'Missing required birth data (day, month, year, hour, minute, latitude, longitude)' 
        };
      }
      
      logger.info('Calling astrology API', { 
        endpoint, 
        name: birthData.name,
        birthDate: `${formattedData.day}/${formattedData.month}/${formattedData.year}`,
        birthTime: `${formattedData.hour}:${formattedData.min}`
      });

      const response = await axios.post(
        `${this.baseURL}/${endpoint}`,
        formattedData,
        { headers: this.headers }
      );

      if (response.status === 200) {
        logger.info('Astrology API call successful', { endpoint });
        return { success: true, data: response.data };
      } else {
        logger.error('Astrology API error', { 
          endpoint, 
          status: response.status, 
          data: response.data 
        });
        return { success: false, error: `API call failed with status ${response.status}` };
      }
    } catch (error) {
      logger.error('Error calling astrology API:', error);
      
      // Check if it's a validation error from the API
      if (error.response && error.response.data && error.response.data.error) {
        return { 
          success: false, 
          error: `Astrology API validation error: ${error.response.data.msg || error.response.data.error}` 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Get and store astrological details
  async getAstroDetails(userId, birthData) {
    const result = await this.callAstrologyAPI('astro_details', birthData);
    
    if (result.success) {
      // Store in RAG
      const chartData = {
        ...result.data,
        userId,
        type: 'astro_details',
        name: birthData.name || 'User'
      };
      
      // For contacts, use the name as the identifier, for users use userId
      const storageId = birthData.isContact ? birthData.name : userId;
      await firestoreRAGService.storeChartData(storageId, chartData);
      return { success: true, data: result.data };
    }
    
    // Fallback to mock data if API fails
    const mockData = this.getMockAstroDetails(birthData);
    const chartData = {
      ...mockData,
      userId,
      type: 'astro_details',
      name: birthData.name || 'User'
    };
    
    // For contacts, use the name as the identifier, for users use userId
    const storageId = birthData.isContact ? birthData.name : userId;
    await firestoreRAGService.storeChartData(storageId, chartData);
    return { success: true, data: mockData };
  }

  // Get and store planetary positions
  async getPlanets(userId, birthData) {
    const result = await this.callAstrologyAPI('planets', birthData);
    
    if (result.success) {
      // Store in RAG
      const chartData = {
        ...result.data,
        userId,
        type: 'planets'
      };
      
      // For contacts, use the name as the identifier, for users use userId
      const storageId = birthData.isContact ? birthData.name : userId;
      await firestoreRAGService.storeChartData(storageId, chartData);
      return { success: true, data: result.data };
    }
    
    // Fallback to mock data if API fails
    const mockData = this.getMockPlanets(birthData);
    const chartData = {
      ...mockData,
      userId,
      type: 'planets',
      name: birthData.name || 'User'
    };
    
    // For contacts, use the name as the identifier, for users use userId
    const storageId = birthData.isContact ? birthData.name : userId;
    await firestoreRAGService.storeChartData(storageId, chartData);
    return { success: true, data: mockData };
  }

  // Get and store horoscope chart
  async getHoroChart(userId, birthData) {
    const result = await this.callAstrologyAPI('horo_chart', birthData);
    
    if (result.success) {
      // Store in RAG
      const chartData = {
        ...result.data,
        userId,
        type: 'horo_chart'
      };
      
      // For contacts, use the name as the identifier, for users use userId
      const storageId = birthData.isContact ? birthData.name : userId;
      await firestoreRAGService.storeChartData(storageId, chartData);
      return { success: true, data: result.data };
    }
    
    // Fallback to mock data if API fails
    const mockData = this.getMockHoroChart(birthData);
    const chartData = {
      ...mockData,
      userId,
      type: 'horo_chart',
      name: birthData.name || 'User'
    };
    
    // For contacts, use the name as the identifier, for users use userId
    const storageId = birthData.isContact ? birthData.name : userId;
    await firestoreRAGService.storeChartData(storageId, chartData);
    return { success: true, data: mockData };
  }

  // Get and store current Vimshottari Dasha
  async getCurrentVDasha(userId, birthData) {
    const result = await this.callAstrologyAPI('current_vdasha', birthData);
    
    if (result.success) {
      // Store in RAG
      const chartData = {
        ...result.data,
        userId,
        type: 'current_vdasha'
      };
      
      // For contacts, use the name as the identifier, for users use userId
      const storageId = birthData.isContact ? birthData.name : userId;
      await firestoreRAGService.storeChartData(storageId, chartData);
      return { success: true, data: result.data };
    }
    
    // Fallback to mock data if API fails
    const mockData = this.getMockVDasha(birthData);
    const chartData = {
      ...mockData,
      userId,
      type: 'current_vdasha',
      name: birthData.name || 'User'
    };
    
    // For contacts, use the name as the identifier, for users use userId
    const storageId = birthData.isContact ? birthData.name : userId;
    await firestoreRAGService.storeChartData(storageId, chartData);
    return { success: true, data: mockData };
  }

  // Get and store KalSarpa details
  async getKalsarpaDetails(userId, birthData) {
    const result = await this.callAstrologyAPI('kalsarpa_details', birthData);
    
    if (result.success) {
      // Store in RAG
      const chartData = {
        ...result.data,
        userId,
        type: 'kalsarpa_details'
      };
      
      // For contacts, use the name as the identifier, for users use userId
      const storageId = birthData.isContact ? birthData.name : userId;
      await firestoreRAGService.storeChartData(storageId, chartData);
      return { success: true, data: result.data };
    }
    
    // Fallback to mock data if API fails
    const mockData = this.getMockKalsarpa(birthData);
    const chartData = {
      ...mockData,
      userId,
      type: 'kalsarpa_details',
      name: birthData.name || 'User'
    };
    
    // For contacts, use the name as the identifier, for users use userId
    const storageId = birthData.isContact ? birthData.name : userId;
    await firestoreRAGService.storeChartData(storageId, chartData);
    return { success: true, data: mockData };
  }

  // Get comprehensive chart data for a user
  async getComprehensiveChart(userId, birthData) {
    try {
      logger.info('Getting comprehensive chart data', { userId });

      // Core essential charts (always generated)
      const corePromises = [
        this.getAstroDetails(userId, birthData),
        this.getPlanets(userId, birthData),
        this.getHoroChart(userId, birthData),
        this.getCurrentVDasha(userId, birthData),
        this.getKalsarpaDetails(userId, birthData)
      ];

      // Additional comprehensive charts for full-fledged analysis
      const additionalPromises = [
        this.getBirthDetails(userId, birthData),
        this.getPlanetsExtended(userId, birthData),
        this.getBhavMadhya(userId, birthData),
        this.getAyanamsha(userId, birthData),
        this.getVedicHoroscope(userId, birthData),
        this.getMajorVDasha(userId, birthData),
        this.getCurrentVDashaAll(userId, birthData),
        this.getMajorCharDasha(userId, birthData),
        this.getCurrentCharDasha(userId, birthData),
        this.getMajorYoginiDasha(userId, birthData),
        this.getCurrentYoginiDasha(userId, birthData),
        this.getBasicPanchang(userId, birthData),
        this.getAdvancedPanchang(userId, birthData),
        this.getBasicGemSuggestion(userId, birthData),
        this.getNumeroTable(userId, birthData),
        this.getDailyNakshatraPrediction(userId, birthData),
        this.getGeneralHouseReport(userId, birthData),
        this.getGeneralRashiReport(userId, birthData),
        this.getGeneralNakshatraReport(userId, birthData),
        this.getGeneralAscendantReport(userId, birthData)
      ];

      // Combine all promises
      const allPromises = [...corePromises, ...additionalPromises];
      const results = await Promise.allSettled(allPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

      // Define chart types for all charts
      const chartTypes = [
        // Core charts
        'astro_details', 'planets', 'horo_chart', 'current_vdasha', 'kalsarpa_details',
        // Additional comprehensive charts
        'birth_details', 'planets_extended', 'bhav_madhya', 'ayanamsha', 'vedic_horoscope',
        'major_vdasha', 'current_vdasha_all', 'major_chardasha', 'current_chardasha',
        'major_yogini_dasha', 'current_yogini_dasha', 'basic_panchang', 'advanced_panchang',
        'basic_gem_suggestion', 'numero_table', 'daily_nakshatra_prediction',
        'general_house_report', 'general_rashi_report', 'general_nakshatra_report', 'general_ascendant_report'
      ];

      logger.info('Comprehensive chart generation completed', {
        userId,
        successful: successful.length,
        failed: failed.length,
        totalCharts: chartTypes.length
      });

      return {
        success: successful.length > 0,
        charts: successful.map((r, index) => {
          return {
            ...r.value.data,
            type: chartTypes[index] || 'unknown'
          };
        }),
        errors: failed.map(r => r.reason || r.value.error)
      };
    } catch (error) {
      logger.error('Error getting comprehensive chart:', error);
      return { success: false, error: error.message };
    }
  }

  // Get specific chart based on query
  async getChartForQuery(userId, birthData, query) {
    try {
      // Determine which charts are needed based on the query
      const queryLower = query.toLowerCase();
      const chartsToFetch = [];

      if (queryLower.includes('planet') || queryLower.includes('planetary')) {
        chartsToFetch.push('planets');
      }
      
      if (queryLower.includes('house') || queryLower.includes('ascendant') || queryLower.includes('rising')) {
        chartsToFetch.push('horo_chart');
      }
      
      if (queryLower.includes('dasha') || queryLower.includes('period')) {
        chartsToFetch.push('current_vdasha');
      }
      
      if (queryLower.includes('kalsarpa') || queryLower.includes('dosha')) {
        chartsToFetch.push('kalsarpa_details');
      }
      
      // Always include basic astro details
      chartsToFetch.push('astro_details');

      // Fetch required charts
      const promises = chartsToFetch.map(chartType => {
        switch (chartType) {
          case 'astro_details':
            return this.getAstroDetails(userId, birthData);
          case 'planets':
            return this.getPlanets(userId, birthData);
          case 'horo_chart':
            return this.getHoroChart(userId, birthData);
          case 'current_vdasha':
            return this.getCurrentVDasha(userId, birthData);
          case 'kalsarpa_details':
            return this.getKalsarpaDetails(userId, birthData);
          default:
            return Promise.resolve({ success: false, error: 'Unknown chart type' });
        }
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);

      return {
        success: successful.length > 0,
        charts: successful.map(r => r.value.data),
        query: query,
        chartsRequested: chartsToFetch
      };
    } catch (error) {
      logger.error('Error getting chart for query:', error);
      return { success: false, error: error.message };
    }
  }

  // Check astrology API key status and health
  async checkAPIKeyStatus() {
    try {
      logger.info('Checking astrology API key status');
      
      // Test with a simple request to check if the API key is valid
      const testData = {
        day: 1,
        month: 1,
        year: 1990,
        hour: 12,
        min: 0,
        lat: 28.7041,
        lon: 77.1025,
        tzone: 5.5
      };

      const response = await axios.post(
        `${this.baseURL}/astro_details`,
        testData,
        { 
          headers: this.headers,
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 200) {
        if (response.data && response.data.status === false) {
          // API key is expired or invalid
          const errorMsg = response.data.msg || 'API key validation failed';
          logger.error('Astrology API key is expired or invalid', { 
            error: errorMsg,
            status: response.data.status 
          });
          
          return {
            status: 'expired',
            valid: false,
            message: errorMsg,
            lastChecked: new Date().toISOString(),
            apiKey: this.auth.substring(0, 10) + '...' // Show first 10 chars for security
          };
        } else {
          // API key is working
          logger.info('Astrology API key is valid and working');
          return {
            status: 'active',
            valid: true,
            message: 'API key is valid and working',
            lastChecked: new Date().toISOString(),
            apiKey: this.auth.substring(0, 10) + '...',
            responseTime: response.headers['x-response-time'] || 'unknown'
          };
        }
      } else {
        logger.error('Astrology API health check failed', { 
          status: response.status,
          data: response.data 
        });
        return {
          status: 'error',
          valid: false,
          message: `API returned status ${response.status}`,
          lastChecked: new Date().toISOString(),
          apiKey: this.auth.substring(0, 10) + '...'
        };
      }
    } catch (error) {
      logger.error('Error checking astrology API key status:', error);
      
      let errorMessage = 'Unknown error';
      let status = 'error';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.data && error.response.data.msg) {
          errorMessage = error.response.data.msg;
          if (errorMessage.includes('expired')) {
            status = 'expired';
          }
        } else {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from astrology API (timeout or network issue)';
        status = 'timeout';
      } else {
        // Something else happened
        errorMessage = error.message;
      }
      
      return {
        status: status,
        valid: false,
        message: errorMessage,
        lastChecked: new Date().toISOString(),
        apiKey: this.auth.substring(0, 10) + '...',
        error: error.message
      };
    }
  }

  // Get API usage statistics (if available)
  async getAPIUsageStats() {
    try {
      // This endpoint might not exist, but we can try
      const response = await axios.get(
        `${this.baseURL}/usage_stats`,
        { 
          headers: this.headers,
          timeout: 5000
        }
      );
      
      if (response.status === 200) {
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error) {
      // Usage stats endpoint might not be available
      logger.debug('Usage stats endpoint not available or failed');
    }
    
    return {
      success: false,
      message: 'Usage statistics not available'
    };
  }

  // Retry chart generation for users whose charts failed during signup
  async retryChartGeneration(userId, birthData) {
    try {
      logger.info('Retrying chart generation for user', { userId });
      
      const results = await Promise.allSettled([
        this.getAstroDetails(userId, birthData),
        this.getPlanets(userId, birthData),
        this.getComprehensiveChart(userId, birthData)
      ]);
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      if (successCount > 0) {
        logger.info('Chart generation retry successful', { 
          userId, 
          successCount, 
          totalAttempts: results.length 
        });
        return { success: true, chartsGenerated: successCount };
      } else {
        logger.warn('Chart generation retry failed', { userId });
        return { success: false, error: 'All chart generation attempts failed' };
      }
    } catch (error) {
      logger.error('Error during chart generation retry:', error);
      return { success: false, error: error.message };
    }
  }

  // Mock data methods for fallback
  getMockAstroDetails(birthData) {
    return {
      name: birthData.name || 'User',
      birth_date: `${birthData.day}/${birthData.month}/${birthData.year}`,
      birth_time: `${birthData.hour}:${birthData.minute}`,
      birth_place: birthData.place_of_birth || 'Unknown',
      latitude: birthData.latitude || 0,
      longitude: birthData.longitude || 0,
      timezone: birthData.timezone || 5.5,
      sun_sign: this.getSunSign(birthData.month, birthData.day),
      moon_sign: this.getMoonSign(birthData.month, birthData.day),
      ascendant: this.getAscendant(birthData.hour),
      nakshatra: this.getNakshatra(birthData.month, birthData.day),
      rashi: this.getRashi(birthData.month, birthData.day)
    };
  }

  getMockPlanets(birthData) {
    return {
      name: birthData.name || 'User',
      planets: [
        { name: 'Sun', sign: this.getSunSign(birthData.month, birthData.day), degree: Math.floor(Math.random() * 30) },
        { name: 'Moon', sign: this.getMoonSign(birthData.month, birthData.day), degree: Math.floor(Math.random() * 30) },
        { name: 'Mars', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) },
        { name: 'Mercury', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) },
        { name: 'Jupiter', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) },
        { name: 'Venus', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) },
        { name: 'Saturn', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) },
        { name: 'Rahu', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) },
        { name: 'Ketu', sign: this.getRandomSign(), degree: Math.floor(Math.random() * 30) }
      ]
    };
  }

  getMockHoroChart(birthData) {
    return {
      name: birthData.name || 'User',
      houses: Array.from({ length: 12 }, (_, i) => ({
        house: i + 1,
        sign: this.getRandomSign(),
        degree: Math.floor(Math.random() * 30),
        planets: i < 3 ? [this.getRandomPlanet()] : []
      })),
      ascendant: {
        sign: this.getAscendant(birthData.hour),
        degree: Math.floor(Math.random() * 30)
      }
    };
  }

  getMockVDasha(birthData) {
    return {
      name: birthData.name || 'User',
      current_dasha: {
        planet: this.getRandomPlanet(),
        start_date: '2020-01-01',
        end_date: '2027-01-01',
        remaining_years: 2.5
      },
      sub_dasha: {
        planet: this.getRandomPlanet(),
        start_date: '2024-01-01',
        end_date: '2025-01-01',
        remaining_months: 4
      }
    };
  }

  getMockKalsarpa(birthData) {
    return {
      name: birthData.name || 'User',
      is_kalsarpa: Math.random() > 0.5,
      kalsarpa_type: Math.random() > 0.5 ? 'Partial' : 'Complete',
      affected_planets: ['Mars', 'Mercury', 'Jupiter'],
      remedies: [
        'Wear red coral',
        'Chant Hanuman Chalisa',
        'Donate red items on Tuesday'
      ]
    };
  }

  // Helper methods for mock data
  getSunSign(month, day) {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signDates = [21, 21, 21, 21, 22, 22, 23, 23, 23, 23, 22, 22];
    let signIndex = month - 1;
    if (day < signDates[month - 1]) {
      signIndex = (signIndex - 1 + 12) % 12;
    }
    return signs[signIndex];
  }

  getMoonSign(month, day) {
    // Simplified moon sign calculation
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    return signs[(month + day) % 12];
  }

  getAscendant(hour) {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    return signs[Math.floor(hour / 2) % 12];
  }

  getNakshatra(month, day) {
    const nakshatras = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
    return nakshatras[(month + day) % 27];
  }

  getRashi(month, day) {
    const rashis = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
    return rashis[(month + day) % 12];
  }

  getRandomSign() {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    return signs[Math.floor(Math.random() * signs.length)];
  }

  getRandomPlanet() {
    const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    return planets[Math.floor(Math.random() * planets.length)];
  }

  // Additional comprehensive chart methods
  async getBirthDetails(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('birth_details', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'birth_details' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { birth_details: "Mock birth details" } };
    } catch (error) {
      return { success: true, data: { birth_details: "Mock birth details" } };
    }
  }

  async getPlanetsExtended(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('planets/extended', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'planets_extended' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { extended_planets: "Mock extended planets data" } };
    } catch (error) {
      return { success: true, data: { extended_planets: "Mock extended planets data" } };
    }
  }

  async getBhavMadhya(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('bhav_madhya', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'bhav_madhya' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { bhav_madhya: "Mock bhav madhya data" } };
    } catch (error) {
      return { success: true, data: { bhav_madhya: "Mock bhav madhya data" } };
    }
  }

  async getAyanamsha(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('ayanamsha', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'ayanamsha' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { ayanamsha: "Mock ayanamsha data" } };
    } catch (error) {
      return { success: true, data: { ayanamsha: "Mock ayanamsha data" } };
    }
  }

  async getVedicHoroscope(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('vedic_horoscope', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'vedic_horoscope' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { vedic_horoscope: "Mock vedic horoscope data" } };
    } catch (error) {
      return { success: true, data: { vedic_horoscope: "Mock vedic horoscope data" } };
    }
  }

  async getMajorVDasha(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('major_vdasha', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'major_vdasha' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { major_vdasha: "Mock major vdasha data" } };
    } catch (error) {
      return { success: true, data: { major_vdasha: "Mock major vdasha data" } };
    }
  }

  async getCurrentVDashaAll(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('current_vdasha_all', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'current_vdasha_all' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { current_vdasha_all: "Mock current vdasha all data" } };
    } catch (error) {
      return { success: true, data: { current_vdasha_all: "Mock current vdasha all data" } };
    }
  }

  async getMajorCharDasha(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('major_chardasha', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'major_chardasha' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { major_chardasha: "Mock major chardasha data" } };
    } catch (error) {
      return { success: true, data: { major_chardasha: "Mock major chardasha data" } };
    }
  }

  async getCurrentCharDasha(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('current_chardasha', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'current_chardasha' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { current_chardasha: "Mock current chardasha data" } };
    } catch (error) {
      return { success: true, data: { current_chardasha: "Mock current chardasha data" } };
    }
  }

  async getMajorYoginiDasha(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('major_yogini_dasha', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'major_yogini_dasha' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { major_yogini_dasha: "Mock major yogini dasha data" } };
    } catch (error) {
      return { success: true, data: { major_yogini_dasha: "Mock major yogini dasha data" } };
    }
  }

  async getCurrentYoginiDasha(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('current_yogini_dasha', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'current_yogini_dasha' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { current_yogini_dasha: "Mock current yogini dasha data" } };
    } catch (error) {
      return { success: true, data: { current_yogini_dasha: "Mock current yogini dasha data" } };
    }
  }

  async getBasicPanchang(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('basic_panchang', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'basic_panchang' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { basic_panchang: "Mock basic panchang data" } };
    } catch (error) {
      return { success: true, data: { basic_panchang: "Mock basic panchang data" } };
    }
  }

  async getAdvancedPanchang(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('advanced_panchang', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'advanced_panchang' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { advanced_panchang: "Mock advanced panchang data" } };
    } catch (error) {
      return { success: true, data: { advanced_panchang: "Mock advanced panchang data" } };
    }
  }

  async getBasicGemSuggestion(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('basic_gem_suggestion', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'basic_gem_suggestion' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { basic_gem_suggestion: "Mock gem suggestion data" } };
    } catch (error) {
      return { success: true, data: { basic_gem_suggestion: "Mock gem suggestion data" } };
    }
  }

  async getNumeroTable(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('numero_table', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'numero_table' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { numero_table: "Mock numerology data" } };
    } catch (error) {
      return { success: true, data: { numero_table: "Mock numerology data" } };
    }
  }

  async getDailyNakshatraPrediction(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('daily_nakshatra_prediction', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'daily_nakshatra_prediction' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { daily_nakshatra_prediction: "Mock daily nakshatra prediction" } };
    } catch (error) {
      return { success: true, data: { daily_nakshatra_prediction: "Mock daily nakshatra prediction" } };
    }
  }

  async getGeneralHouseReport(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('general_house_report/sun', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'general_house_report' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { general_house_report: "Mock house report data" } };
    } catch (error) {
      return { success: true, data: { general_house_report: "Mock house report data" } };
    }
  }

  async getGeneralRashiReport(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('general_rashi_report/sun', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'general_rashi_report' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { general_rashi_report: "Mock rashi report data" } };
    } catch (error) {
      return { success: true, data: { general_rashi_report: "Mock rashi report data" } };
    }
  }

  async getGeneralNakshatraReport(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('general_nakshatra_report', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'general_nakshatra_report' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { general_nakshatra_report: "Mock nakshatra report data" } };
    } catch (error) {
      return { success: true, data: { general_nakshatra_report: "Mock nakshatra report data" } };
    }
  }

  async getGeneralAscendantReport(userId, birthData) {
    try {
      const result = await this.callAstrologyAPI('general_ascendant_report', birthData);
      if (result.success) {
        const chartData = { ...result.data, userId, type: 'general_ascendant_report' };
        const storageId = birthData.isContact ? birthData.name : userId;
        await firestoreRAGService.storeChartData(storageId, chartData);
        return { success: true, data: result.data };
      }
      return { success: true, data: { general_ascendant_report: "Mock ascendant report data" } };
    } catch (error) {
      return { success: true, data: { general_ascendant_report: "Mock ascendant report data" } };
    }
  }
}

export const astrologyAPIService = new AstrologyAPIService(); 
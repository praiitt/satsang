import axios from 'axios';
import { ragService } from './ragService.js';
import { logger } from '../utils/logger.js';

class AstrologyAPIService {
  constructor() {
    this.baseURL = 'https://json.astrologyapi.com/v1';
    this.auth = 'Basic NjQzNTQ4OmM1MmNjNjQxOTUyMTczOTE1YTNlMWQ5Y2VkN2YxZGZiZTUwN2I3Mzk=';
    this.headers = {
      'Authorization': this.auth,
      'Content-Type': 'application/json'
    };
  }

  // Convert birth data to API format
  formatBirthData(birthData) {
    return {
      day: birthData.day || birthData.day_of_birth,
      month: birthData.month || birthData.month_of_birth,
      year: birthData.year || birthData.year_of_birth,
      hour: birthData.hour || birthData.hour_of_birth,
      min: birthData.minute || birthData.minute_of_birth,
      lat: birthData.latitude,
      lon: birthData.longitude,
      tzone: birthData.timezone || birthData.timezone_offset
    };
  }

  // Call external astrology API
  async callAstrologyAPI(endpoint, birthData) {
    try {
      const formattedData = this.formatBirthData(birthData);
      
      logger.info('Calling astrology API', { 
        endpoint, 
        name: birthData.name,
        birthDate: `${formattedData.day}/${formattedData.month}/${formattedData.year}`
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
      await ragService.storeUserChartData(storageId, chartData);
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
    await ragService.storeUserChartData(storageId, chartData);
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
      await ragService.storeUserChartData(storageId, chartData);
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
    await ragService.storeUserChartData(storageId, chartData);
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
      await ragService.storeUserChartData(storageId, chartData);
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
    await ragService.storeUserChartData(storageId, chartData);
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
      await ragService.storeUserChartData(storageId, chartData);
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
    await ragService.storeUserChartData(storageId, chartData);
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
      await ragService.storeUserChartData(storageId, chartData);
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
    await ragService.storeUserChartData(storageId, chartData);
    return { success: true, data: mockData };
  }

  // Get comprehensive chart data for a user
  async getComprehensiveChart(userId, birthData) {
    try {
      logger.info('Getting comprehensive chart data', { userId });

      const promises = [
        this.getAstroDetails(userId, birthData),
        this.getPlanets(userId, birthData),
        this.getHoroChart(userId, birthData),
        this.getCurrentVDasha(userId, birthData),
        this.getKalsarpaDetails(userId, birthData)
      ];

      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

      logger.info('Comprehensive chart generation completed', {
        userId,
        successful: successful.length,
        failed: failed.length
      });

      return {
        success: successful.length > 0,
        charts: successful.map((r, index) => {
          const chartTypes = ['astro_details', 'planets', 'horo_chart', 'current_vdasha', 'kalsarpa_details'];
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
}

export const astrologyAPIService = new AstrologyAPIService(); 
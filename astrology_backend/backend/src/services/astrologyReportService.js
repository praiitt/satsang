import axios from 'axios';
import { logger } from '../utils/logger.js';

class AstrologyReportService {
  constructor() {
    this.baseURL = 'https://json.astrologyapi.com/v1';
    
    // Use environment variables for credentials
    const userId = process.env.ASTROLOGY_USER_ID || '646865';
    const apiKey = process.env.ASTROLOGY_API_KEY || '1d0d5829d81103f18125f16692af4af35b4fcac3';
    
    // Create Auth header
    if (apiKey.startsWith('ak-')) {
      this.headers = {
        'x-astrologyapi-key': apiKey,
        'Content-Type': 'application/json',
        'Accept-Language': 'en' // Default language
      };
      this.auth = `Access Token: ${apiKey.substring(0, 10)}...`;
    } else {
      const credentials = Buffer.from(`${userId}:${apiKey}`).toString('base64');
      this.auth = `Basic ${credentials}`;
      this.headers = {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
        'Accept-Language': 'en' // Default language
      };
    }
    
    logger.info('AstrologyReportService initialized', { 
      userId, 
      baseURL: this.baseURL 
    });
  }

  // Format birth data for the API
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
      name: birthData.name || 'User',
      gender: birthData.gender || 'male',
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

  // Generic method to call JSON report endpoints
  async fetchReport(endpoint, birthData, language = 'en') {
    try {
      const formattedData = this.formatBirthData(birthData);
      
      // Validate that we have all required fields
      if (!formattedData.day || !formattedData.month || !formattedData.year || 
          formattedData.hour === undefined || formattedData.min === undefined || 
          formattedData.lat === undefined || formattedData.lon === undefined || formattedData.tzone === undefined) {
        
        logger.warn('Missing required birth data for text report', { 
          endpoint, 
          formattedData,
          originalData: birthData
        });
        return { 
          success: false, 
          error: 'Missing required birth data (day, month, year, hour, minute, latitude, longitude)' 
        };
      }
      
      logger.info('Fetching Astrology Report', { 
        endpoint, 
        language
      });

      const requestHeaders = {
        ...this.headers,
        'Accept-Language': language
      };

      const response = await axios.post(
        `${this.baseURL}/${endpoint}`,
        formattedData,
        { headers: requestHeaders }
      );

      if (response.status === 200) {
        logger.info('Astrology Report fetched successfully', { endpoint });
        return { success: true, data: response.data };
      } else {
        logger.error('Astrology Report error', { 
          endpoint, 
          status: response.status, 
          data: response.data 
        });
        return { success: false, error: `API call failed with status ${response.status}` };
      }
    } catch (error) {
      logger.error('Error fetching astrology report:', error);
      
      // Check if it's a validation error from the API
      if (error.response && error.response.data && error.response.data.error) {
        return { 
          success: false, 
          error: `Astrology API error: ${error.response.data.msg || error.response.data.error}` 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Same logic but for Match Making which requires two sets of birth data
  async fetchMatchMakingReport(endpoint, maleData, femaleData, language = 'en') {
    try {
      const mData = this.formatBirthData(maleData);
      const fData = this.formatBirthData(femaleData);
      
      const payload = {
        m_day: mData.day, m_month: mData.month, m_year: mData.year,
        m_hour: mData.hour, m_min: mData.min, m_lat: mData.lat,
        m_lon: mData.lon, m_tzone: mData.tzone,
        f_day: fData.day, f_month: fData.month, f_year: fData.year,
        f_hour: fData.hour, f_min: fData.min, f_lat: fData.lat,
        f_lon: fData.lon, f_tzone: fData.tzone
      };

      const requestHeaders = {
        ...this.headers,
        'Accept-Language': language
      };

      const response = await axios.post(
        `${this.baseURL}/${endpoint}`,
        payload,
        { headers: requestHeaders }
      );

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: `API call failed with status ${response.status}` };
      }
    } catch (error) {
      logger.error('Error fetching match making report:', error);
      return { success: false, error: error.message };
    }
  }
}

export const astrologyReportService = new AstrologyReportService();

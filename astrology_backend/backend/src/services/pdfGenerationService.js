import axios from 'axios';
import { logger } from '../utils/logger.js';

class PDFGenerationService {
  constructor() {
    this.baseURL = 'https://pdf.astrologyapi.com/v1';
    
    // Use environment variables for credentials
    const userId = process.env.ASTROLOGY_USER_ID || '646865';//PDF generation Key
    const apiKey = process.env.ASTROLOGY_API_KEY || '1d0d5829d81103f18125f16692af4af35b4fcac3';
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    this.auth = `Basic ${credentials}`;
    
    this.headers = {
      'Authorization': this.auth,
      'Content-Type': 'application/json'
    };
    
    // Default customization options
    this.defaultCustomization = {
      chart_style: 'NORTH_INDIAN',
      footer_link: 'rraasi.com',
      logo_url: '',
      company_name: 'Rraasi',
      company_info: 'Your Personal Astrology Guide',
      domain_url: 'https://rraasi.com',
      company_email: 'support@rraasi.com',
      company_landline: '',
      company_mobile: ''
    };
    
    logger.info('PDF Generation Service initialized', { 
      userId, 
      apiKey: apiKey.substring(0, 10) + '...',
      baseURL: this.baseURL 
    });
  }

  // Convert birth data to PDF API format
  formatBirthDataForPDF(birthData, customization = {}) {
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
      timezone = Math.round(birthData.longitude / 15 * 2) / 2;
    }
    
    // Determine place name
    let place = birthData.place || birthData.placeOfBirth || birthData.place_of_birth || 'Unknown';
    
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
      tzone: timezone || 5.5,
      place: place,
      language: customization.language || 'en',
      ...this.defaultCustomization,
      ...customization
    };
  }

  // Generate Mini Horoscope PDF (9 pages)
  async generateMiniHoroscopePDF(birthData, customization = {}) {
    try {
      const formattedData = this.formatBirthDataForPDF(birthData, customization);
      
      // Validate required fields
      if (!this.validateBirthData(formattedData)) {
        return { 
          success: false, 
          error: 'Missing required birth data for PDF generation' 
        };
      }
      
      logger.info('Generating Mini Horoscope PDF', { 
        name: formattedData.name,
        birthDate: `${formattedData.day}/${formattedData.month}/${formattedData.year}`,
        language: formattedData.language
      });

      const response = await axios.post(
        `${this.baseURL}/mini_horoscope_pdf`,
        formattedData,
        { 
          headers: this.headers,
          timeout: 60000 // 60 seconds timeout for PDF generation
        }
      );

      if (response.status === 200 && response.data.status) {
        logger.info('Mini Horoscope PDF generated successfully', { 
          pdfUrl: response.data.pdf_url 
        });
        return { 
          success: true, 
          pdfUrl: response.data.pdf_url,
          type: 'mini_horoscope',
          pages: 9
        };
      } else {
        logger.error('Mini Horoscope PDF generation failed', { 
          status: response.status, 
          data: response.data 
        });
        return { 
          success: false, 
          error: response.data.msg || 'PDF generation failed' 
        };
      }
    } catch (error) {
      logger.error('Error generating Mini Horoscope PDF:', error);
      return this.handlePDFError(error);
    }
  }

  // Generate Basic Horoscope PDF (25 pages)
  async generateBasicHoroscopePDF(birthData, customization = {}) {
    try {
      const formattedData = this.formatBirthDataForPDF(birthData, customization);
      
      if (!this.validateBirthData(formattedData)) {
        return { 
          success: false, 
          error: 'Missing required birth data for PDF generation' 
        };
      }
      
      logger.info('Generating Basic Horoscope PDF', { 
        name: formattedData.name,
        birthDate: `${formattedData.day}/${formattedData.month}/${formattedData.year}`,
        language: formattedData.language
      });

      const response = await axios.post(
        `${this.baseURL}/basic_horoscope_pdf`,
        formattedData,
        { 
          headers: this.headers,
          timeout: 90000 // 90 seconds timeout for larger PDF
        }
      );

      if (response.status === 200 && response.data.status) {
        logger.info('Basic Horoscope PDF generated successfully', { 
          pdfUrl: response.data.pdf_url 
        });
        return { 
          success: true, 
          pdfUrl: response.data.pdf_url,
          type: 'basic_horoscope',
          pages: 25
        };
      } else {
        logger.error('Basic Horoscope PDF generation failed', { 
          status: response.status, 
          data: response.data 
        });
        return { 
          success: false, 
          error: response.data.msg || 'PDF generation failed' 
        };
      }
    } catch (error) {
      logger.error('Error generating Basic Horoscope PDF:', error);
      return this.handlePDFError(error);
    }
  }

  // Generate Professional Horoscope PDF (68 pages)
  async generateProfessionalHoroscopePDF(birthData, customization = {}) {
    try {
      const formattedData = this.formatBirthDataForPDF(birthData, customization);
      
      if (!this.validateBirthData(formattedData)) {
        return { 
          success: false, 
          error: 'Missing required birth data for PDF generation' 
        };
      }
      
      logger.info('Generating Professional Horoscope PDF', { 
        name: formattedData.name,
        birthDate: `${formattedData.day}/${formattedData.month}/${formattedData.year}`,
        language: formattedData.language
      });

      const response = await axios.post(
        `${this.baseURL}/pro_horoscope_pdf`,
        formattedData,
        { 
          headers: this.headers,
          timeout: 120000 // 2 minutes timeout for comprehensive PDF
        }
      );

      if (response.status === 200 && response.data.status) {
        logger.info('Professional Horoscope PDF generated successfully', { 
          pdfUrl: response.data.pdf_url 
        });
        return { 
          success: true, 
          pdfUrl: response.data.pdf_url,
          type: 'professional_horoscope',
          pages: 68
        };
      } else {
        logger.error('Professional Horoscope PDF generation failed', { 
          status: response.status, 
          data: response.data 
        });
        return { 
          success: false, 
          error: response.data.msg || 'PDF generation failed' 
        };
      }
    } catch (error) {
      logger.error('Error generating Professional Horoscope PDF:', error);
      return this.handlePDFError(error);
    }
  }

  // Generate Match Making PDF (24 pages)
  async generateMatchMakingPDF(maleData, femaleData, customization = {}) {
    try {
      const formattedMaleData = this.formatBirthDataForPDF({...maleData, gender: 'male'}, customization);
      const formattedFemaleData = this.formatBirthDataForPDF({...femaleData, gender: 'female'}, customization);
      
      if (!this.validateBirthData(formattedMaleData) || !this.validateBirthData(formattedFemaleData)) {
        return { 
          success: false, 
          error: 'Missing required birth data for both individuals' 
        };
      }
      
      const requestData = {
        // Male data with m_ prefix
        m_name: formattedMaleData.name,
        m_day: formattedMaleData.day,
        m_month: formattedMaleData.month,
        m_year: formattedMaleData.year,
        m_hour: formattedMaleData.hour,
        m_min: formattedMaleData.min,
        m_lat: formattedMaleData.lat,
        m_lon: formattedMaleData.lon,
        m_tzone: formattedMaleData.tzone,
        m_place: formattedMaleData.place,
        
        // Female data with f_ prefix
        f_name: formattedFemaleData.name,
        f_day: formattedFemaleData.day,
        f_month: formattedFemaleData.month,
        f_year: formattedFemaleData.year,
        f_hour: formattedFemaleData.hour,
        f_min: formattedFemaleData.min,
        f_lat: formattedFemaleData.lat,
        f_lon: formattedFemaleData.lon,
        f_tzone: formattedFemaleData.tzone,
        f_place: formattedFemaleData.place,
        
        // Common settings
        language: customization.language || 'en',
        ...this.defaultCustomization,
        ...customization
      };
      
      logger.info('Generating Match Making PDF', { 
        maleName: formattedMaleData.name,
        femaleName: formattedFemaleData.name,
        language: requestData.language
      });

      const response = await axios.post(
        `${this.baseURL}/match_making_pdf`,
        requestData,
        { 
          headers: this.headers,
          timeout: 90000 // 90 seconds timeout
        }
      );

      if (response.status === 200 && response.data.status) {
        logger.info('Match Making PDF generated successfully', { 
          pdfUrl: response.data.pdf_url 
        });
        return { 
          success: true, 
          pdfUrl: response.data.pdf_url,
          type: 'match_making',
          pages: 24
        };
      } else {
        logger.error('Match Making PDF generation failed', { 
          status: response.status, 
          data: response.data 
        });
        return { 
          success: false, 
          error: response.data.msg || 'PDF generation failed' 
        };
      }
    } catch (error) {
      logger.error('Error generating Match Making PDF:', error);
      return this.handlePDFError(error);
    }
  }

  // Generate PDF based on type
  async generatePDF(type, birthData, additionalData = {}, customization = {}) {
    switch (type.toLowerCase()) {
      case 'mini':
      case 'mini_horoscope':
        return await this.generateMiniHoroscopePDF(birthData, customization);
        
      case 'basic':
      case 'basic_horoscope':
        return await this.generateBasicHoroscopePDF(birthData, customization);
        
      case 'professional':
      case 'pro':
      case 'pro_horoscope':
        return await this.generateProfessionalHoroscopePDF(birthData, customization);
        
      case 'matchmaking':
      case 'match_making':
        if (!additionalData.femaleData) {
          return { 
            success: false, 
            error: 'Female birth data required for match making PDF' 
          };
        }
        return await this.generateMatchMakingPDF(birthData, additionalData.femaleData, customization);
        
      default:
        return { 
          success: false, 
          error: `Unsupported PDF type: ${type}. Supported types: mini, basic, professional, matchmaking` 
        };
    }
  }

  // Get available PDF types with details
  getAvailablePDFTypes() {
    return {
      mini_horoscope: {
        name: 'Mini Horoscope',
        description: 'Concise 9-page horoscope report',
        pages: 9,
        languages: ['English', 'Hindi', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'],
        estimatedTime: '30-60 seconds'
      },
      basic_horoscope: {
        name: 'Basic Horoscope',
        description: 'Detailed 25-page horoscope report',
        pages: 25,
        languages: ['English', 'Hindi', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'],
        estimatedTime: '60-90 seconds'
      },
      professional_horoscope: {
        name: 'Professional Horoscope',
        description: 'In-depth 68-page horoscope report',
        pages: 68,
        languages: ['English', 'Hindi'],
        estimatedTime: '90-120 seconds'
      },
      match_making: {
        name: 'Match Making Report',
        description: '24-page compatibility report for two individuals',
        pages: 24,
        languages: ['English', 'Hindi'],
        estimatedTime: '60-90 seconds',
        requiresPartner: true
      }
    };
  }

  // Validate birth data for PDF generation
  validateBirthData(birthData) {
    const required = ['name', 'day', 'month', 'year', 'hour', 'min', 'lat', 'lon', 'tzone'];
    
    for (const field of required) {
      if (birthData[field] === undefined || birthData[field] === null) {
        logger.warn(`Missing required field for PDF generation: ${field}`, { birthData });
        return false;
      }
    }
    
    // Validate ranges
    if (birthData.day < 1 || birthData.day > 31) return false;
    if (birthData.month < 1 || birthData.month > 12) return false;
    if (birthData.year < 1900 || birthData.year > new Date().getFullYear()) return false;
    if (birthData.hour < 0 || birthData.hour > 23) return false;
    if (birthData.min < 0 || birthData.min > 59) return false;
    if (birthData.lat < -90 || birthData.lat > 90) return false;
    if (birthData.lon < -180 || birthData.lon > 180) return false;
    
    return true;
  }

  // Handle PDF generation errors
  handlePDFError(error) {
    let errorMessage = 'Unknown error occurred during PDF generation';
    let errorType = 'unknown';
    
    if (error.response) {
      // Server responded with error status
      if (error.response.data && error.response.data.msg) {
        errorMessage = error.response.data.msg;
      } else {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
      
      if (error.response.status === 401) {
        errorType = 'authentication';
        errorMessage = 'API authentication failed - check credentials';
      } else if (error.response.status === 402) {
        errorType = 'payment';
        errorMessage = 'Insufficient API credits for PDF generation';
      } else if (error.response.status === 429) {
        errorType = 'rate_limit';
        errorMessage = 'Rate limit exceeded - please try again later';
      }
    } else if (error.request) {
      // Request was made but no response received
      errorType = 'timeout';
      errorMessage = 'PDF generation timeout - please try again';
    } else {
      // Something else happened
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      errorType: errorType,
      timestamp: new Date().toISOString()
    };
  }

  // Download PDF from URL (helper method)
  async downloadPDF(pdfUrl, filename = null) {
    try {
      if (!filename) {
        filename = `horoscope_${Date.now()}.pdf`;
      }
      
      const response = await axios.get(pdfUrl, {
        responseType: 'stream',
        timeout: 30000
      });
      
      return {
        success: true,
        stream: response.data,
        filename: filename,
        contentType: 'application/pdf'
      };
    } catch (error) {
      logger.error('Error downloading PDF:', error);
      return {
        success: false,
        error: 'Failed to download PDF file'
      };
    }
  }

  // Check PDF service health
  async checkPDFServiceHealth() {
    try {
      // Test with minimal data to check service availability
      const testData = {
        name: 'Test User',
        gender: 'male',
        day: 1,
        month: 1,
        year: 1990,
        hour: 12,
        min: 0,
        lat: 28.7041,
        lon: 77.1025,
        tzone: 5.5,
        place: 'Delhi',
        language: 'en',
        ...this.defaultCustomization
      };

      const response = await axios.post(
        `${this.baseURL}/mini_horoscope_pdf`,
        testData,
        { 
          headers: this.headers,
          timeout: 10000 // 10 second timeout for health check
        }
      );

      if (response.status === 200) {
        return {
          status: 'healthy',
          message: 'PDF service is operational',
          lastChecked: new Date().toISOString(),
          responseTime: response.headers['x-response-time'] || 'unknown'
        };
      } else {
        return {
          status: 'degraded',
          message: `PDF service returned status ${response.status}`,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('PDF service health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}

export const pdfGenerationService = new PDFGenerationService();

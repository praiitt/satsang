import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Comprehensive Astrology Service
 * Handles both Vedic and Western astrology systems
 * Modular architecture for easy extension
 */
class ComprehensiveAstrologyService {
    constructor() {
        this.baseURL = 'https://json.astrologyapi.com/v1';
        this.apiKey = process.env.ASTROLOGY_API_KEY;
        this.userId = process.env.ASTROLOGY_USER_ID;
        
        // Debug logging for credentials
        logger.info('Comprehensive Astrology Service - Credentials Check', {
            apiKey: this.apiKey ? `SET (${this.apiKey.length} chars)` : 'NOT SET',
            userId: this.userId || 'NOT SET',
            baseURL: this.baseURL
        });
        
        // Initialize API clients for different systems
        this.vedicClient = this.createAPIClient('vedic');
        this.westernClient = null; // Will be initialized when Western astrology is added
        
        // Chart type registry
        this.chartTypes = {
            vedic: {
                basic: ['birth_details', 'astro_details', 'planets', 'vedic_horoscope'],
                advanced: ['advanced_panchang', 'ashtakvarga', 'jaimini_details', 'kp_planets'],
                dasha: ['major_vdasha', 'current_vdasha', 'major_chardasha', 'major_yogini_dasha'],
                predictive: ['daily_nakshatra_prediction', 'horoscope_prediction', 'general_house_report'],
                specialized: ['gem_suggestion', 'numerology', 'auspicious_muhurta']
            },
            western: {
                basic: [], // Will be populated when Western astrology is added
                advanced: [],
                predictive: [],
                specialized: []
            }
        };
        
        logger.info('Comprehensive Astrology Service initialized');
    }

    /**
     * Create API client for specific astrology system
     */
    createAPIClient(system) {
        if (system === 'vedic') {
            // Use the same authentication method as the existing astrologyAPIService
            const authString = `${this.userId}:${this.apiKey}`;
            const base64Auth = Buffer.from(authString).toString('base64');
            
            return {
                headers: {
                    'Authorization': `Basic ${base64Auth}`,
                    'Content-Type': 'application/json'
                },
                baseURL: this.baseURL
            };
        }
        // Future: Add Western astrology client configuration
        return null;
    }

    /**
     * Generate comprehensive birth chart
     */
    async generateComprehensiveChart(birthData, options = {}) {
        try {
            const { system = 'vedic', chartTypes = ['basic'], includePredictions = false } = options;
            
            logger.info(`Generating comprehensive ${system} chart for user`, { 
                userId: birthData.userId,
                system,
                chartTypes 
            });

            const chartData = {
                system,
                birthData,
                timestamp: new Date().toISOString(),
                charts: {},
                metadata: {
                    generatedBy: 'ComprehensiveAstrologyService',
                    version: '1.0.0'
                }
            };

            // Generate requested chart types
            for (const chartType of chartTypes) {
                if (this.chartTypes[system][chartType]) {
                    chartData.charts[chartType] = await this.generateChartType(
                        system, 
                        chartType, 
                        birthData
                    );
                }
            }

            // Add predictions if requested
            if (includePredictions) {
                chartData.predictions = await this.generatePredictions(system, birthData);
            }

            logger.info(`Comprehensive chart generated successfully`, { 
                userId: birthData.userId,
                chartCount: Object.keys(chartData.charts).length 
            });

            return chartData;

        } catch (error) {
            logger.error('Error generating comprehensive chart:', error);
            throw new Error(`Failed to generate comprehensive chart: ${error.message}`);
        }
    }

    /**
     * Generate specific chart type
     */
    async generateChartType(system, chartType, birthData) {
        try {
            const endpoints = this.chartTypes[system][chartType];
            const chartData = {};

            for (const endpoint of endpoints) {
                try {
                    const data = await this.callAstrologyAPI(endpoint, birthData);
                    chartData[endpoint] = data;
                } catch (error) {
                    logger.warn(`Failed to generate ${endpoint}:`, error.message);
                    chartData[endpoint] = { error: error.message };
                }
            }

            return chartData;

        } catch (error) {
            logger.error(`Error generating chart type ${chartType}:`, error);
            throw new Error(`Failed to generate chart type ${chartType}: ${error.message}`);
        }
    }

    /**
     * Generate predictions
     */
    async generatePredictions(system, birthData) {
        try {
            const predictions = {};
            
            if (system === 'vedic') {
                // Daily predictions
                predictions.daily = await this.callAstrologyAPI('daily_nakshatra_prediction', birthData);
                
                // Weekly predictions
                predictions.weekly = await this.callAstrologyAPI('horoscope_prediction/weekly/aries', birthData);
                
                // Monthly predictions
                predictions.monthly = await this.callAstrologyAPI('horoscope_prediction/monthly/aries', birthData);
            }

            return predictions;

        } catch (error) {
            logger.error('Error generating predictions:', error);
            return { error: error.message };
        }
    }

    /**
     * Call astrology API endpoint
     */
    async callAstrologyAPI(endpoint, birthData) {
        try {
            const url = `${this.baseURL}/${endpoint}`;
            const payload = this.formatBirthDataForAPI(birthData);

            logger.debug(`Calling astrology API: ${endpoint}`, { url });

            // Use the same authentication method as the existing astrologyAPIService
            const authString = `${this.userId}:${this.apiKey}`;
            const base64Auth = Buffer.from(authString).toString('base64');

            const response = await axios.post(url, payload, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Authorization': `Basic ${base64Auth}`,
                    'Content-Type': 'application/json'
                }
            });

            logger.debug(`API response received for ${endpoint}`, { 
                status: response.status,
                dataSize: JSON.stringify(response.data).length 
            });

            return response.data;

        } catch (error) {
            logger.error(`API call failed for ${endpoint}:`, error);
            
            if (error.response) {
                throw new Error(`API Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error('Network error: No response received from astrology API');
            } else {
                throw new Error(`Request error: ${error.message}`);
            }
        }
    }

    /**
     * Format birth data for API calls
     */
    formatBirthDataForAPI(birthData) {
        const { birthDate, birthTime, latitude, longitude, timezone } = birthData;
        
        // Parse birth date and time
        const date = new Date(birthDate);
        const time = birthTime.split(':');
        
        return {
            day: date.getDate(),
            month: date.getMonth() + 1, // API expects 1-12
            year: date.getFullYear(),
            hour: parseInt(time[0]),
            min: parseInt(time[1]),
            lat: parseFloat(latitude),
            lon: parseFloat(longitude),
            tzone: parseFloat(timezone)
        };
    }

    /**
     * Get available chart types for a system
     */
    getAvailableChartTypes(system) {
        return this.chartTypes[system] || {};
    }

    /**
     * Add new chart type (for future extensions)
     */
    addChartType(system, category, endpoints) {
        if (!this.chartTypes[system]) {
            this.chartTypes[system] = {};
        }
        this.chartTypes[system][category] = endpoints;
        logger.info(`Added new chart type: ${system}.${category}`);
    }

    /**
     * Health check for astrology API
     */
    async healthCheck() {
        try {
            // Use the same authentication method as the existing astrologyAPIService
            const authString = `${this.userId}:${this.apiKey}`;
            const base64Auth = Buffer.from(authString).toString('base64');

            const response = await axios.get(`${this.baseURL}/timezone`, {
                timeout: 10000,
                headers: {
                    'Authorization': `Basic ${base64Auth}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                status: 'healthy',
                system: 'vedic',
                responseTime: response.headers['x-response-time'] || 'unknown',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                system: 'vedic',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get service statistics
     */
    getServiceStats() {
        return {
            totalChartTypes: Object.keys(this.chartTypes.vedic).length,
            supportedSystems: Object.keys(this.chartTypes),
            apiBaseURL: this.baseURL,
            timestamp: new Date().toISOString()
        };
    }
}

export default ComprehensiveAstrologyService;

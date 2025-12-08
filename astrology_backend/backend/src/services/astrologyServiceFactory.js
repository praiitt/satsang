import VedicAstrologyService from './vedicAstrologyService.js';
import WesternAstrologyService from './westernAstrologyService.js';
import { logger } from '../utils/logger.js';

/**
 * Astrology Service Factory
 * Manages both Vedic and Western astrology services
 * Provides unified interface for all astrology operations
 */
class AstrologyServiceFactory {
    constructor() {
        this.services = {};
        this.initializeServices();
        logger.info('Astrology Service Factory initialized');
    }

    /**
     * Initialize all astrology services
     */
    initializeServices() {
        try {
            // Initialize Vedic astrology service
            this.services.vedic = new VedicAstrologyService();
            logger.info('Vedic Astrology Service initialized successfully');

            // Initialize Western astrology service (template)
            this.services.western = new WesternAstrologyService();
            logger.info('Western Astrology Service initialized successfully (template)');

        } catch (error) {
            logger.error('Error initializing astrology services:', error);
            throw new Error(`Failed to initialize astrology services: ${error.message}`);
        }
    }

    /**
     * Get service by type
     */
    getService(type) {
        if (!this.services[type]) {
            throw new Error(`Unknown astrology service type: ${type}`);
        }
        return this.services[type];
    }

    /**
     * Get Vedic astrology service
     */
    getVedicService() {
        return this.getService('vedic');
    }

    /**
     * Get Western astrology service
     */
    getWesternService() {
        return this.getService('western');
    }

    /**
     * Generate birth chart for any system
     */
    async generateBirthChart(system, birthData, options = {}) {
        try {
            const service = this.getService(system);
            
            if (system === 'vedic') {
                return await service.generateVedicBirthChart(birthData, options);
            } else if (system === 'western') {
                return await service.generateWesternBirthChart(birthData, options);
            } else {
                throw new Error(`Unsupported astrology system: ${system}`);
            }

        } catch (error) {
            logger.error(`Error generating ${system} birth chart:`, error);
            throw new Error(`Failed to generate ${system} birth chart: ${error.message}`);
        }
    }

    /**
     * Generate predictions for any system
     */
    async generatePredictions(system, birthData, options = {}) {
        try {
            const service = this.getService(system);
            
            if (system === 'vedic') {
                return await service.generateVedicPredictions(birthData, options);
            } else if (system === 'western') {
                return await service.generateWesternPredictions(birthData, options);
            } else {
                throw new Error(`Unsupported astrology system: ${system}`);
            }

        } catch (error) {
            logger.error(`Error generating ${system} predictions:`, error);
            throw new Error(`Failed to generate ${system} predictions: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive analysis for any system
     */
    async generateComprehensiveAnalysis(system, birthData, options = {}) {
        try {
            const service = this.getService(system);
            
            if (system === 'vedic') {
                const chart = await service.generateVedicBirthChart(birthData, { 
                    includeAllSystems: true, 
                    includePredictions: true 
                });
                
                // Add additional Vedic-specific analyses
                chart.dasha = await service.generateDashaPeriods(birthData);
                chart.ashtakvarga = await service.generateAshtakvarga(birthData);
                chart.panchang = await service.generatePanchang(birthData);
                
                return chart;
                
            } else if (system === 'western') {
                return await service.generateWesternBirthChart(birthData, { 
                    includeAllSystems: true, 
                    includePredictions: true 
                });
            } else {
                throw new Error(`Unsupported astrology system: ${system}`);
            }

        } catch (error) {
            logger.error(`Error generating ${system} comprehensive analysis:`, error);
            throw new Error(`Failed to generate ${system} comprehensive analysis: ${error.message}`);
        }
    }

    /**
     * Generate compatibility analysis
     */
    async generateCompatibilityAnalysis(system, birthData1, birthData2, options = {}) {
        try {
            if (system === 'vedic') {
                // Vedic compatibility analysis
                const service = this.getService('vedic');
                return await service.generateCompatibilityAnalysis(birthData1, birthData2);
                
            } else if (system === 'western') {
                // Western compatibility analysis
                const service = this.getService('western');
                return await service.generateCompatibilityAnalysis(birthData1, birthData2);
                
            } else {
                throw new Error(`Unsupported astrology system: ${system}`);
            }

        } catch (error) {
            logger.error(`Error generating ${system} compatibility analysis:`, error);
            throw new Error(`Failed to generate ${system} compatibility analysis: ${error.message}`);
        }
    }

    /**
     * Get available chart types for a system
     */
    getAvailableChartTypes(system) {
        try {
            const service = this.getService(system);
            return service.getAvailableChartTypes(system);
        } catch (error) {
            logger.error(`Error getting chart types for ${system}:`, error);
            return {};
        }
    }

    /**
     * Health check for all services
     */
    async healthCheck() {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            services: {}
        };

        try {
            // Check Vedic service
            const vedicHealth = await this.services.vedic.healthCheck();
            healthStatus.services.vedic = vedicHealth;

            // Check Western service (template)
            healthStatus.services.western = {
                status: 'template',
                message: 'Western astrology service is a template, not yet implemented'
            };

            // Determine overall health
            if (vedicHealth.status === 'unhealthy') {
                healthStatus.overall = 'degraded';
            }

        } catch (error) {
            healthStatus.overall = 'unhealthy';
            healthStatus.error = error.message;
        }

        return healthStatus;
    }

    /**
     * Get comprehensive service statistics
     */
    getServiceStats() {
        try {
            const stats = {
                timestamp: new Date().toISOString(),
                totalSystems: Object.keys(this.services).length,
                systems: {}
            };

            // Get stats for each system
            for (const [system, service] of Object.entries(this.services)) {
                if (system === 'vedic') {
                    stats.systems[system] = service.getVedicStats();
                } else if (system === 'western') {
                    stats.systems[system] = service.getWesternStats();
                }
            }

            return stats;

        } catch (error) {
            logger.error('Error getting service statistics:', error);
            return {
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Add new astrology system
     */
    addAstrologySystem(systemName, serviceClass) {
        try {
            if (this.services[systemName]) {
                logger.warn(`Astrology system ${systemName} already exists, overwriting`);
            }

            this.services[systemName] = new serviceClass();
            logger.info(`New astrology system added: ${systemName}`);

        } catch (error) {
            logger.error(`Error adding astrology system ${systemName}:`, error);
            throw new Error(`Failed to add astrology system ${systemName}: ${error.message}`);
        }
    }

    /**
     * Get all available systems
     */
    getAvailableSystems() {
        return Object.keys(this.services);
    }

    /**
     * Check if system is available
     */
    isSystemAvailable(system) {
        return !!this.services[system];
    }
}

export default AstrologyServiceFactory;

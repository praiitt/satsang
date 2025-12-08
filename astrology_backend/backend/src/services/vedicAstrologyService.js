import ComprehensiveAstrologyService from './comprehensiveAstrologyService.js';
import { logger } from '../utils/logger.js';

/**
 * Specialized Vedic Astrology Service
 * Extends ComprehensiveAstrologyService with Vedic-specific features
 */
class VedicAstrologyService extends ComprehensiveAstrologyService {
    constructor() {
        super();
        
        // Initialize Vedic-specific chart types
        this.initializeVedicCharts();
        
        // Vedic-specific constants
        this.nakshatras = [
            'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
            'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
            'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
            'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
            'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
        ];
        
        this.rashis = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        
        this.planets = [
            'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
            'Rahu', 'Ketu'
        ];
        
        logger.info('Vedic Astrology Service initialized');
    }

    /**
     * Initialize Vedic-specific chart types
     */
    initializeVedicCharts() {
        // Basic charts
        this.chartTypes.vedic.basic = [
            'birth_details',
            'astro_details', 
            'planets',
            'planets/extended',
            'vedic_horoscope',
            'bhav_madhya',
            'ayanamsha'
        ];

        // Advanced charts
        this.chartTypes.vedic.advanced = [
            'advanced_panchang',
            'panchang_chart',
            'panchang_festival',
            'monthly_panchang',
            'tamil_panchang'
        ];

        // Dasha systems
        this.chartTypes.vedic.dasha = [
            'major_vdasha',
            'current_vdasha',
            'current_vdasha_all',
            'major_chardasha',
            'current_chardasha',
            'major_yogini_dasha',
            'current_yogini_dasha'
        ];

        // Predictive features
        this.chartTypes.vedic.predictive = [
            'daily_nakshatra_prediction',
            'horoscope_prediction/daily/aries',
            'horoscope_prediction/weekly/aries',
            'horoscope_prediction/monthly/aries',
            'general_house_report',
            'general_rashi_report',
            'general_nakshatra_report',
            'general_ascendant_report'
        ];

        // Specialized features
        this.chartTypes.vedic.specialized = [
            'basic_gem_suggestion',
            'numero_table',
            'auspicious_muhurta/marriage',
            'chaughadiya_muhurta',
            'hora_muhurta',
            'ghat_chakra'
        ];

        // Ashtakvarga system
        this.chartTypes.vedic.ashtakvarga = [
            'planet_ashtak/sun',
            'planet_ashtak/moon',
            'planet_ashtak/mars',
            'planet_ashtak/mercury',
            'planet_ashtak/jupiter',
            'planet_ashtak/venus',
            'planet_ashtak/saturn',
            'sarvashtak'
        ];

        // Jaimini system
        this.chartTypes.vedic.jaimini = [
            'jaimini_details'
        ];

        // KP system
        this.chartTypes.vedic.kp = [
            'kp_planets',
            'kp_house_cusps',
            'kp_birth_chart',
            'kp_house_significator'
        ];

        // Varshaphal (Annual horoscope)
        this.chartTypes.vedic.varshaphal = [
            'varshaphal_saham_points',
            'varshaphal_panchavargeeya_bala',
            'varshaphal_harsha_bala',
            'varshaphal_muntha'
        ];
    }

    /**
     * Generate Vedic birth chart with all major components
     */
    async generateVedicBirthChart(birthData, options = {}) {
        try {
            const { includeAllSystems = false, includePredictions = true } = options;
            
            logger.info('Generating comprehensive Vedic birth chart', { 
                userId: birthData.userId,
                includeAllSystems,
                includePredictions 
            });

            // Start with basic charts
            const chartTypes = ['basic'];
            
            // Add advanced charts if requested
            if (includeAllSystems) {
                chartTypes.push('advanced', 'dasha', 'ashtakvarga', 'jaimini', 'kp', 'varshaphal');
            }

            // Generate the comprehensive chart
            const chart = await this.generateComprehensiveChart(birthData, {
                system: 'vedic',
                chartTypes,
                includePredictions
            });

            // Add Vedic-specific metadata
            chart.vedicMetadata = {
                nakshatraCount: this.nakshatras.length,
                rashiCount: this.rashis.length,
                planetCount: this.planets.length,
                systems: chartTypes,
                generatedAt: new Date().toISOString()
            };

            return chart;

        } catch (error) {
            logger.error('Error generating Vedic birth chart:', error);
            throw new Error(`Failed to generate Vedic birth chart: ${error.message}`);
        }
    }

    /**
     * Generate specific Vedic chart type
     */
    async generateVedicChartType(chartType, birthData) {
        try {
            if (!this.chartTypes.vedic[chartType]) {
                throw new Error(`Unknown Vedic chart type: ${chartType}`);
            }

            return await this.generateChartType('vedic', chartType, birthData);

        } catch (error) {
            logger.error(`Error generating Vedic chart type ${chartType}:`, error);
            throw new Error(`Failed to generate Vedic chart type ${chartType}: ${error.message}`);
        }
    }

    /**
     * Generate Vedic predictions
     */
    async generateVedicPredictions(birthData, options = {}) {
        try {
            const { 
                includeDaily = true, 
                includeWeekly = true, 
                includeMonthly = true,
                includeNakshatra = true,
                includeHouseReports = true 
            } = options;

            const predictions = {};

            if (includeDaily) {
                predictions.daily = await this.callAstrologyAPI('daily_nakshatra_prediction', birthData);
            }

            if (includeWeekly) {
                predictions.weekly = await this.callAstrologyAPI('horoscope_prediction/weekly/aries', birthData);
            }

            if (includeMonthly) {
                predictions.monthly = await this.callAstrologyAPI('horoscope_prediction/monthly/aries', birthData);
            }

            if (includeNakshatra) {
                predictions.nakshatra = await this.callAstrologyAPI('nakshatra_report', birthData);
            }

            if (includeHouseReports) {
                predictions.houseReports = {};
                for (const planet of this.planets) {
                    try {
                        predictions.houseReports[planet] = await this.callAstrologyAPI(`general_house_report/${planet.toLowerCase()}`, birthData);
                    } catch (error) {
                        logger.warn(`Failed to get house report for ${planet}:`, error.message);
                    }
                }
            }

            return predictions;

        } catch (error) {
            logger.error('Error generating Vedic predictions:', error);
            throw new Error(`Failed to generate Vedic predictions: ${error.message}`);
        }
    }

    /**
     * Generate Dasha periods
     */
    async generateDashaPeriods(birthData, options = {}) {
        try {
            const { 
                includeVimshottari = true, 
                includeChar = true, 
                includeYogini = true,
                includeSubPeriods = false 
            } = options;

            const dashaData = {};

            if (includeVimshottari) {
                dashaData.vimshottari = {
                    major: await this.callAstrologyAPI('major_vdasha', birthData),
                    current: await this.callAstrologyAPI('current_vdasha', birthData),
                    currentAll: await this.callAstrologyAPI('current_vdasha_all', birthData)
                };

                if (includeSubPeriods) {
                    dashaData.vimshottari.sub = await this.callAstrologyAPI('sub_vdasha/1', birthData);
                }
            }

            if (includeChar) {
                dashaData.char = {
                    major: await this.callAstrologyAPI('major_chardasha', birthData),
                    current: await this.callAstrologyAPI('current_chardasha', birthData)
                };
            }

            if (includeYogini) {
                dashaData.yogini = {
                    major: await this.callAstrologyAPI('major_yogini_dasha', birthData),
                    current: await this.callAstrologyAPI('current_yogini_dasha', birthData)
                };
            }

            return dashaData;

        } catch (error) {
            logger.error('Error generating Dasha periods:', error);
            throw new Error(`Failed to generate Dasha periods: ${error.message}`);
        }
    }

    /**
     * Generate Ashtakvarga analysis
     */
    async generateAshtakvarga(birthData) {
        try {
            const ashtakvarga = {};

            // Generate individual planet Ashtakvarga
            for (const planet of this.planets.slice(0, 7)) { // Exclude Rahu and Ketu
                try {
                    ashtakvarga[planet] = await this.callAstrologyAPI(`planet_ashtak/${planet.toLowerCase()}`, birthData);
                } catch (error) {
                    logger.warn(`Failed to get Ashtakvarga for ${planet}:`, error.message);
                }
            }

            // Generate Sarvashtak (combined)
            try {
                ashtakvarga.sarvashtak = await this.callAstrologyAPI('sarvashtak', birthData);
            } catch (error) {
                logger.warn('Failed to get Sarvashtak:', error.message);
            }

            return ashtakvarga;

        } catch (error) {
            logger.error('Error generating Ashtakvarga:', error);
            throw new Error(`Failed to generate Ashtakvarga: ${error.message}`);
        }
    }

    /**
     * Generate Panchang data
     */
    async generatePanchang(birthData, options = {}) {
        try {
            const { 
                includeAdvanced = true, 
                includeFestivals = true,
                includeMuhurta = true 
            } = options;

            const panchang = {};

            // Basic panchang
            panchang.basic = await this.callAstrologyAPI('basic_panchang', birthData);

            if (includeAdvanced) {
                panchang.advanced = await this.callAstrologyAPI('advanced_panchang', birthData);
                panchang.chart = await this.callAstrologyAPI('panchang_chart', birthData);
            }

            if (includeFestivals) {
                panchang.festivals = await this.callAstrologyAPI('panchang_festival', birthData);
            }

            if (includeMuhurta) {
                panchang.muhurta = {
                    chaughadiya: await this.callAstrologyAPI('chaughadiya_muhurta', birthData),
                    hora: await this.callAstrologyAPI('hora_muhurta', birthData)
                };
            }

            return panchang;

        } catch (error) {
            logger.error('Error generating Panchang:', error);
            throw new Error(`Failed to generate Panchang: ${error.message}`);
        }
    }

    /**
     * Get Vedic service statistics
     */
    getVedicStats() {
        return {
            ...this.getServiceStats(),
            vedicSpecific: {
                nakshatras: this.nakshatras.length,
                rashis: this.rashis.length,
                planets: this.planets.length,
                chartCategories: Object.keys(this.chartTypes.vedic).length,
                totalEndpoints: Object.values(this.chartTypes.vedic).flat().length
            }
        };
    }
}

export default VedicAstrologyService;

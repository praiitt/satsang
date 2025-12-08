import express from 'express';
import AstrologyServiceFactory from '../services/astrologyServiceFactory.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Initialize the astrology service factory lazily
let astrologyFactory = null;

function getAstrologyFactory() {
    if (!astrologyFactory) {
        astrologyFactory = new AstrologyServiceFactory();
    }
    return astrologyFactory;
}

/**
 * @route   GET /api/astrology/health
 * @desc    Health check for all astrology services
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const astrologyFactory = getAstrologyFactory();
        const healthStatus = await astrologyFactory.healthCheck();
        res.json({
            success: true,
            data: healthStatus
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/astrology/stats
 * @desc    Get comprehensive astrology service statistics
 * @access  Public
 */
router.get('/stats', (req, res) => {
    try {
        const astrologyFactory = getAstrologyFactory();
        const stats = astrologyFactory.getServiceStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Failed to get service stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get service stats',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/astrology/systems
 * @desc    Get available astrology systems
 * @access  Public
 */
router.get('/systems', (req, res) => {
    try {
        const astrologyFactory = getAstrologyFactory();
        const systems = astrologyFactory.getAvailableSystems();
        res.json({
            success: true,
            data: {
                systems,
                count: systems.length
            }
        });
    } catch (error) {
        logger.error('Failed to get available systems:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get available systems',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/astrology/:system/chart-types
 * @desc    Get available chart types for a specific system
 * @access  Public
 */
router.get('/:system/chart-types', (req, res) => {
    try {
        const { system } = req.params;
        
        const astrologyFactory = getAstrologyFactory();
        if (!astrologyFactory.isSystemAvailable(system)) {
            return res.status(400).json({
                success: false,
                error: 'System not available',
                message: `Astrology system '${system}' is not available`
            });
        }

        const chartTypes = astrologyFactory.getAvailableChartTypes(system);
        res.json({
            success: true,
            data: {
                system,
                chartTypes,
                totalCategories: Object.keys(chartTypes).length
            }
        });
    } catch (error) {
        logger.error(`Failed to get chart types for ${req.params.system}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chart types',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/:system/birth-chart
 * @desc    Generate birth chart for a specific system
 * @access  Public
 */
router.post('/:system/birth-chart', async (req, res) => {
    try {
        const { system } = req.params;
        const { birthData, options = {} } = req.body;

        // Validate required fields
        if (!birthData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'birthData is required'
            });
        }

        // Validate birth data structure
        const requiredFields = ['birthDate', 'birthTime', 'latitude', 'longitude', 'timezone'];
        const missingFields = requiredFields.filter(field => !birthData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid birth data',
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const astrologyFactory = getAstrologyFactory();
        // Check if system is available
        if (!astrologyFactory.isSystemAvailable(system)) {
            return res.status(400).json({
                success: false,
                error: 'System not available',
                message: `Astrology system '${system}' is not available`
            });
        }

        logger.info(`Generating ${system} birth chart`, { 
            userId: birthData.userId || 'anonymous',
            options 
        });

        const chart = await astrologyFactory.generateBirthChart(system, birthData, options);
        
        res.json({
            success: true,
            data: chart,
            message: `${system} birth chart generated successfully`
        });

    } catch (error) {
        logger.error(`Failed to generate ${req.params.system} birth chart:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate birth chart',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/:system/predictions
 * @desc    Generate predictions for a specific system
 * @access  Public
 */
router.post('/:system/predictions', async (req, res) => {
    try {
        const { system } = req.params;
        const { birthData, options = {} } = req.body;

        // Validate required fields
        if (!birthData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'birthData is required'
            });
        }

        const astrologyFactory = getAstrologyFactory();
        // Check if system is available
        if (!astrologyFactory.isSystemAvailable(system)) {
            return res.status(400).json({
                success: false,
                error: 'System not available',
                message: `Astrology system '${system}' is not available`
            });
        }

        logger.info(`Generating ${system} predictions`, { 
            userId: birthData.userId || 'anonymous',
            options 
        });

        const predictions = await astrologyFactory.generatePredictions(system, birthData, options);
        
        res.json({
            success: true,
            data: predictions,
            message: `${system} predictions generated successfully`
        });

    } catch (error) {
        logger.error(`Failed to generate ${req.params.system} predictions:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate predictions',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/:system/comprehensive
 * @desc    Generate comprehensive analysis for a specific system
 * @access  Public
 */
router.post('/:system/comprehensive', async (req, res) => {
    try {
        const { system } = req.params;
        const { birthData, options = {} } = req.body;

        // Validate required fields
        if (!birthData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'birthData is required'
            });
        }

        const astrologyFactory = getAstrologyFactory();
        // Check if system is available
        if (!astrologyFactory.isSystemAvailable(system)) {
            return res.status(400).json({
                success: false,
                error: 'System not available',
                message: `Astrology system '${system}' is not available`
            });
        }

        logger.info(`Generating ${system} comprehensive analysis`, { 
            userId: birthData.userId || 'anonymous',
            options 
        });

        const analysis = await astrologyFactory.generateComprehensiveAnalysis(system, birthData, options);
        
        res.json({
            success: true,
            data: analysis,
            message: `${system} comprehensive analysis generated successfully`
        });

    } catch (error) {
        logger.error(`Failed to generate ${req.params.system} comprehensive analysis:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate comprehensive analysis',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/:system/compatibility
 * @desc    Generate compatibility analysis for a specific system
 * @access  Public
 */
router.post('/:system/compatibility', async (req, res) => {
    try {
        const { system } = req.params;
        const { birthData1, birthData2, options = {} } = req.body;

        // Validate required fields
        if (!birthData1 || !birthData2) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'Both birthData1 and birthData2 are required'
            });
        }

        const astrologyFactory = getAstrologyFactory();
        // Check if system is available
        if (!astrologyFactory.isSystemAvailable(system)) {
            return res.status(400).json({
                success: false,
                error: 'System not available',
                message: `Astrology system '${system}' is not available`
            });
        }

        logger.info(`Generating ${system} compatibility analysis`, { 
            user1: birthData1.userId || 'anonymous',
            user2: birthData2.userId || 'anonymous',
            options 
        });

        const compatibility = await astrologyFactory.generateCompatibilityAnalysis(
            system, 
            birthData1, 
            birthData2, 
            options
        );
        
        res.json({
            success: true,
            data: compatibility,
            message: `${system} compatibility analysis generated successfully`
        });

    } catch (error) {
        logger.error(`Failed to generate ${req.params.system} compatibility analysis:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate compatibility analysis',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/vedic/dasha
 * @desc    Generate Vedic dasha periods
 * @access  Public
 */
router.post('/vedic/dasha', async (req, res) => {
    try {
        const { birthData, options = {} } = req.body;

        // Validate required fields
        if (!birthData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'birthData is required'
            });
        }

        logger.info('Generating Vedic dasha periods', { 
            userId: birthData.userId || 'anonymous',
            options 
        });

        const astrologyFactory = getAstrologyFactory();
        const vedicService = astrologyFactory.getVedicService();
        const dasha = await vedicService.generateDashaPeriods(birthData, options);
        
        res.json({
            success: true,
            data: dasha,
            message: 'Vedic dasha periods generated successfully'
        });

    } catch (error) {
        logger.error('Failed to generate Vedic dasha periods:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate dasha periods',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/vedic/ashtakvarga
 * @desc    Generate Vedic Ashtakvarga analysis
 * @access  Public
 */
router.post('/vedic/ashtakvarga', async (req, res) => {
    try {
        const { birthData } = req.body;

        // Validate required fields
        if (!birthData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'birthData is required'
            });
        }

        logger.info('Generating Vedic Ashtakvarga analysis', { 
            userId: birthData.userId || 'anonymous'
        });

        const astrologyFactory = getAstrologyFactory();
        const vedicService = astrologyFactory.getVedicService();
        const ashtakvarga = await vedicService.generateAshtakvarga(birthData);
        
        res.json({
            success: true,
            data: ashtakvarga,
            message: 'Vedic Ashtakvarga analysis generated successfully'
        });

    } catch (error) {
        logger.error('Failed to generate Vedic Ashtakvarga analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Ashtakvarga analysis',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/astrology/vedic/panchang
 * @desc    Generate Vedic Panchang data
 * @access  Public
 */
router.post('/vedic/panchang', async (req, res) => {
    try {
        const { birthData, options = {} } = req.body;

        // Validate required fields
        if (!birthData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required data',
                message: 'birthData is required'
            });
        }

        logger.info('Generating Vedic Panchang data', { 
            userId: birthData.userId || 'anonymous',
            options 
        });

        const astrologyFactory = getAstrologyFactory();
        const vedicService = astrologyFactory.getVedicService();
        const panchang = await vedicService.generatePanchang(birthData, options);
        
        res.json({
            success: true,
            data: panchang,
            message: 'Vedic Panchang data generated successfully'
        });

    } catch (error) {
        logger.error('Failed to generate Vedic Panchang data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Panchang data',
            message: error.message
        });
    }
});

export default router;

import express from 'express';
import { pdfGenerationService } from '../services/pdfGenerationService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireCoins } from '../middleware/coinMiddleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// PDF generation costs in coins
const PDF_COSTS = {
  mini_horoscope: 25,
  basic_horoscope: 50,
  professional_horoscope: 100,
  match_making: 75
};

// Get available PDF types and their details
router.get('/types', async (req, res) => {
  try {
    const pdfTypes = pdfGenerationService.getAvailablePDFTypes();
    
    // Add coin costs to each type
    const typesWithCosts = Object.keys(pdfTypes).reduce((acc, key) => {
      acc[key] = {
        ...pdfTypes[key],
        coinCost: PDF_COSTS[key] || 50
      };
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        types: typesWithCosts,
        totalTypes: Object.keys(typesWithCosts).length
      }
    });
  } catch (error) {
    logger.error('Error getting PDF types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get PDF types'
    });
  }
});

// Generate Mini Horoscope PDF (9 pages)
router.post('/mini-horoscope', 
  authenticateToken, 
  requireCoins('pdf_mini_horoscope', PDF_COSTS.mini_horoscope), 
  async (req, res) => {
    try {
      const { birthData, customization = {} } = req.body;
      
      if (!birthData) {
        return res.status(400).json({
          success: false,
          error: 'Birth data is required'
        });
      }
      
      logger.info('Generating Mini Horoscope PDF', { 
        userId: req.user.uid,
        name: birthData.name 
      });
      
      const result = await pdfGenerationService.generateMiniHoroscopePDF(birthData, customization);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            pdfUrl: result.pdfUrl,
            type: result.type,
            pages: result.pages,
            downloadLink: result.pdfUrl,
            generatedAt: new Date().toISOString(),
            coinUsage: {
              coinsDeducted: PDF_COSTS.mini_horoscope,
              newBalance: req.coinBalance - PDF_COSTS.mini_horoscope,
              transactionId: req.coinTransactionId
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType
        });
      }
    } catch (error) {
      logger.error('Error generating Mini Horoscope PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF'
      });
    }
  }
);

// Generate Basic Horoscope PDF (25 pages)
router.post('/basic-horoscope', 
  authenticateToken, 
  requireCoins('pdf_basic_horoscope', PDF_COSTS.basic_horoscope), 
  async (req, res) => {
    try {
      const { birthData, customization = {} } = req.body;
      
      if (!birthData) {
        return res.status(400).json({
          success: false,
          error: 'Birth data is required'
        });
      }
      
      logger.info('Generating Basic Horoscope PDF', { 
        userId: req.user.uid,
        name: birthData.name 
      });
      
      const result = await pdfGenerationService.generateBasicHoroscopePDF(birthData, customization);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            pdfUrl: result.pdfUrl,
            type: result.type,
            pages: result.pages,
            downloadLink: result.pdfUrl,
            generatedAt: new Date().toISOString(),
            coinUsage: {
              coinsDeducted: PDF_COSTS.basic_horoscope,
              newBalance: req.coinBalance - PDF_COSTS.basic_horoscope,
              transactionId: req.coinTransactionId
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType
        });
      }
    } catch (error) {
      logger.error('Error generating Basic Horoscope PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF'
      });
    }
  }
);

// Generate Professional Horoscope PDF (68 pages)
router.post('/professional-horoscope', 
  authenticateToken, 
  requireCoins('pdf_professional_horoscope', PDF_COSTS.professional_horoscope), 
  async (req, res) => {
    try {
      const { birthData, customization = {} } = req.body;
      
      if (!birthData) {
        return res.status(400).json({
          success: false,
          error: 'Birth data is required'
        });
      }
      
      logger.info('Generating Professional Horoscope PDF', { 
        userId: req.user.uid,
        name: birthData.name 
      });
      
      const result = await pdfGenerationService.generateProfessionalHoroscopePDF(birthData, customization);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            pdfUrl: result.pdfUrl,
            type: result.type,
            pages: result.pages,
            downloadLink: result.pdfUrl,
            generatedAt: new Date().toISOString(),
            coinUsage: {
              coinsDeducted: PDF_COSTS.professional_horoscope,
              newBalance: req.coinBalance - PDF_COSTS.professional_horoscope,
              transactionId: req.coinTransactionId
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType
        });
      }
    } catch (error) {
      logger.error('Error generating Professional Horoscope PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF'
      });
    }
  }
);

// Generate Match Making PDF (24 pages)
router.post('/match-making', 
  authenticateToken, 
  requireCoins('pdf_match_making', PDF_COSTS.match_making), 
  async (req, res) => {
    try {
      const { maleData, femaleData, customization = {} } = req.body;
      
      if (!maleData || !femaleData) {
        return res.status(400).json({
          success: false,
          error: 'Both male and female birth data are required'
        });
      }
      
      logger.info('Generating Match Making PDF', { 
        userId: req.user.uid,
        maleName: maleData.name,
        femaleName: femaleData.name 
      });
      
      const result = await pdfGenerationService.generateMatchMakingPDF(maleData, femaleData, customization);
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            pdfUrl: result.pdfUrl,
            type: result.type,
            pages: result.pages,
            downloadLink: result.pdfUrl,
            generatedAt: new Date().toISOString(),
            coinUsage: {
              coinsDeducted: PDF_COSTS.match_making,
              newBalance: req.coinBalance - PDF_COSTS.match_making,
              transactionId: req.coinTransactionId
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType
        });
      }
    } catch (error) {
      logger.error('Error generating Match Making PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF'
      });
    }
  }
);

// Universal PDF generation endpoint
router.post('/generate', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { type, birthData, additionalData = {}, customization = {} } = req.body;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'PDF type is required'
        });
      }
      
      if (!birthData) {
        return res.status(400).json({
          success: false,
          error: 'Birth data is required'
        });
      }
      
      // Check if user has enough coins for this PDF type
      const coinCost = PDF_COSTS[type] || 50;
      const userBalance = req.coinBalance || 0;
      
      if (userBalance < coinCost) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient coins',
          required: coinCost,
          current: userBalance
        });
      }
      
      logger.info('Generating PDF', { 
        userId: req.user.uid,
        type: type,
        name: birthData.name 
      });
      
      const result = await pdfGenerationService.generatePDF(type, birthData, additionalData, customization);
      
      if (result.success) {
        // Deduct coins (this would normally be handled by middleware)
        // For now, we'll just report the transaction
        res.json({
          success: true,
          data: {
            pdfUrl: result.pdfUrl,
            type: result.type,
            pages: result.pages,
            downloadLink: result.pdfUrl,
            generatedAt: new Date().toISOString(),
            coinUsage: {
              coinsRequired: coinCost,
              currentBalance: userBalance
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errorType: result.errorType
        });
      }
    } catch (error) {
      logger.error('Error generating PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF'
      });
    }
  }
);

// Download PDF from URL (proxy endpoint for security)
router.get('/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { pdfUrl } = req.query;
    const { filename } = req.params;
    
    if (!pdfUrl) {
      return res.status(400).json({
        success: false,
        error: 'PDF URL is required'
      });
    }
    
    logger.info('Downloading PDF', { 
      userId: req.user.uid,
      filename: filename,
      pdfUrl: pdfUrl.substring(0, 50) + '...'
    });
    
    const result = await pdfGenerationService.downloadPDF(pdfUrl, filename);
    
    if (result.success) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      result.stream.pipe(res);
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download PDF'
    });
  }
});

// Get PDF service health status
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await pdfGenerationService.checkPDFServiceHealth();
    
    res.json({
      success: true,
      service: 'pdf-generation',
      ...healthStatus
    });
  } catch (error) {
    logger.error('Error checking PDF service health:', error);
    res.status(500).json({
      success: false,
      service: 'pdf-generation',
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Get PDF generation history for user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // This would typically fetch from a database
    // For now, return a mock response
    res.json({
      success: true,
      data: {
        history: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      message: 'PDF history feature coming soon'
    });
  } catch (error) {
    logger.error('Error getting PDF history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get PDF history'
    });
  }
});

// Get PDF pricing information
router.get('/pricing', async (req, res) => {
  try {
    const pdfTypes = pdfGenerationService.getAvailablePDFTypes();
    
    const pricing = Object.keys(pdfTypes).map(key => ({
      type: key,
      name: pdfTypes[key].name,
      description: pdfTypes[key].description,
      pages: pdfTypes[key].pages,
      coinCost: PDF_COSTS[key] || 50,
      estimatedTime: pdfTypes[key].estimatedTime,
      languages: pdfTypes[key].languages,
      requiresPartner: pdfTypes[key].requiresPartner || false
    }));
    
    res.json({
      success: true,
      data: {
        pricing,
        currency: 'coins',
        note: 'Prices are in Rraasi coins. 1 coin = ₹1 equivalent value.'
      }
    });
  } catch (error) {
    logger.error('Error getting PDF pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing information'
    });
  }
});

export default router;

import express from 'express';
import { astrologyReportService } from '../services/astrologyReportService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireCoins } from '../middleware/coinMiddleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// JSON Report Costs in Coins
const REPORT_COSTS = {
  general_house_report: 5,
  nakshatra_report: 10,
  general_ascendant_report: 10,
  pitra_dosha_report: 15,
  lalkitab_reports: 20,
  partner_report: 20,
  sadhesati: 25,
  match_making_report: 30,
  numero_report: 15
};

// Expose the pricing to the frontend
router.get('/pricing', async (req, res) => {
  res.json({
    success: true,
    data: REPORT_COSTS
  });
});

// Helper route handler for standard reports
const handleReport = (endpoint, costKey) => {
  return async (req, res) => {
    try {
      const { birthData, language = 'en' } = req.body;
      
      if (!birthData) {
        return res.status(400).json({ success: false, error: 'Birth data is required' });
      }

      logger.info(`Generating ${costKey}`, { userId: req.user.uid, language });
      
      const result = await astrologyReportService.fetchReport(endpoint, birthData, language);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          coinUsage: {
            coinsDeducted: REPORT_COSTS[costKey],
            newBalance: req.coinBalance - REPORT_COSTS[costKey],
            transactionId: req.coinTransactionId
          }
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error(`Error in ${costKey} route:`, error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
};

// Route Definitions wrapped in requireCoins middleware
router.post('/house/:planet', 
  authenticateToken, 
  (req, res, next) => requireCoins('text_report_house', REPORT_COSTS.general_house_report)(req, res, next),
  (req, res) => {
    const planet = req.params.planet || 'sun';
    return handleReport(`general_house_report/${planet}`, 'general_house_report')(req, res);
  }
);

router.post('/nakshatra', 
  authenticateToken, 
  requireCoins('text_report_nakshatra', REPORT_COSTS.nakshatra_report),
  handleReport('nakshatra_report', 'nakshatra_report')
);

router.post('/ascendant', 
  authenticateToken, 
  requireCoins('text_report_ascendant', REPORT_COSTS.general_ascendant_report),
  handleReport('general_ascendant_report', 'general_ascendant_report')
);

router.post('/pitra-dosha', 
  authenticateToken, 
  requireCoins('text_report_pitra_dosha', REPORT_COSTS.pitra_dosha_report),
  handleReport('pitra_dosha_report', 'pitra_dosha_report')
);

router.post('/lalkitab', 
  authenticateToken, 
  requireCoins('text_report_lalkitab', REPORT_COSTS.lalkitab_reports),
  handleReport('lalkitab_debts', 'lalkitab_reports')
);

router.post('/partner', 
  authenticateToken, 
  requireCoins('text_report_partner', REPORT_COSTS.partner_report),
  handleReport('manglik', 'partner_report')
);

router.post('/numerology', 
  authenticateToken, 
  requireCoins('text_report_numerology', REPORT_COSTS.numero_report),
  handleReport('numero_report', 'numero_report')
);

// Sadhe Sati involves multiple endpoints, let's proxy life_details as the main one, 
// or allow passing type
router.post('/sadhesati', 
  authenticateToken, 
  requireCoins('text_report_sadhesati', REPORT_COSTS.sadhesati),
  (req, res) => {
    const type = req.body.type || 'life_details'; // life_details, current_status, remedies
    return handleReport(`sadhesati_${type}`, 'sadhesati')(req, res);
  }
);

// Match Making requires maleData and femaleData
router.post('/match-making', 
  authenticateToken, 
  requireCoins('text_report_match_making', REPORT_COSTS.match_making_report),
  async (req, res) => {
    try {
      const { maleData, femaleData, language = 'en' } = req.body;
      
      if (!maleData || !femaleData) {
        return res.status(400).json({ success: false, error: 'Male and female birth data are required' });
      }

      logger.info('Generating match_making_report', { userId: req.user.uid, language });
      
      const result = await astrologyReportService.fetchMatchMakingReport('match_making_report', maleData, femaleData, language);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          coinUsage: {
            coinsDeducted: REPORT_COSTS.match_making_report,
            newBalance: req.coinBalance - REPORT_COSTS.match_making_report,
            transactionId: req.coinTransactionId
          }
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Error in match making route:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

export default router;

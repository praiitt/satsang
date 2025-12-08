import express from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { checkCoinBalance, addCoinBalanceToResponse } from '../middleware/coinMiddleware.js';
import { coinService } from '../services/coinService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const addBonusCoinsSchema = Joi.object({
  userId: Joi.string().required(),
  amount: Joi.number().integer().min(1).required(),
  reason: Joi.string().min(1).max(200).optional()
});

const transactionHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50)
});

/**
 * GET /api/coins/balance
 * Get user's coin balance
 */
router.get('/balance', authenticateToken, checkCoinBalance, addCoinBalanceToResponse, async (req, res) => {
  try {
    const userId = req.uid;
    
    logger.info('Getting coin balance for user', { userId });
    
    const balanceResult = await coinService.getCoinBalance(userId);
    
    if (!balanceResult.success) {
      return res.status(500).json({
        success: false,
        error: balanceResult.error,
        message: 'Failed to retrieve coin balance'
      });
    }
    
    // Get subscription status for additional context
    let subscriptionInfo = null;
    try {
      const userProfile = await coinService.firestoreRAGService?.getUserProfile(userId);
      if (userProfile?.profile?.email) {
        const subscription = await coinService.firestoreRAGService?.getSubscriptionByEmail(userProfile.profile.email);
        if (subscription && subscription.status === 'active') {
          const now = new Date();
          const endDate = new Date(subscription.endDate);
          if (now <= endDate) {
            subscriptionInfo = {
              status: 'active',
              planId: subscription.planId,
              endDate: subscription.endDate,
              rraasiCoins: subscription.rraasiCoins
            };
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to get subscription info for balance', { userId, error: error.message });
    }
    
    res.json({
      success: true,
      balance: {
        totalCoins: balanceResult.balance.totalCoins,
        earnedCoins: balanceResult.balance.earnedCoins,
        spentCoins: balanceResult.balance.spentCoins,
        bonusCoins: balanceResult.balance.bonusCoins,
        lastUpdated: balanceResult.balance.lastUpdated
      },
      subscription: subscriptionInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting coin balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve coin balance'
    });
  }
});

/**
 * GET /api/coins/transactions
 * Get user's transaction history
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.uid;
    const { error, value } = transactionHistorySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { limit } = value;
    
    logger.info('Getting transaction history for user', { userId, limit });
    
    const historyResult = await coinService.getTransactionHistory(userId, limit);
    
    if (!historyResult.success) {
      return res.status(500).json({
        success: false,
        error: historyResult.error,
        message: 'Failed to retrieve transaction history'
      });
    }
    
    res.json({
      success: true,
      transactions: historyResult.transactions,
      count: historyResult.transactions.length,
      limit: limit,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve transaction history'
    });
  }
});

/**
 * GET /api/coins/features
 * Get all available features and their costs
 */
router.get('/features', async (req, res) => {
  try {
    logger.info('Getting feature costs');
    
    const features = coinService.getAllFeatureCosts();
    
    // Transform features for better API response
    const featureList = Object.entries(features).map(([id, config]) => ({
      id: id,
      name: config.name,
      cost: config.cost,
      category: config.category,
      freeTierAvailable: config.freeTierAvailable,
      subscriptionUnlimited: config.subscriptionUnlimited
    }));
    
    res.json({
      success: true,
      features: featureList,
      count: featureList.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting feature costs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve feature costs'
    });
  }
});

/**
 * GET /api/coins/features/:featureId
 * Get specific feature cost information
 */
router.get('/features/:featureId', async (req, res) => {
  try {
    const { featureId } = req.params;
    
    logger.info('Getting feature cost for specific feature', { featureId });
    
    const featureCost = coinService.getFeatureCost(featureId);
    
    if (!featureCost) {
      return res.status(404).json({
        success: false,
        error: 'Feature not found',
        message: `Feature '${featureId}' is not recognized`
      });
    }
    
    res.json({
      success: true,
      feature: {
        id: featureId,
        name: featureCost.name,
        cost: featureCost.cost,
        category: featureCost.category,
        freeTierAvailable: featureCost.freeTierAvailable,
        subscriptionUnlimited: featureCost.subscriptionUnlimited
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting feature cost:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve feature cost'
    });
  }
});

/**
 * POST /api/coins/check-access
 * Check if user has access to a specific feature
 */
router.post('/check-access', authenticateToken, async (req, res) => {
  try {
    const userId = req.uid;
    const { featureId } = req.body;
    
    if (!featureId) {
      return res.status(400).json({
        success: false,
        error: 'Feature ID is required'
      });
    }
    
    logger.info('Checking feature access for user', { userId, featureId });
    
    const accessCheck = await coinService.checkFeatureAccess(userId, featureId);
    
    if (!accessCheck.success) {
      return res.status(500).json({
        success: false,
        error: accessCheck.error,
        message: 'Failed to check feature access'
      });
    }
    
    res.json({
      success: true,
      access: {
        hasAccess: accessCheck.hasAccess,
        reason: accessCheck.reason,
        cost: accessCheck.cost,
        requiredCoins: accessCheck.requiredCoins,
        availableCoins: accessCheck.availableCoins
      },
      feature: {
        id: featureId,
        name: coinService.getFeatureCost(featureId)?.name || 'Unknown Feature'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error checking feature access:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check feature access'
    });
  }
});

/**
 * POST /api/coins/bonus
 * Add bonus coins to user (Admin only)
 */
router.post('/bonus', authenticateToken, async (req, res) => {
  try {
    const { error, value } = addBonusCoinsSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const { userId, amount, reason = 'Admin bonus' } = value;
    const adminUserId = req.uid;
    
    logger.info('Adding bonus coins to user', { 
      adminUserId, 
      targetUserId: userId, 
      amount, 
      reason 
    });
    
    // TODO: Add admin authorization check here
    // For now, allowing any authenticated user to add bonus coins
    
    const bonusResult = await coinService.addBonusCoins(userId, amount, reason);
    
    if (!bonusResult.success) {
      return res.status(500).json({
        success: false,
        error: bonusResult.error,
        message: 'Failed to add bonus coins'
      });
    }
    
    res.json({
      success: true,
      bonus: {
        amount: bonusResult.bonusAdded,
        reason: reason,
        newBalance: bonusResult.newBalance
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error adding bonus coins:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to add bonus coins'
    });
  }
});

/**
 * GET /api/coins/stats
 * Get coin system statistics (Admin only)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const adminUserId = req.uid;
    
    logger.info('Getting coin system statistics', { adminUserId });
    
    // TODO: Add admin authorization check here
    
    // Get basic statistics
    const stats = {
      totalFeatures: Object.keys(coinService.getAllFeatureCosts()).length,
      featureCategories: [...new Set(Object.values(coinService.getAllFeatureCosts()).map(f => f.category))],
      averageFeatureCost: Object.values(coinService.getAllFeatureCosts()).reduce((sum, f) => sum + f.cost, 0) / Object.keys(coinService.getAllFeatureCosts()).length,
      freeTierFeatures: Object.values(coinService.getAllFeatureCosts()).filter(f => f.freeTierAvailable).length,
      subscriptionUnlimitedFeatures: Object.values(coinService.getAllFeatureCosts()).filter(f => f.subscriptionUnlimited).length
    };
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting coin system statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve coin system statistics'
    });
  }
});

/**
 * POST /api/coins/refresh-balance
 * Refresh user's coin balance from subscriptions
 */
router.post('/refresh-balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.uid;
    
    logger.info('Refreshing coin balance for user', { userId });
    
    // Get current balance
    const balanceResult = await coinService.getCoinBalance(userId);
    
    if (!balanceResult.success) {
      return res.status(500).json({
        success: false,
        error: balanceResult.error,
        message: 'Failed to refresh coin balance'
      });
    }
    
    res.json({
      success: true,
      message: 'Coin balance refreshed successfully',
      balance: {
        totalCoins: balanceResult.balance.totalCoins,
        earnedCoins: balanceResult.balance.earnedCoins,
        spentCoins: balanceResult.balance.spentCoins,
        bonusCoins: balanceResult.balance.bonusCoins,
        lastUpdated: balanceResult.balance.lastUpdated
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error refreshing coin balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to refresh coin balance'
    });
  }
});

export default router;

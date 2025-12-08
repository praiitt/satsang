import { coinService } from '../services/coinService.js';
import { logger } from '../utils/logger.js';

/**
 * Coin Access Control Middleware
 * Checks if user has sufficient coins or subscription access for features
 */

/**
 * Middleware to require coins for feature access
 * @param {string} featureId - Feature ID to check access for
 * @param {object} options - Additional options
 * @returns {function} - Express middleware function
 */
export const requireCoins = (featureId, options = {}) => {
  return async (req, res, next) => {
    try {
      // Extract userId from various possible locations
      // Priority: req.user.userId > req.uid (decoded if needed)
      let userId = req.user?.userId;
      
      // If req.user.userId doesn't exist, try req.uid
      if (!userId) {
        userId = req.uid;
        
        // If req.uid looks like a JWT token (starts with eyJ), extract userId from it
        if (userId && typeof userId === 'string' && userId.startsWith('eyJ')) {
          try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.default.decode(userId);
            userId = decoded?.userId || null;
            if (userId) {
              logger.warn('Extracted userId from JWT token in req.uid', { 
                extractedUserId: userId,
                originalReqUid: req.uid?.substring(0, 20) + '...' 
              });
            }
          } catch (e) {
            logger.warn('Failed to decode JWT from req.uid', { error: e.message });
            userId = null;
          }
        }
      }
      
      // Final validation
      if (!userId || (typeof userId === 'string' && userId.startsWith('eyJ'))) {
        logger.error('Could not extract valid userId', { 
          reqUid: req.uid?.substring(0, 50) + '...', 
          reqUser: req.user,
          uidType: typeof req.uid,
          userHasUserId: !!req.user?.userId 
        });
        return res.status(401).json({
          success: false,
          error: 'User authentication required',
          message: 'Please sign in to access this feature'
        });
      }

      logger.info('Checking coin access for feature', { 
        userId, 
        featureId, 
        endpoint: req.path,
        reqUid: req.uid,
        reqUser: req.user
      });

      // Check feature access
      const accessCheck = await coinService.checkFeatureAccess(userId, featureId);
      
      if (!accessCheck.success) {
        logger.warn('Feature access check failed', { 
          userId, 
          featureId, 
          error: accessCheck.error 
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to check feature access',
          message: 'Please try again later',
          debug: { userId, featureId, error: accessCheck.error }
        });
      }

      if (!accessCheck.hasAccess) {
        logger.warn('Insufficient coins for feature access', { 
          userId, 
          featureId, 
          requiredCoins: accessCheck.requiredCoins,
          availableCoins: accessCheck.availableCoins,
          reqUid: req.uid,
          reqUser: req.user
        });
        
        return res.status(402).json({
          success: false,
          error: 'Insufficient coins',
          message: `You need ${accessCheck.requiredCoins} coins to access this feature`,
          requiredCoins: accessCheck.requiredCoins,
          availableCoins: accessCheck.availableCoins,
          featureId: featureId,
          featureName: coinService.getFeatureCost(featureId)?.name || 'Unknown Feature',
          debug: { 
            userId, 
            reqUid: req.uid,
            userIdFromToken: req.user?.userId || req.user?.uid
          }
        });
      }

      // Add access information to request
      req.coinAccess = {
        featureId: featureId,
        hasAccess: true,
        reason: accessCheck.reason,
        cost: accessCheck.cost,
        availableCoins: accessCheck.availableCoins
      };

      logger.info('Feature access granted', { 
        userId, 
        featureId, 
        reason: accessCheck.reason,
        cost: accessCheck.cost
      });

      next();

    } catch (error) {
      logger.error('Error in coin access middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to verify feature access'
      });
    }
  };
};

/**
 * Middleware to deduct coins after feature usage
 * Should be used after the main feature logic
 * @param {string} featureId - Feature ID
 * @param {object} options - Additional options
 * @returns {function} - Express middleware function
 */
export const deductCoins = (featureId, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.uid || req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Only deduct if coins are required (not free access)
      if (req.coinAccess && req.coinAccess.cost > 0) {
        logger.info('Deducting coins for feature usage', { 
          userId, 
          featureId, 
          cost: req.coinAccess.cost 
        });

        const deductResult = await coinService.deductCoins(userId, featureId, {
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        if (!deductResult.success) {
          logger.error('Failed to deduct coins', { 
            userId, 
            featureId, 
            error: deductResult.error 
          });
          
          // Don't fail the request if coin deduction fails
          // Just log the error and continue
          logger.warn('Continuing request despite coin deduction failure');
        } else {
          logger.info('Coins deducted successfully', { 
            userId, 
            featureId, 
            coinsDeducted: deductResult.coinsDeducted,
            newBalance: deductResult.newBalance
          });
          
          // Add deduction info to response
          if (res.locals) {
            res.locals.coinDeduction = {
              coinsDeducted: deductResult.coinsDeducted,
              newBalance: deductResult.newBalance,
              transactionId: deductResult.transactionId
            };
          }
        }
      } else {
        logger.info('No coins deducted - free access', { 
          userId, 
          featureId, 
          reason: req.coinAccess?.reason 
        });
      }

      next();

    } catch (error) {
      logger.error('Error in coin deduction middleware:', error);
      // Don't fail the request, just log the error
      next();
    }
  };
};

/**
 * Middleware to check coin balance without deducting
 * Useful for informational endpoints
 * @returns {function} - Express middleware function
 */
export const checkCoinBalance = async (req, res, next) => {
  try {
    const userId = req.uid || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const balanceResult = await coinService.getCoinBalance(userId);
    
    if (!balanceResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get coin balance'
      });
    }

    // Add balance info to request
    req.coinBalance = balanceResult.balance;
    
    next();

  } catch (error) {
    logger.error('Error in coin balance middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check coin balance'
    });
  }
};

/**
 * Middleware to validate feature ID
 * @param {string} featureId - Feature ID to validate
 * @returns {function} - Express middleware function
 */
export const validateFeature = (featureId) => {
  return (req, res, next) => {
    const featureCost = coinService.getFeatureCost(featureId);
    
    if (!featureCost) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feature',
        message: `Feature '${featureId}' is not recognized`
      });
    }

    // Add feature info to request
    req.featureInfo = featureCost;
    
    next();
  };
};

/**
 * Combined middleware for coin access control
 * Checks access and deducts coins in one middleware
 * @param {string} featureId - Feature ID
 * @param {object} options - Additional options
 * @returns {array} - Array of middleware functions
 */
export const coinAccessControl = (featureId, options = {}) => {
  return [
    validateFeature(featureId),
    requireCoins(featureId, options),
    // Note: deductCoins should be called after the main feature logic
    // This is just the access check part
  ];
};

/**
 * Middleware to add coin balance to response
 * @returns {function} - Express middleware function
 */
export const addCoinBalanceToResponse = (req, res, next) => {
  try {
    if (req.coinBalance) {
      if (!res.locals) {
        res.locals = {};
      }
      
      res.locals.coinBalance = {
        totalCoins: req.coinBalance.totalCoins,
        earnedCoins: req.coinBalance.earnedCoins,
        spentCoins: req.coinBalance.spentCoins,
        bonusCoins: req.coinBalance.bonusCoins,
        lastUpdated: req.coinBalance.lastUpdated
      };
    }
    
    next();
  } catch (error) {
    logger.error('Error adding coin balance to response:', error);
    next();
  }
};

/**
 * Middleware to handle coin-related errors
 * @returns {function} - Express middleware function
 */
export const coinErrorHandler = (error, req, res, next) => {
  if (error.code === 'INSUFFICIENT_COINS') {
    return res.status(402).json({
      success: false,
      error: 'Insufficient coins',
      message: error.message,
      requiredCoins: error.requiredCoins,
      availableCoins: error.availableCoins
    });
  }
  
  if (error.code === 'FEATURE_ACCESS_DENIED') {
    return res.status(403).json({
      success: false,
      error: 'Feature access denied',
      message: error.message,
      featureId: error.featureId
    });
  }
  
  next(error);
};

export default {
  requireCoins,
  deductCoins,
  checkCoinBalance,
  validateFeature,
  coinAccessControl,
  addCoinBalanceToResponse,
  coinErrorHandler
};

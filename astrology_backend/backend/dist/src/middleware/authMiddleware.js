import { authService } from '../services/authService.js';
import { logger } from '../utils/logger.js';

// Middleware to verify Firebase token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const tokenResult = await authService.verifyToken(token);
    
    if (!tokenResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Please provide a valid authentication token'
      });
    }

    // Add user info to request
    req.user = tokenResult.user;
    req.uid = tokenResult.uid;
    
    logger.info('Token verified successfully', { uid: tokenResult.uid });
    next();

  } catch (error) {
    logger.error('Error in authentication middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const tokenResult = await authService.verifyToken(token);
      if (tokenResult.success) {
        req.user = tokenResult.user;
        req.uid = tokenResult.uid;
        logger.info('Optional auth: Token verified', { uid: tokenResult.uid });
      }
    }

    next();

  } catch (error) {
    logger.error('Error in optional authentication middleware:', error);
    next(); // Continue without authentication
  }
};

// Middleware to check if user is authenticated
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please sign in to access this resource'
    });
  }
  next();
}; 
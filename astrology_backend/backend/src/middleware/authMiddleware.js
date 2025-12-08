import { jwtService } from '../services/jwtService.js';
import { logger } from '../utils/logger.js';

// JWT-based authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid JWT token in Authorization header'
      });
    }

    // Check if this is a development mode token (dev_ prefix)
    if (token.startsWith('dev_')) {
      const userId = token.substring(4); // Remove 'dev_' prefix
      if (userId && userId !== 'anonymous_user') {
        req.user = { userId: userId, uid: userId };
        req.uid = userId;
        logger.info('Development mode: Using user ID from dev token', { uid: userId, reqUser: req.user });
        return next();
      }
    }

    // Verify JWT token - log token type for debugging
    logger.debug('Verifying JWT token', { 
      tokenPrefix: token.substring(0, 20) + '...',
      isDevToken: token.startsWith('dev_'),
      tokenLength: token.length
    });
    
    const tokenResult = await jwtService.verifyToken(token);
    
    if (!tokenResult.success) {
      return res.status(401).json({
        success: false,
        error: tokenResult.error,
        code: tokenResult.code,
        message: 'Invalid or expired token'
      });
    }

    // Extract userId from token result - ensure it's valid
    const userId = tokenResult.userId || tokenResult.user?.userId;
    
    if (!userId || typeof userId !== 'string' || userId.length > 128) {
      logger.error('Invalid userId extracted from JWT token', { 
        tokenResult, 
        userId,
        userIdType: typeof userId,
        userIdLength: userId?.length
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        message: 'Token does not contain valid user information'
      });
    }

    // Add user info to request - ensure userId is properly set
    req.user = {
      ...tokenResult.user,
      userId: userId, // Ensure userId is set correctly
      uid: userId // Also set uid for consistency
    };
    req.uid = userId; // For backward compatibility with req.uid
    
    logger.info('JWT token verified successfully', { 
      uid: userId,
      hasUser: !!req.user,
      userUserId: req.user.userId,
      reqUid: req.uid
    });
    next();

  } catch (error) {
    logger.error('Error in JWT authentication middleware:', error);
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
      // Check for dev token
      if (token.startsWith('dev_')) {
        const userId = token.substring(4);
        if (userId && userId !== 'anonymous_user') {
          req.user = { userId: userId, uid: userId };
          req.uid = userId;
          logger.info('Optional auth: Development mode token', { uid: userId });
        }
      } else {
        // Verify JWT token
        const tokenResult = await jwtService.verifyToken(token);
        if (tokenResult.success) {
          const userId = tokenResult.userId || tokenResult.user?.userId;
          if (userId && typeof userId === 'string' && userId.length <= 128) {
            req.user = {
              ...tokenResult.user,
              userId: userId,
              uid: userId
            };
            req.uid = userId;
            logger.info('Optional auth: JWT token verified', { uid: userId });
          }
        }
      }
    }

    next();

  } catch (error) {
    logger.error('Error in optional JWT authentication middleware:', error);
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

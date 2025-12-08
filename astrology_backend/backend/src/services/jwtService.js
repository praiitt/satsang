import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d'; // 7 days default
  }

  // Generate JWT token for a user
  generateToken(userId, userData = {}) {
    try {
      const payload = {
        userId,
        ...userData,
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
      
      logger.info('JWT token generated successfully', { userId, expiresIn: this.expiresIn });
      return { success: true, token, expiresIn: this.expiresIn };
    } catch (error) {
      logger.error('Error generating JWT token:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      
      logger.info('JWT token verified successfully', { userId: decoded.userId });
      return { success: true, user: decoded, userId: decoded.userId };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('JWT token expired', { token: token.substring(0, 20) + '...' });
        return { success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' };
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid JWT token', { token: token.substring(0, 20) + '...' });
        return { success: false, error: 'Invalid token', code: 'INVALID_TOKEN' };
      } else {
        logger.error('Error verifying JWT token:', error);
        return { success: false, error: error.message, code: 'VERIFICATION_ERROR' };
      }
    }
  }

  // Refresh JWT token
  refreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, { ignoreExpiration: true });
      
      // Generate new token with same payload but new expiration
      const newToken = jwt.sign(
        { ...decoded, iat: Math.floor(Date.now() / 1000) },
        this.secret,
        { expiresIn: this.expiresIn }
      );
      
      logger.info('JWT token refreshed successfully', { userId: decoded.userId });
      return { success: true, token: newToken, expiresIn: this.expiresIn };
    } catch (error) {
      logger.error('Error refreshing JWT token:', error);
      return { success: false, error: error.message };
    }
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    try {
      const decoded = jwt.decode(token);
      return { success: true, decoded };
    } catch (error) {
      logger.error('Error decoding JWT token:', error);
      return { success: false, error: error.message };
    }
  }
}

export const jwtService = new JWTService();
export default jwtService;

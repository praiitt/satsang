import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

// Admin authentication middleware
export const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is admin
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Check if user is admin (you can implement your own admin check logic)
    const isAdmin = await checkAdminStatus(decoded.userId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Add user info to request
    req.adminUser = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Check if user has admin privileges
const checkAdminStatus = async (userId) => {
  try {
    // TODO: Implement your admin check logic
    // This could be:
    // 1. Check a role field in your user model
    // 2. Check against a list of admin emails
    // 3. Check against a separate admin table
    
    // For now, we'll use a simple email check
    // In production, implement proper role-based access control
    
    // Example implementation:
    // const user = await User.findById(userId);
    // return user && user.role === 'admin';
    
    return true; // Temporary - replace with actual admin check
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return false;
  }
};

// Optional: Role-based middleware for different admin levels
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.adminUser.role !== requiredRole && req.adminUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: `Role '${requiredRole}' required`
      });
    }

    next();
  };
};

// Super admin only middleware
export const requireSuperAdmin = (req, res, next) => {
  if (!req.adminUser || req.adminUser.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required'
    });
  }

  next();
};

import express from 'express';
import Joi from 'joi';
import { authService } from '../services/authService.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { hybridRAGService } from '../services/hybridRAGService.js';

const router = express.Router();

// Validation schemas
const signUpSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(50).required(),
  birthData: Joi.object({
    birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    birthTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    placeOfBirth: Joi.string().optional(),
    timezone: Joi.number().min(-12).max(14).optional()
  }).required()
});

const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  birthData: Joi.object({
    birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    birthTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    placeOfBirth: Joi.string().optional(),
    timezone: Joi.number().min(-12).max(14).optional()
  }).optional(),
  wellnessProfile: Joi.object({
    dosha: Joi.string().valid('vata', 'pitta', 'kapha', 'vata-pitta', 'vata-kapha', 'pitta-kapha').optional(),
    fitnessLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    goals: Joi.array().items(Joi.string()).optional(),
    timeAvailable: Joi.string().optional()
  }).optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark').optional(),
    notifications: Joi.boolean().optional()
  }).optional()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

// Sign up endpoint
router.post('/signup', async (req, res) => {
  try {
    // Validate request
    const { error, value } = signUpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    logger.info('User signup request', { email: value.email, name: value.name });

    const result = await authService.signUp(value);

    if (result.success) {
      logger.info('User signup successful', { uid: result.user.uid });
      res.status(201).json(result);
    } else {
      logger.warn('User signup failed', { error: result.error });
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error('Error in signup endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create account'
    });
  }
});

// Sign in endpoint
router.post('/signin', async (req, res) => {
  try {
    // Validate request
    const { error, value } = signInSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    logger.info('User signin request', { email: value.email });

    const result = await authService.signIn(value.email, value.password);

    if (result.success) {
      logger.info('User signin successful', { uid: result.user.uid });
      res.json(result);
    } else {
      logger.warn('User signin failed', { error: result.error });
      res.status(401).json(result);
    }

  } catch (error) {
    logger.error('Error in signin endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to sign in'
    });
  }
});

// Sign out endpoint
router.post('/signout', authenticateToken, requireAuth, async (req, res) => {
  try {
    const result = await authService.signOut();
    
    if (result.success) {
      logger.info('User signout successful', { uid: req.uid });
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    logger.error('Error in signout endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to sign out'
    });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, requireAuth, async (req, res) => {
  try {
    const result = await authService.getCurrentUser();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    logger.error('Error in get current user endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
});

// Simple get current user endpoint (for frontend refresh)
router.get('/me-simple', async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    logger.info('Simple get current user request', { uid });

    // Get user profile from Hybrid RAG
    const profile = await hybridRAGService.getUserProfile(uid);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create user object
    const user = {
      uid: uid,
      email: profile.email || 'user@example.com',
      name: profile.name || 'User',
      profile: profile
    };

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    logger.error('Error in simple get current user endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile endpoint
router.put('/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    // Validate request
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    logger.info('User profile update request', { uid: req.uid, updates: Object.keys(value) });

    const result = await authService.updateUserProfile(req.uid, value);

    if (result.success) {
      logger.info('User profile updated successfully', { uid: req.uid });
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error('Error in update profile endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

// Test endpoint to check Hybrid RAG service
router.get('/test-hybrid-rag/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    logger.info('Testing Hybrid RAG service', { uid });

    // Test getting user profile
    const profile = await hybridRAGService.getUserProfile(uid);
    
    res.json({
      success: true,
      profile: profile,
      message: 'Hybrid RAG service test completed'
    });

  } catch (error) {
    logger.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Simple profile update endpoint (for testing)
router.put('/profile-simple', async (req, res) => {
  try {
    const { uid, updates } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }

    logger.info('Simple profile update request', { uid, updates: Object.keys(updates || {}) });

    // Get current user profile
    const currentProfile = await hybridRAGService.getUserProfile(uid);
    let userData = { uid };
    
    if (currentProfile) {
      userData = { ...currentProfile, ...updates };
    } else {
      userData = { uid, ...updates };
    }

    // Update profile in Hybrid RAG system
    try {
      const result = await hybridRAGService.updateUserProfile(uid, updates);
      
      if (result.success) {
        // If birth data is updated, regenerate charts (commented out due to Firebase permissions)
        // if (updates.birthData) {
        //   await authService.generateUserCharts(uid, updates.birthData);
        // }

        logger.info('User profile updated successfully in Hybrid RAG', { uid });
        
        res.json({
          success: true,
          message: 'Profile updated successfully!'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update profile',
          details: result.error
        });
      }
    } catch (error) {
      logger.error('Error updating profile in Hybrid RAG:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        details: error.message
      });
    }

  } catch (error) {
    logger.error('Error in simple update profile endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    // Validate request
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    logger.info('Password reset request', { email: value.email });

    const result = await authService.resetPassword(value.email);

    if (result.success) {
      logger.info('Password reset email sent', { email: value.email });
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error('Error in reset password endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to send reset email'
    });
  }
});

// Verify token endpoint
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
        message: 'Please provide a token to verify'
      });
    }

    const result = await authService.verifyToken(token);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }

  } catch (error) {
    logger.error('Error in verify token endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify token'
    });
  }
});

// Check user online/offline status based on chart data availability
router.get('/user-status/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { autoImport = 'false' } = req.query; // New query parameter to control auto-import
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User ID required',
        message: 'Please provide a user ID'
      });
    }

    logger.info('Checking user status', { uid, autoImport });

    // Check if user has complete chart data
    const userCharts = await hybridRAGService.getAllUserCharts(uid);
    
    let isOnline = false;
    let chartStatus = 'offline';
    let missingCharts = [];
    let importedCharts = [];
    let autoImportAttempted = false;
    
    if (userCharts.success && userCharts.charts && Object.keys(userCharts.charts).length > 0) {
      // Check for essential chart types
      const essentialCharts = ['astro_details', 'planets', 'horo_chart'];
      const availableCharts = Object.keys(userCharts.charts);
      
      // Check which essential charts are missing
      missingCharts = essentialCharts.filter(chartType => 
        !availableCharts.includes(chartType) || userCharts.charts[chartType].length === 0
      );
      
      // User is online if they have at least 2 out of 3 essential charts
      const hasEssentialCharts = essentialCharts.filter(chartType => 
        availableCharts.includes(chartType) && userCharts.charts[chartType].length > 0
      ).length >= 2;
      
      isOnline = hasEssentialCharts;
      chartStatus = hasEssentialCharts ? 'online' : 'offline';
      
      // If user is offline and auto-import is enabled, try to import missing charts
      if (!isOnline && autoImport === 'true' && missingCharts.length > 0) {
        try {
          logger.info('Attempting auto-import for offline user', { uid, missingCharts });
          
          // Call the auto-import endpoint
          const { default: axios } = await import('axios');
          const autoImportResponse = await axios.post(`http://localhost:3000/api/astrology/auto-import-missing-charts/${uid}`);
          
          if (autoImportResponse.data.success) {
            autoImportAttempted = true;
            importedCharts = autoImportResponse.data.importedCharts || [];
            
            // Update status based on auto-import result
            isOnline = autoImportResponse.data.isOnline;
            chartStatus = isOnline ? 'online' : 'offline';
            missingCharts = autoImportResponse.data.missingCharts || [];
            
            logger.info('Auto-import completed', { 
              uid, 
              isOnline, 
              importedCharts, 
              missingCharts 
            });
          }
        } catch (autoImportError) {
          logger.error('Auto-import failed:', autoImportError);
          // Continue with original status if auto-import fails
        }
      }
      
      logger.info('User status determined', { 
        uid, 
        isOnline, 
        chartStatus, 
        availableCharts: Object.keys(userCharts.charts),
        missingCharts,
        totalCharts: userCharts.totalCharts,
        autoImportAttempted,
        importedCharts
      });
    } else {
      logger.info('No chart data found for user', { uid });
      missingCharts = ['astro_details', 'planets', 'horo_chart'];
    }

    res.json({
      success: true,
      uid,
      isOnline,
      chartStatus,
      availableCharts: userCharts.success ? Object.keys(userCharts.charts) : [],
      missingCharts,
      totalCharts: userCharts.success ? userCharts.totalCharts : 0,
      autoImportAttempted,
      importedCharts,
      message: isOnline 
        ? 'User has complete chart data and is online' 
        : autoImportAttempted
          ? `Auto-import attempted. ${importedCharts.length} charts imported. ${missingCharts.length} charts still missing.`
          : 'User is offline - chart data incomplete or missing'
    });

  } catch (error) {
    logger.error('Error checking user status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check user status'
    });
  }
});

export default router; 
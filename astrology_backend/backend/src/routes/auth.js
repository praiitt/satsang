import express from 'express';
import Joi from 'joi';
import { authService } from '../services/authService.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { firestoreRAGService } from '../services/firestoreRAGService.js';
import { adminDb } from '../config/firebase.js';

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
      logger.warn('Signup validation failed', { 
        error: error.details[0].message,
        body: req.body 
      });
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

// Manual chart generation endpoint
router.post('/generate-charts', async (req, res) => {
  try {
    // Validate request
    const { error, value } = Joi.object({
      userId: Joi.string().required(),
      birthData: Joi.object({
        birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        birthTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        placeOfBirth: Joi.string().optional(),
        timezone: Joi.number().min(-12).max(14).optional()
      }).required()
    }).validate(req.body);

    if (error) {
      logger.warn('Manual chart generation validation failed', { 
        error: error.details[0].message,
        body: req.body 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    logger.info('Manual chart generation request', { userId: value.userId });

    // Generate charts using the auth service
    try {
      await authService.generateUserCharts(value.userId, value.birthData);
      logger.info('Manual chart generation successful', { userId: value.userId });
      res.status(200).json({
        success: true,
        message: 'Charts generated successfully! You are now online.',
        chartCount: 5
      });
    } catch (chartError) {
      logger.warn('Manual chart generation failed', { userId: value.userId, error: chartError.message });
      res.status(400).json({
        success: false,
        error: 'Failed to generate charts',
        details: chartError.message
      });
    }

  } catch (error) {
    logger.error('Error in manual chart generation endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate charts'
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
    const result = await authService.signOut(req.uid);
    
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
    const profile = await firestoreRAGService.getUserProfile(uid);
    
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
    const profile = await firestoreRAGService.getUserProfile(uid);
    
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

// Debug endpoint to check raw Firestore chart data
router.get('/debug-charts/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    logger.info('Debugging charts for user', { uid });

    // Get raw charts from Firestore
    const rawCharts = await firestoreRAGService.firestoreService.getUserCharts(uid);
    
    // Show detailed chart information
    const chartDetails = rawCharts.map(chart => ({
      id: chart.id,
      hasChartType: !!chart.chartType,
      hasType: !!chart.type,
      chartType: chart.chartType,
      type: chart.type,
      keys: Object.keys(chart),
      // Show first few characters of each field
      sampleData: Object.keys(chart).reduce((acc, key) => {
        const value = chart[key];
        if (typeof value === 'string') {
          acc[key] = value.substring(0, 100) + (value.length > 100 ? '...' : '');
        } else if (typeof value === 'object' && value !== null) {
          acc[key] = `[${typeof value}:${Array.isArray(value) ? 'array' : 'object'}]`;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {})
    }));
    
    res.json({
      success: true,
      totalCharts: rawCharts.length,
      chartDetails: chartDetails,
      message: 'Chart debugging completed'
    });

  } catch (error) {
    logger.error('Error in debug charts endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Test endpoint to manually check Firestore charts
router.get('/test-firestore-charts/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    logger.info('Test Firestore charts request', { uid });
    
    // Import Firestore service directly
    const { default: FirestoreService } = await import('../services/firestoreService.js');
    const firestoreService = new FirestoreService();
    
    // Get charts directly from Firestore
    const charts = await firestoreService.getUserCharts(uid);
    
    logger.info('Test Firestore charts result', { 
      uid, 
      chartCount: charts?.length || 0,
      chartIds: charts?.map(c => c.id) || [],
      chartKeys: charts?.map(c => Object.keys(c)) || [],
      sampleChart: charts?.[0] ? Object.keys(charts[0]) : []
    });
    
    res.json({
      success: true,
      totalCharts: charts?.length || 0,
      chartDetails: charts || [],
      message: 'Firestore charts test completed'
    });
    
  } catch (error) {
    logger.error('Error in test Firestore charts endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to test Firestore charts',
      details: error.message
    });
  }
});

// Sync RAG data to Firestore endpoint
router.post('/sync-rag-to-firestore/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    logger.info('Sync RAG to Firestore request received', { uid });
    
    // Import FirestoreRAG service
    const { default: FirestoreRAGService } = await import('../services/firestoreRAGService.js');
    const firestoreRAGService = new FirestoreRAGService();
    
    // Initialize vector store first
    await firestoreRAGService.initializeVectorStore();
    
    // Sync RAG data to Firestore
    const result = await firestoreRAGService.syncRAGToFirestore(uid);
    
    logger.info('RAG to Firestore sync completed', { uid, result });
    
    res.json({
      success: true,
      message: 'RAG to Firestore sync completed',
      result: result
    });
    
  } catch (error) {
    logger.error('Error in sync RAG to Firestore endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to sync RAG to Firestore',
      details: error.message
    });
  }
});

// Delete all users and data endpoint (for fresh start)
router.delete('/delete-all-users', async (req, res) => {
  try {
    logger.info('Delete all users request received');
    
    // Import Firestore service directly
    const { default: FirestoreService } = await import('../services/firestoreService.js');
    const firestoreService = new FirestoreService();
    
    // Delete all users from Firestore
    const usersRef = firestoreService.db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const deletePromises = [];
    usersSnapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    
    // Delete all charts from Firestore
    const chartsRef = firestoreService.db.collection('charts');
    const chartsSnapshot = await chartsRef.get();
    
    chartsSnapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    
    // Delete all waitlist entries
    const waitlistRef = firestoreService.db.collection('waitlist');
    const waitlistSnapshot = await waitlistRef.get();
    
    waitlistSnapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    
    // Execute all deletions
    await Promise.all(deletePromises);
    
    logger.info('All users and data deleted successfully', { 
      usersDeleted: usersSnapshot.size,
      chartsDeleted: chartsSnapshot.size,
      waitlistDeleted: waitlistSnapshot.size
    });
    
    res.json({
      success: true,
      message: 'All users and data deleted successfully',
      deleted: {
        users: usersSnapshot.size,
        charts: chartsSnapshot.size,
        waitlist: waitlistSnapshot.size
      }
    });
    
  } catch (error) {
    logger.error('Error deleting all users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete all users',
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
    const currentProfile = await firestoreRAGService.getUserProfile(uid);
    let userData = { uid };
    
    if (currentProfile) {
      userData = { ...currentProfile, ...updates };
    } else {
      userData = { uid, ...updates };
    }

    // Update profile in Hybrid RAG system
    try {
      const result = await firestoreRAGService.updateUserProfile(uid, updates);
      
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

// Check user status based on available Astro Agents (charts)
router.get('/user-status/:uid', async (req, res) => {
  try {
    console.log('🔥🔥🔥 USER-STATUS ENDPOINT HIT 🔥🔥🔥');
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User ID required',
        message: 'Please provide a user ID'
      });
    }

    logger.info('Checking user status for Astro Agents', { uid });

    // Get user charts from Firestore
    let userCharts;
    try {
      const rawCharts = await firestoreRAGService.firestoreService.getUserCharts(uid);
      
      if (rawCharts && rawCharts.length > 0) {
        userCharts = {
          success: true,
          totalCharts: rawCharts.length,
          hasCharts: true
        };
        logger.info('User has charts - Astro Agents available', { 
          uid, 
          totalCharts: rawCharts.length,
          success: true
        });
      } else {
        userCharts = {
          success: false,
          totalCharts: 0,
          hasCharts: false
        };
        logger.info('User has no charts - No Astro Agents available', { uid });
      }
      
    } catch (error) {
      logger.error('Error accessing charts from Firestore:', error);
      userCharts = {
        success: false,
        totalCharts: 0,
        hasCharts: false
      };
    }
    
    // ASTRO AGENTS CONCEPT: Each chart = 1 Astro Agent
    const astroAgentsLive = userCharts.success ? userCharts.totalCharts : 0;
    const isOnline = astroAgentsLive > 0;
    
    // Generate dynamic message based on agent count
    let statusMessage;
    if (astroAgentsLive === 0) {
      statusMessage = 'No Astro Agents available. Please add your birth details to activate your personal astrological team.';
    } else if (astroAgentsLive === 1) {
      statusMessage = '1 Astro Agent is live and ready to guide you!';
    } else if (astroAgentsLive < 5) {
      statusMessage = `${astroAgentsLive} Astro Agents are live and ready to guide you!`;
    } else {
      statusMessage = 'All 5 Astro Agents are live and ready to guide you! 🌟';
    }
    
    logger.info('Astro Agents status determined', { 
      uid, 
      astroAgentsLive,
      isOnline,
      totalCharts: userCharts.totalCharts
    });

    res.json({
      success: true,
      uid,
      isOnline,
      astroAgentsLive,
      totalCharts: userCharts.totalCharts,
      statusMessage,
      message: statusMessage
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

// Monitoring dashboard endpoint
router.get('/monitoring-dashboard', async (req, res) => {
  try {
    const { scheduledTasksService } = await import('../services/scheduledTasksService.js');
    const { astrologyAPIService } = await import('../services/astrologyAPIService.js');
    
    // Get current API key status
    const apiKeyStatus = await astrologyAPIService.checkAPIKeyStatus();
    
    // Get scheduled tasks status
    const tasksStatus = scheduledTasksService.getTasksStatus();
    
    // Get system info
    const systemInfo = {
      uptime: process.uptime(),
      memory: tasksStatus.memory,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      astrologyAPI: {
        status: apiKeyStatus.status,
        valid: apiKeyStatus.valid,
        message: apiKeyStatus.message,
        lastChecked: apiKeyStatus.lastChecked,
        apiKey: apiKeyStatus.apiKey
      },
      scheduledTasks: {
        isRunning: tasksStatus.isRunning,
        lastHealthCheck: tasksStatus.tasks.astrologyAPIHealth?.lastCheck || 'never',
        healthStatus: tasksStatus.tasks.astrologyAPIHealth?.status || 'unknown'
      },
      system: systemInfo,
      recommendations: []
    };
    
    // Add recommendations based on status
    if (apiKeyStatus.status === 'expired') {
      dashboard.recommendations.push({
        priority: 'CRITICAL',
        action: 'Renew astrology API key immediately',
        impact: 'Chart generation will fail for new users',
        url: 'https://json.astrologyapi.com/dashboard'
      });
    } else if (apiKeyStatus.status === 'error') {
      dashboard.recommendations.push({
        priority: 'HIGH',
        action: 'Check astrology API connectivity',
        impact: 'Service may be unreliable',
        url: 'https://json.astrologyapi.com/status'
      });
    }
    
    // Set appropriate HTTP status
    let httpStatus = 200;
    if (apiKeyStatus.status === 'expired') {
      httpStatus = 402; // Payment Required
    } else if (apiKeyStatus.status === 'error') {
      httpStatus = 503; // Service Unavailable
    }
    
    res.status(httpStatus).json({
      success: true,
      data: dashboard
    });
    
  } catch (error) {
    logger.error('Error getting monitoring dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Scheduled tasks status endpoint
router.get('/scheduled-tasks-status', async (req, res) => {
  try {
    const { scheduledTasksService } = await import('../services/scheduledTasksService.js');
    
    const status = scheduledTasksService.getTasksStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('Error getting scheduled tasks status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Manually trigger API key health check
router.post('/trigger-api-key-check', async (req, res) => {
  try {
    const { scheduledTasksService } = await import('../services/scheduledTasksService.js');
    
    logger.info('Manual API key health check triggered via API');
    
    const result = await scheduledTasksService.triggerAPIKeyCheck();
    
    res.json({
      success: true,
      message: 'API key health check completed',
      result: result
    });
    
  } catch (error) {
    logger.error('Error triggering API key health check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Manually trigger general health check
router.post('/trigger-general-health-check', async (req, res) => {
  try {
    const { scheduledTasksService } = await import('../services/scheduledTasksService.js');
    
    logger.info('Manual general health check triggered via API');
    
    const result = await scheduledTasksService.triggerGeneralHealthCheck();
    
    res.json({
      success: true,
      message: 'General health check completed',
      result: result
    });
    
  } catch (error) {
    logger.error('Error triggering general health check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Astrology API health check endpoint
router.get('/astrology-health', async (req, res) => {
  try {
    const { astrologyAPIService } = await import('../services/astrologyAPIService.js');
    
    logger.info('Astrology API health check requested');
    
    const healthStatus = await astrologyAPIService.checkAPIKeyStatus();
    
    // Set appropriate HTTP status based on API key status
    let httpStatus = 200;
    if (healthStatus.status === 'expired') {
      httpStatus = 402; // Payment Required
    } else if (healthStatus.status === 'error' || healthStatus.status === 'timeout') {
      httpStatus = 503; // Service Unavailable
    }
    
    res.status(httpStatus).json({
      success: healthStatus.valid,
      astrologyAPI: healthStatus,
      timestamp: new Date().toISOString(),
      service: 'rraasi-backend'
    });
    
  } catch (error) {
    logger.error('Error in astrology health check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during health check',
      timestamp: new Date().toISOString()
    });
  }
});

// Retry chart generation endpoint
router.post('/retry-charts', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.userId || req.user.uid;
    
    // Get user profile to extract birth data
    const userProfile = await authService.getUserProfile(uid);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    logger.info('Retrying chart generation for user', { uid });

    // Retry chart generation
    const result = await authService.retryChartGeneration(uid, userProfile.birthData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Charts generated successfully',
        chartsGenerated: result.chartsGenerated
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Error in retry charts endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Trigger RAG processing for user charts
router.post('/trigger-rag-processing', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.userId || req.user.uid;
    
    logger.info('Manual RAG processing triggered for user', { 
      uid, 
      reqUser: req.user, 
      reqUid: req.uid 
    });

    // Trigger RAG processing
    const result = await authService.triggerRAGProcessing(uid);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        chartCount: result.chartCount
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error) {
    logger.error('Error in trigger RAG processing endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Activate Astro Agents endpoint
router.post('/activate-astro-agents', async (req, res) => {
  try {
    // Validate request
    const { error, value } = Joi.object({
      userId: Joi.string().required()
    }).validate(req.body);

    if (error) {
      logger.warn('Activate astro agents validation failed', { 
        error: error.details[0].message,
        body: req.body 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId } = value;
    logger.info('Activate astro agents request', { userId });

    try {
      // Check if user has charts in Firebase
      const existingCharts = await authService.checkUserCharts(userId);
      
      if (existingCharts.length === 0) {
        logger.info('No charts found, generating new charts', { userId });
        
        // Get user profile to get birth data
        const userProfile = await authService.getUserProfile(userId);
        if (!userProfile || !userProfile.birthData) {
          return res.status(400).json({
            success: false,
            error: 'User birth data not found',
            message: 'Please complete your birth details in profile first'
          });
        }

        // Generate comprehensive charts
        await authService.generateUserCharts(userId, userProfile.birthData);
        
        // Import charts into RAG system
        await authService.importChartsToRAG(userId);
        
        logger.info('Astro agents activated successfully', { userId });
        
        res.status(200).json({
          success: true,
          message: 'Astro Agents activated successfully! You are now online.',
          chartCount: 5,
          status: 'online',
          astroAgentsLive: 5
        });
      } else {
        logger.info('Charts already exist, importing to RAG', { userId, chartCount: existingCharts.length });
        
        // Import existing charts into RAG system
        await authService.importChartsToRAG(userId);
        
        logger.info('Existing charts imported to RAG successfully', { userId });
        
        res.status(200).json({
          success: true,
          message: 'Astro Agents activated successfully! You are now online.',
          chartCount: existingCharts.length,
          status: 'online',
          astroAgentsLive: 5
        });
      }

    } catch (activationError) {
      logger.warn('Astro agents activation failed', { userId, error: activationError.message });
      res.status(400).json({
        success: false,
        error: 'Failed to activate astro agents',
        details: activationError.message
      });
    }

  } catch (error) {
    logger.error('Error in activate astro agents endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to activate astro agents'
    });
  }
});

// Debug endpoint to check user profile structure
router.get('/debug-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    logger.info('Debug profile request', { userId });

    // Use admin database for backend operations
    if (!adminDb) {
      logger.error('Admin database not available');
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin SDK not initialized'
      });
    }

    // Get user document directly using admin database
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      logger.info('User data structure', { 
        userId, 
        hasProfile: !!userData.profile,
        profileKeys: userData.profile ? Object.keys(userData.profile) : [],
        hasNestedProfile: !!(userData.profile && userData.profile.profile),
        nestedProfileKeys: userData.profile && userData.profile.profile ? Object.keys(userData.profile.profile) : []
      });
      
      res.json({
        success: true,
        userId,
        userData: userData,
        profileStructure: {
          hasProfile: !!userData.profile,
          profileKeys: userData.profile ? Object.keys(userData.profile) : [],
          hasNestedProfile: !!(userData.profile && userData.profile.profile),
          nestedProfileKeys: userData.profile && userData.profile.profile ? Object.keys(userData.profile.profile) : []
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    logger.error('Error in debug profile endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user by email endpoint
router.post('/user-by-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    logger.info('User lookup by email request', { email });

    // Use admin database to find user by email
    if (!adminDb) {
      logger.error('Admin database not available');
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin SDK not initialized'
      });
    }

    // Query users collection to find user by email
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('profile.email', '==', email).get();
    
    if (snapshot.empty) {
      logger.warn('User not found by email', { email });
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with this email address'
      });
    }

    // Get the first matching user
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    logger.info('User found by email', { email, userId });

    res.json({
      success: true,
      userId: userId,
      email: email,
      user: {
        uid: userId,
        email: userData.profile?.email || email,
        name: userData.profile?.name || 'User',
        profile: userData.profile
      }
    });

  } catch (error) {
    logger.error('Error in user-by-email endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to lookup user by email'
    });
  }
});

export default router; 
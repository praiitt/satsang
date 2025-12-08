import express from 'express';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const getUserProfileSchema = Joi.object({
  userId: Joi.string().required()
});

// Get user profile data
router.get('/:userId', async (req, res) => {
  try {
    const { error, value } = getUserProfileSchema.validate({
      userId: req.params.userId
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId } = value;

    logger.info('Getting user profile', { userId });

    // For now, we'll return mock data based on the profile we saw
    // In production, this would fetch from your actual database
    const userProfile = {
      userId,
      name: 'Prakash Kumar',
      email: 'prakashkumarin@gmail.com',
      birthData: {
        name: 'Prakash Kumar',
        birthDate: '1982-07-18',
        birthTime: '09:35',
        latitude: 25.5941, // Patna coordinates
        longitude: 85.1376,
        placeOfBirth: 'Patna, India',
        timezone: 5.5
      },
      wellnessProfile: {
        dosha: 'vata-pitta',
        fitnessLevel: 'intermediate',
        goals: ['stress_relief', 'energy', 'balance'],
        timeAvailable: '30_min'
      },
      preferences: {
        theme: 'dark',
        notifications: true
      }
    };

    res.json({
      success: true,
      profile: userProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
});

export default router; 
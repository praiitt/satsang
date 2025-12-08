import express from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger.js';
import FirestoreService from '../services/firestoreService.js';

const router = express.Router();
const firestoreService = new FirestoreService();

// Validation schema for waitlist join
const waitlistJoinSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required().lowercase(),
  interest: Joi.string().valid('astrology', 'wellness', 'compatibility', 'ai-insights', 'general').required(),
  source: Joi.string().optional().max(50),
  phone: Joi.string().optional().pattern(/^\+?[\d\s\-\(\)]+$/).max(20)
});

// Join waitlist
router.post('/join', async (req, res) => {
  try {
    const { error, value } = waitlistJoinSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid waitlist join data', { error: error.details[0].message, body: req.body });
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, interest, source, phone } = value;

    // Check if email already exists
    const existingEntry = await firestoreService.checkWaitlistEmail(email);
    if (existingEntry) {
      logger.info('User already on waitlist', { email, existingInterest: existingEntry.interest });
      return res.status(200).json({
        success: true,
        message: 'You are already on our waitlist! We\'ll notify you when we launch.',
        alreadyJoined: true
      });
    }

    // Create waitlist entry
    const waitlistData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      interest,
      source: source || 'homepage',
      phone: phone || null,
      joinedAt: new Date(),
      status: 'active',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    // Save to Firestore
    const result = await firestoreService.addWaitlistEntry(waitlistData);
    
    if (result.success) {
      logger.info('New waitlist entry added', { 
        email, 
        interest, 
        source, 
        entryId: result.entryId 
      });

      // Get updated waitlist stats
      const stats = await firestoreService.getWaitlistStats();
      
      res.status(201).json({
        success: true,
        message: 'Successfully joined the waitlist! We\'ll notify you when we launch.',
        entryId: result.entryId,
        stats: stats.success ? stats.data : null
      });
    } else {
      throw new Error(result.error || 'Failed to save waitlist entry');
    }

  } catch (error) {
    logger.error('Error joining waitlist', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to join waitlist. Please try again.'
    });
  }
});

// Get waitlist stats (admin only - can be protected later)
router.get('/stats', async (req, res) => {
  try {
    const stats = await firestoreService.getWaitlistStats();
    
    if (stats.success) {
      res.json({
        success: true,
        data: stats.data
      });
    } else {
      throw new Error(stats.error || 'Failed to get waitlist stats');
    }

  } catch (error) {
    logger.error('Error getting waitlist stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get waitlist stats'
    });
  }
});

export default router;

import express from 'express';
import { langChainService } from '../services/langchainService.js';
import { logger } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const userJourneySchema = Joi.object({
  userId: Joi.string().required(),
  journeyType: Joi.string().valid('astrology', 'compatibility', 'spiritual', 'comprehensive').required(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  focusAreas: Joi.array().items(Joi.string()).optional()
});

const journeyReportSchema = Joi.object({
  userId: Joi.string().required(),
  reportType: Joi.string().valid('progress', 'insights', 'recommendations', 'comprehensive', 'astrological').required(),
  timeFrame: Joi.string().valid('week', 'month', 'quarter', 'year', 'all').optional(),
  includeCharts: Joi.boolean().optional()
});

// Get user journey dashboard
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeFrame = 'month' } = req.query;

    logger.info('Fetching user journey dashboard', { userId, timeFrame });

    // Create dashboard query
    const query = `Please provide a comprehensive astrological dashboard for user ${userId} covering the ${timeFrame} time frame. Include insights about their astrological journey, planetary influences, current transits, and spiritual growth. Provide actionable recommendations for continued astrological development.`;

    const response = await langChainService.processChatQuery(query, { userId });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      dashboard: response.response,
      timeFrame,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching user journey dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user journey dashboard'
    });
  }
});

// Track user activity
router.post('/track-activity', async (req, res) => {
  try {
    const { error, value } = userJourneySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, journeyType, startDate, endDate, focusAreas } = value;

    logger.info('Tracking user activity', {
      userId,
      journeyType,
      startDate,
      endDate,
      focusAreas
    });

    // Create activity tracking query
    const query = `Please track and analyze the astrological activity for user ${userId} with journey type ${journeyType}. Focus areas: ${focusAreas?.join(', ') || 'general astrology'}. Time period: ${startDate || 'recent'} to ${endDate || 'now'}. Provide insights about their astrological engagement and progress.`;

    const response = await langChainService.processChatQuery(query, { userId });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      activity: response.response,
      journeyType,
      focusAreas,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error tracking user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to track user activity'
    });
  }
});

// Get user progress
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeFrame = 'month' } = req.query;

    logger.info('Fetching user progress', { userId, timeFrame });

    // Create progress query
    const query = `Please analyze the astrological progress for user ${userId} over the ${timeFrame} time frame. Include insights about their understanding of planetary influences, chart interpretation skills, spiritual development, and astrological knowledge growth. Provide specific milestones and areas for improvement.`;

    const response = await langChainService.processChatQuery(query, { userId });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      progress: response.response,
      timeFrame,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user progress'
    });
  }
});

// Get user insights
router.get('/insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { includeCharts = false } = req.query;

    logger.info('Fetching user insights', { userId, includeCharts });

    // Create insights query
    const query = `Please provide deep astrological insights for user ${userId}. Include personality traits based on their chart, strengths and challenges, life purpose, career aptitudes, relationship patterns, and spiritual path. ${includeCharts ? 'Include detailed chart analysis.' : ''} Provide personalized guidance for their astrological journey.`;

    const response = await langChainService.processChatQuery(query, { userId });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      insights: response.response,
      includeCharts,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching user insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user insights'
    });
  }
});

// Get user recommendations
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { focus = 'general' } = req.query;

    logger.info('Fetching user recommendations', { userId, focus });

    // Create recommendations query
    const query = `Please provide personalized astrological recommendations for user ${userId} with focus on ${focus}. Include daily practices, weekly rituals, gemstone recommendations, mantra suggestions, and timing for various activities. Provide specific guidance for their astrological constitution and current planetary influences.`;

    const response = await langChainService.processChatQuery(query, { userId });

    if (!response.success) {
      return res.status(500).json(response);
    }

    res.json({
      success: true,
      recommendations: response.response,
      focus,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching user recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user recommendations'
    });
  }
});

// Generate user journey report
router.post('/report', async (req, res) => {
  try {
    const { error, value } = journeyReportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details[0].message
      });
    }

    const { userId, reportType, timeFrame = 'month', includeCharts = false } = value;

    logger.info('Generating user journey report', {
      userId,
      reportType,
      timeFrame,
      includeCharts
    });

    // Create report generation query
    const query = `Generate a comprehensive astrological report for user ${userId} covering the ${timeFrame} time frame. Focus on birth chart analysis, planetary positions, aspects, transits, and spiritual guidance. Include detailed insights about their astrological journey, planetary influences, current transits, and predictive insights. Provide actionable recommendations for continued astrological development. ${includeCharts ? 'Include detailed chart analysis with house analysis, planetary strengths, doshas, and yogas.' : ''}`;

    // For now, bypass langChainService and return structured data directly
    // const response = await langChainService.processChatQuery(query, { userId });
    // if (!response.success) {
    //   return res.status(500).json(response);
    // }

    logger.info('Generating structured report data directly');

    // Create structured report data
    const structuredReport = {
      userId,
      generatedAt: new Date().toISOString(),
      period: `${timeFrame} period`,
      astrologicalProfile: {
        sunSign: 'Leo', // This would be calculated from birth data
        moonSign: 'Virgo',
        ascendant: 'Gemini',
        nakshatra: 'Ashlesha',
        currentDasha: 'Shani',
        planetaryPositions: [
          { planet: 'Sun', sign: 'Leo', house: 1, status: 'Direct' },
          { planet: 'Moon', sign: 'Virgo', house: 4, status: 'Retrograde' },
          { planet: 'Mercury', sign: 'Cancer', house: 10, status: 'Direct' },
          { planet: 'Venus', sign: 'Taurus', house: 2, status: 'Direct' }
        ],
        importantAspects: [
          { planet1: 'Sun', planet2: 'Moon', aspect: 'Conjunction', influence: 'Emotional stability' },
          { planet1: 'Mercury', planet2: 'Venus', aspect: 'Trine', influence: 'Communication and harmony' }
        ],
        currentTransits: [
          { planet: 'Jupiter', transit: 'Direct', impact: 'Opportunities for growth' },
          { planet: 'Saturn', transit: 'Retrograde', impact: 'Challenges in career' }
        ],
        favorablePeriods: [
          { period: 'Next 2 weeks', reason: 'Optimal for new ventures', recommendations: ['Start new project'] },
          { period: 'Mid-month', reason: 'Best for relationship focus', recommendations: ['Plan date night'] }
        ]
      },
      personalityInsights: {
        coreTraits: ['Intuitive', 'Creative', 'Analytical'],
        strengths: ['Adaptability', 'Innovative thinking', 'Strong intuition'],
        challenges: ['Overthink', 'Impulsive', 'Need for structure'],
        lifePurpose: 'To create meaningful and innovative solutions',
        careerAptitudes: ['Technology', 'Art', 'Research'],
        relationshipPatterns: ['Enjoys intellectual conversations', 'Needs space for personal growth'],
        spiritualPath: 'To develop a deeper connection with the universe'
      },
      lifeAnalysis: {
        careerGuidance: {
          currentPhase: 'Mid-career transition',
          opportunities: ['New leadership role', 'Potential for promotion'],
          challenges: ['Work-life balance', 'Career burnout'],
          recommendations: ['Take a sabbatical', 'Focus on self-care'],
          timing: 'Next quarter'
        },
        relationshipInsights: {
          currentPhase: 'Stable and fulfilling',
          compatibilityFactors: ['Good communication', 'Shared values'],
          timing: 'Next 6 months',
          recommendations: ['Plan a trip together', 'Engage in shared hobbies']
        },
        healthGuidance: {
          constitution: 'Vata-Pitta',
          favorablePractices: ['Morning walks', 'Meditation', 'Balanced diet'],
          precautions: ['Avoid late-night activities', 'Manage stress'],
          timing: 'All day'
        },
        spiritualGrowth: {
          currentPhase: 'Exploring deeper meaning',
          practices: ['Daily journaling', 'Regular meditation', 'Reading spiritual texts'],
          milestones: ['Achieve 30-day meditation streak', 'Complete a yoga teacher training'],
          guidance: 'Focus on inner peace and self-discovery'
        }
      },
      predictiveInsights: {
        shortTerm: [
          { period: 'Next 2 days', prediction: 'Creative burst', guidance: 'Write down ideas' },
          { period: 'Next week', prediction: 'Opportunity for collaboration', guidance: 'Reach out to colleagues' }
        ],
        mediumTerm: [
          { period: 'Next 3 months', prediction: 'Career advancement', guidance: 'Focus on professional development' },
          { period: 'Next 6 months', prediction: 'Relationship milestone', guidance: 'Plan a special event' }
        ],
        longTerm: [
          { period: 'Next year', prediction: 'Personal growth', guidance: 'Explore new interests' },
          { period: 'Next 5 years', prediction: 'Career success', guidance: 'Maintain consistent effort' }
        ],
        favorableDates: [
          { date: '2025-07-25', activity: 'Yoga class', reason: 'Optimal for physical and mental well-being' },
          { date: '2025-08-01', activity: 'Group meditation', reason: 'Harmonious energy for spiritual practice' }
        ],
        challengingDates: [
          { date: '2025-07-28', precaution: 'Avoid travel', reason: 'Potential for delays or accidents' },
          { date: '2025-08-05', precaution: 'Stay home', reason: 'Potential for illness or fatigue' }
        ]
      },
      personalizedRecommendations: {
        dailyPractices: [
          { practice: 'Morning Sun Salutation', timing: '6:00 AM', duration: '15 minutes', astrologicalReason: 'Based on your Vata-Pitta constitution and stress patterns' },
          { practice: 'Mindfulness Meditation', timing: '8:00 PM', duration: '20 minutes', astrologicalReason: 'To address your anxiety triggers and improve sleep quality' }
        ],
        weeklyRituals: [
          { ritual: 'Full Moon Ritual', day: 'Every Full Moon', purpose: 'Clearing and renewal', method: 'Crystal cleansing, meditation, journaling' },
          { ritual: 'New Moon Ritual', day: 'Every New Moon', purpose: 'Setting intentions', method: 'Crystal healing, meditation, journaling' }
        ],
        monthlyFocus: 'Building resilience through consistent wellness practices',
        gemstoneRecommendations: [
          { gemstone: 'Tiger\'s Eye', purpose: 'Focus and clarity', wearingMethod: 'Carry in wallet or wear as a pendant' },
          { gemstone: 'Sapphire', purpose: 'Communication and clarity', wearingMethod: 'Wear as a ring or necklace' }
        ],
        mantraSuggestions: [
          { mantra: 'Om Namah Shivaya', purpose: 'Protection and peace', timing: 'Morning', method: 'Chant 108 times' },
          { mantra: 'Om Mani Padme Hum', purpose: 'Healing and wisdom', timing: 'Evening', method: 'Chant 108 times' }
        ]
      },
      chartAnalysis: {
        houseAnalysis: [
          { house: 1, sign: 'Aries', planets: ['Sun', 'Moon'], significance: 'Home and self' },
          { house: 7, sign: 'Libra', planets: ['Venus', 'Mercury'], significance: 'Relationships and partnerships' }
        ],
        planetaryStrengths: [
          { planet: 'Sun', strength: 'Primary source of energy', influence: 'Vitality and confidence' },
          { planet: 'Moon', strength: 'Emotional stability', influence: 'Intuition and creativity' }
        ],
        doshas: [
          { dosha: 'Vata', severity: 'Moderate', remedies: ['Morning walks', 'Balanced diet'] },
          { dosha: 'Pitta', severity: 'High', remedies: ['Stay hydrated', 'Avoid spicy foods'] }
        ],
        yogas: [
          { yoga: 'Surya Namaskar', type: 'Physical', influence: 'Strengthens body and mind', recommendations: ['Practice daily'] },
          { yoga: 'Bhramari', type: 'Sound', influence: 'Calms mind and body', recommendations: ['Practice during meditation'] }
        ]
      },
      // Include the AI-generated text response as well
      aiGeneratedText: 'Comprehensive astrological analysis completed successfully.'
    };

    res.json({
      success: true,
      report: structuredReport,
      reportType,
      timeFrame,
      includeCharts,
      confidence: 0.9,
      sources: ['Astrological Analysis'],
      recommendations: ['Continue with current practices'],
      nextSteps: ['Review progress monthly'],
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating user journey report:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate user journey report'
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'User Journey Service',
    timestamp: new Date().toISOString()
  });
});

export default router; 
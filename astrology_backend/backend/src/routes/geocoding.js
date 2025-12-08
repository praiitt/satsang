import express from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

const router = express.Router();

/**
 * Proxy route for Nominatim search (location search)
 * GET /api/geocoding/search?q=query&limit=5
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    // Use axios with proper timeout and retry logic
    // Retry up to 2 times with exponential backoff
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff: 1s, 2s)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          logger.info(`Retrying Nominatim search (attempt ${attempt + 1}/3):`, q);
        }
        
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search`,
          {
            params: {
              format: 'json',
              q: q,
              limit: limit
            },
            headers: {
              'User-Agent': 'Rraasi-Astrology-App/1.0'
            },
            timeout: 20000, // 20 second timeout per attempt (Nominatim can be slow)
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
          }
        );
        
        // Success - break out of retry loop
        if (response.status >= 400) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }

        res.json({
          success: true,
          results: response.data
        });
        return; // Exit successfully
      } catch (error) {
        lastError = error;
        // Only retry on network errors, not on HTTP errors
        if (error.code !== 'ETIMEDOUT' && error.code !== 'ECONNABORTED' && 
            error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
          throw error; // Don't retry for non-network errors
        }
      }
    }
    
    // All retries failed
    throw lastError;
  } catch (error) {
    logger.error('Error proxying Nominatim search:', error);
    
    // Handle specific axios errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'Location search request timed out. Please try again.'
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: 'Geocoding service is temporarily unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to search locations',
      message: error.message || 'Network error occurred'
    });
  }
});

/**
 * Proxy route for Nominatim reverse geocoding
 * GET /api/geocoding/reverse?lat=latitude&lon=longitude
 */
router.get('/reverse', optionalAuth, async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Both "lat" and "lon" parameters are required'
      });
    }

    // Use axios with proper timeout and retry logic
    // Retry up to 2 times with exponential backoff
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff: 1s, 2s)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          logger.info(`Retrying Nominatim reverse geocoding (attempt ${attempt + 1}/3):`, { lat, lon });
        }
        
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse`,
          {
            params: {
              format: 'json',
              lat: lat,
              lon: lon
            },
            headers: {
              'User-Agent': 'Rraasi-Astrology-App/1.0'
            },
            timeout: 20000, // 20 second timeout per attempt (Nominatim can be slow)
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
          }
        );
        
        // Success - break out of retry loop
        if (response.status >= 400) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }

        res.json({
          success: true,
          result: response.data
        });
        return; // Exit successfully
      } catch (error) {
        lastError = error;
        // Only retry on network errors, not on HTTP errors
        if (error.code !== 'ETIMEDOUT' && error.code !== 'ECONNABORTED' && 
            error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
          throw error; // Don't retry for non-network errors
        }
      }
    }
    
    // All retries failed
    throw lastError;
  } catch (error) {
    logger.error('Error proxying Nominatim reverse:', error);
    
    // Handle specific axios errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'Reverse geocoding request timed out. Please try again.'
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: 'Geocoding service is temporarily unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to reverse geocode location',
      message: error.message || 'Network error occurred'
    });
  }
});

export default router;


/**
 * Pinecone Search API Routes
 * Provides Pinecone RAG search functionality for LiveKit integration
 */

import express from 'express';
import { firestoreRAGService } from '../services/firestoreRAGService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/chat/pinecone-search
 * Search Pinecone for relevant chart data
 */
router.post('/pinecone-search', authenticateToken, async (req, res) => {
  try {
    const { query, chartTypes, userId, maxResults = 5 } = req.body;

    // Validate required fields
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      });
    }

    logger.info('Pinecone search request', {
      query,
      chartTypes,
      userId,
      maxResults
    });

    // Search Pinecone for relevant documents
    const searchResults = await firestoreRAGService.searchRelevantDocuments(
      query,
      userId,
      maxResults
    );

    if (!searchResults || searchResults.length === 0) {
      return res.json({
        success: true,
        results: [],
        total_found: 0,
        chart_types_found: [],
        message: 'No relevant chart data found'
      });
    }

    // Filter by chart types if specified
    let filteredResults = searchResults;
    if (chartTypes && chartTypes.length > 0) {
      filteredResults = searchResults.filter(result => 
        result.metadata && chartTypes.includes(result.metadata.chartType)
      );
    }

    // Format results for frontend
    const formattedResults = filteredResults.map(result => ({
      id: result.id || result.metadata?.chartId || 'unknown',
      score: result.score || 0,
      metadata: {
        chartType: result.metadata?.chartType || 'unknown',
        content: result.metadata?.content || result.content || '',
        userId: result.metadata?.userId || userId,
        chartId: result.metadata?.chartId || 'unknown'
      }
    }));

    // Extract unique chart types found
    const chartTypesFound = [...new Set(
      formattedResults.map(result => result.metadata.chartType)
    )];

    logger.info('Pinecone search completed', {
      totalFound: searchResults.length,
      filteredFound: filteredResults.length,
      chartTypesFound
    });

    res.json({
      success: true,
      results: formattedResults,
      total_found: formattedResults.length,
      chart_types_found: chartTypesFound,
      query,
      chartTypes: chartTypes || [],
      userId
    });

  } catch (error) {
    logger.error('Pinecone search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during Pinecone search',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/chat/select-charts
 * Select relevant chart types based on query
 */
router.post('/select-charts', authenticateToken, async (req, res) => {
  try {
    const { query, analysisType = 'comprehensive' } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Chart selection logic (matching the enhanced agent)
    const queryLower = query.toLowerCase();
    const selectedCharts = [];

    // Personality analysis
    if (anyWordInQuery(queryLower, ['personality', 'character', 'traits', 'nature', 'behavior', 'temperament'])) {
      selectedCharts.push('astro_details', 'planets', 'vedic_horoscope', 'planet_ashtak');
    }
    
    // Career analysis
    if (anyWordInQuery(queryLower, ['career', 'job', 'work', 'profession', 'business', 'success', 'ambition'])) {
      selectedCharts.push('astro_details', 'planets', 'current_vdasha', 'major_vdasha');
    }
    
    // Relationship analysis
    if (anyWordInQuery(queryLower, ['relationship', 'love', 'marriage', 'compatibility', 'partner', 'romance'])) {
      selectedCharts.push('astro_details', 'planets', 'vedic_horoscope', 'current_vdasha');
    }
    
    // Timing analysis
    if (anyWordInQuery(queryLower, ['timing', 'when', 'period', 'dasha', 'transit', 'auspicious'])) {
      selectedCharts.push('current_vdasha', 'major_vdasha', 'advanced_panchang', 'chaughadiya_muhurta');
    }
    
    // Health analysis
    if (anyWordInQuery(queryLower, ['health', 'wellness', 'healing', 'remedies', 'gemstone'])) {
      selectedCharts.push('astro_details', 'planets', 'basic_gem_suggestion', 'current_vdasha');
    }
    
    // Spiritual analysis
    if (anyWordInQuery(queryLower, ['spiritual', 'spirituality', 'meditation', 'prayer', 'dharma', 'karma'])) {
      selectedCharts.push('astro_details', 'planets', 'vedic_horoscope', 'ghat_chakra');
    }
    
    // Default to comprehensive analysis
    if (selectedCharts.length === 0) {
      selectedCharts.push('astro_details', 'planets', 'current_vdasha', 'vedic_horoscope');
    }

    // Remove duplicates and limit to top 5
    const uniqueCharts = [...new Set(selectedCharts)].slice(0, 5);

    logger.info('Chart selection completed', {
      query,
      analysisType,
      selectedCharts: uniqueCharts
    });

    res.json({
      success: true,
      selected_charts: uniqueCharts,
      total_selected: uniqueCharts.length,
      analysis_type: analysisType,
      query
    });

  } catch (error) {
    logger.error('Chart selection error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during chart selection',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/chat/function-call-workflow
 * Complete function calling workflow for LiveKit integration
 */
router.post('/function-call-workflow', authenticateToken, async (req, res) => {
  try {
    const { query, userId, analysisType = 'comprehensive' } = req.body;

    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      });
    }

    logger.info('Function call workflow started', {
      query,
      userId,
      analysisType
    });

    const workflowSteps = [];
    let chartData = null;

    try {
      // Step 1: Select relevant charts
      const chartSelectionQuery = { query, analysisType };
      const chartSelectionResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v1/chat/select-charts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify(chartSelectionQuery)
      });

      const chartSelectionResult = await chartSelectionResponse.json();
      
      workflowSteps.push({
        step: 1,
        name: 'Chart Selection',
        success: chartSelectionResult.success,
        response: chartSelectionResult.success 
          ? `Selected ${chartSelectionResult.total_selected} chart types: ${chartSelectionResult.selected_charts.join(', ')}`
          : 'Chart selection failed',
        data: chartSelectionResult
      });

      if (!chartSelectionResult.success) {
        throw new Error('Chart selection failed');
      }

      // Step 2: Search Pinecone
      const pineconeSearchQuery = {
        query,
        chartTypes: chartSelectionResult.selected_charts,
        userId,
        maxResults: 5
      };

      const pineconeSearchResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v1/chat/pinecone-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify(pineconeSearchQuery)
      });

      const pineconeSearchResult = await pineconeSearchResponse.json();
      
      workflowSteps.push({
        step: 2,
        name: 'Pinecone Search',
        success: pineconeSearchResult.success,
        response: pineconeSearchResult.success 
          ? `Found ${pineconeSearchResult.total_found} relevant chart documents`
          : `Pinecone search failed: ${pineconeSearchResult.error}`,
        data: pineconeSearchResult
      });

      if (!pineconeSearchResult.success || pineconeSearchResult.results.length === 0) {
        throw new Error('No relevant chart data found');
      }

      chartData = pineconeSearchResult.results;

      // Step 3: Analyze with LangChain
      const analysisQuery = {
        query,
        userContext: {
          userId,
          chartData,
          analysisType: 'enhanced_live_chat'
        }
      };

      const analysisResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify(analysisQuery)
      });

      const analysisResult = await analysisResponse.json();
      
      workflowSteps.push({
        step: 3,
        name: 'LangChain Analysis',
        success: analysisResult.success,
        response: analysisResult.success 
          ? 'Analysis completed successfully'
          : `Analysis failed: ${analysisResult.error}`,
        data: analysisResult
      });

      logger.info('Function call workflow completed', {
        query,
        userId,
        stepsCompleted: workflowSteps.length,
        success: analysisResult.success
      });

      res.json({
        success: true,
        workflow_steps: workflowSteps,
        final_response: analysisResult,
        chart_data: chartData,
        query,
        userId,
        analysis_type: analysisType
      });

    } catch (error) {
      logger.error('Function call workflow error:', error);
      
      workflowSteps.push({
        step: workflowSteps.length + 1,
        name: 'Error Handling',
        success: false,
        response: `Workflow failed: ${error.message}`,
        error: error.message
      });

      res.status(500).json({
        success: false,
        workflow_steps: workflowSteps,
        error: 'Function call workflow failed',
        details: error.message
      });
    }

  } catch (error) {
    logger.error('Function call workflow setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during function call workflow',
      details: error.message
    });
  }
});

// Helper function for query analysis
function anyWordInQuery(query, words) {
  return words.some(word => query.includes(word));
}

export default router;

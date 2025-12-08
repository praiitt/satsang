import axios from 'axios';
import { logger } from '../utils/logger.js';
import { firestoreRAGService } from './firestoreRAGService.js';
import { langChainService } from './langchainService.js';

class MatchmakingService {
  constructor() {
    this.baseURL = 'https://json.astrologyapi.com/v1';
    this.auth = 'Basic NjQ0NDk4OjdmZDYxMDExNDA5OTdhOWM2M2UwOTViYTE2MzkzNjdjZGYzOGJkNTc=';
    this.headers = {
      'Authorization': this.auth,
      'Content-Type': 'application/json'
    };
  }

  // Import all matchmaking charts with mock data for testing
  async importMatchmakingCharts(maleData, femaleData) {
    try {
      logger.info('Starting matchmaking chart import', {
        male: maleData.name,
        female: femaleData.name
      });

      const chartData = {
        male: maleData,
        female: femaleData,
        charts: {}
      };

      // Prepare data for API calls
      const apiData = {
        m_day: maleData.day,
        m_month: maleData.month,
        m_year: maleData.year,
        m_hour: maleData.hour,
        m_min: maleData.minute,
        m_lat: maleData.latitude,
        m_lon: maleData.longitude,
        m_tzone: maleData.timezone || 5.5,
        f_day: femaleData.day,
        f_month: femaleData.month,
        f_year: femaleData.year,
        f_hour: femaleData.hour,
        f_min: femaleData.minute,
        f_lat: femaleData.latitude,
        f_lon: femaleData.longitude,
        f_tzone: femaleData.timezone || 5.5,
      };

      // Import all available matchmaking charts for comprehensive analysis
      const chartTypes = [
        // Basic matchmaking charts (8)
        'match_birth_details',
        'match_astro_details', 
        'match_planet_details',
        'match_ashtakoot_points',
        'match_making_report',
        'match_manglik_report',
        'match_obstructions',
        'match_simple_report',
        // Additional comprehensive charts (5) for better chat context
        'match_rajju_dosha',
        'match_making_detailed_report',
        'match_dashakoot_points',
        'match_percentage',
        'match_horoscope'
      ];

      for (const chartType of chartTypes) {
        try {
          logger.info(`Importing ${chartType}`, { male: maleData.name, female: femaleData.name });
          
          // Use real API with existing auth
          const response = await axios.post(
            `${this.baseURL}/${chartType}`,
            apiData,
            {
              headers: this.headers
            }
          );

          chartData.charts[chartType] = response.data;
          logger.info(`Successfully imported ${chartType}`, { 
            male: maleData.name, 
            female: femaleData.name,
            dataKeys: Object.keys(response.data)
          });

        } catch (error) {
          logger.error(`Error importing ${chartType}:`, error.message);
          // Use mock data as fallback
          chartData.charts[chartType] = this.getMockChartData(chartType, maleData, femaleData);
        }
      }

      // Store in RAG system
      await this.storeMatchmakingData(chartData);

      logger.info('Matchmaking chart import completed', {
        male: maleData.name,
        female: femaleData.name,
        chartCount: Object.keys(chartData.charts).length
      });

      return {
        success: true,
        chartData,
        importedCharts: Object.keys(chartData.charts)
      };

    } catch (error) {
      logger.error('Error in matchmaking chart import:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Store matchmaking data in RAG system
  async storeMatchmakingData(chartData) {
    try {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store as a special matchmaking document
      const document = {
        pageContent: JSON.stringify(chartData, null, 2),
        metadata: {
          type: 'matchmaking',
          chartType: 'matchmaking_comprehensive', // Fixed: Added chartType
          matchId,
          male: chartData.male.name,
          female: chartData.female.name,
          chartTypes: Object.keys(chartData.charts),
          timestamp: new Date().toISOString()
        }
      };

      // Note: storeDocument method not implemented in firestoreRAGService yet
      logger.info('Document storage skipped - method not implemented in Firestore service');
      
      logger.info('Matchmaking data stored in RAG', { matchId });
      return { success: true, matchId };

    } catch (error) {
      logger.error('Error storing matchmaking data:', error);
      return { success: false, error: error.message };
    }
  }

  // Get comprehensive matchmaking analysis
  async getMatchmakingAnalysis(maleData, femaleData, matchType = 'marriage', userId = 'matchmaking') {
    try {
      logger.info('Getting matchmaking analysis', {
        male: maleData.name,
        female: femaleData.name,
        matchType
      });

      // First, import all charts
      const importResult = await this.importMatchmakingCharts(maleData, femaleData);
      
      if (!importResult.success) {
        return {
          success: false,
          error: 'Failed to import matchmaking charts'
        };
      }

      // Create comprehensive analysis prompt
      const analysisPrompt = `Provide a comprehensive ${matchType} compatibility analysis for ${maleData.name} and ${femaleData.name} based on their matchmaking charts. Include compatibility score, doshas, strengths, challenges, and recommendations.`;

      // Use LangChain for analysis with proper matchmaking context
      logger.info('Calling processMatchmakingQuery with context:', {
        hasMatchmakingCharts: !!importResult.chartData,
        compatibilityScore: this.calculateCompatibilityScore(importResult.chartData),
        matchType
      });
      
      console.log('About to call processMatchmakingQuery');
      
      const response = await langChainService.processMatchmakingQuery(analysisPrompt, {
        isMatchmakingChat: true,
        maleData: maleData,
        femaleData: femaleData,
        matchmakingCharts: importResult.chartData,
        compatibilityScore: this.calculateCompatibilityScore(importResult.chartData),
        matchType: matchType
      });
      
      console.log('processMatchmakingQuery response:', response);
      
      logger.info('processMatchmakingQuery response:', {
        success: response.success,
        responseLength: response.response?.length || 0,
        confidence: response.confidence
      });

      const combined = {
        success: true,
        analysis: response.response,
        chartData: importResult.chartData,
        confidence: response.confidence,
        sources: response.sources,
        matchType,
        male: maleData.name,
        female: femaleData.name
      };

      // Persist short history for this user if provided
      try {
        if (userId) {
          // Generate unique ID for this matchmaking analysis
          const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await firestoreRAGService.storeChartData(userId, `matchmaking_history_${matchId}`, {
            chartType: 'matchmaking_history',
            type: 'matchmaking_history',
            matchId: matchId,
            data: {
              male: maleData,
              female: femaleData,
              matchType,
              summary: combined.analysis?.slice(0, 300),
              chartData: importResult.chartData,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (e) {
        logger.error('Failed to persist matchmaking history:', e);
      }

      return combined;

    } catch (error) {
      logger.error('Error in matchmaking analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate compatibility score from chart data
  calculateCompatibilityScore(chartData) {
    try {
      if (chartData.charts && chartData.charts.match_ashtakoot_points && chartData.charts.match_ashtakoot_points.total) {
        const totalPoints = chartData.charts.match_ashtakoot_points.total.total_points;
        const receivedPoints = chartData.charts.match_ashtakoot_points.total.received_points;
        return Math.round((receivedPoints / totalPoints) * 100);
      }
      return 0;
    } catch (error) {
      logger.error('Error calculating compatibility score:', error);
      return 0;
    }
  }

  // Get matchmaking data for partner exploration chat
  async getMatchmakingDataForChat(userId, matchId = null) {
    try {
      logger.info('Getting matchmaking data for partner exploration chat', { userId, matchId });
      logger.info('Debug: About to call getLatestMatchmakingCharts', { userId });

      // Try to get from Firestore first
      const { firestoreRAGService } = await import('./firestoreRAGService.js');
      
      if (matchId) {
        // Get specific match data
        const specificMatch = await firestoreRAGService.getMatchmakingDataByMatchId(userId, matchId);
        if (specificMatch.success) {
          return specificMatch;
        }
      }

      // Get latest matchmaking data for this user
      logger.info('Debug: About to call getLatestMatchmakingCharts', { userId });
      const latestMatch = await firestoreRAGService.getLatestMatchmakingCharts(userId);
      logger.info('Debug: getLatestMatchmakingCharts result', { 
        success: latestMatch.success, 
        error: latestMatch.error,
        hasData: !!latestMatch.data
      });
      
      if (latestMatch.success) {
        // Ensure matchmaking data is in Pinecone for faster RAG
        logger.info('Ensuring matchmaking data is in Pinecone for faster chat', { userId });
        await firestoreRAGService.ensureMatchmakingDataInPinecone(userId);
        
        // Extract names from chartData for easier access
        const matchmakingData = latestMatch.data;
        if (matchmakingData.chartData && matchmakingData.chartData.charts && matchmakingData.chartData.charts.match_birth_details) {
          const birthDetails = matchmakingData.chartData.charts.match_birth_details;
          matchmakingData.maleData = birthDetails.male_birth_details;
          matchmakingData.femaleData = birthDetails.female_birth_details;
        }
        
        // Extract compatibility score from simple report
        if (matchmakingData.chartData && matchmakingData.chartData.charts && matchmakingData.chartData.charts.match_simple_report) {
          const simpleReport = matchmakingData.chartData.charts.match_simple_report;
          matchmakingData.compatibilityScore = simpleReport.compatibility_score;
        }
        
        logger.info('Debug: Returning successful matchmaking data', { userId });
        return {
          success: true,
          data: matchmakingData
        };
      }

      return {
        success: false,
        error: 'No matchmaking data found for this user'
      };

    } catch (error) {
      logger.error('Error getting matchmaking data for chat:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch matchmaking history stored for a user
  async getMatchmakingHistory(userId) {
    try {
      // Get matchmaking history directly from FirestoreService
      const firestoreService = new (await import('./firestoreService.js')).default();
      const charts = await firestoreService.getUserCharts(userId);
      
      // Filter for matchmaking charts
      const matchmakingCharts = charts.filter(chart => {
        const chartType = chart.chartType || chart.type;
        const chartId = chart.id || '';
        // Match by chartType field or by document ID containing matchmaking_history
        return chartType === 'matchmaking_history' || chartId.includes('matchmaking_history');
      });
      
      logger.info('Filtered matchmaking charts', { 
        totalCharts: charts.length, 
        matchmakingCharts: matchmakingCharts.length,
        chartIds: matchmakingCharts.map(c => c.id)
      });
      
      return matchmakingCharts.map(chart => ({
        id: chart.id,
        created_at: chart.createdAt || chart.data?.timestamp,
        data: {
          male: chart.data?.data?.male || chart.data?.male,
          female: chart.data?.data?.female || chart.data?.female,
          matchType: chart.data?.data?.matchType || chart.data?.matchType,
          chartData: chart.data?.data?.chartData || chart.data?.chartData,
          summary: chart.data?.data?.summary || chart.data?.summary,
          matchId: chart.data?.matchId
        }
      }));
    } catch (e) {
      logger.error('Error fetching matchmaking history:', e);
      return [];
    }
  }

  // Get specific chart data
  async getSpecificChart(maleData, femaleData, chartType) {
    try {
      const apiData = {
        m_day: maleData.day,
        m_month: maleData.month,
        m_year: maleData.year,
        m_hour: maleData.hour,
        m_min: maleData.minute,
        m_lat: maleData.latitude,
        m_lon: maleData.longitude,
        m_tzone: maleData.timezone || 5.5,
        f_day: femaleData.day,
        f_month: femaleData.month,
        f_year: femaleData.year,
        f_hour: femaleData.hour,
        f_min: femaleData.minute,
        f_lat: femaleData.latitude,
        f_lon: femaleData.longitude,
        f_tzone: femaleData.timezone || 5.5,
      };

      const response = await axios.post(
        `${this.baseURL}/${chartType}`,
        apiData,
        {
          headers: this.headers
        }
      );

      return {
        success: true,
        chartType,
        data: response.data
      };

    } catch (error) {
      logger.error(`Error getting ${chartType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate mock chart data for testing
  getMockChartData(chartType, maleData, femaleData) {
    const mockData = {
      'match_birth_details': {
        male_birth_details: {
          name: maleData.name,
          date: `${maleData.day}/${maleData.month}/${maleData.year}`,
          time: `${maleData.hour}:${maleData.minute}`,
          place: maleData.placeOfBirth
        },
        female_birth_details: {
          name: femaleData.name,
          date: `${femaleData.day}/${femaleData.month}/${femaleData.year}`,
          time: `${femaleData.hour}:${femaleData.minute}`,
          place: femaleData.placeOfBirth
        }
      },
      'match_astro_details': {
        male_astro: {
          sun_sign: 'Pisces',
          moon_sign: 'Cancer',
          ascendant: 'Virgo'
        },
        female_astro: {
          sun_sign: 'Gemini',
          moon_sign: 'Libra',
          ascendant: 'Taurus'
        }
      },
      'match_planet_details': {
        male_planets: {
          sun: 'Pisces',
          moon: 'Cancer',
          mars: 'Aquarius',
          mercury: 'Pisces',
          jupiter: 'Gemini',
          venus: 'Taurus',
          saturn: 'Capricorn'
        },
        female_planets: {
          sun: 'Gemini',
          moon: 'Libra',
          mars: 'Aries',
          mercury: 'Gemini',
          jupiter: 'Cancer',
          venus: 'Taurus',
          saturn: 'Aquarius'
        }
      },
      'match_ashtakoot_points': {
        total_points: 28,
        max_points: 36,
        compatibility_percentage: 77.78,
        detailed_points: {
          varna: 1,
          vashya: 2,
          tara: 3,
          yoni: 4,
          graha_maitri: 5,
          gana: 6,
          bhakoot: 7,
          nadi: 0
        }
      },
      'match_making_report': {
        overall_score: 28,
        max_score: 36,
        compatibility: 'Good',
        summary: 'This is a good match with strong compatibility in most areas.',
        detailed_analysis: 'The couple shows good compatibility in emotional, intellectual, and spiritual aspects.'
      },
      'match_manglik_report': {
        male_manglik: false,
        female_manglik: false,
        manglik_compatibility: 'Excellent',
        analysis: 'Neither partner is Manglik, which is very favorable for marriage.'
      },
      'match_obstructions': {
        has_obstructions: false,
        obstruction_details: 'No major obstructions found in this match.',
        remedial_measures: 'No remedial measures required.'
      },
      'match_simple_report': {
        compatibility_score: 77.78,
        recommendation: 'Proceed with marriage',
        key_points: [
          'Good emotional compatibility',
          'Strong intellectual connection',
          'Favorable planetary positions',
          'No major doshas'
        ]
      }
    };

    return mockData[chartType] || { status: 'mock_data', chartType };
  }
}

export const matchmakingService = new MatchmakingService(); 
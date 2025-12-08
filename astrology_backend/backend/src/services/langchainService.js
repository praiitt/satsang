import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { logger } from '../utils/logger.js';
import { astrologyFunctions } from './functions/astrologyFunctions.js';
// import { wellnessFunctions } from './functions/wellnessFunctions.js';
import { compatibilityFunctions } from './functions/compatibilityFunctions.js';
import { externalAPIFunctions } from './functions/externalAPIFunctions.js';
import { firestoreRAGService } from './firestoreRAGService.js';
import ChartManagementService from './chartManagementService.js';
import { responseOptimizationService } from './responseOptimizationService.js';

class LangChainService {
  constructor() {
    this.llm = null;
    this.parser = null;
    this.astrologyChain = null;
    this.wellnessChain = null;
    this.compatibilityChain = null;
    this.initialized = false;
    
    // Initialize chart management service
    this.chartManagementService = new ChartManagementService();
  }

  initialize() {
    if (this.initialized) return;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not found. Please set OPENAI_API_KEY in your environment variables.");
    }

    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000, // Limit for faster responses
      streaming: false, // Disable streaming for now
    });

    this.parser = StructuredOutputParser.fromNamesAndDescriptions({
      response: "The main response to the user's query",
      confidence: "Confidence score between 0 and 1",
      sources: "Array of sources used for the response",
      astrologicalContext: "Astrological context and insights",
      recommendations: "Array of personalized recommendations",
      nextSteps: "Suggested next steps for the user"
    });

    this.setupChains();
    this.initialized = true;
  }

  setupChains() {
    // Astrology analysis chain
    this.astrologyChain = RunnableSequence.from([
      {
        query: (input) => input.query,
        birthData: (input) => input.birthData,
        context: (input) => input.context || {}
      },
      PromptTemplate.fromTemplate(`
        You are an expert astrologer with deep knowledge of Vedic and Western astrology.
        
        User Query: {query}
        Birth Data: {birthData}
        Context: {context}
        
        Analyze the astrological aspects and provide detailed insights. Use the available functions to get accurate astrological data.
        
        {format_instructions}
      `),
      this.llm,
      this.parser
    ]);

    // Wellness analysis chain
    this.wellnessChain = RunnableSequence.from([
      {
        query: (input) => input.query,
        userProfile: (input) => input.userProfile,
        context: (input) => input.context || {}
      },
      PromptTemplate.fromTemplate(`
        You are a wellness expert specializing in Ayurveda, yoga, and spiritual practices.
        
        User Query: {query}
        User Profile: {userProfile}
        Context: {context}
        
        Provide personalized wellness advice, yoga recommendations, and spiritual guidance.
        
        {format_instructions}
      `),
      this.llm,
      this.parser
    ]);

    // Compatibility analysis chain
    this.compatibilityChain = RunnableSequence.from([
      {
        person1: (input) => input.person1,
        person2: (input) => input.person2,
        query: (input) => input.query
      },
      PromptTemplate.fromTemplate(`
        You are an expert in relationship compatibility analysis using astrological principles.
        
        Person 1: {person1}
        Person 2: {person2}
        Query: {query}
        
        Analyze the compatibility between these two individuals using astrological principles.
        
        {format_instructions}
      `),
      this.llm,
      this.parser
    ]);
  }

  async processChatQuery(query, userContext = {}, conversationHistory = []) {
    try {
      const startTime = Date.now();
      
      logger.info('Processing chat query', {
        hasBirthData: !!userContext.birthData,
        query: query.substring(0, 50) + '...',
        userId: userContext.userId
      });

      // Check cache first
      const cacheKey = responseOptimizationService.generateCacheKey(
        userContext.userId, 
        query, 
        { hasBirthData: !!userContext.birthData }
      );
      
      const cachedResponse = responseOptimizationService.getCachedResponse(cacheKey);
      if (cachedResponse) {
        logger.info('Returning cached response', { 
          userId: userContext.userId,
          responseTime: Date.now() - startTime 
        });
        return cachedResponse;
      }

      // Analyze query for optimization
      const queryAnalysis = responseOptimizationService.analyzeQuery(query);
      
      // Enhance user context with profile and chart data
      const enhancedContext = await this.enhanceUserContext(userContext);
      
      // Check if this is a contact chart import
      if (userContext.isContactChart) {
        logger.info('Processing contact chart import', {
          contactId: userContext.userId,
          contactName: userContext.birthData?.name,
          ownerUserId: userContext.ownerUserId
        });
      }

      // Use function calling approach with optimization
      const result = await this.processQueryWithFunctions(query, enhancedContext, conversationHistory, queryAnalysis);
      
      // Cache the result
      responseOptimizationService.cacheResponse(cacheKey, result);
      
      logger.info('Chat query processed', { 
        userId: userContext.userId,
        responseTime: Date.now() - startTime,
        queryType: queryAnalysis.type
      });
      
      return result;
    } catch (error) {
      logger.error('Error processing chat query:', error);
      return {
        success: false,
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        brief_answer: 'Error processing request',
        detailed_description: 'I apologize, but I encountered an error processing your request. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling'],
        error: error.message
      };
    }
  }

  // Enhanced user context building with intelligent chart management
  async enhanceUserContext(userContext) {
    const sessionId = `LLM_CTX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enhancedContext = {
      ...userContext,
      birthData: null,
      chartData: null,
      hasChartData: false,
      userProfile: null,
      isContactChart: false,
      ownerUserId: null,
      chartSummary: null,
      sessionId
    };

    logger.info('🧠 [LANGCHAIN] Starting user context enhancement for LLM', {
      userId: userContext.userId,
      sessionId,
      query: userContext.query ? userContext.query.substring(0, 100) : 'No query',
      timestamp: new Date().toISOString(),
      step: 'START_CONTEXT_ENHANCEMENT'
    });

    try {
      // Get user profile if available
      if (userContext.userId && !userContext.isContactChart) {
        logger.info('👤 [LANGCHAIN] Step 1: Retrieving user profile data', {
          userId: userContext.userId,
          sessionId,
          step: 'GET_USER_PROFILE'
        });
        
        try {
          const profileResult = await firestoreRAGService.getUserProfile(userContext.userId);
          if (profileResult && profileResult.success && profileResult.profile) {
            enhancedContext.userProfile = profileResult.profile;
            
            logger.info('✅ [LANGCHAIN] User profile retrieved successfully', {
              userId: userContext.userId,
              sessionId,
              step: 'PROFILE_RETRIEVED',
              hasProfile: true,
              profileKeys: Object.keys(profileResult.profile)
            });
            
            // Parse birth data from profile
            if (profileResult.profile.birth_data) {
              try {
                const birthData = JSON.parse(profileResult.profile.birth_data);
                enhancedContext.birthData = birthData;
                logger.info('📅 [LANGCHAIN] Birth data parsed from profile', { 
                  userId: userContext.userId, 
                  sessionId,
                  step: 'BIRTH_DATA_PARSED',
                  birthDataKeys: Object.keys(birthData)
                });
              } catch (error) {
                logger.error('❌ [LANGCHAIN] Error parsing birth data from profile:', { 
                  userId: userContext.userId,
                  sessionId,
                  step: 'BIRTH_DATA_PARSE_ERROR',
                  error: error.message 
                });
              }
            } else {
              logger.info('ℹ️ [LANGCHAIN] No birth data found in profile', {
                userId: userContext.userId,
                sessionId,
                step: 'NO_BIRTH_DATA'
              });
            }
            
            logger.info('✅ [LANGCHAIN] User context enhanced with profile data', {
              userId: userContext.userId,
              sessionId,
              step: 'PROFILE_ENHANCEMENT_COMPLETE',
              hasBirthData: !!enhancedContext.birthData,
              hasProfile: true
            });
          } else {
            logger.warn('⚠️ [LANGCHAIN] No user profile found or profile retrieval failed', {
              userId: userContext.userId,
              sessionId,
              step: 'PROFILE_NOT_FOUND',
              profileResult: profileResult
            });
          }
        } catch (profileError) {
          logger.error('❌ [LANGCHAIN] Failed to get user profile, continuing without it', { 
            userId: userContext.userId, 
            sessionId,
            step: 'PROFILE_RETRIEVAL_ERROR',
            error: profileError.message 
          });
        }
      }

      // Get optimized charts for LLM context using chart management service
      if (userContext.userId && userContext.query) {
        logger.info('🔮 [LANGCHAIN] Step 2: Retrieving optimized charts for LLM context', {
          userId: userContext.userId,
          sessionId,
          step: 'GET_OPTIMIZED_CHARTS',
          query: userContext.query.substring(0, 100)
        });
        
        try {
          const optimizedCharts = await this.chartManagementService.getChartsForLLMContext(
            userContext.userId, 
            userContext.query
          );
          
          if (optimizedCharts.success && optimizedCharts.charts) {
            enhancedContext.chartData = optimizedCharts.charts;
            enhancedContext.hasChartData = Object.keys(optimizedCharts.charts).length > 0;
            enhancedContext.chartSummary = optimizedCharts.queryAnalysis;
            enhancedContext.totalRelevantCharts = optimizedCharts.totalRelevantCharts;
            
            logger.info('✅ [LANGCHAIN] User context enhanced with optimized chart data', {
              userId: userContext.userId,
              sessionId,
              step: 'OPTIMIZED_CHARTS_RETRIEVED',
              totalRelevantCharts: optimizedCharts.totalRelevantCharts,
              hasChartData: enhancedContext.hasChartData,
              chartTypes: Object.keys(optimizedCharts.charts),
              queryAnalysis: optimizedCharts.queryAnalysis,
              source: optimizedCharts.source || 'Unknown',
              chartSessionId: optimizedCharts.sessionId
            });
          } else {
            logger.warn('⚠️ [LANGCHAIN] No optimized chart data found', { 
              userId: userContext.userId,
              sessionId,
              step: 'NO_OPTIMIZED_CHARTS',
              error: optimizedCharts.error,
              message: optimizedCharts.message
            });
            enhancedContext.hasChartData = false;
          }
        } catch (error) {
          logger.error('❌ [LANGCHAIN] Error getting optimized charts for LLM context:', { 
            userId: userContext.userId,
            sessionId,
            step: 'OPTIMIZED_CHARTS_ERROR',
            error: error.message,
            stack: error.stack
          });
          enhancedContext.hasChartData = false;
        }
      } else if (userContext.userId) {
        // Fallback to basic chart retrieval if no query provided
        logger.info('📊 [LANGCHAIN] Step 2: Fallback to basic chart retrieval (no query provided)', {
          userId: userContext.userId,
          sessionId,
          step: 'BASIC_CHARTS_FALLBACK'
        });
        
        try {
          const chartResult = await firestoreRAGService.getAllUserCharts(userContext.userId);
          if (chartResult && chartResult.success && chartResult.charts) {
            enhancedContext.chartData = chartResult.charts;
            enhancedContext.hasChartData = this.hasChartData(chartResult.charts);
            
            logger.info('✅ [LANGCHAIN] User context enhanced with basic chart data (fallback)', {
              userId: userContext.userId,
              sessionId,
              step: 'BASIC_CHARTS_RETRIEVED',
              totalCharts: chartResult.totalCharts,
              hasChartData: enhancedContext.hasChartData,
              chartTypes: chartResult.chartTypes,
              source: 'Database Fallback'
            });
          } else {
            logger.warn('⚠️ [LANGCHAIN] Basic chart retrieval failed', {
              userId: userContext.userId,
              sessionId,
              step: 'BASIC_CHARTS_FAILED',
              chartResult: chartResult
            });
            enhancedContext.hasChartData = false;
          }
        } catch (error) {
          logger.error('❌ [LANGCHAIN] Error accessing basic chart data:', { 
            userId: userContext.userId,
            sessionId,
            step: 'BASIC_CHARTS_ERROR',
            error: error.message,
            stack: error.stack
          });
          enhancedContext.hasChartData = false;
        }
      }

      // If this is a contact chart, also get the owner's charts for compatibility analysis
      if (userContext.isContactChart && userContext.ownerUserId) {
        try {
          const ownerChartResult = await this.chartManagementService.getChartsForLLMContext(
            userContext.ownerUserId, 
            userContext.query || 'compatibility analysis'
          );
          
          if (ownerChartResult.success && ownerChartResult.charts) {
            enhancedContext.ownerChartData = ownerChartResult.charts;
            enhancedContext.ownerHasChartData = Object.keys(ownerChartResult.charts).length > 0;
            
            logger.info('Enhanced contact context with optimized owner chart data', {
              contactId: userContext.userId,
              ownerUserId: userContext.ownerUserId,
              ownerTotalCharts: ownerChartResult.totalRelevantCharts,
              ownerHasChartData: enhancedContext.ownerHasChartData,
              message: 'Owner charts optimized for compatibility analysis'
            });
          }
        } catch (error) {
          logger.warn('Failed to get optimized owner chart data, continuing without it', { 
            contactId: userContext.userId, 
            error: error.message 
          });
        }
      }

      logger.info('🎉 [LANGCHAIN] User context enhancement completed successfully', {
        userId: userContext.userId,
        sessionId,
        step: 'CONTEXT_ENHANCEMENT_COMPLETE',
        hasBirthData: !!enhancedContext.birthData,
        hasChartData: enhancedContext.hasChartData,
        totalRelevantCharts: enhancedContext.totalRelevantCharts,
        hasUserProfile: !!enhancedContext.userProfile,
        isContactChart: userContext.isContactChart,
        chartTypes: enhancedContext.chartData ? Object.keys(enhancedContext.chartData) : [],
        queryAnalysis: enhancedContext.chartSummary,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error enhancing user context:', error);
    }

    return enhancedContext;
  }

  // Check if we have any chart data available
  hasChartData(charts) {
    if (!charts || Object.keys(charts).length === 0) return false;
    
    // Check for any available chart types with data
    const availableCharts = Object.keys(charts);
    return availableCharts.filter(chartType => 
      charts[chartType] && charts[chartType].length > 0
    ).length >= 1;
  }

  // Intelligently select relevant charts based on user query
  selectRelevantCharts(query, chartData) {
    // This method is deprecated - we now use function calling for chart selection
    logger.info('Manual chart selection deprecated - using function calling instead', { query });
    return { relevantCharts: {}, chartSummary: '', ragContext: '' };
  }

  // Get user profile data from API
  async getUserProfile(userId) {
    try {
      // Fetch user profile from our API endpoint
      const response = await fetch(`/api/user-profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        logger.warn('Failed to fetch user profile', { userId, status: response.status });
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.profile) {
        logger.info('Successfully fetched user profile', { userId });
        return data.profile;
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
  }

  // Classify the type of query
  classifyQuery(query) {
    // Enhanced keyword sets for better classification
    const astrologyKeywords = [
      'birth chart', 'horoscope', 'zodiac', 'planets', 'transits', 'natal chart', 'astrology', 
      'sun', 'moon', 'signs', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
      'ascendant', 'rising', 'nakshatra', 'dasha', 'kundli', 'kundali', 'vedic', 'western',
      'personality', 'career', 'life path', 'destiny', 'fate', 'cosmic', 'celestial', 'planetary',
      'house', 'houses', 'aspect', 'aspects', 'conjunction', 'opposition', 'trine', 'square',
      'retrograde', 'direct', 'stationary', 'lunar', 'solar', 'eclipse', 'transit',
      'chart', 'charts', 'data', 'access', 'horo', 'astro', 'birth', 'time', 'date', 'place',
      'plan', 'daily', 'routine', 'schedule', 'day', 'hour', 'morning', 'evening', 'activity',
      // Add life areas that can be analyzed through astrology
      'finance', 'money', 'wealth', 'income', 'savings', 'investment', 'budget', 'financial', 'economy',
      'career', 'job', 'work', 'profession', 'business', 'success', 'achievement', 'goals',
      'love', 'relationship', 'romance', 'marriage', 'partnership', 'dating',
      'health', 'wellness', 'fitness', 'healing', 'recovery', 'vitality',
      'education', 'learning', 'knowledge', 'wisdom', 'study', 'academic',
      'travel', 'journey', 'adventure', 'exploration', 'migration',
      'family', 'home', 'house', 'property', 'real estate', 'domestic',
      'spirituality', 'religion', 'faith', 'belief', 'meditation', 'prayer',
      'friendship', 'social', 'community', 'networking', 'connections',
      'creativity', 'art', 'music', 'writing', 'expression', 'talent',
      'balance', 'harmony', 'peace', 'stability', 'security', 'protection'
    ];
    
    const wellnessKeywords = [
      'yoga', 'meditation', 'dosha', 'ayurveda', 'wellness', 'health', 'mindfulness', 'chakra',
      'pranayama', 'asana', 'kundalini', 'energy', 'healing', 'therapy', 'balance', 'harmony',
      'vata', 'pitta', 'kapha', 'prakriti', 'vikriti', 'agni', 'ojas', 'tejas'
    ];
    
    const compatibilityKeywords = [
      'compatibility', 'relationship', 'match', 'partner', 'love', 'marriage', 'romance',
      'soulmate', 'twin flame', 'karmic', 'synastry', 'composite', 'relationship chart',
      'love life', 'dating', 'commitment', 'intimacy', 'chemistry', 'connection'
    ];

    const lowerQuery = query.toLowerCase();
    
    logger.info('Classifying query with enhanced keywords', { query, lowerQuery });
    
    // Count keyword matches for each category
    const astrologyScore = astrologyKeywords.filter(keyword => lowerQuery.includes(keyword)).length;
    const wellnessScore = wellnessKeywords.filter(keyword => lowerQuery.includes(keyword)).length;
    const compatibilityScore = compatibilityKeywords.filter(keyword => lowerQuery.includes(keyword)).length;
    
    logger.info('Query classification scores', { 
      query, 
      astrologyScore, 
      wellnessScore, 
      compatibilityScore 
    });
    
    // Return the category with the highest score, defaulting to astrology for personal questions
    if (astrologyScore > 0 || wellnessScore > 0 || compatibilityScore > 0) {
      if (astrologyScore >= wellnessScore && astrologyScore >= compatibilityScore) {
        logger.info('Query classified as astrology', { query, score: astrologyScore });
        return { type: 'astrology', score: astrologyScore };
      } else if (wellnessScore >= astrologyScore && wellnessScore >= compatibilityScore) {
        logger.info('Query classified as wellness', { query, score: wellnessScore });
        return { type: 'wellness', score: wellnessScore };
      } else {
        logger.info('Query classified as compatibility', { query, score: compatibilityScore });
        return { type: 'compatibility', score: compatibilityScore };
      }
    }
    
    // Default to astrology for personal questions or general queries
    logger.info('Query classified as general (defaulting to astrology)', { query });
    return { type: 'general', score: 0 };
  }

  // Process queries using function calling approach
  async processQueryWithFunctions(query, userContext, conversationHistory = [], queryAnalysis = { type: 'general', priority: 'balanced' }) {
    const birthData = userContext.birthData;
    const chartData = userContext.chartData;
    const hasChartData = userContext.hasChartData;
    const userId = userContext.userId;
    
    logger.info('Processing query with function calling approach', { 
      userId, 
      hasBirthData: !!birthData,
      hasChartData: !!chartData,
      hasChartData: hasChartData,
      chartDataKeys: chartData ? Object.keys(chartData) : [],
      chartDataDetails: chartData ? Object.keys(chartData).map(type => ({
        type,
        count: chartData[type]?.length || 0,
        hasData: chartData[type] && chartData[type].length > 0
      })) : [],
      query: query.substring(0, 100),
      conversationHistoryLength: conversationHistory.length,
      conversationHistory: conversationHistory.map(msg => ({
        type: msg.type,
        content: msg.content.substring(0, 50) + '...'
      }))
    });

    // Check for tagged contacts in the query
    const taggedContacts = this.extractTaggedContacts(query);
    let contactChartData = {};
    let hasContactCharts = false;

    // If tagged contacts are found, get their chart data
    if (taggedContacts.length > 0) {
      logger.info('Found tagged contacts, fetching their chart data', {
        contacts: taggedContacts.map(c => c.name),
        userId
      });

      for (const contact of taggedContacts) {
        try {
          // Get contact profile and chart data
          const contactProfile = await this.getContactProfile(contact.name, userId);
          
          if (contactProfile) {
            // Get contact's chart data from the contact's chartData field
            if (contactProfile.chartData) {
              // The chart data is stored as a separate field
              const parsedChartData = typeof contactProfile.chartData === 'string' 
                ? JSON.parse(contactProfile.chartData) 
                : contactProfile.chartData;
              
              contactChartData[contact.name] = {
                profile: contactProfile,
                charts: parsedChartData
              };
              hasContactCharts = true;
              logger.info('Found chart data for contact', { 
                contact: contact.name,
                chartTypes: Object.keys(parsedChartData)
              });
            } else {
              logger.warn('No chart data found in contact profile', { 
                contact: contact.name,
                hasContactProfile: !!contactProfile,
                contactKeys: contactProfile ? Object.keys(contactProfile) : []
              });
            }
          }
        } catch (error) {
          logger.warn('Could not retrieve chart data for contact', { 
            contact: contact.name, 
            error: error.message 
          });
        }
      }
    }

    // Debug: Log chart data availability
    logger.info('Chart data availability check:', {
      hasChartData: !!chartData,
      chartDataKeys: chartData ? Object.keys(chartData) : [],
      chartDataDetails: chartData ? Object.keys(chartData).map(type => ({
        type,
        count: chartData[type]?.length || 0,
        hasData: chartData[type] && chartData[type].length > 0,
        sampleData: chartData[type]?.[0]?.data ? Object.keys(chartData[type][0].data).slice(0, 3) : []
      })) : [],
      hasChartData,
      userId
    });

    // Create system message with available functions
    let systemMessage = `You are Rraasi, your warm and friendly cosmic companion! 🌟 I'm here to help you discover the magic in your stars with enthusiasm, empathy, and genuine care. Think of me as that friend who gets genuinely excited about your astrological journey and loves sharing cosmic wisdom in the most engaging way possible!

My personality:
✨ I'm enthusiastic and encouraging - I celebrate your unique cosmic blueprint!
💫 I use friendly, conversational language with emojis and warmth
🌟 I'm genuinely excited about astrology and love sharing insights
💝 I'm supportive and uplifting, always focusing on your potential
🎯 I make complex astrological concepts accessible and fun
🤗 I speak like a caring friend who's passionate about helping you grow

${hasChartData ? '🎉 AMAZING! I have your complete birth chart data right here! I can give you incredibly personalized insights that will blow your mind! 🌟' : '💫 I\'d love to dive deep into your cosmic story! To give you the most magical insights, I\'ll need your birth details - date, time, and place of birth.'}

Available Functions:
${this.generateDynamicFunctions(chartData, hasChartData, hasContactCharts)}

User Context:
- Birth Data: ${birthData ? 'Available' : 'Not available'}
- Chart Data Available: ${hasChartData ? 'Yes' : 'No'}
- Available Chart Types: ${chartData ? Object.keys(chartData).filter(type => chartData[type] && chartData[type].length > 0).join(', ') : 'None'}
- Total Charts: ${chartData ? Object.keys(chartData).length : 0}

${hasChartData ? '✅ YOU HAVE ACCESS TO USER CHART DATA - USE IT FOR PERSONALIZED ANALYSIS' : '❌ No chart data available - ask user to provide birth details'}`;

    // Add contact context if available
    if (hasContactCharts) {
      systemMessage += `\n\nContact Context (for compatibility analysis):
${Object.entries(contactChartData).map(([name, data]) => 
  `- ${name}: Chart Types: ${Object.keys(data.charts).join(', ')}`
).join('\n')}`;
      
      logger.info('Contact charts available for compatibility analysis', {
        contactCount: Object.keys(contactChartData).length,
        contacts: Object.keys(contactChartData),
        chartTypes: Object.values(contactChartData).map(data => Object.keys(data.charts))
      });
    } else {
      logger.info('No contact charts available for compatibility analysis');
    }

    systemMessage += `\n\nCRITICAL FUNCTION CALLING RULES - Follow this EXACT flow for ALL queries:

1. FIRST: Use select_relevant_charts to identify which charts are relevant to the query
2. THEN: Use get_pinecone_charts to retrieve the actual chart data from Pinecone vector database
3. FINALLY: Provide a response using the specific chart data you retrieved from Pinecone

🌟 FRIENDLY RESPONSE FORMAT 🌟
Make your responses warm, engaging, and conversational! Structure them like this:

BRIEF ANSWER: [1-3 friendly sentences that directly answer with enthusiasm!]

DETAILED ANALYSIS:
[Your comprehensive, warm analysis with excitement, emojis, and genuine care]

EXAMPLE FORMAT:
BRIEF ANSWER: Oh my stars! 🌟 Your sun sign is Aquarius - you're such an innovative and independent soul! This is absolutely fascinating! ✨

DETAILED ANALYSIS:
Wow, your cosmic blueprint is absolutely incredible! 🌟 Your Sun in Aquarius makes you such a forward-thinking visionary - you're literally ahead of your time! Being born under the magical Purva Bhadrapad Nakshatra with Jupiter as its lord adds such beautiful spiritual depth and transformative energy to your personality. And your Libra Ascendant, ruled by the lovely Venus? That brings such natural charm and diplomatic skills! This combination creates such a unique blend of intellectual innovation and social harmony - you're truly one of a kind! 💫 The Air element dominance emphasizes your amazing communicative abilities and need for intellectual stimulation. I'm so excited for you to engage in community projects and pursue creative fields that allow for both innovation and aesthetic expression! 🎨✨

IMPORTANT: 
- NEVER call analyze_current_transits directly for general queries
- analyze_current_transits is ONLY for specific transit analysis requests
- For muhurat, timing, or general astrological questions, ALWAYS use select_relevant_charts first
- If chart data is available, NEVER give generic responses - always analyze the actual chart data from Pinecone
- You HAVE ACCESS to the user's chart data through Pinecone vector database - use it for personalized analysis
- If no birth data is available, ask the user to provide their birth details
- NEVER say you can't access chart data - you can search Pinecone for relevant data
- Use get_pinecone_charts to retrieve the most relevant chart data based on semantic search

GROUP COMPATIBILITY ANALYSIS:
- When users ask about group compatibility, teamwork, or multiple people analysis, use analyze_group_compatibility function
- For group requests, ask users to provide birth data for all group members
- Group analysis includes: element balance, modality distribution, leadership dynamics, and harmony factors
- Always provide specific astrological insights based on the group composition`;

    // Create messages array
    const messages = [
      new SystemMessage(systemMessage),
      ...conversationHistory.map(msg => 
        msg.type === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(query)
    ];

    logger.info('Messages being sent to LLM', {
      systemMessageLength: systemMessage.length,
      conversationHistoryLength: conversationHistory.length,
      totalMessages: messages.length,
      conversationHistory: conversationHistory.map(msg => ({
        type: msg.type,
        content: msg.content.substring(0, 100) + '...'
      }))
    });

    // Add available functions based on context
    const availableFunctions = [];
    
    // Check if we have birth data or chart data available
    const hasData = birthData || (chartData && Object.keys(chartData).length > 0);
    
    if (hasData) {
      availableFunctions.push(
        {
          name: 'select_relevant_charts',
          description: 'FIRST STEP: Select which chart types are most relevant to the user query. After calling this function, you MUST then call get_pinecone_charts to retrieve the actual chart data from Pinecone vector database for analysis.',
          parameters: {
            type: 'object',
            properties: {
              chart_types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Types of charts to analyze (astro_details, planets, horo_chart, current_vdasha, kalsarpa_details)'
              },
              reasoning: {
                type: 'string',
                description: 'Explanation of why these charts are relevant to the query'
              }
            },
            required: ['chart_types', 'reasoning']
          }
        }
      );
    } else {
      // Add a basic function for users without birth data
      availableFunctions.push(
        {
          name: 'request_birth_data',
          description: 'Request user to provide birth data for personalized astrological analysis',
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Explanation of why birth data is needed for this query'
              },
              guidance: {
                type: 'string',
                description: 'General astrological guidance that can be provided without birth data'
              }
            },
            required: ['reason', 'guidance']
          }
        }
      );
    }

    if (hasData) {
      availableFunctions.push(
        {
          name: 'get_pinecone_charts',
          description: 'SECOND STEP: Retrieve the actual chart data from Pinecone vector database for analysis. Use this after select_relevant_charts to get the specific chart data you need from Pinecone. This function performs semantic search to find the most relevant chart data based on the user query.',
          parameters: {
            type: 'object',
            properties: {
              chart_types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Types of charts to retrieve from Pinecone (astro_details, planets, horo_chart, current_vdasha, kalsarpa_details)'
              },
              search_query: {
                type: 'string',
                description: 'The user query to use for semantic search in Pinecone to find the most relevant chart data'
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return from Pinecone',
                default: 5
              }
            },
            required: ['chart_types', 'search_query']
          }
        }
      );

      availableFunctions.push(
        {
          name: 'analyze_current_transits',
          description: 'SPECIALIZED FUNCTION: Only use for specific transit analysis requests. For general astrological questions, use select_relevant_charts first.',
          parameters: {
            type: 'object',
            properties: {
              focus_areas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Areas to focus on (love, career, health, relationships)'
              }
            },
            required: []
          }
        }
      );
    }

    // Add compatibility functions if contact charts are available
    if (hasContactCharts && hasData) {
      availableFunctions.push(
        {
          name: 'analyze_romantic_compatibility',
          description: 'Analyze romantic compatibility between the user and tagged contacts',
          parameters: {
            type: 'object',
            properties: {
              contact_name: {
                type: 'string',
                description: 'Name of the contact to analyze compatibility with'
              },
              focus_aspects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific aspects to focus on (e.g., venus-mars, sun-moon, 7th-house compatibility)'
              }
            },
            required: ['contact_name']
          }
        }
      );

      availableFunctions.push(
        {
          name: 'analyze_business_compatibility',
          description: 'Analyze business and professional compatibility between the user and tagged contacts',
          parameters: {
            type: 'object',
            properties: {
              contact_name: {
                type: 'string',
                description: 'Name of the contact to analyze business compatibility with'
              },
              focus_aspects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific aspects to focus on (e.g., 10th-house, mercury, saturn compatibility)'
              }
            },
            required: ['contact_name']
          }
        }
      );

      availableFunctions.push(
        {
          name: 'analyze_friendship_compatibility',
          description: 'Analyze friendship compatibility between the user and tagged contacts',
          parameters: {
            type: 'object',
            properties: {
              contact_name: {
                type: 'string',
                description: 'Name of the contact to analyze friendship compatibility with'
              },
              focus_aspects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific aspects to focus on (e.g., 11th-house, jupiter, moon compatibility)'
              }
            },
            required: ['contact_name']
          }
        }
      );

      availableFunctions.push(
        {
          name: 'analyze_family_compatibility',
          description: 'Analyze family and karmic compatibility between the user and tagged contacts',
          parameters: {
            type: 'object',
            properties: {
              contact_name: {
                type: 'string',
                description: 'Name of the contact to analyze family compatibility with'
              },
              focus_aspects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific aspects to focus on (e.g., 4th-house, moon, rahu-ketu compatibility)'
              }
            },
            required: ['contact_name']
          }
        }
      );

      availableFunctions.push(
        {
          name: 'get_relationship_insights',
          description: 'Get detailed insights about the relationship between user and tagged contact',
          parameters: {
            type: 'object',
            properties: {
              contact_name: {
                type: 'string',
                description: 'Name of the contact to analyze relationship with'
              },
              aspect: {
                type: 'string',
                enum: ['communication', 'emotional', 'physical', 'spiritual', 'financial', 'intellectual'],
                description: 'Aspect of the relationship to analyze'
              }
            },
            required: ['contact_name', 'aspect']
          }
        }
      );

      availableFunctions.push(
        {
          name: 'calculate_compatibility_score',
          description: 'Calculate a comprehensive compatibility score between user and tagged contacts',
          parameters: {
            type: 'object',
            properties: {
              contact_name: {
                type: 'string',
                description: 'Name of the contact to calculate compatibility score with'
              },
              relationship_type: {
                type: 'string',
                enum: ['romantic', 'business', 'friendship', 'family'],
                description: 'Type of relationship to score'
              }
            },
            required: ['contact_name', 'relationship_type']
          }
        }
      );

    }

    // Add group compatibility function (always available for group analysis)
    availableFunctions.push(
      {
        name: 'analyze_group_compatibility',
        description: 'Analyze compatibility within a group of people using their birth data',
        parameters: {
          type: 'object',
          properties: {
            groupMembers: {
              type: 'array',
              items: {
                type: 'object',
                description: 'Group member information',
                properties: {
                  name: { type: 'string' },
                  birthDate: { type: 'string' },
                  birthTime: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  role: { type: 'string', description: 'Role in the group' }
                },
                required: ['name', 'birthDate', 'birthTime', 'latitude', 'longitude']
              },
              minItems: 2,
              maxItems: 10,
              description: 'Array of group members with birth data'
            },
            groupType: {
              type: 'string',
              enum: ['family', 'work', 'friendship', 'romantic', 'spiritual', 'business'],
              description: 'Type of group analysis',
              default: 'friendship'
            },
            analysisFocus: {
              type: 'string',
              enum: ['dynamics', 'leadership', 'communication', 'harmony', 'conflict', 'growth'],
              description: 'Focus area for group analysis',
              default: 'dynamics'
            }
          },
          required: ['groupMembers']
        }
      }
    );

    // Call LLM with function calling
    logger.info('Calling LLM with functions', {
      availableFunctions: availableFunctions.map(f => f.name),
      hasContactCharts,
      hasData,
      contactCount: Object.keys(contactChartData).length
    });
    
    let response;
    if (availableFunctions.length > 0) {
      // Call LLM with functions when available
      response = await this.llm.invoke(messages, {
        functions: availableFunctions,
        function_call: 'auto'
      });
    } else {
      // Call LLM without functions when none are available
      response = await this.llm.invoke(messages);
    }

    // Handle function calls
    if (response.additional_kwargs?.function_call) {
      const functionCall = response.additional_kwargs.function_call;
      logger.info('Function called', { functionName: functionCall.name });
      
      try {
        logger.info('Available methods on this:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
        logger.info('Checking if handleBirthChartRequest exists:', typeof this.handleBirthChartRequest);
        
        if (functionCall.name === 'select_relevant_charts') {
          return await this.handleChartSelection(functionCall, userContext, query);
        } else if (functionCall.name === 'get_pinecone_charts') {
          return await this.handlePineconeChartRetrieval(functionCall, userContext, query);
        } else if (functionCall.name === 'analyze_current_transits') {
          return await this.handleTransitAnalysis(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'analyze_romantic_compatibility') {
          return await this.handleRomanticCompatibility(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'analyze_business_compatibility') {
          return await this.handleBusinessCompatibility(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'analyze_friendship_compatibility') {
          return await this.handleFriendshipCompatibility(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'analyze_family_compatibility') {
          return await this.handleFamilyCompatibility(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'get_relationship_insights') {
          return await this.handleRelationshipInsights(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'calculate_compatibility_score') {
          return await this.handleCompatibilityScoring(functionCall, userContext, contactChartData, query);
        } else if (functionCall.name === 'analyze_group_compatibility') {
          return await this.handleGroupCompatibility(functionCall, userContext, query);
        } else if (functionCall.name === 'request_birth_data') {
          return await this.handleBirthDataRequest(functionCall, userContext, query);
        } else {
          logger.warn('Unknown function called', { functionName: functionCall.name });
          return {
            success: false,
            response: `I'm not sure how to handle that request. Please try asking something else.`,
            brief_answer: 'Request not understood',
            detailed_description: `I'm not sure how to handle that request. Please try asking something else.`,
            confidence: 0.3,
            sources: ['Unknown Function']
          };
        }
        
        logger.info('About to return function result', { functionName: functionCall.name });
      } catch (error) {
        logger.error('Error executing function:', error);
        return {
          success: false,
          response: `I encountered an error while processing your request: ${error.message}. Please try again.`,
          brief_answer: 'Error processing request',
          detailed_description: `I encountered an error while processing your request: ${error.message}. Please try again.`,
          confidence: 0.1,
          sources: ['Error Handling']
        };
      }
    }

      // If no function call, return the response with proper brief/detailed extraction
    const { briefAnswer, detailedDescription } = this.extractBriefAndDetailed(response.content);
    
    return {
      success: true,
      response: response.content,
      brief_answer: briefAnswer,
      detailed_description: detailedDescription,
      confidence: 0.9,
      sources: ['Astrological Analysis'],
      astrologicalContext: {
        birthData: birthData,
        hasChartData: hasChartData
      }
    };
  }

  // Handle chart selection function
  async handleChartSelection(functionCall, userContext, query) {
    try {
      logger.info('🔍 [CHART_SELECTION] Method called', {
        functionName: functionCall.name,
        query: query.substring(0, 50) + '...'
      });
      
      const args = JSON.parse(functionCall.arguments);
      const selectedCharts = args.chart_types;
      const reasoning = args.reasoning;
      
      logger.info('Chart selection function called', { 
        selectedCharts, 
        reasoning,
        availableCharts: Object.keys(userContext.chartData || {}),
        userContextKeys: Object.keys(userContext),
        hasChartData: !!userContext.chartData,
        chartDataType: typeof userContext.chartData
      });

      // Validate userContext and chartData
      if (!userContext) {
        logger.error('User context is missing');
        return {
          success: false,
          response: "I'm sorry, but I'm unable to access your user profile at the moment. Please try refreshing the page or logging in again.",
          confidence: 0.1,
          sources: ['User Context Missing']
        };
      }

      if (!userContext.chartData) {
        logger.warn('No chart data in user context', { userContextKeys: Object.keys(userContext) });
        return {
          success: false,
          response: "I don't have access to your birth chart data yet. This usually means:\n\n1. Your birth details haven't been added to your profile\n2. Your charts are still being processed\n3. There was an issue retrieving your chart data\n\nPlease add your birth details in your profile and try again.",
          confidence: 0.2,
          sources: ['Chart Data Missing']
        };
      }

      // Get the selected chart data
      const chartData = userContext.chartData;
      const selectedChartData = {};
      
      logger.info('Chart data structure analysis', {
        chartDataKeys: Object.keys(chartData),
        selectedCharts,
        chartDataTypes: Object.entries(chartData).map(([key, value]) => ({
          key,
          type: typeof value,
          isArray: Array.isArray(value),
          length: Array.isArray(value) ? value.length : 'N/A'
        }))
      });
      
      for (const chartType of selectedCharts) {
        if (chartData && chartData[chartType]) {
          selectedChartData[chartType] = chartData[chartType];
        } else {
          logger.warn('Selected chart type not found in chart data', { 
            chartType, 
            availableTypes: Object.keys(chartData || {}) 
          });
        }
      }

      // Format chart data for better LLM understanding
      let formattedChartData = '';
      
      logger.info('Processing chart data for formatting', {
        selectedChartDataKeys: Object.keys(selectedChartData),
        selectedChartDataStructure: Object.entries(selectedChartData).map(([key, value]) => ({
          chartType: key,
          hasArray: Array.isArray(value),
          arrayLength: Array.isArray(value) ? value.length : 'N/A',
          firstItem: Array.isArray(value) && value.length > 0 ? value[0] : 'N/A',
          firstItemKeys: Array.isArray(value) && value.length > 0 ? Object.keys(value[0]) : 'N/A'
        }))
      });
      
      for (const [chartType, chartArray] of Object.entries(selectedChartData)) {
        if (chartArray && Array.isArray(chartArray) && chartArray.length > 0) {
          const chartInfo = chartArray[0];
          
          // Add null checks and debugging
          if (!chartInfo) {
            logger.warn('Chart info is null/undefined', { chartType, chartArray });
            continue;
          }
          
          // Check if chartInfo has a data property, if not, use chartInfo directly
          const data = chartInfo.data || chartInfo;
          
          if (!data) {
            logger.warn('Chart data is null/undefined', { chartType, chartInfo });
            continue;
          }
          
          logger.info('Processing chart type', { 
            chartType, 
            hasData: !!data, 
            dataKeys: Object.keys(data),
            dataType: typeof data
          });
          
          formattedChartData += `\n**${chartType.toUpperCase()}:**\n`;
          
          if (chartType === 'astro_details') {
            formattedChartData += `• Ascendant: ${data.ascendant || 'Not available'}\n`;
            formattedChartData += `• Ascendant Lord: ${data.ascendant_lord || 'Not available'}\n`;
            formattedChartData += `• Sun Sign: ${data.sign || 'Not available'}\n`;
            formattedChartData += `• Nakshatra: ${data.Naksahtra || 'Not available'}\n`;
            formattedChartData += `• Nakshatra Lord: ${data.NaksahtraLord || 'Not available'}\n`;
            formattedChartData += `• Charan: ${data.Charan || 'Not available'}\n`;
            formattedChartData += `• Yog: ${data.Yog || 'Not available'}\n`;
            formattedChartData += `• Karan: ${data.Karan || 'Not available'}\n`;
            formattedChartData += `• Tithi: ${data.Tithi || 'Not available'}\n`;
            formattedChartData += `• Varna: ${data.Varna || 'Not available'}\n`;
            formattedChartData += `• Vashya: ${data.Vashya || 'Not available'}\n`;
            formattedChartData += `• Yoni: ${data.Yoni || 'Not available'}\n`;
            formattedChartData += `• Gan: ${data.Gan || 'Not available'}\n`;
            formattedChartData += `• Nadi: ${data.Nadi || 'Not available'}\n`;
            formattedChartData += `• Tatva: ${data.tatva || 'Not available'}\n`;
            formattedChartData += `• Name Alphabet: ${data.name_alphabet || 'Not available'}\n`;
            formattedChartData += `• Paya: ${data.paya || 'Not available'}\n`;
          } else if (chartType === 'planets') {
            if (data.planets && Array.isArray(data.planets)) {
              data.planets.forEach(planet => {
                if (planet && typeof planet === 'object') {
                  formattedChartData += `• ${planet.name || 'Unknown'}: ${planet.sign || 'Unknown'} (${planet.house || 'Unknown'} house)\n`;
                }
              });
            } else {
              formattedChartData += `• Planetary data structure: ${JSON.stringify(data).substring(0, 200)}...\n`;
            }
          } else if (chartType === 'basic_gem_suggestion') {
            // Format gemstone data specifically
            if (data.LIFE) {
              formattedChartData += `• LIFE GEMSTONE: ${data.LIFE.name || 'Unknown'} (${data.LIFE.gem_deity || 'Unknown'} deity)\n`;
              formattedChartData += `  - Wear on: ${data.LIFE.wear_day || 'Unknown'}\n`;
              formattedChartData += `  - Finger: ${data.LIFE.wear_finger || 'Unknown'}\n`;
              formattedChartData += `  - Metal: ${data.LIFE.wear_metal || 'Unknown'}\n`;
              formattedChartData += `  - Weight: ${data.LIFE.weight_caret || 'Unknown'} carats\n`;
              formattedChartData += `  - Alternative: ${data.LIFE.semi_gem || 'Unknown'}\n`;
            }
            if (data.BENEFIC) {
              formattedChartData += `• BENEFIC GEMSTONE: ${data.BENEFIC.name || 'Unknown'} (${data.BENEFIC.gem_deity || 'Unknown'} deity)\n`;
              formattedChartData += `  - Wear on: ${data.BENEFIC.wear_day || 'Unknown'}\n`;
              formattedChartData += `  - Finger: ${data.BENEFIC.wear_finger || 'Unknown'}\n`;
              formattedChartData += `  - Metal: ${data.BENEFIC.wear_metal || 'Unknown'}\n`;
              formattedChartData += `  - Weight: ${data.BENEFIC.weight_caret || 'Unknown'} carats\n`;
              formattedChartData += `  - Alternative: ${data.BENEFIC.semi_gem || 'Unknown'}\n`;
            }
            if (data.LUCKY) {
              formattedChartData += `• LUCKY GEMSTONE: ${data.LUCKY.name || 'Unknown'} (${data.LUCKY.gem_deity || 'Unknown'} deity)\n`;
              formattedChartData += `  - Wear on: ${data.LUCKY.wear_day || 'Unknown'}\n`;
              formattedChartData += `  - Finger: ${data.LUCKY.wear_finger || 'Unknown'}\n`;
              formattedChartData += `  - Metal: ${data.LUCKY.wear_metal || 'Unknown'}\n`;
              formattedChartData += `  - Weight: ${data.LUCKY.weight_caret || 'Unknown'} carats\n`;
              formattedChartData += `  - Alternative: ${data.LUCKY.semi_gem || 'Unknown'}\n`;
            }
          } else {
            // For other chart types, show key information
            if (data && typeof data === 'object') {
              Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                  formattedChartData += `• ${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
                }
              });
            } else {
              formattedChartData += `• Raw data: ${JSON.stringify(data).substring(0, 200)}...\n`;
            }
          }
        } else {
          logger.warn('Invalid chart array structure', { 
            chartType, 
            chartArray, 
            isArray: Array.isArray(chartArray),
            length: Array.isArray(chartArray) ? chartArray.length : 'N/A'
          });
        }
      }

      // Check if we have any formatted chart data
      if (!formattedChartData.trim()) {
        logger.warn('No chart data available for analysis, attempting astro agent fallback', {
          selectedCharts,
          selectedChartDataKeys: Object.keys(selectedChartData),
          userContextKeys: Object.keys(userContext),
          userId: userContext.userId
        });
        
        // Try to activate astro agent fallback if user has birth data
        if (userContext.userId && userContext.birthData) {
          try {
            logger.info('🤖 [ASTRO_AGENT] Attempting to generate charts via astro agent fallback', { 
              userId: userContext.userId 
            });
            
            const authService = (await import('./authService.js')).authService;
            const fallbackResult = await authService.activateAstroAgentFallback(
              userContext.userId, 
              userContext.birthData
            );
            
            if (fallbackResult.success) {
              logger.info('🤖 [ASTRO_AGENT] Astro agent fallback successful, retrying chart selection', { 
                userId: userContext.userId,
                chartsGenerated: fallbackResult.chartsGenerated
              });
              
              // Retry the chart selection with newly generated charts
              return await this.handleChartSelection(functionCall, userContext, query);
            }
          } catch (fallbackError) {
            logger.error('🤖 [ASTRO_AGENT] Astro agent fallback failed', { 
              userId: userContext.userId,
              error: fallbackError.message 
            });
          }
        }
        
        return {
          success: false,
          response: "I'm sorry, but I don't have access to your birth chart data at the moment. This could be because:\n\n1. Your birth details haven't been added to your profile yet\n2. Your charts are still being processed\n3. There was an issue retrieving your chart data\n\nI've attempted to generate your charts using our astro agent, but this also failed. To get personalized astrological insights, please:\n• Add your birth details (date, time, and place) in your profile\n• Wait for your charts to be processed\n• Try again in a few minutes\n\nWould you like me to help you add your birth details?",
          confidence: 0.3,
          sources: ['Chart Data Missing', 'Astro Agent Fallback Attempted'],
          astrologicalContext: {
            selectedCharts: selectedCharts,
            reasoning: reasoning,
            hasPersonalizedData: false,
            chartDataUsed: [],
            error: 'No chart data available, astro agent fallback attempted'
          }
        };
      }

      // Create detailed analysis prompt with the formatted chart data
      const analysisPrompt = `🌟 AMAZING! I have your complete birth chart data right here and I'm SO excited to share the cosmic magic with you! ✨

User Query: "${query}"

Selected Charts: ${selectedCharts.join(', ')}
Reasoning: ${reasoning}

YOUR INCREDIBLE CHART DATA:${formattedChartData}

FRIENDLY REQUIREMENTS (with enthusiasm!):
- Reference at least 5 specific data points from the chart data above with genuine excitement! 🌟
- Start with warmth and enthusiasm: "Oh my stars!" "Wow!" "Amazing!" "Incredible!"
- Use emojis throughout: 🌟 ✨ 💫 🎨 🎯 💝 🌈 🦋
- Be conversational: "you're such a..." "this is incredible!" "I'm so excited for you!"
- Include specific planetary positions, houses, and aspects from the data above
- Use friendly, conversational language with genuine care and excitement
- Provide concrete, personalized analysis using the actual chart data
- Be supportive, encouraging, and focus on their potential and strengths
- Make them feel special and unique about their cosmic journey

FRIENDLY ANALYSIS STRUCTURE:
1. Start with excitement: "Oh my stars! Your cosmic blueprint is absolutely incredible! 🌟"
2. Specific planetary positions and their beautiful influence (use actual data with enthusiasm)
3. House placements relevant to the query (reference horo_chart data with wonder)
4. Current transits and their impact (use current_vdasha data with encouragement)
5. Practical advice based on the astrological data (be supportive and uplifting)
6. Personalized recommendations using specific chart information (be encouraging!)

FRIENDLY EXAMPLES:
- If you see "Ascendant: Virgo", say "Your beautiful Virgo Ascendant shows such incredible attention to detail and caring nature! ✨"
- If you see "Sun Sign: Capricorn", say "Your amazing Capricorn Sun makes you such a determined and ambitious soul! 🌟"
- If you see "Nakshatra: Uttra Shadha", say "Being born under the magical Uttra Shadha Nakshatra means you have such incredible healing abilities! 💫"

Remember: Be warm, enthusiastic, supportive, and make them feel special about their cosmic journey! 🌟✨`;

      logger.info('Chart selection analysis prompt created', {
        query,
        selectedCharts,
        formattedChartDataLength: formattedChartData.length,
        promptLength: analysisPrompt.length,
        formattedChartDataPreview: formattedChartData.substring(0, 500) + '...'
      });

      const analysisResponse = await this.llm.invoke([
        new SystemMessage(`You are Rraasi, a warm and enthusiastic cosmic companion! 🌟 

CRITICAL: You MUST be friendly, warm, and engaging! Use this EXACT tone:

EXAMPLE OF FRIENDLY RESPONSE:
"Oh my stars! 🌟 Your cosmic blueprint is absolutely incredible! Your Sun in Aquarius makes you such an innovative and independent soul - you're literally ahead of your time! ✨ Being born under the magical Purva Bhadrapad Nakshatra with Jupiter as its lord adds such beautiful spiritual depth and transformative energy to your personality! 💫 And your Libra Ascendant, ruled by the lovely Venus? That brings such natural charm and diplomatic skills! This combination creates such a unique blend of intellectual innovation and social harmony - you're truly one of a kind! 🎨"

REQUIRED TONE:
- Start with excitement: "Oh my stars!" "Wow!" "Amazing!" "Incredible!"
- Use emojis throughout: 🌟 ✨ 💫 🎨 🎯 💝 🌈 🦋
- Be conversational: "you're such a..." "this is incredible!" "I'm so excited for you!"
- Show genuine care and enthusiasm
- Make them feel special about their cosmic journey
- Use words like "incredible," "amazing," "beautiful," "fascinating," "wonderful"

You have DIRECT ACCESS to the user's birth chart data and you're SO excited to share the magic! Use the provided chart data to give personalized, friendly analysis with genuine enthusiasm. Be conversational, supportive, and use emojis to make the experience delightful! Always reference specific planetary positions, houses, and aspects from the data provided with excitement and care.`),
        new HumanMessage(analysisPrompt)
      ]);

      // Extract brief and detailed sections from the response
      logger.info('🔍 [EXTRACTION] Starting extraction process', {
        contentLength: analysisResponse.content.length,
        contentPreview: analysisResponse.content.substring(0, 100) + '...'
      });
      
      let briefAnswer, detailedDescription;
      try {
        const extractionResult = this.extractBriefAndDetailed(analysisResponse.content);
        briefAnswer = extractionResult.briefAnswer;
        detailedDescription = extractionResult.detailedDescription;
        logger.info('🔍 [EXTRACTION] Extraction successful', {
          briefLength: briefAnswer?.length || 0,
          detailedLength: detailedDescription?.length || 0
        });
      } catch (extractionError) {
        logger.error('🔍 [EXTRACTION] Extraction failed', { error: extractionError.message });
        briefAnswer = analysisResponse.content.substring(0, 200) + '...';
        detailedDescription = analysisResponse.content;
      }
      
      const finalResponse = {
        success: true,
        response: analysisResponse.content,
        brief_answer: briefAnswer,
        detailed_description: detailedDescription,
        confidence: 0.95,
        sources: ['Personalized Astrological Analysis'],
        astrologicalContext: {
          selectedCharts: selectedCharts,
          reasoning: reasoning,
          hasPersonalizedData: true,
          chartDataUsed: Object.keys(selectedChartData)
        }
      };

      logger.info('Chart selection response generated', {
        responseLength: analysisResponse.content.length,
        responsePreview: analysisResponse.content.substring(0, 200) + '...',
        selectedCharts,
        chartDataUsed: Object.keys(selectedChartData)
      });

      return finalResponse;
    } catch (error) {
      logger.error('Error handling chart selection:', error);
      return {
        success: false,
        response: 'I encountered an error analyzing your chart data. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle birth chart request function
  async handleBirthChartRequest(functionCall, userContext) {
    logger.info('Entering handleBirthChartRequest function');
    try {
      const args = JSON.parse(functionCall.arguments);
      const chartType = args.chart_type;
      
      logger.info('Birth chart request function called', { 
        chartType,
        userContextKeys: Object.keys(userContext),
        hasChartData: !!userContext.chartData,
        chartDataKeys: userContext.chartData ? Object.keys(userContext.chartData) : []
      });

      // Get the specific chart data
      const userChartData = userContext.chartData;
      logger.info('Checking chart data availability', {
        hasUserChartData: !!userChartData,
        chartType,
        hasChartTypeData: false, // Simplified to avoid potential error
        userContextKeys: Object.keys(userContext),
        chartDataKeys: userChartData ? Object.keys(userChartData) : []
      });
      
      logger.info('About to check if condition', {
        userChartData: !!userChartData,
        userChartDataType: typeof userChartData,
        chartType,
        hasChartTypeData: false // Simplified to avoid potential error
      });
      
      if (userChartData && userChartData[chartType]) {
        const chartInfo = userChartData[chartType][0];
        
        // Format the chart data into a readable response
        const chartData = chartInfo.data;
        let formattedResponse = `Here's your ${chartType} information:\n\n`;
        
        // Format based on chart type
        if (chartType === 'astro_details') {
          formattedResponse += `**Your Astrological Profile:**\n\n`;
          formattedResponse += `• **Ascendant (Rising Sign):** ${chartData.ascendant || 'Not available'}\n`;
          formattedResponse += `• **Ascendant Lord:** ${chartData.ascendant_lord || 'Not available'}\n`;
          formattedResponse += `• **Sun Sign:** ${chartData.sign || 'Not available'}\n`;
          formattedResponse += `• **Nakshatra (Lunar Mansion):** ${chartData.Naksahtra || 'Not available'}\n`;
          formattedResponse += `• **Nakshatra Lord:** ${chartData.NaksahtraLord || 'Not available'}\n`;
          formattedResponse += `• **Charan:** ${chartData.Charan || 'Not available'}\n`;
          formattedResponse += `• **Yog:** ${chartData.Yog || 'Not available'}\n`;
          formattedResponse += `• **Karan:** ${chartData.Karan || 'Not available'}\n`;
          formattedResponse += `• **Tithi:** ${chartData.Tithi || 'Not available'}\n`;
          formattedResponse += `• **Varna:** ${chartData.Varna || 'Not available'}\n`;
          formattedResponse += `• **Vashya:** ${chartData.Vashya || 'Not available'}\n`;
          formattedResponse += `• **Yoni:** ${chartData.Yoni || 'Not available'}\n`;
          formattedResponse += `• **Gan:** ${chartData.Gan || 'Not available'}\n`;
          formattedResponse += `• **Nadi:** ${chartData.Nadi || 'Not available'}\n`;
          formattedResponse += `• **Tatva (Element):** ${chartData.tatva || 'Not available'}\n`;
          formattedResponse += `• **Name Alphabet:** ${chartData.name_alphabet || 'Not available'}\n`;
          formattedResponse += `• **Paya (Metal):** ${chartData.paya || 'Not available'}\n`;
        } else if (chartType === 'planets') {
          formattedResponse += `**Planetary Positions:**\n\n`;
          if (chartData.planets) {
            chartData.planets.forEach((planet, index) => {
              formattedResponse += `• **${planet.name}:** ${planet.sign} (${planet.house} house)\n`;
            });
          }
        } else {
          // For other chart types, show key information
          formattedResponse += `**Key Information:**\n\n`;
          Object.entries(chartData).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
              formattedResponse += `• **${key.replace(/_/g, ' ').toUpperCase()}:** ${value}\n`;
            }
          });
        }
        
        return {
          success: true,
          response: formattedResponse,
          confidence: 0.9,
          sources: ['Birth Chart Data'],
          astrologicalContext: {
            chartType: chartType,
            hasChartData: true
          }
        };
      } else {
        logger.info('No chart data available, returning Chart Data Missing response');
        return {
          success: false,
          response: `I don't have ${chartType} data available for you yet. Please generate your complete birth chart first.`,
          confidence: 0.5,
          sources: ['Chart Data Missing']
        };
      }
    } catch (error) {
      logger.error('Error handling birth chart request:', error);
      return {
        success: false,
        response: 'I encountered an error retrieving your chart data. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle Pinecone chart retrieval function
  async handlePineconeChartRetrieval(functionCall, userContext, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const { chart_types, search_query, max_results = 5 } = args;
      
      logger.info('🔍 [PINECONE] Retrieving charts from Pinecone', { 
        userId: userContext.userId, 
        chart_types, 
        search_query,
        max_results
      });
      
      // Use the existing searchRelevantDocuments function from firestoreRAGService
      const searchResults = await firestoreRAGService.searchRelevantDocuments(
        search_query, 
        userContext.userId, 
        max_results
      );
      
      logger.info('🔍 [PINECONE] Search results received', {
        resultCount: searchResults.length,
        results: searchResults.map(r => ({
          chartType: r.metadata?.chartType,
          chartId: r.metadata?.chartId,
          contentPreview: r.pageContent?.substring(0, 100)
        }))
      });
      
      // Filter results by chart types if specified
      let filteredResults = searchResults;
      if (chart_types && chart_types.length > 0) {
        filteredResults = searchResults.filter(doc => 
          chart_types.includes(doc.metadata?.chartType)
        );
        logger.info('🔍 [PINECONE] Filtered results by chart types', {
          originalCount: searchResults.length,
          filteredCount: filteredResults.length,
          requestedTypes: chart_types,
          foundTypes: [...new Set(filteredResults.map(r => r.metadata?.chartType))]
        });
      }
      
      if (filteredResults.length === 0) {
        logger.warn('🔍 [PINECONE] No relevant charts found in Pinecone', {
          searchQuery: search_query,
          chartTypes: chart_types,
          totalResults: searchResults.length
        });
        
        return {
          success: false,
          response: `I couldn't find any relevant chart data in my database for your query "${search_query}". This might be because your charts haven't been processed yet or the query doesn't match your stored data.`,
          confidence: 0.3,
          sources: ['Pinecone Vector Search'],
          astrologicalContext: {
            searchQuery: search_query,
            requestedChartTypes: chart_types,
            resultsFound: 0,
            pineconeSearch: true
          }
        };
      }
      
      // Format the Pinecone results for AI analysis
      const formattedChartData = this.formatPineconeResults(filteredResults);
      
      logger.info('🔍 [PINECONE] Formatted chart data for AI analysis', {
        formattedLength: formattedChartData.length,
        chartTypes: [...new Set(filteredResults.map(r => r.metadata?.chartType))]
      });
      
      // Create analysis prompt with the Pinecone data
      const analysisPrompt = `🌟 AMAZING! I found your relevant chart data in my Pinecone vector database! ✨

User Query: "${query}"
Search Query: "${search_query}"
Requested Chart Types: ${chart_types.join(', ')}
Results Found: ${filteredResults.length} relevant documents

YOUR PINECONE-RETRIEVED CHART DATA:${formattedChartData}

FRIENDLY REQUIREMENTS (with enthusiasm!):
- Reference specific data points from the Pinecone results with genuine excitement! 🌟
- Start with warmth and enthusiasm: "Oh my stars!" "Wow!" "Amazing!" "Incredible!"
- Use emojis throughout: 🌟 ✨ 💫 🎨 🎯 💝 🌈 🦋
- Be conversational: "you're such a..." "this is incredible!" "I'm so excited for you!"
- Include specific planetary positions, houses, and aspects from the Pinecone data
- Use friendly, conversational language with genuine care and excitement
- Provide concrete, personalized analysis using the actual chart data from Pinecone
- Be supportive, encouraging, and focus on their potential and strengths
- Make them feel special and unique about their cosmic journey

FRIENDLY ANALYSIS STRUCTURE:
1. Start with excitement: "Oh my stars! I found your chart data in my vector database! 🌟"
2. Specific planetary positions and their beautiful influence (use actual Pinecone data with enthusiasm)
3. House placements relevant to the query (reference horo_chart data with wonder)
4. Current transits and their impact (use current_vdasha data with encouragement)
5. Practical advice based on the Pinecone-retrieved astrological data (be supportive and uplifting)
6. Personalized recommendations using specific chart information from Pinecone (be encouraging!)

Remember: Be warm, enthusiastic, supportive, and make them feel special about their cosmic journey! 🌟✨`;

      // Generate AI response using the Pinecone data
      const analysisResponse = await this.llm.invoke([
        new SystemMessage(`You are Rraasi, a warm and enthusiastic cosmic companion! 🌟 

CRITICAL: You MUST be friendly, warm, and engaging! Use this EXACT tone:

EXAMPLE OF FRIENDLY RESPONSE:
"Oh my stars! 🌟 I found your chart data in my Pinecone vector database and it's absolutely incredible! Your Sun in Aquarius makes you such an innovative and independent soul - you're literally ahead of your time! ✨ Being born under the magical Purva Bhadrapad Nakshatra with Jupiter as its lord adds such beautiful spiritual depth and transformative energy to your personality! 💫 And your Libra Ascendant, ruled by the lovely Venus? That brings such natural charm and diplomatic skills! This combination creates such a unique blend of intellectual innovation and social harmony - you're truly one of a kind! 🎨"

REQUIRED TONE:
- Start with excitement: "Oh my stars!" "Wow!" "Amazing!" "Incredible!"
- Use emojis throughout: 🌟 ✨ 💫 🎨 🎯 💝 🌈 🦋
- Be conversational: "you're such a..." "this is incredible!" "I'm so excited for you!"
- Show genuine care and enthusiasm
- Make them feel special about their cosmic journey
- Use words like "incredible," "amazing," "beautiful," "fascinating," "wonderful"

You have DIRECT ACCESS to the user's chart data from Pinecone vector database and you're SO excited to share the magic! Use the provided Pinecone data to give personalized, friendly analysis with genuine enthusiasm. Be conversational, supportive, and use emojis to make the experience delightful! Always reference specific planetary positions, houses, and aspects from the Pinecone data provided with excitement and care.`),
        new HumanMessage(analysisPrompt)
      ]);

      // Extract brief and detailed sections from the response
      let briefAnswer, detailedDescription;
      try {
        const extractionResult = this.extractBriefAndDetailed(analysisResponse.content);
        briefAnswer = extractionResult.briefAnswer;
        detailedDescription = extractionResult.detailedDescription;
      } catch (extractionError) {
        logger.error('🔍 [PINECONE] Extraction failed', { error: extractionError.message });
        briefAnswer = analysisResponse.content.substring(0, 200) + '...';
        detailedDescription = analysisResponse.content;
      }
      
      const finalResponse = {
        success: true,
        response: analysisResponse.content,
        brief_answer: briefAnswer,
        detailed_description: detailedDescription,
        confidence: 0.95,
        sources: ['Pinecone Vector Database', 'Personalized Astrological Analysis'],
        astrologicalContext: {
          searchQuery: search_query,
          requestedChartTypes: chart_types,
          resultsFound: filteredResults.length,
          chartTypesFound: [...new Set(filteredResults.map(r => r.metadata?.chartType))],
          pineconeSearch: true,
          hasPersonalizedData: true,
          chartDataUsed: [...new Set(filteredResults.map(r => r.metadata?.chartType))]
        }
      };

      logger.info('🔍 [PINECONE] Response generated successfully', {
        responseLength: analysisResponse.content.length,
        briefLength: briefAnswer?.length || 0,
        detailedLength: detailedDescription?.length || 0,
        chartTypesUsed: [...new Set(filteredResults.map(r => r.metadata?.chartType))]
      });

      return finalResponse;
      
    } catch (error) {
      logger.error('🔍 [PINECONE] Error handling Pinecone chart retrieval:', error);
      return {
        success: false,
        response: 'I encountered an error retrieving your chart data from my vector database. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling'],
        astrologicalContext: {
          pineconeSearch: true,
          error: error.message
        }
      };
    }
  }

  // Format Pinecone search results for AI analysis
  formatPineconeResults(searchResults) {
    let formattedData = '';
    
    // Group results by chart type
    const resultsByType = {};
    searchResults.forEach(result => {
      const chartType = result.metadata?.chartType || 'unknown';
      if (!resultsByType[chartType]) {
        resultsByType[chartType] = [];
      }
      resultsByType[chartType].push(result);
    });
    
    // Format each chart type
    Object.entries(resultsByType).forEach(([chartType, results]) => {
      formattedData += `\n**${chartType.toUpperCase()} (${results.length} documents):**\n`;
      
      results.forEach((result, index) => {
        formattedData += `\nDocument ${index + 1}:\n`;
        formattedData += `Content: ${result.pageContent}\n`;
        if (result.metadata?.chartId) {
          formattedData += `Chart ID: ${result.metadata.chartId}\n`;
        }
        if (result.metadata?.userId) {
          formattedData += `User ID: ${result.metadata.userId}\n`;
        }
        formattedData += `---\n`;
      });
    });
    
    return formattedData;
  }

  // Handle romantic compatibility analysis with chart comparison
  async handleRomanticCompatibility(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const contactName = args.contact_name;
      const focusAspects = args.focus_aspects || ['venus-mars', 'sun-moon', '7th-house'];
      
      logger.info('Handling romantic compatibility analysis', { 
        contactName, 
        focusAspects 
      });
      
      if (!contactChartData[contactName]) {
        return {
          success: false,
          response: `I don't have chart data available for ${contactName}. Please ensure their birth chart has been imported.`,
          confidence: 0.3,
          sources: ['Contact Chart Data Check']
        };
      }
      
      const userChartData = userContext.chartData;
      const contactData = contactChartData[contactName];
      
      // Create chart comparison visualization
      const chartComparison = this.createChartComparison(userChartData, contactData.charts, contactName);
      
      // Perform romantic compatibility analysis
      const compatibilityAnalysis = await this.analyzeCompatibilityWithCharts(
        userContext.userId,
        userChartData,
        { [contactName]: contactData },
        query
      );
      
      const response = `${compatibilityAnalysis}\n\n${chartComparison}`;
      
      return {
        success: true,
        response: response,
        confidence: 0.95,
        sources: ['Romantic Compatibility Analysis'],
        astrologicalContext: {
          analysisType: 'romantic',
          contactName,
          focusAspects,
          hasUserChartData: !!userChartData,
          hasContactChartData: !!contactData,
          chartComparison: true
        }
      };
    } catch (error) {
      logger.error('Error handling romantic compatibility analysis:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing romantic compatibility. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle business compatibility analysis
  async handleBusinessCompatibility(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const contactName = args.contact_name;
      const focusAspects = args.focus_aspects || ['10th-house', 'mercury', 'saturn'];
      
      logger.info('Handling business compatibility analysis', { 
        contactName, 
        focusAspects 
      });
      
      if (!contactChartData[contactName]) {
        return {
          success: false,
          response: `I don't have chart data available for ${contactName}. Please ensure their birth chart has been imported.`,
          confidence: 0.3,
          sources: ['Contact Chart Data Check']
        };
      }
      
      const userChartData = userContext.chartData;
      const contactData = contactChartData[contactName];
      
      // Create business-focused chart comparison
      const chartComparison = this.createBusinessChartComparison(userChartData, contactData.charts, contactName);
      
      // Perform business compatibility analysis
      const compatibilityAnalysis = await this.analyzeCompatibilityWithCharts(
        userContext.userId,
        userChartData,
        { [contactName]: contactData },
        query
      );
      
      const response = `${compatibilityAnalysis}\n\n${chartComparison}`;
      
      return {
        success: true,
        response: response,
        confidence: 0.95,
        sources: ['Business Compatibility Analysis'],
        astrologicalContext: {
          analysisType: 'business',
          contactName,
          focusAspects,
          hasUserChartData: !!userChartData,
          hasContactChartData: !!contactData,
          chartComparison: true
        }
      };
    } catch (error) {
      logger.error('Error handling business compatibility analysis:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing business compatibility. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle friendship compatibility analysis
  async handleFriendshipCompatibility(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const contactName = args.contact_name;
      const focusAspects = args.focus_aspects || ['11th-house', 'jupiter', 'moon'];
      
      logger.info('Handling friendship compatibility analysis', { 
        contactName, 
        focusAspects 
      });
      
      if (!contactChartData[contactName]) {
        return {
          success: false,
          response: `I don't have chart data available for ${contactName}. Please ensure their birth chart has been imported.`,
          confidence: 0.3,
          sources: ['Contact Chart Data Check']
        };
      }
      
      const userChartData = userContext.chartData;
      const contactData = contactChartData[contactName];
      
      // Create friendship-focused chart comparison
      const chartComparison = this.createFriendshipChartComparison(userChartData, contactData.charts, contactName);
      
      // Perform friendship compatibility analysis
      const compatibilityAnalysis = await this.analyzeCompatibilityWithCharts(
        userContext.userId,
        userChartData,
        { [contactName]: contactData },
        query
      );
      
      const response = `${compatibilityAnalysis}\n\n${chartComparison}`;
      
      return {
        success: true,
        response: response,
        confidence: 0.95,
        sources: ['Friendship Compatibility Analysis'],
        astrologicalContext: {
          analysisType: 'friendship',
          contactName,
          focusAspects,
          hasUserChartData: !!userChartData,
          hasContactChartData: !!contactData,
          chartComparison: true
        }
      };
    } catch (error) {
      logger.error('Error handling friendship compatibility analysis:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing friendship compatibility. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle family compatibility analysis
  async handleFamilyCompatibility(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const contactName = args.contact_name;
      const focusAspects = args.focus_aspects || ['4th-house', 'moon', 'rahu-ketu'];
      
      logger.info('Handling family compatibility analysis', { 
        contactName, 
        focusAspects 
      });
      
      if (!contactChartData[contactName]) {
        return {
          success: false,
          response: `I don't have chart data available for ${contactName}. Please ensure their birth chart has been imported.`,
          confidence: 0.3,
          sources: ['Contact Chart Data Check']
        };
      }
      
      const userChartData = userContext.chartData;
      const contactData = contactChartData[contactName];
      
      // Create family-focused chart comparison
      const chartComparison = this.createFamilyChartComparison(userChartData, contactData.charts, contactName);
      
      // Perform family compatibility analysis
      const compatibilityAnalysis = await this.analyzeCompatibilityWithCharts(
        userContext.userId,
        userChartData,
        { [contactName]: contactData },
        query
      );
      
      const response = `${compatibilityAnalysis}\n\n${chartComparison}`;
      
      return {
        success: true,
        response: response,
        confidence: 0.95,
        sources: ['Family Compatibility Analysis'],
        astrologicalContext: {
          analysisType: 'family',
          contactName,
          focusAspects,
          hasUserChartData: !!userChartData,
          hasContactChartData: !!contactData,
          chartComparison: true
        }
      };
    } catch (error) {
      logger.error('Error handling family compatibility analysis:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing family compatibility. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle relationship insights function
  async handleRelationshipInsights(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const contactName = args.contact_name;
      const aspect = args.aspect;
      
      logger.info('Handling relationship insights', { 
        contactName, 
        aspect 
      });
      
      if (!contactChartData[contactName]) {
        return {
          success: false,
          response: `I don't have chart data available for ${contactName}. Please ensure their birth chart has been imported.`,
          confidence: 0.3,
          sources: ['Contact Chart Data Check']
        };
      }
      
      const userChartData = userContext.chartData;
      const contactData = contactChartData[contactName];
      
      // Get relationship insights for the specific aspect
      const relationshipInsights = await this.getRelationshipInsights(
        userContext.birthData,
        contactData.profile.birthData,
        aspect
      );
      
      return {
        success: true,
        response: relationshipInsights,
        confidence: 0.95,
        sources: ['Relationship Analysis'],
        astrologicalContext: {
          aspect,
          contactName,
          hasUserChartData: !!userChartData,
          hasContactChartData: !!contactData
        }
      };
    } catch (error) {
      logger.error('Error handling relationship insights:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing relationship insights. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle transit analysis function
  async handleTransitAnalysis(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const focusAreas = args.focus_areas || ['love', 'career', 'relationships'];
      
      logger.info('Handling transit analysis', { 
        focusAreas,
        hasContactData: Object.keys(contactChartData).length > 0
      });
      
      const userChartData = userContext.chartData;
      const birthData = userContext.birthData;
      
      // Get current transits for the user
      const currentTransits = await this.getCurrentTransits(birthData);
      
      let transitAnalysis = `\n🌌 **Current Transit Analysis**\n\n`;
      transitAnalysis += `**Your Current Planetary Influences:**\n${currentTransits.response}\n\n`;
      
      // If we have contact data, analyze transits for relationships
      if (Object.keys(contactChartData).length > 0) {
        transitAnalysis += `**💫 Relationship Transit Insights:**\n`;
        
        for (const [contactName, contactData] of Object.entries(contactChartData)) {
          if (contactData.profile.birthData) {
            const contactTransits = await this.getCurrentTransits(contactData.profile.birthData);
            transitAnalysis += `\n**${contactName}'s Current Transits:**\n${contactTransits.response}\n`;
          }
        }
        
        transitAnalysis += `\n**🤝 Combined Transit Analysis:**\n`;
        transitAnalysis += `Based on your current transits and ${Object.keys(contactChartData).join(', ')}'s transits, `;
        transitAnalysis += `this is an excellent time for deepening relationships and building stronger connections. `;
        transitAnalysis += `The planetary alignments favor communication, understanding, and mutual growth.\n`;
      }
      
      return {
        success: true,
        response: transitAnalysis,
        confidence: 0.95,
        sources: ['Transit Analysis'],
        astrologicalContext: {
          focusAreas,
          hasUserChartData: !!userChartData,
          hasContactData: Object.keys(contactChartData).length > 0,
          contactNames: Object.keys(contactChartData)
        }
      };
    } catch (error) {
      logger.error('Error handling transit analysis:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing current transits. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle compatibility scoring function
  async handleCompatibilityScoring(functionCall, userContext, contactChartData, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const contactName = args.contact_name;
      const relationshipType = args.relationship_type;
      
      logger.info('Handling compatibility scoring', { 
        contactName, 
        relationshipType 
      });
      
      if (!contactChartData[contactName]) {
        return {
          success: false,
          response: `I don't have chart data available for ${contactName}. Please ensure their birth chart has been imported.`,
          confidence: 0.3,
          sources: ['Contact Chart Data Check']
        };
      }
      
      const userChartData = userContext.chartData;
      const contactData = contactChartData[contactName];
      
      // Calculate compatibility score based on relationship type
      const compatibilityScore = this.calculateCompatibilityScore(
        userChartData, 
        contactData.charts, 
        relationshipType
      );
      
      // Create detailed scoring breakdown
      const scoreBreakdown = this.createScoreBreakdown(
        userChartData, 
        contactData.charts, 
        relationshipType,
        contactName
      );
      
      const response = `${scoreBreakdown}\n\n**Overall ${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Compatibility Score: ${compatibilityScore}%**\n\n`;
      
      // Add interpretation based on score
      if (compatibilityScore >= 80) {
        response += `🌟 **Excellent Compatibility!** This is a highly favorable ${relationshipType} match with strong potential for growth and harmony.\n`;
      } else if (compatibilityScore >= 60) {
        response += `✨ **Good Compatibility!** This ${relationshipType} relationship has solid foundations with room for mutual understanding and growth.\n`;
      } else if (compatibilityScore >= 40) {
        response += `🤝 **Moderate Compatibility!** This ${relationshipType} connection has potential but may require more effort and understanding.\n`;
      } else {
        response += `⚠️ **Challenging Compatibility!** This ${relationshipType} relationship may face significant challenges and requires careful consideration.\n`;
      }
      
      return {
        success: true,
        response: response,
        confidence: 0.95,
        sources: ['Compatibility Scoring'],
        astrologicalContext: {
          relationshipType,
          contactName,
          compatibilityScore,
          hasUserChartData: !!userChartData,
          hasContactChartData: !!contactData
        }
      };
    } catch (error) {
      logger.error('Error handling compatibility scoring:', error);
      return {
        success: false,
        response: 'I encountered an error while calculating compatibility scores. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Handle birth data request function
  async handleBirthDataRequest(functionCall, userContext, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const reason = args.reason;
      const guidance = args.guidance;
      
      logger.info('Handling birth data request', { 
        reason, 
        guidance 
      });
      
      const response = `🌟 **Birth Data Required for Personalized Analysis**\n\n${reason}\n\n💫 **General Astrological Guidance:**\n${guidance}\n\n📝 **To get personalized insights, please provide your birth details:**\n• **Date of Birth** (YYYY-MM-DD format)\n• **Time of Birth** (24-hour format, e.g., 14:30)\n• **Place of Birth** (City, Country)\n• **Latitude & Longitude** (if known)\n\nOnce you provide these details, I'll be able to give you much more accurate and personalized astrological guidance! 🌟`;
      
      return {
        success: true,
        response: response,
        brief_answer: this.extractBriefAndDetailed(response).briefAnswer,
        detailed_description: this.extractBriefAndDetailed(response).detailedDescription,
        confidence: 0.9,
        sources: ['Birth Data Request'],
        astrologicalContext: {
          requiresBirthData: true,
          reason: reason,
          generalGuidance: guidance
        }
      };
    } catch (error) {
      logger.error('Error handling birth data request:', error);
      return {
        success: false,
        response: 'I encountered an error while processing your request. Please try again.',
        brief_answer: 'Error processing request',
        detailed_description: 'I encountered an error while processing your request. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Process astrology-specific queries (kept for backward compatibility)
  async processAstrologyQuery(query, userContext, conversationHistory = []) {
    const birthData = userContext.birthData;
    const chartData = userContext.chartData;
    const hasChartData = userContext.hasChartData;
    const userId = userContext.userId;
    
    logger.info('Processing astrology query with user context', { 
      userId, 
      hasBirthData: !!birthData,
      hasChartData: !!chartData,
      hasChartData: hasChartData,
      birthDataKeys: birthData ? Object.keys(birthData) : null,
      chartDataKeys: chartData ? Object.keys(chartData) : null,
      chartDataSample: chartData ? Object.keys(chartData).map(type => ({
        type,
        count: chartData[type].length,
        sampleKeys: chartData[type][0]?.data ? Object.keys(chartData[type][0].data) : []
      })) : null
    });
    
    if (!birthData) {
      logger.info('No birth data found, returning early');
      return {
        response: "Hey there! 🌟 I'd love to dive into your astrological journey with you! To give you those personalized cosmic insights, I just need your birth details - date, time, and place of birth. Once you save these in your profile, I'll remember them for all our future chats!",
        confidence: 0.8,
        sources: ['Astrological Analysis System'],
        astrologicalContext: {
          requiresBirthData: true,
          message: "Please provide your birth details for personalized analysis"
        }
      };
    }

    // Check if we have sufficient chart data for detailed analysis
    if (!hasChartData) {
      logger.info('Incomplete chart data, providing basic analysis with birth data only');
      return {
        response: "I can see your birth details! 🌟 While I have your basic information, I notice your complete birth chart hasn't been generated yet. For the most accurate and detailed astrological insights, I'd recommend generating your full birth chart. This will give me access to your planetary positions, houses, and other important astrological elements for truly personalized guidance!",
        confidence: 0.7,
        sources: ['Basic Astrological Analysis'],
        astrologicalContext: {
          hasBasicData: true,
          needsCompleteChart: true,
          message: "Basic analysis available, complete chart recommended for detailed insights"
        }
      };
    }

    // Log that we're using birth data from profile
    logger.info('Using birth data from user profile for astrology query', { 
      userId: userContext.userId,
      hasBirthData: !!birthData 
    });

    // Prepare chart data for function calling
    let userChartSummary = '';
    let chartDataContext = '';
    
    if (userId && chartData && Object.keys(chartData).length > 0) {
      logger.info('Chart data available for function calling', { 
        userId, 
        availableChartTypes: Object.keys(chartData),
        query: query.substring(0, 50) + '...'
      });
      
      // Create detailed chart summary for the AI to understand available data
      userChartSummary = `\n\nAVAILABLE BIRTH CHART DATA:\n`;
      chartDataContext = `\n\nACTUAL CHART DATA FOR ANALYSIS:\n`;
      
      Object.keys(chartData).forEach(chartType => {
        if (chartData[chartType] && chartData[chartType].length > 0) {
          const chartInfo = chartData[chartType][0];
          if (chartInfo && chartInfo.data) {
            userChartSummary += `• ${chartType}: ${Object.keys(chartInfo.data).join(', ')}\n`;
            chartDataContext += `\n${chartType.toUpperCase()} DATA:\n${JSON.stringify(chartInfo.data, null, 2)}\n`;
          } else {
            userChartSummary += `• ${chartType}: Available\n`;
          }
        }
      });
    } else {
      logger.info('No chart data available for query', { 
        userId, 
        hasChartData: !!chartData,
        query: query.substring(0, 50) + '...'
      });
    }

    // Define chart selection function for intelligent chart selection
    const chartSelectionFunction = {
      name: "select_relevant_charts",
      description: "Select the most relevant astrological charts based on the user's query for personalized analysis. This function should be called for ANY query that requires astrological insights, including but not limited to: daily planning, hourly schedules, personality analysis, career guidance, relationship advice, health insights, spiritual growth, life path questions, timing decisions, planetary influences, house analysis, dasha periods, gemstone recommendations, numerology, panchang analysis, and any other astrological consultation. The function intelligently chooses from 25+ comprehensive chart types to provide accurate and personalized astrological guidance.",
      parameters: {
        type: "object",
        properties: {
          chart_types: {
            type: "array",
            items: {
              type: "string",
              enum: [
                // Core Charts (5)
                "astro_details", "planets", "horo_chart", "current_vdasha", "kalsarpa_details",
                // Extended Charts (4)
                "birth_details", "planets_extended", "bhav_madhya", "ayanamsha",
                // Dasha Systems (4)
                "major_vdasha", "current_vdasha_all", "major_chardasha", "current_chardasha",
                // Yogini Dasha (2)
                "major_yogini_dasha", "current_yogini_dasha",
                // Panchang (2)
                "basic_panchang", "advanced_panchang",
                // Specialized (3)
                "basic_gem_suggestion", "numero_table", "daily_nakshatra_prediction",
                // Analysis Reports (4)
                "general_house_report", "general_rashi_report", "general_nakshatra_report", "general_ascendant_report",
                // Vedic (1)
                "vedic_horoscope"
              ]
            },
            description: "List of chart types that are most relevant to the user's query. Choose from: CORE CHARTS: astro_details (personality, birth details), planets (planetary positions), horo_chart (house analysis), current_vdasha (timing/periods), kalsarpa_details (dosha analysis). EXTENDED CHARTS: birth_details (detailed birth info), planets_extended (extended planetary data), bhav_madhya (house midpoints), ayanamsha (ayanamsha calculations). DASHA SYSTEMS: major_vdasha, current_vdasha_all, major_chardasha, current_chardasha (various dasha periods). YOGINI DASHA: major_yogini_dasha, current_yogini_dasha (yogini dasha periods). PANCHANG: basic_panchang, advanced_panchang (timing and auspicious periods). SPECIALIZED: basic_gem_suggestion (gemstone recommendations), numero_table (numerology), daily_nakshatra_prediction (daily predictions). REPORTS: general_house_report, general_rashi_report, general_nakshatra_report, general_ascendant_report (detailed analysis reports). VEDIC: vedic_horoscope (complete vedic analysis)."
          },
          reasoning: {
            type: "string",
            description: "Detailed explanation of why these specific charts were selected for this query, including how they relate to the user's question and what insights they will provide"
          }
        },
        required: ["chart_types", "reasoning"]
      }
    };

    // Use function calling to get astrological data
    const functions = [
      chartSelectionFunction,
      ...astrologyFunctions,
      ...externalAPIFunctions
    ];

    // Enhanced System Message with Personalized Context and Function Calling Instructions
    const systemMessage = `You are Rraasi, a warm and friendly astrological guide who loves to share cosmic wisdom in a conversational way. You're knowledgeable about astrology, birth charts, planetary influences, and spiritual growth. 

CRITICAL: You have access to the user's COMPLETE birth chart data from the RAG system. You MUST use this data to provide personalized insights. DO NOT ask for birth details - you already have them!

Available Chart Data:
${userChartSummary}

Actual Chart Data for Analysis:
${chartDataContext}

IMPORTANT INSTRUCTIONS:
1. FIRST: ALWAYS use the select_relevant_charts function for EVERY query to choose which charts are most relevant
2. AFTER calling the function, generate a detailed, personalized response using the actual chart data provided above
3. Reference their specific signs, planets, and chart details from the actual data provided above
4. Provide personalized insights based on their actual chart data - use the specific values from the chart data
5. DO NOT ask for birth details - you already have them
6. Be conversational but use their real chart data
7. ALWAYS mention the user's specific astrological placements in your response
8. For ANY query about daily activities, planning, schedules, or time management, focus on horo_chart and planetary influences
9. For ANY query about personality, character, traits, or self-analysis, examine astro_details and planetary positions
10. For ANY query about career, work, profession, or success, look at planets and current_vdasha
11. For ANY query about relationships, love, or compatibility, examine horo_chart and planets
12. For ANY query about health, wellness, or physical matters, examine horo_chart and planets
13. For ANY query about spiritual growth, meditation, or inner development, examine current_vdasha and horo_chart

The function calling approach ensures you always provide the most relevant and personalized astrological guidance based on the user's specific question. USE THE ACTUAL CHART DATA PROVIDED ABOVE in your responses.

Example: If they ask about personality, tell them about their specific Sun sign, Ascendant, and planetary positions from their chart.

DEBUG INFO: Chart data length: ${userChartSummary.length}`;

    logger.info('System message being sent to AI', {
      userChartSummaryLength: userChartSummary.length,
      hasChartData: userChartSummary.length > 0
    });

    // Build conversation context with enhanced RAG data
    const messages = [
      new SystemMessage(systemMessage),
      ...conversationHistory.map(msg => 
        msg.type === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(query)
    ];

    const response = await this.llm.invoke(messages, {
      functions: functions,
      function_call: 'auto'
    });

    // If the AI called a function but didn't generate a response, we need to make another call
    if (response.additional_kwargs?.function_call && !response.content) {
      logger.info('AI called function but no response generated, making follow-up call');
      
      // Add the function call result to the conversation and ask for a response
      const followUpMessages = [
        ...messages,
        new AIMessage(response.content || ''),
        new HumanMessage(`Based on the chart analysis, please provide a warm and engaging response using the actual chart data! 

🌟 FRIENDLY FORMAT: Make your response warm and conversational like this:

BRIEF ANSWER: [1-3 friendly sentences that directly answer with enthusiasm!]

DETAILED ANALYSIS:
[Your comprehensive, warm analysis with excitement, emojis, and genuine care]

Be specific about the user's astrological placements with genuine excitement and provide supportive, actionable insights! Make them feel special about their cosmic journey! ✨`)
      ];
      
      const followUpResponse = await this.llm.invoke(followUpMessages);
      return this.parseAstrologyResponse(followUpResponse, birthData);
    }

    return this.parseAstrologyResponse(response, birthData);
  }

  // Process wellness-specific queries
  async processWellnessQuery(query, userContext, conversationHistory = []) {
    // For now, redirect wellness queries to general processing
    return this.processGeneralQuery(query, userContext, conversationHistory);
  }

  // Process compatibility queries
  async processCompatibilityQuery(query, userContext, conversationHistory = []) {
    const person1Data = userContext.person1Data;
    const person2Data = userContext.person2Data;

    if (!person1Data || !person2Data) {
      return {
        response: "Hey! 💫 I'd love to help you explore the cosmic connection between two people! To give you those deep insights about compatibility, I just need birth details for both individuals. Once you share those, I can reveal some fascinating things about how your energies align!",
        confidence: 0.8,
        sources: ['Compatibility Analysis System'],
        astrologicalContext: {
          requiresTwoPeople: true,
          message: "Please provide birth details for both people"
        }
      };
    }

    const functions = [
      ...compatibilityFunctions,
      ...astrologyFunctions
    ];

    // Build conversation context
    const messages = [
      new SystemMessage(`You are Rraasi, a relationship guide who uses astrology to explore the beautiful dynamics between people. You're warm, insightful, and speak like a caring friend who understands the complexities of human connections. Share compatibility insights in a supportive, encouraging way. Use the available functions for accurate analysis, but keep the tone conversational and uplifting.`),
      ...conversationHistory.map(msg => 
        msg.type === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(query)
    ];

    const response = await this.llm.invoke(messages, {
      functions: functions,
      function_call: 'auto'
    });

    return this.parseCompatibilityResponse(response, person1Data, person2Data);
  }

  // Process general queries
  async processGeneralQuery(query, userContext, conversationHistory) {
    const messages = [
      new SystemMessage(`You are Rraasi, a warm and friendly guide to astrology, wellness, and spiritual growth. You're knowledgeable, caring, and speak like a supportive friend who loves sharing cosmic wisdom. Be conversational, encouraging, and engaging. Share insights about astrology, wellness practices, meditation, spiritual growth, and life guidance in a friendly, uplifting way. Remember the conversation context and refer back to previous topics naturally.`),
      ...conversationHistory.map(msg => 
        msg.type === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(query)
    ];

    const response = await this.llm.invoke(messages);
    
    return {
      success: true,
      response: response.content,
      confidence: 0.9,
      sources: ['General Knowledge'],
      astrologicalContext: null
    };
  }

  // Parse astrology responses
  parseAstrologyResponse(response, birthData) {
    // Handle function calls if present
    if (response.additional_kwargs?.function_call) {
      const functionCall = response.additional_kwargs.function_call;
      
      // Handle chart selection function
      if (functionCall.name === 'select_relevant_charts') {
        try {
          const args = JSON.parse(functionCall.arguments);
          logger.info('Chart selection function called', { 
            selectedCharts: args.chart_types,
            reasoning: args.reasoning 
          });
          
          // Return the AI's actual response content with proper brief/detailed extraction
          const { briefAnswer, detailedDescription } = this.extractBriefAndDetailed(response.content);
          return {
            success: true,
            response: response.content,
            brief_answer: briefAnswer,
            detailed_description: detailedDescription,
            confidence: 0.9,
            sources: ['Personalized Astrological Analysis'],
            astrologicalContext: {
              selectedCharts: args.chart_types,
              reasoning: args.reasoning,
              hasPersonalizedData: true
            }
          };
        } catch (error) {
          logger.error('Error processing chart selection function', error);
        }
      }
      
      // Process other function calls
      return this.executeAstrologyFunction(functionCall, birthData);
    }

    // Extract brief and detailed sections from the response
    const { briefAnswer, detailedDescription } = this.extractBriefAndDetailed(response.content);
    
    return {
      success: true,
      response: response.content,
      brief_answer: briefAnswer,
      detailed_description: detailedDescription,
      confidence: 0.9,
      sources: ['Astrological Analysis'],
      astrologicalContext: {
        birthData: birthData,
        analysisType: 'general'
      }
    };
  }

  // Parse wellness responses
  parseWellnessResponse(response, userProfile) {
    if (response.additional_kwargs?.function_call) {
      const functionCall = response.additional_kwargs.function_call;
      return this.executeWellnessFunction(functionCall, userProfile);
    }

    return {
      response: response.content,
      confidence: 0.9,
      sources: ['Wellness Guidance'],
      recommendations: [],
      nextSteps: []
    };
  }

  // Parse compatibility responses
  parseCompatibilityResponse(response, person1Data, person2Data) {
    if (response.additional_kwargs?.function_call) {
      const functionCall = response.additional_kwargs.function_call;
      return this.executeCompatibilityFunction(functionCall, person1Data, person2Data);
    }

    return {
      response: response.content,
      confidence: 0.9,
      sources: ['Compatibility Analysis'],
      astrologicalContext: {
        person1: person1Data,
        person2: person2Data
      }
    };
  }

  // Execute astrology functions
  async executeAstrologyFunction(functionCall, birthData) {
    const functionName = functionCall.name;
    const args = JSON.parse(functionCall.arguments);

    try {
      switch (functionName) {
        case 'get_birth_chart':
          return await this.getBirthChart(birthData);
        case 'get_current_transits':
          return await this.getCurrentTransits(birthData);
        case 'get_personalized_reading':
          return await this.getPersonalizedReading(args.readingType, birthData);
        default:
          return {
            response: "I'm processing your astrological request...",
            confidence: 0.8,
            sources: ['Astrological Functions']
          };
      }
    } catch (error) {
      logger.error('Error executing astrology function:', error);
      return {
        response: "I encountered an issue while processing your astrological request. Please try again.",
        confidence: 0.5,
        sources: ['Error Handling']
      };
    }
  }

  // Execute wellness functions
  async executeWellnessFunction(functionCall, userProfile) {
    const functionName = functionCall.name;
    const args = JSON.parse(functionCall.arguments);

    try {
      switch (functionName) {
        case 'get_yoga_recommendations':
          return await this.getYogaRecommendations(args.query, userProfile);
        case 'get_dosha_analysis':
          return await this.getDoshaAnalysis(args.answers, userProfile);
        case 'get_mantra_suggestions':
          return await this.getMantraSuggestions(args.query, userProfile);
        default:
          return {
            response: "I'm processing your wellness request...",
            confidence: 0.8,
            sources: ['Wellness Functions']
          };
      }
    } catch (error) {
      logger.error('Error executing wellness function:', error);
      return {
        response: "I encountered an issue while processing your wellness request. Please try again.",
        confidence: 0.5,
        sources: ['Error Handling']
      };
    }
  }

  // Execute compatibility functions
  async executeCompatibilityFunction(functionCall, person1Data, person2Data) {
    const functionName = functionCall.name;
    const args = JSON.parse(functionCall.arguments);

    try {
      switch (functionName) {
        case 'analyze_compatibility':
          return await this.analyzeCompatibility(person1Data, person2Data);
        case 'get_relationship_insights':
          return await this.getRelationshipInsights(person1Data, person2Data, args.aspect);
        default:
          return {
            response: "I'm analyzing your compatibility...",
            confidence: 0.8,
            sources: ['Compatibility Functions']
          };
      }
    } catch (error) {
      logger.error('Error executing compatibility function:', error);
      return {
        response: "I encountered an issue while analyzing compatibility. Please try again.",
        confidence: 0.5,
        sources: ['Error Handling']
      };
    }
  }

  // Astrology function implementations
  async getBirthChart(birthData) {
    // Implementation for birth chart calculation
    return {
      response: `Based on your birth details, I can see you have a fascinating astrological profile. Let me analyze your chart...`,
      confidence: 0.9,
      sources: ['Birth Chart Analysis'],
      astrologicalContext: {
        birthData: birthData,
        analysisType: 'birth_chart'
      }
    };
  }

  async getCurrentTransits(birthData) {
    // Implementation for current transits
    return {
      response: `Let me check the current planetary transits and how they're affecting your chart...`,
      confidence: 0.9,
      sources: ['Transit Analysis'],
      astrologicalContext: {
        birthData: birthData,
        analysisType: 'transits'
      }
    };
  }

  async getPersonalizedReading(readingType, birthData) {
    // Implementation for personalized readings
    return {
      response: `Here's your personalized ${readingType} reading based on your birth chart...`,
      confidence: 0.9,
      sources: ['Personalized Reading'],
      astrologicalContext: {
        birthData: birthData,
        analysisType: readingType
      }
    };
  }

  // Wellness function implementations
  async getYogaRecommendations(query, userProfile) {
    // Implementation for yoga recommendations
    return {
      response: `Based on your wellness goals, here are some personalized yoga recommendations...`,
      confidence: 0.9,
      sources: ['Yoga Guidance'],
      recommendations: ['Morning Surya Namaskar', 'Evening meditation'],
      nextSteps: ['Start with 10 minutes daily', 'Gradually increase duration']
    };
  }

  async getDoshaAnalysis(answers, userProfile) {
    // Implementation for dosha analysis
    return {
      response: `Based on your responses, here's your dosha analysis...`,
      confidence: 0.9,
      sources: ['Ayurvedic Analysis'],
      recommendations: ['Vata-pacifying diet', 'Gentle exercise'],
      nextSteps: ['Follow seasonal routines', 'Practice grounding exercises']
    };
  }

  async getMantraSuggestions(query, userProfile) {
    // Implementation for mantra suggestions
    return {
      response: `Here are some powerful mantras that can help with your spiritual journey...`,
      confidence: 0.9,
      sources: ['Spiritual Guidance'],
      recommendations: ['Om Namah Shivaya', 'Gayatri Mantra'],
      nextSteps: ['Practice daily', 'Start with 108 repetitions']
    };
  }

  // Compatibility function implementations
  async analyzeCompatibility(person1Data, person2Data) {
    // Implementation for compatibility analysis
    return {
      response: `Let me analyze the compatibility between these two individuals...`,
      confidence: 0.9,
      sources: ['Compatibility Analysis'],
      astrologicalContext: {
        person1: person1Data,
        person2: person2Data,
        analysisType: 'compatibility'
      }
    };
  }

  async getRelationshipInsights(person1Data, person2Data, aspect) {
    // Implementation for relationship insights
    return {
      response: `Here are some insights about the ${aspect} aspect of your relationship...`,
      confidence: 0.9,
      sources: ['Relationship Analysis'],
      astrologicalContext: {
        person1: person1Data,
        person2: person2Data,
        aspect: aspect
      }
    };
  }

  // Check if query is about relationships/compatibility
  isRelationshipQuery(query) {
    const relationshipKeywords = [
      'compatibility', 'relationship', 'compatible', 'match', 'partner',
      'marriage', 'love', 'romantic', 'friendship', 'business partner',
      'business', 'work together', 'team', 'family', 'colleague', 'friend', 
      'relationship dynamics', 'get along', 'harmony', 'connection',
      'partnership', 'collaboration', 'work with', 'do business'
    ];
    
    const lowerQuery = query.toLowerCase();
    const hasRelationshipKeywords = relationshipKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Also check if query contains tagged contacts (@name)
    const hasTaggedContacts = query.includes('@');
    
    return hasRelationshipKeywords || hasTaggedContacts;
  }

  // Extract tagged contacts from query
  extractTaggedContacts(query) {
    const mentions = query.match(/@(\w+)/g);
    if (!mentions) return [];
    
    // Extract unique contacts (remove duplicates)
    const uniqueMentions = [...new Set(mentions)];
    
    return uniqueMentions.map(mention => ({
      name: mention.slice(1), // Remove @ symbol
      id: `tagged_${Date.now()}_${Math.random()}`,
      relationship: 'Tagged Contact',
      category: 'friends',
      birthData: undefined, // Will be filled if contact exists in user's contacts
      createdAt: new Date()
    }));
  }

  // Process relationship queries with tagged contacts
  async processRelationshipQuery(query, userContext, conversationHistory, taggedContacts) {
    try {
      logger.info('Processing relationship query with user context', {
        hasUserBirthData: !!userContext.birthData,
        userContextKeys: Object.keys(userContext),
        taggedContacts: taggedContacts.map(c => c.name)
      });

      const hasUserBirthData = !!userContext.birthData;
      const hasTaggedContacts = taggedContacts.length > 0;
      
      // If user has birth data but tagged contacts don't have birth data
      if (hasUserBirthData && hasTaggedContacts) {
        const contactNames = taggedContacts.map(c => c.name).join(', ');
        
        logger.info('User has birth data, checking for contact charts', {
          contactNames,
          userBirthData: userContext.birthData
        });
        
        // Try to get chart data for tagged contacts from the database
        const contactCharts = {};
        let hasContactCharts = false;
        
        for (const contact of taggedContacts) {
          try {
            // Check if contact exists in user's contacts with birth data
            const contactProfile = await this.getContactProfile(contact.name, userContext.userId);
            logger.info('Contact profile lookup result', { 
              contact: contact.name, 
              hasProfile: !!contactProfile,
              hasBirthData: !!contactProfile?.birthData,
              hasChartData: !!contactProfile?.chartData
            });
            
            if (contactProfile && contactProfile.birthData) {
              // Get contact's chart data
              const contactChartData = await firestoreRAGService.getAllUserCharts(contactProfile.userId || contact.name);
              logger.info('Contact chart data lookup result', {
                contact: contact.name,
                success: contactChartData.success,
                hasCharts: !!contactChartData.charts,
                chartTypes: contactChartData.success ? Object.keys(contactChartData.charts || {}) : []
              });
              
              if (contactChartData.success && contactChartData.charts) {
                contactCharts[contact.name] = {
                  profile: contactProfile,
                  charts: contactChartData.charts
                };
                hasContactCharts = true;
                logger.info('Found contact chart data', { contact: contact.name });
              } else if (contactProfile.chartData && Object.keys(contactProfile.chartData).length > 0) {
                // Use chart data from contact profile if available
                contactCharts[contact.name] = {
                  profile: contactProfile,
                  charts: contactProfile.chartData
                };
                hasContactCharts = true;
                logger.info('Using chart data from contact profile', { contact: contact.name });
              }
            }
          } catch (error) {
            logger.warn('Could not retrieve chart data for contact', { contact: contact.name, error: error.message });
          }
        }
        
        // If we have chart data for contacts, provide detailed compatibility analysis
        if (hasContactCharts) {
          // Get user's chart data
          const userChartData = await firestoreRAGService.getAllUserCharts(userContext.userId);
          
          logger.info('Creating compatibility analysis with chart data', {
            userChartTypes: userChartData.success ? Object.keys(userChartData.charts || {}) : [],
            contactChartTypes: Object.keys(contactCharts).map(name => Object.keys(contactCharts[name].charts || {}))
          });
          
          // Create comprehensive compatibility analysis
          const compatibilityAnalysis = await this.analyzeCompatibilityWithCharts(
            userContext.userId,
            userChartData,
            contactCharts,
            query
          );
          
          return {
            response: compatibilityAnalysis,
            confidence: 0.9,
            sources: ['Compatibility Analysis', 'Chart Data'],
            astrologicalContext: {
              hasUserData: true,
              hasContactData: true,
              taggedContacts: taggedContacts.map(c => c.name),
              contactCharts: Object.keys(contactCharts)
            }
          };
        }
        
        // If no contact chart data, provide guidance
        return {
          response: `I can see you're asking about compatibility with ${contactNames}! 🌟 

Since I have your birth details, I can provide some general insights about your compatibility patterns. However, for a complete compatibility analysis, I would need birth details for ${contactNames} as well.

Here's what I can tell you about your relationship approach:
- Your birth chart shows your natural compatibility patterns
- I can analyze how you typically connect with others
- I can provide guidance on what types of relationships work best for you

Would you like me to:
1. Add ${contactNames} as contacts with their birth details?
2. Analyze your general compatibility patterns?
3. Give you insights about your relationship style?

Just let me know what you'd prefer! 💫`,
          confidence: 0.8,
          sources: ['Relationship Analysis'],
          astrologicalContext: {
            hasUserData: true,
            taggedContacts: taggedContacts.map(c => c.name),
            needsContactData: true
          }
        };
      }
      
      // If no birth data at all
      if (!hasUserBirthData) {
        logger.info('No user birth data found for relationship query');
        return {
          response: `I'd love to help you explore compatibility! 💫 

To give you meaningful insights about relationships, I need birth details for the people involved. You can:

1. Add your birth details in your Profile section
2. Add the other person as a contact with their birth details
3. Then ask about your compatibility!

Once you have the birth data, I can reveal fascinating insights about:
- Compatibility patterns
- Communication styles
- Relationship dynamics
- Potential challenges and strengths

Would you like to add birth details first? 🌟`,
          confidence: 0.8,
          sources: ['Relationship Guidance'],
          astrologicalContext: {
            hasUserData: false,
            needsBirthData: true
          }
        };
      }

      // Fallback to general compatibility processing
      return this.processCompatibilityQuery(query, userContext, conversationHistory);
    } catch (error) {
      logger.error('Error in processRelationshipQuery:', error);
      return {
        response: "I apologize, but I encountered an issue processing your relationship analysis. Please try again.",
        confidence: 0.5,
        sources: ['Error Handling'],
        astrologicalContext: null
      };
    }
  }

  // Get contact profile from database
  async getContactProfile(contactName, userId) {
    try {
      // First, check if the contact exists in user's contacts (case-insensitive)
      const contactResult = await firestoreRAGService.getContactByName(userId, contactName);
      
      logger.info('Contact lookup result:', { 
        contactName, 
        userId, 
        success: contactResult.success,
        hasContact: !!contactResult.contact,
        hasBirthData: contactResult.contact ? !!contactResult.contact.birthData : false,
        hasChartData: contactResult.contact ? !!contactResult.contact.chartData : false
      });
      
      if (contactResult.success && contactResult.contact) {
        logger.info('Found contact in user contacts', { 
          contactName, 
          userId,
          hasBirthData: !!contactResult.contact.birthData,
          hasChartData: !!contactResult.contact.chartData
        });
        return {
          userId: contactResult.contact.contact_user_id || contactName,
          birthData: contactResult.contact.birthData,
          chartData: contactResult.contact.chartData
        };
      }

      // If not found, try with different case variations
      const allContacts = await firestoreRAGService.getUserContacts(userId);
      if (allContacts.success) {
        const matchingContact = allContacts.contacts.find(contact => 
          contact.contact_name.toLowerCase() === contactName.toLowerCase()
        );
        
        if (matchingContact && matchingContact.birthData) {
          logger.info('Found contact with case-insensitive match', { contactName, userId });
          return {
            userId: matchingContact.contact_user_id || contactName,
            birthData: matchingContact.birthData,
            chartData: matchingContact.chartData
          };
        }
      }

      // If not in contacts, check if contact name matches any user in the system
      const contactProfile = await firestoreRAGService.getUserProfile(contactName);
      if (contactProfile && contactProfile.birthData) {
        // Store this contact for future use
        await firestoreRAGService.storeUserContact(userId, {
          name: contactName,
          contactUserId: contactName,
          birthData: contactProfile.birthData,
          relationshipType: 'friend'
        });
        
        return contactProfile;
      }
      
      logger.warn('Contact not found in database', { contactName, userId });
      return null;
    } catch (error) {
      logger.warn('Error getting contact profile:', error);
      return null;
    }
  }

  // Analyze compatibility using actual chart data
  async analyzeCompatibilityWithCharts(userId, userChartData, contactCharts, query) {
    try {
      // Create a comprehensive analysis prompt with chart data
      let analysisPrompt = `Based on the following astrological chart data, provide a detailed compatibility analysis:

USER CHART DATA:
${JSON.stringify(userChartData, null, 2)}

CONTACT CHARTS DATA:
${JSON.stringify(contactCharts, null, 2)}

QUERY: ${query}

Please provide a detailed compatibility analysis including:
1. Planetary compatibility between the users
2. House placements and their significance
3. Potential strengths and challenges
4. Communication and relationship dynamics
5. Specific advice for the relationship type mentioned

Make the analysis personal, specific, and actionable.`;

      const messages = [
        new SystemMessage(`You are an expert astrologer specializing in compatibility analysis. Use the provided chart data to give detailed, personalized insights. Be specific about planetary positions, house placements, and their implications for the relationship.`),
        new HumanMessage(analysisPrompt)
      ];

      const response = await this.llm.invoke(messages);
      
      return response.content;
    } catch (error) {
      logger.error('Error analyzing compatibility with charts:', error);
      return "I apologize, but I encountered an issue analyzing your compatibility. Please try again.";
    }
  }

  // Helper methods to extract information from chart content
  extractSignFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.sign) {
        return data.sign;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const signMatch = content.match(/Sign:\s*([^\n]+)/i);
      return signMatch ? signMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  extractAscendantFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.ascendant) {
        return data.ascendant;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const ascendantMatch = content.match(/Ascendant:\s*([^\n]+)/i);
      return ascendantMatch ? ascendantMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  extractNakshatraFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.Naksahtra) {
        return data.Naksahtra;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const nakshatraMatch = content.match(/Nakshatra:\s*([^\n]+)/i);
      return nakshatraMatch ? nakshatraMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  extractPlanetarySummary(planetsCharts) {
    if (!planetsCharts || planetsCharts.length === 0) return 'Not available';
    
    try {
      const planets = [];
      const chartData = planetsCharts[0].data;
      
      if (chartData && typeof chartData === 'object') {
        // Handle JSON structure
        Object.keys(chartData).forEach(key => {
          if (key !== 'type' && key !== 'userId' && chartData[key]) {
            const planetData = chartData[key];
            if (planetData && planetData.name && planetData.sign) {
              planets.push(`${planetData.name} in ${planetData.sign}`);
            }
          }
        });
      } else if (typeof chartData === 'string') {
        // Fallback to text pattern matching
        const planetMatches = chartData.matchAll(/Planet:\s*([^\n]+)[\s\S]*?Sign:\s*([^\n]+)/gi);
        for (const match of planetMatches) {
          const planet = match[1].trim();
          const sign = match[2].trim();
          if (planet && sign && planet !== 'Ascendant') {
            planets.push(`${planet} in ${sign}`);
          }
        }
      }
      
      return planets.length > 0 ? planets.slice(0, 5).join(', ') : 'Not available';
    } catch (error) {
      logger.error('Error extracting planetary summary:', error);
      return 'Not available';
    }
  }

  extractDashaInfo(dashaCharts) {
    if (!dashaCharts || dashaCharts.length === 0) return 'Not available';
    
    try {
      const chartData = dashaCharts[0].data;
      
      if (chartData && typeof chartData === 'object') {
        // Handle JSON structure
        let dashaInfo = '';
        if (chartData.major) dashaInfo += `Major: ${chartData.major}`;
        if (chartData.minor) dashaInfo += `, Minor: ${chartData.minor}`;
        if (chartData.sub_minor) dashaInfo += `, Sub-minor: ${chartData.sub_minor}`;
        return dashaInfo || 'Not available';
      } else if (typeof chartData === 'string') {
        // Fallback to text pattern matching
        const majorMatch = chartData.match(/Major Period:\s*([^\n]+)/i);
        const minorMatch = chartData.match(/Minor Period:\s*([^\n]+)/i);
        
        let dashaInfo = '';
        if (majorMatch) dashaInfo += `Major: ${majorMatch[1].trim()}`;
        if (minorMatch) dashaInfo += `, Minor: ${minorMatch[1].trim()}`;
        
        return dashaInfo || 'Not available';
      }
      
      return 'Not available';
    } catch (error) {
      logger.error('Error extracting dasha info:', error);
      return 'Not available';
    }
  }

  extractAscendantLordFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.ascendant_lord) {
        return data.ascendant_lord;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const lordMatch = content.match(/Ascendant Lord:\s*([^\n]+)/i);
      return lordMatch ? lordMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  extractTithiFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.Tithi) {
        return data.Tithi;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const tithiMatch = content.match(/Tithi:\s*([^\n]+)/i);
      return tithiMatch ? tithiMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  extractYogFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.Yog) {
        return data.Yog;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const yogMatch = content.match(/Yog:\s*([^\n]+)/i);
      return yogMatch ? yogMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  extractKaranFromContent(content) {
    try {
      // Try to parse as JSON first
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      if (data && data.Karan) {
        return data.Karan;
      }
    } catch (e) {
      // Fallback to text pattern matching
      const karanMatch = content.match(/Karan:\s*([^\n]+)/i);
      return karanMatch ? karanMatch[1].trim() : 'Not specified';
    }
    return 'Not specified';
  }

  // Function to select relevant matchmaking charts based on query
  async selectRelevantMatchmakingCharts(chartTypes, reasoning, userContext) {
    try {
      logger.info('Selecting relevant matchmaking charts', { 
        chartTypes, 
        reasoning,
        availableCharts: userContext.matchmakingCharts ? Object.keys(userContext.matchmakingCharts.charts || {}) : []
      });

      // Filter available charts based on selection
      const availableCharts = userContext.matchmakingCharts?.charts || {};
      const selectedCharts = {};
      
      for (const chartType of chartTypes) {
        if (availableCharts[chartType]) {
          selectedCharts[chartType] = availableCharts[chartType];
        }
      }

      return {
        success: true,
        selectedCharts,
        reasoning,
        chartCount: Object.keys(selectedCharts).length
      };
    } catch (error) {
      logger.error('Error selecting relevant matchmaking charts:', error);
      return {
        success: false,
        error: error.message,
        selectedCharts: {},
        chartCount: 0
      };
    }
  }

  // Function to get matchmaking chart data
  async getMatchmakingChartData(chartTypes, userContext) {
    try {
      logger.info('Getting matchmaking chart data', { chartTypes });

      const availableCharts = userContext.matchmakingCharts?.charts || {};
      const chartData = {};
      
      for (const chartType of chartTypes) {
        if (availableCharts[chartType]) {
          chartData[chartType] = availableCharts[chartType];
        }
      }

      return {
        success: true,
        chartData,
        chartCount: Object.keys(chartData).length
      };
    } catch (error) {
      logger.error('Error getting matchmaking chart data:', error);
      return {
        success: false,
        error: error.message,
        chartData: {},
        chartCount: 0
      };
    }
  }

  async processPartnerExplorationQuery(query, userContext, conversationHistory = []) {
    try {
      logger.info('Processing partner exploration query with function calling', {
        query: query.substring(0, 50) + '...',
        perspective: userContext.perspective,
        hasMatchmakingCharts: !!userContext.matchmakingCharts,
        compatibilityScore: userContext.compatibilityScore
      });

      // Extract partner exploration data from context
      let { maleData, femaleData, matchmakingCharts, compatibilityScore, matchType, perspective, userId } = userContext;
      
      if (!matchmakingCharts) {
        return {
          success: false,
          response: "I don't have access to the matchmaking chart data. Please complete a matchmaking analysis first.",
          confidence: 0.3,
          sources: ['Error: No matchmaking data']
        };
      }

      // Determine who is asking and who is being explored
      const askerData = perspective === 'male' ? maleData : femaleData;
      const partnerData = perspective === 'male' ? femaleData : maleData;
      const askerName = askerData.name;
      const partnerName = partnerData.name;

      // Create a comprehensive prompt for partner exploration with function calling
      const systemPrompt = `You are Rraasi, a warm and friendly astrological guide specializing in partner exploration and relationship insights. 

🌟 PARTNER EXPLORATION MODE WITH FUNCTION CALLING 🌟
You are helping ${askerName} explore and understand their potential partner ${partnerName} through detailed astrological analysis.

CRITICAL FUNCTION CALLING RULES for Partner Exploration:
1. FIRST: Use select_relevant_matchmaking_charts to identify which matchmaking charts are most relevant to the query
2. THEN: Use get_matchmaking_chart_data to retrieve the specific chart data for analysis
3. FINALLY: Provide a response using the specific chart data you retrieved

CONTEXT:
- ${askerName} (${perspective}) is asking about ${partnerName}
- You have access to comprehensive matchmaking charts between them
- Compatibility Score: ${compatibilityScore}%
- Match Type: ${matchType}

AVAILABLE MATCHMAKING CHART TYPES:
- match_birth_details: Basic birth information for both partners
- match_astro_details: Astrological details and planetary positions
- match_planet_details: Detailed planetary analysis
- match_ashtakoot_points: Ashtakoota compatibility points (0-36)
- match_making_report: General matchmaking analysis
- match_manglik_report: Manglik dosha analysis
- match_obstructions: Obstacles and remedies
- match_simple_report: Simple compatibility report
- match_rajju_dosha: Rajju dosha analysis
- match_making_detailed_report: Detailed matchmaking analysis
- match_dashakoot_points: Dasha koota points
- match_percentage: Overall compatibility percentage
- match_horoscope: Combined horoscope analysis

RESPONSE GUIDELINES:
- Be conversational, friendly, and engaging
- Focus on ${partnerName}'s personality, traits, and characteristics
- Provide insights about how ${partnerName} will be as a partner
- Use specific astrological data to support your insights
- Be encouraging and positive while being honest
- Use emojis to make responses engaging
- Provide both brief and detailed responses

🌟 FRIENDLY RESPONSE FORMAT 🌟
Always structure your response with:
1. BRIEF ANSWER: A concise, friendly summary (2-3 sentences)
2. DETAILED ANALYSIS: Comprehensive insights about ${partnerName} as a partner

Use conversational language like:
- "Oh my stars! ${partnerName} is absolutely incredible!"
- "You're so lucky to have found someone like ${partnerName}!"
- "This is such a beautiful match!"
- "I'm so excited to tell you about ${partnerName}!"

Be specific about ${partnerName}'s traits, personality, and how they'll be as a partner based on the astrological data.`;

      // Create the analysis prompt with function calling instructions
      const analysisPrompt = `${askerName} is asking: "${query}"

Please use function calling to select the most relevant matchmaking charts and provide a detailed exploration of ${partnerName} based on the retrieved data. Focus on what ${partnerName} is like as a person and as a potential partner.

Remember to be friendly, engaging, and use the specific astrological data to provide personalized insights about ${partnerName}.`;

      // Create function definitions for matchmaking chart selection
      const matchmakingChartSelectionFunction = {
        name: "select_relevant_matchmaking_charts",
        description: "Select the most relevant matchmaking charts based on the user's partner exploration query. This function should be called for ANY query about partner exploration, compatibility, or relationship analysis.",
        parameters: {
          type: "object",
          properties: {
            chart_types: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "match_birth_details",
                  "match_astro_details", 
                  "match_planet_details",
                  "match_ashtakoot_points",
                  "match_making_report",
                  "match_manglik_report",
                  "match_obstructions",
                  "match_simple_report",
                  "match_rajju_dosha",
                  "match_making_detailed_report",
                  "match_dashakoot_points",
                  "match_percentage",
                  "match_horoscope"
                ]
              },
              description: "Array of matchmaking chart types most relevant to the user's query"
            },
            reasoning: {
              type: "string",
              description: "Brief explanation of why these specific chart types were selected for this query"
            }
          },
          required: ["chart_types", "reasoning"]
        }
      };

      const getMatchmakingChartDataFunction = {
        name: "get_matchmaking_chart_data",
        description: "Retrieve specific matchmaking chart data for analysis. This function fetches the actual chart data based on the selected chart types.",
        parameters: {
          type: "object",
          properties: {
            chart_types: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "match_birth_details",
                  "match_astro_details", 
                  "match_planet_details",
                  "match_ashtakoot_points",
                  "match_making_report",
                  "match_manglik_report",
                  "match_obstructions",
                  "match_simple_report",
                  "match_rajju_dosha",
                  "match_making_detailed_report",
                  "match_dashakoot_points",
                  "match_percentage",
                  "match_horoscope"
                ]
              },
              description: "Array of matchmaking chart types to retrieve data for"
            }
          },
          required: ["chart_types"]
        }
      };

      // Get LLM response with function calling
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(analysisPrompt)
      ];

      // Call LLM with function calling
      const availableFunctions = [
        matchmakingChartSelectionFunction,
        getMatchmakingChartDataFunction
      ];

      const response = await this.llm.invoke(messages, {
        functions: availableFunctions,
        function_call: 'auto'
      });

      // Handle function calls
      if (response.additional_kwargs?.function_call) {
        const functionCall = response.additional_kwargs.function_call;
        logger.info('Matchmaking function called', { functionName: functionCall.name });
        
        try {
          let functionResult;
          const args = JSON.parse(functionCall.arguments);
          
          if (functionCall.name === 'select_relevant_matchmaking_charts') {
            functionResult = await this.selectRelevantMatchmakingCharts(args.chart_types, args.reasoning, userContext);
          } else if (functionCall.name === 'get_matchmaking_chart_data') {
            functionResult = await this.getMatchmakingChartData(args.chart_types, userContext);
          }
          
          // Add function result to messages and get final response
          const functionMessages = [
            ...messages,
            new AIMessage(response.content, { function_call: functionCall }),
            new HumanMessage(`Function result: ${JSON.stringify(functionResult)}`)
          ];
          
          const finalResponse = await this.llm.invoke(functionMessages);
          response.content = finalResponse.content;
          
        } catch (functionError) {
          logger.error('Error executing matchmaking function:', functionError);
          response.content = "I encountered an error while processing your request. Please try again.";
        }
      }
      
      // Extract brief and detailed responses
      const { briefAnswer, detailedDescription } = this.extractBriefAndDetailed(response.content);

      logger.info('Partner exploration query processed successfully', {
        responseLength: response.content?.length || 0,
        hasBriefAnswer: !!briefAnswer,
        hasDetailedDescription: !!detailedDescription
      });

      return {
        success: true,
        response: response.content,
        briefAnswer: briefAnswer,
        detailedDescription: detailedDescription,
        confidence: 0.9,
        sources: ['Partner Exploration Analysis', 'Matchmaking Charts', 'Astrological Compatibility']
      };

    } catch (error) {
      logger.error('Error processing partner exploration query:', error);
      return {
        success: false,
        response: "I'm sorry, I encountered an error while exploring your partner. Please try again.",
        confidence: 0.3,
        sources: ['Error: Partner Exploration Failed']
      };
    }
  }

  async processMatchmakingQuery(query, userContext, conversationHistory = []) {
    try {
      console.log('processMatchmakingQuery called with:', {
        query: query.substring(0, 50) + '...',
        hasMatchmakingCharts: !!userContext.matchmakingCharts,
        compatibilityScore: userContext.compatibilityScore,
        isMatchmakingChat: userContext.isMatchmakingChat
      });
      
      logger.info('Processing matchmaking query', {
        query: query.substring(0, 50) + '...',
        hasMatchmakingCharts: !!userContext.matchmakingCharts,
        compatibilityScore: userContext.compatibilityScore
      });

      // Extract matchmaking data from context
      let { maleData, femaleData, matchmakingCharts, compatibilityScore, matchType, userId } = userContext;
      
      if (!matchmakingCharts && userId) {
        // Try to recover latest matchmaking charts from RAG/database for this user
        try {
          const recovered = await firestoreRAGService.getLatestMatchmakingCharts(userId);
          if (recovered) {
            matchmakingCharts = recovered;
            compatibilityScore = compatibilityScore || (recovered?.charts?.match_ashtakoot_points?.total
              ? Math.round((recovered.charts.match_ashtakoot_points.total.received_points / recovered.charts.match_ashtakoot_points.total.total_points) * 100)
              : 0);
          }
        } catch (e) {
          logger.error('Failed to recover matchmaking charts from history:', e);
        }
      }

      if (!matchmakingCharts) {
        return {
          success: false,
          response: "I don't have access to the matchmaking chart data. Please complete a matchmaking analysis first.",
          confidence: 0.3,
          sources: ['Error: No matchmaking data']
        };
      }

      // Create a comprehensive prompt with matchmaking data
      const systemPrompt = `You are an expert astrologer specializing in Vedic matchmaking and compatibility analysis. 

You have access to detailed matchmaking charts for ${maleData?.name || 'Male'} and ${femaleData?.name || 'Female'}.

**Matchmaking Data Available:**
- Compatibility Score: ${compatibilityScore || 0}%
- Match Type: ${matchType || 'marriage'}
- Ashtakoota Analysis: ${JSON.stringify(matchmakingCharts.charts?.match_ashtakoot_points || {})}
- Manglik Analysis: ${JSON.stringify(matchmakingCharts.charts?.match_manglik_report || {})}
- Simple Report: ${JSON.stringify(matchmakingCharts.charts?.match_simple_report || {})}
- Planetary Details: ${JSON.stringify(matchmakingCharts.charts?.match_planet_details || {})}
- Birth Details: ${JSON.stringify(matchmakingCharts.charts?.match_birth_details || {})}

**Instructions:**
1. Use ONLY the provided matchmaking chart data to answer questions
2. Provide specific, detailed analysis based on the actual charts
3. Reference specific points, doshas, and planetary positions from the data
4. Give practical advice and recommendations based on the analysis
5. Be conversational and helpful, but always base your answers on the chart data
6. If asked about doshas, provide specific details from the manglik and other dosha reports
7. If asked about compatibility, explain the ashtakoota analysis in detail
8. If asked about marriage, provide a comprehensive assessment based on all factors

**User Query:** {query}

Provide a detailed, accurate response based on the matchmaking chart data.`;

      const messages = [
        new SystemMessage(systemPrompt),
        ...conversationHistory.map(msg => 
          msg.type === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        ),
        new HumanMessage(query)
      ];

      const response = await this.llm.invoke(messages);

      logger.info('Matchmaking query processed successfully', {
        responseLength: response.content.length,
        compatibilityScore
      });

      return {
        success: true,
        response: response.content,
        confidence: 0.9,
        sources: ['Matchmaking Charts', 'Vedic Astrology Analysis'],
        astrologicalContext: {
          compatibilityScore,
          matchType,
          hasManglik: matchmakingCharts.charts?.match_simple_report?.manglik?.status,
          ashtakootaScore: matchmakingCharts.charts?.match_ashtakoot_points?.total?.received_points
        }
      };

    } catch (error) {
      logger.error('Error processing matchmaking query:', error);
      return {
        success: false,
        response: "I apologize, but I encountered an issue analyzing your matchmaking data. Please try again or check your matchmaking analysis.",
        confidence: 0.5,
        sources: ['Error Handling']
      };
    }
  }

  // Create chart comparison visualization
  createChartComparison(userCharts, contactCharts, contactName) {
    try {
      let comparison = `\n📊 **Chart Comparison: You vs ${contactName}**\n\n`;
      
      // Compare astro_details
      if (userCharts.astro_details && contactCharts.astro_details) {
        const userAstro = userCharts.astro_details[0]?.data;
        const contactAstro = contactCharts.astro_details[0]?.data;
        
        if (userAstro && contactAstro) {
          comparison += `**🌟 Ascendant Comparison:**\n`;
          comparison += `You: ${userAstro.ascendant} (${userAstro.ascendant_lord})\n`;
          comparison += `${contactName}: ${contactAstro.ascendant} (${contactAstro.ascendant_lord})\n\n`;
          
          comparison += `**☀️ Sun Sign Comparison:**\n`;
          comparison += `You: ${userAstro.sign} (${userAstro.SignLord})\n`;
          comparison += `${contactName}: ${contactAstro.sign} (${contactAstro.SignLord})\n\n`;
          
          comparison += `**🌙 Nakshatra Comparison:**\n`;
          comparison += `You: ${userAstro.Naksahtra} (${userAstro.NaksahtraLord})\n`;
          comparison += `${contactName}: ${contactAstro.Naksahtra} (${contactAstro.NaksahtraLord})\n\n`;
        }
      }
      
      // Compare planets
      if (userCharts.planets && contactCharts.planets) {
        comparison += `**🪐 Planetary Positions:**\n`;
        const userPlanets = userCharts.planets[0]?.data;
        const contactPlanets = contactCharts.planets[0]?.data;
        
        if (userPlanets && contactPlanets) {
          const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
          planets.forEach(planet => {
            if (userPlanets[planet] && contactPlanets[planet]) {
              comparison += `${planet}: You(${userPlanets[planet]}) vs ${contactName}(${contactPlanets[planet]})\n`;
            }
          });
          comparison += `\n`;
        }
      }
      
      return comparison;
    } catch (error) {
      logger.error('Error creating chart comparison:', error);
      return '';
    }
  }

  // Create business-focused chart comparison
  createBusinessChartComparison(userCharts, contactCharts, contactName) {
    try {
      let comparison = `\n💼 **Business Compatibility Chart Comparison**\n\n`;
      
      // Focus on 10th house, Mercury, Saturn
      if (userCharts.astro_details && contactCharts.astro_details) {
        const userAstro = userCharts.astro_details[0]?.data;
        const contactAstro = contactCharts.astro_details[0]?.data;
        
        if (userAstro && contactAstro) {
          comparison += `**🏢 Career House (10th) Lords:**\n`;
          comparison += `You: ${userAstro.ascendant_lord}\n`;
          comparison += `${contactName}: ${contactAstro.ascendant_lord}\n\n`;
        }
      }
      
      // Compare Mercury (communication) and Saturn (discipline)
      if (userCharts.planets && contactCharts.planets) {
        const userPlanets = userCharts.planets[0]?.data;
        const contactPlanets = contactCharts.planets[0]?.data;
        
        if (userPlanets && contactPlanets) {
          comparison += `**📞 Communication (Mercury):**\n`;
          comparison += `You: ${userPlanets.Mercury || 'N/A'}\n`;
          comparison += `${contactName}: ${contactPlanets.Mercury || 'N/A'}\n\n`;
          
          comparison += `**⏰ Discipline (Saturn):**\n`;
          comparison += `You: ${userPlanets.Saturn || 'N/A'}\n`;
          comparison += `${contactName}: ${contactPlanets.Saturn || 'N/A'}\n\n`;
        }
      }
      
      return comparison;
    } catch (error) {
      logger.error('Error creating business chart comparison:', error);
      return '';
    }
  }

  // Create friendship-focused chart comparison
  createFriendshipChartComparison(userCharts, contactCharts, contactName) {
    try {
      let comparison = `\n🤝 **Friendship Compatibility Chart Comparison**\n\n`;
      
      // Focus on 11th house, Jupiter, Moon
      if (userCharts.astro_details && contactCharts.astro_details) {
        const userAstro = userCharts.astro_details[0]?.data;
        const contactAstro = contactCharts.astro_details[0]?.data;
        
        if (userAstro && contactAstro) {
          comparison += `**🎯 Friendship House (11th) Lords:**\n`;
          comparison += `You: ${userAstro.ascendant_lord}\n`;
          comparison += `${contactName}: ${contactAstro.ascendant_lord}\n\n`;
        }
      }
      
      // Compare Jupiter (wisdom) and Moon (emotions)
      if (userCharts.planets && contactCharts.planets) {
        const userPlanets = userCharts.planets[0]?.data;
        const contactPlanets = contactCharts.planets[0]?.data;
        
        if (userPlanets && contactPlanets) {
          comparison += `**🧠 Wisdom (Jupiter):**\n`;
          comparison += `You: ${userPlanets.Jupiter || 'N/A'}\n`;
          comparison += `${contactName}: ${contactPlanets.Jupiter || 'N/A'}\n\n`;
          
          comparison += `**💙 Emotions (Moon):**\n`;
          comparison += `You: ${userPlanets.Moon || 'N/A'}\n`;
          comparison += `${contactName}: ${contactPlanets.Moon || 'N/A'}\n\n`;
        }
      }
      
      return comparison;
    } catch (error) {
      logger.error('Error creating friendship chart comparison:', error);
      return '';
    }
  }

  // Create family-focused chart comparison
  createFamilyChartComparison(userCharts, contactCharts, contactName) {
    try {
      let comparison = `\n👨‍👩‍👧‍👦 **Family Compatibility Chart Comparison**\n\n`;
      
      // Focus on 4th house, Moon, Rahu-Ketu
      if (userCharts.astro_details && contactCharts.astro_details) {
        const userAstro = userCharts.astro_details[0]?.data;
        const contactAstro = contactCharts.astro_details[0]?.data;
        
        if (userAstro && contactAstro) {
          comparison += `**🏠 Family House (4th) Lords:**\n`;
          comparison += `You: ${userAstro.ascendant_lord}\n`;
          comparison += `${contactName}: ${contactAstro.ascendant_lord}\n\n`;
        }
      }
      
      // Compare Moon (family emotions) and check for Rahu-Ketu
      if (userCharts.planets && contactCharts.planets) {
        const userPlanets = userCharts.planets[0]?.data;
        const contactPlanets = contactCharts.planets[0]?.data;
        
        if (userPlanets && contactPlanets) {
          comparison += `**👨‍👩‍👧‍👦 Family Emotions (Moon):**\n`;
          comparison += `You: ${userPlanets.Moon || 'N/A'}\n`;
          comparison += `${contactName}: ${contactPlanets.Moon || 'N/A'}\n\n`;
        }
      }
      
      // Check for Kalsarpa details
      if (userCharts.kalsarpa_details && contactCharts.kalsarpa_details) {
        const userKalsarpa = userCharts.kalsarpa_details[0]?.data;
        const contactKalsarpa = contactCharts.kalsarpa_details[0]?.data;
        
        if (userKalsarpa && contactKalsarpa) {
          comparison += `**🐍 Karmic Connection (Kalsarpa):**\n`;
          comparison += `You: ${userKalsarpa.present || 'N/A'}\n`;
          comparison += `${contactName}: ${contactKalsarpa.present || 'N/A'}\n\n`;
        }
      }
      
      return comparison;
    } catch (error) {
      logger.error('Error creating family chart comparison:', error);
      return '';
    }
  }

  // Calculate compatibility score based on relationship type
  calculateCompatibilityScore(userCharts, contactCharts, relationshipType) {
    try {
      let totalScore = 0;
      let maxScore = 0;
      
      // Get astro_details for both charts
      const userAstro = userCharts.astro_details?.[0]?.data;
      const contactAstro = contactCharts.astro_details?.[0]?.data;
      
      if (!userAstro || !contactAstro) {
        return 50; // Default score if data is missing
      }
      
      // Calculate scores based on relationship type
      switch (relationshipType) {
        case 'romantic':
          totalScore += this.calculateRomanticScore(userAstro, contactAstro);
          maxScore += 100;
          break;
        case 'business':
          totalScore += this.calculateBusinessScore(userAstro, contactAstro);
          maxScore += 100;
          break;
        case 'friendship':
          totalScore += this.calculateFriendshipScore(userAstro, contactAstro);
          maxScore += 100;
          break;
        case 'family':
          totalScore += this.calculateFamilyScore(userAstro, contactAstro);
          maxScore += 100;
          break;
      }
      
      return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;
    } catch (error) {
      logger.error('Error calculating compatibility score:', error);
      return 50;
    }
  }

  // Calculate romantic compatibility score
  calculateRomanticScore(userAstro, contactAstro) {
    let score = 0;
    
    // Venus-Mars compatibility (romantic attraction)
    if (userAstro.ascendant_lord === 'Venus' && contactAstro.ascendant_lord === 'Mars') score += 25;
    if (userAstro.ascendant_lord === 'Mars' && contactAstro.ascendant_lord === 'Venus') score += 25;
    
    // Sun-Moon compatibility (emotional harmony)
    if (userAstro.SignLord === 'Sun' && contactAstro.SignLord === 'Moon') score += 20;
    if (userAstro.SignLord === 'Moon' && contactAstro.SignLord === 'Sun') score += 20;
    
    // Ascendant compatibility (physical attraction)
    if (userAstro.ascendant === contactAstro.ascendant) score += 15;
    
    // Nakshatra compatibility (soul connection)
    if (userAstro.Naksahtra === contactAstro.Naksahtra) score += 15;
    
    // Varna compatibility (social harmony)
    if (userAstro.Varna === contactAstro.Varna) score += 10;
    
    // Vashya compatibility (emotional bonding)
    if (userAstro.Vashya === contactAstro.Vashya) score += 10;
    
    return score;
  }

  // Calculate business compatibility score
  calculateBusinessScore(userAstro, contactAstro) {
    let score = 0;
    
    // Mercury compatibility (communication)
    if (userAstro.ascendant_lord === 'Mercury' && contactAstro.ascendant_lord === 'Mercury') score += 30;
    
    // Saturn compatibility (discipline and structure)
    if (userAstro.ascendant_lord === 'Saturn' && contactAstro.ascendant_lord === 'Saturn') score += 25;
    
    // Jupiter compatibility (wisdom and growth)
    if (userAstro.ascendant_lord === 'Jupiter' && contactAstro.ascendant_lord === 'Jupiter') score += 20;
    
    // Sun compatibility (leadership)
    if (userAstro.SignLord === 'Sun' && contactAstro.SignLord === 'Sun') score += 15;
    
    // Varna compatibility (professional harmony)
    if (userAstro.Varna === contactAstro.Varna) score += 10;
    
    return score;
  }

  // Calculate friendship compatibility score
  calculateFriendshipScore(userAstro, contactAstro) {
    let score = 0;
    
    // Jupiter compatibility (wisdom and guidance)
    if (userAstro.ascendant_lord === 'Jupiter' && contactAstro.ascendant_lord === 'Jupiter') score += 30;
    
    // Moon compatibility (emotional understanding)
    if (userAstro.ascendant_lord === 'Moon' && contactAstro.ascendant_lord === 'Moon') score += 25;
    
    // Venus compatibility (harmony and friendship)
    if (userAstro.ascendant_lord === 'Venus' && contactAstro.ascendant_lord === 'Venus') score += 20;
    
    // Nakshatra compatibility (soul connection)
    if (userAstro.Naksahtra === contactAstro.Naksahtra) score += 15;
    
    // Gan compatibility (nature compatibility)
    if (userAstro.Gan === contactAstro.Gan) score += 10;
    
    return score;
  }

  // Calculate family compatibility score
  calculateFamilyScore(userAstro, contactAstro) {
    let score = 0;
    
    // Moon compatibility (family emotions)
    if (userAstro.ascendant_lord === 'Moon' && contactAstro.ascendant_lord === 'Moon') score += 30;
    
    // Sun compatibility (family authority)
    if (userAstro.SignLord === 'Sun' && contactAstro.SignLord === 'Sun') score += 25;
    
    // Jupiter compatibility (family wisdom)
    if (userAstro.ascendant_lord === 'Jupiter' && contactAstro.ascendant_lord === 'Jupiter') score += 20;
    
    // Nadi compatibility (genetic harmony)
    if (userAstro.Nadi === contactAstro.Nadi) score += 15;
    
    // Gan compatibility (family nature)
    if (userAstro.Gan === contactAstro.Gan) score += 10;
    
    return score;
  }

  // Create detailed score breakdown
  createScoreBreakdown(userCharts, contactCharts, relationshipType, contactName) {
    try {
      const userAstro = userCharts.astro_details?.[0]?.data;
      const contactAstro = contactCharts.astro_details?.[0]?.data;
      
      if (!userAstro || !contactAstro) {
        return 'Unable to create detailed breakdown due to missing chart data.';
      }
      
      let breakdown = `📊 **Detailed ${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Compatibility Breakdown**\n\n`;
      
      switch (relationshipType) {
        case 'romantic':
          breakdown += this.createRomanticBreakdown(userAstro, contactAstro, contactName);
          break;
        case 'business':
          breakdown += this.createBusinessBreakdown(userAstro, contactAstro, contactName);
          break;
        case 'friendship':
          breakdown += this.createFriendshipBreakdown(userAstro, contactAstro, contactName);
          break;
        case 'family':
          breakdown += this.createFamilyBreakdown(userAstro, contactAstro, contactName);
          break;
      }
      
      return breakdown;
    } catch (error) {
      logger.error('Error creating score breakdown:', error);
      return 'Unable to create detailed breakdown.';
    }
  }

  // Create romantic compatibility breakdown
  createRomanticBreakdown(userAstro, contactAstro, contactName) {
    let breakdown = '';
    
    breakdown += `**💕 Romantic Compatibility Factors:**\n\n`;
    breakdown += `**Venus-Mars Attraction:** ${userAstro.ascendant_lord === 'Venus' && contactAstro.ascendant_lord === 'Mars' ? 'Strong' : 'Moderate'}\n`;
    breakdown += `**Sun-Moon Harmony:** ${userAstro.SignLord === 'Sun' && contactAstro.SignLord === 'Moon' ? 'Excellent' : 'Good'}\n`;
    breakdown += `**Ascendant Match:** ${userAstro.ascendant === contactAstro.ascendant ? 'Perfect' : 'Compatible'}\n`;
    breakdown += `**Nakshatra Connection:** ${userAstro.Naksahtra === contactAstro.Naksahtra ? 'Soul Mate' : 'Harmonious'}\n`;
    breakdown += `**Varna Harmony:** ${userAstro.Varna === contactAstro.Varna ? 'Socially Compatible' : 'Acceptable'}\n`;
    breakdown += `**Vashya Bonding:** ${userAstro.Vashya === contactAstro.Vashya ? 'Emotionally Aligned' : 'Balanced'}\n\n`;
    
    return breakdown;
  }

  // Create business compatibility breakdown
  createBusinessBreakdown(userAstro, contactAstro, contactName) {
    let breakdown = '';
    
    breakdown += `**💼 Business Compatibility Factors:**\n\n`;
    breakdown += `**Communication (Mercury):** ${userAstro.ascendant_lord === 'Mercury' && contactAstro.ascendant_lord === 'Mercury' ? 'Excellent' : 'Good'}\n`;
    breakdown += `**Discipline (Saturn):** ${userAstro.ascendant_lord === 'Saturn' && contactAstro.ascendant_lord === 'Saturn' ? 'Strong' : 'Moderate'}\n`;
    breakdown += `**Wisdom (Jupiter):** ${userAstro.ascendant_lord === 'Jupiter' && contactAstro.ascendant_lord === 'Jupiter' ? 'High' : 'Standard'}\n`;
    breakdown += `**Leadership (Sun):** ${userAstro.SignLord === 'Sun' && contactAstro.SignLord === 'Sun' ? 'Natural' : 'Developed'}\n`;
    breakdown += `**Professional Harmony:** ${userAstro.Varna === contactAstro.Varna ? 'Excellent' : 'Good'}\n\n`;
    
    return breakdown;
  }

  // Create friendship compatibility breakdown
  createFriendshipBreakdown(userAstro, contactAstro, contactName) {
    let breakdown = '';
    
    breakdown += `**🤝 Friendship Compatibility Factors:**\n\n`;
    breakdown += `**Wisdom Connection (Jupiter):** ${userAstro.ascendant_lord === 'Jupiter' && contactAstro.ascendant_lord === 'Jupiter' ? 'Deep' : 'Good'}\n`;
    breakdown += `**Emotional Understanding (Moon):** ${userAstro.ascendant_lord === 'Moon' && contactAstro.ascendant_lord === 'Moon' ? 'Strong' : 'Moderate'}\n`;
    breakdown += `**Harmony (Venus):** ${userAstro.ascendant_lord === 'Venus' && contactAstro.ascendant_lord === 'Venus' ? 'Natural' : 'Developed'}\n`;
    breakdown += `**Soul Connection (Nakshatra):** ${userAstro.Naksahtra === contactAstro.Naksahtra ? 'Perfect' : 'Good'}\n`;
    breakdown += `**Nature Compatibility (Gan):** ${userAstro.Gan === contactAstro.Gan ? 'Aligned' : 'Balanced'}\n\n`;
    
    return breakdown;
  }

  // Create family compatibility breakdown
  createFamilyBreakdown(userAstro, contactAstro, contactName) {
    let breakdown = '';
    
    breakdown += `**👨‍👩‍👧‍👦 Family Compatibility Factors:**\n\n`;
    breakdown += `**Emotional Bond (Moon):** ${userAstro.ascendant_lord === 'Moon' && contactAstro.ascendant_lord === 'Moon' ? 'Strong' : 'Moderate'}\n`;
    breakdown += `**Authority Harmony (Sun):** ${userAstro.SignLord === 'Sun' && contactAstro.SignLord === 'Sun' ? 'Natural' : 'Developed'}\n`;
    breakdown += `**Family Wisdom (Jupiter):** ${userAstro.ascendant_lord === 'Jupiter' && contactAstro.ascendant_lord === 'Jupiter' ? 'High' : 'Good'}\n`;
    breakdown += `**Genetic Harmony (Nadi):** ${userAstro.Nadi === contactAstro.Nadi ? 'Excellent' : 'Compatible'}\n`;
    breakdown += `**Family Nature (Gan):** ${userAstro.Gan === contactAstro.Gan ? 'Aligned' : 'Balanced'}\n\n`;
    
    return breakdown;
  }

  // Generate dynamic functions based on available chart data
  generateDynamicFunctions(chartData, hasChartData, hasContactCharts) {
    let functions = '';
    
    if (hasChartData && chartData) {
      // Core chart analysis functions
      functions += `- select_relevant_charts: Use this to analyze the user's birth chart data for personalized insights\n`;
      functions += `- get_birth_chart: Get detailed birth chart information\n`;
      
      // Add specific functions based on available chart types
      const availableChartTypes = Object.keys(chartData).filter(type => 
        chartData[type] && chartData[type].length > 0
      );
      
      if (availableChartTypes.includes('current_vdasha')) {
        functions += `- analyze_current_transits: Analyze current planetary transits affecting the user\n`;
      }
      
      if (availableChartTypes.includes('planets')) {
        functions += `- analyze_planetary_positions: Analyze planetary positions and their influences\n`;
      }
      
      if (availableChartTypes.includes('horo_chart')) {
        functions += `- analyze_houses: Analyze house placements and their significance\n`;
      }
      
      if (availableChartTypes.includes('astro_details')) {
        functions += `- analyze_personality: Analyze personality traits based on astrological profile\n`;
      }
      
      if (availableChartTypes.includes('kalsarpa_details')) {
        functions += `- analyze_doshas: Analyze doshas and provide remedial measures\n`;
      }
    }
    
    // Compatibility functions if contact charts are available
    if (hasContactCharts) {
      functions += `\nCompatibility Analysis Functions:\n`;
      functions += `- analyze_romantic_compatibility: Analyze romantic compatibility between user and tagged contacts\n`;
      functions += `- analyze_business_compatibility: Analyze business compatibility between user and tagged contacts\n`;
      functions += `- analyze_friendship_compatibility: Analyze friendship compatibility between user and tagged contacts\n`;
      functions += `- analyze_family_compatibility: Analyze family compatibility between user and tagged contacts\n`;
      functions += `- calculate_compatibility_score: Calculate numerical compatibility scores\n`;
    }
    
    // Group compatibility function (always available for group analysis)
    functions += `\nGroup Analysis Functions:\n`;
    functions += `- analyze_group_compatibility: Analyze compatibility within a group of people using their birth data\n`;
    
    // Default function if no chart data
    if (!hasChartData) {
      functions += `- request_birth_data: Request user to provide birth data for personalized analysis\n`;
      functions += `- provide_general_guidance: Provide general astrological guidance without personal data\n`;
    }
    
    return functions;
  }

  // Handle group compatibility analysis
  async handleGroupCompatibility(functionCall, userContext, query) {
    try {
      const args = JSON.parse(functionCall.arguments);
      const { groupMembers, groupType = 'friendship', analysisFocus = 'dynamics' } = args;
      
      logger.info('Group compatibility function called', { 
        groupMembers: groupMembers.map(m => m.name),
        groupType,
        analysisFocus
      });

      // Validate group members
      if (!groupMembers || groupMembers.length < 2) {
        return {
          success: false,
          response: 'Group compatibility analysis requires at least 2 members. Please provide birth data for all group members.',
          confidence: 0.3,
          sources: ['Group Compatibility Validation']
        };
      }

      // Analyze group dynamics using astrological principles
      let analysis = `🌟 **Group Compatibility Analysis: ${groupType.charAt(0).toUpperCase() + groupType.slice(1)} Group**\n\n`;
      
      // Add brief overview first
      analysis += `**BRIEF ANSWER:**\n`;
      analysis += `This ${groupType} group shows ${this.getGroupCompatibilityBrief(groupMembers, groupType, analysisFocus)}. The dynamics are ${this.getGroupDynamicsBrief(groupMembers)} with ${this.getGroupStrengthsBrief(groupMembers)}.\n\n`;
      
      analysis += `**DETAILED ANALYSIS:**\n\n`;
      analysis += `**Group Members:** ${groupMembers.map(m => m.name).join(', ')}\n`;
      analysis += `**Focus Area:** ${analysisFocus}\n\n`;

      // Analyze each member's astrological profile
      const memberAnalyses = [];
      for (const member of groupMembers) {
        const memberAnalysis = await this.analyzeGroupMember(member, groupType);
        memberAnalyses.push(memberAnalysis);
      }

      // Analyze group dynamics
      const groupDynamics = this.analyzeGroupDynamics(groupMembers, groupType, analysisFocus);
      
      // Combine all analyses
      analysis += `**📊 Individual Profiles:**\n\n`;
      memberAnalyses.forEach((memberAnalysis, index) => {
        analysis += `${memberAnalysis}\n`;
        if (index < memberAnalyses.length - 1) analysis += `---\n`;
      });

      analysis += `\n**🔗 Group Dynamics Analysis:**\n\n${groupDynamics}\n\n`;
      
      // Provide recommendations
      const recommendations = this.generateGroupRecommendations(groupMembers, groupType, analysisFocus);
      analysis += `**💡 Recommendations:**\n\n${recommendations}`;

      return {
        success: true,
        response: analysis,
        confidence: 0.9,
        sources: ['Group Compatibility Analysis', 'Astrological Principles'],
        astrologicalContext: {
          groupType,
          analysisFocus,
          memberCount: groupMembers.length,
          hasBirthData: groupMembers.every(m => m.birthDate && m.birthTime)
        }
      };

    } catch (error) {
      logger.error('Error in group compatibility analysis:', error);
      return {
        success: false,
        response: 'I encountered an error while analyzing group compatibility. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling']
      };
    }
  }

  // Helper methods for brief group compatibility summaries
  getGroupCompatibilityBrief(groupMembers, groupType, analysisFocus) {
    const memberCount = groupMembers.length;
    const compatibilityLevels = ['excellent', 'strong', 'good', 'moderate', 'challenging'];
    const randomLevel = compatibilityLevels[Math.floor(Math.random() * compatibilityLevels.length)];
    
    return `${randomLevel} compatibility potential with ${memberCount} members`;
  }

  getGroupDynamicsBrief(groupMembers) {
    const dynamics = ['balanced and harmonious', 'diverse and dynamic', 'complementary and supportive', 'energetic and creative'];
    return dynamics[Math.floor(Math.random() * dynamics.length)];
  }

  getGroupStrengthsBrief(groupMembers) {
    const strengths = ['strong communication potential', 'excellent leadership balance', 'great creative synergy', 'solid emotional support'];
    return strengths[Math.floor(Math.random() * strengths.length)];
  }

  // Analyze individual group member
  async analyzeGroupMember(member, groupType) {
    try {
      const { name, birthDate, birthTime, latitude, longitude, role } = member;
      
      // Basic astrological analysis based on birth data
      const birthDateObj = new Date(birthDate + 'T' + birthTime);
      const sunSign = this.getSunSign(birthDateObj);
      const element = this.getElement(sunSign);
      const modality = this.getModality(sunSign);
      
      let analysis = `**${name}** (${role || 'member'})\n`;
      analysis += `• Sun Sign: ${sunSign}\n`;
      analysis += `• Element: ${element}\n`;
      analysis += `• Modality: ${modality}\n`;
      
      // Add role-specific insights
      if (groupType === 'business') {
        analysis += `• Business Traits: ${this.getBusinessTraits(sunSign)}\n`;
      } else if (groupType === 'family') {
        analysis += `• Family Traits: ${this.getFamilyTraits(sunSign)}\n`;
      } else if (groupType === 'romantic') {
        analysis += `• Relationship Traits: ${this.getRelationshipTraits(sunSign)}\n`;
      }
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing group member:', error);
      return `**${member.name}**: Unable to analyze due to data error`;
    }
  }

  // Analyze group dynamics
  analyzeGroupDynamics(groupMembers, groupType, analysisFocus) {
    try {
      const sunSigns = groupMembers.map(m => this.getSunSign(new Date(m.birthDate + 'T' + m.birthTime)));
      const elements = sunSigns.map(sign => this.getElement(sign));
      const modalities = sunSigns.map(sign => this.getModality(sign));
      
      let dynamics = '';
      
      // Element balance analysis
      const elementCounts = elements.reduce((acc, element) => {
        acc[element] = (acc[element] || 0) + 1;
        return acc;
      }, {});
      
      dynamics += `**Element Balance:**\n`;
      Object.entries(elementCounts).forEach(([element, count]) => {
        dynamics += `• ${element}: ${count} member${count > 1 ? 's' : ''}\n`;
      });
      
      // Modality analysis
      const modalityCounts = modalities.reduce((acc, modality) => {
        acc[modality] = (acc[modality] || 0) + 1;
        return acc;
      }, {});
      
      dynamics += `\n**Modality Distribution:**\n`;
      Object.entries(modalityCounts).forEach(([element, count]) => {
        dynamics += `• ${element}: ${count} member${count > 1 ? 's' : ''}\n`;
      });
      
      // Focus-specific analysis
      if (analysisFocus === 'leadership') {
        dynamics += `\n**Leadership Dynamics:**\n${this.analyzeLeadershipDynamics(sunSigns)}\n`;
      } else if (analysisFocus === 'communication') {
        dynamics += `\n**Communication Patterns:**\n${this.analyzeCommunicationDynamics(elements)}\n`;
      } else if (analysisFocus === 'harmony') {
        dynamics += `\n**Harmony Factors:**\n${this.analyzeHarmonyDynamics(elements, modalities)}\n`;
      }
      
      return dynamics;
    } catch (error) {
      logger.error('Error analyzing group dynamics:', error);
      return 'Unable to analyze group dynamics due to data error';
    }
  }

  // Generate group recommendations
  generateGroupRecommendations(groupMembers, groupType, analysisFocus) {
    try {
      const sunSigns = groupMembers.map(m => this.getSunSign(new Date(m.birthDate + 'T' + m.birthTime)));
      const elements = sunSigns.map(sign => this.getElement(sign));
      
      let recommendations = '';
      
      // Element-based recommendations
      const elementCounts = elements.reduce((acc, element) => {
        acc[element] = (acc[element] || 0) + 1;
        return acc;
      }, {});
      
      if (elementCounts.Fire > elementCounts.Earth) {
        recommendations += `• **Balance Energy:** The group has more fire energy than earth. Consider grounding activities and practical planning.\n`;
      }
      if (elementCounts.Air > elementCounts.Water) {
        recommendations += `• **Energy Balance:** The group is more intellectual than emotional. Focus on building emotional bonds.\n`;
      }
      
      // Group type specific recommendations
      if (groupType === 'business') {
        recommendations += `• **Role Clarity:** Define clear roles based on each member's strengths.\n`;
        recommendations += `• **Communication Protocol:** Establish regular check-ins and feedback sessions.\n`;
      } else if (groupType === 'family') {
        recommendations += `• **Emotional Support:** Create safe spaces for emotional expression.\n`;
        recommendations += `• **Shared Activities:** Plan activities that appeal to different energy types.\n`;
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return 'Unable to generate recommendations due to data error';
    }
  }

  // Helper methods for astrological analysis
  getSunSign(birthDate) {
    const month = birthDate.getMonth() + 1;
    const day = birthDate.getDate();
    
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    return 'Pisces';
  }

  getElement(sunSign) {
    const fireSigns = ['Aries', 'Leo', 'Sagittarius'];
    const earthSigns = ['Taurus', 'Virgo', 'Capricorn'];
    const airSigns = ['Gemini', 'Libra', 'Aquarius'];
    const waterSigns = ['Cancer', 'Scorpio', 'Pisces'];
    
    if (fireSigns.includes(sunSign)) return 'Fire';
    if (earthSigns.includes(sunSign)) return 'Earth';
    if (airSigns.includes(sunSign)) return 'Air';
    if (waterSigns.includes(sunSign)) return 'Water';
    return 'Unknown';
  }

  getModality(sunSign) {
    const cardinalSigns = ['Aries', 'Cancer', 'Libra', 'Capricorn'];
    const fixedSigns = ['Taurus', 'Leo', 'Scorpio', 'Aquarius'];
    const mutableSigns = ['Gemini', 'Virgo', 'Sagittarius', 'Pisces'];
    
    if (cardinalSigns.includes(sunSign)) return 'Cardinal';
    if (fixedSigns.includes(sunSign)) return 'Fixed';
    if (mutableSigns.includes(sunSign)) return 'Mutable';
    return 'Unknown';
  }

  getBusinessTraits(sunSign) {
    const traits = {
      'Aries': 'Dynamic leadership, quick decision-making',
      'Taurus': 'Steady progress, financial acumen',
      'Gemini': 'Versatile communication, networking skills',
      'Cancer': 'Intuitive business sense, customer care',
      'Leo': 'Charismatic leadership, brand building',
      'Virgo': 'Attention to detail, process optimization',
      'Libra': 'Diplomatic negotiation, partnership building',
      'Scorpio': 'Strategic thinking, market research',
      'Sagittarius': 'Visionary planning, expansion focus',
      'Capricorn': 'Long-term strategy, disciplined execution',
      'Aquarius': 'Innovation, unconventional approaches',
      'Pisces': 'Creative solutions, intuitive insights'
    };
    return traits[sunSign] || 'Adaptable and resourceful';
  }

  getFamilyTraits(sunSign) {
    const traits = {
      'Aries': 'Protective, energetic parent',
      'Taurus': 'Stable, nurturing provider',
      'Gemini': 'Communicative, educational parent',
      'Cancer': 'Emotionally supportive, caring',
      'Leo': 'Proud, encouraging parent',
      'Virgo': 'Practical, helpful family member',
      'Libra': 'Harmonious, fair mediator',
      'Scorpio': 'Deeply loyal, protective',
      'Sagittarius': 'Adventurous, philosophical guide',
      'Capricorn': 'Responsible, traditional provider',
      'Aquarius': 'Progressive, independent thinker',
      'Pisces': 'Compassionate, intuitive support'
    };
    return traits[sunSign] || 'Loving and supportive';
  }

  getRelationshipTraits(sunSign) {
    const traits = {
      'Aries': 'Passionate, direct, adventurous',
      'Taurus': 'Loyal, sensual, patient',
      'Gemini': 'Communicative, curious, adaptable',
      'Cancer': 'Emotional, nurturing, protective',
      'Leo': 'Generous, dramatic, loyal',
      'Virgo': 'Devoted, practical, helpful',
      'Libra': 'Romantic, diplomatic, fair',
      'Scorpio': 'Intense, loyal, mysterious',
      'Sagittarius': 'Optimistic, honest, adventurous',
      'Capricorn': 'Responsible, ambitious, loyal',
      'Aquarius': 'Independent, intellectual, unique',
      'Pisces': 'Compassionate, romantic, intuitive'
    };
    return traits[sunSign] || 'Loving and committed';
  }

  analyzeLeadershipDynamics(sunSigns) {
    const leadershipSigns = ['Aries', 'Leo', 'Capricorn'];
    const leadershipCount = sunSigns.filter(sign => leadershipSigns.includes(sign)).length;
    
    if (leadershipCount === 0) {
      return 'The group may benefit from a designated leader as no natural leadership signs are present.';
    } else if (leadershipCount === 1) {
      return 'One natural leader present - this person can take charge while others support.';
    } else {
      return 'Multiple leaders present - establish clear roles to avoid conflicts.';
    }
  }

  analyzeCommunicationDynamics(elements) {
    const airCount = elements.filter(e => e === 'Air').length;
    const fireCount = elements.filter(e => e === 'Fire').length;
    
    if (airCount > fireCount) {
      return 'Communication-focused group - excellent for planning and coordination.';
    } else if (fireCount > airCount) {
      return 'Action-oriented group - focus on implementation and results.';
    } else {
      return 'Balanced communication and action - good for comprehensive projects.';
    }
  }

  analyzeHarmonyDynamics(elements, modalities) {
    const elementVariety = new Set(elements).size;
    const modalityVariety = new Set(modalities).size;
    
    if (elementVariety >= 3) {
      return 'High element diversity - excellent for balanced perspectives and creativity.';
    } else if (modalityVariety >= 2) {
      return 'Good modality balance - mix of initiative and stability.';
    } else {
      return 'Similar energy types - great for focused, aligned efforts.';
    }
  }

  // Extract both brief answer and detailed description from response
  extractBriefAndDetailed(content) {
    try {
      // Look for structured format with BRIEF ANSWER and DETAILED ANALYSIS sections
      if (content.includes('BRIEF ANSWER:') && content.includes('DETAILED ANALYSIS:')) {
        const briefMatch = content.match(/BRIEF ANSWER:\s*(.*?)(?=\n\nDETAILED ANALYSIS:|$)/s);
        const detailedMatch = content.match(/DETAILED ANALYSIS:\s*(.*?)$/s);
        
        if (briefMatch && detailedMatch) {
          return {
            briefAnswer: briefMatch[1].trim(),
            detailedDescription: detailedMatch[1].trim()
          };
        }
      }
      
      // Look for alternative structured formats
      if (content.includes('BRIEF:') && content.includes('DETAILED:')) {
        const briefMatch = content.match(/BRIEF:\s*(.*?)(?=\n\nDETAILED:|$)/s);
        const detailedMatch = content.match(/DETAILED:\s*(.*?)$/s);
        
        if (briefMatch && detailedMatch) {
          return {
            briefAnswer: briefMatch[1].trim(),
            detailedDescription: detailedMatch[1].trim()
          };
        }
      }
      
      // Intelligent extraction from natural response
      return this.extractIntelligentBriefAndDetailed(content);
      
    } catch (error) {
      logger.error('Error extracting brief and detailed sections:', error);
      return {
        briefAnswer: content.substring(0, 200) + '...',
        detailedDescription: content
      };
    }
  }

  // Intelligent extraction of brief and detailed sections from natural response
  extractIntelligentBriefAndDetailed(content) {
    try {
      logger.info('🔍 [EXTRACTION] Starting intelligent extraction', {
        contentLength: content.length,
        contentPreview: content.substring(0, 100) + '...'
      });
      
      // Split content into sentences
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      logger.info('🔍 [EXTRACTION] Sentence analysis', {
        sentenceCount: sentences.length,
        firstSentence: sentences[0]?.trim().substring(0, 100) + '...'
      });
      
      if (sentences.length === 0) {
        logger.info('🔍 [EXTRACTION] No sentences found, using fallback');
        return {
          briefAnswer: content.substring(0, 200) + '...',
          detailedDescription: content
        };
      }
      
      // For simple questions, extract the direct answer
      const firstSentence = sentences[0].trim();
      
      // Check if this is a direct answer to a simple question
      if (firstSentence.toLowerCase().includes('your sun sign is') || 
          firstSentence.toLowerCase().includes('you are') ||
          firstSentence.toLowerCase().includes('you have') ||
          firstSentence.toLowerCase().includes('your sign is')) {
        
        logger.info('🔍 [EXTRACTION] Detected direct answer pattern');
        
        // Extract the first 1-2 sentences as brief answer
        const briefAnswer = sentences.slice(0, Math.min(2, sentences.length))
          .join('. ').trim() + '.';
        
        // Rest as detailed description
        const detailedDescription = sentences.slice(2).join('. ').trim();
        
        logger.info('🔍 [EXTRACTION] Direct answer extraction result', {
          briefLength: briefAnswer.length,
          detailedLength: detailedDescription.length
        });
        
        return {
          briefAnswer: briefAnswer,
          detailedDescription: detailedDescription || content
        };
      }
      
      // For complex responses, extract first paragraph as brief
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      
      if (paragraphs.length >= 2) {
        // First paragraph as brief (but limit to reasonable length)
        let briefAnswer = paragraphs[0].trim();
        if (briefAnswer.length > 300) {
          // If first paragraph is too long, extract first 2-3 sentences
          const sentences = briefAnswer.split(/[.!?]+/).filter(s => s.trim().length > 10);
          briefAnswer = sentences.slice(0, Math.min(3, sentences.length))
            .join('. ').trim() + '.';
        }
        
        return {
          briefAnswer: briefAnswer,
          detailedDescription: content
        };
      }
      
      // Fallback: extract first 2-3 sentences as brief
      const briefAnswer = sentences.slice(0, Math.min(3, sentences.length))
        .join('. ').trim() + '.';
      
      return {
        briefAnswer: briefAnswer,
        detailedDescription: content
      };
      
    } catch (error) {
      logger.error('Error in intelligent extraction:', error);
      return {
        briefAnswer: content.substring(0, 200) + '...',
        detailedDescription: content
      };
    }
  }

  // Extract brief answer from detailed response (fallback method)
  extractBriefAnswer(content) {
    try {
      // If content is already structured with markdown headers, extract the first section
      if (content.includes('##') || content.includes('###')) {
        const lines = content.split('\n');
        let briefAnswer = '';
        let inBriefSection = false;
        
        for (const line of lines) {
          if (line.startsWith('##') || line.startsWith('###')) {
            if (line.toLowerCase().includes('summary') || line.toLowerCase().includes('brief') || line.toLowerCase().includes('overview')) {
              inBriefSection = true;
              continue;
            } else if (inBriefSection) {
              break;
            }
          }
          
          if (inBriefSection && line.trim() && !line.startsWith('#')) {
            briefAnswer += line.trim() + ' ';
          }
        }
        
        if (briefAnswer.trim()) {
          return briefAnswer.trim();
        }
      }
      
      // Fallback: extract first 2-3 sentences or first paragraph
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length >= 2) {
        return sentences.slice(0, 2).join('. ').trim() + '.';
      } else if (sentences.length === 1) {
        return sentences[0].trim() + '.';
      }
      
      // Last resort: first 150 characters
      return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
    } catch (error) {
      // Fallback to first 150 characters
      return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
    }
  }
}

export const langChainService = new LangChainService(); 
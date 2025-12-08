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
import { ragService } from './ragService.js';
import { hybridRAGService } from './hybridRAGService.js';

class LangChainService {
  constructor() {
    this.llm = null;
    this.parser = null;
    this.astrologyChain = null;
    this.wellnessChain = null;
    this.compatibilityChain = null;
    this.initialized = false;
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
      logger.info('Processing chat query', {
        hasBirthData: !!userContext.birthData,
        query: query.substring(0, 50) + '...',
        userId: userContext.userId
      });

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

      // Classify query type
      const queryType = this.classifyQuery(query);
      logger.info('Query classified', {
        query: query.substring(0, 50) + '...',
        score: queryType.score,
        type: queryType.type
      });

      // Process based on query type
      switch (queryType.type) {
        case 'astrology':
          return await this.processAstrologyQuery(query, enhancedContext, conversationHistory);
        case 'compatibility':
          return await this.processCompatibilityQuery(query, enhancedContext, conversationHistory);
        case 'wellness':
          return await this.processWellnessQuery(query, enhancedContext, conversationHistory);
        case 'matchmaking':
          return await this.processMatchmakingQuery(query, enhancedContext, conversationHistory);
        case 'relationship':
          return await this.processRelationshipQuery(query, enhancedContext, conversationHistory, userContext.taggedContacts);
        default:
          return await this.processGeneralQuery(query, enhancedContext, conversationHistory);
      }
    } catch (error) {
      logger.error('Error processing chat query:', error);
      return {
        success: false,
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        confidence: 0.1,
        sources: ['Error Handling'],
        error: error.message
      };
    }
  }

  // Enhance user context with profile data
  async enhanceUserContext(userContext) {
    const enhancedContext = { ...userContext };

    try {
      // Get user profile from hybrid RAG service
      if (userContext.userId) {
        const profileResult = await hybridRAGService.getUserProfile(userContext.userId);
        
        if (profileResult && profileResult.success && profileResult.profile) {
          logger.info('Found user profile in hybrid RAG', { userId: userContext.userId });
          
          // Parse birth data from profile
          if (profileResult.profile.birth_data) {
            try {
              const birthData = JSON.parse(profileResult.profile.birth_data);
              enhancedContext.birthData = birthData;
              logger.info('Enhanced user context with RAG profile birth data', { userId: userContext.userId });
            } catch (error) {
              logger.error('Error parsing birth data from profile:', error);
            }
          }
        } else {
          logger.info('No user profile found in RAG', { userId: userContext.userId });
        }
      }

      // Get chart data from hybrid RAG service
      if (userContext.userId) {
        const chartResult = await hybridRAGService.getAllUserCharts(userContext.userId);
        
        if (chartResult && chartResult.success && chartResult.charts) {
          enhancedContext.chartData = chartResult.charts;
          enhancedContext.hasCompleteChartData = this.hasCompleteChartData(chartResult.charts);
          
          logger.info('Enhanced user context with RAG chart data', {
            userId: userContext.userId,
            totalCharts: chartResult.totalCharts,
            hasCompleteChartData: enhancedContext.hasCompleteChartData,
            chartTypes: Object.keys(chartResult.charts),
            sampleChartData: Object.keys(chartResult.charts).map(type => ({
              type,
              count: chartResult.charts[type]?.length || 0,
              sampleData: chartResult.charts[type]?.[0]?.data ? Object.keys(chartResult.charts[type][0].data) : []
            }))
          });
        } else {
          logger.info('No chart data found for user', { userId: userContext.userId });
          enhancedContext.hasCompleteChartData = false;
        }
      }

      // If this is a contact chart, also get the owner's charts for compatibility analysis
      if (userContext.isContactChart && userContext.ownerUserId) {
        const ownerChartResult = await hybridRAGService.getAllUserCharts(userContext.ownerUserId);
        
        if (ownerChartResult && ownerChartResult.success && ownerChartResult.charts) {
          enhancedContext.ownerChartData = ownerChartResult.charts;
          enhancedContext.ownerHasCompleteChartData = this.hasCompleteChartData(ownerChartResult.charts);
          
          logger.info('Enhanced contact context with owner chart data', {
            contactId: userContext.userId,
            ownerUserId: userContext.ownerUserId,
            ownerTotalCharts: ownerChartResult.totalCharts,
            ownerHasCompleteChartData: enhancedContext.ownerHasCompleteChartData
          });
        }
      }

      logger.info('User context enhancement completed', {
        hasBirthData: !!enhancedContext.birthData,
        hasChartData: !!enhancedContext.chartData,
        hasCompleteChartData: enhancedContext.hasCompleteChartData,
        hasUserProfile: !!enhancedContext.userProfile,
        isContactChart: userContext.isContactChart,
        userId: userContext.userId
      });

    } catch (error) {
      logger.error('Error enhancing user context:', error);
    }

    return enhancedContext;
  }

  // Check if we have complete chart data for meaningful responses
  hasCompleteChartData(charts) {
    if (!charts || Object.keys(charts).length === 0) return false;
    
    // Check for essential chart types
    const essentialCharts = ['astro_details', 'planets', 'horo_chart'];
    const availableCharts = Object.keys(charts);
    
    // We need at least 2 out of 3 essential charts for meaningful responses
    const hasEssentialCharts = essentialCharts.filter(chartType => 
      availableCharts.includes(chartType) && charts[chartType].length > 0
    ).length >= 2;
    
    return hasEssentialCharts;
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
      const response = await fetch(`http://localhost:3000/api/user-profile/${userId}`, {
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
      'plan', 'daily', 'routine', 'schedule', 'day', 'hour', 'morning', 'evening', 'activity'
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

  // Process astrology-specific queries
  async processAstrologyQuery(query, userContext, conversationHistory = []) {
    const birthData = userContext.birthData;
    const chartData = userContext.chartData;
    const hasCompleteChartData = userContext.hasCompleteChartData;
    const userId = userContext.userId;
    
    logger.info('Processing astrology query with user context', { 
      userId, 
      hasBirthData: !!birthData,
      hasChartData: !!chartData,
      hasCompleteChartData: hasCompleteChartData,
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
    if (!hasCompleteChartData) {
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
      description: "Select the most relevant astrological charts based on the user's query for personalized analysis. This function should be called for ANY query that requires astrological insights, including but not limited to: daily planning, hourly schedules, personality analysis, career guidance, relationship advice, health insights, spiritual growth, life path questions, timing decisions, planetary influences, house analysis, dasha periods, and any other astrological consultation. The function intelligently chooses which chart types (astro_details, planets, horo_chart, current_vdasha, kalsarpa_details) are most relevant to provide accurate and personalized astrological guidance.",
      parameters: {
        type: "object",
        properties: {
          chart_types: {
            type: "array",
            items: {
              type: "string",
              enum: ["astro_details", "planets", "horo_chart", "current_vdasha", "kalsarpa_details"]
            },
            description: "List of chart types that are most relevant to the user's query. Choose from: astro_details (for personality, birth chart details), planets (for planetary positions and influences), horo_chart (for house analysis and daily activities), current_vdasha (for timing and periods), kalsarpa_details (for dosha analysis)"
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
        new HumanMessage(`Based on the chart analysis, please provide a detailed, personalized response using the actual chart data. Be specific about the user's astrological placements and provide actionable insights.`)
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
          
          // Return the AI's actual response content, which should include personalized insights
          return {
            response: response.content,
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

    return {
      response: response.content,
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
    
    return mentions.map(mention => ({
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
              const contactChartData = await hybridRAGService.getAllUserCharts(contactProfile.userId || contact.name);
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
          const userChartData = await hybridRAGService.getAllUserCharts(userContext.userId);
          
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
      // First, check if the contact exists in user's contacts
      const contactResult = await hybridRAGService.getContactByName(userId, contactName);
      if (contactResult.success && contactResult.contact.birthData) {
        logger.info('Found contact in user contacts', { contactName, userId });
        return {
          userId: contactResult.contact.contact_user_id || contactName,
          birthData: contactResult.contact.birthData,
          chartData: contactResult.contact.chartData
        };
      }

      // If not in contacts, check if contact name matches any user in the system
      const contactProfile = await hybridRAGService.getUserProfile(contactName);
      if (contactProfile && contactProfile.birthData) {
        // Store this contact for future use
        await hybridRAGService.storeUserContact(userId, {
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
      const { maleData, femaleData, matchmakingCharts, compatibilityScore, matchType } = userContext;
      
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
}

export const langChainService = new LangChainService(); 
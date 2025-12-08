import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';
import FirestoreService from './firestoreService.js';
import { logger } from '../utils/logger.js';

/**
 * Firestore-only RAG Service
 * Replaces HybridRAGService with pure Firestore implementation
 */
class FirestoreRAGService {
  constructor() {
    // Initialize Firestore service
    this.firestoreService = new FirestoreService();
    
    // Vector store (Pinecone preferred; memory fallback)
    this.vectorStore = null;
    this.embeddings = null;
    this.pinecone = null;
    this.pineconeIndex = null;
    
    logger.info('Firestore RAG Service initialized');
  }

  // Lazy initialization of embeddings
  async getEmbeddings() {
    if (!this.embeddings) {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not found, vector store features will be disabled');
        return null;
      }
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.embeddings;
  }

  isPineconeEnabled() {
    return !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX && process.env.PINECONE_HOST);
  }

  async getPineconeIndex() {
    if (!this.isPineconeEnabled()) return null;
    if (!this.pinecone) {
      const host = process.env.PINECONE_HOST;
      if (!host) {
        throw new Error('PINECONE_HOST is required for Pinecone v3 client');
      }
      this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    }
    if (!this.pineconeIndex) {
      this.pineconeIndex = this.pinecone.Index(process.env.PINECONE_INDEX);
    }
    return this.pineconeIndex;
  }

  getNamespaceForUser(userId) {
    return String(userId || 'unknown');
  }

  // ========================================
  // USER PROFILE OPERATIONS
  // ========================================

  /**
   * Store user profile data
   * @param {string} userId - Firebase Auth UID
   * @param {object} userData - User profile data
   * @returns {object} - Success status and profile data
   */
  async storeUserProfile(userId, userData) {
    try {
      logger.info('Storing user profile', { userId });

      const result = await this.firestoreService.storeUserProfile(userId, userData);
      
      logger.info('User profile stored successfully', { userId });
      
      return {
        success: true,
        profile: result.profile,
        message: 'Profile stored successfully'
      };

    } catch (error) {
      logger.error('Error storing user profile:', error);
      throw new Error(`Failed to store profile: ${error.message}`);
    }
  }

  /**
   * Get user profile data
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - User profile data or null if not found
   */
  async getUserProfile(userId) {
    try {
      logger.info('Getting user profile', { userId });

      const result = await this.firestoreService.getUserProfile(userId);
      
      if (!result) {
        logger.info('User profile not found', { userId });
        return null;
      }

      logger.info('User profile retrieved successfully', { userId });
      
      return {
        success: true,
        profile: result.profile,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        source: 'Firestore'
      };

    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update user profile data
   * @param {string} userId - Firebase Auth UID
   * @param {object} updateData - Profile data to update
   * @returns {object} - Success status
   */
  async updateUserProfile(userId, updateData) {
    try {
      logger.info('Updating user profile', { userId });

      await this.firestoreService.updateUserProfile(userId, updateData);
      
      logger.info('User profile updated successfully', { userId });
      
      return {
        success: true,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // ========================================
  // CHART DATA OPERATIONS
  // ========================================

  /**
   * Store chart data
   * @param {string} userId - Firebase Auth UID
   * @param {object} chartData - Chart data with type and data
   * @returns {object} - Success status and chart data
   */
  async storeChartData(userId, chartDataOrType, chartData) {
    try {
      // Support both signatures:
      // 1. storeChartData(userId, chartData) - old signature  
      // 2. storeChartData(userId, chartType, chartData) - new signature
      let actualChartType, actualChartData;
      
      if (chartData !== undefined) {
        // New signature: userId, chartType, chartData
        actualChartType = chartDataOrType;
        actualChartData = chartData;
      } else {
        // Old signature: userId, chartData
        actualChartData = chartDataOrType;
        actualChartType = actualChartData.chartType || actualChartData.type;
      }
      
      logger.info('Storing chart data', { userId, chartType: actualChartType });

      const result = await this.firestoreService.storeChartData(userId, actualChartType, actualChartData);
      
      // Store chart documents for RAG
      await this.storeChartDocuments(userId, actualChartData);
      
      logger.info('Chart data stored successfully', { userId, chartType: actualChartType });
      
      return {
        success: true,
        chart: result.chart,
        message: 'Chart data stored successfully'
      };

    } catch (error) {
      logger.error('Error storing chart data:', error);
      throw new Error(`Failed to store chart data: ${error.message}`);
    }
  }

  /**
   * Get all user charts
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - All user charts
   */
  async getAllUserCharts(userId) {
    try {
      logger.info('Getting all user charts', { userId });

      // First try to get charts from Firestore
      let charts = [];
      try {
        charts = await this.firestoreService.getUserCharts(userId);
        logger.info('Charts retrieved from Firestore', { userId, chartCount: charts.length });
      } catch (firestoreError) {
        logger.warn('Firestore access failed, trying RAG system', { userId, error: firestoreError.message });
        charts = [];
      }
      
      // If no charts in Firestore, try to access RAG system directly
      if (!charts || charts.length === 0) {
        logger.info('No charts in Firestore, accessing RAG system directly', { userId });
        
        // Try to access the vector store directly to get chart data
        if (this.vectorStore) {
          try {
            // Get documents from vector store for this user
            const documents = await this.vectorStore.similaritySearch('', 100); // Get all documents
            
            // Filter documents for this user
            const userDocuments = documents.filter(doc => 
              doc.metadata && doc.metadata.userId === userId
            );
            
            if (userDocuments.length > 0) {
              logger.info('Found charts in RAG vector store', { userId, documentCount: userDocuments.length });
              
              // Convert vector store documents back to chart format
              const chartsByType = {};
              userDocuments.forEach(doc => {
                const chartType = doc.metadata.chartType || 'unknown';
                if (!chartsByType[chartType]) {
                  chartsByType[chartType] = [];
                }
                
                // Reconstruct chart data from vector store document
                const chartData = {
                  id: doc.metadata.chartId || `rag_${chartType}`,
                  type: chartType,
                  chartType: chartType,
                  userId: userId,
                  data: doc.pageContent, // This contains the chart data
                  metadata: doc.metadata
                };
                
                chartsByType[chartType].push(chartData);
              });
              
              return {
                success: true,
                charts: chartsByType,
                totalCharts: userDocuments.length,
                chartTypes: Object.keys(chartsByType),
                source: 'RAG Vector Store'
              };
            }
          } catch (ragError) {
            logger.error('Error accessing RAG vector store:', ragError);
          }
        }
      }
      
      // Convert Firestore charts to the expected format using explicit chartType field
      const chartsByType = {};
      charts.forEach(chart => {
        // First try to get chartType from document data (should now be explicitly set)
        const chartType = chart.chartType || chart.type || chart.chart_type;
        
        if (chartType) {
          chartsByType[chartType] = [chart]; // Wrap in array for compatibility
        } else {
          // Fallback: extract from document ID if chartType is still missing
          // Document ID format: ${uid}_${chartType}_${timestamp}
          if (chart.id) {
            const idParts = chart.id.split('_');
            if (idParts.length >= 2) {
              const fallbackType = idParts[1]; // Second part is the chart type
              logger.warn('Using fallback chart type from document ID', { 
                chartId: chart.id, 
                fallbackType 
              });
              chartsByType[fallbackType] = [chart];
            }
          }
        }
      });

      logger.info('User charts retrieved successfully', { userId, totalCharts: charts.length, source: 'Firestore' });
      
      return {
        success: true,
        charts: chartsByType,
        totalCharts: charts.length,
        chartTypes: Object.keys(chartsByType),
        source: 'Firestore'
      };

    } catch (error) {
      logger.error('Error getting user charts:', error);
      // Return empty structure instead of throwing to prevent endpoint failures
      return {
        success: false,
        charts: {},
        totalCharts: 0,
        chartTypes: [],
        source: 'Error',
        error: error.message
      };
    }
  }

  /**
   * Get user charts (alias for getAllUserCharts for compatibility)
   * @param {string} userId - Firebase Auth UID
   * @returns {array} - Array of user charts
   */
  async getUserCharts(userId) {
    try {
      const result = await this.getAllUserCharts(userId);
      // Handle both object format (from RAG) and array format (from Firestore)
      if (result.charts && typeof result.charts === 'object' && !Array.isArray(result.charts)) {
        return Object.values(result.charts);
      } else if (Array.isArray(result.charts)) {
        return result.charts;
      } else if (Array.isArray(result)) {
        return result;
      }
      return [];
    } catch (error) {
      logger.error('Error getting user charts:', error);
      throw error;
    }
  }

  /**
   * Get specific chart by type
   * @param {string} userId - Firebase Auth UID
   * @param {string} chartType - Type of chart
   * @returns {object} - Chart data or null if not found
   */
  async getChartByType(userId, chartType) {
    try {
      logger.info('Getting specific chart', { userId, chartType });

      const chart = await this.firestoreService.getChartByType(userId, chartType);
      
      if (!chart) {
        logger.info('Chart not found', { userId, chartType });
        return null;
      }

      logger.info('Chart retrieved successfully', { userId, chartType });
      
      return {
        success: true,
        chartData: chart.data,
        metadata: {
          createdAt: chart.createdAt,
          updatedAt: chart.updatedAt
        }
      };

    } catch (error) {
      logger.error('Error getting chart:', error);
      throw new Error(`Failed to get chart: ${error.message}`);
    }
  }

  // ========================================
  // USER CONTACT OPERATIONS
  // ========================================

  /**
   * Store user contact
   * @param {string} userId - Firebase Auth UID
   * @param {object} contactData - Contact data
   * @returns {object} - Success status and contact data
   */
  async storeUserContact(userId, contactData) {
    try {
      logger.info('Storing user contact', { userId, contactName: contactData.name || contactData.contactName });

      const result = await this.firestoreService.storeUserContact(userId, contactData);
      
      logger.info('User contact stored successfully', { userId });
      
      return {
        success: true,
        contact: result.contact,
        message: 'Contact stored successfully'
      };

    } catch (error) {
      logger.error('Error storing user contact:', error);
      throw new Error(`Failed to store contact: ${error.message}`);
    }
  }

  /**
   * Get user contacts
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - All user contacts
   */
  async getUserContacts(userId) {
    try {
      logger.info('Getting user contacts', { userId });

      const contacts = await this.firestoreService.getUserContacts(userId);
      
      logger.info('User contacts retrieved successfully', { userId, contactCount: contacts.length });
      
      return {
        success: true,
        contacts: contacts,
        totalContacts: contacts.length,
        source: 'Firestore'
      };

    } catch (error) {
      logger.error('Error getting user contacts:', error);
      throw new Error(`Failed to get contacts: ${error.message}`);
    }
  }

  /**
   * Get contact by name
   * @param {string} userId - Firebase Auth UID
   * @param {string} contactName - Contact name
   * @returns {object} - Contact data
   */
  async getContactByName(userId, contactName) {
    try {
      logger.info('Getting contact by name', { userId, contactName });

      const contacts = await this.firestoreService.getUserContacts(userId);
      
      // Find contact by name (case-insensitive)
      const contact = contacts.find(c => 
        (c.name || '').toLowerCase() === contactName.toLowerCase() ||
        (c.contactName || '').toLowerCase() === contactName.toLowerCase()
      );
      
      if (contact) {
        logger.info('Contact found by name', { userId, contactName });
        return {
          success: true,
          contact: contact
        };
      }
      
      logger.info('Contact not found by name', { userId, contactName });
      return {
        success: false,
        contact: null
      };

    } catch (error) {
      logger.error('Error getting contact by name:', error);
      return {
        success: false,
        contact: null,
        error: error.message
      };
    }
  }

  /**
   * Update contact chart data
   * @param {string} userId - Firebase Auth UID
   * @param {string} contactName - Contact name
   * @param {array} chartData - Chart data to update
   * @returns {object} - Success status
   */
  async updateContactChartData(userId, contactName, chartData) {
    try {
      logger.info('Updating contact chart data', { userId, contactName });

      const contactResult = await this.getContactByName(userId, contactName);
      
      if (!contactResult.success || !contactResult.contact) {
        throw new Error(`Contact ${contactName} not found`);
      }
      
      const contact = contactResult.contact;
      // Extract contactId - handle both document ID format (userId_contactId) and direct contactId
      let contactId = contact.contactId;
      if (!contactId && contact.id) {
        // If id is in format "userId_contactId", extract just the contactId part
        const idParts = contact.id.split('_');
        contactId = idParts.length > 1 ? idParts.slice(1).join('_') : contact.id;
      }
      
      if (!contactId) {
        throw new Error(`Could not determine contactId for contact ${contactName}`);
      }
      
      // Update contact with chart data
      await this.firestoreService.updateUserContact(userId, contactId, {
        chartData: chartData,
        chartDataUpdatedAt: new Date().toISOString()
      });
      
      logger.info('Contact chart data updated successfully', { userId, contactName });
      
      return {
        success: true,
        message: 'Contact chart data updated successfully'
      };

    } catch (error) {
      logger.error('Error updating contact chart data:', error);
      throw new Error(`Failed to update contact chart data: ${error.message}`);
    }
  }

  // ========================================
  // CHAT MESSAGE OPERATIONS
  // ========================================

  /**
   * Save chat message
   * @param {string} userId - Firebase Auth UID
   * @param {string} messageType - Type of message (user/assistant)
   * @param {string} content - Message content
   * @param {object} metadata - Additional message metadata
   * @param {string} conversationId - Conversation ID (optional, will create new if not provided)
   * @returns {object} - Success status
   */
  async saveChatMessage(userId, messageType, content, metadata = {}, conversationId = null) {
    try {
      logger.info('Saving chat message', { userId, messageType, content, conversationId });

      // If no conversation ID provided, create a new conversation
      if (!conversationId) {
        const newConversation = await this.firestoreService.createNewChat(userId, {
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          metadata: { type: 'personal_chat' }
        });
        conversationId = newConversation.conversationId;
        logger.info('Created new conversation for message', { userId, conversationId });
      } else {
        // Check if conversation exists, if not create it
        const conversationExists = await this.firestoreService.checkConversationExists(conversationId);
        if (!conversationExists) {
          logger.info('Conversation does not exist, creating new one', { conversationId });
          const newConversation = await this.firestoreService.createNewChat(userId, {
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            metadata: { type: 'personal_chat' }
          }, conversationId);
          logger.info('Created conversation with provided ID', { userId, conversationId });
        }
      }
      
      // Prepare message data
      const messageData = {
        role: messageType,
        content: content,
        metadata: metadata
      };
      
      const result = await this.firestoreService.storeChatMessage(userId, conversationId, messageData);
      
      // Update conversation timestamp
      await this.firestoreService.updateChatTimestamp(conversationId);
      
      logger.info('Chat message saved successfully', { userId, conversationId });
      
      return {
        success: true,
        conversationId: conversationId,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Get group compatibility context from conversation history
   * @param {string} userId - Firebase Auth UID
   * @param {string} conversationId - Conversation ID
   * @returns {object|null} - Context with groupMembers, groupType, analysisFocus or null
   */
  async getGroupCompatibilityContext(userId, conversationId) {
    try {
      logger.info('Getting group compatibility context', { userId, conversationId });
      
      if (!conversationId) {
        return null;
      }

      // Get recent messages from this conversation
      const messages = await this.firestoreService.getChatHistory(conversationId, 20);
      
      // Find the most recent message with groupMembers in metadata
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const metadata = message.metadata || {};
        
        if (metadata.groupMembers && Array.isArray(metadata.groupMembers) && metadata.groupMembers.length >= 2) {
          logger.info('Found group compatibility context in conversation', {
            userId,
            conversationId,
            messageIndex: i,
            memberCount: metadata.groupMembers.length,
            groupType: metadata.groupType,
            analysisFocus: metadata.analysisFocus
          });
          
          return {
            groupMembers: metadata.groupMembers,
            groupType: metadata.groupType || 'friendship',
            analysisFocus: metadata.analysisFocus || 'dynamics'
          };
        }
      }
      
      logger.info('No group compatibility context found in conversation', { userId, conversationId });
      return null;
      
    } catch (error) {
      logger.error('Error getting group compatibility context:', error);
      return null;
    }
  }

  /**
   * Get chat history
   * @param {string} userId - Firebase Auth UID
   * @param {number} limit - Maximum number of messages to retrieve
   * @param {string} conversationId - Conversation ID (optional)
   * @returns {array} - Array of chat messages
   */
  async getChatHistory(userId, limit = 50, conversationId = null) {
    try {
      logger.info('Getting chat history', { userId, limit, conversationId });
      
      if (!conversationId) {
        // If no conversation ID, get recent conversations first
        const conversations = await this.getRecentConversations(userId, 1);
        if (conversations.success && conversations.conversations.length > 0) {
          conversationId = conversations.conversations[0].conversationId;
        }
      }
      
      if (!conversationId) {
        logger.info('No conversation ID provided and no recent conversations found', { userId });
        return [];
      }
      
      const messages = await this.firestoreService.getChatHistory(conversationId, limit);
      
      logger.info('Chat history retrieved successfully', { userId, conversationId, messageCount: messages.length });
      
      return messages;

    } catch (error) {
      logger.error('Error getting chat history:', error);
      throw error;
    }
  }

  /**
   * Get recent conversations
   * @param {string} userId - Firebase Auth UID
   * @param {number} limit - Maximum number of conversations to retrieve
   * @returns {object} - Recent conversations
   */
  async getRecentConversations(userId, limit = 10) {
    try {
      logger.info('Getting recent conversations', { userId, limit });
      
      // Try to get conversations with ordering, but fallback to simple query if index is missing
      let conversations;
      try {
        conversations = await this.firestoreService.queryWithFilters(
          'chats',
          [{ field: 'userId', operator: '==', value: userId }],
          { orderBy: { field: 'updatedAt', direction: 'desc' }, limit: limit * 2 } // Get more to filter later
        );
        
        logger.info('Recent conversations retrieved successfully with ordering', { userId, conversationCount: conversations.length });
        
      } catch (indexError) {
        // If index is missing, fallback to simple query without ordering
        if (indexError.message && indexError.message.includes('FAILED_PRECONDITION') && indexError.message.includes('requires an index')) {
          logger.warn('Firestore index missing for conversations, falling back to simple query', { userId, error: indexError.message });
          
          conversations = await this.firestoreService.queryWithFilters(
            'chats',
            [{ field: 'userId', operator: '==', value: userId }],
            { limit: limit * 2 }
          );
          
          // Sort in memory as fallback
          conversations.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
            const bTime = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
            return bTime - aTime;
          });
          
          logger.info('Recent conversations retrieved with fallback sorting', { userId, conversationCount: conversations.length });
        } else {
          // Re-throw if it's not an index error
          throw indexError;
        }
      }

      // Enrich conversations with message counts and last message info
      const enrichedConversations = await Promise.all(conversations.slice(0, limit).map(async (conv) => {
        try {
          const conversationId = conv.conversationId || conv.id;
          
          // Get message count and last message
          const messages = await this.firestoreService.getChatHistory(conversationId, 1);
          const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
          
          // Get total message count (query all messages and count)
          const allMessages = await this.firestoreService.getChatHistory(conversationId, 1000);
          const messageCount = allMessages.length;
          
          return {
            conversationId: conversationId,
            id: conversationId, // Support both fields
            title: conv.title || conv.metadata?.title || `Chat ${conversationId.slice(-8)}`,
            preview: lastMessage?.content?.substring(0, 100) || '',
            lastMessage: lastMessage?.content?.substring(0, 100) || '',
            lastMessageTime: conv.updatedAt || lastMessage?.timestamp || conv.createdAt || new Date(),
            updatedAt: conv.updatedAt || conv.createdAt || new Date(),
            createdAt: conv.createdAt || new Date(),
            messageCount: messageCount,
            metadata: conv.metadata || {}
          };
        } catch (error) {
          logger.warn('Error enriching conversation data', { conversationId: conv.conversationId || conv.id, error: error.message });
          // Return basic data if enrichment fails
          return {
            conversationId: conv.conversationId || conv.id,
            id: conv.conversationId || conv.id,
            title: conv.title || `Chat ${(conv.conversationId || conv.id).slice(-8)}`,
            preview: '',
            lastMessage: '',
            lastMessageTime: conv.updatedAt || conv.createdAt || new Date(),
            updatedAt: conv.updatedAt || conv.createdAt || new Date(),
            createdAt: conv.createdAt || new Date(),
            messageCount: 0,
            metadata: conv.metadata || {}
          };
        }
      }));

      logger.info('Recent conversations enriched successfully', { userId, enrichedCount: enrichedConversations.length });
      
      return { success: true, conversations: enrichedConversations };

    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      // Return empty conversations instead of throwing to prevent 500 errors
      return { success: true, conversations: [] };
    }
  }

  // ========================================
  // RAG OPERATIONS
  // ========================================

  /**
   * Store chart documents for RAG
   * @param {string} userId - Firebase Auth UID
   * @param {object} chartData - Chart data
   */
  async storeChartDocuments(userId, chartData) {
    try {
      const embeddings = await this.getEmbeddings();
      if (!embeddings) {
        logger.info('Skipping chart documents storage - embeddings not available');
        return;
      }

      // Convert chart data to documents for vector search
      const documents = this.convertChartToDocuments(userId, chartData);

      const pineconeIndex = await this.getPineconeIndex();
      if (pineconeIndex) {
        const namespace = this.getNamespaceForUser(userId);
        await PineconeStore.fromDocuments(documents, embeddings, {
          pineconeIndex,
          namespace
        });
        logger.info('Chart documents stored in Pinecone', { userId, chartType: chartData.type, documentCount: documents.length, namespace });
        return;
      }

      // Fallback to in-memory vector store
      if (!this.vectorStore) {
        this.vectorStore = new MemoryVectorStore(embeddings);
      }
      await this.vectorStore.addDocuments(documents);
      logger.info('Chart documents stored in local vector store', { userId, chartType: chartData.type, documentCount: documents.length });
      
    } catch (error) {
      logger.error('Error storing chart documents:', error);
      // Don't throw error as this is supplementary functionality
    }
  }

  /**
   * Convert chart data to documents
   * @param {string} userId - Firebase Auth UID
   * @param {object} chartData - Chart data
   * @returns {array} - Array of documents
   */
  convertChartToDocuments(userId, chartData) {
    const documents = [];
    
    try {
      // Create document for overall chart
      documents.push(new Document({
        pageContent: `Chart Type: ${chartData.type}\nUser: ${userId}\nChart Data: ${JSON.stringify(chartData, null, 2)}`,
        metadata: {
          userId: userId,
          chartType: chartData.type,
          source: 'chart_data',
          timestamp: new Date().toISOString()
        }
      }));

      // Create documents for specific chart elements if available
      if (chartData.planets) {
        chartData.planets.forEach(planet => {
          documents.push(new Document({
            pageContent: `Planet: ${planet.name}\nSign: ${planet.sign}\nHouse: ${planet.house}\nDegree: ${planet.degree}`,
            metadata: {
              userId: userId,
              chartType: chartData.type,
              source: 'planet_data',
              planetName: planet.name,
              timestamp: new Date().toISOString()
            }
          }));
        });
      }

      if (chartData.houses) {
        chartData.houses.forEach((house, index) => {
          documents.push(new Document({
            pageContent: `House ${index + 1}: ${house.sign}\nCusp: ${house.cusp}`,
            metadata: {
              userId: userId,
              chartType: chartData.type,
              source: 'house_data',
              houseNumber: index + 1,
              timestamp: new Date().toISOString()
            }
          }));
        });
      }

    } catch (error) {
      logger.error('Error converting chart to documents:', error);
    }

    return documents;
  }

  /**
   * Search relevant documents
   * @param {string} query - Search query
   * @param {string} userId - Firebase Auth UID
   * @param {number} k - Number of results to return
   * @returns {array} - Array of relevant documents
   */
  async searchRelevantDocuments(query, userId, k = 5) {
    try {
      const embeddings = await this.getEmbeddings();
      const pineconeIndex = await this.getPineconeIndex();
      let results = [];

      if (pineconeIndex) {
        const namespace = this.getNamespaceForUser(userId);
        const store = await PineconeStore.fromExistingIndex(embeddings, {
          pineconeIndex,
          namespace
        });
        results = await store.similaritySearch(query, k);
      } else if (this.vectorStore) {
        results = await this.vectorStore.similaritySearch(query, k);
      } else {
        logger.warn('Vector store not initialized, returning empty results');
        return [];
      }
      
      // Filter by user ID
      const userResults = results.filter(doc => doc.metadata.userId === userId);
      
      logger.info('Document search completed', { query, userId, resultCount: userResults.length });
      
      return userResults;

    } catch (error) {
      logger.error('Error searching documents:', error);
      return [];
    }
  }

  // ========================================
  // RUNTIME RAG PROCESSING
  // ========================================
  
  /**
   * Process charts for RAG at runtime (when needed for function calling)
   * This method fetches charts from Firestore and processes them for RAG
   * @param {string} userId - Firebase Auth UID
   * @param {string} chartType - Type of chart to process (optional)
   * @returns {object} - Processed charts ready for RAG
   */
  async processChartsForRAG(userId, chartType = null) {
    try {
      logger.info('Processing charts for RAG at runtime', { userId, chartType });
      
      // Get charts from Firestore
      const charts = await this.firestoreService.getUserCharts(userId);
      
      logger.info('Raw charts from Firestore:', { 
        userId, 
        chartCount: charts?.length || 0,
        chartIds: charts?.map(c => c.id) || [],
        chartKeys: charts?.map(c => Object.keys(c)) || []
      });
      
      if (!charts || charts.length === 0) {
        logger.warn('No charts found for RAG processing', { userId });
        return { success: false, charts: [], message: 'No charts available' };
      }
      
      // Filter by chart type if specified
      let chartsToProcess = charts;
      if (chartType) {
        chartsToProcess = charts.filter(chart => 
          chart.type === chartType || 
          chart.chartType === chartType ||
          chart.id?.includes(chartType)
        );
      }
      
      // Ensure each chart has a type field for RAG processing
      chartsToProcess = chartsToProcess.map(chart => {
        // Extract chart type from various possible sources
        let chartType = chart.type || chart.chartType;
        
        // If no type field, try to extract from document ID
        if (!chartType && chart.id) {
          const idParts = chart.id.split('_');
          if (idParts.length >= 2) {
            chartType = idParts[1]; // userId_chartType_timestamp format
          }
        }
        
        return {
          ...chart,
          type: chartType || 'unknown',
          chartType: chartType || 'unknown'
        };
      });
      
      // Process charts for RAG (create embeddings, vector store, etc.)
      const processedCharts = await this.processChartsForVectorStore(chartsToProcess);
      
      logger.info('Charts processed for RAG successfully', { 
        userId, 
        processedCount: processedCharts.length,
        processedChartTypes: processedCharts.map(c => c.type || c.chartType || 'unknown'),
        processedChartIds: processedCharts.map(c => c.id)
      });
      
      return {
        success: true,
        charts: processedCharts,
        message: 'Charts processed for RAG successfully'
      };
      
    } catch (error) {
      logger.error('Error processing charts for RAG:', error);
      return {
        success: false,
        charts: [],
        error: error.message
      };
    }
  }
  
  /**
   * Process charts for vector store operations
   * @param {Array} charts - Array of chart data
   * @returns {Array} - Processed charts with embeddings
   */
  async processChartsForVectorStore(charts) {
    try {
      const embeddings = await this.getEmbeddings();
      if (!embeddings) {
        logger.warn('OpenAI API key not available, returning charts without embeddings');
        return charts;
      }
      
      // Convert charts to documents for vector store
      const documents = charts.map(chart => {
        const content = this.formatChartForVectorStore(chart);
        return new Document({
          pageContent: content,
          metadata: {
            userId: chart.userId,
            chartType: chart.type,
            chartId: chart.id || chart.type,
            timestamp: chart.createdAt || new Date().toISOString()
          }
        });
      });
      
      // Prefer Pinecone, fallback to memory
      const pineconeIndex = await this.getPineconeIndex();
      if (pineconeIndex) {
        const userId = charts[0]?.userId || 'unknown';
        const namespace = this.getNamespaceForUser(userId);
        await PineconeStore.fromDocuments(documents, embeddings, {
          pineconeIndex,
          namespace
        });
        logger.info('Pinecone index updated with charts', { chartCount: charts.length, namespace });
      } else {
        this.vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
        logger.info('In-memory vector store updated with charts', { chartCount: charts.length });
      }
      
      return charts;
      
    } catch (error) {
      logger.error('Error processing charts for vector store:', error);
      return charts; // Return charts without vector processing
    }
  }
  
  /**
   * Format chart data for vector store processing
   * @param {object} chart - Chart data object
   * @returns {string} - Formatted text content
   */
  formatChartForVectorStore(chart) {
    let content = `Chart Type: ${chart.type || chart.chartType || 'unknown'}\n`;
    
    // Handle different chart data structures
    if (chart.data) {
      // If chart has a data field, use that
      content += `Chart Data: ${JSON.stringify(chart.data)}\n`;
    } else if (chart.planets) {
      content += `Planets: ${JSON.stringify(chart.planets)}\n`;
    } else if (chart.astro_details) {
      content += `Astro Details: ${JSON.stringify(chart.astro_details)}\n`;
    } else if (chart.horo_chart) {
      content += `Horo Chart: ${JSON.stringify(chart.horo_chart)}\n`;
    } else if (chart.current_vdasha) {
      content += `Current Vdasha: ${JSON.stringify(chart.current_vdasha)}\n`;
    } else if (chart.kalsarpa_details) {
      content += `Kalsarpa Details: ${JSON.stringify(chart.kalsarpa_details)}\n`;
    }
    
    // Add any additional fields that might contain chart data
    Object.keys(chart).forEach(key => {
      if (key !== 'type' && key !== 'chartType' && key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
        if (typeof chart[key] === 'object' && chart[key] !== null) {
          content += `${key}: ${JSON.stringify(chart[key])}\n`;
        }
      }
    });
    
    return content;
  }

  // ========================================
  // UTILITY OPERATIONS
  // ========================================

  /**
   * Health check for the service
   * @returns {object} - Health status
   */
  async healthCheck() {
    try {
      logger.info('Performing Firestore RAG service health check');

      const firestoreHealth = await this.firestoreService.healthCheck();
      
      const health = {
        success: firestoreHealth.success,
        status: firestoreHealth.success ? 'healthy' : 'unhealthy',
        services: {
          firestore: firestoreHealth.status,
          vectorStore: this.vectorStore ? 'initialized' : 'not_initialized',
          embeddings: this.embeddings ? 'initialized' : 'not_initialized'
        },
        timestamp: new Date().toISOString(),
        message: 'Firestore RAG service health check completed'
      };

      logger.info('Firestore RAG service health check completed', { status: health.status });
      
      return health;

    } catch (error) {
      logger.error('Firestore RAG service health check failed:', error);
      
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Firestore RAG service health check failed'
      };
    }
  }

  /**
   * Initialize vector store with existing data
   * @param {string} userId - Firebase Auth UID (optional, if not provided, loads all data)
   */
  async initializeVectorStore(userId = null) {
    try {
      logger.info('Initializing vector store', { userId });

      const embeddings = await this.getEmbeddings();
      if (!embeddings) {
        logger.warn('Cannot initialize vector store - embeddings not available');
        return false;
      }

      this.vectorStore = new MemoryVectorStore(embeddings);

      // Load existing chart data
      if (userId) {
        const charts = await this.firestoreService.getUserCharts(userId);
        for (const chart of charts) {
          const documents = this.convertChartToDocuments(userId, chart);
          await this.vectorStore.addDocuments(documents);
        }
        logger.info('Vector store initialized for user', { userId, chartCount: charts.length });
      } else {
        // For now, we'll initialize empty and load data as needed
        logger.info('Vector store initialized (empty)');
      }

      return true;

    } catch (error) {
      logger.error('Error initializing vector store:', error);
      return false;
    }
  }

  /**
   * Store user charts in Firestore
   * @param {string} userId - Firebase Auth UID
   * @param {Array} charts - Array of chart data
   * @returns {object} - Success status and stored chart count
   */
  async storeUserCharts(userId, charts) {
    try {
      logger.info('Storing user charts in Firestore', { userId, chartCount: charts.length });

      let storedCount = 0;
      for (const chart of charts) {
        try {
          const chartType = chart.type || 'unknown';
          await this.firestoreService.storeChartData(userId, chartType, chart);
          storedCount++;
          logger.info('Chart stored successfully', { userId, chartType });
        } catch (chartError) {
          logger.error('Error storing individual chart', { userId, chartType: chart.type, error: chartError.message });
        }
      }

      logger.info('User charts stored successfully', { userId, storedCount });
      
      return {
        success: true,
        storedCharts: storedCount,
        message: `Successfully stored ${storedCount} charts`
      };

    } catch (error) {
      logger.error('Error storing user charts:', error);
      return {
        success: false,
        storedCharts: 0,
        error: error.message,
        message: 'Failed to store user charts'
      };
    }
  }

  /**
   * Search charts by query for LLM context
   * @param {string} userId - Firebase Auth UID
   * @param {string} query - User query for context relevance
   * @returns {object} - Success status and relevant charts
   */
  async searchChartsByQuery(userId, query) {
    try {
      logger.info('Searching charts by query for LLM context', { userId, query: query.substring(0, 100) });

      // Get all user charts first
      const allCharts = await this.getAllUserCharts(userId);
      
      if (!allCharts.success || !allCharts.charts) {
        logger.warn('No charts found for query search', { userId });
        return {
          success: false,
          charts: {},
          message: 'No charts available for search'
        };
      }

      // For now, return all charts (the ChartManagementService will handle optimization)
      // In the future, this could implement semantic search using the vector store
      logger.info('Charts found for query search', { 
        userId, 
        totalCharts: allCharts.totalCharts,
        chartTypes: allCharts.chartTypes 
      });

      return {
        success: true,
        charts: allCharts.charts,
        totalCharts: allCharts.totalCharts,
        chartTypes: allCharts.chartTypes,
        message: 'Charts retrieved for query search'
      };

    } catch (error) {
      logger.error('Error searching charts by query:', error);
      return {
        success: false,
        charts: {},
        error: error.message,
        message: 'Failed to search charts by query'
      };
    }
  }

  /**
   * Get latest matchmaking charts for a user
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - Latest matchmaking data
   */
  async getLatestMatchmakingCharts(userId) {
    try {
      logger.info('Getting latest matchmaking charts', { userId });

      // Get user's charts from Firestore
      const userCharts = await this.firestoreService.getUserCharts(userId);
      
      // Check if userCharts is an object (from RAG service) or array (from Firestore service)
      let chartsArray = [];
      if (Array.isArray(userCharts)) {
        chartsArray = userCharts;
      } else if (userCharts && typeof userCharts === 'object') {
        // Convert object to array format
        chartsArray = Object.entries(userCharts).map(([chartType, chartData]) => {
          // Handle array format - get the first item if it's an array
          const actualData = Array.isArray(chartData) ? chartData[0] : chartData;
          return {
            chartType: chartType,
            data: actualData,
            timestamp: actualData?.createdAt || actualData?.timestamp || new Date().toISOString()
          };
        });
      }
      
      // Filter for matchmaking charts
      const matchmakingCharts = chartsArray.filter(chart => 
        chart.chartType === 'matchmaking_history' || 
        chart.chartType === 'matchmaking_comprehensive' ||
        (chart.data && chart.data.matchType) || // Also check for matchmaking data in the data field
        (chart.data && chart.data.data && chart.data.data.matchType) // Check nested data structure
      );

      logger.info('Debug: matchmaking charts found', { 
        totalCharts: chartsArray.length, 
        matchmakingCharts: matchmakingCharts.length,
        chartTypes: chartsArray.map(c => c.chartType)
      });

      if (matchmakingCharts.length === 0) {
        return {
          success: false,
          error: 'No matchmaking data found'
        };
      }

      // Get the most recent matchmaking chart
      const latestChart = matchmakingCharts.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];

      // Handle nested data structure (data.data)
      const matchmakingData = latestChart.data.data || latestChart.data;

      return {
        success: true,
        data: matchmakingData
      };

    } catch (error) {
      logger.error('Error getting latest matchmaking charts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get matchmaking data by specific match ID
   * @param {string} userId - Firebase Auth UID
   * @param {string} matchId - Specific match ID
   * @returns {object} - Matchmaking data for specific match
   */
  async getMatchmakingDataByMatchId(userId, matchId) {
    try {
      logger.info('Getting matchmaking data by match ID', { userId, matchId });

      // Get user's charts from Firestore
      const userCharts = await this.firestoreService.getUserCharts(userId);
      
      // Find chart with specific match ID
      const matchChart = userCharts.find(chart => 
        chart.data && chart.data.matchId === matchId
      );

      if (!matchChart) {
        return {
          success: false,
          error: 'Match not found'
        };
      }

      return {
        success: true,
        data: matchChart.data
      };

    } catch (error) {
      logger.error('Error getting matchmaking data by match ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ensure matchmaking data is stored in Pinecone for faster RAG
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - Success status
   */
  async ensureMatchmakingDataInPinecone(userId) {
    try {
      logger.info('Ensuring matchmaking data is in Pinecone for faster RAG', { userId });

      // Get latest matchmaking data
      const matchmakingResult = await this.getLatestMatchmakingCharts(userId);
      
      if (!matchmakingResult.success) {
        logger.info('No matchmaking data found to store in Pinecone', { userId });
        return { success: false, error: 'No matchmaking data found' };
      }

      const matchmakingData = matchmakingResult.data;
      
      // Check if matchmaking data is already in Pinecone
      const ragCharts = await this.getAllUserCharts(userId);
      const existingMatchmaking = ragCharts.charts && ragCharts.charts.matchmaking_history;
      
      if (existingMatchmaking) {
        logger.info('Matchmaking data already exists in Pinecone', { userId });
        return { success: true, message: 'Matchmaking data already in Pinecone' };
      }

      // Store matchmaking data in Pinecone
      logger.info('Storing matchmaking data in Pinecone for faster RAG', { userId });
      
      // Create a comprehensive matchmaking document for RAG
      const matchmakingDocument = {
        chartType: 'matchmaking_history',
        userId: userId,
        data: matchmakingData,
        timestamp: new Date().toISOString(),
        // Create searchable content for RAG
        content: this.createMatchmakingContent(matchmakingData)
      };

      // Store in Pinecone
      await this.storeChartDocuments(userId, matchmakingDocument);
      
      logger.info('Matchmaking data successfully stored in Pinecone', { userId });
      return { success: true, message: 'Matchmaking data stored in Pinecone' };

    } catch (error) {
      logger.error('Error ensuring matchmaking data in Pinecone:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper method to create searchable content from matchmaking data
   * @param {object} matchmakingData - Matchmaking data object
   * @returns {string} - Searchable content string
   */
  createMatchmakingContent(matchmakingData) {
    const content = [];
    
    // Extract names from chartData.charts.match_birth_details
    if (matchmakingData.chartData && matchmakingData.chartData.charts && matchmakingData.chartData.charts.match_birth_details) {
      const birthDetails = matchmakingData.chartData.charts.match_birth_details;
      
      if (birthDetails.male_birth_details) {
        const male = birthDetails.male_birth_details;
        content.push(`Male: ${male.name}, born ${male.date} at ${male.time} in ${male.place}`);
      }
      
      if (birthDetails.female_birth_details) {
        const female = birthDetails.female_birth_details;
        content.push(`Female: ${female.name}, born ${female.date} at ${female.time} in ${female.place}`);
      }
    }
    
    // Fallback to direct maleData/femaleData if available
    if (matchmakingData.maleData) {
      content.push(`Male: ${matchmakingData.maleData.name}, born ${matchmakingData.maleData.date} at ${matchmakingData.maleData.time} in ${matchmakingData.maleData.place}`);
    }
    
    if (matchmakingData.femaleData) {
      content.push(`Female: ${matchmakingData.femaleData.name}, born ${matchmakingData.femaleData.date} at ${matchmakingData.femaleData.time} in ${matchmakingData.femaleData.place}`);
    }
    
    if (matchmakingData.compatibilityScore) {
      content.push(`Compatibility Score: ${matchmakingData.compatibilityScore}%`);
    }
    
    if (matchmakingData.matchType) {
      content.push(`Match Type: ${matchmakingData.matchType}`);
    }
    
    if (matchmakingData.summary) {
      content.push(`Summary: ${matchmakingData.summary}`);
    }
    
    if (matchmakingData.chartData && matchmakingData.chartData.charts) {
      const charts = matchmakingData.chartData.charts;
      
      // Basic compatibility reports
      if (charts.match_simple_report) {
        content.push(`Simple Report: ${charts.match_simple_report.recommendation}`);
        if (charts.match_simple_report.key_points) {
          content.push(`Key Points: ${charts.match_simple_report.key_points.join(', ')}`);
        }
        if (charts.match_simple_report.compatibility_score) {
          content.push(`Compatibility Score: ${charts.match_simple_report.compatibility_score}%`);
        }
      }
      
      if (charts.match_ashtakoot_points) {
        content.push(`Ashtakoota Points: ${charts.match_ashtakoot_points.total_points} out of 36`);
        if (charts.match_ashtakoot_points.points_breakdown) {
          content.push(`Points Breakdown: ${JSON.stringify(charts.match_ashtakoot_points.points_breakdown)}`);
        }
      }
      
      if (charts.match_obstructions) {
        content.push(`Obstructions: ${charts.match_obstructions.obstruction_details}`);
        if (charts.match_obstructions.remedial_measures) {
          content.push(`Remedial Measures: ${charts.match_obstructions.remedial_measures}`);
        }
      }
      
      // Additional comprehensive charts for better chat context
      if (charts.match_rajju_dosha) {
        content.push(`Rajju Dosha: ${JSON.stringify(charts.match_rajju_dosha)}`);
      }
      
      if (charts.match_making_detailed_report) {
        content.push(`Detailed Report: ${JSON.stringify(charts.match_making_detailed_report)}`);
      }
      
      if (charts.match_dashakoot_points) {
        content.push(`Dasha Koota Points: ${JSON.stringify(charts.match_dashakoot_points)}`);
      }
      
      if (charts.match_percentage) {
        content.push(`Overall Compatibility Percentage: ${JSON.stringify(charts.match_percentage)}`);
      }
      
      if (charts.match_horoscope) {
        content.push(`Combined Horoscope: ${JSON.stringify(charts.match_horoscope)}`);
      }
      
      if (charts.match_manglik_report) {
        content.push(`Manglik Report: ${JSON.stringify(charts.match_manglik_report)}`);
      }
      
      if (charts.match_making_report) {
        content.push(`Matchmaking Report: ${JSON.stringify(charts.match_making_report)}`);
      }
    }
    
    return content.join(' ');
  }

  /**
   * Sync RAG data back to Firestore for profile display
   * @param {string} userId - Firebase Auth UID
   * @returns {object} - Success status and synced chart count
   */
  async syncRAGToFirestore(userId) {
    try {
      logger.info('Syncing RAG data to Firestore', { userId });

      if (!this.vectorStore) {
        logger.warn('Vector store not initialized, cannot sync RAG data');
        return {
          success: false,
          message: 'Vector store not initialized',
          syncedCharts: 0
        };
      }

      // Get all documents from vector store for this user
      const documents = await this.vectorStore.similaritySearch('', 100);
      const userDocuments = documents.filter(doc => 
        doc.metadata && doc.metadata.userId === userId
      );

      if (userDocuments.length === 0) {
        logger.info('No RAG documents found for user', { userId });
        return {
          success: true,
          message: 'No RAG documents to sync',
          syncedCharts: 0
        };
      }

      // Group documents by chart type
      const chartsByType = {};
      userDocuments.forEach(doc => {
        const chartType = doc.metadata.chartType || 'unknown';
        if (!chartsByType[chartType]) {
          chartsByType[chartType] = [];
        }
        chartsByType[chartType].push(doc);
      });

      // Sync each chart type to Firestore
      let syncedCount = 0;
      for (const [chartType, docs] of Object.entries(chartsByType)) {
        try {
          // Create chart data structure
          const chartData = {
            type: chartType,
            chartType: chartType,
            userId: userId,
            data: docs.map(doc => doc.pageContent).join('\n'),
            metadata: docs[0].metadata // Use first doc's metadata
          };

          // Store in Firestore
          await this.firestoreService.storeChartData(userId, chartType, chartData);
          syncedCount++;
          
          logger.info('Synced chart to Firestore', { userId, chartType });
        } catch (chartError) {
          logger.error('Error syncing chart to Firestore', { userId, chartType, error: chartError.message });
        }
      }

      logger.info('RAG to Firestore sync completed', { userId, syncedCharts: syncedCount });
      
      return {
        success: true,
        message: `Successfully synced ${syncedCount} charts to Firestore`,
        syncedCharts: syncedCount,
        chartTypes: Object.keys(chartsByType)
      };

    } catch (error) {
      logger.error('Error syncing RAG to Firestore:', error);
      return {
        success: false,
        message: 'Failed to sync RAG data to Firestore',
        error: error.message,
        syncedCharts: 0
      };
    }
  }

  // ========================================
  // SUBSCRIPTION OPERATIONS (Delegated to FirestoreService)
  // ========================================

  /**
   * Store or update subscription by email
   * @param {string} userEmail - User's email address
   * @param {object} subscriptionData - Subscription data
   * @returns {object} - Success status and subscription data
   */
  async upsertSubscriptionByEmail(userEmail, subscriptionData) {
    try {
      logger.info('Upserting subscription by email via FirestoreService', { userEmail, planId: subscriptionData.planId });
      return await this.firestoreService.upsertSubscriptionByEmail(userEmail, subscriptionData);
    } catch (error) {
      logger.error('Error upserting subscription by email:', error);
      throw error;
    }
  }

  /**
   * Get subscription by email
   * @param {string} userEmail - User's email address
   * @returns {object} - Subscription data or null if not found
   */
  async getSubscriptionByEmail(userEmail) {
    try {
      logger.info('Getting subscription by email via FirestoreService', { userEmail });
      return await this.firestoreService.getSubscriptionByEmail(userEmail);
    } catch (error) {
      logger.error('Error getting subscription by email:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription by email
   * @param {string} userEmail - User's email address
   * @returns {object} - Success status
   */
  async cancelSubscriptionByEmail(userEmail) {
    try {
      logger.info('Canceling subscription by email via FirestoreService', { userEmail });
      return await this.firestoreService.cancelSubscriptionByEmail(userEmail);
    } catch (error) {
      logger.error('Error canceling subscription by email:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const firestoreRAGService = new FirestoreRAGService();
export default FirestoreRAGService;

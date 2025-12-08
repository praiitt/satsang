import { 
  Timestamp
} from 'firebase-admin/firestore';
import { adminDb, FieldValue } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

class FirestoreService {
  constructor() {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized - adminDb is null. Please check your service account configuration.');
    }
    this.db = adminDb;
    logger.info('Firestore service initialized');
  }

  // ========================================
  // USER PROFILE OPERATIONS
  // ========================================

  /**
   * Store user profile data
   * @param {string} userId - Firebase Auth UID
   * @param {object} profileData - User profile data
   * @returns {object} - Success status and profile data
   */
  async storeUserProfile(userId, profileData) {
    try {
      logger.info('Storing user profile in Firestore', { userId });

      const profileRef = this.db.collection('users').doc(userId);
      
      const profile = {
        profile: {
          name: profileData.name || profileData.profile?.name || null,
          email: profileData.email || profileData.profile?.email || null,
          birthData: profileData.birthData || profileData.profile?.birthData || null,
          wellnessProfile: profileData.wellnessProfile || profileData.profile?.wellnessProfile || null,
          preferences: profileData.preferences || profileData.profile?.preferences || null
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      // Remove undefined fields
      Object.keys(profile.profile).forEach(key => {
        if (profile.profile[key] === undefined) {
          delete profile.profile[key];
        }
      });

      await profileRef.set(profile, { merge: true });

      logger.info('User profile stored successfully in Firestore', { userId });
      
      return {
        success: true,
        profile: profile,
        message: 'Profile stored successfully'
      };

    } catch (error) {
      logger.error('Error storing user profile in Firestore:', error);
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
      logger.info('Getting user profile from Firestore', { userId });

      const profileRef = this.db.collection('users').doc(userId);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        logger.info('User profile not found in Firestore', { userId });
        return null;
      }

      const profileData = profileDoc.data();
      logger.info('User profile retrieved from Firestore', { userId });

      return {
        success: true,
        profile: profileData.profile,
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt
      };

    } catch (error) {
      logger.error('Error getting user profile from Firestore:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update user profile data
   * @param {string} userId - Firebase Auth UID
   * @param {object} updateData - Profile data to update
   * @returns {object} - Success status and updated profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      logger.info('Updating user profile in Firestore', { userId });

      const profileRef = this.db.collection('users').doc(userId);
      
      const update = {
        profile: updateData,
        updatedAt: FieldValue.serverTimestamp()
      };

      await profileRef.update(update);

      logger.info('User profile updated successfully in Firestore', { userId });
      
      return {
        success: true,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      logger.error('Error updating user profile in Firestore:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // ========================================
  // CHART DATA OPERATIONS
  // ========================================

  /**
   * Store chart data
   * @param {string} userId - Firebase Auth UID
   * @param {string} chartType - Type of chart (birth_chart, transit, etc.)
   * @param {object} chartData - Chart data to store
   * @returns {object} - Success status and chart data
   */
  async storeChartData(userId, chartType, chartData) {
    try {
      logger.info('Storing chart data in Firestore', { userId, chartType });

      const chartRef = this.db.collection('charts').doc(`${userId}_${chartType}`);
      
      const chart = {
        userId: userId,
        chartType: chartType,
        data: chartData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await chartRef.set(chart, { merge: true });

      logger.info('Chart data stored successfully in Firestore', { userId, chartType });
      
      return {
        success: true,
        chart: chart,
        message: 'Chart data stored successfully'
      };

    } catch (error) {
      logger.error('Error storing chart data in Firestore:', error);
      throw new Error(`Failed to store chart data: ${error.message}`);
    }
  }

  /**
   * Get user charts
   * @param {string} userId - Firebase Auth UID
   * @returns {array} - Array of user charts
   */
  async getUserCharts(userId) {
    try {
      logger.info('Getting user charts from Firestore', { userId });

      const chartsRef = this.db.collection('charts');
      const query = chartsRef.where('userId', '==', userId);
      const querySnapshot = await query.get();

      const charts = [];
      querySnapshot.forEach(doc => {
        charts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      logger.info(`Retrieved ${charts.length} charts from Firestore`, { userId });
      
      return charts;

    } catch (error) {
      logger.error('Error getting user charts from Firestore:', error);
      throw new Error(`Failed to get charts: ${error.message}`);
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
      logger.info('Getting specific chart from Firestore', { userId, chartType });

      const chartRef = this.db.collection('charts').doc(`${userId}_${chartType}`);
      const chartDoc = await chartRef.get();

      if (!chartDoc.exists) {
        logger.info('Chart not found in Firestore', { userId, chartType });
        return null;
      }

      const chartData = chartDoc.data();
      logger.info('Chart retrieved from Firestore', { userId, chartType });

      return {
        id: chartDoc.id,
        ...chartData
      };

    } catch (error) {
      logger.error('Error getting chart from Firestore:', error);
      throw new Error(`Failed to get chart: ${error.message}`);
    }
  }

  /**
   * Update chart data
   * @param {string} userId - Firebase Auth UID
   * @param {string} chartType - Type of chart
   * @param {object} updateData - Chart data to update
   * @returns {object} - Success status
   */
  async updateChartData(userId, chartType, updateData) {
    try {
      logger.info('Updating chart data in Firestore', { userId, chartType });

      const chartRef = this.db.collection('charts').doc(`${userId}_${chartType}`);
      
      const update = {
        data: updateData,
        updatedAt: FieldValue.serverTimestamp()
      };

      await chartRef.update(update);

      logger.info('Chart data updated successfully in Firestore', { userId, chartType });
      
      return {
        success: true,
        message: 'Chart data updated successfully'
      };

    } catch (error) {
      logger.error('Error updating chart data in Firestore:', error);
      throw new Error(`Failed to update chart data: ${error.message}`);
    }
  }

  // ========================================
  // USER CONTACT OPERATIONS
  // ========================================

  /**
   * Store user contact
   * @param {string} userId - Firebase Auth UID
   * @param {object} contactData - Contact data to store
   * @returns {object} - Success status and contact data
   */
  async storeUserContact(userId, contactData) {
    try {
      logger.info('Storing user contact in Firestore', { userId });

      const contactRef = this.db.collection('contacts').doc(`${userId}_${contactData.contactId || Date.now()}`);
      
      const contact = {
        userId: userId,
        contactId: contactData.contactId || Date.now().toString(),
        name: contactData.name || contactData.contactName || null,
        email: contactData.email || null,
        phone: contactData.phone || null,
        birthData: contactData.birthData || null,
        chartData: contactData.chartData || null,
        relationship: contactData.relationship || contactData.relationshipType || null,
        notes: contactData.notes || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      // Remove undefined fields
      Object.keys(contact).forEach(key => {
        if (contact[key] === undefined) {
          delete contact[key];
        }
      });

      await contactRef.set(contact, { merge: true });

      logger.info('User contact stored successfully in Firestore', { userId });
      
      return {
        success: true,
        contact: contact,
        message: 'Contact stored successfully'
      };

    } catch (error) {
      logger.error('Error storing user contact in Firestore:', error);
      throw new Error(`Failed to store contact: ${error.message}`);
    }
  }

  /**
   * Get user contacts
   * @param {string} userId - Firebase Auth UID
   * @returns {array} - Array of user contacts
   */
  async getUserContacts(userId) {
    try {
      logger.info('Getting user contacts from Firestore', { userId });

      const contactsRef = this.db.collection('contacts');
      const query = contactsRef.where('userId', '==', userId);
      const querySnapshot = await query.get();

      const contacts = [];
      querySnapshot.forEach(doc => {
        contacts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      logger.info(`Retrieved ${contacts.length} contacts from Firestore`, { userId });
      
      return contacts;

    } catch (error) {
      logger.error('Error getting user contacts from Firestore:', error);
      throw new Error(`Failed to get contacts: ${error.message}`);
    }
  }

  /**
   * Update user contact
   * @param {string} userId - Firebase Auth UID
   * @param {string} contactId - Contact ID
   * @param {object} updateData - Contact data to update
   * @returns {object} - Success status
   */
  async updateUserContact(userId, contactId, updateData) {
    try {
      logger.info('Updating user contact in Firestore', { userId, contactId });

      const contactRef = this.db.collection('contacts').doc(`${userId}_${contactId}`);
      
      const update = {
        ...updateData,
        updatedAt: FieldValue.serverTimestamp()
      };

      // Remove undefined fields
      Object.keys(update).forEach(key => {
        if (update[key] === undefined) {
          delete update[key];
        }
      });

      await contactRef.update(update);

      logger.info('User contact updated successfully in Firestore', { userId, contactId });
      
      return {
        success: true,
        message: 'Contact updated successfully'
      };

    } catch (error) {
      logger.error('Error updating user contact in Firestore:', error);
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  // ========================================
  // CHAT OPERATIONS
  // ========================================

  /**
   * Store chat message
   * @param {string} userId - Firebase Auth UID
   * @param {string} conversationId - Conversation ID
   * @param {object} messageData - Message data to store
   * @returns {object} - Success status and message data
   */
  async storeChatMessage(userId, conversationId, messageData) {
    try {
      logger.info('Storing chat message in Firestore', { userId, conversationId });

      const messageRef = this.db.collection('chats').doc(conversationId).collection('messages').doc();
      
      const message = {
        userId: userId,
        conversationId: conversationId,
        type: messageData.role || messageData.type || 'user', // Support both role and type
        content: messageData.content || '',
        timestamp: FieldValue.serverTimestamp(),
        metadata: messageData.metadata || {}
      };

      await messageRef.set(message);

      logger.info('Chat message stored successfully in Firestore', { userId, conversationId });
      
      return {
        success: true,
        message: message,
        messageId: messageRef.id
      };

    } catch (error) {
      logger.error('Error storing chat message in Firestore:', error);
      throw new Error(`Failed to store message: ${error.message}`);
    }
  }

  /**
   * Get chat history
   * @param {string} conversationId - Conversation ID
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {array} - Array of chat messages
   */
  async getChatHistory(conversationId, limit = 50) {
    try {
      logger.info('Getting chat history from Firestore', { conversationId, limit });

      const messagesRef = this.db.collection('chats').doc(conversationId).collection('messages');
      
      // First check if the conversation exists
      const conversationDoc = await this.db.collection('chats').doc(conversationId).get();
      if (!conversationDoc.exists) {
        logger.warn('Conversation does not exist', { conversationId });
        return [];
      }

      // Get messages ordered by timestamp
      const query = messagesRef.orderBy('timestamp', 'asc').limit(limit);
      const querySnapshot = await query.get();

      const messages = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          type: data.type || data.role || 'user',
          content: data.content || '',
          timestamp: data.timestamp,
          metadata: data.metadata || {}
        });
      });

      logger.info(`Retrieved ${messages.length} messages from Firestore`, { conversationId });
      
      return messages;

    } catch (error) {
      logger.error('Error getting chat history from Firestore:', error);
      throw new Error(`Failed to get chat history: ${error.message}`);
    }
  }

  /**
   * Create new chat conversation
   * @param {string} userId - Firebase Auth UID
   * @param {object} conversationData - Conversation metadata
   * @param {string} conversationId - Optional specific conversation ID
   * @returns {object} - Success status and conversation ID
   */
  async createNewChat(userId, conversationData = {}, conversationId = null) {
    try {
      logger.info('Creating new chat conversation in Firestore', { userId, conversationId });

      const conversationRef = conversationId 
        ? this.db.collection('chats').doc(conversationId)
        : this.db.collection('chats').doc();
      
      const conversation = {
        userId: userId,
        conversationId: conversationRef.id,
        title: conversationData.title || 'New Chat',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: conversationData.metadata || {}
      };

      await conversationRef.set(conversation);

      logger.info('New chat conversation created in Firestore', { userId, conversationId: conversationRef.id });
      
      return {
        success: true,
        conversationId: conversationRef.id,
        conversation: conversation
      };

    } catch (error) {
      logger.error('Error creating new chat conversation in Firestore:', error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  /**
   * Check if a conversation exists
   * @param {string} conversationId - Conversation ID
   * @returns {boolean} - Whether the conversation exists
   */
  async checkConversationExists(conversationId) {
    try {
      logger.info('Checking if conversation exists', { conversationId });

      const conversationDoc = await this.db.collection('chats').doc(conversationId).get();
      const exists = conversationDoc.exists;
      
      logger.info('Conversation existence check completed', { conversationId, exists });
      
      return exists;

    } catch (error) {
      logger.error('Error checking conversation existence:', error);
      return false;
    }
  }

  /**
   * Update chat conversation timestamp
   * @param {string} conversationId - Conversation ID
   * @returns {object} - Success status
   */
  async updateChatTimestamp(conversationId) {
    try {
      logger.info('Updating chat conversation timestamp', { conversationId });

      const conversationRef = this.db.collection('chats').doc(conversationId);
      
      await conversationRef.update({
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info('Chat conversation timestamp updated successfully', { conversationId });
      
      return {
        success: true,
        message: 'Timestamp updated successfully'
      };

    } catch (error) {
      logger.error('Error updating chat conversation timestamp:', error);
      throw new Error(`Failed to update timestamp: ${error.message}`);
    }
  }

  // ========================================
  // UTILITY OPERATIONS
  // ========================================

  /**
   * Batch write operations
   * @param {array} operations - Array of write operations
   * @returns {object} - Success status
   */
  async batchWrite(operations) {
    try {
      logger.info('Executing batch write in Firestore', { operationCount: operations.length });

      const batch = this.db.batch();
      
      operations.forEach(op => {
        if (op.type === 'set') {
          batch.set(op.ref, op.data, op.options);
        } else if (op.type === 'update') {
          batch.update(op.ref, op.data);
        } else if (op.type === 'delete') {
          batch.delete(op.ref);
        }
      });

      await batch.commit();

      logger.info('Batch write completed successfully in Firestore', { operationCount: operations.length });
      
      return {
        success: true,
        message: 'Batch write completed successfully'
      };

    } catch (error) {
      logger.error('Error executing batch write in Firestore:', error);
      throw new Error(`Failed to execute batch write: ${error.message}`);
    }
  }

  /**
   * Run transaction
   * @param {function} updateFunction - Function to execute in transaction
   * @returns {object} - Transaction result
   */
  async transaction(updateFunction) {
    try {
      logger.info('Executing Firestore transaction');

      const result = await this.db.runTransaction(updateFunction);

      logger.info('Firestore transaction completed successfully');
      
      return {
        success: true,
        result: result
      };

    } catch (error) {
      logger.error('Error executing Firestore transaction:', error);
      throw new Error(`Failed to execute transaction: ${error.message}`);
    }
  }

  /**
   * Query with filters
   * @param {string} collection - Collection name
   * @param {array} filters - Array of filter objects
   * @param {object} options - Query options
   * @returns {array} - Query results
   */
  async queryWithFilters(collection, filters = [], options = {}) {
    try {
      logger.info('Executing Firestore query with filters', { collection, filterCount: filters.length });

      let query = this.db.collection(collection);
      
      // Apply filters
      filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      // Apply ordering
      if (options.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const querySnapshot = await query.get();

      const results = [];
      querySnapshot.forEach(doc => {
        results.push({
          id: doc.id,
          ...doc.data()
        });
      });

      logger.info(`Query completed successfully, returned ${results.length} results`, { collection });
      
      return results;

    } catch (error) {
      logger.error('Error executing Firestore query:', error);
      throw new Error(`Failed to execute query: ${error.message}`);
    }
  }

  /**
   * Subscribe to document changes
   * @param {string} collection - Collection name
   * @param {string} documentId - Document ID
   * @param {function} callback - Callback function for changes
   * @returns {function} - Unsubscribe function
   */
  subscribeToDocument(collection, documentId, callback) {
    try {
      logger.info('Setting up document subscription in Firestore', { collection, documentId });

      const unsubscribe = this.db.collection(collection).doc(documentId)
        .onSnapshot(callback, error => {
          logger.error('Error in Firestore document subscription:', error);
        });

      logger.info('Document subscription set up successfully in Firestore', { collection, documentId });
      
      return unsubscribe;

    } catch (error) {
      logger.error('Error setting up document subscription in Firestore:', error);
      throw new Error(`Failed to set up subscription: ${error.message}`);
    }
  }

  /**
   * Health check for Firestore
   * @returns {object} - Health status
   */
  async healthCheck() {
    try {
      logger.info('Performing Firestore health check');

      // Try to read from a test document
      const testRef = this.db.collection('health').doc('test');
      await testRef.get();

      logger.info('Firestore health check passed');
      
      return {
        success: true,
        status: 'healthy',
        message: 'Firestore is accessible and responding'
      };

    } catch (error) {
      logger.error('Firestore health check failed:', error);
      
      return {
        success: false,
        status: 'unhealthy',
        message: `Firestore health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // ========================================
  // WAITLIST OPERATIONS
  // ========================================

  /**
   * Check if email already exists in waitlist
   * @param {string} email - Email to check
   * @returns {object|null} - Waitlist entry if exists, null otherwise
   */
  async checkWaitlistEmail(email) {
    try {
      logger.info('Checking if email exists in waitlist', { email });

      const querySnapshot = await this.db.collection('waitlist')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        logger.info('Email not found in waitlist', { email });
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      logger.info('Email found in waitlist', { email, entryId: doc.id });
      
      return {
        id: doc.id,
        ...data
      };

    } catch (error) {
      logger.error('Error checking waitlist email:', error);
      throw new Error(`Failed to check waitlist email: ${error.message}`);
    }
  }

  /**
   * Add new waitlist entry
   * @param {object} waitlistData - Waitlist entry data
   * @returns {object} - Success status and entry ID
   */
  async addWaitlistEntry(waitlistData) {
    try {
      logger.info('Adding new waitlist entry', { email: waitlistData.email, interest: waitlistData.interest });

      const waitlistRef = this.db.collection('waitlist');
      const docRef = await waitlistRef.add(waitlistData);

      logger.info('Waitlist entry added successfully', { entryId: docRef.id, email: waitlistData.email });
      
      return {
        success: true,
        entryId: docRef.id,
        message: 'Waitlist entry added successfully'
      };

    } catch (error) {
      logger.error('Error adding waitlist entry:', error);
      throw new Error(`Failed to add waitlist entry: ${error.message}`);
    }
  }

  /**
   * Get waitlist statistics
   * @returns {object} - Waitlist statistics
   */
  async getWaitlistStats() {
    try {
      logger.info('Getting waitlist statistics');

      const waitlistSnapshot = await this.db.collection('waitlist').get();
      
      const stats = {
        total: waitlistSnapshot.size,
        byInterest: {},
        bySource: {},
        byStatus: {},
        recent: []
      };

      const recentEntries = [];

      waitlistSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Count by interest
        stats.byInterest[data.interest] = (stats.byInterest[data.interest] || 0) + 1;
        
        // Count by source
        stats.bySource[data.source] = (stats.bySource[data.source] || 0) + 1;
        
        // Count by status
        stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;

        // Collect recent entries (last 10)
        if (recentEntries.length < 10) {
          recentEntries.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            interest: data.interest,
            joinedAt: data.joinedAt,
            source: data.source
          });
        }
      });

      // Sort recent entries by join date
      stats.recent = recentEntries.sort((a, b) => 
        new Date(b.joinedAt) - new Date(a.joinedAt)
      );

      logger.info('Waitlist statistics retrieved successfully', { total: stats.total });
      
      return {
        success: true,
        data: stats
      };

    } catch (error) {
      logger.error('Error getting waitlist statistics:', error);
      throw new Error(`Failed to get waitlist statistics: ${error.message}`);
    }
  }

  // ========================================
  // SUBSCRIPTION OPERATIONS
  // ========================================

  /**
   * Store or update subscription by email
   * @param {string} userEmail - User's email address
   * @param {object} subscriptionData - Subscription data
   * @returns {object} - Success status and subscription data
   */
  async upsertSubscriptionByEmail(userEmail, subscriptionData) {
    try {
      logger.info('Upserting subscription by email', { userEmail, planId: subscriptionData.planId });

      const subscriptionRef = this.db.collection('subscriptions');
      
      // Query for existing subscription by email
      const querySnapshot = await subscriptionRef.where('userEmail', '==', userEmail).get();
      
      let docRef;
      if (!querySnapshot.empty) {
        // Update existing subscription
        docRef = querySnapshot.docs[0];
        await docRef.ref.update({
          ...subscriptionData,
          updatedAt: new Date()
        });
        logger.info('Subscription updated successfully', { subscriptionId: docRef.id, userEmail });
      } else {
        // Create new subscription
        const newSubscription = {
          ...subscriptionData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        docRef = await subscriptionRef.add(newSubscription);
        logger.info('Subscription created successfully', { subscriptionId: docRef.id, userEmail });
      }

      return {
        success: true,
        subscriptionId: docRef.id,
        subscription: subscriptionData,
        message: 'Subscription upserted successfully'
      };

    } catch (error) {
      logger.error('Error upserting subscription by email:', error);
      throw new Error(`Failed to upsert subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription by email
   * @param {string} userEmail - User's email address
   * @returns {object} - Subscription data or null if not found
   */
  async getSubscriptionByEmail(userEmail) {
    try {
      logger.info('Getting subscription by email', { userEmail });

      const subscriptionRef = this.db.collection('subscriptions');
      const querySnapshot = await subscriptionRef.where('userEmail', '==', userEmail).get();
      
      if (querySnapshot.empty) {
        logger.info('No subscription found for email', { userEmail });
        return null;
      }

      const doc = querySnapshot.docs[0];
      const subscriptionData = doc.data();
      
      logger.info('Subscription retrieved successfully', { subscriptionId: doc.id, userEmail });
      
      return {
        id: doc.id,
        ...subscriptionData
      };

    } catch (error) {
      logger.error('Error getting subscription by email:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Cancel subscription by email
   * @param {string} userEmail - User's email address
   * @returns {object} - Success status
   */
  async cancelSubscriptionByEmail(userEmail) {
    try {
      logger.info('Canceling subscription by email', { userEmail });

      const subscriptionRef = this.db.collection('subscriptions');
      const querySnapshot = await subscriptionRef.where('userEmail', '==', userEmail).get();
      
      if (querySnapshot.empty) {
        logger.warn('No subscription found to cancel', { userEmail });
        return {
          success: false,
          error: 'No subscription found for this email'
        };
      }

      const doc = querySnapshot.docs[0];
      await doc.ref.update({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      });

      logger.info('Subscription cancelled successfully', { subscriptionId: doc.id, userEmail });
      
      return {
        success: true,
        message: 'Subscription cancelled successfully'
      };

    } catch (error) {
      logger.error('Error canceling subscription by email:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }
}

export default FirestoreService;

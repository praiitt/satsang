import { logger } from '../utils/logger.js';
import { firestoreRAGService } from './firestoreRAGService.js';

/**
 * RRAASI Coin Service
 * Handles all coin-related operations including balance management,
 * transactions, and feature access control
 */
class CoinService {
  constructor() {
    this.logger = logger;
    
    // Feature cost configuration
    this.FEATURE_COSTS = {
      basic_chat: { 
        cost: 5, 
        name: 'Basic Chat', 
        category: 'chat', 
        freeTierAvailable: true, 
        subscriptionUnlimited: true 
      },
      compatibility_check: { 
        cost: 15, 
        name: 'Compatibility Check', 
        category: 'compatibility', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      birth_chart: { 
        cost: 25, 
        name: 'Birth Chart Analysis', 
        category: 'charts', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      matchmaking_chat: { 
        cost: 20, 
        name: 'Matchmaking Chat', 
        category: 'matchmaking', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      group_compatibility: { 
        cost: 30, 
        name: 'Group Compatibility', 
        category: 'compatibility', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      daily_horoscope: { 
        cost: 2, 
        name: 'Daily Horoscope', 
        category: 'horoscope', 
        freeTierAvailable: true, 
        subscriptionUnlimited: true 
      },
      advanced_analysis: { 
        cost: 50, 
        name: 'Advanced Analysis', 
        category: 'analysis', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      personalized_report: { 
        cost: 100, 
        name: 'Personalized Report', 
        category: 'reports', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      livekit_room: { 
        cost: 10, 
        name: 'Real-time Chat Room', 
        category: 'livekit', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      voice_consultation: { 
        cost: 25, 
        name: 'Voice Consultation', 
        category: 'livekit', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      },
      group_voice_chat: { 
        cost: 35, 
        name: 'Group Voice Chat', 
        category: 'livekit', 
        freeTierAvailable: false, 
        subscriptionUnlimited: true 
      }
    };
    
    logger.info('Coin Service initialized with feature costs', { 
      featureCount: Object.keys(this.FEATURE_COSTS).length 
    });
  }

  /**
   * Get user's coin balance
   * @param {string} userId - User ID
   * @returns {object} - Coin balance information
   */
  async getCoinBalance(userId) {
    try {
      logger.info('Getting coin balance for user', { userId });
      
      // Get user's coin balance document
      const balanceDoc = await this.getCoinBalanceDocument(userId);
      
      if (!balanceDoc) {
        // Initialize coin balance for new user
        return await this.initializeCoinBalance(userId);
      }
      
      // Calculate total from subscriptions
      const subscriptionCoins = await this.calculateSubscriptionCoins(userId);
      
      // Update balance if subscription coins changed
      if (balanceDoc.earnedCoins !== subscriptionCoins) {
        await this.updateEarnedCoins(userId, subscriptionCoins);
        balanceDoc.earnedCoins = subscriptionCoins;
        balanceDoc.totalCoins = balanceDoc.earnedCoins + balanceDoc.bonusCoins - balanceDoc.spentCoins;
      }
      
      logger.info('Coin balance retrieved successfully', { 
        userId, 
        totalCoins: balanceDoc.totalCoins,
        earnedCoins: balanceDoc.earnedCoins,
        spentCoins: balanceDoc.spentCoins,
        bonusCoins: balanceDoc.bonusCoins
      });
      
      return {
        success: true,
        balance: balanceDoc
      };
      
    } catch (error) {
      logger.error('Error getting coin balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get coin balance document from Firestore
   * @param {string} userId - User ID
   * @returns {object|null} - Coin balance document or null
   */
  async getCoinBalanceDocument(userId) {
    try {
      logger.info('Getting coin balance document', { userId, collection: 'coinBalances' });
      
      const balanceRef = firestoreRAGService.firestoreService.db
        .collection('coinBalances')
        .doc(userId);
      
      const balanceDoc = await balanceRef.get();
      
      if (balanceDoc.exists) {
        const data = balanceDoc.data();
        logger.info('Coin balance document found', { 
          userId, 
          documentId: balanceDoc.id,
          totalCoins: data.totalCoins,
          earnedCoins: data.earnedCoins,
          spentCoins: data.spentCoins,
          bonusCoins: data.bonusCoins
        });
        return {
          id: balanceDoc.id,
          ...data
        };
      }
      
      logger.warn('Coin balance document not found', { userId, documentId: userId });
      
      // Try to find by searching all documents if direct lookup fails
      // This might help if userId format is different
      const balancesSnapshot = await firestoreRAGService.firestoreService.db
        .collection('coinBalances')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (!balancesSnapshot.empty) {
        const doc = balancesSnapshot.docs[0];
        const data = doc.data();
        logger.info('Coin balance found by query', { 
          userId, 
          documentId: doc.id,
          storedUserId: data.userId,
          totalCoins: data.totalCoins
        });
        return {
          id: doc.id,
          ...data
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting coin balance document:', error);
      throw error;
    }
  }

  /**
   * Initialize coin balance for new user
   * @param {string} userId - User ID
   * @returns {object} - Initialized coin balance
   */
  async initializeCoinBalance(userId) {
    try {
      logger.info('Initializing coin balance for new user', { userId });
      
      const initialBalance = {
        userId: userId,
        totalCoins: 0,
        earnedCoins: 0,
        spentCoins: 0,
        bonusCoins: 0,
        lastUpdated: new Date(),
        createdAt: new Date()
      };
      
      // Store in Firestore
      await firestoreRAGService.firestoreService.db
        .collection('coinBalances')
        .doc(userId)
        .set(initialBalance);
      
      logger.info('Coin balance initialized successfully', { userId });
      
      return {
        success: true,
        balance: initialBalance
      };
      
    } catch (error) {
      logger.error('Error initializing coin balance:', error);
      throw error;
    }
  }

  /**
   * Calculate coins earned from active subscriptions
   * @param {string} userId - User ID
   * @returns {number} - Total coins from subscriptions
   */
  async calculateSubscriptionCoins(userId) {
    try {
      // Get user profile to get email
      const userProfile = await firestoreRAGService.getUserProfile(userId);
      if (!userProfile || !userProfile.profile || !userProfile.profile.email) {
        return 0;
      }
      
      const userEmail = userProfile.profile.email;
      
      // Get active subscriptions
      const subscription = await firestoreRAGService.getSubscriptionByEmail(userEmail);
      
      if (!subscription || subscription.status !== 'active') {
        return 0;
      }
      
      // Check if subscription is still valid
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      
      if (now > endDate) {
        return 0; // Subscription expired
      }
      
      return subscription.rraasiCoins || 0;
      
    } catch (error) {
      logger.error('Error calculating subscription coins:', error);
      return 0;
    }
  }

  /**
   * Update earned coins from subscriptions
   * @param {string} userId - User ID
   * @param {number} earnedCoins - New earned coins amount
   */
  async updateEarnedCoins(userId, earnedCoins) {
    try {
      const balanceRef = firestoreRAGService.firestoreService.db
        .collection('coinBalances')
        .doc(userId);
      
      const balanceDoc = await balanceRef.get();
      
      if (balanceDoc.exists) {
        const currentBalance = balanceDoc.data();
        const newTotalCoins = earnedCoins + currentBalance.bonusCoins - currentBalance.spentCoins;
        
        await balanceRef.update({
          earnedCoins: earnedCoins,
          totalCoins: newTotalCoins,
          lastUpdated: new Date()
        });
        
        logger.info('Earned coins updated successfully', { 
          userId, 
          oldEarned: currentBalance.earnedCoins,
          newEarned: earnedCoins,
          newTotal: newTotalCoins
        });
      }
      
    } catch (error) {
      logger.error('Error updating earned coins:', error);
      throw error;
    }
  }

  /**
   * Check if user has enough coins for a feature
   * @param {string} userId - User ID
   * @param {string} featureId - Feature ID
   * @returns {object} - Access check result
   */
  async checkFeatureAccess(userId, featureId) {
    try {
      logger.info('Checking feature access', { userId, featureId });
      
      const featureCost = this.FEATURE_COSTS[featureId];
      if (!featureCost) {
        return {
          success: false,
          error: 'Unknown feature',
          hasAccess: false
        };
      }
      
      // Check if feature is free tier available
      if (featureCost.freeTierAvailable) {
        return {
          success: true,
          hasAccess: true,
          reason: 'free_tier',
          cost: 0
        };
      }
      
      // Check subscription status for unlimited access
      if (featureCost.subscriptionUnlimited) {
        const userProfile = await firestoreRAGService.getUserProfile(userId);
        if (userProfile && userProfile.profile && userProfile.profile.email) {
          const subscription = await firestoreRAGService.getSubscriptionByEmail(userProfile.profile.email);
          
          if (subscription && subscription.status === 'active') {
            const now = new Date();
            const endDate = new Date(subscription.endDate);
            
            if (now <= endDate) {
              return {
                success: true,
                hasAccess: true,
                reason: 'subscription_unlimited',
                cost: 0
              };
            }
          }
        }
      }
      
      // Check coin balance
      const balanceResult = await this.getCoinBalance(userId);
      if (!balanceResult.success) {
        return {
          success: false,
          error: 'Failed to get coin balance',
          hasAccess: false
        };
      }
      
      const hasAccess = balanceResult.balance.totalCoins >= featureCost.cost;
      
      logger.info('Feature access check completed', { 
        userId, 
        featureId, 
        hasAccess, 
        requiredCoins: featureCost.cost,
        availableCoins: balanceResult.balance.totalCoins
      });
      
      return {
        success: true,
        hasAccess: hasAccess,
        reason: hasAccess ? 'sufficient_coins' : 'insufficient_coins',
        cost: featureCost.cost,
        availableCoins: balanceResult.balance.totalCoins,
        requiredCoins: featureCost.cost
      };
      
    } catch (error) {
      logger.error('Error checking feature access:', error);
      return {
        success: false,
        error: error.message,
        hasAccess: false
      };
    }
  }

  /**
   * Deduct coins for feature usage
   * @param {string} userId - User ID
   * @param {string} featureId - Feature ID
   * @param {object} metadata - Additional metadata
   * @returns {object} - Transaction result
   */
  async deductCoins(userId, featureId, metadata = {}) {
    try {
      logger.info('Deducting coins for feature usage', { userId, featureId });
      
      const featureCost = this.FEATURE_COSTS[featureId];
      if (!featureCost) {
        return {
          success: false,
          error: 'Unknown feature'
        };
      }
      
      // Check access first
      const accessCheck = await this.checkFeatureAccess(userId, featureId);
      if (!accessCheck.success || !accessCheck.hasAccess) {
        return {
          success: false,
          error: accessCheck.error || 'Insufficient coins or access denied',
          hasAccess: false,
          requiredCoins: featureCost.cost,
          availableCoins: accessCheck.availableCoins || 0
        };
      }
      
      // If access is free (subscription or free tier), don't deduct coins
      if (accessCheck.cost === 0) {
        // Still create a transaction record for tracking
        await this.createTransaction(userId, 'free_usage', 0, featureId, {
          ...metadata,
          reason: accessCheck.reason
        });
        
        return {
          success: true,
          coinsDeducted: 0,
          reason: accessCheck.reason,
          newBalance: accessCheck.availableCoins
        };
      }
      
      // Deduct coins
      const balanceRef = firestoreRAGService.firestoreService.db
        .collection('coinBalances')
        .doc(userId);
      
      const balanceDoc = await balanceRef.get();
      const currentBalance = balanceDoc.data();
      
      const newSpentCoins = currentBalance.spentCoins + featureCost.cost;
      const newTotalCoins = currentBalance.earnedCoins + currentBalance.bonusCoins - newSpentCoins;
      
      // Update balance
      await balanceRef.update({
        spentCoins: newSpentCoins,
        totalCoins: newTotalCoins,
        lastUpdated: new Date()
      });
      
      // Create transaction record
      await this.createTransaction(userId, 'spend', featureCost.cost, featureId, {
        ...metadata,
        balanceBefore: currentBalance.totalCoins,
        balanceAfter: newTotalCoins
      });
      
      logger.info('Coins deducted successfully', { 
        userId, 
        featureId, 
        coinsDeducted: featureCost.cost,
        newBalance: newTotalCoins
      });
      
      return {
        success: true,
        coinsDeducted: featureCost.cost,
        newBalance: newTotalCoins,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
    } catch (error) {
      logger.error('Error deducting coins:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create transaction record
   * @param {string} userId - User ID
   * @param {string} type - Transaction type (spend, earn, bonus, free_usage)
   * @param {number} amount - Transaction amount
   * @param {string} featureId - Feature ID (if applicable)
   * @param {object} metadata - Additional metadata
   */
  async createTransaction(userId, type, amount, featureId = null, metadata = {}) {
    try {
      const transaction = {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        type: type,
        amount: amount,
        featureId: featureId,
        featureName: featureId ? this.FEATURE_COSTS[featureId]?.name : null,
        description: this.getTransactionDescription(type, featureId, amount),
        timestamp: new Date(),
        metadata: metadata
      };
      
      // Store transaction
      await firestoreRAGService.firestoreService.db
        .collection('coinTransactions')
        .add(transaction);
      
      logger.info('Transaction created successfully', { 
        transactionId: transaction.transactionId,
        userId,
        type,
        amount,
        featureId
      });
      
      return transaction;
      
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction description
   * @param {string} type - Transaction type
   * @param {string} featureId - Feature ID
   * @param {number} amount - Amount
   * @returns {string} - Description
   */
  getTransactionDescription(type, featureId, amount) {
    const featureName = featureId ? this.FEATURE_COSTS[featureId]?.name : 'Unknown Feature';
    
    switch (type) {
      case 'spend':
        return `Spent ${amount} coins on ${featureName}`;
      case 'earn':
        return `Earned ${amount} coins from subscription`;
      case 'bonus':
        return `Received ${amount} bonus coins`;
      case 'free_usage':
        return `Used ${featureName} (free access)`;
      default:
        return `Transaction: ${amount} coins`;
    }
  }

  /**
   * Get user's transaction history
   * @param {string} userId - User ID
   * @param {number} limit - Number of transactions to retrieve
   * @returns {object} - Transaction history
   */
  async getTransactionHistory(userId, limit = 50) {
    try {
      logger.info('Getting transaction history', { userId, limit });
      
      const transactionsRef = firestoreRAGService.firestoreService.db
        .collection('coinTransactions')
        .where('userId', '==', userId)
        .limit(limit);
      
      const querySnapshot = await transactionsRef.get();
      
      const transactions = [];
      querySnapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      logger.info('Transaction history retrieved successfully', { 
        userId, 
        transactionCount: transactions.length 
      });
      
      return {
        success: true,
        transactions: transactions
      };
      
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add bonus coins to user
   * @param {string} userId - User ID
   * @param {number} amount - Bonus amount
   * @param {string} reason - Reason for bonus
   * @returns {object} - Result
   */
  async addBonusCoins(userId, amount, reason = 'Bonus') {
    try {
      logger.info('Adding bonus coins', { userId, amount, reason });
      
      const balanceRef = firestoreRAGService.firestoreService.db
        .collection('coinBalances')
        .doc(userId);
      
      const balanceDoc = await balanceRef.get();
      
      if (balanceDoc.exists) {
        const currentBalance = balanceDoc.data();
        const newBonusCoins = currentBalance.bonusCoins + amount;
        const newTotalCoins = currentBalance.earnedCoins + newBonusCoins - currentBalance.spentCoins;
        
        await balanceRef.update({
          bonusCoins: newBonusCoins,
          totalCoins: newTotalCoins,
          lastUpdated: new Date()
        });
        
        // Create transaction record
        await this.createTransaction(userId, 'bonus', amount, null, {
          reason: reason,
          balanceBefore: currentBalance.totalCoins,
          balanceAfter: newTotalCoins
        });
        
        logger.info('Bonus coins added successfully', { 
          userId, 
          amount, 
          newBalance: newTotalCoins 
        });
        
        return {
          success: true,
          bonusAdded: amount,
          newBalance: newTotalCoins
        };
      } else {
        // Initialize balance first
        await this.initializeCoinBalance(userId);
        return await this.addBonusCoins(userId, amount, reason);
      }
      
    } catch (error) {
      logger.error('Error adding bonus coins:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get feature cost information
   * @param {string} featureId - Feature ID
   * @returns {object} - Feature cost info
   */
  getFeatureCost(featureId) {
    return this.FEATURE_COSTS[featureId] || null;
  }

  /**
   * Get all feature costs
   * @returns {object} - All feature costs
   */
  getAllFeatureCosts() {
    return this.FEATURE_COSTS;
  }
}

// Export singleton instance
export const coinService = new CoinService();
export default coinService;

import { logger } from '../utils/logger.js';
import FirestoreService from './firestoreService.js';
import { astrologyAPIService } from './astrologyAPIService.js';

const firestoreService = new FirestoreService();

class AdminService {
  constructor() {
    this.logger = logger;
  }

  // User Management
  async getAllUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        subscription = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      let query = firestoreService.db.collection('users');

      // Apply filters
      if (subscription) {
        query = query.where('profile.subscription', '==', subscription);
      }

      // Get all users first (Firestore doesn't support complex pagination)
      const snapshot = await query.get();
      let users = [];

      snapshot.forEach(doc => {
        const userData = doc.data();
        users.push({
          id: doc.id,
          ...userData
        });
      });

      // Apply search filter
      if (search) {
        users = users.filter(user => 
          user.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
          user.profile?.email?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply sorting
      users.sort((a, b) => {
        let aValue, bValue;
        
        if (sortBy === 'createdAt') {
          aValue = a.createdAt?._seconds || 0;
          bValue = b.createdAt?._seconds || 0;
        } else if (sortBy === 'lastActive') {
          aValue = a.lastActive?._seconds || 0;
          bValue = b.lastActive?._seconds || 0;
        } else {
          aValue = a.profile?.[sortBy] || '';
          bValue = b.profile?.[sortBy] || '';
        }

        if (sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });

      // Apply pagination
      const total = users.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = users.slice(startIndex, endIndex);

      // Transform user data for admin dashboard
      const transformedUsers = paginatedUsers.map(user => ({
        id: user.id,
        name: user.profile?.name || 'Unknown',
        email: user.profile?.email || 'No email',
        birthData: user.profile?.birthData || {},
        subscription: user.profile?.subscription || 'Free',
        lastActive: user.lastActive?._seconds ? new Date(user.lastActive._seconds * 1000).toISOString() : 'Never',
        createdAt: user.createdAt?._seconds ? new Date(user.createdAt._seconds * 1000).toISOString() : 'Unknown',
        engagement: this.calculateUserEngagement(user),
        charts: user.charts?.length || 0,
        profile: user.profile
      }));

      return {
        users: transformedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Error getting all users:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const userDoc = await firestoreService.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      return {
        id: userDoc.id,
        name: userData.profile?.name || 'Unknown',
        email: userData.profile?.email || 'No email',
        birthData: userData.profile?.birthData || {},
        subscription: userData.profile?.subscription || 'Free',
        lastActive: userData.lastActive?._seconds ? new Date(userData.lastActive._seconds * 1000).toISOString() : 'Never',
        createdAt: userData.createdAt?._seconds ? new Date(userData.createdAt._seconds * 1000).toISOString() : 'Unknown',
        engagement: this.calculateUserEngagement(userData),
        charts: userData.charts?.length || 0,
        profile: userData.profile,
        wellnessProfile: userData.profile?.wellnessProfile,
        preferences: userData.profile?.preferences
      };
    } catch (error) {
      this.logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserCharts(userId) {
    try {
      const chartsSnapshot = await firestoreService.db
        .collection('users')
        .doc(userId)
        .collection('charts')
        .get();

      const charts = [];
      chartsSnapshot.forEach(doc => {
        charts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return charts;
    } catch (error) {
      this.logger.error('Error getting user charts:', error);
      throw error;
    }
  }

  async getUserEngagement(userId, period = '30d') {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get user engagement data from analytics collection
      const engagementSnapshot = await firestoreService.db
        .collection('analytics')
        .doc(userId)
        .collection('engagement')
        .where('timestamp', '>=', startDate)
        .orderBy('timestamp', 'desc')
        .get();

      const engagement = [];
      engagementSnapshot.forEach(doc => {
        engagement.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Calculate engagement metrics
      const totalInteractions = engagement.length;
      const avgSessionTime = engagement.reduce((acc, item) => acc + (item.sessionTime || 0), 0) / totalInteractions;
      const contentEngagement = engagement.filter(item => item.type === 'content').length;
      const featureUsage = engagement.filter(item => item.type === 'feature').length;

      return {
        period,
        totalInteractions,
        avgSessionTime: Math.round(avgSessionTime),
        contentEngagement,
        featureUsage,
        engagementRate: totalInteractions > 0 ? Math.round((contentEngagement / totalInteractions) * 100) : 0,
        data: engagement
      };
    } catch (error) {
      this.logger.error('Error getting user engagement:', error);
      throw error;
    }
  }

  async updateUserSubscription(userId, subscription, reason = '') {
    try {
      const userRef = firestoreService.db.collection('users').doc(userId);
      
      await userRef.update({
        'profile.subscription': subscription,
        'profile.subscriptionUpdatedAt': new Date(),
        'profile.subscriptionUpdateReason': reason
      });

      // Log the subscription change
      await firestoreService.db.collection('adminLogs').add({
        action: 'subscription_update',
        userId,
        oldSubscription: (await userRef.get()).data().profile?.subscription,
        newSubscription: subscription,
        reason,
        adminId: 'system', // TODO: Get from request context
        timestamp: new Date()
      });

      return await this.getUserById(userId);
    } catch (error) {
      this.logger.error('Error updating user subscription:', error);
      throw error;
    }
  }

  async deleteUser(userId, reason = '') {
    try {
      const userRef = firestoreService.db.collection('users').doc(userId);
      
      // Soft delete - mark as deleted instead of actually removing
      await userRef.update({
        'profile.deleted': true,
        'profile.deletedAt': new Date(),
        'profile.deleteReason': reason
      });

      // Log the deletion
      await firestoreService.db.collection('adminLogs').add({
        action: 'user_delete',
        userId,
        reason,
        adminId: 'system', // TODO: Get from request context
        timestamp: new Date()
      });

      return { success: true, message: 'User marked as deleted' };
    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // System Management
  async getSystemHealth() {
    try {
      const health = {
        timestamp: new Date(),
        status: 'healthy',
        services: {}
      };

      // Check Firestore connection
      try {
        await firestoreService.db.collection('health').doc('test').get();
        health.services.firestore = { status: 'healthy', responseTime: Date.now() };
      } catch (error) {
        health.services.firestore = { status: 'unhealthy', error: error.message };
        health.status = 'degraded';
      }

      // Check Astrology API
      try {
        const startTime = Date.now();
        await astrologyAPIService.checkAPIHealth();
        health.services.astrologyAPI = { 
          status: 'healthy', 
          responseTime: Date.now() - startTime 
        };
      } catch (error) {
        health.services.astrologyAPI = { status: 'unhealthy', error: error.message };
        health.status = 'degraded';
      }

      // Check system resources
      const memUsage = process.memoryUsage();
      health.services.system = {
        status: 'healthy',
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        uptime: Math.round(process.uptime()) + ' seconds'
      };

      return health;
    } catch (error) {
      this.logger.error('Error getting system health:', error);
      throw error;
    }
  }

  async getSystemLogs(options = {}) {
    try {
      const {
        level = 'info',
        startDate,
        endDate,
        limit = 100
      } = options;

      let query = firestoreService.db.collection('logs');

      if (level && level !== 'all') {
        query = query.where('level', '==', level);
      }

      if (startDate) {
        query = query.where('timestamp', '>=', new Date(startDate));
      }

      if (endDate) {
        query = query.where('timestamp', '<=', new Date(endDate));
      }

      query = query.orderBy('timestamp', 'desc').limit(limit);

      const snapshot = await query.get();
      const logs = [];

      snapshot.forEach(doc => {
        logs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return logs;
    } catch (error) {
      this.logger.error('Error getting system logs:', error);
      throw error;
    }
  }

  // Notifications
  async sendNotification(userId, type, title, message, data = {}) {
    try {
      const notification = {
        userId,
        type,
        title,
        message,
        data,
        status: 'sent',
        sentAt: new Date(),
        read: false
      };

      // Store notification in Firestore
      const notificationRef = await firestoreService.db
        .collection('notifications')
        .add(notification);

      // TODO: Implement actual notification delivery
      // This could be email, SMS, push notification, etc.
      
      // Log the notification
      await firestoreService.db.collection('adminLogs').add({
        action: 'notification_sent',
        userId,
        notificationId: notificationRef.id,
        type,
        adminId: 'system', // TODO: Get from request context
        timestamp: new Date()
      });

      return {
        id: notificationRef.id,
        ...notification
      };
    } catch (error) {
      this.logger.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendBulkNotifications(userIds, type, title, message, data = {}) {
    try {
      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const userId of userIds) {
        try {
          const result = await this.sendNotification(userId, type, title, message, data);
          results.push({ userId, success: true, result });
          sentCount++;
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
          failedCount++;
        }
      }

      return {
        sentCount,
        failedCount,
        results
      };
    } catch (error) {
      this.logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Analytics helpers
  async getUserCounts() {
    try {
      const usersSnapshot = await firestoreService.db.collection('users').get();
      const totalUsers = usersSnapshot.size;

      const premiumUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('profile.subscription', '==', 'Premium')
        .get();
      const premiumUsers = premiumUsersSnapshot.size;

      const activeUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('lastActive', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .get();
      const activeUsers = activeUsersSnapshot.size;

      return {
        total: totalUsers,
        premium: premiumUsers,
        active: activeUsers,
        free: totalUsers - premiumUsers
      };
    } catch (error) {
      this.logger.error('Error getting user counts:', error);
      throw error;
    }
  }

  // Helper methods
  calculateUserEngagement(user) {
    // Calculate engagement score based on user activity
    let score = 0;
    
    if (user.lastActive) {
      const daysSinceLastActive = Math.floor((Date.now() - user.lastActive._seconds * 1000) / (1000 * 60 * 60 * 24));
      if (daysSinceLastActive <= 1) score += 30;
      else if (daysSinceLastActive <= 7) score += 20;
      else if (daysSinceLastActive <= 30) score += 10;
    }

    if (user.profile?.subscription === 'Premium') score += 25;
    if (user.charts && user.charts.length > 0) score += 20;
    if (user.profile?.wellnessProfile) score += 15;
    if (user.profile?.preferences) score += 10;

    return Math.min(score, 100);
  }
}

export const adminService = new AdminService();

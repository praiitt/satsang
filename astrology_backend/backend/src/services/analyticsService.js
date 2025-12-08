import { logger } from '../utils/logger.js';
import FirestoreService from './firestoreService.js';

const firestoreService = new FirestoreService();

class AnalyticsService {
  constructor() {
    this.logger = logger;
  }

  async getOverview(period = '30d') {
    try {
      const startDate = this.getStartDate(period);
      
      // Get user counts
      const userCounts = await this.getUserCounts(startDate);
      
      // Get content performance
      const contentPerformance = await this.getContentPerformance(startDate);
      
      // Get engagement metrics
      const engagementMetrics = await this.getEngagementMetrics(startDate);
      
      // Get revenue metrics
      const revenueMetrics = await this.getRevenueMetrics(startDate);

      return {
        period,
        startDate,
        endDate: new Date(),
        userCounts,
        contentPerformance,
        engagementMetrics,
        revenueMetrics
      };
    } catch (error) {
      this.logger.error('Error getting analytics overview:', error);
      throw error;
    }
  }

  async getUserAnalytics(period = '30d', groupBy = 'day') {
    try {
      const startDate = this.getStartDate(period);
      const analytics = [];

      if (groupBy === 'day') {
        // Group by day
        const currentDate = new Date(startDate);
        const endDate = new Date();

        while (currentDate <= endDate) {
          const dayStart = new Date(currentDate);
          const dayEnd = new Date(currentDate);
          dayEnd.setDate(dayEnd.getDate() + 1);

          const dayAnalytics = await this.getUserMetricsForPeriod(dayStart, dayEnd);
          
          analytics.push({
            date: currentDate.toISOString().split('T')[0],
            ...dayAnalytics
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (groupBy === 'week') {
        // Group by week
        const currentDate = new Date(startDate);
        const endDate = new Date();

        while (currentDate <= endDate) {
          const weekStart = new Date(currentDate);
          const weekEnd = new Date(currentDate);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekAnalytics = await this.getUserMetricsForPeriod(weekStart, weekEnd);
          
          analytics.push({
            week: this.getWeekNumber(currentDate),
            startDate: weekStart.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0],
            ...weekAnalytics
          });

          currentDate.setDate(currentDate.getDate() + 7);
        }
      } else if (groupBy === 'month') {
        // Group by month
        const currentDate = new Date(startDate);
        const endDate = new Date();

        while (currentDate <= endDate) {
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

          const monthAnalytics = await this.getUserMetricsForPeriod(monthStart, monthEnd);
          
          analytics.push({
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            startDate: monthStart.toISOString().split('T')[0],
            endDate: monthEnd.toISOString().split('T')[0],
            ...monthAnalytics
          });

          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      return analytics;
    } catch (error) {
      this.logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async getContentAnalytics(period = '30d', templateId = null) {
    try {
      const startDate = this.getStartDate(period);
      
      let query = firestoreService.db.collection('contentDeliveries')
        .where('sentAt', '>=', startDate);

      if (templateId) {
        query = query.where('templateId', '==', templateId);
      }

      const snapshot = await query.get();
      const deliveries = [];

      snapshot.forEach(doc => {
        deliveries.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Group by template
      const templateStats = {};
      deliveries.forEach(delivery => {
        const templateName = delivery.templateName || 'Unknown';
        
        if (!templateStats[templateName]) {
          templateStats[templateName] = {
            templateName,
            totalSent: 0,
            totalOpened: 0,
            totalClicked: 0,
            openRate: 0,
            clickRate: 0
          };
        }

        templateStats[templateName].totalSent++;
        
        // TODO: Track actual open/click rates when implementing delivery tracking
        // For now, we'll use mock data
        if (delivery.status === 'sent') {
          templateStats[templateName].totalOpened++;
        }
      });

      // Calculate rates
      Object.values(templateStats).forEach(stats => {
        stats.openRate = stats.totalSent > 0 ? (stats.totalOpened / stats.totalSent) * 100 : 0;
        stats.clickRate = stats.totalSent > 0 ? (stats.totalClicked / stats.totalSent) * 100 : 0;
      });

      return {
        period,
        startDate,
        endDate: new Date(),
        totalDeliveries: deliveries.length,
        templateStats: Object.values(templateStats),
        deliveryMethods: this.getDeliveryMethodStats(deliveries)
      };
    } catch (error) {
      this.logger.error('Error getting content analytics:', error);
      throw error;
    }
  }

  async getEngagementAnalytics(period = '30d', metric = 'open_rate') {
    try {
      const startDate = this.getStartDate(period);
      
      // Get user engagement data from analytics collection
      const engagementSnapshot = await firestoreService.db
        .collection('analytics')
        .where('timestamp', '>=', startDate)
        .get();

      const engagementData = [];
      engagementSnapshot.forEach(doc => {
        engagementData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Calculate engagement metrics
      const totalUsers = engagementData.length;
      const activeUsers = engagementData.filter(item => item.type === 'session').length;
      const contentEngagement = engagementData.filter(item => item.type === 'content').length;
      const featureUsage = engagementData.filter(item => item.type === 'feature').length;

      const avgSessionTime = engagementData
        .filter(item => item.sessionTime)
        .reduce((acc, item) => acc + item.sessionTime, 0) / 
        engagementData.filter(item => item.sessionTime).length || 0;

      return {
        period,
        startDate,
        endDate: new Date(),
        totalUsers,
        activeUsers,
        contentEngagement,
        featureUsage,
        avgSessionTime: Math.round(avgSessionTime),
        engagementRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        contentEngagementRate: totalUsers > 0 ? (contentEngagement / totalUsers) * 100 : 0
      };
    } catch (error) {
      this.logger.error('Error getting engagement analytics:', error);
      throw error;
    }
  }

  async getRevenueAnalytics(period = '30d', groupBy = 'month') {
    try {
      const startDate = this.getStartDate(period);
      
      // Get subscription data
      const subscriptionsSnapshot = await firestoreService.db
        .collection('users')
        .where('profile.subscription', '==', 'Premium')
        .get();

      const premiumUsers = [];
      subscriptionsSnapshot.forEach(doc => {
        premiumUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Calculate revenue metrics
      const totalPremiumUsers = premiumUsers.length;
      const newPremiumUsers = premiumUsers.filter(user => 
        user.profile?.subscriptionUpdatedAt && user.profile.subscriptionUpdatedAt >= startDate
      ).length;

      // Mock revenue calculation (replace with actual payment data)
      const monthlyPrice = 9.99; // Example monthly subscription price
      const totalRevenue = totalPremiumUsers * monthlyPrice;
      const newRevenue = newPremiumUsers * monthlyPrice;

      return {
        period,
        startDate,
        endDate: new Date(),
        totalPremiumUsers,
        newPremiumUsers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        newRevenue: Math.round(newRevenue * 100) / 100,
        avgRevenuePerUser: totalPremiumUsers > 0 ? Math.round((totalRevenue / totalPremiumUsers) * 100) / 100 : 0
      };
    } catch (error) {
      this.logger.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  async exportAnalytics(period = '30d', format = 'csv') {
    try {
      const overview = await this.getOverview(period);
      
      if (format === 'csv') {
        return this.convertToCSV(overview);
      } else if (format === 'json') {
        return JSON.stringify(overview, null, 2);
      } else {
        throw new Error('Unsupported format. Use "csv" or "json"');
      }
    } catch (error) {
      this.logger.error('Error exporting analytics:', error);
      throw error;
    }
  }

  // Helper methods
  getStartDate(period) {
    const now = new Date();
    
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  async getUserCounts(startDate) {
    try {
      const totalSnapshot = await firestoreService.db.collection('users').get();
      const totalUsers = totalSnapshot.size;

      const premiumUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('profile.subscription', '==', 'Premium')
        .get();
      const premiumUsers = premiumUsersSnapshot.size;

      const activeUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('lastActive', '>=', startDate)
        .get();
      const activeUsers = activeUsersSnapshot.size;

      const newUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('createdAt', '>=', startDate)
        .get();
      const newUsers = newUsersSnapshot.size;

      return {
        total: totalUsers,
        premium: premiumUsers,
        active: activeUsers,
        new: newUsers,
        free: totalUsers - premiumUsers
      };
    } catch (error) {
      this.logger.error('Error getting user counts:', error);
      return { total: 0, premium: 0, active: 0, new: 0, free: 0 };
    }
  }

  async getContentPerformance(startDate) {
    try {
      const deliveriesSnapshot = await firestoreService.db
        .collection('contentDeliveries')
        .where('sentAt', '>=', startDate)
        .get();

      const totalDeliveries = deliveriesSnapshot.size;
      
      // Mock performance data (replace with actual tracking)
      const openRate = 75; // 75% open rate
      const clickRate = 25; // 25% click rate

      return {
        totalDeliveries,
        openRate,
        clickRate,
        avgEngagement: (openRate + clickRate) / 2
      };
    } catch (error) {
      this.logger.error('Error getting content performance:', error);
      return { totalDeliveries: 0, openRate: 0, clickRate: 0, avgEngagement: 0 };
    }
  }

  async getEngagementMetrics(startDate) {
    try {
      // Mock engagement data (replace with actual tracking)
      return {
        avgSessionTime: 8.5, // minutes
        dailyActiveUsers: 150,
        weeklyActiveUsers: 450,
        monthlyActiveUsers: 1200,
        retentionRate: 68 // percentage
      };
    } catch (error) {
      this.logger.error('Error getting engagement metrics:', error);
      return { avgSessionTime: 0, dailyActiveUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0, retentionRate: 0 };
    }
  }

  async getRevenueMetrics(startDate) {
    try {
      const premiumSnapshot = await firestoreService.db
        .collection('users')
        .where('profile.subscription', '==', 'Premium')
        .get();

      const totalPremium = premiumSnapshot.size;
      const monthlyRevenue = totalPremium * 9.99; // Mock monthly price

      return {
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        totalPremiumUsers: totalPremium,
        conversionRate: 23, // Mock conversion rate
        churnRate: 5 // Mock churn rate
      };
    } catch (error) {
      this.logger.error('Error getting revenue metrics:', error);
      return { monthlyRevenue: 0, totalPremiumUsers: 0, conversionRate: 0, churnRate: 0 };
    }
  }

  async getUserMetricsForPeriod(startDate, endDate) {
    try {
      const newUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<', endDate)
        .get();

      const activeUsersSnapshot = await firestoreService.db
        .collection('users')
        .where('lastActive', '>=', startDate)
        .where('lastActive', '<', endDate)
        .get();

      return {
        newUsers: newUsersSnapshot.size,
        activeUsers: activeUsersSnapshot.size
      };
    } catch (error) {
      this.logger.error('Error getting user metrics for period:', error);
      return { newUsers: 0, activeUsers: 0 };
    }
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  getDeliveryMethodStats(deliveries) {
    const methodStats = {};
    
    deliveries.forEach(delivery => {
      const method = delivery.deliveryMethod || 'unknown';
      methodStats[method] = (methodStats[method] || 0) + 1;
    });

    return Object.entries(methodStats).map(([method, count]) => ({
      method,
      count,
      percentage: (count / deliveries.length) * 100
    }));
  }

  convertToCSV(data) {
    // Simple CSV conversion - you might want to use a proper CSV library
    const flatten = (obj, prefix = '') => {
      const result = {};
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(result, flatten(obj[key], prefix + key + '_'));
        } else {
          result[prefix + key] = obj[key];
        }
      });
      return result;
    };

    const flattened = flatten(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);
    
    return [headers.join(','), values.join(',')].join('\n');
  }
}

export const analyticsService = new AnalyticsService();

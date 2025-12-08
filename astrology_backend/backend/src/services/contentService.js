import { logger } from '../utils/logger.js';
import FirestoreService from './firestoreService.js';

const firestoreService = new FirestoreService();

class ContentService {
  constructor() {
    this.logger = logger;
  }

  // Content Templates
  async getContentTemplates(filters = {}) {
    try {
      let query = firestoreService.db.collection('contentTemplates');

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.frequency) {
        query = query.where('frequency', '==', filters.frequency);
      }

      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      const snapshot = await query.get();
      const templates = [];

      snapshot.forEach(doc => {
        templates.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return templates;
    } catch (error) {
      this.logger.error('Error getting content templates:', error);
      throw error;
    }
  }

  async createContentTemplate(templateData) {
    try {
      const template = {
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        usageCount: 0,
        successRate: 0
      };

      const docRef = await firestoreService.db.collection('contentTemplates').add(template);
      
      this.logger.info(`Content template created: ${template.name}`);
      
      return {
        id: docRef.id,
        ...template
      };
    } catch (error) {
      this.logger.error('Error creating content template:', error);
      throw error;
    }
  }

  async updateContentTemplate(templateId, updateData) {
    try {
      const templateRef = firestoreService.db.collection('contentTemplates').doc(templateId);
      
      await templateRef.update({
        ...updateData,
        updatedAt: new Date()
      });

      const updatedDoc = await templateRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      this.logger.error('Error updating content template:', error);
      throw error;
    }
  }

  async deleteContentTemplate(templateId) {
    try {
      await firestoreService.db.collection('contentTemplates').doc(templateId).delete();
      this.logger.info(`Content template deleted: ${templateId}`);
      return { success: true, message: 'Template deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting content template:', error);
      throw error;
    }
  }

  async testContentTemplate(templateId, testData) {
    try {
      const templateDoc = await firestoreService.db.collection('contentTemplates').doc(templateId).get();
      
      if (!templateDoc.exists) {
        throw new Error('Template not found');
      }

      const template = templateDoc.data();
      const personalizedContent = this.personalizeContent(template.template, testData);

      return {
        originalTemplate: template.template,
        testData,
        personalizedContent,
        variables: template.variables || []
      };
    } catch (error) {
      this.logger.error('Error testing content template:', error);
      throw error;
    }
  }

  // Content Delivery
  async sendContentToUser(userId, templateId, customData = {}, deliveryMethod = 'email') {
    try {
      // Get user data
      const userDoc = await firestoreService.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const user = userDoc.data();

      // Get template
      const templateDoc = await firestoreService.db.collection('contentTemplates').doc(templateId).get();
      if (!templateDoc.exists) {
        throw new Error('Template not found');
      }

      const template = templateDoc.data();

      // Personalize content
      const personalizedContent = this.personalizeContent(template.template, {
        ...user.profile,
        ...customData
      });

      // Create delivery record
      const deliveryRecord = {
        userId,
        templateId,
        templateName: template.name,
        personalizedContent,
        deliveryMethod,
        status: 'sent',
        sentAt: new Date(),
        customData,
        userEmail: user.profile?.email,
        userName: user.profile?.name
      };

      const deliveryRef = await firestoreService.db
        .collection('contentDeliveries')
        .add(deliveryRecord);

      // Update template usage count
      await firestoreService.db.collection('contentTemplates').doc(templateId).update({
        usageCount: (template.usageCount || 0) + 1
      });

      // TODO: Implement actual delivery (email, SMS, push notification)
      this.logger.info(`Content sent to user ${userId} via ${deliveryMethod}`);

      return {
        id: deliveryRef.id,
        ...deliveryRecord
      };
    } catch (error) {
      this.logger.error('Error sending content to user:', error);
      throw error;
    }
  }

  async sendBulkContent(userIds, templateId, customData = {}, deliveryMethod = 'email') {
    try {
      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const userId of userIds) {
        try {
          const result = await this.sendContentToUser(userId, templateId, customData, deliveryMethod);
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
      this.logger.error('Error sending bulk content:', error);
      throw error;
    }
  }

  async scheduleContent(userIds, templateId, customData = {}, scheduleTime, deliveryMethod = 'email') {
    try {
      const scheduledContent = [];
      
      for (const userId of userIds) {
        const scheduledItem = {
          userId,
          templateId,
          customData,
          scheduleTime: new Date(scheduleTime),
          deliveryMethod,
          status: 'scheduled',
          createdAt: new Date()
        };

        const docRef = await firestoreService.db
          .collection('scheduledContent')
          .add(scheduledItem);

        scheduledContent.push({
          id: docRef.id,
          ...scheduledItem
        });
      }

      this.logger.info(`Content scheduled for ${userIds.length} users`);

      return {
        scheduledCount: scheduledContent.length,
        scheduledContent
      };
    } catch (error) {
      this.logger.error('Error scheduling content:', error);
      throw error;
    }
  }

  async getScheduledContent(filters = {}) {
    try {
      let query = firestoreService.db.collection('scheduledContent');

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.startDate) {
        query = query.where('scheduleTime', '>=', new Date(filters.startDate));
      }

      if (filters.endDate) {
        query = query.where('scheduleTime', '<=', new Date(filters.endDate));
      }

      query = query.orderBy('scheduleTime', 'asc');

      const snapshot = await query.get();
      const scheduledContent = [];

      snapshot.forEach(doc => {
        scheduledContent.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return scheduledContent;
    } catch (error) {
      this.logger.error('Error getting scheduled content:', error);
      throw error;
    }
  }

  async cancelScheduledContent(scheduleId) {
    try {
      await firestoreService.db.collection('scheduledContent').doc(scheduleId).delete();
      this.logger.info(`Scheduled content cancelled: ${scheduleId}`);
      return { success: true, message: 'Scheduled content cancelled successfully' };
    } catch (error) {
      this.logger.error('Error cancelling scheduled content:', error);
      throw error;
    }
  }

  // Content Analytics
  async getContentPerformance(templateId = null, period = '30d') {
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

      // Calculate performance metrics
      const totalDeliveries = deliveries.length;
      const successfulDeliveries = deliveries.filter(d => d.status === 'sent').length;
      const failedDeliveries = totalDeliveries - successfulDeliveries;

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
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
        templateStats: Object.values(templateStats),
        deliveryMethods: this.getDeliveryMethodStats(deliveries)
      };
    } catch (error) {
      this.logger.error('Error getting content performance:', error);
      throw error;
    }
  }

  // Helper methods
  personalizeContent(template, userData) {
    let personalizedContent = template;

    // Replace variables in template
    const variables = {
      name: userData.name || userData.firstName || 'User',
      planet: userData.currentPlanet || 'the current planet',
      house: userData.currentHouse || 'your chart',
      energy: userData.currentEnergy || 'positive',
      bestTime: userData.bestTime || 'morning',
      transit: userData.currentTransit || 'current transit',
      careerArea: userData.careerArea || 'career',
      focusArea: userData.focusArea || 'personal growth',
      healthArea: userData.healthArea || 'overall wellness',
      recommendedPractice: userData.recommendedPractice || 'meditation',
      avoidArea: userData.avoidArea || 'stressful situations',
      sunSign: userData.birthData?.sunSign || 'your sun sign',
      moonSign: userData.birthData?.moonSign || 'your moon sign',
      risingSign: userData.birthData?.risingSign || 'your rising sign'
    };

    // Replace all variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      personalizedContent = personalizedContent.replace(regex, variables[key]);
    });

    return personalizedContent;
  }

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
}

export const contentService = new ContentService();

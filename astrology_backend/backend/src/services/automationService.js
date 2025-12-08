import { logger } from '../utils/logger.js';
import FirestoreService from './firestoreService.js';

const firestoreService = new FirestoreService();

class AutomationService {
  constructor() {
    this.logger = logger;
  }

  async enableAutomation(templateId, schedule, conditions = {}) {
    try {
      const automation = {
        templateId,
        schedule,
        conditions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastRun: null,
        nextRun: this.calculateNextRun(schedule),
        runCount: 0,
        successCount: 0,
        failureCount: 0
      };

      const docRef = await firestoreService.db.collection('automations').add(automation);
      
      this.logger.info(`Automation enabled for template ${templateId}`);

      return {
        id: docRef.id,
        ...automation
      };
    } catch (error) {
      this.logger.error('Error enabling automation:', error);
      throw error;
    }
  }

  async disableAutomation(templateId) {
    try {
      const automationQuery = await firestoreService.db
        .collection('automations')
        .where('templateId', '==', templateId)
        .where('isActive', '==', true)
        .get();

      if (automationQuery.empty) {
        throw new Error('No active automation found for this template');
      }

      const automationDoc = automationQuery.docs[0];
      await automationDoc.ref.update({
        isActive: false,
        updatedAt: new Date()
      });

      this.logger.info(`Automation disabled for template ${templateId}`);

      return { success: true, message: 'Automation disabled successfully' };
    } catch (error) {
      this.logger.error('Error disabling automation:', error);
      throw error;
    }
  }

  async getAutomationStatus() {
    try {
      const snapshot = await firestoreService.db.collection('automations').get();
      const automations = [];

      snapshot.forEach(doc => {
        automations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        total: automations.length,
        active: automations.filter(a => a.isActive).length,
        inactive: automations.filter(a => !a.isActive).length,
        automations
      };
    } catch (error) {
      this.logger.error('Error getting automation status:', error);
      throw error;
    }
  }

  async scheduleAutomation(automationId, schedule) {
    try {
      const automationRef = firestoreService.db.collection('automations').doc(automationId);
      
      await automationRef.update({
        schedule,
        nextRun: this.calculateNextRun(schedule),
        updatedAt: new Date()
      });

      this.logger.info(`Automation schedule updated for ${automationId}`);

      return { success: true, message: 'Automation schedule updated successfully' };
    } catch (error) {
      this.logger.error('Error scheduling automation:', error);
      throw error;
    }
  }

  async updateAutomationSchedule(automationId, schedule) {
    try {
      const automationRef = firestoreService.db.collection('automations').doc(automationId);
      
      await automationRef.update({
        schedule,
        nextRun: this.calculateNextRun(schedule),
        updatedAt: new Date()
      });

      this.logger.info(`Automation schedule updated for ${automationId}`);

      return { success: true, message: 'Automation schedule updated successfully' };
    } catch (error) {
      this.logger.error('Error updating automation schedule:', error);
      throw error;
    }
  }

  // Helper methods
  calculateNextRun(schedule) {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      case 'weekly':
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (schedule.dayOfWeek !== undefined) {
          // Set to specific day of week
          const currentDay = now.getDay();
          const targetDay = schedule.dayOfWeek;
          const daysToAdd = (targetDay - currentDay + 7) % 7;
          nextWeek.setDate(now.getDate() + daysToAdd);
        }
        return nextWeek;
      
      case 'monthly':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, schedule.dayOfMonth || 1);
        return nextMonth;
      
      case 'quarterly':
        const nextQuarter = new Date(now.getFullYear(), now.getMonth() + 3, schedule.dayOfMonth || 1);
        return nextQuarter;
      
      case 'annually':
        const nextYear = new Date(now.getFullYear() + 1, schedule.month || 0, schedule.dayOfMonth || 1);
        return nextYear;
      
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }

  async runAutomation(automationId) {
    try {
      const automationDoc = await firestoreService.db.collection('automations').doc(automationId).get();
      
      if (!automationDoc.exists) {
        throw new Error('Automation not found');
      }

      const automation = automationDoc.data();
      
      if (!automation.isActive) {
        this.logger.info(`Automation ${automationId} is not active, skipping`);
        return;
      }

      // Check if it's time to run
      const now = new Date();
      if (automation.nextRun > now) {
        this.logger.info(`Automation ${automationId} not due yet, next run: ${automation.nextRun}`);
        return;
      }

      // Run the automation
      await this.executeAutomation(automation);

      // Update automation record
      await automationDoc.ref.update({
        lastRun: now,
        nextRun: this.calculateNextRun(automation.schedule),
        runCount: automation.runCount + 1,
        updatedAt: now
      });

      this.logger.info(`Automation ${automationId} executed successfully`);
    } catch (error) {
      this.logger.error(`Error running automation ${automationId}:`, error);
      
      // Update failure count
      try {
        const automationRef = firestoreService.db.collection('automations').doc(automationId);
        const currentDoc = await automationRef.get();
        if (currentDoc.exists) {
          await automationRef.update({
            failureCount: (currentDoc.data().failureCount || 0) + 1,
            updatedAt: new Date()
          });
        }
      } catch (updateError) {
        this.logger.error('Error updating automation failure count:', updateError);
      }
    }
  }

  async executeAutomation(automation) {
    try {
      // Get users who match the automation conditions
      const users = await this.getUsersForAutomation(automation.conditions);
      
      if (users.length === 0) {
        this.logger.info(`No users match conditions for automation ${automation.id}`);
        return;
      }

      // Send content to matching users
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          // Import contentService dynamically to avoid circular dependency
          const { contentService } = await import('./contentService.js');
          
          const result = await contentService.sendContentToUser(
            user.id,
            automation.templateId,
            {},
            'email' // Default delivery method
          );

          results.push({ userId: user.id, success: true, result });
          successCount++;
        } catch (error) {
          results.push({ userId: user.id, success: false, error: error.message });
          failureCount++;
        }
      }

      // Update automation success/failure counts
      const automationRef = firestoreService.db.collection('automations').doc(automation.id);
      await automationRef.update({
        successCount: (automation.successCount || 0) + successCount,
        failureCount: (automation.failureCount || 0) + failureCount
      });

      this.logger.info(`Automation ${automation.id} executed: ${successCount} success, ${failureCount} failures`);
    } catch (error) {
      this.logger.error(`Error executing automation ${automation.id}:`, error);
      throw error;
    }
  }

  async getUsersForAutomation(conditions) {
    try {
      let query = firestoreService.db.collection('users');

      // Apply conditions
      if (conditions.subscription) {
        query = query.where('profile.subscription', '==', conditions.subscription);
      }

      if (conditions.activeWithinDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - conditions.activeWithinDays);
        query = query.where('lastActive', '>=', cutoffDate);
      }

      const snapshot = await query.get();
      const users = [];

      snapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Apply additional filters that can't be done in Firestore query
      if (conditions.hasBirthChart) {
        return users.filter(user => user.profile?.birthData && user.profile.birthData.birthDate);
      }

      return users;
    } catch (error) {
      this.logger.error('Error getting users for automation:', error);
      throw error;
    }
  }

  // Automation Templates
  async createAutomationTemplate(templateData) {
    try {
      const template = {
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      const docRef = await firestoreService.db.collection('automationTemplates').add(template);
      
      this.logger.info(`Automation template created: ${template.name}`);
      
      return {
        id: docRef.id,
        ...template
      };
    } catch (error) {
      this.logger.error('Error creating automation template:', error);
      throw error;
    }
  }

  async getAutomationTemplates() {
    try {
      const snapshot = await firestoreService.db.collection('automationTemplates').get();
      const templates = [];

      snapshot.forEach(doc => {
        templates.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return templates;
    } catch (error) {
      this.logger.error('Error getting automation templates:', error);
      throw error;
    }
  }

  // Automation Rules
  async createAutomationRule(ruleData) {
    try {
      const rule = {
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        executionCount: 0,
        lastExecuted: null
      };

      const docRef = await firestoreService.db.collection('automationRules').add(rule);
      
      this.logger.info(`Automation rule created: ${rule.name}`);
      
      return {
        id: docRef.id,
        ...rule
      };
    } catch (error) {
      this.logger.error('Error creating automation rule:', error);
      throw error;
    }
  }

  async getAutomationRules() {
    try {
      const snapshot = await firestoreService.db.collection('automationRules').get();
      const rules = [];

      snapshot.forEach(doc => {
        rules.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return rules;
    } catch (error) {
      this.logger.error('Error getting automation rules:', error);
      throw error;
    }
  }

  // Automation Monitoring
  async getAutomationMetrics(period = '30d') {
    try {
      const startDate = this.getStartDate(period);
      
      const automationsSnapshot = await firestoreService.db
        .collection('automations')
        .where('createdAt', '>=', startDate)
        .get();

      const automations = [];
      automationsSnapshot.forEach(doc => {
        automations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Calculate metrics
      const totalAutomations = automations.length;
      const activeAutomations = automations.filter(a => a.isActive).length;
      const totalExecutions = automations.reduce((acc, a) => acc + (a.runCount || 0), 0);
      const totalSuccess = automations.reduce((acc, a) => acc + (a.successCount || 0), 0);
      const totalFailures = automations.reduce((acc, a) => acc + (a.failureCount || 0), 0);

      return {
        period,
        startDate,
        endDate: new Date(),
        totalAutomations,
        activeAutomations,
        totalExecutions,
        totalSuccess,
        totalFailures,
        successRate: totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0,
        failureRate: totalExecutions > 0 ? (totalFailures / totalExecutions) * 100 : 0
      };
    } catch (error) {
      this.logger.error('Error getting automation metrics:', error);
      throw error;
    }
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
}

export const automationService = new AutomationService();

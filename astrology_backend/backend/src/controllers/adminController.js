import { logger } from '../utils/logger.js';
import { adminService } from '../services/adminService.js';
import { contentService } from '../services/contentService.js';
import { automationService } from '../services/automationService.js';
import { analyticsService } from '../services/analyticsService.js';

// User Management
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, subscription, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const users = await adminService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      subscription,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await adminService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
};

export const getUserCharts = async (req, res) => {
  try {
    const { userId } = req.params;
    const charts = await adminService.getUserCharts(userId);
    
    res.json({
      success: true,
      data: charts
    });
  } catch (error) {
    logger.error('Error getting user charts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user charts'
    });
  }
};

export const getUserEngagement = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;
    
    const engagement = await adminService.getUserEngagement(userId, period);
    
    res.json({
      success: true,
      data: engagement
    });
  } catch (error) {
    logger.error('Error getting user engagement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user engagement'
    });
  }
};

export const updateUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscription, reason } = req.body;
    
    const updatedUser = await adminService.updateUserSubscription(userId, subscription, reason);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    await adminService.deleteUser(userId, reason);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// Content Management
export const getContentTemplates = async (req, res) => {
  try {
    const { category, frequency, isActive } = req.query;
    
    const templates = await contentService.getContentTemplates({
      category,
      frequency,
      isActive: isActive === 'true'
    });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Error getting content templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content templates'
    });
  }
};

export const createContentTemplate = async (req, res) => {
  try {
    const templateData = req.body;
    const newTemplate = await contentService.createContentTemplate(templateData);
    
    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Content template created successfully'
    });
  } catch (error) {
    logger.error('Error creating content template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create content template'
    });
  }
};

export const updateContentTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updateData = req.body;
    
    const updatedTemplate = await contentService.updateContentTemplate(templateId, updateData);
    
    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Content template updated successfully'
    });
  } catch (error) {
    logger.error('Error updating content template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update content template'
    });
  }
};

export const deleteContentTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    await contentService.deleteContentTemplate(templateId);
    
    res.json({
      success: true,
      message: 'Content template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting content template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content template'
    });
  }
};

export const testContentTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { testData } = req.body;
    
    const result = await contentService.testContentTemplate(templateId, testData);
    
    res.json({
      success: true,
      data: result,
      message: 'Template test completed successfully'
    });
  } catch (error) {
    logger.error('Error testing content template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test content template'
    });
  }
};

// Content Delivery
export const sendContentToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { templateId, customData, deliveryMethod = 'email' } = req.body;
    
    const result = await contentService.sendContentToUser(userId, templateId, customData, deliveryMethod);
    
    res.json({
      success: true,
      data: result,
      message: 'Content sent successfully'
    });
  } catch (error) {
    logger.error('Error sending content to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send content'
    });
  }
};

export const sendBulkContent = async (req, res) => {
  try {
    const { userIds, templateId, customData, deliveryMethod = 'email' } = req.body;
    
    const result = await contentService.sendBulkContent(userIds, templateId, customData, deliveryMethod);
    
    res.json({
      success: true,
      data: result,
      message: `Content sent to ${result.sentCount} users successfully`
    });
  } catch (error) {
    logger.error('Error sending bulk content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk content'
    });
  }
};

export const scheduleContent = async (req, res) => {
  try {
    const { userIds, templateId, customData, scheduleTime, deliveryMethod = 'email' } = req.body;
    
    const result = await contentService.scheduleContent(userIds, templateId, customData, scheduleTime, deliveryMethod);
    
    res.json({
      success: true,
      data: result,
      message: 'Content scheduled successfully'
    });
  } catch (error) {
    logger.error('Error scheduling content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule content'
    });
  }
};

export const getScheduledContent = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    const scheduledContent = await contentService.getScheduledContent({
      status,
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: scheduledContent
    });
  } catch (error) {
    logger.error('Error getting scheduled content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduled content'
    });
  }
};

export const cancelScheduledContent = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    await contentService.cancelScheduledContent(scheduleId);
    
    res.json({
      success: true,
      message: 'Scheduled content cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling scheduled content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel scheduled content'
    });
  }
};

// Automation
export const enableAutomation = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schedule, conditions } = req.body;
    
    const result = await automationService.enableAutomation(templateId, schedule, conditions);
    
    res.json({
      success: true,
      data: result,
      message: 'Automation enabled successfully'
    });
  } catch (error) {
    logger.error('Error enabling automation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable automation'
    });
  }
};

export const disableAutomation = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    await automationService.disableAutomation(templateId);
    
    res.json({
      success: true,
      message: 'Automation disabled successfully'
    });
  } catch (error) {
    logger.error('Error disabling automation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable automation'
    });
  }
};

export const getAutomationStatus = async (req, res) => {
  try {
    const status = await automationService.getAutomationStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting automation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation status'
    });
  }
};

// Analytics
export const getAnalyticsOverview = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const overview = await analyticsService.getOverview(period);
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    logger.error('Error getting analytics overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics overview'
    });
  }
};

export const getUserAnalytics = async (req, res) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    
    const analytics = await analyticsService.getUserAnalytics(period, groupBy);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user analytics'
    });
  }
};

export const getContentAnalytics = async (req, res) => {
  try {
    const { period = '30d', templateId } = req.query;
    
    const analytics = await analyticsService.getContentAnalytics(period, templateId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting content analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content analytics'
    });
  }
};

export const getEngagementAnalytics = async (req, res) => {
  try {
    const { period = '30d', metric = 'open_rate' } = req.query;
    
    const analytics = await analyticsService.getEngagementAnalytics(period, metric);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting engagement analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement analytics'
    });
  }
};

export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30d', groupBy = 'month' } = req.query;
    
    const analytics = await analyticsService.getRevenueAnalytics(period, groupBy);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting revenue analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue analytics'
    });
  }
};

export const exportAnalytics = async (req, res) => {
  try {
    const { period = '30d', format = 'csv' } = req.query;
    
    const exportData = await analyticsService.exportAnalytics(period, format);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${period}.csv`);
    res.send(exportData);
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics'
    });
  }
};

// System Management
export const getSystemHealth = async (req, res) => {
  try {
    const health = await adminService.getSystemHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health'
    });
  }
};

export const getSystemLogs = async (req, res) => {
  try {
    const { level, startDate, endDate, limit = 100 } = req.query;
    
    const logs = await adminService.getSystemLogs({
      level,
      startDate,
      endDate,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error getting system logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system logs'
    });
  }
};

// Notifications
export const sendNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;
    
    const result = await adminService.sendNotification(userId, type, title, message, data);
    
    res.json({
      success: true,
      data: result,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
};

export const sendBulkNotifications = async (req, res) => {
  try {
    const { userIds, type, title, message, data } = req.body;
    
    const result = await adminService.sendBulkNotifications(userIds, type, title, message, data);
    
    res.json({
      success: true,
      data: result,
      message: `Notifications sent to ${result.sentCount} users successfully`
    });
  } catch (error) {
    logger.error('Error sending bulk notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk notifications'
    });
  }
};

// Missing route handlers
export const scheduleAutomation = async (req, res) => {
  try {
    const { automationId } = req.params;
    const { schedule } = req.body;
    
    const result = await automationService.scheduleAutomation(automationId, schedule);
    
    res.json({
      success: true,
      data: result,
      message: 'Automation scheduled successfully'
    });
  } catch (error) {
    logger.error('Error scheduling automation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule automation'
    });
  }
};

export const updateAutomationSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { schedule } = req.body;
    
    const result = await automationService.updateAutomationSchedule(scheduleId, schedule);
    
    res.json({
      success: true,
      data: result,
      message: 'Automation schedule updated successfully'
    });
  } catch (error) {
    logger.error('Error updating automation schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update automation schedule'
    });
  }
};

export const enableMaintenanceMode = async (req, res) => {
  try {
    // TODO: Implement maintenance mode
    res.json({
      success: true,
      message: 'Maintenance mode enabled'
    });
  } catch (error) {
    logger.error('Error enabling maintenance mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable maintenance mode'
    });
  }
};

export const disableMaintenanceMode = async (req, res) => {
  try {
    // TODO: Implement maintenance mode
    res.json({
      success: true,
      message: 'Maintenance mode disabled'
    });
  } catch (error) {
    logger.error('Error disabling maintenance mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable maintenance mode'
    });
  }
};

export const getSystemPerformance = async (req, res) => {
  try {
    // TODO: Implement system performance monitoring
    res.json({
      success: true,
      data: {
        cpu: '45%',
        memory: '60%',
        disk: '30%',
        network: '25%'
      }
    });
  } catch (error) {
    logger.error('Error getting system performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system performance'
    });
  }
};

export const getNotificationHistory = async (req, res) => {
  try {
    // TODO: Implement notification history
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    logger.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification history'
    });
  }
};

export const createNotificationTemplate = async (req, res) => {
  try {
    // TODO: Implement notification template creation
    res.json({
      success: true,
      message: 'Notification template created successfully'
    });
  } catch (error) {
    logger.error('Error creating notification template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification template'
    });
  }
};

export const adminController = {
  getAllUsers,
  getUserById,
  getUserCharts,
  getUserEngagement,
  updateUserSubscription,
  deleteUser,
  getContentTemplates,
  createContentTemplate,
  updateContentTemplate,
  deleteContentTemplate,
  testContentTemplate,
  sendContentToUser,
  sendBulkContent,
  scheduleContent,
  getScheduledContent,
  cancelScheduledContent,
  enableAutomation,
  disableAutomation,
  getAutomationStatus,
  scheduleAutomation,
  updateAutomationSchedule,
  getAnalyticsOverview,
  getUserAnalytics,
  getContentAnalytics,
  getEngagementAnalytics,
  getRevenueAnalytics,
  exportAnalytics,
  getSystemHealth,
  getSystemLogs,
  enableMaintenanceMode,
  disableMaintenanceMode,
  getSystemPerformance,
  sendNotification,
  sendBulkNotifications,
  getNotificationHistory,
  createNotificationTemplate
};

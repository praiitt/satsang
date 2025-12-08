import express from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { adminController } from '../controllers/adminController.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.get('/users/:userId/charts', adminController.getUserCharts);
router.get('/users/:userId/engagement', adminController.getUserEngagement);
router.put('/users/:userId/subscription', adminController.updateUserSubscription);
router.delete('/users/:userId', adminController.deleteUser);

// Content Management
router.get('/content/templates', adminController.getContentTemplates);
router.post('/content/templates', adminController.createContentTemplate);
router.put('/content/templates/:templateId', adminController.updateContentTemplate);
router.delete('/content/templates/:templateId', adminController.deleteContentTemplate);
router.post('/content/templates/:templateId/test', adminController.testContentTemplate);

// Content Delivery
router.post('/content/send/:userId', adminController.sendContentToUser);
router.post('/content/send/bulk', adminController.sendBulkContent);
router.post('/content/schedule', adminController.scheduleContent);
router.get('/content/scheduled', adminController.getScheduledContent);
router.delete('/content/scheduled/:scheduleId', adminController.cancelScheduledContent);

// Automation
router.post('/automation/enable/:templateId', adminController.enableAutomation);
router.post('/automation/disable/:templateId', adminController.disableAutomation);
router.get('/automation/status', adminController.getAutomationStatus);
router.post('/automation/schedule', adminController.scheduleAutomation);
router.put('/automation/schedule/:scheduleId', adminController.updateAutomationSchedule);

// Analytics & Reports
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/content', adminController.getContentAnalytics);
router.get('/analytics/engagement', adminController.getEngagementAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/export', adminController.exportAnalytics);

// System Management
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/logs', adminController.getSystemLogs);
router.post('/system/maintenance', adminController.enableMaintenanceMode);
router.delete('/system/maintenance', adminController.disableMaintenanceMode);
router.get('/system/performance', adminController.getSystemPerformance);

// Notifications
router.post('/notifications/send', adminController.sendNotification);
router.post('/notifications/send/bulk', adminController.sendBulkNotifications);
router.get('/notifications/history', adminController.getNotificationHistory);
router.post('/notifications/templates', adminController.createNotificationTemplate);

export default router;

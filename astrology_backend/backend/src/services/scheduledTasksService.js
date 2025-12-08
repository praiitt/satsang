import { logger } from '../utils/logger.js';
import { astrologyAPIService } from './astrologyAPIService.js';

class ScheduledTasksService {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
    this.healthCheckInterval = null;
    this.apiKeyCheckInterval = null;
  }

  // Start all scheduled tasks
  start() {
    if (this.isRunning) {
      logger.warn('Scheduled tasks service is already running');
      return;
    }

    logger.info('Starting scheduled tasks service');
    this.isRunning = true;

    // Start API key health check (every 6 hours)
    this.startAPIKeyHealthCheck();
    
    // Start general health check (every hour)
    this.startGeneralHealthCheck();

    logger.info('Scheduled tasks service started successfully');
  }

  // Stop all scheduled tasks
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduled tasks service is not running');
      return;
    }

    logger.info('Stopping scheduled tasks service');
    this.isRunning = false;

    // Clear all intervals
    if (this.apiKeyCheckInterval) {
      clearInterval(this.apiKeyCheckInterval);
      this.apiKeyCheckInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Scheduled tasks service stopped successfully');
  }

  // Start API key health check (every 6 hours)
  startAPIKeyHealthCheck() {
    const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    
    // Run immediately on startup
    this.checkAstrologyAPIKey();
    
    // Then schedule to run every 6 hours
    this.apiKeyCheckInterval = setInterval(() => {
      this.checkAstrologyAPIKey();
    }, SIX_HOURS);

    logger.info('API key health check scheduled every 6 hours');
  }

  // Start general health check (every hour)
  startGeneralHealthCheck() {
    const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
    
    this.healthCheckInterval = setInterval(() => {
      this.performGeneralHealthCheck();
    }, ONE_HOUR);

    logger.info('General health check scheduled every hour');
  }

  // Check astrology API key status
  async checkAstrologyAPIKey() {
    try {
      logger.info('Performing scheduled astrology API key health check');
      
      const healthStatus = await astrologyAPIService.checkAPIKeyStatus();
      
      // Log the status
      if (healthStatus.valid) {
        logger.info('Astrology API key is healthy', { 
          status: healthStatus.status,
          lastChecked: healthStatus.lastChecked 
        });
      } else {
        logger.error('Astrology API key health check failed', { 
          status: healthStatus.status,
          message: healthStatus.message,
          lastChecked: healthStatus.lastChecked 
        });
        
        // If API key is expired, log a critical warning
        if (healthStatus.status === 'expired') {
          logger.error('CRITICAL: Astrology API key has expired! Please renew immediately.', {
            status: healthStatus.status,
            message: healthStatus.message,
            lastChecked: healthStatus.lastChecked
          });
        }
      }

      // Store the health status for monitoring
      this.tasks.set('astrologyAPIHealth', {
        lastCheck: healthStatus.lastChecked,
        status: healthStatus.status,
        valid: healthStatus.valid,
        message: healthStatus.message
      });

    } catch (error) {
      logger.error('Error during scheduled astrology API key health check:', error);
      
      this.tasks.set('astrologyAPIHealth', {
        lastCheck: new Date().toISOString(),
        status: 'error',
        valid: false,
        message: 'Health check failed with error: ' + error.message
      });
    }
  }

  // Perform general health check
  async performGeneralHealthCheck() {
    try {
      logger.info('Performing scheduled general health check');
      
      const healthChecks = {
        timestamp: new Date().toISOString(),
        database: 'healthy', // You can add actual DB health check here
        memory: this.getMemoryUsage(),
        uptime: process.uptime(),
        astrologyAPI: this.tasks.get('astrologyAPIHealth') || 'not_checked'
      };

      // Log health status
      logger.info('General health check completed', healthChecks);
      
      // Store health check results
      this.tasks.set('generalHealth', healthChecks);

    } catch (error) {
      logger.error('Error during scheduled general health check:', error);
    }
  }

  // Get memory usage statistics
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(usage.external / 1024 / 1024) + ' MB'
    };
  }

  // Get status of all scheduled tasks
  getTasksStatus() {
    const status = {
      isRunning: this.isRunning,
      tasks: Object.fromEntries(this.tasks),
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    return status;
  }

  // Manually trigger API key health check
  async triggerAPIKeyCheck() {
    logger.info('Manual API key health check triggered');
    await this.checkAstrologyAPIKey();
    return this.tasks.get('astrologyAPIHealth');
  }

  // Manually trigger general health check
  async triggerGeneralHealthCheck() {
    logger.info('Manual general health check triggered');
    await this.performGeneralHealthCheck();
    return this.tasks.get('generalHealth');
  }
}

export const scheduledTasksService = new ScheduledTasksService();

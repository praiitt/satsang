/**
 * PM2 Ecosystem Configuration for RRAASI Frontend
 * 
 * This configuration manages the Next.js frontend application with PM2 for:
 * - Automatic restart on crash
 * - Memory management
 * - Log management
 * - Process monitoring
 * 
 * Production Usage:
 *   npm run build  # Build production bundle first
 *   pm2 start ecosystem.frontend.config.cjs --env production
 *   pm2 logs frontend
 *   pm2 restart frontend
 *   pm2 stop frontend
 *   pm2 save  # Save process list for auto-start on reboot
 */

module.exports = {
    apps: [
        {
            name: 'frontend',
            script: 'npm',
            args: 'start',  // Production: npm start (runs Next.js production server)
            cwd: './',
            instances: 1,
            exec_mode: 'fork',

            // Auto-restart configuration
            autorestart: true,
            watch: false, // Don't watch files in production (use for dev if needed)
            max_memory_restart: '1G', // Restart if memory exceeds 1GB

            // Restart behavior - PREVENT CRASH LOOPS
            min_uptime: '30s', // Minimum uptime before considered stable (increased from 10s)
            max_restarts: 3, // Max restart attempts (reduced from 10 to prevent CPU exhaustion)
            restart_delay: 10000, // Wait 10 seconds before restart (increased from 4s)

            // Environment variables
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            // Logging
            error_file: './logs/frontend-error.log',
            out_file: './logs/frontend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Process management
            kill_timeout: 5000, // Wait 5 seconds before force kill
            listen_timeout: 10000, // Wait 10 seconds for app to be ready

            // Crash handling - Exponential backoff to prevent rapid restarts
            exp_backoff_restart_delay: 5000, // Start at 5s, doubles each time (5s → 10s → 20s → 40s)

            // Health monitoring
            // PM2 will restart the app if it doesn't respond
            // Can be enabled with pm2-health module
        },
    ],
};

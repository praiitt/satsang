/**
 * PM2 Ecosystem Configuration for RRAASI Frontend
 * 
 * This configuration manages the Next.js frontend application with PM2 for:
 * - Automatic restart on crash
 * - Memory management
 * - Log management
 * - Process monitoring
 * 
 * Usage:
 *   pm2 start ecosystem.frontend.config.cjs
 *   pm2 logs frontend
 *   pm2 restart frontend
 *   pm2 stop frontend
 */

module.exports = {
    apps: [
        {
            name: 'frontend',
            script: 'npm',
            args: 'run dev',
            cwd: './',
            instances: 1,
            exec_mode: 'fork',

            // Auto-restart configuration
            autorestart: true,
            watch: false, // Don't watch files in production (use for dev if needed)
            max_memory_restart: '1G', // Restart if memory exceeds 1GB

            // Restart behavior
            min_uptime: '10s', // Minimum uptime before considered stable
            max_restarts: 10, // Max restart attempts in unstable period
            restart_delay: 4000, // Wait 4 seconds before restart

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
            },
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

            // Crash handling
            exp_backoff_restart_delay: 100, // Exponential backoff delay

            // Health monitoring
            // PM2 will restart the app if it doesn't respond
            // Can be enabled with pm2-health module
        },
    ],
};

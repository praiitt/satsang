/**
 * PM2 Ecosystem Configuration for Auth Server
 * 
 * This configuration manages the auth server (Express.js) with PM2 for:
 * - Automatic restart on crash
 * - Memory management  
 * - Log management
 * - Process monitoring
 * 
 * Production Usage:
 *   pm2 start ecosystem.authserver.config.cjs --env production
 *   pm2 logs auth-server
 *   pm2 restart auth-server
 *   pm2 stop auth-server
 *   pm2 save  # Save process list for auto-start on reboot
 */

module.exports = {
    apps: [
        {
            name: 'auth-server',
            script: 'npm',
            args: 'start',  // Production: npm start
            cwd: './auth-server',
            instances: 1,
            exec_mode: 'fork',

            // Auto-restart configuration
            autorestart: true,
            watch: false,
            max_memory_restart: '512M', // Restart if memory exceeds 512MB

            // Restart behavior - PREVENT CRASH LOOPS
            min_uptime: '30s', // Minimum uptime before considered stable (increased from 10s)
            max_restarts: 3, // Max restart attempts (reduced from 10 to prevent CPU exhaustion)
            restart_delay: 10000, // Wait 10 seconds before restart (increased from 4s)

            // Environment variables
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000,
            },

            // Logging
            error_file: './logs/auth-server-error.log',
            out_file: './logs/auth-server-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Process management
            kill_timeout: 5000,
            listen_timeout: 10000,

            // Crash handling - Exponential backoff to prevent rapid restarts
            exp_backoff_restart_delay: 5000, // Start at 5s, doubles each time (5s → 10s → 20s → 40s)
        },
    ],
};

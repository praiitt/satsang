/**
 * PM2 Ecosystem Configuration for Auth Server
 * 
 * This configuration manages the auth server (Express.js) with PM2 for:
 * - Automatic restart on crash
 * - Memory management  
 * - Log management
 * - Process monitoring
 * 
 * Usage:
 *   pm2 start ecosystem.authserver.config.cjs
 *   pm2 logs auth-server
 *   pm2 restart auth-server
 *   pm2 stop auth-server
 */

module.exports = {
    apps: [
        {
            name: 'auth-server',
            script: 'npm',
            args: 'run dev',
            cwd: './auth-server',
            instances: 1,
            exec_mode: 'fork',

            // Auto-restart configuration
            autorestart: true,
            watch: false,
            max_memory_restart: '512M', // Restart if memory exceeds 512MB

            // Restart behavior
            min_uptime: '10s',
            max_restarts: 10,
            restart_delay: 4000,

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 4000,
            },
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

            // Crash handling
            exp_backoff_restart_delay: 100,
        },
    ],
};

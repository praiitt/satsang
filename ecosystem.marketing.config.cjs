module.exports = {
    apps: [
        {
            name: 'satsang-marketing-server',
            script: 'npm',
            args: 'start',
            cwd: './marketing-server',
            interpreter: 'none',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 4001,
                MARKETING_PORT: 4001
            },
            error_file: './logs/pm2-marketing-error.log',
            out_file: './logs/pm2-marketing-out.log',
            log_file: './logs/pm2-marketing-combined.log',
            time: true,
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};

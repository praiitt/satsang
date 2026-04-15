module.exports = {
  apps: [
    {
      name: 'whatsapp-service',
      script: 'npm',
      args: 'run start',
      cwd: './whatsapp-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4002,
        WHATSAPP_BOT_ENABLED: 'true',
        MARKETING_SERVER_URL: 'https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-marketing-server'
      },
      error_file: './logs/pm2-whatsapp-error.log',
      out_file: './logs/pm2-whatsapp-out.log',
      log_file: './logs/pm2-whatsapp-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

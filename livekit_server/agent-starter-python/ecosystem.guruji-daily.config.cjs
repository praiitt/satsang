module.exports = {
  apps: [
    {
      name: 'guruji-daily',
      cwd: __dirname,
      interpreter: './venv/bin/python',
      script: 'src/agent.py',
      args: ['start'],
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        LIVEKIT_AGENT_NAME: 'guruji-daily',
        LIVEKIT_LOG_LEVEL: 'debug',
        PYTHONUNBUFFERED: '1',
      },
      error_file: './logs/guruji-daily-error.log',
      out_file: './logs/guruji-daily-out.log',
      log_file: './logs/guruji-daily-combined.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'guruji',
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
        LIVEKIT_AGENT_NAME: 'guruji',
        LIVEKIT_LOG_LEVEL: 'debug',
        PYTHONUNBUFFERED: '1',
      },
      error_file: './logs/guruji-error.log',
      out_file: './logs/guruji-out.log',
      log_file: './logs/guruji-combined.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

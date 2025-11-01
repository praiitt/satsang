module.exports = {
  apps: [
    {
      name: 'satsang-livekit-agent',
      script: 'uv',
      args: 'run python src/agent.py dev',
      cwd: '/home/underlitigationcom/satsang/livekit_server/agent-starter-python',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};


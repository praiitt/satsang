module.exports = {
  apps: [
    {
      name: 'satsang-livekit-agent',
      // Run via uv (recommended for uv-managed projects)
      // Use bash to ensure PATH is set correctly for uv
      script: 'bash',
      args: '-c "cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python && uv run src/agent.py start"',
      cwd: '/home/underlitigationcom/satsang/livekit_server/agent-starter-python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        // Enable debug logging for LiveKit agents
        LIVEKIT_LOG_LEVEL: 'debug',
        // Python debug logging
        PYTHONUNBUFFERED: '1',
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

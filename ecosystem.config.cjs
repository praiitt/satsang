module.exports = {
  apps: [
    {
      name: 'satsang-frontend',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/underlitigationcom/satsang',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      log_file: './logs/pm2-frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'universal-wisdom-agent',
      script: 'src/universal_wisdom_agent.py',
      args: 'dev',
      cwd: '/home/underlitigationcom/satsang/livekit_server/agent-starter-python',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PYTHONPATH: '.',
      },
      error_file: '../../logs/pm2-agent-wisdom-error.log',
      out_file: '../../logs/pm2-agent-wisdom-out.log',
      log_file: '../../logs/pm2-agent-wisdom-combined.log',
      time: true,
      merge_logs: true,
    }
  ],
};

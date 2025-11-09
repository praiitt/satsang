const path = require('path');

const cwd = __dirname;
const distPath = path.join(cwd, 'dist', 'index.js');
const fallbackScript = path.join(cwd, 'src', 'index.ts');

module.exports = {
  apps: [
    {
      name: 'auth-server',
      cwd,
      script: distPath,
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      instances: 1,
    },
    {
      name: 'auth-server-dev',
      cwd,
      script: fallbackScript,
      interpreter: 'pnpm',
      interpreter_args: ['tsx'],
      args: ['watch', 'src/index.ts'],
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      instances: 1,
    },
  ],
};

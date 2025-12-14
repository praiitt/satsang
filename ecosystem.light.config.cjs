module.exports = {
    apps: [
        // Essential Services - Always Running
        {
            name: 'frontend',
            script: 'npm',
            args: 'start',
            cwd: './',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
        },
        {
            name: 'auth-server',
            script: 'npm',
            args: 'start',
            cwd: './auth-server',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 4000,
            },
        },
        {
            name: 'astrology-backend',
            script: 'npm',
            args: 'start',
            cwd: './astrology_backend/backend',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3003,
            },
        },

        // PRIORITY AGENT - Music (Most Used)
        {
            name: 'agent-music',
            script: 'venv/bin/python',
            args: 'src/music_agent.py start',
            cwd: './livekit_server/agent-starter-python',
            interpreter: 'none',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                LIVEKIT_HTTP_PORT: '8082',
            },
        },

        // OTHER AGENTS - Start only when needed
        // Uncomment the agents you want to run
        /*
        {
          name: 'agent-guruji',
          script: 'venv/bin/python',
          args: 'src/oshoagent.py start',
          cwd: './livekit_server/agent-starter-python',
          interpreter: 'none',
          instances: 1,
          autorestart: true,
          watch: false,
          max_memory_restart: '1G',
          env: {
            LIVEKIT_HTTP_PORT: '8081',
          },
        },
        */
    ],
};

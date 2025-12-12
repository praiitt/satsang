/**
 * PM2 Ecosystem Configuration for Monolithic Deployment
 * Runs Frontend, Auth Server, Backend, and Agents in a single container.
 */

module.exports = {
    apps: [
        // 1. Frontend (Next.js)
        {
            name: 'frontend',
            script: 'npm',
            args: 'start',
            cwd: './', // Root
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            restart_delay: 5000
        },

        // 2. Auth Server (Express)
        {
            name: 'auth-server',
            script: 'npm',
            args: 'start',
            cwd: './auth-server',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 4000,
                FIREBASE_SERVICE_ACCOUNT_PATH: '/home/prakash/satsang/satsangServiceAccount.json'
            },
            restart_delay: 5000
        },

        // 3. Astrology Backend (Express)
        {
            name: 'astrology-backend',
            script: 'src/server.js',
            cwd: './astrology_backend/backend',
            // Use 'node' directly or npm start. npm start in that package runs 'node src/server.js'
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3003
            },
            restart_delay: 5000
        },

        // 4. LiveKit Agents (Python)
        // Aggregated Agent Worker (running all agents in one process or separate if preferred)
        // The original config had multiple agents. To save RAM, we should try to run them efficiently.
        // If the 'agent.py' entrypoint runs a specific agent, we need to run multiple processes.
        // Let's check 'agent-starter-python/ecosystem.agents.config.cjs' - it runs multiple scripts.
        // We will replicate that here but optimized.
        {
            name: "agent-guruji",
            script: "src/agent.py",
            args: "start",
            cwd: "./livekit_server/agent-starter-python",
            interpreter: "/home/prakash/satsang/livekit_server/agent-starter-python/venv/bin/python3",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "guruji"
            },
            max_memory_restart: "512M",
            restart_delay: 5000
        },
        // {
        //     name: "agent-osho",
        //     script: "src/oshoagent.py",
        //     args: "start",
        //     cwd: "./livekit_server/agent-starter-python",
        //     interpreter: "python3",
        //     env: {
        //         PYTHONUNBUFFERED: "1",
        //         LIVEKIT_AGENT_NAME: "osho"
        //     },
        //     max_memory_restart: "512M",
        //     restart_delay: 5000
        // },
        {
            name: "agent-music",
            script: "src/music_agent.py",
            args: "start",
            cwd: "./livekit_server/agent-starter-python",
            interpreter: "/home/prakash/satsang/livekit_server/agent-starter-python/venv/bin/python3",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "music-agent"
            },
            max_memory_restart: "512M",
            restart_delay: 5000
        },
        {
            name: "agent-hinduism",
            script: "src/hinduism_agent.py",
            args: "start",
            cwd: "./livekit_server/agent-starter-python",
            interpreter: "/home/prakash/satsang/livekit_server/agent-starter-python/venv/bin/python3",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "hinduism-agent"
            },
            max_memory_restart: "512M",
            restart_delay: 5000
        },
        {
            name: "agent-astrology",
            script: "src/vedic_astrology_agent.py",
            args: "start",
            cwd: "./livekit_server/agent-starter-python",
            interpreter: "/home/prakash/satsang/livekit_server/agent-starter-python/venv/bin/python3",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "vedic-astrology-agent"
            },
            max_memory_restart: "512M",
            restart_delay: 5000
        },
        {
            name: "agent-et",
            script: "src/etagent.py",
            args: "start",
            cwd: "./livekit_server/agent-starter-python",
            interpreter: "/home/prakash/satsang/livekit_server/agent-starter-python/venv/bin/python3",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "etagent"
            },
            max_memory_restart: "512M",
            restart_delay: 5000
        }
    ]
};

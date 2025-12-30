module.exports = {
    apps: [
        {
            name: "agent-guruji",
            script: "src/agent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "guruji",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-osho",
            script: "src/oshoagent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "osho",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-music",
            script: "src/music_agent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "music-agent",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-hinduism",
            script: "src/hinduism_agent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "hinduism-agent",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-astrology",
            script: "src/vedic_astrology_agent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "vedic-astrology-agent",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-et",
            script: "src/etagent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "etagent",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-psychedelic",
            script: "src/psychedelic_agent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "psychedelic-agent",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        },
        {
            name: "agent-tarot",
            script: "src/tarot_agent.py",
            args: "dev",
            interpreter: "./venv/bin/python",
            cwd: ".",
            env: {
                PYTHONUNBUFFERED: "1",
                LIVEKIT_AGENT_NAME: "tarot-agent",
                DOTENV_PATH: ".env.local"
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            max_restarts: 10,
            min_uptime: "10s",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            cpu_threshold: 70,
            cpu_restart_delay: 30
        }
    ]
};

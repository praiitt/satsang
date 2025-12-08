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
            max_memory_restart: "1G"
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
            max_memory_restart: "1G"
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
            max_memory_restart: "1G"
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
            max_memory_restart: "1G"
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
            max_memory_restart: "1G"
        }
    ]
};

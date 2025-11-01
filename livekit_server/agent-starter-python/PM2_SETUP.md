# PM2 Setup for Satsang LiveKit Agent

This guide explains how to run the Satsang LiveKit Agent using PM2 on Ubuntu.

## Prerequisites

1. **Install uv** (Python package manager):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   source $HOME/.cargo/env  # or add to ~/.bashrc
   ```

2. **Install PM2** (Node.js process manager):
   ```bash
   npm install -g pm2
   ```

3. **Configure Environment Variables**:
   Ensure `.env.local` exists in this directory with your LiveKit credentials:
   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   TTS_VOICE_ID=your_voice_id
   TTS_SPEED=slow
   ```

## Usage

### Start the Agent

```bash
chmod +x start-pm2.sh
./start-pm2.sh
```

### Stop the Agent

```bash
chmod +x stop-pm2.sh
./stop-pm2.sh
```

### Manual PM2 Commands

```bash
# View logs
pm2 logs satsang-livekit-agent

# View status
pm2 status

# Restart agent
pm2 restart satsang-livekit-agent

# Stop agent
pm2 stop satsang-livekit-agent

# Delete from PM2
pm2 delete satsang-livekit-agent

# View detailed info
pm2 info satsang-livekit-agent

# Monitor (real-time monitoring)
pm2 monit
```

### Setup PM2 to Start on System Boot

```bash
# Generate startup script
pm2 startup

# Follow the instructions shown, then save the process list
pm2 save
```

## Configuration

The `ecosystem.config.cjs` file contains PM2 configuration. Key settings:

- **name**: Process name in PM2
- **script**: Command to run (`uv`)
- **args**: Arguments passed to uv
- **cwd**: Working directory (automatically set by start script)
- **autorestart**: Automatically restart on crash
- **max_memory_restart**: Restart if memory exceeds 1GB
- **log files**: Logs are stored in `./logs/` directory

## Troubleshooting

1. **Agent not starting**: Check if `.env.local` exists and has correct credentials
2. **uv not found**: Ensure uv is in your PATH or use full path in ecosystem.config.cjs
3. **Permission denied**: Make sure scripts are executable (`chmod +x *.sh`)
4. **Port conflicts**: Ensure LiveKit agent port is available

## Logs

Logs are stored in:
- `./logs/pm2-error.log` - Error logs
- `./logs/pm2-out.log` - Standard output
- `./logs/pm2-combined.log` - Combined logs

You can also view real-time logs with:
```bash
pm2 logs satsang-livekit-agent
```


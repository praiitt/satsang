#!/bin/bash

# Stop all LiveKit agents using PM2

# Determine the agent directory
if [ -d "livekit_server/agent-starter-python" ]; then
    AGENT_DIR="livekit_server/agent-starter-python"
elif [ -f "ecosystem.agents.config.cjs" ]; then
    AGENT_DIR="."
else
    echo "Error: Could not find agent directory"
    exit 1
fi

cd "$AGENT_DIR"

echo "Stopping LiveKit agents..."
pm2 stop ecosystem.agents.config.cjs
pm2 delete ecosystem.agents.config.cjs

echo "Agents stopped."

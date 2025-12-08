#!/bin/bash

# Start all LiveKit agents using PM2
# This script assumes you are running from the project root or the agent directory

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

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment 'venv' not found in $AGENT_DIR"
    echo "Please run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing globally..."
    npm install -g pm2
fi

echo "Starting LiveKit agents with PM2..."
pm2 start ecosystem.agents.config.cjs

echo ""
echo "Agents started! Run 'pm2 status' to check status."
echo "Run 'pm2 logs' to see logs."

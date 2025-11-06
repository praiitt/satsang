#!/bin/bash

# Restart the LiveKit agent with logging

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Stop any running agent
echo "🛑 Stopping any running agent..."
pkill -f "python.*agent.py dev" || echo "No agent process found"

# Wait a moment
sleep 1

# Start the agent
echo "🚀 Starting agent with enhanced logging..."
source venv/bin/activate
python src/agent.py dev


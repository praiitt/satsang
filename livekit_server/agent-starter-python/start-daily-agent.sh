#!/bin/bash

# Script to start Daily Satsang Agent Worker (guruji-daily) with PM2
# Usage: ./start-daily-agent.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$SCRIPT_DIR"

echo "Starting Daily Satsang Agent Worker (guruji-daily)..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "Error: PM2 is not installed"
  echo "Please install PM2: npm install -g pm2"
  exit 1
fi

# Check if the ecosystem config file exists
if [ ! -f "$AGENT_DIR/ecosystem.guruji-daily.config.cjs" ]; then
  echo "Error: ecosystem.guruji-daily.config.cjs not found in $AGENT_DIR"
  exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "$AGENT_DIR/logs"

# Stop existing guruji-daily agent if running
echo "Stopping existing guruji-daily agent (if running)..."
pm2 stop guruji-daily 2>/dev/null || true
pm2 delete guruji-daily 2>/dev/null || true

# Start the agent with PM2 using the daily satsang config
echo "Starting guruji-daily agent worker..."
cd "$AGENT_DIR"
pm2 start ecosystem.guruji-daily.config.cjs

# Save PM2 process list
pm2 save

echo ""
echo "✅ Daily Satsang Agent Worker (guruji-daily) started successfully!"
echo ""
echo "To view logs: pm2 logs guruji-daily"
echo "To stop: pm2 stop guruji-daily"
echo "To restart: pm2 restart guruji-daily"
echo "To view status: pm2 status"
echo ""
echo "The agent is configured with:"
echo "  - Agent Name: guruji-daily"
echo "  - This agent will only join rooms requesting 'guruji-daily' agent"
echo ""


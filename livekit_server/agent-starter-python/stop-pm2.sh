#!/bin/bash

# Script to stop Satsang LiveKit Agent from PM2
# Usage: ./stop-pm2.sh

set -e

echo "Stopping Satsang LiveKit Agent..."

# Stop the agent
pm2 stop satsang-livekit-agent || echo "Agent not running or already stopped"

# Save PM2 process list
pm2 save

echo "Agent stopped successfully!"


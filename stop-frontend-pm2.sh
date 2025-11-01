#!/bin/bash

# Script to stop Satsang Frontend from PM2
# Usage: ./stop-frontend-pm2.sh

set -e

echo "Stopping Satsang Frontend..."

# Stop the frontend
pm2 stop satsang-frontend || echo "Frontend not running or already stopped"

# Save PM2 process list
pm2 save

echo "Frontend stopped successfully!"


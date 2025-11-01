#!/bin/bash

# Script to start Satsang Frontend with PM2
# Usage: ./start-frontend-pm2.sh

set -e

# Get the directory where this script is located (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Update ecosystem config with actual path if it contains placeholder
if grep -q "/path/to" "$PROJECT_ROOT/ecosystem.config.cjs" 2>/dev/null; then
  sed -i.bak "s|/path/to/satsang|$PROJECT_ROOT|g" "$PROJECT_ROOT/ecosystem.config.cjs"
  rm -f "$PROJECT_ROOT/ecosystem.config.cjs.bak"
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Check if .env.local exists
if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
  echo "Warning: .env.local not found in $PROJECT_ROOT"
  echo "Please ensure your LiveKit credentials are configured."
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is not installed or not in PATH"
  echo ""
  echo "To install pnpm, run one of the following:"
  echo "  1. Run: npm install -g pnpm"
  echo "  2. Or: curl -fsSL https://get.pnpm.io/install.sh | sh"
  echo "  3. Then restart your terminal or run: source ~/.bashrc"
  exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "Error: PM2 is not installed"
  echo "Please install PM2: npm install -g pm2"
  exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo "Installing dependencies..."
  cd "$PROJECT_ROOT"
  pnpm install
fi

# Check if .next build exists, if not build the project
if [ ! -d "$PROJECT_ROOT/.next" ]; then
  echo "Building Next.js application..."
  cd "$PROJECT_ROOT"
  pnpm build
  echo "Build completed!"
fi

# Start the frontend with PM2
echo "Starting Satsang Frontend with PM2..."
cd "$PROJECT_ROOT"
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

echo ""
echo "Frontend started successfully!"
echo "Application should be available at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs: pm2 logs satsang-frontend"
echo "  Stop: pm2 stop satsang-frontend"
echo "  Restart: pm2 restart satsang-frontend"
echo "  View status: pm2 status"


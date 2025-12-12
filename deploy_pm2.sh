#!/bin/bash
set -e

echo "==================================="
echo "Satsang App - PM2 Deployment"
echo "==================================="

cd /home/prakash/satsang

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Install frontend dependencies
echo "Installing frontend dependencies..."
pnpm install

# Build frontend
echo "Building frontend..."
pnpm build

# Install auth-server dependencies
echo "Installing auth-server dependencies..."
cd auth-server
npm install
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd astrology_backend/backend
npm install
cd ../..

# Install Python dependencies for agents
echo "Installing Python agent dependencies..."
cd livekit_server/agent-starter-python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
deactivate
cd ../..

# Start services with PM2
echo "Starting services with PM2..."
pm2 stop all || true
pm2 delete all || true

# Start frontend
pm2 start ecosystem.monolith.config.cjs

# Save PM2 state
pm2 save

echo "==================================="
echo "Deployment Complete!"
echo "==================================="
echo "Check status: pm2 status"
echo "Check logs: pm2 logs"

#!/bin/bash
set -e

echo "Installing system dependencies..."

# Install Python 3, pip, venv
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv ffmpeg

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm and PM2 globally
sudo npm install -g pnpm@9.15.9 pm2

echo "System setup complete!"
echo "Now run: bash /home/prakash/deploy_pm2.sh"

#!/bin/bash
set -e

echo "==================================="
echo "Satsang App - Complete VM Setup"
echo "==================================="

# Install required packages
echo "Installing required packages..."
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Clone repository if not exists
if [ ! -d "/home/prakash/satsang" ]; then
    echo "Cloning repository..."
    git clone https://github.com/praiitt/satsang.git /home/prakash/satsang
else
    echo "Repository exists, pulling latest..."
    cd /home/prakash/satsang
    git pull origin main
fi

cd /home/prakash/satsang

# Build Docker image
echo "Building Docker image..."
sudo docker build -f Dockerfile.monolith -t satsang-monolith:latest .

# Stop existing container if running
echo "Stopping existing container..."
sudo docker stop satsang-monolith 2>/dev/null || true
sudo docker rm satsang-monolith 2>/dev/null || true

# Run new container
echo "Starting new container..."
sudo docker run -d \
  --name satsang-monolith \
  -p 80:3000 \
  -p 4000:4000 \
  -p 3003:3003 \
  --restart unless-stopped \
  satsang-monolith:latest

echo "==================================="
echo "Setup and Deployment complete!"
echo "==================================="
echo "Check logs with: sudo docker logs -f satsang-monolith"
echo ""
echo "Note: You need to set up environment variables!"
echo "Run: sudo docker stop satsang-monolith"
echo "Then add --env-file flag with your .env file"

#!/bin/bash
set -e

echo "==================================="
echo "Satsang App - VM Deployment Script"
echo "==================================="

# Navigate to project directory
cd /home/prakash/satsang || { echo "Project directory not found!"; exit 1; }

# Pull latest code
echo "Pulling latest code from GitHub..."
git pull origin main

# Build Docker image
echo "Building Docker image..."
docker build -f Dockerfile.monolith -t satsang-monolith:latest .

# Stop existing container if running
echo "Stopping existing container..."
docker stop satsang-monolith || true
docker rm satsang-monolith || true

# Run new container
echo "Starting new container..."
docker run -d \
  --name satsang-monolith \
  -p 80:3000 \
  -p 4000:4000 \
  -p 3003:3003 \
  --env-file /home/prakash/satsang/.env.local \
  --restart unless-stopped \
  satsang-monolith:latest

echo "==================================="
echo "Deployment complete!"
echo "==================================="
echo "Check logs with: docker logs -f satsang-monolith"

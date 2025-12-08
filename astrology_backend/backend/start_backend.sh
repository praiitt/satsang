#!/bin/bash

# Backend Startup Script for Ubuntu Server
# Starts the backend server on port 3003

set -e  # Exit on error

echo "🚀 Starting Rraasi Backend Server on port 3003..."
echo "=================================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    echo ""
fi

# Set port to 3003
export PORT=3003
export NODE_ENV=production

echo "🔧 Configuration:"
echo "   Port: $PORT"
echo "   Environment: $NODE_ENV"
echo "   Directory: $(pwd)"
echo ""

# Start the server
echo "🖥️  Starting backend server..."
echo "📊 Server will be available at: http://localhost:$PORT"
echo "🔗 Health check: http://localhost:$PORT/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Use nodemon for development or node for production
if command -v nodemon &> /dev/null && [ "$NODE_ENV" != "production" ]; then
    npm run dev
else
    npm start
fi

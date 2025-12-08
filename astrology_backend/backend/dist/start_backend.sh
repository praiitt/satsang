#!/bin/bash

# Rraasi Backend Startup Script

echo "🚀 Starting Rraasi Backend Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file from template"
        echo "⚠️  Please edit .env file with your configuration before starting the server"
        echo "   - Add your OpenAI API key"
        echo "   - Configure other settings as needed"
        exit 1
    else
        echo "❌ env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if required environment variables are set
if ! grep -q "OPENAI_API_KEY" .env || grep -q "your_openai_api_key_here" .env; then
    echo "⚠️  Please set your OpenAI API key in the .env file"
    echo "   OPENAI_API_KEY=your_actual_api_key_here"
    exit 1
fi

echo "🔧 Environment configuration:"
echo "   - Port: ${PORT:-3000}"
echo "   - Environment: ${NODE_ENV:-development}"
echo "   - OpenAI Model: ${OPENAI_MODEL:-gpt-4-turbo-preview}"

# Start the server
echo "🌐 Starting server on http://localhost:${PORT:-3000}"
echo "📊 Health check: http://localhost:${PORT:-3000}/health"
echo "📝 Logs will be written to logs/ directory"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev 
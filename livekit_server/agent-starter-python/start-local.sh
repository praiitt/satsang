#!/bin/bash

# Start the LiveKit agent locally using Python venv

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install \"livekit-agents[silero,turn-detector]~=1.2\" \"livekit-plugins-noise-cancellation~=0.2\" \"python-dotenv\" \"torch>=2.0.0\""
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. The agent may not work without proper configuration."
fi

# Download model files if needed (non-blocking check)
echo "📦 Checking for required model files..."
python src/agent.py download-files 2>&1 | grep -q "Finished downloading" || true

# Start the agent in dev mode
echo "🚀 Starting LiveKit agent in dev mode..."
echo "   Press Ctrl+C to stop"
echo ""

python src/agent.py dev


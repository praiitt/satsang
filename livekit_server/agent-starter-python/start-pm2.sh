#!/bin/bash

# Script to start Satsang LiveKit Agent with PM2
# Usage: ./start-pm2.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$SCRIPT_DIR"

# Update ecosystem config with actual path if it contains placeholder
if grep -q "/path/to/satsangapp" "$AGENT_DIR/ecosystem.config.cjs" 2>/dev/null; then
  sed -i.bak "s|/path/to/satsangapp/livekit_server/agent-starter-python|$AGENT_DIR|g" "$AGENT_DIR/ecosystem.config.cjs"
  rm -f "$AGENT_DIR/ecosystem.config.cjs.bak"
fi

# Create logs directory if it doesn't exist
mkdir -p "$AGENT_DIR/logs"

# Check if .env.local exists
if [ ! -f "$AGENT_DIR/.env.local" ]; then
  echo "Warning: .env.local not found in $AGENT_DIR"
  echo "Please ensure your LiveKit credentials are configured."
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
  echo "Error: uv is not installed or not in PATH"
  echo ""
  echo "To install uv, run one of the following:"
  echo "  1. Run the setup script: ./install-dependencies.sh"
  echo "  2. Install manually: curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo "  3. Then add to PATH: export PATH=\"\$HOME/.cargo/bin:\$PATH\""
  echo "  4. Or add to ~/.bashrc: echo 'export PATH=\"\$HOME/.cargo/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
  echo ""
  echo "After installing, you may need to:"
  echo "  - Restart your terminal session, or"
  echo "  - Run: source ~/.bashrc"
  exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "Error: PM2 is not installed"
  echo "Please install PM2: npm install -g pm2"
  exit 1
fi

# Fix PyTorch installation (CPU-only if CUDA not available)
echo "Checking PyTorch installation..."
cd "$AGENT_DIR"
if [ -f "fix-pytorch.sh" ]; then
  chmod +x fix-pytorch.sh
  ./fix-pytorch.sh
else
  echo "Warning: fix-pytorch.sh not found, skipping PyTorch fix"
fi

# Verify all dependencies and test model loading
echo "Verifying dependencies and model loading..."
cd "$AGENT_DIR"

# Run diagnostic script to check everything
if [ -f "check-dependencies.py" ]; then
  if ! uv run python check-dependencies.py; then
    echo "ERROR: Dependency check failed!"
    echo "Attempting to fix by syncing dependencies..."
    uv sync --locked
    echo "Re-running dependency check..."
    if ! uv run python check-dependencies.py; then
      echo "ERROR: Dependencies still missing after sync. Please check the errors above."
      exit 1
    fi
  fi
else
  # Fallback to simple PyTorch check if diagnostic script doesn't exist
  echo "Running basic PyTorch check..."
  if ! uv run python -c "import torch; print(f'PyTorch {torch.__version__} is installed')" 2>/dev/null; then
    echo "ERROR: PyTorch is not installed!"
    echo "Installing dependencies (this will install PyTorch)..."
    uv sync --locked
    echo "Dependencies installed. Verifying PyTorch again..."
    if ! uv run python -c "import torch; print(f'PyTorch {torch.__version__} is installed')" 2>/dev/null; then
      echo "ERROR: PyTorch installation failed. Please check the error messages above."
      exit 1
    fi
  else
    echo "PyTorch is installed ✓"
  fi
fi

# Download required model files if not already downloaded
# Check if models directory exists or if download is needed
echo "Checking for required model files..."
cd "$AGENT_DIR"

# Try to run download-files to ensure models are present
# This will download Silero VAD and turn-detector models
if ! uv run python src/agent.py download-files 2>&1 | grep -q "already downloaded\|downloaded\|Downloaded"; then
  echo "Downloading required model files (this may take a few minutes)..."
  uv run python src/agent.py download-files
  echo "Model files downloaded successfully!"
else
  echo "Model files check completed."
fi

# Start the agent with PM2
echo "Starting Satsang LiveKit Agent with PM2..."
cd "$AGENT_DIR"
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

echo "Agent started successfully!"
echo "To view logs: pm2 logs satsang-livekit-agent"
echo "To stop: pm2 stop satsang-livekit-agent"
echo "To restart: pm2 restart satsang-livekit-agent"
echo "To view status: pm2 status"


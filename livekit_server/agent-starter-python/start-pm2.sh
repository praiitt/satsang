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

# Check if running with sudo (not recommended)
if [ "$EUID" -eq 0 ]; then
  echo "Warning: This script is being run with sudo/root privileges."
  echo "This is not recommended as uv is installed in your user directory."
  echo ""
  echo "Please run this script WITHOUT sudo:"
  echo "  ./start-pm2.sh"
  echo ""
  echo "If you continue, the script will try to find uv, but it may fail."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if uv is installed - check multiple locations
UV_FOUND=false
REAL_HOME=$(eval echo ~${SUDO_USER:-$USER})

if command -v uv &> /dev/null; then
  UV_FOUND=true
elif [ -f "$REAL_HOME/.local/bin/uv" ]; then
  export PATH="$REAL_HOME/.local/bin:$PATH"
  UV_FOUND=true
elif [ -f "$REAL_HOME/.cargo/bin/uv" ]; then
  export PATH="$REAL_HOME/.cargo/bin:$PATH"
  UV_FOUND=true
fi

if [ "$UV_FOUND" = false ]; then
  echo "Error: uv is not installed or not in PATH"
  echo ""
  echo "Searched locations:"
  echo "  - PATH"
  echo "  - $REAL_HOME/.local/bin/uv"
  echo "  - $REAL_HOME/.cargo/bin/uv"
  echo ""
  echo "To install uv, run one of the following:"
  echo "  1. Run the setup script: ./install-dependencies.sh"
  echo "  2. Install manually: curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo "  3. Then add to PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "NOTE: Do NOT run this script with sudo!"
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
  # Try to make executable, but don't fail if permissions are an issue
  chmod +x fix-pytorch.sh 2>/dev/null || {
    echo "Warning: Could not set execute permission on fix-pytorch.sh"
    echo "You may need to run: chmod +x fix-pytorch.sh (as your user, not sudo)"
  }
  # Try to fix ownership if it's root-owned
  if [ -O "fix-pytorch.sh" ] || [ -w "fix-pytorch.sh" ]; then
    ./fix-pytorch.sh
  else
    echo "Warning: fix-pytorch.sh is not writable. Attempting to fix permissions..."
    # Try to fix ownership (only works if script is run by owner or with proper perms)
    if command -v sudo &> /dev/null; then
      sudo chown "$(whoami):$(whoami)" fix-pytorch.sh 2>/dev/null && chmod +x fix-pytorch.sh && ./fix-pytorch.sh || {
        echo "Error: Cannot fix permissions. Please run manually:"
        echo "  sudo chown $(whoami):$(whoami) fix-pytorch.sh"
        echo "  chmod +x fix-pytorch.sh"
        echo "  ./fix-pytorch.sh"
        echo "Skipping PyTorch fix for now..."
      }
    else
      echo "Error: Cannot fix permissions. Please fix manually and run ./fix-pytorch.sh"
    fi
  fi
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


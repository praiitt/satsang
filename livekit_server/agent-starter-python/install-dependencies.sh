#!/bin/bash

# Script to install prerequisites for Satsang LiveKit Agent
# Usage: ./install-dependencies.sh

set -e

echo "Installing prerequisites for Satsang LiveKit Agent..."

# Check if running on Ubuntu/Debian
if ! command -v apt-get &> /dev/null; then
  echo "Warning: This script is designed for Ubuntu/Debian systems."
  echo "Please install dependencies manually."
  exit 1
fi

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install Node.js and npm if not installed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js and npm..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node.js already installed: $(node --version)"
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
else
  echo "PM2 already installed: $(pm2 --version)"
fi

# Install uv if not installed
if ! command -v uv &> /dev/null; then
  echo "Installing uv (Python package manager)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  
  # Add uv to PATH for current session
  export PATH="$HOME/.cargo/bin:$PATH"
  
  # Add uv to PATH permanently
  if ! grep -q "\.cargo/bin" ~/.bashrc; then
    echo '' >> ~/.bashrc
    echo '# Add uv to PATH' >> ~/.bashrc
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
    echo "Added uv to PATH in ~/.bashrc"
  fi
  
  # Source bashrc to make uv available in current session
  source ~/.bashrc 2>/dev/null || true
  
  # Verify installation
  if command -v uv &> /dev/null; then
    echo "uv installed successfully: $(uv --version)"
  else
    echo "Warning: uv installation completed but not found in PATH."
    echo "Please run: source ~/.bashrc"
    echo "Or restart your terminal session."
  fi
else
  echo "uv already installed: $(uv --version)"
fi

# Install Python if not installed
if ! command -v python3 &> /dev/null; then
  echo "Installing Python 3..."
  sudo apt-get install -y python3 python3-pip
else
  echo "Python already installed: $(python3 --version)"
fi

echo ""
echo "Prerequisites installation completed!"
echo ""
echo "To use uv in the current session, run:"
echo "  source ~/.bashrc"
echo ""
echo "Or restart your terminal session."
echo ""
echo "Next steps:"
echo "1. Make sure .env.local exists with your LiveKit credentials"
echo "2. Run: ./start-pm2.sh"


#!/bin/bash
# CPU-only installation script for LiveKit agents
# Avoids CUDA downloads and /tmp space issues

set -e

echo "🚀 Installing LiveKit agents with CPU-only PyTorch..."

# Step 1: Install CPU-only PyTorch (small download ~200MB instead of 2GB+)
echo ""
echo "📦 Step 1: Installing CPU-only PyTorch..."
pip install torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install the rest of dependencies
echo ""
echo "📦 Step 2: Installing LiveKit agents and plugins..."
pip install -r requirements.txt --no-cache-dir

echo ""
echo "✅ Installation complete!"
echo ""
echo "🔍 Verify PyTorch is CPU-only:"
python3 -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}')"

echo ""
echo "✅ Done! You can now run the agents."

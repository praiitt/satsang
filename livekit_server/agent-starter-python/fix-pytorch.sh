#!/bin/bash

# Script to fix PyTorch installation by installing CPU-only version
# This prevents hanging during import when CUDA is not available

set -e

echo "Checking PyTorch installation..."

# Find uv - check common locations and PATH
# Get the actual home directory (works even with sudo)
REAL_HOME=$(eval echo ~${SUDO_USER:-$USER})
UV_CMD=""

if command -v uv &> /dev/null; then
    UV_CMD="uv"
elif [ -f "$REAL_HOME/.local/bin/uv" ]; then
    UV_CMD="$REAL_HOME/.local/bin/uv"
elif [ -f "$REAL_HOME/.cargo/bin/uv" ]; then
    UV_CMD="$REAL_HOME/.cargo/bin/uv"
elif [ -f "/home/$USER/.local/bin/uv" ]; then
    UV_CMD="/home/$USER/.local/bin/uv"
elif [ -f "/home/$USER/.cargo/bin/uv" ]; then
    UV_CMD="/home/$USER/.cargo/bin/uv"
else
    echo "Error: uv is not installed or not found in common locations"
    echo "Searched:"
    echo "  - PATH"
    echo "  - $REAL_HOME/.local/bin/uv"
    echo "  - $REAL_HOME/.cargo/bin/uv"
    echo ""
    echo "Please:"
    echo "  1. Run this script WITHOUT sudo: ./fix-pytorch.sh"
    echo "  2. Or ensure uv is in your PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
    exit 1
fi

echo "Using uv from: $UV_CMD"

# Check current PyTorch version
if $UV_CMD run python -c "import torch; print(torch.__version__)" 2>/dev/null | grep -q "cu"; then
    echo "Detected CUDA-enabled PyTorch but CUDA is not available."
    echo "Installing CPU-only PyTorch..."
    
    # Uninstall current PyTorch
    $UV_CMD pip uninstall torch torchvision torchaudio -y || true
    
    # Install CPU-only PyTorch from PyPI
    $UV_CMD pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    
    echo "CPU-only PyTorch installed successfully!"
    
    # Verify
    if $UV_CMD run python -c "import torch; print(f'PyTorch {torch.__version__} (CPU-only) installed')"; then
        echo "✓ Verification successful!"
    else
        echo "✗ Verification failed"
        exit 1
    fi
else
    echo "PyTorch appears to be CPU-only already."
    # Verify it works
    if $UV_CMD run python -c "import torch; print(f'PyTorch {torch.__version__} installed and working')"; then
        echo "✓ PyTorch is working correctly!"
    else
        echo "⚠ Warning: PyTorch import test failed"
    fi
fi


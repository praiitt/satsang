#!/bin/bash

# Script to fix PyTorch installation by installing CPU-only version
# This prevents hanging during import when CUDA is not available

set -e

echo "Checking PyTorch installation..."

# Find uv - check common locations and PATH
UV_CMD=""
if command -v uv &> /dev/null; then
    UV_CMD="uv"
elif [ -f "$HOME/.cargo/bin/uv" ]; then
    UV_CMD="$HOME/.cargo/bin/uv"
elif [ -f "$HOME/.local/bin/uv" ]; then
    UV_CMD="$HOME/.local/bin/uv"
else
    echo "Error: uv is not installed or not in PATH"
    echo "Please install uv or ensure it's in your PATH"
    echo "You can run this script without sudo, or source ~/.bashrc first"
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


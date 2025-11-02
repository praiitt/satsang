#!/bin/bash

# Script to fix PyTorch installation by installing CPU-only version
# This prevents hanging during import when CUDA is not available

set -e

echo "Checking PyTorch installation..."

# Check if we're using uv
if command -v uv &> /dev/null; then
    # Check current PyTorch version
    if uv run python -c "import torch; print(torch.__version__)" 2>/dev/null | grep -q "cu"; then
        echo "Detected CUDA-enabled PyTorch but CUDA is not available."
        echo "Installing CPU-only PyTorch..."
        
        # Uninstall current PyTorch
        uv pip uninstall torch torchvision torchaudio -y || true
        
        # Install CPU-only PyTorch from PyPI
        uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
        
        echo "CPU-only PyTorch installed successfully!"
        
        # Verify
        if uv run python -c "import torch; print(f'PyTorch {torch.__version__} (CPU-only) installed')"; then
            echo "✓ Verification successful!"
        else
            echo "✗ Verification failed"
            exit 1
        fi
    else
        echo "PyTorch appears to be CPU-only already."
    fi
else
    echo "Error: uv is not installed"
    exit 1
fi


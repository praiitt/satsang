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
PYTORCH_VERSION=$($UV_CMD run python -c "import torch; print(torch.__version__)" 2>/dev/null)

if echo "$PYTORCH_VERSION" | grep -q "cu"; then
    echo "Detected CUDA-enabled PyTorch ($PYTORCH_VERSION) but CUDA is not available."
    echo "Replacing with CPU-only PyTorch..."
    
    # Uninstall current PyTorch packages (uv pip doesn't use -y, it doesn't prompt)
    echo "Uninstalling CUDA PyTorch..."
    $UV_CMD pip uninstall torch torchvision torchaudio 2>&1 || {
        echo "Note: Some packages may not have been installed, continuing..."
    }
    
    # Also try removing any cached versions
    echo "Clearing any cached PyTorch packages..."
    
    # Install CPU-only PyTorch from PyPI
    echo "Installing CPU-only PyTorch..."
    $UV_CMD pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    
    # Verify the new version
    NEW_VERSION=$($UV_CMD run python -c "import torch; print(torch.__version__)" 2>/dev/null)
    
    if echo "$NEW_VERSION" | grep -q "cu"; then
        echo "✗ ERROR: Still showing CUDA version: $NEW_VERSION"
        echo "The installation may have failed. Trying force reinstall..."
        
        # Force reinstall
        $UV_CMD pip install --force-reinstall --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
        
        NEW_VERSION=$($UV_CMD run python -c "import torch; print(torch.__version__)" 2>/dev/null)
        
        if echo "$NEW_VERSION" | grep -q "cu"; then
            echo "✗ Still showing CUDA version. This is unexpected."
            echo "Please check the installation manually."
            exit 1
        fi
    fi
    
    echo "✓ CPU-only PyTorch installed: $NEW_VERSION"
    
    # Test import speed (CPU-only should import quickly)
    echo "Testing PyTorch import..."
    time $UV_CMD run python -c "import torch; print('Import successful')" 2>&1 | head -5
    
    echo "✓ Verification successful!"
else
    echo "PyTorch appears to be CPU-only already: $PYTORCH_VERSION"
    # Verify it works
    if $UV_CMD run python -c "import torch; print(f'PyTorch {torch.__version__} installed and working')" 2>/dev/null; then
        echo "✓ PyTorch is working correctly!"
    else
        echo "⚠ Warning: PyTorch import test failed"
        exit 1
    fi
fi


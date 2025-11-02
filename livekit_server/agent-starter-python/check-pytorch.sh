#!/bin/bash

# Quick script to check PyTorch version
# Usage: ./check-pytorch.sh

REAL_HOME=$(eval echo ~${SUDO_USER:-$USER})
UV_CMD=""

if command -v uv &> /dev/null; then
    UV_CMD="uv"
elif [ -f "$REAL_HOME/.local/bin/uv" ]; then
    UV_CMD="$REAL_HOME/.local/bin/uv"
    export PATH="$REAL_HOME/.local/bin:$PATH"
elif [ -f "$REAL_HOME/.cargo/bin/uv" ]; then
    UV_CMD="$REAL_HOME/.cargo/bin/uv"
    export PATH="$REAL_HOME/.cargo/bin:$PATH"
fi

if [ -z "$UV_CMD" ]; then
    echo "Error: uv not found"
    exit 1
fi

echo "Checking PyTorch installation..."
echo "Using uv: $UV_CMD"
echo ""

# Check PyTorch version
PYTORCH_VERSION=$($UV_CMD run python -c "import torch; print(torch.__version__)" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "PyTorch version: $PYTORCH_VERSION"
    
    if echo "$PYTORCH_VERSION" | grep -q "cu"; then
        echo "⚠ WARNING: CUDA-enabled PyTorch detected!"
        echo "CUDA is not available on this server, which causes hanging."
        echo ""
        echo "To fix, run:"
        echo "  ./fix-pytorch.sh"
        echo "Or manually:"
        echo "  $UV_CMD pip uninstall torch torchvision torchaudio -y"
        echo "  $UV_CMD pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu"
        exit 1
    else
        echo "✓ CPU-only PyTorch detected (correct)"
        
        # Test import speed
        echo "Testing PyTorch import speed..."
        time $UV_CMD run python -c "import torch" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✓ PyTorch imports successfully"
            exit 0
        else
            echo "✗ PyTorch import failed!"
            exit 1
        fi
    fi
else
    echo "✗ Failed to import PyTorch"
    exit 1
fi


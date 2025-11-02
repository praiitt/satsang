#!/bin/bash

# Comprehensive diagnostic script for Ubuntu server
# This will check all potential issues causing the timeout

set -e

echo "=========================================="
echo "Ubuntu Server Diagnostic Script"
echo "=========================================="
echo ""

# Find uv
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
    echo "❌ ERROR: uv not found"
    exit 1
fi

echo "✓ Using uv: $UV_CMD"
echo ""

# 1. Check PyTorch
echo "1. Checking PyTorch installation..."
PYTORCH_VERSION=$($UV_CMD run python -c "import torch; print(torch.__version__)" 2>/dev/null || echo "NOT_INSTALLED")

if [ "$PYTORCH_VERSION" = "NOT_INSTALLED" ]; then
    echo "❌ PyTorch is not installed!"
    echo "   Run: uv sync --locked"
    exit 1
fi

echo "   PyTorch version: $PYTORCH_VERSION"

if echo "$PYTORCH_VERSION" | grep -q "cu"; then
    echo "❌ ERROR: CUDA-enabled PyTorch detected!"
    echo "   This will cause timeout errors on servers without CUDA."
    echo ""
    echo "   FIX: Run ./fix-pytorch.sh"
    echo ""
    PYTORCH_FIXED=false
else
    echo "✓ CPU-only PyTorch detected"
    PYTORCH_FIXED=true
fi
echo ""

# 2. Test PyTorch import speed
echo "2. Testing PyTorch import speed..."
echo "   (CPU-only should import quickly, CUDA will hang)"
timeout 10 $UV_CMD run python -c "import torch; print('Import successful')" 2>&1
PYTORCH_IMPORT_RESULT=$?

if [ $PYTORCH_IMPORT_RESULT -eq 124 ]; then
    echo "❌ ERROR: PyTorch import timed out (took >10 seconds)"
    echo "   This indicates CUDA PyTorch is installed but CUDA is not available."
    echo "   FIX: Run ./fix-pytorch.sh"
    PYTORCH_FIXED=false
elif [ $PYTORCH_IMPORT_RESULT -eq 0 ]; then
    echo "✓ PyTorch imports successfully and quickly"
    PYTORCH_FIXED=true
else
    echo "❌ ERROR: PyTorch import failed"
    PYTORCH_FIXED=false
fi
echo ""

# 3. Check transformers (required by multilingual turn detector)
echo "3. Checking transformers library..."
if $UV_CMD run python -c "import transformers; print(transformers.__version__)" 2>/dev/null; then
    echo "✓ Transformers is installed"
else
    echo "❌ Transformers is not installed"
    echo "   This is required for the multilingual turn detector"
    echo "   Run: uv sync --locked"
    exit 1
fi
echo ""

# 4. Test transformers import with PyTorch
echo "4. Testing transformers + PyTorch integration..."
timeout 15 $UV_CMD run python -c "import torch; import transformers; print('✓ Both import successfully')" 2>&1
TRANSFORMERS_TEST=$?

if [ $TRANSFORMERS_TEST -eq 124 ]; then
    echo "❌ ERROR: Transformers import with PyTorch timed out"
    echo "   This confirms PyTorch CUDA issue"
    echo "   FIX: Run ./fix-pytorch.sh"
    PYTORCH_FIXED=false
elif [ $TRANSFORMERS_TEST -eq 0 ]; then
    echo "✓ Transformers and PyTorch work together"
    PYTORCH_FIXED=true
else
    echo "❌ ERROR: Import test failed"
    PYTORCH_FIXED=false
fi
echo ""

# 5. Check if models are downloaded
echo "5. Checking downloaded models..."
if [ -d "$HOME/.cache/livekit" ] || [ -d "$HOME/.cache/huggingface" ]; then
    echo "✓ Model cache directories exist"
    MODEL_COUNT=$(find "$HOME/.cache" -name "*.bin" -o -name "*.safetensors" 2>/dev/null | wc -l)
    echo "   Found $MODEL_COUNT model files in cache"
else
    echo "⚠ No model cache found (will download on first run)"
fi
echo ""

# 6. Test Silero VAD loading
echo "6. Testing Silero VAD model loading..."
timeout 30 $UV_CMD run python -c "
from livekit.plugins import silero
vad = silero.VAD.load()
print('✓ Silero VAD loaded successfully')
" 2>&1
VAD_TEST=$?

if [ $VAD_TEST -eq 124 ]; then
    echo "❌ ERROR: VAD model loading timed out"
    echo "   This is likely due to PyTorch CUDA issue"
elif [ $VAD_TEST -eq 0 ]; then
    echo "✓ Silero VAD loads successfully"
else
    echo "⚠ VAD loading test failed (error code: $VAD_TEST)"
fi
echo ""

# 7. Summary
echo "=========================================="
echo "DIAGNOSIS SUMMARY"
echo "=========================================="

if [ "$PYTORCH_FIXED" = false ]; then
    echo ""
    echo "❌ CRITICAL ISSUE FOUND: PyTorch needs to be fixed"
    echo ""
    echo "To fix, run these commands:"
    echo "  cd $(pwd)"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo "  ./fix-pytorch.sh"
    echo ""
    echo "Then verify with:"
    echo "  ./check-pytorch.sh"
    echo ""
    echo "After fixing, restart the agent:"
    echo "  ./start-pm2.sh"
    echo ""
    exit 1
else
    echo ""
    echo "✓ All critical checks passed!"
    echo ""
    echo "If you're still seeing timeout errors:"
    echo "  1. Make sure models are downloaded: uv run python src/agent.py download-files"
    echo "  2. Check system resources: free -h && df -h"
    echo "  3. Check agent logs: pm2 logs satsang-livekit-agent"
    echo ""
    exit 0
fi


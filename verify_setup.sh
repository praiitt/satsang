#!/bin/bash

################################################################################
# Quick System Verification Script
# Run this after setup to verify all components are installed correctly
################################################################################

echo "======================================"
echo "Satsang App - System Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1: $(command -v $1)"
        if [ ! -z "$2" ]; then
            echo "  Version: $($1 $2 2>&1 | head -n 1)"
        fi
    else
        echo -e "${RED}✗${NC} $1: NOT FOUND"
        return 1
    fi
    echo ""
}

check_python_package() {
    if python3 -c "import $1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Python package '$1' is installed"
        if [ ! -z "$2" ]; then
            version=$(python3 -c "import $1; print($1.$2)" 2>/dev/null)
            echo "  Version: $version"
        fi
    else
        echo -e "${RED}✗${NC} Python package '$1' is NOT installed"
        return 1
    fi
    echo ""
}

echo "=== Core Tools ==="
check_command "python3" "--version"
check_command "node" "--version"
check_command "npm" "--version"
check_command "pnpm" "--version"
check_command "git" "--version"

echo "=== Build Tools ==="
check_command "gcc" "--version"
check_command "make" "--version"

echo "=== System Libraries ==="
check_command "ffmpeg" "-version"
check_command "sqlite3" "--version"

echo "=== Optional Tools ==="
check_command "docker" "--version"
check_command "gcloud" "--version"

echo "=== Python Virtual Environment ==="
VENV_PATH="$HOME/venv/satsangapp"
if [ -d "$VENV_PATH" ]; then
    echo -e "${GREEN}✓${NC} Virtual environment exists at: $VENV_PATH"
    echo ""
else
    echo -e "${RED}✗${NC} Virtual environment NOT found at: $VENV_PATH"
    echo ""
fi

echo "=== Python Packages (if venv is activated) ==="
if [ ! -z "$VIRTUAL_ENV" ]; then
    echo "Virtual environment is activated: $VIRTUAL_ENV"
    echo ""
    check_python_package "livekit" "__version__"
    check_python_package "torch" "__version__"
    check_python_package "firebase_admin"
    check_python_package "openai" "__version__"
    check_python_package "pinecone"
else
    echo -e "${YELLOW}!${NC} Virtual environment is NOT activated"
    echo "  Run: source ~/venv/satsangapp/bin/activate"
    echo ""
fi

echo "=== Network Ports ==="
echo "Checking if common ports are available..."
for port in 3001 7880 7881; do
    if ! sudo lsof -i :$port &> /dev/null; then
        echo -e "${GREEN}✓${NC} Port $port is available"
    else
        echo -e "${YELLOW}!${NC} Port $port is in use"
    fi
done
echo ""

echo "=== Disk Space ==="
df -h / | tail -n 1 | awk '{print "Root partition: " $2 " total, " $3 " used, " $4 " available (" $5 " used)"}'
echo ""

echo "=== Memory ==="
free -h | grep Mem | awk '{print "Total: " $2 ", Used: " $3 ", Available: " $7}'
echo ""

echo "======================================"
echo "Verification Complete!"
echo "======================================"

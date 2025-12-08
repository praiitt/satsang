#!/bin/bash

################################################################################
# Post-Setup Configuration Script
# Run this after the main setup to configure project-specific settings
################################################################################

set -e

echo "======================================"
echo "Satsang App - Post-Setup Configuration"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Get project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR"

echo "Project directory: $PROJECT_DIR"
echo ""

################################################################################
# 1. Setup Environment Variables
################################################################################
echo "Step 1: Setting up environment variables..."

if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env.local"
        print_status ".env.local created from .env.example"
    else
        # Create a template .env.local
        cat > "$PROJECT_DIR/.env.local" << 'EOF'
# LiveKit Configuration
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# OpenAI
OPENAI_API_KEY=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=

# Sarvam AI
SARVAM_API_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=

# Additional API Keys
# Add other API keys as needed
EOF
        print_status ".env.local template created"
    fi
    
    print_warning "Please edit .env.local and add your API keys and credentials"
    echo "  Run: nano $PROJECT_DIR/.env.local"
else
    print_status ".env.local already exists"
fi
echo ""

################################################################################
# 2. Install Frontend Dependencies
################################################################################
echo "Step 2: Installing frontend dependencies..."

if [ -f "$PROJECT_DIR/package.json" ]; then
    cd "$PROJECT_DIR"
    
    if command -v pnpm &> /dev/null; then
        echo "Installing with pnpm..."
        pnpm install
        print_status "Frontend dependencies installed"
    else
        print_error "pnpm not found. Please install pnpm first."
        exit 1
    fi
else
    print_warning "package.json not found, skipping frontend dependencies"
fi
echo ""

################################################################################
# 3. Install Backend Dependencies
################################################################################
echo "Step 3: Installing backend dependencies..."

VENV_DIR="$HOME/venv/satsangapp"
AGENT_DIR="$PROJECT_DIR/livekit_server/agent-starter-python"

if [ -d "$AGENT_DIR" ]; then
    # Check if virtual environment exists
    if [ ! -d "$VENV_DIR" ]; then
        print_warning "Virtual environment not found at $VENV_DIR"
        read -p "Create it now? (y/n): " create_venv
        if [[ $create_venv =~ ^[Yy]$ ]]; then
            python3 -m venv "$VENV_DIR"
            print_status "Virtual environment created"
        else
            print_error "Cannot proceed without virtual environment"
            exit 1
        fi
    fi
    
    # Activate virtual environment and install dependencies
    source "$VENV_DIR/bin/activate"
    
    cd "$AGENT_DIR"
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install the package
    echo "Installing Python agent package..."
    pip install -e .
    
    # Install dev dependencies
    echo "Installing dev dependencies..."
    pip install pytest pytest-asyncio ruff black isort
    
    print_status "Backend dependencies installed"
    
    deactivate
else
    print_warning "Agent directory not found at $AGENT_DIR"
fi
echo ""

################################################################################
# 4. Setup Git Hooks (Optional)
################################################################################
echo "Step 4: Setting up Git hooks..."

if [ -d "$PROJECT_DIR/.git" ]; then
    read -p "Setup pre-commit hooks for code formatting? (y/n): " setup_hooks
    if [[ $setup_hooks =~ ^[Yy]$ ]]; then
        # Create pre-commit hook
        cat > "$PROJECT_DIR/.git/hooks/pre-commit" << 'HOOK_EOF'
#!/bin/bash
# Pre-commit hook for code formatting

echo "Running pre-commit checks..."

# Check if there are any staged JS/TS files
STAGED_JS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$' || true)

if [ -n "$STAGED_JS_FILES" ]; then
    echo "Running prettier on staged files..."
    pnpm exec prettier --write $STAGED_JS_FILES
    git add $STAGED_JS_FILES
fi

# Check if there are any staged Python files
STAGED_PY_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.py$' || true)

if [ -n "$STAGED_PY_FILES" ]; then
    echo "Running ruff on staged Python files..."
    source ~/venv/satsangapp/bin/activate
    ruff format $STAGED_PY_FILES
    git add $STAGED_PY_FILES
    deactivate
fi

echo "Pre-commit checks completed!"
HOOK_EOF
        
        chmod +x "$PROJECT_DIR/.git/hooks/pre-commit"
        print_status "Pre-commit hook installed"
    fi
else
    print_warning "Not a git repository, skipping hook setup"
fi
echo ""

################################################################################
# 5. Create Utility Scripts
################################################################################
echo "Step 5: Creating utility scripts..."

# Start development script
cat > "$PROJECT_DIR/dev.sh" << 'EOF'
#!/bin/bash
# Start both frontend and backend in development mode

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Satsang App in development mode..."
echo ""

# Start frontend
echo "Starting frontend on port 3001..."
pnpm dev &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

# Start backend
echo "Starting LiveKit agent..."
source ~/venv/satsangapp/bin/activate
cd livekit_server/agent-starter-python
python agent.py dev &
AGENT_PID=$!

echo ""
echo "======================================"
echo "Development servers started!"
echo "Frontend: http://localhost:3001"
echo "Press Ctrl+C to stop all servers"
echo "======================================"

# Wait for both processes
wait
EOF

chmod +x "$PROJECT_DIR/dev.sh"
print_status "Created dev.sh - run './dev.sh' to start both servers"

# Build script
cat > "$PROJECT_DIR/build.sh" << 'EOF'
#!/bin/bash
# Build the application for production

echo "Building Satsang App for production..."
echo ""

# Build frontend
echo "Building frontend..."
pnpm build

echo ""
echo "======================================"
echo "Build complete!"
echo "Run 'pnpm start' to test production build"
echo "======================================"
EOF

chmod +x "$PROJECT_DIR/build.sh"
print_status "Created build.sh"

# Test script
cat > "$PROJECT_DIR/test.sh" << 'EOF'
#!/bin/bash
# Run tests

echo "Running tests..."
echo ""

# Frontend tests (if configured)
if grep -q "\"test\":" package.json; then
    echo "Running frontend tests..."
    pnpm test
fi

# Backend tests
if [ -d "livekit_server/agent-starter-python" ]; then
    echo "Running backend tests..."
    source ~/venv/satsangapp/bin/activate
    cd livekit_server/agent-starter-python
    pytest
    deactivate
fi

echo ""
echo "Tests complete!"
EOF

chmod +x "$PROJECT_DIR/test.sh"
print_status "Created test.sh"

echo ""

################################################################################
# 6. Setup System Service (Optional)
################################################################################
echo "Step 6: System service setup..."

read -p "Do you want to create systemd services for auto-start? (y/n): " create_service
if [[ $create_service =~ ^[Yy]$ ]]; then
    # Frontend service
    sudo tee /etc/systemd/system/satsangapp-frontend.service > /dev/null << EOF
[Unit]
Description=Satsang App Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/pnpm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

    # Backend service
    sudo tee /etc/systemd/system/satsangapp-agent.service > /dev/null << EOF
[Unit]
Description=Satsang App LiveKit Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$AGENT_DIR
Environment="PATH=$VENV_DIR/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=$VENV_DIR/bin/python agent.py start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    
    print_status "Systemd services created"
    echo "  To enable: sudo systemctl enable satsangapp-frontend satsangapp-agent"
    echo "  To start: sudo systemctl start satsangapp-frontend satsangapp-agent"
    echo "  To check status: sudo systemctl status satsangapp-frontend"
fi
echo ""

################################################################################
# 7. Performance Tuning
################################################################################
echo "Step 7: Performance tuning..."

# Check available memory
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')

if [ $TOTAL_MEM -lt 4096 ]; then
    print_warning "Low memory detected ($TOTAL_MEM MB). Recommending swap setup..."
    
    read -p "Create 4GB swap file? (y/n): " create_swap
    if [[ $create_swap =~ ^[Yy]$ ]]; then
        if [ ! -f /swapfile ]; then
            sudo fallocate -l 4G /swapfile
            sudo chmod 600 /swapfile
            sudo mkswap /swapfile
            sudo swapon /swapfile
            echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
            print_status "Swap file created and enabled"
        else
            print_warning "Swap file already exists"
        fi
    fi
fi
echo ""

################################################################################
# Summary
################################################################################
echo ""
echo "======================================"
echo "Post-Setup Configuration Complete! 🎉"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   nano .env.local"
echo ""
echo "2. Start development servers:"
echo "   ./dev.sh"
echo ""
echo "   Or start them separately:"
echo "   Terminal 1: pnpm dev"
echo "   Terminal 2: source ~/venv/satsangapp/bin/activate && cd livekit_server/agent-starter-python && python agent.py dev"
echo ""
echo "3. Access the application:"
echo "   http://localhost:3001"
echo ""
echo "Available utility scripts:"
echo "  ./dev.sh    - Start development servers"
echo "  ./build.sh  - Build for production"
echo "  ./test.sh   - Run tests"
echo ""
echo "======================================"

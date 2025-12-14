#!/bin/bash
set -e  # Exit on any error

echo "=================================================="
echo "🚀 Satsang App - Fresh VM Deployment Script"
echo "   Ubuntu 22.04 LTS"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/praiitt/satsang.git"
INSTALL_DIR="/home/$USER/satsang"
NODE_VERSION="20"
PYTHON_VERSION="3.10"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running on Ubuntu 22.04
print_status "Checking OS version..."
if ! grep -q "Ubuntu 22.04" /etc/os-release 2>/dev/null; then
    print_warning "This script is designed for Ubuntu 22.04. Proceeding anyway..."
fi

# Update system
print_status "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install essential build tools
print_status "Installing essential build tools..."
sudo apt-get install -y -qq \
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https

# Install Node.js 20.x
print_status "Installing Node.js ${NODE_VERSION}.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi
print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Install pnpm globally
print_status "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm@9.15.9
fi
print_status "pnpm version: $(pnpm --version)"

# Install PM2 globally
print_status "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2@latest
fi
print_status "PM2 version: $(pm2 --version)"

# Setup PM2 startup script
print_status "Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER | grep "sudo" | bash || true

# Install Python 3.10 and pip
print_status "Installing Python ${PYTHON_VERSION}..."
sudo apt-get install -y -qq \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-dev \
    python${PYTHON_VERSION}-venv \
    python3-pip

# Set Python 3.10 as default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION} 1
sudo update-alternatives --install /usr/bin/python python /usr/bin/python${PYTHON_VERSION} 1

print_status "Python version: $(python --version)"
print_status "pip version: $(pip3 --version)"

# Install Nginx
print_status "Installing Nginx..."
sudo apt-get install -y -qq nginx
sudo systemctl enable nginx
print_status "Nginx installed and enabled"

# Install Docker (optional, for future use)
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi
print_status "Docker version: $(docker --version)"

# Clone repository
print_status "Cloning repository..."
if [ -d "$INSTALL_DIR" ]; then
    print_warning "Directory $INSTALL_DIR already exists. Pulling latest changes..."
    cd $INSTALL_DIR
    git pull
else
    git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

print_status "Repository cloned to $INSTALL_DIR"

# Install frontend dependencies
print_status "Installing frontend dependencies..."
pnpm install --frozen-lockfile

# Build frontend
print_status "Building frontend..."
pnpm run build

# Install auth-server dependencies
print_status "Installing auth-server dependencies..."
cd auth-server
npm ci --omit=dev
npm run build
cd ..

# Install astrology-backend dependencies
print_status "Installing astrology-backend dependencies..."
cd astrology_backend/backend
npm ci --omit=dev
cd ../..

# Setup Python agents virtual environment
print_status "Setting up Python agents environment..."
cd livekit_server/agent-starter-python

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Deactivate venv
deactivate
cd ../..

# Setup environment files
print_status "Setting up environment files..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Please create it with your API keys."
    cat > .env.local << 'EOF'
# LiveKit Configuration
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key_here

# Cartesia Configuration (TTS)
CARTESIA_API_KEY=your_cartesia_key_here

# YouTube Configuration
YOUTUBE_API_KEY=your_youtube_key_here

# Sarvam AI Configuration (Hindi/Tamil TTS)
SARVAM_API_KEY=your_sarvam_key_here

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=/home/$USER/satsang/satsangServiceAccount.json
EOF
    print_warning "Please edit .env.local with your actual API keys"
fi

# Copy environment files
print_status "Copying environment files..."
cp .env.local auth-server/.env 2>/dev/null || print_warning "auth-server/.env already exists"
cp .env.local livekit_server/agent-starter-python/.env.local 2>/dev/null || print_warning "agent .env.local already exists"

# Setup Nginx configuration
print_status "Setting up Nginx..."
if [ -f "nginx/satsang-ssl.conf" ]; then
    sudo cp nginx/satsang-ssl.conf /etc/nginx/sites-available/satsang
    sudo ln -sf /etc/nginx/sites-available/satsang /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_status "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors"
    fi
else
    print_warning "Nginx configuration file not found. Skipping Nginx setup."
fi

# Start services with PM2
print_status "Starting services with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.monolith.config.cjs
pm2 save

# Display service status
print_status "PM2 Services Status:"
pm2 status

# Display system information
echo ""
echo "=================================================="
print_status "Deployment Complete! 🎉"
echo "=================================================="
echo ""
echo "📊 System Information:"
echo "   Node.js: $(node --version)"
echo "   pnpm: $(pnpm --version)"
echo "   PM2: $(pm2 --version)"
echo "   Python: $(python --version)"
echo "   Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
echo ""
echo "📁 Installation Directory: $INSTALL_DIR"
echo ""
echo "🔥 PM2 Services:"
pm2 list
echo ""
echo "📝 Next Steps:"
echo "   1. Edit .env.local with your actual API keys"
echo "   2. Copy SSL certificates to nginx/ssl/ (if using HTTPS)"
echo "   3. Update Firebase credentials (satsangServiceAccount.json)"
echo "   4. Restart services: pm2 restart all"
echo "   5. Check logs: pm2 logs"
echo ""
echo "🌐 Access your app:"
echo "   Frontend: http://$(curl -s ifconfig.me):3000"
echo "   With Nginx: http://$(curl -s ifconfig.me)"
echo ""
print_status "Happy deploying! 🚀"

#!/bin/bash
set -e  # Exit on any error

echo "=================================================="
echo "🚀 Satsang App - Fresh VM Deployment Script"
echo "   Ubuntu 22.04 LTS - Production Ready"
echo "   Version: 2.0"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/praiitt/satsang.git"
INSTALL_DIR="/home/$USER/satsang"
NODE_VERSION="20"
PYTHON_VERSION="3.10"
LOG_FILE="/tmp/satsang_deploy_$(date +%Y%m%d_%H%M%S).log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    print_error "$1"
    print_error "Deployment failed. Check log: $LOG_FILE"
    exit 1
}

# Check if script is run with sudo
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root/sudo"
    print_info "The script will ask for sudo password when needed"
    exit 1
fi

print_info "Starting deployment at $(date)"
print_info "Log file: $LOG_FILE"

# System Prerequisites Check
print_status "Checking system prerequisites..."

# Check OS version
if ! grep -q "Ubuntu 22.04" /etc/os-release 2>/dev/null; then
    print_warning "This script is optimized for Ubuntu 22.04"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check internet connectivity
if ! curl -s --head https://google.com > /dev/null; then
    print_warning "Google connectivity check failed. Check DNS/Firewall."
    # Try another one
    if ! curl -s --head https://github.com > /dev/null; then
        error_exit "No internet connection detected (checked google and github)"
    fi
fi
print_status "Internet connection: OK"

# Check available disk space (minimum 10GB)
AVAILABLE_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 10 ]; then
    error_exit "Insufficient disk space. Need at least 10GB, have ${AVAILABLE_SPACE}GB"
fi
print_status "Disk space: ${AVAILABLE_SPACE}GB available"

# Check RAM (minimum 3GB)
TOTAL_RAM=$(free -g | awk 'NR==2 {print $2}')
if [ "$TOTAL_RAM" -lt 3 ]; then
    print_warning "Low RAM detected (${TOTAL_RAM}GB). Recommended: 8GB+"
fi
print_status "RAM: ${TOTAL_RAM}GB"

# Update system
print_status "Updating system packages..."
sudo apt-get update -qq >> "$LOG_FILE" 2>&1 || error_exit "Failed to update packages"
sudo apt-get upgrade -y -qq >> "$LOG_FILE" 2>&1 || print_warning "Some packages could not be upgraded"

# Install essential build tools
print_status "Installing essential build tools..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    build-essential \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    unzip \
    vim \
    htop \
    net-tools \
    ufw \
    fail2ban >> "$LOG_FILE" 2>&1 || error_exit "Failed to install build tools"

# Configure firewall
print_status "Configuring firewall (UFW)..."
sudo ufw --force enable >> "$LOG_FILE" 2>&1
sudo ufw default deny incoming >> "$LOG_FILE" 2>&1
sudo ufw default allow outgoing >> "$LOG_FILE" 2>&1
sudo ufw allow ssh >> "$LOG_FILE" 2>&1
sudo ufw allow 80/tcp >> "$LOG_FILE" 2>&1
sudo ufw allow 443/tcp >> "$LOG_FILE" 2>&1
sudo ufw allow 3000/tcp >> "$LOG_FILE" 2>&1  # Frontend
sudo ufw allow 4000/tcp >> "$LOG_FILE" 2>&1  # Auth server
sudo ufw allow 3003/tcp >> "$LOG_FILE" 2>&1  # Backend
print_status "Firewall configured and enabled"

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban >> "$LOG_FILE" 2>&1
sudo systemctl start fail2ban >> "$LOG_FILE" 2>&1
print_status "fail2ban enabled"

# Optimize system settings
print_status "Optimizing system settings..."
# Increase file descriptors
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf >> "$LOG_FILE"
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf >> "$LOG_FILE"

# Optimize network settings
sudo sysctl -w net.core.somaxconn=16384 >> "$LOG_FILE" 2>&1
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=8192 >> "$LOG_FILE" 2>&1

# Install Node.js 20.x
print_status "Installing Node.js ${NODE_VERSION}.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - >> "$LOG_FILE" 2>&1
    sudo apt-get install -y nodejs >> "$LOG_FILE" 2>&1 || error_exit "Failed to install Node.js"
fi
NODE_VER=$(node --version)
print_status "Node.js installed: $NODE_VER"

# Install pnpm globally
print_status "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm@9.15.9 >> "$LOG_FILE" 2>&1 || error_exit "Failed to install pnpm"
fi
PNPM_VER=$(pnpm --version)
print_status "pnpm installed: v$PNPM_VER"

# Install PM2 globally
print_status "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2@latest >> "$LOG_FILE" 2>&1 || error_exit "Failed to install PM2"
fi
PM2_VER=$(pm2 --version)
print_status "PM2 installed: v$PM2_VER"

# Setup PM2 startup script
print_status "Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER 2>&1 | grep "sudo" | bash >> "$LOG_FILE" 2>&1 || true
print_status "PM2 startup configured"

# Install Python 3.10 and pip
print_status "Installing Python ${PYTHON_VERSION}..."
sudo apt-get install -y -qq \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-dev \
    python${PYTHON_VERSION}-venv \
    python3-pip \
    libffi-dev \
    libssl-dev >> "$LOG_FILE" 2>&1 || error_exit "Failed to install Python"

# Set Python 3.10 as default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION} 1 >> "$LOG_FILE" 2>&1
sudo update-alternatives --install /usr/bin/python python /usr/bin/python${PYTHON_VERSION} 1 >> "$LOG_FILE" 2>&1

PYTHON_VER=$(python --version)
print_status "Python installed: $PYTHON_VER"

# Upgrade pip
print_status "Upgrading pip..."
python -m pip install --upgrade pip >> "$LOG_FILE" 2>&1

# Install Nginx
print_status "Installing Nginx..."
sudo apt-get install -y nginx >> "$LOG_FILE" 2>&1 || error_exit "Failed to install Nginx"
sudo systemctl enable nginx >> "$LOG_FILE" 2>&1
sudo systemctl start nginx >> "$LOG_FILE" 2>&1
print_status "Nginx installed and started"

# Skip Docker installation (using PM2 only)
print_info "Skipping Docker installation (using PM2 for process management)"

# Clone or update repository
print_status "Setting up repository..."
# We are using manual upload, so assume we are already in the right place or unzip
if [ -f "deploy_bundle.zip" ]; then
    print_status "Found deploy_bundle.zip, extracting..."
    unzip -o deploy_bundle.zip -d $INSTALL_DIR >> "$LOG_FILE" 2>&1 || error_exit "Failed to unzip bundle"
    print_status "Extracted to $INSTALL_DIR"
else
    if [ ! -d "$INSTALL_DIR" ]; then
         print_warning "No bundle found and directory missing. Trying git clone as fallback..."
         git clone $REPO_URL $INSTALL_DIR >> "$LOG_FILE" 2>&1 || error_exit "Failed to clone repository"
    fi
fi

cd $INSTALL_DIR
print_status "Working in $INSTALL_DIR"

# Install frontend dependencies
print_status "Installing frontend dependencies (this may take a while)..."
pnpm install --frozen-lockfile >> "$LOG_FILE" 2>&1 || error_exit "Failed to install frontend dependencies"

# Build frontend
print_status "Building frontend..."
pnpm run build >> "$LOG_FILE" 2>&1 || error_exit "Failed to build frontend"

# Install auth-server dependencies
print_status "Installing auth-server dependencies..."
cd auth-server
npm install >> "$LOG_FILE" 2>&1 || error_exit "Failed to install auth-server dependencies"
npm run build >> "$LOG_FILE" 2>&1 || error_exit "Failed to build auth-server"
npm prune --production >> "$LOG_FILE" 2>&1  # Remove dev dependencies after build
cd ..

# Install astrology-backend dependencies
print_status "Installing astrology-backend dependencies..."
cd astrology_backend/backend
npm install --production >> "$LOG_FILE" 2>&1 || error_exit "Failed to install backend dependencies"
cd ../..

# Setup Python agents virtual environment
print_status "Setting up Python agents environment..."
cd livekit_server/agent-starter-python

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv >> "$LOG_FILE" 2>&1 || error_exit "Failed to create Python venv"
fi

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip >> "$LOG_FILE" 2>&1
pip install -r requirements.txt >> "$LOG_FILE" 2>&1 || error_exit "Failed to install Python dependencies"
deactivate
cd ../..

print_status "All dependencies installed successfully"

# Setup environment files
print_status "Setting up environment files..."

# Create .env.local template if it doesn't exist
if [ ! -f ".env.local" ]; then
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

# STT Model (options: deepgram, sarvam)
STT_MODEL=deepgram

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=/home/$USER/satsang/satsangServiceAccount.json

# Node Environment
NODE_ENV=production
EOF
    print_warning "Created .env.local template - Please update with your actual API keys!"
else
    print_status ".env.local already exists"
fi

# Copy environment files
cp .env.local auth-server/.env 2>/dev/null || print_warning "auth-server/.env exists"
cp .env.local livekit_server/agent-starter-python/.env.local 2>/dev/null || print_warning "agent .env.local exists"

# Setup Nginx configuration
print_status "Setting up Nginx..."
if [ -f "nginx/satsang-ssl.conf" ] || [ -f "nginx/satsang.conf" ]; then
    NGINX_CONF=$([ -f "nginx/satsang-ssl.conf" ] && echo "nginx/satsang-ssl.conf" || echo "nginx/satsang.conf")
    sudo cp "$NGINX_CONF" /etc/nginx/sites-available/satsang
    sudo ln -sf /etc/nginx/sites-available/satsang /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if sudo nginx -t >> "$LOG_FILE" 2>&1; then
        print_status "Nginx configuration is valid"
        sudo systemctl reload nginx >> "$LOG_FILE" 2>&1
    else
        print_error "Nginx configuration has errors - check $LOG_FILE"
    fi
else
    print_warning "Nginx configuration files not found. Using default nginx config."
fi

# Start services with PM2
print_status "Starting services with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.monolith.config.cjs >> "$LOG_FILE" 2>&1 || error_exit "Failed to start PM2 services"
pm2 save >> "$LOG_FILE" 2>&1

# Wait for services to initialize
print_status "Waiting for services to initialize..."
sleep 10

# Display final status
echo ""
echo "=================================================="
print_status "🎉 Deployment Complete!"
echo "=================================================="
echo ""
echo "📊 System Information:"
echo "   Node.js: $NODE_VER"
echo "   pnpm: v$PNPM_VER"
echo "   PM2: v$PM2_VER"
echo "   Python: $PYTHON_VER"
echo "   RAM: ${TOTAL_RAM}GB"
echo "   Disk: ${AVAILABLE_SPACE}GB available"
echo ""
echo "📁 Installation: $INSTALL_DIR"
echo "📝 Log File: $LOG_FILE"
echo ""

# PM2 Service Status
print_status "PM2 Services Status:"
pm2 status

echo ""
echo "🔥 Service Health Check:"
sleep 5

# Check if services are running
FRONTEND_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="frontend") | .pm2_env.status' 2>/dev/null || echo "unknown")
AUTH_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="auth-server") | .pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$FRONTEND_STATUS" = "online" ]; then
    print_status "Frontend: Running"
else
    print_warning "Frontend: $FRONTEND_STATUS"
fi

if [ "$AUTH_STATUS" = "online" ]; then
    print_status "Auth Server: Running"
else
    print_warning "Auth Server: $AUTH_STATUS"
fi

echo ""
echo "📝 Next Steps:"
echo "   1. Edit .env.local with your API keys:"
echo "      cd $INSTALL_DIR && nano .env.local"
echo ""
echo "   2. Add Firebase credentials:"
echo "      scp satsangServiceAccount.json user@server:$INSTALL_DIR/"
echo ""
echo "   3. Add SSL certificates (if using HTTPS):"
echo "      sudo cp certificate.crt /etc/ssl/certs/rraasi.crt"
echo "      sudo cp private.key /etc/ssl/private/rraasi.key"
echo ""
echo "   4. Restart services after configuration:"
echo "      pm2 restart all && pm2 save"
echo ""
echo "   5. View logs:"
echo "      pm2 logs"
echo ""
echo "🌐 Access your app:"
if command -v curl &> /dev/null; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")
    echo "   Frontend: http://$PUBLIC_IP:3000"
    echo "   With Nginx: http://$PUBLIC_IP"
else
    echo "   Frontend: http://your-server-ip:3000"
    echo "   With Nginx: http://your-server-ip"
fi
echo ""
echo "🔒 Security Notes:"
echo "   - Firewall (UFW) is enabled"
echo "   - fail2ban is running"
echo "   - SSH is protected"
echo "   - Update .env files with real API keys"
echo "   - Consider setting up SSL certificates"
echo ""
print_status "Deployment completed successfully at $(date)"
print_info "Full deployment log saved to: $LOG_FILE"

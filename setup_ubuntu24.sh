#!/bin/bash

################################################################################
# Ubuntu 24 Setup Script for Satsang App
# This script installs all dependencies needed for the project on a blank Ubuntu 24 VM
################################################################################

set -e  # Exit on error

echo "=================================="
echo "Satsang App - Ubuntu 24 Setup"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root/sudo"
    exit 1
fi

################################################################################
# 1. System Update
################################################################################
echo ""
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated"

################################################################################
# 2. Install Essential Build Tools and Dependencies
################################################################################
echo ""
echo "Step 2: Installing essential build tools..."
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    vim \
    nano \
    unzip \
    zip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    libssl-dev \
    libffi-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    llvm \
    libncurses5-dev \
    libncursesw5-dev \
    xz-utils \
    tk-dev \
    liblzma-dev \
    python3-openssl \
    zlib1g-dev

print_status "Build tools installed"

################################################################################
# 3. Install Python 3.11
################################################################################
echo ""
echo "Step 3: Installing Python 3.11..."

# Add deadsnakes PPA for Python 3.11
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update

# Install Python 3.11 and related packages
sudo apt install -y \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip

# Set Python 3.11 as default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --set python3 /usr/bin/python3.11

# Upgrade pip
python3 -m pip install --upgrade pip

print_status "Python 3.11 installed and set as default"
python3 --version

################################################################################
# 4. Install Node.js 20 LTS (via NodeSource)
################################################################################
echo ""
echo "Step 4: Installing Node.js 20 LTS..."

# Install Node.js 20.x from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

print_status "Node.js installed"
node --version
npm --version

################################################################################
# 5. Install pnpm
################################################################################
echo ""
echo "Step 5: Installing pnpm 9.15.9..."

# Install pnpm globally using npm
sudo npm install -g pnpm@9.15.9

print_status "pnpm installed"
pnpm --version

################################################################################
# 6. Install Additional Development Tools
################################################################################
echo ""
echo "Step 6: Installing additional development tools..."

# Install git-lfs for large file storage
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash
sudo apt install -y git-lfs
git lfs install

# Install jq (JSON processor)
sudo apt install -y jq

# Install htop for system monitoring
sudo apt install -y htop

print_status "Additional tools installed"

################################################################################
# 7. Install Docker (Optional but recommended)
################################################################################
echo ""
read -p "Do you want to install Docker? (y/n): " install_docker
if [[ $install_docker =~ ^[Yy]$ ]]; then
    echo "Installing Docker..."
    
    # Remove old versions
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_status "Docker installed (you may need to log out and back in for group changes to take effect)"
    docker --version
else
    print_warning "Skipping Docker installation"
fi

################################################################################
# 8. Install Python Virtual Environment and Dependencies
################################################################################
echo ""
echo "Step 7: Setting up Python virtual environment..."

# Create a virtual environment directory
VENV_DIR="$HOME/venv/satsangapp"
mkdir -p $(dirname $VENV_DIR)
python3 -m venv $VENV_DIR

print_status "Python virtual environment created at: $VENV_DIR"
print_warning "To activate it, run: source $VENV_DIR/bin/activate"

################################################################################
# 9. Install System Libraries for Audio/Video Processing
################################################################################
echo ""
echo "Step 8: Installing audio/video processing libraries..."

sudo apt install -y \
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    portaudio19-dev \
    libasound2-dev \
    libsndfile1-dev

print_status "Audio/video libraries installed"

################################################################################
# 10. Install SQLite (for local database if needed)
################################################################################
echo ""
echo "Step 9: Installing SQLite..."
sudo apt install -y sqlite3 libsqlite3-dev
print_status "SQLite installed"
sqlite3 --version

################################################################################
# 11. Setup Firewall (Optional)
################################################################################
echo ""
read -p "Do you want to configure UFW firewall? (y/n): " setup_firewall
if [[ $setup_firewall =~ ^[Yy]$ ]]; then
    echo "Configuring UFW firewall..."
    
    sudo apt install -y ufw
    
    # Enable UFW
    sudo ufw --force enable
    
    # Allow SSH
    sudo ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow Node.js dev server (port 3001)
    sudo ufw allow 3001/tcp
    
    # Allow common LiveKit ports (adjust as needed)
    sudo ufw allow 7880/tcp
    sudo ufw allow 7881/tcp
    
    print_status "UFW firewall configured"
    sudo ufw status
else
    print_warning "Skipping firewall configuration"
fi

################################################################################
# 12. Install Google Cloud SDK (for Firebase/GCP services)
################################################################################
echo ""
read -p "Do you want to install Google Cloud SDK? (y/n): " install_gcloud
if [[ $install_gcloud =~ ^[Yy]$ ]]; then
    echo "Installing Google Cloud SDK..."
    
    # Add the Cloud SDK distribution URI as a package source
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    
    # Import the Google Cloud public key
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    
    # Update and install the Cloud SDK
    sudo apt update && sudo apt install -y google-cloud-cli
    
    print_status "Google Cloud SDK installed"
    gcloud --version
else
    print_warning "Skipping Google Cloud SDK installation"
fi

################################################################################
# 13. Setup Git Configuration
################################################################################
echo ""
read -p "Do you want to configure Git? (y/n): " setup_git
if [[ $setup_git =~ ^[Yy]$ ]]; then
    read -p "Enter your Git username: " git_username
    read -p "Enter your Git email: " git_email
    
    git config --global user.name "$git_username"
    git config --global user.email "$git_email"
    git config --global init.defaultBranch main
    
    print_status "Git configured"
else
    print_warning "Skipping Git configuration"
fi

################################################################################
# 14. Install Project Dependencies
################################################################################
echo ""
read -p "Do you want to install project dependencies now? (y/n): " install_deps
if [[ $install_deps =~ ^[Yy]$ ]]; then
    read -p "Enter the path to your project directory: " project_dir
    
    if [ -d "$project_dir" ]; then
        cd "$project_dir"
        
        # Install frontend dependencies
        if [ -f "package.json" ]; then
            echo "Installing frontend dependencies with pnpm..."
            pnpm install
            print_status "Frontend dependencies installed"
        fi
        
        # Install Python dependencies
        if [ -d "livekit_server/agent-starter-python" ]; then
            echo "Installing Python agent dependencies..."
            
            # Activate virtual environment
            source $VENV_DIR/bin/activate
            
            cd livekit_server/agent-starter-python
            
            # Install the package in editable mode
            pip install -e .
            
            # Install dev dependencies
            pip install pytest pytest-asyncio ruff
            
            print_status "Python dependencies installed"
            
            deactivate
        fi
    else
        print_error "Project directory not found: $project_dir"
    fi
else
    print_warning "Skipping project dependencies installation"
fi

################################################################################
# 15. Create Helper Scripts
################################################################################
echo ""
echo "Step 10: Creating helper scripts..."

# Create activation script
cat > ~/activate_satsangapp.sh << 'EOF'
#!/bin/bash
# Activate Satsang App virtual environment
source ~/venv/satsangapp/bin/activate
echo "Satsang App virtual environment activated"
echo "Python: $(which python3)"
echo "Version: $(python3 --version)"
EOF

chmod +x ~/activate_satsangapp.sh

print_status "Helper script created: ~/activate_satsangapp.sh"

################################################################################
# Summary
################################################################################
echo ""
echo "=================================="
echo "Setup Complete! 🎉"
echo "=================================="
echo ""
echo "Installed versions:"
echo "  - Python: $(python3 --version)"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - pnpm: $(pnpm --version)"
echo "  - Git: $(git --version)"
echo ""
echo "Virtual Environment: $VENV_DIR"
echo ""
echo "Next steps:"
echo "  1. Activate the Python virtual environment:"
echo "     source ~/activate_satsangapp.sh"
echo ""
echo "  2. Clone your project (if not already done):"
echo "     git clone <your-repo-url>"
echo ""
echo "  3. Set up environment variables:"
echo "     - Copy .env.example to .env.local"
echo "     - Add your API keys and credentials"
echo ""
echo "  4. Install project dependencies:"
echo "     - Frontend: pnpm install"
echo "     - Backend: cd livekit_server/agent-starter-python && pip install -e ."
echo ""
echo "  5. Run the development servers:"
echo "     - Frontend: pnpm dev"
echo "     - Backend: python agent.py dev"
echo ""
print_warning "Note: If you installed Docker, please log out and log back in for group changes to take effect"
echo ""
echo "=================================="

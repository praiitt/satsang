# Ubuntu 24 Setup Guide for Satsang App

This guide will help you set up a blank Ubuntu 24 VM with all the necessary dependencies for the Satsang App project.

## Quick Start

### 1. Download and Run the Setup Script

```bash
# Download the setup script (if you haven't cloned the repo yet)
wget https://raw.githubusercontent.com/<your-org>/<your-repo>/main/setup_ubuntu24.sh

# Or if you've already cloned the repo
cd /path/to/satsangapp

# Make the script executable
chmod +x setup_ubuntu24.sh

# Run the setup script
./setup_ubuntu24.sh
```

### 2. What the Script Installs

The script will install and configure:

#### Core Development Tools
- **Python 3.11** - Required for the LiveKit agent backend
- **Node.js 20 LTS** - For the Next.js frontend
- **pnpm 9.15.9** - Package manager for frontend dependencies
- **Git & Git LFS** - Version control
- **Build essentials** - gcc, g++, make, etc.

#### System Libraries
- **FFmpeg** - Audio/video processing
- **PortAudio** - Audio I/O library
- **SQLite** - Database support
- **OpenSSL, zlib, etc.** - Required system libraries

#### Optional Components (You'll be prompted)
- **Docker** - Container platform (recommended for deployment)
- **Google Cloud SDK** - For Firebase and GCP services
- **UFW Firewall** - Security configuration

#### Python Packages
The script sets up a virtual environment and can install:
- LiveKit Agents SDK
- PyTorch (for AI/ML features)
- Firebase Admin SDK
- OpenAI SDK
- Pinecone (vector database)
- And all other dependencies from `pyproject.toml`

#### Frontend Packages
- Next.js 15.5.2
- React 19
- LiveKit Components
- Firebase SDK
- And all other dependencies from `package.json`

## Manual Setup Steps

If you prefer to run commands manually or need to troubleshoot:

### 1. System Update

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Build Tools

```bash
sudo apt install -y build-essential curl wget git vim nano unzip \
    software-properties-common apt-transport-https ca-certificates \
    gnupg lsb-release libssl-dev libffi-dev libbz2-dev libreadline-dev \
    libsqlite3-dev llvm libncurses5-dev xz-utils tk-dev liblzma-dev
```

### 3. Install Python 3.11

```bash
# Add deadsnakes PPA
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update

# Install Python 3.11
sudo apt install -y python3.11 python3.11-dev python3.11-venv python3-pip

# Set as default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --set python3 /usr/bin/python3.11

# Upgrade pip
python3 -m pip install --upgrade pip
```

### 4. Install Node.js 20

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs
```

### 5. Install pnpm

```bash
sudo npm install -g pnpm@9.15.9
```

### 6. Install Audio/Video Libraries

```bash
sudo apt install -y ffmpeg libavcodec-extra libavformat-dev \
    libavutil-dev libswscale-dev portaudio19-dev libasound2-dev \
    libsndfile1-dev
```

### 7. Create Python Virtual Environment

```bash
python3 -m venv ~/venv/satsangapp
source ~/venv/satsangapp/bin/activate
```

### 8. Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd satsangapp

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and credentials

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd livekit_server/agent-starter-python
pip install -e .
pip install pytest pytest-asyncio ruff
```

## Running the Application

### Frontend (Next.js)

```bash
# From the root directory
pnpm dev

# The frontend will be available at http://localhost:3001
```

### Backend (LiveKit Agent)

```bash
# Activate virtual environment
source ~/venv/satsangapp/bin/activate

# Navigate to agent directory
cd livekit_server/agent-starter-python

# Run in development mode
python agent.py dev

# Or run a specific agent
python src/<agent_name>.py
```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# LiveKit Configuration
LIVEKIT_URL=<your-livekit-url>
LIVEKIT_API_KEY=<your-api-key>
LIVEKIT_API_SECRET=<your-api-secret>

# OpenAI
OPENAI_API_KEY=<your-openai-key>

# Firebase
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_PRIVATE_KEY=<your-firebase-private-key>
FIREBASE_CLIENT_EMAIL=<your-firebase-client-email>

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account-json>

# Other API Keys
SARVAM_API_KEY=<your-sarvam-api-key>
PINECONE_API_KEY=<your-pinecone-api-key>
```

## Verification

### Check Installed Versions

```bash
# Python
python3 --version  # Should show Python 3.11.x

# Node.js
node --version     # Should show v20.x.x

# pnpm
pnpm --version     # Should show 9.15.9

# Git
git --version
```

### Test Python Environment

```bash
source ~/venv/satsangapp/bin/activate
python3 -c "import livekit; print('LiveKit SDK:', livekit.__version__)"
python3 -c "import torch; print('PyTorch:', torch.__version__)"
python3 -c "import firebase_admin; print('Firebase Admin SDK installed')"
```

### Test Frontend

```bash
cd /path/to/satsangapp
pnpm build  # Should build without errors
```

## Troubleshooting

### Python Issues

If you encounter Python version issues:
```bash
# Check available Python versions
ls -la /usr/bin/python*

# Update alternatives
sudo update-alternatives --config python3
```

### Node.js Issues

If Node.js is not the correct version:
```bash
# Remove old Node.js
sudo apt remove nodejs

# Reinstall from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Permission Issues

If you encounter permission errors:
```bash
# Fix npm global directory
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Docker Permission Issues

If you can't run Docker without sudo:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker
```

## Performance Optimization

### For Better Python Performance

```bash
# Install optimized BLAS libraries for PyTorch
sudo apt install -y libblas-dev liblapack-dev

# Enable swap if you have limited RAM
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### For Better Node.js Performance

```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Security Recommendations

1. **Keep system updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure firewall**:
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 3001/tcp  # Next.js dev server
   ```

3. **Secure SSH** (if accessing remotely):
   ```bash
   # Disable password authentication
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

4. **Use environment variables** - Never commit API keys to Git

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Python Virtual Environments](https://docs.python.org/3/library/venv.html)
- [pnpm Documentation](https://pnpm.io/)

## Support

If you encounter issues:
1. Check the logs in the terminal
2. Verify all environment variables are set correctly
3. Ensure all services (LiveKit, Firebase, etc.) are properly configured
4. Check firewall rules if services can't connect

---

**Happy Coding! 🚀**

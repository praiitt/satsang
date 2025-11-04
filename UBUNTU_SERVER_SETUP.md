# Ubuntu Server Setup Guide

This guide explains how to deploy the Satsang LiveKit Agent and Frontend on your Ubuntu server.

## Prerequisites

### 1. System Requirements

- Ubuntu 20.04 or later
- Root or sudo access
- At least 2GB RAM (4GB+ recommended)
- Python 3.11 or later
- Node.js 20.x or later

### 2. Initial Server Setup

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install basic dependencies
sudo apt-get install -y git curl build-essential
```

## Agent Setup (Backend)

### Step 1: Install Dependencies

```bash
cd /home/your-username/satsang/livekit_server/agent-starter-python

# Run the automated installation script
chmod +x install-dependencies.sh
./install-dependencies.sh

# Make sure uv is in your PATH
export PATH="$HOME/.local/bin:$PATH"
# Or add to ~/.bashrc permanently:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Clone and Setup Repository

```bash
# Navigate to the agent directory
cd /home/your-username/satsang/livekit_server/agent-starter-python

# Pull latest code (or clone if fresh)
git pull origin main

# Install Python dependencies
uv sync --locked
```

### Step 3: Configure Environment

Create `.env.local` file in the agent directory:

```bash
cd /home/your-username/satsang/livekit_server/agent-starter-python
nano .env.local
```

Add your LiveKit credentials:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
TTS_VOICE_ID=your_voice_id
TTS_SPEED=slow
STT_MODEL=deepgram/nova-2
```

### Step 4: Diagnose and Fix Issues

**CRITICAL:** Before starting the agent, run diagnostics to find any issues.

```bash
cd /home/your-username/satsang/livekit_server/agent-starter-python

# Make sure uv is in PATH
export PATH="$HOME/.local/bin:$PATH"

# Run comprehensive diagnostics
chmod +x diagnose-ubuntu.sh
./diagnose-ubuntu.sh
```

This will check:

- PyTorch version (must be CPU-only, not CUDA)
- PyTorch import speed (CUDA hangs, CPU is fast)
- Transformers library (required for multilingual turn detector)
- Model cache status
- Silero VAD loading

**If diagnostics show PyTorch issues, fix it:**

```bash
# Fix PyTorch (replace CUDA with CPU-only)
./fix-pytorch.sh

# Verify it worked
./check-pytorch.sh
```

You should see: `✓ CPU-only PyTorch detected (correct)`

**Common Issue:** If you see timeout errors, PyTorch is likely still CUDA-enabled. The fix script MUST be run.

### Step 5: Download Models

```bash
cd /home/your-username/satsang/livekit_server/agent-starter-python

# Download required ML models
uv run python src/agent.py download-files
```

### Step 6: Start Agent with PM2

```bash
# Stop any existing agent
./stop-pm2.sh

# Start the agent
./start-pm2.sh
```

The start script will:

- Verify PyTorch is CPU-only
- Check dependencies
- Download models if needed
- Start the agent with PM2

### Step 7: Verify Agent is Running

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs satsang-livekit-agent --lines 50

# You should see:
# - "registered worker" (agent connected to LiveKit)
# - "PyTorch version: X.X.X+cpu" (CPU-only version)
# - No TimeoutError messages
```

## Frontend Setup

### Step 1: Install Node.js and pnpm

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm globally
sudo npm install -g pnpm

# Verify installations
node --version  # Should be v20.x or later
pnpm --version  # Should show version
```

### Step 2: Clone and Setup Repository

```bash
cd /home/your-username/satsang

# Pull latest code (or clone if fresh)
git pull origin main

# Install dependencies
pnpm install
```

### Step 3: Configure Environment

Create `.env.local` file in the project root:

```bash
cd /home/your-username/satsang/satsangapp
nano .env.local
```

Add your LiveKit credentials:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

**Note:** Use the same credentials as the agent.

### Step 4: Build Frontend

```bash
cd /home/your-username/satsang/satsangapp

# Build the Next.js application
pnpm build
```

### Step 5: Start Frontend with PM2

```bash
# Stop any existing frontend
./stop-frontend-pm2.sh

# Start the frontend
./start-frontend-pm2.sh
```

The frontend will be available at: `http://your-server-ip:3000`

### Step 6: Configure Nginx (Optional but Recommended)

If you want to use a domain name with SSL, configure Nginx:

```bash
# Install Nginx
sudo apt-get install -y nginx

# Copy the example config
sudo cp nginx/satsang.rraasi.com.conf /etc/nginx/sites-available/satsang.rraasi.com

# Edit the config file
sudo nano /etc/nginx/sites-available/satsang.rraasi.com

# Update:
# - server_name with your domain
# - proxy_pass to http://localhost:3000

# Enable the site
sudo ln -s /etc/nginx/sites-available/satsang.rraasi.com /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

For SSL certificates, see `nginx/setup-ssl.sh` or use Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Agent Timeout Errors

If you see `TimeoutError` in agent logs:

1. **Check PyTorch version:**

   ```bash
   cd /home/your-username/satsang/livekit_server/agent-starter-python
   ./check-pytorch.sh
   ```

2. **If it shows CUDA version, fix it:**

   ```bash
   ./fix-pytorch.sh
   ```

3. **Restart the agent:**
   ```bash
   ./stop-pm2.sh
   ./start-pm2.sh
   ```

### Frontend Connection Issues

1. **Check if frontend is running:**

   ```bash
   pm2 status
   pm2 logs satsang-frontend
   ```

2. **Verify environment variables:**

   ```bash
   cat .env.local
   ```

3. **Check if port 3000 is accessible:**
   ```bash
   curl http://localhost:3000
   ```

### Agent Not Connecting

1. **Check agent logs:**

   ```bash
   pm2 logs satsang-livekit-agent --lines 100
   ```

2. **Verify LiveKit credentials:**

   ```bash
   cd /home/your-username/satsang/livekit_server/agent-starter-python
   cat .env.local | grep LIVEKIT
   ```

3. **Check if agent registered:**
   Look for `"registered worker"` in logs

### PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs satsang-livekit-agent    # Agent logs
pm2 logs satsang-frontend          # Frontend logs

# Restart services
pm2 restart satsang-livekit-agent
pm2 restart satsang-frontend

# Stop services
pm2 stop satsang-livekit-agent
pm2 stop satsang-frontend

# Delete from PM2
pm2 delete satsang-livekit-agent
pm2 delete satsang-frontend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown, then:
pm2 save
```

## Deployment Checklist

- [ ] System packages updated
- [ ] uv installed and in PATH
- [ ] Node.js and pnpm installed
- [ ] PM2 installed globally
- [ ] Repository cloned/pulled
- [ ] Agent `.env.local` configured
- [ ] Frontend `.env.local` configured
- [ ] PyTorch fixed to CPU-only (verify with `check-pytorch.sh`)
- [ ] Agent models downloaded
- [ ] Agent started with PM2 and registered successfully
- [ ] Frontend built and started with PM2
- [ ] Frontend accessible at http://your-server-ip:3000
- [ ] Nginx configured (if using domain)
- [ ] SSL certificate installed (if using domain)
- [ ] PM2 configured to start on boot

## Quick Start Commands

```bash
# Agent
cd /home/your-username/satsang/livekit_server/agent-starter-python
export PATH="$HOME/.local/bin:$PATH"
./fix-pytorch.sh          # First time only
./start-pm2.sh

# Frontend
cd /home/your-username/satsang/satsangapp
./start-frontend-pm2.sh
```

## Monitoring

Check logs regularly:

```bash
pm2 logs --lines 50
```

Monitor system resources:

```bash
pm2 monit
```

Check if services are healthy:

```bash
pm2 status
# Both should show "online" status
```

## Updates

When pulling new code:

```bash
# Agent
cd /home/your-username/satsang/livekit_server/agent-starter-python
git pull
uv sync --locked          # Update dependencies if needed
./fix-pytorch.sh          # Ensure CPU-only PyTorch
pm2 restart satsang-livekit-agent

# Frontend
cd /home/your-username/satsang/satsangapp
git pull
pnpm install              # Update dependencies if needed
pnpm build                # Rebuild
pm2 restart satsang-frontend
```

# 🚀 Quick Start Guide - Ubuntu 24 VM Setup

This is your quick reference guide for setting up the Satsang App on a fresh Ubuntu 24 VM.

## 📋 Prerequisites

- **Ubuntu 24.04 LTS** - Fresh installation
- **Minimum 4GB RAM** - 8GB recommended for better performance
- **20GB free disk space** - More if you plan to store media files
- **Internet connection** - For downloading packages
- **Non-root user with sudo privileges**

## ⚡ One-Command Setup

```bash
# 1. Clone the repository (or download the setup script)
git clone <your-repo-url> satsangapp
cd satsangapp

# 2. Run the automated setup script
chmod +x setup_ubuntu24.sh
./setup_ubuntu24.sh
```

The script will:
- ✅ Update system packages
- ✅ Install Python 3.11
- ✅ Install Node.js 20 LTS
- ✅ Install pnpm 9.15.9
- ✅ Install all system dependencies
- ✅ Set up Python virtual environment
- ✅ Configure development tools
- ⚙️ Optionally install Docker, Google Cloud SDK, and configure firewall

## ✔️ Verify Installation

After setup completes, verify everything is installed:

```bash
chmod +x verify_setup.sh
./verify_setup.sh
```

## 🔑 Environment Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit with your credentials:**
   ```bash
   nano .env.local
   ```

3. **Required variables:**
   - `LIVEKIT_URL` - Your LiveKit server URL
   - `LIVEKIT_API_KEY` - LiveKit API key
   - `LIVEKIT_API_SECRET` - LiveKit API secret
   - `OPENAI_API_KEY` - OpenAI API key
   - `FIREBASE_PROJECT_ID` - Firebase project ID
   - `FIREBASE_PRIVATE_KEY` - Firebase private key
   - `FIREBASE_CLIENT_EMAIL` - Firebase service account email
   - `SARVAM_API_KEY` - Sarvam AI API key
   - `PINECONE_API_KEY` - Pinecone API key

## 📦 Install Project Dependencies

### Frontend Dependencies

```bash
# From the project root
pnpm install
```

### Backend Dependencies

```bash
# Activate Python virtual environment
source ~/venv/satsangapp/bin/activate

# Install Python agent dependencies
cd livekit_server/agent-starter-python
pip install -e .

# Install dev dependencies
pip install pytest pytest-asyncio ruff
```

## 🏃 Running the Application

### Terminal 1: Frontend

```bash
# From project root
pnpm dev
```

Access at: **http://localhost:3001**

### Terminal 2: Backend (LiveKit Agent)

```bash
# Activate virtual environment
source ~/venv/satsangapp/bin/activate

# Navigate to agent directory
cd livekit_server/agent-starter-python

# Run agent in development mode
python agent.py dev
```

## 📝 Common Commands

### Activate Python Environment

```bash
source ~/venv/satsangapp/bin/activate
# or use the helper script
source ~/activate_satsangapp.sh
```

### Check Versions

```bash
python3 --version   # Should be 3.11.x
node --version      # Should be v20.x.x
pnpm --version      # Should be 9.15.9
```

### Update Dependencies

```bash
# Frontend
pnpm update

# Backend (with venv activated)
pip install --upgrade -e .
```

### Build for Production

```bash
# Frontend
pnpm build
pnpm start

# Backend - use production LiveKit server
python agent.py start
```

## 🔧 Troubleshooting

### "Command not found" errors

```bash
# Reload shell configuration
source ~/.bashrc

# Or log out and log back in
```

### Permission errors with npm/pnpm

```bash
# Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Python package import errors

```bash
# Make sure virtual environment is activated
source ~/venv/satsangapp/bin/activate

# Reinstall dependencies
cd livekit_server/agent-starter-python
pip install -e . --force-reinstall
```

### Port already in use

```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process (replace PID)
kill -9 <PID>
```

### Docker permission denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run
newgrp docker
```

## 🔥 Firewall Configuration (if enabled)

```bash
# Allow necessary ports
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 3001/tcp   # Next.js dev
sudo ufw allow 7880/tcp   # LiveKit
sudo ufw allow 7881/tcp   # LiveKit WebRTC

# Check status
sudo ufw status
```

## 📊 System Monitoring

```bash
# Monitor system resources
htop

# Check disk space
df -h

# Check memory usage
free -h

# Check running services
sudo systemctl status
```

## 🗂️ Project Structure

```
satsangapp/
├── app/                          # Next.js app directory
├── components/                   # React components
├── livekit_server/
│   └── agent-starter-python/     # Python LiveKit agents
│       ├── src/                  # Agent source code
│       ├── pyproject.toml        # Python dependencies
│       └── agent.py              # Main agent entry point
├── public/                       # Static assets
├── styles/                       # CSS styles
├── .env.local                    # Environment variables (create this)
├── package.json                  # Frontend dependencies
├── setup_ubuntu24.sh            # Setup script
├── verify_setup.sh              # Verification script
└── UBUNTU_SETUP.md              # Detailed setup guide
```

## 🎯 Next Steps

1. ✅ Complete the setup using `setup_ubuntu24.sh`
2. ✅ Verify installation with `verify_setup.sh`
3. ✅ Configure environment variables in `.env.local`
4. ✅ Install project dependencies
5. ✅ Run frontend and backend servers
6. ✅ Test the application
7. 🚀 Deploy to production (when ready)

## 📚 Documentation

- **Detailed Setup:** See `UBUNTU_SETUP.md`
- **Project Agents:** See `livekit_server/agent-starter-python/AGENTS.md`
- **API Documentation:** Check individual agent files

## 🆘 Getting Help

If you run into issues:

1. Check the logs in your terminal
2. Run `./verify_setup.sh` to check your installation
3. Review `UBUNTU_SETUP.md` for detailed troubleshooting
4. Ensure all environment variables are set correctly
5. Verify all services (LiveKit, Firebase) are properly configured

---

**Made with ❤️ for Satsang App**

Last Updated: December 2025

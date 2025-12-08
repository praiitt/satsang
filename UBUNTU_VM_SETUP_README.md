# 🎯 Ubuntu 24 VM Setup - Complete Package

This directory contains everything you need to set up the Satsang App on a fresh Ubuntu 24 VM.

## 📦 What's Included

| File | Purpose | Size |
|------|---------|------|
| `setup_ubuntu24.sh` | Main automated setup script | 13K |
| `configure_project.sh` | Post-setup configuration | 11K |
| `verify_setup.sh` | Verification script | 3.1K |
| `QUICKSTART.md` | Quick reference guide | 6.1K |
| `UBUNTU_SETUP.md` | Detailed manual setup guide | 7.5K |

## 🚀 Three-Step Setup Process

### Step 1: Initial System Setup (10-15 minutes)

Run the main setup script on your fresh Ubuntu 24 VM:

```bash
# Make the script executable
chmod +x setup_ubuntu24.sh

# Run the setup
./setup_ubuntu24.sh
```

**This installs:**
- ✅ Python 3.11
- ✅ Node.js 20 LTS
- ✅ pnpm 9.15.9
- ✅ Git, build tools, system libraries
- ✅ FFmpeg and audio processing tools
- ⚙️ Optional: Docker, Google Cloud SDK, UFW firewall

### Step 2: Verify Installation (1-2 minutes)

Check that everything was installed correctly:

```bash
# Make verification script executable
chmod +x verify_setup.sh

# Run verification
./verify_setup.sh
```

This will check:
- Core tools (Python, Node, pnpm, Git)
- Build tools (gcc, make)
- System libraries (FFmpeg, SQLite)
- Python virtual environment
- Available ports
- Disk space and memory

### Step 3: Configure Project (5-10 minutes)

Set up environment variables and install project dependencies:

```bash
# Make configuration script executable
chmod +x configure_project.sh

# Run configuration
./configure_project.sh
```

**This handles:**
- ✅ Creates `.env.local` from template
- ✅ Installs frontend dependencies (pnpm)
- ✅ Installs backend dependencies (pip)
- ✅ Creates utility scripts (`dev.sh`, `build.sh`, `test.sh`)
- ⚙️ Optional: Git hooks, systemd services, swap file

## ⚡ Quick Commands After Setup

### Start Development Servers

```bash
# Option 1: Use the utility script (easiest)
./dev.sh

# Option 2: Manual (two terminals)
# Terminal 1 - Frontend
pnpm dev

# Terminal 2 - Backend
source ~/venv/satsangapp/bin/activate
cd livekit_server/agent-starter-python
python agent.py dev
```

### Build for Production

```bash
./build.sh
```

### Run Tests

```bash
./test.sh
```

### Activate Python Environment

```bash
source ~/venv/satsangapp/bin/activate
# or
source ~/activate_satsangapp.sh
```

## 📋 System Requirements

### Minimum Requirements
- **OS**: Ubuntu 24.04 LTS
- **RAM**: 4GB (8GB recommended)
- **Disk**: 20GB free space
- **Network**: Internet connection for package downloads

### Recommended Specifications
- **CPU**: 2+ cores
- **RAM**: 8GB+
- **Disk**: 50GB+ SSD
- **Network**: High-speed internet for faster downloads

## 🔑 Environment Variables Required

After running the setup, edit `.env.local` with your credentials:

```bash
nano .env.local
```

**Essential variables:**

```env
# LiveKit
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# OpenAI
OPENAI_API_KEY=sk-...

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com

# Sarvam AI (for Indian languages)
SARVAM_API_KEY=your_sarvam_key

# Pinecone (for vector search)
PINECONE_API_KEY=your_pinecone_key
```

## 🎯 Installation Paths

After setup, components are installed at:

```
System-wide:
├── /usr/bin/python3 → Python 3.11
├── /usr/bin/node → Node.js 20.x
├── /usr/local/bin/pnpm → pnpm 9.15.9
└── /usr/bin/git → Git

User-specific:
├── ~/venv/satsangapp/ → Python virtual environment
├── ~/activate_satsangapp.sh → Virtual env activation helper
└── <project-dir>/ → Your project files
    ├── node_modules/ → Frontend dependencies
    └── livekit_server/agent-starter-python/
```

## 📚 Documentation Guide

Depending on your needs, refer to:

| Document | Use When |
|----------|----------|
| **QUICKSTART.md** | You want a quick reference of common commands |
| **UBUNTU_SETUP.md** | You want detailed manual setup instructions |
| **This README** | You want an overview of the setup process |

## 🔧 Troubleshooting

### Setup Script Fails

```bash
# Check error messages
# Common issues:
# 1. Network connectivity
# 2. Insufficient permissions
# 3. Conflicting existing installations

# Retry with verbose output
bash -x ./setup_ubuntu24.sh
```

### Verification Fails

```bash
# If specific tools are missing, install manually:

# Python 3.11
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-dev python3.11-venv

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
sudo npm install -g pnpm@9.15.9
```

### Project Dependencies Fail

```bash
# Frontend
rm -rf node_modules .next
pnpm install

# Backend
source ~/venv/satsangapp/bin/activate
cd livekit_server/agent-starter-python
pip install --upgrade pip
pip install -e . --force-reinstall
```

### Port Conflicts

```bash
# Find process using port
sudo lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
pnpm dev -- -p 3002
```

## 🛡️ Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use strong API keys** - Rotate them regularly
3. **Enable firewall** - Say yes when prompted during setup
4. **Keep system updated** - Run `sudo apt update && sudo apt upgrade` regularly
5. **Use SSH keys** - Disable password authentication for remote access
6. **Restrict ports** - Only open necessary ports in firewall

## 🚀 Production Deployment

For production deployment:

1. **Build the application:**
   ```bash
   ./build.sh
   ```

2. **Enable systemd services** (if configured):
   ```bash
   sudo systemctl enable satsangapp-frontend satsangapp-agent
   sudo systemctl start satsangapp-frontend satsangapp-agent
   ```

3. **Setup nginx reverse proxy** (recommended):
   ```bash
   sudo apt install nginx
   # Configure nginx to proxy to port 3001
   ```

4. **Setup SSL certificate** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx
   ```

## 📊 Performance Tips

### For Limited RAM (4GB or less)

The setup script will offer to create a swap file. Accept it:
```bash
# Manually create 4GB swap:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### For PyTorch Performance

Install optimized BLAS libraries:
```bash
sudo apt install -y libblas-dev liblapack-dev
```

### For Node.js Performance

Increase memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
# Add to ~/.bashrc for persistence
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
```

## 🆘 Getting Support

If you encounter issues:

1. ✅ Run `./verify_setup.sh` to diagnose problems
2. ✅ Check logs in terminal for error messages
3. ✅ Review environment variables in `.env.local`
4. ✅ Ensure services (LiveKit, Firebase) are properly configured
5. ✅ Consult `UBUNTU_SETUP.md` for detailed troubleshooting

## 📝 Changelog

### Version 1.0 (December 2025)
- Initial release
- Ubuntu 24.04 LTS support
- Python 3.11 installation
- Node.js 20 LTS installation
- pnpm 9.15.9 support
- Automated dependency installation
- Optional Docker, GCloud SDK
- System services setup
- Verification script

## 🎓 Learning Resources

- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [Python Virtual Environments](https://docs.python.org/3/library/venv.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 📞 Quick Reference Card

```
╔════════════════════════════════════════════════════╗
║          SATSANG APP - QUICK REFERENCE             ║
╠════════════════════════════════════════════════════╣
║ Setup:      ./setup_ubuntu24.sh                    ║
║ Verify:     ./verify_setup.sh                      ║
║ Configure:  ./configure_project.sh                 ║
║                                                    ║
║ Start Dev:  ./dev.sh                               ║
║ Build:      ./build.sh                             ║
║ Test:       ./test.sh                              ║
║                                                    ║
║ Activate:   source ~/activate_satsangapp.sh        ║
║ Frontend:   http://localhost:3001                  ║
║                                                    ║
║ Versions:   Python 3.11 | Node 20 | pnpm 9.15.9   ║
╚════════════════════════════════════════════════════╝
```

---

**Happy Coding! 🚀**

*Last Updated: December 8, 2025*

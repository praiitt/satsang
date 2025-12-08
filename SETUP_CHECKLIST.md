# ✅ Ubuntu 24 VM Setup Checklist

Use this checklist to track your setup progress.

## 📦 Pre-Setup

- [ ] Ubuntu 24.04 LTS VM created
- [ ] VM has minimum 4GB RAM (8GB recommended)
- [ ] VM has 20GB+ free disk space
- [ ] VM has internet connectivity
- [ ] You have non-root user with sudo privileges
- [ ] You have cloned/downloaded the satsangapp repository

## 🚀 Step 1: Initial System Setup (~10-15 minutes)

- [ ] Transfer scripts to VM (if needed)
- [ ] Make setup script executable: `chmod +x setup_ubuntu24.sh`
- [ ] Run setup script: `./setup_ubuntu24.sh`
- [ ] Answer prompts for optional components:
  - [ ] Docker installation (y/n)
  - [ ] Google Cloud SDK (y/n)
  - [ ] UFW firewall configuration (y/n)
  - [ ] Git configuration (y/n)
  - [ ] Install project dependencies (y/n)

### Expected Installations:
- [ ] Python 3.11 installed and set as default
- [ ] Node.js 20 LTS installed
- [ ] pnpm 9.15.9 installed
- [ ] Git and Git LFS installed
- [ ] Build tools (gcc, make, etc.) installed
- [ ] FFmpeg and audio libraries installed
- [ ] Python virtual environment created at `~/venv/satsangapp`
- [ ] Helper script created: `~/activate_satsangapp.sh`

## ✔️ Step 2: Verify Installation (~1-2 minutes)

- [ ] Make verify script executable: `chmod +x verify_setup.sh`
- [ ] Run verification: `./verify_setup.sh`
- [ ] Confirm all checks pass:
  - [ ] Python 3.11.x detected
  - [ ] Node.js v20.x.x detected
  - [ ] pnpm 9.15.9 detected
  - [ ] Git detected
  - [ ] Build tools detected
  - [ ] FFmpeg detected
  - [ ] Virtual environment exists
  - [ ] Required ports (3001, 7880, 7881) are available

## 🔧 Step 3: Project Configuration (~5-10 minutes)

- [ ] Make configuration script executable: `chmod +x configure_project.sh`
- [ ] Run configuration: `./configure_project.sh`
- [ ] Answer prompts:
  - [ ] Setup Git hooks (y/n)
  - [ ] Create systemd services (y/n)
  - [ ] Create swap file if low memory (y/n)

### Expected Outcomes:
- [ ] `.env.local` file created
- [ ] Frontend dependencies installed (via pnpm)
- [ ] Backend dependencies installed (via pip)
- [ ] Utility scripts created:
  - [ ] `dev.sh` - Start development servers
  - [ ] `build.sh` - Build for production
  - [ ] `test.sh` - Run tests
- [ ] (Optional) Git pre-commit hooks installed
- [ ] (Optional) Systemd services created

## 🔑 Step 4: Environment Configuration

- [ ] Open `.env.local`: `nano .env.local`
- [ ] Add LiveKit credentials:
  - [ ] `LIVEKIT_URL`
  - [ ] `LIVEKIT_API_KEY`
  - [ ] `LIVEKIT_API_SECRET`
- [ ] Add OpenAI credentials:
  - [ ] `OPENAI_API_KEY`
- [ ] Add Firebase credentials:
  - [ ] `FIREBASE_PROJECT_ID`
  - [ ] `FIREBASE_PRIVATE_KEY`
  - [ ] `FIREBASE_CLIENT_EMAIL`
  - [ ] `FIREBASE_DATABASE_URL`
- [ ] Add Sarvam AI credentials:
  - [ ] `SARVAM_API_KEY`
- [ ] Add Pinecone credentials:
  - [ ] `PINECONE_API_KEY`
  - [ ] `PINECONE_ENVIRONMENT`
- [ ] Add Google Cloud credentials:
  - [ ] `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] Save and close file

## 🧪 Step 5: Test Installation

- [ ] Activate Python virtual environment:
  ```bash
  source ~/venv/satsangapp/bin/activate
  ```

- [ ] Test Python packages:
  ```bash
  python3 -c "import livekit; print('✓ LiveKit SDK')"
  python3 -c "import torch; print('✓ PyTorch')"
  python3 -c "import firebase_admin; print('✓ Firebase Admin')"
  python3 -c "import openai; print('✓ OpenAI')"
  ```

- [ ] Test frontend build:
  ```bash
  pnpm build
  ```

- [ ] Test development servers:
  ```bash
  ./dev.sh
  ```
  - [ ] Frontend accessible at `http://localhost:3001`
  - [ ] Backend agent starts without errors

## 🛡️ Step 6: Security (Optional but Recommended)

- [ ] Configure UFW firewall (if not done during setup):
  ```bash
  sudo ufw enable
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 3001/tcp  # Next.js
  sudo ufw allow 7880/tcp  # LiveKit
  ```

- [ ] Setup SSH keys (if accessing remotely):
  ```bash
  ssh-keygen -t ed25519 -C "your_email@example.com"
  cat ~/.ssh/id_ed25519.pub  # Add to authorized_keys
  ```

- [ ] Disable password authentication:
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PasswordAuthentication no
  sudo systemctl restart sshd
  ```

- [ ] Setup automatic security updates:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

## 📊 Step 7: Performance Optimization (Optional)

- [ ] Check system resources:
  ```bash
  htop
  free -h
  df -h
  ```

- [ ] If RAM < 8GB, create swap file (if not done):
  ```bash
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```

- [ ] Install optimized libraries for PyTorch:
  ```bash
  sudo apt install -y libblas-dev liblapack-dev
  ```

- [ ] Increase Node.js memory limit:
  ```bash
  echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
  source ~/.bashrc
  ```

## 🚀 Step 8: Production Deployment (Optional)

- [ ] Build production bundle:
  ```bash
  ./build.sh
  ```

- [ ] Test production build:
  ```bash
  pnpm start
  ```

- [ ] Enable systemd services (if configured):
  ```bash
  sudo systemctl enable satsangapp-frontend satsangapp-agent
  sudo systemctl start satsangapp-frontend satsangapp-agent
  ```

- [ ] Install and configure nginx:
  ```bash
  sudo apt install nginx
  # Configure reverse proxy to port 3001
  ```

- [ ] Setup SSL with Let's Encrypt:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d yourdomain.com
  ```

- [ ] Configure monitoring (optional):
  ```bash
  # Install monitoring tools
  sudo apt install prometheus grafana
  ```

## 📝 Post-Setup Tasks

- [ ] Document any customizations made
- [ ] Create backup of `.env.local` (store securely, NOT in git)
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting
- [ ] Document deployment process
- [ ] Create disaster recovery plan

## ✅ Final Verification

- [ ] All services start without errors
- [ ] Frontend loads correctly
- [ ] Backend agent connects to LiveKit
- [ ] Firebase connectivity verified
- [ ] OpenAI API calls work
- [ ] All features tested end-to-end
- [ ] No console errors in browser
- [ ] No errors in server logs

## 📚 Reference Documentation

- [ ] Bookmark `UBUNTU_VM_SETUP_README.md` for overview
- [ ] Bookmark `QUICKSTART.md` for common commands
- [ ] Bookmark `UBUNTU_SETUP.md` for detailed troubleshooting
- [ ] Save this checklist for future reference

## 🎉 Setup Complete!

Once all items are checked:

1. Your Ubuntu 24 VM is fully configured
2. All dependencies are installed
3. Project is ready for development
4. Security is hardened
5. Performance is optimized

**You're ready to start coding! 🚀**

---

## 📞 Need Help?

If you encounter issues:

1. Review the error messages in terminal
2. Run `./verify_setup.sh` to diagnose problems
3. Check `UBUNTU_SETUP.md` troubleshooting section
4. Verify all environment variables in `.env.local`
5. Ensure external services (LiveKit, Firebase) are configured

---

**Setup Date:** _________________

**VM Details:**
- IP Address: _________________
- Hostname: _________________
- RAM: _________________
- Disk: _________________

**Versions Installed:**
- Python: _________________
- Node.js: _________________
- pnpm: _________________

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

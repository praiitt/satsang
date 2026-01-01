# Satsang App - Deployment Guide

## Deploy to Cloud Run (Frontend)

To deploy the frontend to Cloud Run with correct environment variables from `.env.local`:

```bash
python3 scripts/deploy_frontend_cloudrun.py
```

This script will:
1. Read `NEXT_PUBLIC_` variables from `.env.local`
2. Trigger a Cloud Build
3. Deploy to Cloud Run with the correct environment variables

## Quick Deploy on Fresh Ubuntu 22.04 VM

### One-Command Deployment

```bash
curl -fsSL https://raw.githubusercontent.com/praiitt/satsang/main/deploy_fresh_vm.sh | bash
```

Or manually:

```bash
# 1. Clone repository
git clone https://github.com/praiitt/satsang.git
cd satsang

# 2. Run deployment script
chmod +x deploy_fresh_vm.sh
./deploy_fresh_vm.sh
```

### What the Script Does

The `deploy_fresh_vm.sh` script automatically:

1. ✅ **Updates system packages**
2. ✅ **Installs Node.js 20.x**
3. ✅ **Installs pnpm package manager**
4. ✅ **Installs PM2 process manager**
5. ✅ **Installs Python 3.10 with venv**
6. ✅ **Installs Nginx web server**
7. ✅ **Installs Docker (optional)**
8. ✅ **Clones the repository**
9. ✅ **Installs all project dependencies**
   - Frontend (Next.js with pnpm)
   - Auth Server (Node.js)
   - Astrology Backend (Node.js)
   - Python Agents (LiveKit)
10. ✅ **Builds production bundles**
11. ✅ **Sets up Python virtual environment**
12. ✅ **Configures environment files**
13. ✅ **Configures Nginx**
14. ✅ **Starts all services with PM2**
15. ✅ **Saves PM2 configuration**

### Prerequisites

- Ubuntu 22.04 LTS server
- Minimum 4GB RAM, 2 vCPUs (recommended: 8GB RAM, 4 vCPUs)
- SSH access with sudo privileges
- Git installed

### Post-Deployment Configuration

After running the script, configure the following:

#### 1. API Keys (.env.local)

```bash
cd ~/satsang
nano .env.local
```

Update with your actual keys:
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`
- `CARTESIA_API_KEY`
- `YOUTUBE_API_KEY`
- `SARVAM_API_KEY`

#### 2. Firebase Credentials

Copy your Firebase service account JSON:
```bash
# On your local machine
scp satsangServiceAccount.json user@your-vm:/home/user/satsang/
```

#### 3. SSL Certificates (Optional)

For HTTPS, copy your SSL certificates:
```bash
# Create SSL directory
mkdir -p ~/satsang/ssl

# Copy certificates
scp certificate.crt user@your-vm:~/satsang/ssl/
scp private.key user@your-vm:~/satsang/ssl/
```

Update nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/satsang
```

#### 4. Restart Services

```bash
cd ~/satsang
pm2 restart all
pm2 save
```

### PM2 Commands

```bash
# View all services
pm2 status

# View logs
pm2 logs

# View specific service logs
pm2 logs frontend
pm2 logs auth-server
pm2 logs agent-music

# Restart a service
pm2 restart frontend

# Restart all services
pm2 restart all

# Stop all services
pm2 stop all

# Delete all services
pm2 delete all

# Start services
pm2 start ecosystem.monolith.config.cjs

# Save PM2 configuration
pm2 save
```

### Service Ports

- **Frontend**: 3000
- **Auth Server**: 4000
- **Astrology Backend**: 3003
- **Nginx**: 80 (HTTP), 443 (HTTPS)
- **Agent Ports**:
  - agent-guruji: 8081
  - agent-music: 8082
  - agent-hinduism: 8083
  - agent-astrology: 8084
  - agent-et: 8085

### Nginx Configuration

The script automatically configures Nginx to route traffic:

- `/` → Frontend (port 3000)
- `/api/auth/` → Auth Server (port 4000)
- `/api/` → Astrology Backend (port 3003)

### Troubleshooting

#### Services Not Starting

```bash
# Check PM2 logs
pm2 logs --lines 50

# Check specific service
pm2 logs auth-server --lines 20
```

#### Port Already In Use

```bash
# Check what's using a port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

#### Nginx Errors

```bash
# Test nginx configuration
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

#### Python Agent Errors

```bash
# Check venv activation
cd ~/satsang/livekit_server/agent-starter-python
source venv/bin/activate
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### Memory Issues

```bash
# Check memory usage
free -h

# Check top processes
htop

# Restart specific memory-intensive service
pm2 restart agent-music
```

### System Requirements by Load

#### Development/Testing (Light Load)
- 2 vCPUs, 4GB RAM
- Run: Frontend + Auth Server only

#### Production (Medium Load)
- 4 vCPUs, 8GB RAM  
- Run: All services except agents

#### Production (Full Load)
- 4-8 vCPUs, 16GB RAM
- Run: All services including agents

### Updating the Application

```bash
cd ~/satsang

# Pull latest changes
git pull

# Reinstall dependencies if needed
pnpm install
cd auth-server && npm install && cd ..
cd astrology_backend/backend && npm install && cd ../..

# Rebuild if needed
pnpm run build
cd auth-server && npm run build && cd ..

# Restart services
pm2 restart all
pm2 save
```

### Security Checklist

- [ ] Change default SSH port
- [ ] Setup firewall (ufw)
- [ ] Enable fail2ban
- [ ] Use SSL/HTTPS certificates
- [ ] Rotate API keys regularly
- [ ] Keep system updated
- [ ] Monitor logs for suspicious activity

### Monitoring

```bash
# System resources
htop
df -h
free -h

# PM2 monitoring
pm2 monit

# Nginx status
sudo systemctl status nginx

# Check open ports
sudo netstat -tulpn
```

### Backup

```bash
# Backup environment files
tar -czf satsang-env-backup-$(date +%Y%m%d).tar.gz \
  .env.local \
  auth-server/.env \
  livekit_server/agent-starter-python/.env.local \
  satsangServiceAccount.json

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/pm2-backup-$(date +%Y%m%d).pm2
```

## Support

For issues or questions:
- Check logs: `pm2 logs`
- Review this guide
- Check GitHub issues
- Contact: support@rraasi.com

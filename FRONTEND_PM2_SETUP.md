# PM2 Setup for Satsang Frontend

This guide explains how to run the Satsang Next.js Frontend using PM2 on Ubuntu.

## Prerequisites

### Quick Setup (Recommended)

Run the automated installation script (if not already done):

```bash
cd livekit_server/agent-starter-python
chmod +x install-dependencies.sh
./install-dependencies.sh
```

This will install Node.js, npm, and PM2. Then install pnpm:

```bash
npm install -g pnpm
```

### Manual Setup

1. **Install Node.js and npm** (if not installed):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

3. **Install pnpm**:
   ```bash
   npm install -g pnpm
   ```

4. **Configure Environment Variables**:
   Ensure `.env.local` exists in the project root with your LiveKit credentials:
   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   ```

## Usage

### First Time Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build the Next.js application**:
   ```bash
   pnpm build
   ```

### Start the Frontend

```bash
chmod +x start-frontend-pm2.sh
./start-frontend-pm2.sh
```

The script will automatically:
- Check and install dependencies if needed
- Build the application if not already built
- Start the frontend with PM2

### Stop the Frontend

```bash
chmod +x stop-frontend-pm2.sh
./stop-frontend-pm2.sh
```

### Manual PM2 Commands

```bash
# View logs
pm2 logs satsang-frontend

# View status
pm2 status

# Restart frontend
pm2 restart satsang-frontend

# Stop frontend
pm2 stop satsang-frontend

# Delete from PM2
pm2 delete satsang-frontend

# View detailed info
pm2 info satsang-frontend

# Monitor (real-time monitoring)
pm2 monit
```

### Rebuild After Code Changes

If you've made code changes, rebuild and restart:

```bash
# Rebuild
pnpm build

# Restart PM2 process
pm2 restart satsang-frontend
```

Or use the start script again (it will rebuild if needed):

```bash
./start-frontend-pm2.sh
```

### Setup PM2 to Start on System Boot

```bash
# Generate startup script (if not already done)
pm2 startup

# Follow the instructions shown, then save the process list
pm2 save
```

## Configuration

The `ecosystem.config.cjs` file contains PM2 configuration. Key settings:

- **name**: Process name in PM2 (`satsang-frontend`)
- **script**: Command to run (`pnpm`)
- **args**: Arguments passed to pnpm (`start`)
- **cwd**: Working directory (`/home/underlitigationcom/satsang`)
- **autorestart**: Automatically restart on crash
- **max_memory_restart**: Restart if memory exceeds 1GB
- **env.PORT**: Server port (default: 3000)
- **log files**: Logs are stored in `./logs/` directory

## Troubleshooting

1. **Frontend not starting**: 
   - Check if `.env.local` exists and has correct credentials
   - Verify the application was built: `ls -la .next`
   - Check PM2 logs: `pm2 logs satsang-frontend`

2. **pnpm not found**: 
   - Install pnpm: `npm install -g pnpm`
   - Ensure it's in PATH: `which pnpm`

3. **Build errors**: 
   - Ensure all dependencies are installed: `pnpm install`
   - Check Node.js version: `node --version` (should be 18+)
   - Try cleaning and rebuilding: `rm -rf .next node_modules && pnpm install && pnpm build`

4. **Port already in use**: 
   - Change PORT in `ecosystem.config.cjs` or stop the conflicting service
   - Check what's using the port: `sudo lsof -i :3000`

5. **Permission denied**: 
   - Make sure scripts are executable: `chmod +x *.sh`

## Logs

Logs are stored in:
- `./logs/pm2-frontend-error.log` - Error logs
- `./logs/pm2-frontend-out.log` - Standard output
- `./logs/pm2-frontend-combined.log` - Combined logs

You can also view real-time logs with:
```bash
pm2 logs satsang-frontend
```

## Running Both Frontend and Agent

You can run both the frontend and the agent simultaneously with PM2:

```bash
# Start frontend
cd /home/underlitigationcom/satsang
./start-frontend-pm2.sh

# Start agent
cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
./start-pm2.sh

# View all processes
pm2 status

# View logs from both
pm2 logs
```


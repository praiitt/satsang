# Deploy Auth Server to rraasi-vm

## Issues and fixes

### 1. Missing dependencies
On the server, run:
```bash
cd ~/satsang/auth-server
npm install
# or if you have pnpm:
pnpm install
```

### 2. Missing satsangServiceAccount.json
The auth-server code expects this file at: `~/satsang/satsangServiceAccount.json` (one level up from auth-server)

**Copy it from your local machine:**
```bash
# From your local machine:
scp /Users/prakash/Documents/satsang/satsangapp/satsangServiceAccount.json prakash@<SERVER_IP>:~/satsang/
```

**Or** create it manually on the server:
```bash
# On the server:
nano ~/satsang/satsangServiceAccount.json
# Paste the content and save
```

### 3. Build the TypeScript code
```bash
cd ~/satsang/auth-server
npm run build
```

### 4. Start the server
```bash
npm start
```

## Complete deployment steps

```bash
# SSH to server
ssh prakash@rraasi-vm

# Navigate to auth-server
cd ~/satsang/auth-server

# Install dependencies
npm install

# Copy service account (run this from local machine first)
# From local: scp /Users/prakash/Documents/satsang/satsangapp/satsangServiceAccount.json prakash@<SERVER_IP>:~/satsang/

# Build TypeScript
npm run build

# Start server
npm start
```

## Using PM2 (recommended for production)
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

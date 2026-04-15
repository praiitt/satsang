#!/bin/bash
set -e

echo "==================================="
echo "Satsang App - WhatsApp Deployment"
echo "==================================="

# 1. Install System Dependencies (Puppeteer/Chrome)
if [ -f "./install_puppeteer_deps.sh" ]; then
    echo "📦 Checking system dependencies..."
    chmod +x ./install_puppeteer_deps.sh
    ./install_puppeteer_deps.sh
fi

# 2. Build WhatsApp Service
echo "🔨 Building WhatsApp Service..."
cd whatsapp-service
npm install
npm run build
cd ..

# 3. Start with PM2
echo "🚀 Starting WhatsApp Service with PM2..."
pm2 delete whatsapp-service 2>/dev/null || true
pm2 start ecosystem.whatsapp.config.cjs

# 4. Save PM2 state
pm2 save

echo "==================================="
echo "✅ WhatsApp Deployment Complete!"
echo "==================================="
echo "Check status: pm2 status whatsapp-service"
echo "Check logs: pm2 logs whatsapp-service"
echo " Dashboard: https://rraasi.com/marketing/whatsapp"

#!/bin/bash
# Server Health Check Script

echo "=================================================="
echo "🏥 RRAASI Server Health Check"
echo "=================================================="
echo ""

# 1. Check PM2 Services
echo "📊 PM2 Services Status:"
pm2 status
echo ""

# 2. Check Ports
echo "🔌 Port Status:"
echo "Port 3000 (Frontend):"
lsof -i:3000 || echo "❌ Nothing on port 3000"
echo ""
echo "Port 4000 (Auth Server):"
lsof -i:4000 || echo "❌ Nothing on port 4000"
echo ""
echo "Port 3003 (Backend):"
lsof -i:3003 || echo "❌ Nothing on port 3003"
echo ""

# 3. Check Nginx
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager | head -10
echo ""

# 4. Test localhost endpoints
echo "🧪 Testing localhost endpoints:"
echo "Frontend health:"
curl -s http://localhost:3000 | head -3 || echo "❌ Frontend not responding"
echo ""
echo "Auth server health:"
curl -s http://localhost:4000/health 2>&1 | head -3 || echo "❌ Auth server not responding"
echo ""

# 5. Check logs
echo "📝 Recent PM2 Errors:"
pm2 logs --err --lines 10 --nostream
echo ""

# 6. Check disk space
echo "💾 Disk Space:"
df -h / | grep -v Filesystem
echo ""

# 7. Check memory
echo "🧠 Memory Usage:"
free -h | grep -E "Mem|Swap"
echo ""

echo "=================================================="
echo "Health check complete!"
echo "=================================================="

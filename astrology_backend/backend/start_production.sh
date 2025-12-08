#!/bin/bash

echo "🚀 **RRAASI Production Server Startup Script**"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Verify environment configuration
echo ""
echo "🔍 **Verifying Environment Configuration:**"

if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check key environment variables
    if grep -q "NODE_ENV=production" .env; then
        echo "✅ NODE_ENV=production"
    else
        echo "❌ NODE_ENV not set to production"
    fi
    
    if grep -q "FIREBASE_ENVIRONMENT=production" .env; then
        echo "✅ FIREBASE_ENVIRONMENT=production"
    else
        echo "❌ FIREBASE_ENVIRONMENT not set to production"
    fi
    
    if grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env; then
        echo "✅ GOOGLE_APPLICATION_CREDENTIALS configured"
    else
        echo "❌ GOOGLE_APPLICATION_CREDENTIALS not configured"
    fi
    
    if grep -q "project_id.*rraasi" .env; then
        echo "✅ Firebase project: rraasi (production)"
    else
        echo "❌ Firebase project not set to rraasi"
    fi
else
    echo "❌ .env file not found"
    exit 1
fi

# Check service account file
echo ""
echo "📁 **Checking Service Account File:**"
SERVICE_ACCOUNT_PATH=$(grep "GOOGLE_APPLICATION_CREDENTIALS" .env | cut -d'=' -f2)

if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    echo "✅ Service account file exists: $SERVICE_ACCOUNT_PATH"
    
    # Verify it's for the correct project
    if grep -q '"project_id": "rraasi"' "$SERVICE_ACCOUNT_PATH"; then
        echo "✅ Service account is for production project: rraasi"
    else
        echo "❌ Service account is NOT for production project rraasi"
        exit 1
    fi
else
    echo "❌ Service account file not found: $SERVICE_ACCOUNT_PATH"
    exit 1
fi

# Kill any existing server processes
echo ""
echo "🔄 **Stopping any existing server processes:**"
pkill -f "node.*server" 2>/dev/null || echo "No existing server processes found"

# Wait a moment for processes to stop
sleep 2

# Start the server
echo ""
echo "🚀 **Starting Production Server:**"
echo "   Environment: Production"
echo "   Firebase Project: rraasi"
echo "   Port: 3000"
echo ""

npm start

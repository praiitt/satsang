#!/bin/bash

# Rraasi Backend App Engine Deployment Script

echo "🚀 Deploying Rraasi Backend to Google App Engine..."
echo "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: Google Cloud SDK (gcloud) is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: Not authenticated with Google Cloud."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Check if project is set
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project is set."
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📍 Project ID: $PROJECT_ID"
echo "🌐 Service: rraasi-backend"
echo "🔧 Runtime: Node.js 18"

# Confirm deployment
read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo ""
echo "🔄 Starting deployment..."

# Deploy to App Engine
gcloud app deploy app.yaml --quiet

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your backend is now available at:"
    echo "   https://rraasi-backend-dot-$PROJECT_ID.an.r.appspot.com"
    echo ""
    echo "🔍 Health check:"
    echo "   https://rraasi-backend-dot-$PROJECT_ID.an.r.appspot.com/health"
    echo ""
    echo "📊 View in Google Cloud Console:"
    echo "   https://console.cloud.google.com/appengine/versions?project=$PROJECT_ID"
    echo ""
    echo "🚀 To update your frontend configuration, use this URL:"
    echo "   https://rraasi-backend-dot-$PROJECT_ID.an.r.appspot.com"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check the error messages above and try again."
    exit 1
fi

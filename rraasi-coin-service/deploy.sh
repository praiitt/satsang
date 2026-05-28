#!/bin/bash

set -e

echo "🚀 Deploying RRAASI Coin Service to Google Cloud Functions..."

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Deploy to Cloud Functions
echo "☁️  Deploying to Cloud Functions..."
gcloud functions deploy rraasi-coin-service \
  --project=rraasi-8a619 \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=rraasi_coin_service \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=60s \
  --env-vars-file=.env.yaml

echo "✅ Deployment complete!"
echo "🔗 Function URL: https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service"
echo ""
echo "Test with:"
echo "curl https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service/health"

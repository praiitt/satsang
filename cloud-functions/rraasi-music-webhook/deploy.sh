#!/bin/bash

# Deploy RRAASI Music Webhook to Google Cloud Functions

PROJECT_ID="rraasi-8a619"
FUNCTION_NAME="rraasi-music-webhook"
REGION="us-central1"

echo "🚀 Deploying RRAASI Music Webhook..."

gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=. \
  --entry-point=musicWebhook \
  --trigger-http \
  --allow-unauthenticated \
  --project=$PROJECT_ID \
  --memory=512MB \
  --timeout=60s \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "📍 Function URL:"
  gcloud functions describe $FUNCTION_NAME \
    --gen2 \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(serviceConfig.uri)"
else
  echo "❌ Deployment failed!"
  exit 1
fi

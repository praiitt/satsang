#!/bin/bash

# Setup variables
PROJECT_ID="rraasi-8a619"
REGION="asia-south1"
SERVICE_NAME="satsang-frontend"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

echo "🚀 Deploying Frontend to Cloud Run ($SERVICE_NAME)..."

# 1. Build and push image using Cloud Build (uses cloudbuild.yaml)
echo "📦 Building container image..."
gcloud builds submit --config cloudbuild.yaml .

# 2. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:fresh \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300

echo "✅ Deployment complete!"

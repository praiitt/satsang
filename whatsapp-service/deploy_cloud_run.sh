#!/bin/bash
set -e

PROJECT_ID="rraasi-8a619"
REGION="asia-south1"
SERVICE_NAME="whatsapp-service"
BUCKET_NAME="rraasi-whatsapp-session"

echo "🚀 Deploying WhatsApp Service to Cloud Run ($SERVICE_NAME)..."

# 1. Create GCS Bucket for session persistence if it doesn't exist
if ! gcloud storage buckets describe gs://$BUCKET_NAME --project $PROJECT_ID &>/dev/null; then
  echo "creating bucket gs://$BUCKET_NAME..."
  gcloud storage buckets create gs://$BUCKET_NAME --project $PROJECT_ID --location $REGION
else
  echo "✅ Bucket gs://$BUCKET_NAME already exists"
fi

# 2. Build and push image using Cloud Build
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME . --project $PROJECT_ID

# 3. Deploy to Cloud Run (using beta for GCS volume support)
# - No CPU throttling (Always-on CPU) to keep the listener active
# - GCS Volume Mount for session persistence
echo "🚀 Deploying to Cloud Run..."
gcloud beta run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --no-cpu-throttling \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600 \
  --concurrency 100 \
  --max-instances 1 \
  --min-instances 1 \
  --set-env-vars "NODE_ENV=production,WHATSAPP_BOT_ENABLED=true,MARKETING_SERVER_URL=https://satsang-marketing-server-6ougd45dya-el.a.run.app,CORS_ORIGIN=https://rraasi.com\\,https://www.rraasi.com,WHATSAPP_SESSION_BUCKET=$BUCKET_NAME,INTERNAL_SERVICE_TOKEN=satsang_internal_agent_secret_2024" \
  --project $PROJECT_ID

echo ""
echo "✅ Deployment complete!"
echo "   ➡️  Service URL: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format='value(status.url)' --project $PROJECT_ID)"
echo "   ⚠️  Note: You will need to scan the QR code via the dashboard once to authenticate."

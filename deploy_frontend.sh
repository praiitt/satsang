#!/bin/bash
set -e

# Setup variables
PROJECT_ID="rraasi-8a619"
REGION="asia-south1"
SERVICE_NAME="satsang-frontend"

echo "🚀 Deploying Frontend to Cloud Run ($SERVICE_NAME)..."

# 1. Build and push image using Cloud Build (uses cloudbuild.yaml)
# ⚠️  CRITICAL: NEXT_PUBLIC_* vars MUST be set as --build-arg inside cloudbuild.yaml,
#    NOT here. They are baked into the Next.js bundle at build time by the Dockerfile.
#    Adding them only as Cloud Run env vars will NOT work — Firebase will throw
#    auth/invalid-api-key and the app will crash on load.
echo "📦 Building container image via cloudbuild.yaml..."
gcloud builds submit --config cloudbuild.yaml --project $PROJECT_ID .

# ─────────────────────────────────────────────────────────────
# 2. Load runtime env vars from .env
#    NOTE: Build-time vars (NEXT_PUBLIC_*) are baked into the
#    image via cloudbuild.yaml --build-arg. Server-side API
#    keys must be passed here as Cloud Run env vars so they
#    are available at request time.
# ─────────────────────────────────────────────────────────────
ENV_VARS=""

# Helper: add key if it exists in .env
add_env() {
  local KEY=$1
  local VAL
  VAL=$(grep -E "^${KEY}=" .env 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d "'" | tr -d '"')
  if [ -n "$VAL" ]; then
    if [ -n "$ENV_VARS" ]; then ENV_VARS="${ENV_VARS},"; fi
    ENV_VARS="${ENV_VARS}${KEY}=${VAL}"
    echo "  ✅ $KEY"
  else
    echo "  ⚠️  $KEY not found in .env — skipping"
  fi
}

echo ""
echo "🔑 Loading runtime env vars from .env..."

# AI & Music APIs  ← add new keys here when you add them to .env
add_env FIREBASE_SERVICE_ACCOUNT_JSON
add_env OPENAI_API_KEY
add_env GEMINI_API_KEY
add_env SUNO_API_KEY
add_env HEYGEN_API_KEY
add_env SARVAM_API_KEY

# Social & Comms
add_env SENDGRID_API_KEY
add_env TWILIO_ACCOUNT_SID
add_env TWILIO_AUTH_TOKEN
add_env TWILIO_WHATSAPP_NUMBER
add_env BUFFER_ACCESS_TOKEN

# Infrastructure
add_env LIVEKIT_URL
add_env LIVEKIT_API_KEY
add_env LIVEKIT_API_SECRET
add_env LIVEKIT_EGRESS_ENABLED
add_env LIVEKIT_EGRESS_GCP_BUCKET
add_env LIVEKIT_EGRESS_GCP_CREDENTIALS

# Auth & Backend URLs
add_env AUTH_SERVER_URL
add_env MARKETING_SERVER_URL
add_env INTERNAL_SERVICE_TOKEN
add_env NEXT_PUBLIC_WA_SERVICE_URL

# YouTube
add_env YOUTUBE_CLIENT_ID
add_env YOUTUBE_CLIENT_SECRET
add_env YOUTUBE_API_KEY

echo ""

# 3. Deploy to Cloud Run with all env vars
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars "$ENV_VARS"

echo ""
echo "✅ Deployment complete!"
echo "   ➡️  Service: https://satsang-frontend-6ougd45dya-el.a.run.app"

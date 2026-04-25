#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
# deploy_marketing.sh  —  Deploy satsang-marketing-server to Cloud Run
#
# IMPORTANT NOTES (learned the hard way):
# 1. AUTH_SERVER_URL must be set — omitting it causes ECONNREFUSED 127.0.0.1:4000
#    and breaks lead registration completely.
# 2. OPENAI_API_KEY must be set — missing key causes OpenAI WS close code 1005
#    and the calling bot drops after ~12 seconds.
# 3. FIREBASE_SERVICE_ACCOUNT_PATH must point to inside the container
#    (/app/dist/rraasiServiceAccount.json) — the file is copied in Dockerfile.
# 4. --session-affinity is required for WebSocket connections to stay on the
#    same instance and not be load-balanced mid-stream.
# 5. --timeout 3600 allows long-running voice calls (up to 1 hour).
# ─────────────────────────────────────────────────────────────────────────────

GCLOUD=/Users/prakash/Downloads/google-cloud-sdk/bin/gcloud
REGION=asia-south1
PROJECT=rraasi-8a619
SERVICE=satsang-marketing-server
CLOUD_RUN_URL=https://satsang-marketing-server-6ougd45dya-el.a.run.app
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_ENV="${SCRIPT_DIR}/../.env"

# Load secrets from root .env (all secrets must live in .env, not hardcoded here)
load_env_var() {
  grep "^$1=" "$ROOT_ENV" | head -1 | cut -d'=' -f2-
}

OPENAI_KEY=$(load_env_var OPENAI_API_KEY)
SENDGRID_KEY=$(load_env_var SENDGRID_API_KEY)
VOBIZ_ID=$(load_env_var VOBIZ_AUTH_ID)
VOBIZ_TOKEN=$(load_env_var VOBIZ_AUTH_TOKEN)
VOBIZ_FROM=$(load_env_var VOBIZ_FROM_NUMBER)
INTERNAL_TOKEN=$(load_env_var INTERNAL_SERVICE_TOKEN)

if [ -z "$OPENAI_KEY" ]; then echo "❌ OPENAI_API_KEY not found in ../.env"; exit 1; fi
if [ -z "$SENDGRID_KEY" ]; then echo "❌ SENDGRID_API_KEY not found in ../.env"; exit 1; fi
if [ -z "$VOBIZ_ID" ]; then echo "❌ VOBIZ_AUTH_ID not found in ../.env"; exit 1; fi

echo "🚀 Deploying $SERVICE to Cloud Run..."

$GCLOUD run deploy $SERVICE \
  --source "$SCRIPT_DIR" \
  --region $REGION \
  --project $PROJECT \
  --platform managed \
  --allow-unauthenticated \
  --port 4001 \
  --timeout 3600 \
  --cpu 1 \
  --memory 512Mi \
  --concurrency 80 \
  --min-instances 1 \
  --session-affinity \
  --set-env-vars "\
NODE_ENV=production,\
MARKETING_PORT=4001,\
MARKETING_SERVER_URL=${CLOUD_RUN_URL},\
AUTH_SERVER_URL=https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-auth-server,\
AUTH_SERVER_URL_INTERNAL=https://asia-south1-rraasi-8a619.cloudfunctions.net/satsang-auth-server,\
INTERNAL_SERVICE_TOKEN=${INTERNAL_TOKEN},\
VOBIZ_AUTH_ID=${VOBIZ_ID},\
VOBIZ_AUTH_TOKEN=${VOBIZ_TOKEN},\
VOBIZ_FROM_NUMBER=${VOBIZ_FROM},\
SENDGRID_API_KEY=${SENDGRID_KEY},\
EMAIL_FROM=satsang@rraasi.com,\
EMAIL_FROM_NAME=RRAASI Spiritual Platform,\
FIREBASE_SERVICE_ACCOUNT_PATH=/app/dist/rraasiServiceAccount.json,\
WHATSAPP_SERVICE_URL=https://whatsapp-service-6ougd45dya-el.a.run.app,\
OPENAI_API_KEY=${OPENAI_KEY}"

echo ""
echo "✅ Deployment complete!"
echo "   ➡️  Service: ${CLOUD_RUN_URL}"

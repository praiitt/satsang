#!/bin/bash
set -e

GCLOUD=/Users/prakash/Downloads/google-cloud-sdk/bin/gcloud

# Build the project locally to ensure no errors (optional but good practice)
echo "Building project..."
npm run build

# Deploy to Cloud Functions
echo "Deploying to Cloud Functions..."
$GCLOUD functions deploy satsang-auth-server \
  --gen2 \
  --runtime=nodejs20 \
  --region=asia-south1 \
  --source=. \
  --entry-point=authServer \
  --trigger-http \
  --allow-unauthenticated \
  --project=rraasi-8a619 \
  --env-vars-file=.env.yaml

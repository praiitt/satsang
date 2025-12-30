#!/bin/bash

# Deploy Auth Server to Google Cloud Functions (Gen 2)

# Ensure credentials
# gcloud auth login

# Set Project
# gcloud config set project your-project-id

# Navigate to auth-server directory
cd auth-server

# Generate .env.yaml using Node script for safety
echo "Generating .env.yaml from .env.local..."
node scripts/prepare-deploy-env.cjs

# Deploy using the generated file (assuming we are in auth-server dir)
gcloud functions deploy satsang-auth-server \
  --quiet \
  --gen2 \
  --project=rraasi-8a619 \
  --runtime=nodejs20 \
  --region=asia-south1 \
  --source=. \
  --entry-point=authServer \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=60s \
  --env-vars-file=.env.yaml


echo "Deployment submitted. Check Cloud Console for status."

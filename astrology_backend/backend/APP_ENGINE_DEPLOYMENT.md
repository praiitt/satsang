# 🚀 Google App Engine Deployment Guide

## Overview

This guide will help you deploy your Rraasi backend to Google App Engine, making it accessible from anywhere on the internet.

## 📋 Prerequisites

### 1. Google Cloud Account
- [ ] Google Cloud Platform account
- [ ] Billing enabled
- [ ] App Engine API enabled

### 2. Google Cloud SDK
```bash
# Install Google Cloud SDK
# macOS (using Homebrew)
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 3. Authentication & Project Setup
```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Verify configuration
gcloud config list
```

## 🔧 Configuration Files

### app.yaml
The main App Engine configuration file:
```yaml
runtime: nodejs18
service: rraasi-backend

env_variables:
  NODE_ENV: "production"
  PORT: "8080"

automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 1
  max_instances: 10
  target_concurrent_requests: 100

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10

handlers:
  - url: /.*
    script: auto
    secure: always

inbound_services:
  - warmup

env: standard
```

### production.env
Production environment variables (copy from your existing .env and update values).

## 🚀 Deployment Steps

### 1. Quick Deployment
```bash
# Make deployment script executable
chmod +x deploy-app-engine.sh

# Run deployment script
./deploy-app-engine.sh
```

### 2. Manual Deployment
```bash
# Deploy to App Engine
gcloud app deploy app.yaml --quiet

# Check deployment status
gcloud app describe
```

### 3. Verify Deployment
```bash
# Get your app URL
gcloud app browse

# Check health endpoint
curl https://YOUR_PROJECT_ID.an.r.appspot.com/health
```

## 🌐 App Engine URLs

After deployment, your backend will be available at:
- **Main URL**: `https://rraasi-backend-dot-YOUR_PROJECT_ID.an.r.appspot.com`
- **Health Check**: `https://rraasi-backend-dot-YOUR_PROJECT_ID.an.r.appspot.com/health`
- **API Base**: `https://rraasi-backend-dot-YOUR_PROJECT_ID.an.r.appspot.com/api`

## 🔄 Update Frontend Configuration

Once deployed, update your frontend configuration to use the new App Engine URL:

### Frontend (React)
```typescript
// frontend/src/config/api.ts
export const BACKEND_URLS = {
  development: 'http://localhost:3000',
  production: 'https://rraasi-backend-dot-YOUR_PROJECT_ID.an.r.appspot.com'
};
```

### Flutter App
```dart
// flutter_app/lib/config/api_config.dart
static const Map<String, String> _backendUrls = {
  'development': 'http://localhost:3000',
  'production': 'https://rraasi-backend-dot-YOUR_PROJECT_ID.an.r.appspot.com',
};
```

## 📊 Monitoring & Management

### Google Cloud Console
- **App Engine**: https://console.cloud.google.com/appengine
- **Logs**: https://console.cloud.google.com/logs
- **Monitoring**: https://console.cloud.google.com/monitoring

### Command Line
```bash
# View logs
gcloud app logs tail

# Check versions
gcloud app versions list

# Scale instances
gcloud app versions migrate v1 --quiet
```

## 🔒 Security & Environment Variables

### Sensitive Data
- **Never commit API keys** to version control
- **Use Google Secret Manager** for production secrets
- **Set environment variables** in App Engine console

### CORS Configuration
Your backend automatically configures CORS based on environment:
- **Development**: Allows localhost and production origins
- **Production**: Restricts to production frontend only

## 💰 Cost Optimization

### App Engine Pricing
- **Standard Environment**: Pay per use
- **Automatic Scaling**: Scales to zero when not in use
- **Resource Limits**: Configured in app.yaml

### Cost Control
```yaml
# Limit maximum instances
max_instances: 5

# Set minimum instances to 0 for cost savings
min_instances: 0

# Target CPU utilization
target_cpu_utilization: 0.7
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Configuration
```bash
# Ensure PORT is set to 8080 for App Engine
export PORT=8080
```

#### 2. Environment Variables
```bash
# Check if environment variables are loaded
gcloud app logs tail
```

#### 3. CORS Issues
```bash
# Verify CORS configuration in production.env
CORS_ORIGIN=https://rraasi-frontend.vercel.app
```

#### 4. Memory Issues
```yaml
# Increase memory allocation if needed
resources:
  memory_gb: 2
```

### Debug Commands
```bash
# View detailed logs
gcloud app logs tail --level=debug

# Check app configuration
gcloud app describe

# View app versions
gcloud app versions list
```

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
```yaml
# .github/workflows/deploy.yml
name: Deploy to App Engine
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: google-github-actions/setup-gcloud@v0
      - run: gcloud app deploy app.yaml --quiet
```

## 📈 Performance Optimization

### App Engine Features
- **Automatic Scaling**: Handles traffic spikes
- **Load Balancing**: Distributes requests
- **CDN**: Global content delivery
- **SSL**: Automatic HTTPS

### Best Practices
1. **Use connection pooling** for databases
2. **Implement caching** strategies
3. **Optimize static assets**
4. **Monitor performance metrics**

## 🎯 Next Steps

After successful deployment:

1. ✅ **Test all API endpoints**
2. ✅ **Update frontend configuration**
3. ✅ **Monitor performance and logs**
4. ✅ **Set up alerts and monitoring**
5. ✅ **Configure custom domain (optional)**

## 📞 Support

- **Google Cloud Documentation**: https://cloud.google.com/appengine/docs
- **App Engine Status**: https://status.cloud.google.com/
- **Community Support**: https://stackoverflow.com/questions/tagged/google-app-engine

---

**🎉 Congratulations!** Your Rraasi backend is now deployed to Google App Engine and ready to serve users worldwide!

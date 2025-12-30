# Agent Memory & Troubleshooting Guide

This file contains critical knowledge, configuration details, and common "gotchas" for the Satsang/RRAASI project. Future agents should refer to this file before making infrastructure or deployment changes.

## 1. Firebase Hosting & Authentication (CRITICAL)
- **Cookie Naming**: Firebase Hosting **strips all cookies** from request headers except for one named **`__session`**.
- **Issue**: If you use a custom name (like `fb_session`), login state will work on the direct Cloud Run URL but **FAIL** on the custom domain (`rraasi.com`).
- **Fix**: Always use `__session` as the cookie name for authentication.
- **Affected Files**: `auth-server/src/middleware/auth.ts`, `marketing-server/src/middleware/auth.ts`, and any client-side code fetching from these backends.

## 2. Global Project Configuration
- **Firebase Project ID**: `rraasi-8a619`
- **Region**: `asia-south1` (Mumbai)
- **Deployment Script**: Use `python3 scripts/deploy_frontend_cloudrun.py` for the frontend.
- **Custom Domain**: `https://rraasi.com` (Main) and `https://www.rraasi.com`.

## 3. Frontend Deployment "Split Loading"
- The frontend is served via Firebase Hosting but proxies to Cloud Run.
- To avoid `ChunkLoadError` (where Firebase decodes URL segments), we use an `assetPrefix` in `next.config.ts`.
- Assets are served directly from the Cloud Run URL: `https://satsang-frontend-469389287554.asia-south1.run.app`.

## 4. API Proxies
- Next.js proxies `/api/auth/*` and `/api/suno/*` to the `auth-server`.
- Next.js proxies `/api/marketing/*` to the `marketing-server`.
- Next.js proxies various `/api/*` routes to the `astrology_backend` (Port 3003).

## 5. Security & Domains
- When adding new storage buckets or domains for video/asset processing, they MUST be added to the `ALLOWED_DOMAINS` array in:
  - `marketing-server/src/routes/video-stitch.ts`
  - `marketing-server/src/routes/podcast.ts`

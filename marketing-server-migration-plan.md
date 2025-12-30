# Migration Plan: Extract Marketing Server

## Objective
Move heavy, riskier marketing tools (Podcast generation, Video Stitching, Ad Briefs) out of the critical path "Auth Server" into a dedicated "Marketing Server".
This reduces the attack surface of the core Auth/Transcription server and isolates heavy processing (FFmpeg stitching).

## 1. Create New Service Directory: `marketing-server`
- Duplicate `auth-server` structure to `marketing-server`.
- Copy `package.json` but remove unused dependencies later.
- Copy `tsconfig.json`.

## 2. Migrate Routes
Move the following files from `auth-server/src/routes/` to `marketing-server/src/routes/`:
- `podcast.ts`
- `video-stitch.ts`
- `ads.ts`
- `transcript.ts` (Generic audio URL transcription - optional, if considered "marketing" tool)

## 3. Clean Auth Server
- Remove the above routes.
- Remove `ffmpeg` or `video-stitcher` services from `auth-server`.
- Update `auth-server/src/index.ts` to stop loading these routes.

## 4. Setup Marketing Server
- Create `marketing-server/src/index.ts` (simplified Express app).
- Ensure it loads the same `firebase.ts` (shared logic or copied).
- Configure it to run on a new port (e.g., **4001**).

## 5. Deployment Updates
- **Local**: Add `marketing-server` to `pm2` config or `package.json` scripts.
- **Nginx**: Update `nginx.conf` to route `/api/marketing/` traffic to port 4001.
    - `/api/marketing/podcast` -> `localhost:4001/podcast`
    - `/api/marketing/video-stitch` -> `localhost:4001/video-stitch`
- **Frontend**: Update Next.js `rewrites` or API routes to point to the new endpoints (already proxied via Nginx, so frontend code might just need URL path updates if we change the prefix).

## 6. Security Benefit
- If `marketing-server` gets flagged/suspended for heavy video processing or SSRF, the `auth-server` (Login, user data) remains ALIVE.

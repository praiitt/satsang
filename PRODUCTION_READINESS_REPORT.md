# Production Readiness Report — Web App + Auth Server + Marketing Server

**Date:** 2026-05-20
**Repo:** `/Users/prakash/Documents/satsang/satsangapp`
**Branch:** `production` (latest commit `8c4d425a`)
**Scope (confirmed):** Next.js web app at repo root · `auth-server` · `marketing-server`
**Out of scope:** astrology backend, mobile, livekit agents, coin service, email service, whatsapp service

---

## Executive verdict

**Do not go live in the current state.** Six P0 findings block launch. The single most urgent one is that production secrets used by the three in-scope services are committed to git — rotate now, before fixing anything else. Once the P0 list is cleared and the P1 list is fixed, the three services are in a defensible position to launch. Realistic estimate from this state to "I'd ship this": **2–4 working days** of focused work, gated on rotation today.

---

## P0 — Blocking. Must fix before any production deployment.

### P0-1. Live secrets used by the in-scope services are committed to git

These tracked files contain credentials that the web app, auth-server, and/or marketing-server actually use:

| Tracked file | Why it's in scope |
|---|---|
| `ssl_11Dec/private.key` | **TLS private key for `rraasi.com`** — the production domain for the web app. Whoever has this can impersonate your site (MITM, phishing). |
| `.env.example` (repo root) | Contains real `LIVEKIT_API_KEY=APIQ6YKXhNedpie` and `LIVEKIT_API_SECRET=fK6iDjes…`. LiveKit secrets are server-side; the web app uses them to mint room tokens. |
| `frontend-env-final.yaml` | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_EGRESS_GCP_CREDENTIALS` (base64-encoded GCP credentials). Used to deploy the web app. |
| `frontend-env-b64.yaml` | Same — Cloud Run / Functions deploy yaml with secrets. |

These are out of scope as services but their secrets may be **shared accounts** with the in-scope services, so still treat as compromised until proven otherwise:

| Tracked file | What's in it |
|---|---|
| `astrology_backend/backend/production.env` | OpenAI key, Pinecone key, Razorpay live/test keys, MongoDB URI, Redis URL. If any of these accounts (especially Razorpay, OpenAI) are also used by the web app/auth-server/marketing-server, rotation is mandatory. |
| `astrology_backend/backend/src/serviceAccountKey.json` | Firebase Admin SDK key for project `rraasi`. Frontend deploys to project `rraasi-8a619` (per `cloudbuild.yaml`) — different project, but verify nothing under your account links the two. |
| `astrology_backend/backend/env.example` | Real OpenAI key, identical to production.env above. |

**What you must do (only you can do these):**

1. **Rotate today, before anything else:**
   - Reissue the `rraasi.com` TLS cert (the private key is exposed → the cert is effectively burned). Order new key + new cert from your CA. Mandatory.
   - Rotate LiveKit API key + secret in the LiveKit dashboard. Also rotate the GCP service account behind `LIVEKIT_EGRESS_GCP_CREDENTIALS`.
   - Confirm Razorpay/OpenAI/Firebase keys in the astrology files aren't shared with the in-scope services. If they are (very likely for Razorpay and OpenAI, since this is one business), rotate those too.
2. Check provider logs (LiveKit usage, OpenAI usage, Razorpay activity, Firebase auth logs) for unauthorized activity since the commits landed.
3. Confirm whether this repo has ever been on a public remote. If yes, assume scraped.

**What I will do once you say "rotated":**

- Remove tracked secret files from the working tree (replace `.env.example` with a redacted version).
- Add coverage to `.gitignore` so it can't recur (currently `.env*` is ignored except `!.env.example`, which is what bit you — example file has real keys).
- Optional: rewrite git history with `git filter-repo`. Tell me yes/no.

### P0-2. The web app's `pnpm start` will crash

`package.json` line 8: `"start": "node server.js"`, but there's no `server.js` at the repo root. With `output: 'standalone'` (`next.config.ts:4`), Next generates `server.js` inside `.next/standalone/`. The Dockerfile correctly copies that file into the image and runs it from there, so **Cloud Run is fine**. But the `ecosystem.monolith.config.cjs` PM2 config runs `npm start` from the repo root for the `frontend` app, which will fail immediately.

If you only use Cloud Run for the web app, this is downgraded to P1. If anyone might run `pnpm start` (VM, ops on call, doc), fix it.

**Fix:** change root `start` to `next start -p 3000`, or document clearly that the production entry is `.next/standalone/server.js`. Update PM2 config to match.

### P0-3. TypeScript and ESLint errors silenced in production builds

`next.config.ts:5–14`:
```ts
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```
Type errors that should fail the build become runtime crashes. Re-enable both and fix whatever fails. This is a one-time bandage that has stayed in.

### P0-4. `OPENAI_API_KEY` baked into the web app Docker image

`Dockerfile` lines 32 (`ARG OPENAI_API_KEY`), 40 and 73 (`ENV OPENAI_API_KEY=$OPENAI_API_KEY`). The key is **baked into a Docker image layer**, which means anyone with pull access to `gcr.io/$PROJECT_ID/satsang-frontend` gets the key.

**Fix:** delete the ARG + both ENV lines. Inject `OPENAI_API_KEY` at runtime via Cloud Run `--set-secrets=OPENAI_API_KEY=projects/$PROJ/secrets/openai-key:latest` (Secret Manager). Also move all server-side keys to Secret Manager — there's no reason to pass them via `--set-env-vars` as `cloudbuild.yaml` does today.

### P0-5. Firestore rule logic is broken — anonymous writes allowed (affects web app)

`firestore.rules:7`:
```
allow create: if request.auth != null || true;
```
`|| true` short-circuits the check. **Anyone — signed in or not — can create documents in `customGuruIntents`.** The web app uses Firestore, so this is reachable from the public internet. Open spam target.

**Fix:** either `allow create: if request.auth != null;` (drop anonymous), or if anonymous submit is intentional, `allow create: if true;` *plus* strict `request.resource.data.keys()` validation, size caps, and App Check enforcement. Pick one.

### P0-6. Storage rule lets any logged-in user overwrite anyone's track (affects web app)

`storage.rules:11–16`:
```
match /music-tracks/{trackId}/{fileName} {
  allow read: if true;
  allow write: if request.auth != null;
}
```
No ownership check. Any authenticated user can overwrite any other user's music file. Combined with the Firestore rule that lets all authenticated users read `music_tracks`, you have a trivial griefing/abuse vector.

**Fix:** require ownership. Easiest: store the owner uid in the document path (e.g. `music-tracks/{uid}/{trackId}/{fileName}`) and write `allow write: if request.auth.uid == uid`. Or look up the owner via Firestore in the rule. Add a size cap: `request.resource.size < 50 * 1024 * 1024`.

### P0-7. Critical-severity npm vulnerabilities in production deps of all three services

`npm audit --omit=dev` results:

| Service | Total | Critical | High |
|---|---|---|---|
| Web app (root) | 27 | 3 | 9 |
| auth-server | 22 | 2 | 5 |
| marketing-server | 18 | 2 | 4 |

Notable:
- **`jspdf <=4.2.0` (web app):** PDF Injection allowing **arbitrary JavaScript execution in generated PDFs**, multiple DoS and injection advisories. You generate PDFs for users — direct exploit surface.
- **`fast-xml-parser <=5.6.0` (web app):** critical entity-encoding bypass, stack overflow.
- **`lodash-es <=4.17.23` (web app):** code injection via `_.template`, prototype pollution.
- **`axios 1.0.0–1.15.1` (marketing-server):** has known CVEs in that range — bump to >= 1.16 (or latest).
- **`fast-uri` (marketing-server):** path-traversal via percent-encoded dot segments.

**Fix:** in each of the three folders, run `pnpm update jspdf fast-xml-parser axios` (and root: `pnpm audit fix`). Smoke-test build + boot afterwards. I'll do this with you in the loop on majors.

---

## P1 — High. Fix before launch or accept measurable risk.

### P1-1. No security headers on the web app

`next.config.ts` only sets permissive CORS on `/_next/*`. Missing: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. For a payment-handling site (Razorpay live key in `components/ui/upgrade-modal.tsx`), this is below the minimum bar.

**Fix:** add a `headers()` block. CSP needs allowlist for Firebase, LiveKit, Razorpay, Suno, Google Storage, your own domains. I'll draft when you give the word.

### P1-2. Marketing-server webhooks accept anything — no signature verification

`marketing-server/src/routes/webhooks.ts`:
- `POST /webhooks/heygen` — no signature check.
- `POST /webhooks/vobiz` — no signature check.

`marketing-server/src/routes/twilio-bot.ts:131`: `router.post('/twiml', …)` — no `twilio.validateRequest` against `X-Twilio-Signature`.

`marketing-server/src/routes/twilio-whatsapp.ts:8`: `router.post('/incoming', …)` — same.

Anyone on the internet can POST fake webhook payloads to trigger your handlers (create leads, send WhatsApp messages, charge actions). With no rate limiting (P1-3), this is exploitable.

**Fix:** verify HMAC signatures on every public webhook. Twilio: `twilio.validateRequest(authToken, header, url, params)`. Facebook/Meta: validate `X-Hub-Signature-256`. HeyGen and Vobiz: check their docs for HMAC; if none, fall back to a shared secret in the URL path + IP allowlist.

### P1-3. No rate limiting and no helmet on either backend

Zero references to `express-rate-limit` or `helmet` in `auth-server` or `marketing-server`. Endpoints that need particular protection:
- `auth-server`: `/auth/check-phone`, `/auth/sessionLogin`, `/coins/*`, `/suno/*` (paid downstream), `/fal/*` (paid downstream), `/livekit/*` (token mint).
- `marketing-server`: every webhook, plus `/leads`, `/twilio-*`, `/facebook-leads/bulk-send-whatsapp` (mass-send).

An attacker can hammer login or OTP, or burn your Suno/Fal/Twilio/OpenAI quota.

**Fix:** `app.use(helmet())` globally on both. `express-rate-limit` per-route (5/min for OTP, 20/min for token mint, 60/min general).

### P1-4. Marketing-server accepts 50MB request bodies

`marketing-server/src/index.ts:41–42`:
```ts
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```
Default is 100KB. 50MB is a DoS amplifier — a few concurrent attackers can pin memory on a Cloud Run instance and force scale-out (= cost).

**Fix:** scope large limits to the specific routes that need them (video stitch upload, maybe transcripts). Keep default 100KB or 1MB elsewhere.

### P1-5. CORS defaults to `*` in both backends

`auth-server/src/index.ts:62`: `const ORIGIN = process.env.CORS_ORIGIN || '*';`
`marketing-server/src/index.ts:35`: same pattern.

With `credentials: true` and reflected origin, this is a CSRF accelerant. Today both services are fronted by Cloud Run with the rewrite paths in `firebase.json`/`next.config.ts`, so the effective origin is your domain — but the *code* defaults are wrong.

**Fix:** in production, fail-closed. Throw on boot if `NODE_ENV === 'production'` and `CORS_ORIGIN` is unset. Set `CORS_ORIGIN=https://rraasi.com,https://www.rraasi.com` explicitly in Cloud Run env.

### P1-6. No global error handler middleware in either backend

No `app.use((err, req, res, next) => …)` in `auth-server/src/index.ts` or `marketing-server/src/index.ts`. Unhandled async errors will either:
- Return Express's default HTML error page with stack trace, or
- Crash the process (Cloud Run will restart it, but the request fails).

**Fix:** add a final error middleware that logs full detail and returns a safe `{error: 'internal'}`. Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` to log + exit cleanly.

### P1-7. No observability — no Sentry, no APM, ~hundreds of raw console statements

Nothing in the three in-scope services references Sentry/Datadog/NewRelic/Honeycomb. When a user hits an error in production, you'll find out from a support ticket.

**Fix:** add Sentry to all three. Cheap, fast, immediate visibility. ~30 min per service.

### P1-8. Dockerfile uses `--no-frozen-lockfile`

`Dockerfile:43`: `pnpm install --no-frozen-lockfile`. Non-deterministic builds — what ships can drift from what you tested.

**Fix:** `--frozen-lockfile`. If it fails today, regenerate the lockfile cleanly.

### P1-9. CI does not exercise the deploy path

`.github/workflows/build-and-test.yaml` runs lint + format + build only. No tests anywhere — `find -name "*.test.*"` returns 0 in source. Every deploy is a coin flip.

**Fix:** add a minimal smoke job: build the Docker image, boot it, curl `/api/...` health-equivalent. Add route tests for the critical paths: `/api/auth/sessionLogin`, `/api/livekit/map-session`, Razorpay-related routes.

### P1-10. `.dockerignore` is duplicated and missing important entries

Lines 11–24 list `mobile_app`, `livekit_server`, `astrology_backend`, `auth-server`, `marketing-server` three times. Missing: `*.md`, `.env*`, `*ServiceAccount*.json`, `ssl_*/`, `dowloaded_mp3_suno/`, `*.mp4`, `logs/`, `.firebase/`, `frontend-env-*.yaml`. The mp4s alone are ~50 MB being shipped into your build context.

### P1-11. PM2 monolith config invokes broken script (only matters if you use the VM path)

`ecosystem.monolith.config.cjs` runs `npm start` for the `frontend` app, which fails (P0-2). If you're 100% on Cloud Run, delete or fix the file.

### P1-12. No Cloud Run resource caps

`cloudbuild.yaml:38–47` has no `--max-instances`, `--min-instances`, `--concurrency`, `--memory`, `--cpu`, `--timeout`. Defaults are usually fine for low traffic, but you have **no cost ceiling** — a bot loop can run up a bill. Set explicit `--max-instances=10`, `--memory=1Gi`, `--cpu=1`, `--concurrency=80`, `--timeout=60s` and adjust from there.

### P1-13. `:latest` Docker tag, no rollback story

`cloudbuild.yaml` builds and pushes `:latest`. If a deploy breaks, you can't roll back to the previous image without rebuilding. Tag with `$SHORT_SHA` (and additionally `:latest`).

### P1-14. Stale working tree

`git status` shows 20 untracked/modified files. Before any production deploy you want the SHA you ship to match what's reviewable.

---

## P2 — Medium. Fix soon; not strictly launch-blocking.

- **No structured logger.** ~661 raw `console.log/error/warn` calls across the in-scope backends. Replace with `pino` so prod logs are structured JSON (Cloud Logging will then index them).
- **`cors.json` (Cloud Storage) is `origin: ["*"]`.** Acceptable for public assets; tighten if you serve sensitive uploads.
- **Firestore rules cover only three collections** (`customGuruIntents`, `music_tracks`, `users`). Default-deny is correct, but audit every collection the auth-server and marketing-server write against to confirm rules match intent — if the client never reads/writes them directly, no rule is needed.
- **`next.config.ts:89–92` prints internal URLs to build logs.** Not secret, just noise.
- **Mixed package managers at root.** Both `pnpm-lock.yaml` and `package-lock.json` present. Pick pnpm (your CI already uses it).
- **`tsconfig.tsbuildinfo` (2.6 MB) committed.** Add to `.gitignore`.
- **Hardcoded Razorpay live key id in `components/ui/upgrade-modal.tsx:118` and `:185`** (`rzp_live_RxIBquY93WqdKX`). The `key_id` is meant to be public, but pull it from env so test/live can switch without code edit.
- **Marketing-server health check is only at `/podcast/health`.** Add a top-level `GET /` or `GET /health` so Cloud Run / monitoring can probe without poking podcast.

---

## P3 — Low / cleanup

- Many ad-hoc `test-*.js`, `test-*.ts` scripts at the repo root — move to `scripts/` or delete.
- `output_aura*.mp4`, `output_simulation.mp4`, `Satsang_anandamayi_ma_*.mp4` (~50 MB combined) shouldn't be in git. Git LFS or external storage.
- `curl_error.json`, `page1.json`, `page2.json` — debug dumps left behind.
- ~48 top-level Markdown handover docs. Move to `docs/`.
- `.gitignore:258` ignores `rraasi_mobile_react_native/` but it's still tracked.

---

## Recommended go-live sequence

Strict ordering — don't skip ahead.

1. **Today (you):** rotate every credential listed in P0-1. Reissue the rraasi.com TLS cert. Tell me when done.
2. **Today (me, on your word):** remove tracked secret files, regenerate redacted `.env.example` / `serviceAccountKey.example.json`, tighten `.gitignore`. Optional: rewrite git history.
3. **Day 1 (me):** P0-2 (`server.js`), P0-3 (TS/ESLint), P0-4 (Cloud Run secrets for `OPENAI_API_KEY` + others), P0-5 + P0-6 (rules), P0-7 (dependency updates in all three services + smoke build).
4. **Day 2 (me):** P1-1 (security headers), P1-2 (webhook signatures), P1-3 (rate limit + helmet), P1-4 (body limit), P1-5 (CORS fail-closed), P1-6 (global error handlers).
5. **Day 3 (me + you):** P1-7 (Sentry — needs your DSNs), P1-8 → P1-14 (dockerignore, healthcheck, frozen lockfile, Cloud Run caps, immutable tags, clean tree).
6. **P2 / P3** can ride along or follow.

Realistic estimate: **2–4 working days** of focused work after rotation. Slightly faster than the original estimate because three services dropped out of scope.

---

## What I need from you to proceed

Reply with the ones you approve:

1. **"Rotated"** — you've rotated everything in P0-1 (TLS cert, LiveKit, plus any shared keys with the astrology env). I then remove the tracked files and tighten `.gitignore`.
2. **"Scrub history" — yes/no.** Rewriting git history (`git filter-repo`) erases the secrets from past commits but rewrites SHAs; anyone with a clone must re-clone. Tell me yes/no, and whether you have collaborators.
3. **"Drive the fix list"** — confirm I should execute the P0 → P1 sequence above, asking only for credentials, DNS, and Cloud Run access. I check in before anything destructive (history rewrite, mass dependency major bumps).

Until I hear back, I won't change a file.

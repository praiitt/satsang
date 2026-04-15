# Auth Server API Handover Document

*Note to User: Copy and paste the contents below into Claude or share it with the team to provide complete context of the Auth Server (Node.js/Express) built for the Satsang App.*

---

**System Prompt:**
Act as a Senior Backend Developer / API Custodian. I am handing over the technical context of our `auth-server`, which powers the Satsang App. 

Your goal is to digest this API surface area. Please read the document thoroughly, acknowledge the routes and architecture, and wait for my instructions (such as generating frontend API client code, writing tests, or extending an endpoint).

---

## 1. Technical Architecture
- **Framework:** Node.js, Express.js, TypeScript.
- **Hosting:** Configured to run locally via `app.listen()` and exported as a Google Cloud Function (`http('authServer', ...)` for Cloud Functions Gen 2 / Cloud Run).
- **Authentication:** Firebase Admin SDK (used in `requireAuth` middleware).
- **CORS:** Configured dynamically via `CORS_ORIGIN` env var. Allows credentials (`credentials: true`).
- **Middleware details:** Uses `express.json()`, `cookie-parser`, and contains a custom query string polyfill specifically because Cloud Functions sometimes strips or mismanages query parameters. The environment relies on `.env.local` primarily or standard `.env`.

---

## 2. Global Base Routes
All routes are mounted onto a main router, which is exposed at two base paths:
- `/`
- `/satsang-auth-server` (Rewrite path for Gateway/Load Balancer)

**Health/Status Checks:**
- `GET /` -> Returns `{ name: "satsang-auth-server", ok: true }`
- `GET /test-coins` -> Basic health check for server running status.

---

## 3. Core API Modules and Endpoints

### 🔐 Auth (`/auth`)
Handles core session management and Firebase custom claims.
- `GET /auth/health`
- `POST /auth/check-phone` (Verify Firebase phone auth)
- `POST /auth/sessionLogin` (Establish secure cookie session)
- `POST /auth/sessionLogout` (Clear secure cookie session)
- `GET /auth/me` (Get current authenticated user info)
- `POST /auth/claims` (Admin-only to set custom claims)

### 👤 User (`/user`)
Handles user profile, guru interactions, and external platform accounts.
- `GET /user/list`
- `GET /user/profile`
- `POST /user/gurus/:guruId/follow`
- `DELETE /user/gurus/:guruId/follow`
- `POST /user/gurus/:guruId/favorite`
- `DELETE /user/gurus/:guruId/favorite`
- **Integrations:**
  - `POST /user/platforms/youtube/connect` & `GET /user/platforms/youtube/callback`
  - `POST /user/platforms/soundcloud/connect` & `GET /user/platforms/soundcloud/callback`
  - `DELETE /user/platforms/:platform/disconnect`
  - `GET /user/platforms` (List connected platforms)

### 🧘 Meditation (`/meditation`)
Handles user meditation sessions, mood tracking, and music.
- `GET /meditation/sessions` (Fetch session history)
- `GET /meditation/sessions/:id` (Fetch specific session)
- `POST /meditation/sessions` (Create a new session)
- `PATCH /meditation/sessions/:id/mood` (Update post-meditation mood)
- `GET /meditation/stats` (Fetch user stats)
- `GET /meditation/playlists`, `POST /meditation/playlists`
- `GET /meditation/music/recommended`

### 🎵 Suno & AI Music (`/suno`)
Handles AI music generation (Suno API), tracks management, and video generation.
- `GET /suno/tracks` (Public tracks)
- `GET /suno/my-tracks` (Authed user tracks)
- `GET /suno/community-tracks`
- `POST /suno/publish` (Publish a track)
- `POST /suno/publish/bulk`
- `POST /suno/sync` (Sync track status)
- `POST /suno/generate-video` & `POST /suno/callback/video` (Generate video for track)
- `POST /suno/callback` (General async callback handling)

### 💰 Coins / Virtual Currency (`/coins`)
Manages the in-app economy for agent sessions.
- `GET /coins/health`
- `GET /coins/balance` (Get current balance)
- `POST /coins/deduct-session` (Deduct coins for an AI session)

### 🎴 Tarot predictions (`/tarot`)
- `POST /tarot/predictions` (Generate a Tarot prediction)

### 🎙️ LiveKit / RTC (`/livekit` & `/livekit-webhook`)
Manages WebRTC rooms and events via LiveKit.
- `POST /livekit/map-session` (Create/map a session token)
- `GET /livekit/session/:roomName` (Retrieve room session details)
- `POST /livekit-webhook` (Listens for LiveKit room and participant events)

### 🗂️ Playlists (`/playlists`)
CRUD operations for music playlists.
- `GET /playlists/:userId` (List playlists)
- `GET /playlists/details/:id` (Playlist payload)
- `POST /playlists` (Create playlist)
- `POST /playlists/:id/tracks` (Add track)
- `DELETE /playlists/:id/tracks` (Remove track)

### 🏢 Corporate / Multi-Tenant (`/corporate`)
Manages B2B organizations and invites.
- `POST /corporate/create` (Create org)
- `GET /corporate/:orgId`
- `POST /corporate/:orgId/invite` (Send invite to org)
- `POST /corporate/join` (Accept invite)

### 💌 Marketing (`/marketing`)
WhatsApp notifications and marketing logs via Twilio.
- `POST /marketing/welcome`
- `POST /marketing/whatsapp/generate`
- `POST /marketing/whatsapp/send-bulk`
- `GET /marketing/logs`

### 💬 Chat (`/chat`)
- `GET /chat/history`
- `GET /chat/recordings`
- `GET /chat/feed`

---

## 4. Development Notes
1. **Authorization:** Many endpoints use `requireAuth` middleware explicitly (e.g., `router.get('/me', requireAuth, ...)`).
2. **Environment configuration:** Before running locally, ensure `.env.local` contains all credentials for Firebase, Twilio, Suno, LiveKit, and Cloud Storage.
3. **Payloads:** Use `express.json()` unless intercepting raw Webhook data (like LiveKit Webhooks might require depending on the deployment platform, handled specifically inside the http fallback function block).

---

*(Claude: Please reply with "Acknowledged. I understand the Auth Server API surface area. What would you like me to do with this codebase?")*

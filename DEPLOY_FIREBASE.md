# Deploying the Next.js app to Firebase Hosting (with SSR)

This project uses Next.js (App Router). Firebase Hosting can deploy it with SSR via the Frameworks integration.

## One-time setup

1. Install the Firebase CLI (requires Node.js):
   ```bash
   npm i -g firebase-tools
   ```

2. Login and choose your Firebase project:
   ```bash
   firebase login
   firebase projects:list
   # Note your Project ID (e.g., my-satsang)
   ```

3. Initialize Firebase Hosting with Frameworks support from the project root:
   ```bash
   firebase init hosting
   # Choose: Use an existing project → select your project
   # When asked about frameworks, choose: Yes → Next.js
   # Accept defaults, or choose the region for SSR (e.g., us-central1)
   ```

This will create/update `firebase.json`, `.firebaserc`, and a `.firebase` directory.

## Build and deploy

- Ensure a production build succeeds first:
  ```bash
  pnpm build
  ```

- Deploy to Firebase:
  ```bash
  firebase deploy
  ```

## Maintenance mode (optional)

To show a global maintenance page, set the environment variable before starting the app:

```bash
# .env.local
MAINTENANCE_MODE=true
```

- API routes and static assets remain available.
- To disable, remove the variable or set `MAINTENANCE_MODE=false` and redeploy.

## Notes
- SSR deployment uses Cloud Functions behind the scenes. Billing must be enabled on your Firebase project.
- If you see rate limits or cold starts, consider upgrading your plan or adjusting function region.
- For CI/CD, generate a token: `firebase login:ci` and set `FIREBASE_TOKEN` in your CI environment.



---
description: Fix Authentication on Custom Domain (Firebase Hosting Cookie Issue)
---

# Fix Authentication on Custom Domain

If users can log in on the direct Cloud Run/App Engine URL but appear logged out on the custom domain (`rraasi.com`), it is likely because Firebase Hosting is stripping the session cookie.

## Steps to Fix

1. **Verify Cookie Name**
   Identify the cookie name used in `auth-server/src/middleware/auth.ts` and `marketing-server/src/middleware/auth.ts`.

2. **Rename to __session**
   Ensure the `SESSION_COOKIE_NAME` is set to exactly `__session`. 
   
   ```typescript
   const SESSION_COOKIE_NAME = '__session';
   ```

3. **Update Middleware/Auth**
   Confirm that the `cookie-parser` and `res.cookie` calls use this name correctly across all services.

4. **Redeploy Backends**
   - For Auth Server: `python3 scripts/deploy_auth_corrected.py`
   - For Marketing Server: (Appropriate deploy script)

5. **User Action**
   Tell the user to clear their browser cookies for the custom domain and try logging in again.

## Rationale
Firebase Hosting's CDN only passes the `__session` cookie to backends for security and caching reasons. Any other cookie name is removed before the request reaches your server.

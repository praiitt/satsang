# How to Get Spotify Refresh Token

## Quick Method (Easiest)

1. **Make sure your redirect URI is set in Spotify Dashboard:**
   - Go to https://developer.spotify.com/dashboard
   - Select your app
   - Click "Edit Settings"
   - Add redirect URI: `https://satsang.rraasi.com/api/spotify/callback`
   - Save

2. **Visit the authorization URL in your browser:**
   ```
   https://accounts.spotify.com/authorize?response_type=code&client_id=65136cefd17d48ffb4c7d6ca07dd533f&scope=user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20streaming%20user-read-email%20user-read-private&redirect_uri=https://satsang.rraasi.com/api/spotify/callback&state=xyz&show_dialog=true
   ```

3. **After authorization, you'll be redirected to:**
   ```
   https://satsang.rraasi.com/api/spotify/callback?code=ACTUAL_CODE_HERE&state=xyz
   ```

4. **Copy the `code` parameter from the URL** (the long string after `code=`)

5. **Exchange the code for tokens using curl:**
   ```bash
   curl -X POST https://accounts.spotify.com/api/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -H "Authorization: Basic $(printf '%s' '65136cefd17d48ffb4c7d6ca07dd533f:ea9d1474251b460ea358ce146afe2a44' | base64)" \
     -d "grant_type=authorization_code" \
     -d "code=ACTUAL_CODE_HERE" \
     -d "redirect_uri=https://satsang.rraasi.com/api/spotify/callback"
   ```

6. **You'll get a JSON response with `refresh_token`** - copy that value

7. **Add to your `.env.local`:**
   ```
   SPOTIFY_REFRESH_TOKEN=your_refresh_token_here
   ```

## Using the Helper Script

Run the automated script:
```bash
./get-spotify-refresh-token.sh
```

This will:
- Read your credentials from `.env.local`
- Generate the authorization URL
- Guide you through the process
- Exchange the code for tokens
- Optionally add the refresh token to `.env.local`

## Important Notes

- **Redirect URI must match exactly** what's in Spotify Dashboard
- The redirect URI should be: `https://satsang.rraasi.com/api/spotify/callback` (not `/backend/api/spotify`)
- Replace `ACTUAL_CODE_HERE` with the real code from the redirect URL
- The refresh token doesn't expire (unless revoked)
- You only need to do this once


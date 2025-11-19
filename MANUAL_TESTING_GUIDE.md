# Manual Testing Guide: Podcast Feature

This guide walks you through testing the two-avatar podcast feature manually.

## Prerequisites

1. **Servers Running**
   - Auth Server: `http://localhost:4000`
   - Next.js Frontend: `http://localhost:3000`

2. **HeyGen API Key**
   - You need a HeyGen API key
   - Get it from: https://app.heygen.com → Settings → API
   - Set it in `auth-server/.env`: `HEYGEN_API_KEY=your_key_here`

3. **HeyGen Avatar IDs**
   - You need at least 2 HeyGen avatar IDs (one for host, one for guest)
   - You can find them in HeyGen dashboard or use the API to list avatars
   - Example: `avatar_abc123` or `photo_xyz789`

## Step-by-Step Testing

### Step 1: Start the Servers (if not running)

```bash
# Terminal 1: Start Auth Server
cd auth-server
pnpm dev

# Terminal 2: Start Next.js Frontend
cd ..
pnpm dev
```

Verify servers are running:
- Auth Server: http://localhost:4000 (should show `{"name":"satsang-auth-server","ok":true}`)
- Frontend: http://localhost:3000

### Step 2: Open the Podcast Page

1. Open your browser and navigate to:
   ```
   http://localhost:3000/marketing/podcast
   ```

2. If you're not logged in, you'll need to authenticate first
   - The page should show a login form or redirect to login
   - Complete the login flow

### Step 3: Enter Avatar IDs

In the podcast page form:

1. **Host Avatar ID**: Enter a valid HeyGen avatar ID
   ```
   Example: avatar_abc123
   ```

2. **Guest Avatar ID**: Enter a different HeyGen avatar ID
   ```
   Example: avatar_xyz789
   ```

### Step 4: Create Conversation Script

The page should show default turns (host and guest). You can:

1. **Edit existing turns**: Click on the text and modify
   ```
   Turn 1 (Host): नमस्ते! आज के satsang podcast में आपका स्वागत है।
   Turn 2 (Guest): धन्यवाद! यहाँ आकर बहुत अच्छा लग रहा है।
   ```

2. **Add more turns**: Click "Add Turn" button
   - New turns alternate between host and guest automatically

3. **Remove turns**: Click the "Remove" button on any turn

4. **Change speaker**: Use the dropdown to switch between "host" and "guest"

### Step 5: Create Podcast Job

1. Click the **"Create Podcast Job"** button

2. **Expected behavior**:
   - Button becomes disabled
   - Loading indicator appears
   - A job ID should appear below the form
   - Status shows as "queued" or "processing"

3. **If there's an error**:
   - Check browser console (F12 → Console tab)
   - Check auth-server logs: `tail -f /tmp/auth-server.log`
   - Common issues:
     - Not authenticated (login required)
     - Invalid HeyGen API key
     - Invalid avatar IDs
     - Network error

### Step 6: Monitor Job Status

1. The page automatically polls for status updates every 5 seconds

2. **Status stages**:
   - `queued`: Job created, waiting to start
   - `processing`: HeyGen is generating avatar videos for each turn
   - `ready`: All clips are generated and ready
   - `failed`: Something went wrong

3. **Individual turn status**:
   - Each turn (dialogue line) has its own status
   - You'll see which turns are `queued`, `processing`, `ready`, or `failed`
   - When a turn is `ready`, it shows a `videoUrl`

### Step 7: View Generated Videos

Once status becomes `ready`:

1. **Option 1: Open All Clips**
   - Click **"Open All Clips"** button
   - Opens all video URLs in separate tabs (in order)
   - You can play them sequentially to see the podcast conversation

2. **Option 2: Individual Clips**
   - Each turn shows a "Open clip" button when ready
   - Click to open that specific video in a new tab

3. **Expected result**:
   - Each turn should be a video of the specified avatar speaking that dialogue
   - Host turns = host avatar speaking
   - Guest turns = guest avatar speaking
   - Play them in order for the full podcast experience

### Step 8: Refresh Status (Manual)

If auto-polling isn't working:

1. Click **"Refresh Status"** button
2. This manually fetches the latest job status from the server

## Testing Checklist

- [ ] Servers are running (auth-server on 4000, Next.js on 3000)
- [ ] Can access `/marketing/podcast` page
- [ ] Can log in (if authentication required)
- [ ] Can enter host and guest avatar IDs
- [ ] Can edit/add/remove conversation turns
- [ ] Can submit the form and create a job
- [ ] Job ID appears after submission
- [ ] Status updates from `queued` → `processing` → `ready`
- [ ] Individual turn statuses update correctly
- [ ] Video URLs appear when turns are `ready`
- [ ] Can open and play video clips
- [ ] Videos show correct avatar speaking correct dialogue

## Troubleshooting

### Error: "Not authenticated" or 401
- **Solution**: Make sure you're logged in
- Check if session cookie is set in browser
- Try logging in again

### Error: "HeyGen API key not set"
- **Solution**: Add `HEYGEN_API_KEY=your_key` to `auth-server/.env`
- Restart auth-server

### Error: "Invalid avatar ID"
- **Solution**: Verify avatar IDs are correct
- Check HeyGen dashboard for valid avatar IDs
- Avatar IDs should be strings like `avatar_abc123`

### Status stuck on "processing"
- **Solution**: Check HeyGen API status
- Check auth-server logs for errors
- HeyGen videos can take 1-5 minutes to generate
- Try refreshing status manually

### No video URLs appear
- **Solution**: Check if HeyGen API returned video URLs
- Look at browser network tab (F12) to see API responses
- Check auth-server logs for HeyGen API responses

### Videos don't play
- **Solution**: Check if video URLs are accessible
- HeyGen videos might require authentication
- Copy video URL and try opening directly in browser

## API Testing (Alternative)

If you want to test the API directly without the UI:

```bash
# 1. Get your session cookie (after logging in via browser)
# Open browser DevTools → Application → Cookies → Copy session cookie value

# 2. Create a podcast job
curl -X POST http://localhost:4000/podcast \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "hostAvatarId": "avatar_abc123",
    "guestAvatarId": "avatar_xyz789",
    "turns": [
      { "speaker": "host", "text": "Welcome to the podcast!" },
      { "speaker": "guest", "text": "Thank you for having me!" }
    ]
  }'

# 3. Check job status (replace JOB_ID from response above)
curl -X GET http://localhost:4000/podcast/JOB_ID \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

## Next Steps

Once basic testing works:
- Try with longer conversations (5+ turns)
- Test error handling (invalid avatar IDs, network errors)
- Test with different languages (if HeyGen supports them)
- Test concurrent jobs (create multiple podcasts)
- Test edge cases (very long text, empty turns, etc.)


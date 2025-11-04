# Fix Hindi STT Recognition - The Real Solution

## Problem Identified

**YES, the chat IS showing LiveKit STT interpretation** - and it's failing badly because AssemblyAI is not well-trained for Hindi speech, especially Indian accents.

Your speech examples like:

- "Mabel kultiku" (garbled)
- "Imaiski baraman jana chata" (should be something like "India ke bare mein janna chahta")

This proves AssemblyAI is struggling with Hindi pronunciation.

## 🎯 BEST Solution: Use Sarvam STT

**Sarvam is specifically designed for Indian languages** and will give you MUCH better Hindi recognition!

### Step 1: Install Sarvam Plugin

On your server, run:

```bash
cd ~/satsang/livekit_server/agent-starter-python

# Install Sarvam plugin
uv pip install "livekit-agents[sarvam]~=1.2"
```

### Step 2: Get Sarvam API Key

1. Go to: https://sarvam.ai/ (or search "Sarvam AI")
2. Sign up for an account
3. Get your API key from the dashboard

### Step 3: Configure

Edit `.env.local`:

```bash
nano .env.local
```

Add:

```bash
STT_MODEL=sarvam
SARVAM_API_KEY=your_api_key_here
```

### Step 4: Restart

```bash
git pull origin main  # Get latest code with Sarvam support
pm2 restart satsang-livekit-agent
```

### Step 5: Test

You should see in logs:

```
Using Sarvam STT - BEST for Hindi/Indian languages!
```

Now speak in Hindi - you should see MUCH better transcriptions!

## Alternative: Deepgram (If Sarvam Not Available)

If Sarvam isn't available, try Deepgram:

```bash
# In .env.local:
STT_MODEL=deepgram/nova-2
```

Deepgram is better than AssemblyAI but not as good as Sarvam for Hindi.

## Why AssemblyAI Fails

1. **Not trained on Indian accents** - Most STT models are trained on Western English accents
2. **Poor Hindi phoneme recognition** - Doesn't understand Hindi pronunciation patterns
3. **Romanized output issues** - Struggles to convert Hindi sounds to English letters

## Why Sarvam Works Better

1. **Built for Indian languages** - Specifically trained on Hindi, Tamil, Telugu, etc.
2. **Understands Indian accents** - Designed for Indian English and Hindi speakers
3. **Better phoneme mapping** - Knows how Hindi sounds map to Romanized text
4. **Supports streaming** - You'll still see transcripts in real-time

## Expected Results After Fix

**Before (AssemblyAI):**

- You say: "मैं भारत के बारे में जानना चाहता हूं"
- STT shows: "Imaiski baraman jana chata" ❌

**After (Sarvam):**

- You say: "मैं भारत के बारे में जानना चाहता हूं"
- STT shows: "main bharat ke bare mein janna chahta hoon" ✅

Much more recognizable and the agent will understand it!

## Quick Setup Summary

```bash
# 1. Install Sarvam
cd ~/satsang/livekit_server/agent-starter-python
uv pip install "livekit-agents[sarvam]~=1.2"

# 2. Get API key from https://sarvam.ai/
# 3. Add to .env.local:
#    STT_MODEL=sarvam
#    SARVAM_API_KEY=your_key

# 4. Update code and restart
git pull origin main
pm2 restart satsang-livekit-agent
```

## Troubleshooting

### Sarvam not installing?

```bash
# Make sure you're in the right directory
cd ~/satsang/livekit_server/agent-starter-python

# Try with uv
uv pip install "livekit-agents[sarvam]~=1.2"

# Or with pip if uv fails
pip install "livekit-agents[sarvam]~=1.2"
```

### Check if Sarvam is working:

```bash
pm2 logs satsang-livekit-agent | grep "Sarvam"
```

Should see: "Using Sarvam STT - BEST for Hindi/Indian languages!"

### If Sarvam fails, check:

- API key is correct
- You have credits/quota in Sarvam account
- Check logs for specific errors

## Next Best Options

If Sarvam doesn't work:

1. **Deepgram**: `STT_MODEL=deepgram/nova-2` - Better than AssemblyAI
2. **Google Cloud**: `STT_MODEL=google/cloud` - Excellent but requires GCP setup

## Why This Will Fix Your Issue

Your problem is **NOT** with LiveKit or the agent - it's that **AssemblyAI STT is simply not good at Hindi**. By switching to Sarvam (designed for Indian languages), you'll get proper transcriptions that make sense!

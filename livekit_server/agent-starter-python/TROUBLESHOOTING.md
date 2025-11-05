# Troubleshooting Agent Timeout Issues

If you're experiencing `TimeoutError` during agent initialization, follow these steps:

## 1. Run the Diagnostic Script

First, run the diagnostic script to check your setup:

```bash
cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
source .venv/bin/activate
python check_setup.py
```

This will verify:
- Environment variables are loaded correctly
- Required Python packages are installed
- Network connectivity to API providers

## 2. Verify Sarvam Plugin Installation

If `STT_MODEL=sarvam`, you MUST install the Sarvam plugin:

```bash
cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
source .venv/bin/activate
pip install 'livekit-agents[sarvam]~=1.2'
```

Verify it's installed:

```bash
python -c "from livekit.plugins import sarvam; print('✅ Sarvam plugin installed')"
```

If you get an `ImportError`, the plugin is not installed.

## 3. Check Environment Variables Are Loaded

The agent loads `.env.local` automatically, but verify it's working:

```bash
cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
source .venv/bin/activate
python -c "
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env.local')
print('OPENAI_API_KEY:', 'SET' if os.getenv('OPENAI_API_KEY') else 'MISSING')
print('CARTESIA_API_KEY:', 'SET' if os.getenv('CARTESIA_API_KEY') else 'MISSING')
print('SARVAM_API_KEY:', 'SET' if os.getenv('SARVAM_API_KEY') else 'MISSING')
"
```

## 4. Verify File Location

Ensure `.env.local` is in the correct location:

```bash
ls -la /home/underlitigationcom/satsang/livekit_server/agent-starter-python/.env.local
```

The file should be at:
```
/home/underlitigationcom/satsang/livekit_server/agent-starter-python/.env.local
```

## 5. Test Network Connectivity

Check if your server can reach the API providers:

```bash
# Test OpenAI
curl -sS -o /dev/null -w "OpenAI: %{http_code}\n" https://api.openai.com/v1/models

# Test Cartesia
curl -sS -o /dev/null -w "Cartesia: %{http_code}\n" https://api.cartesia.ai

# Test Sarvam (if using Sarvam STT)
curl -sS -o /dev/null -w "Sarvam: %{http_code}\n" https://api.sarvam.ai
```

If any of these timeout or fail, check your firewall/network settings.

## 6. Check PM2 Logs

View detailed logs to see what's happening:

```bash
pm2 logs satsang-livekit-agent --lines 50
```

Look for:
- "Loaded .env.local from: ..." - confirms environment file is found
- "ENTRYPOINT: Starting agent initialization" - confirms entrypoint is called
- "OPENAI_API_KEY: SET" or "MISSING" - confirms environment variables are loaded
- Any error messages about missing packages or API keys

## 7. Common Issues and Solutions

### Issue: "Sarvam plugin not installed"
**Solution:**
```bash
source .venv/bin/activate
pip install 'livekit-agents[sarvam]~=1.2'
pm2 restart satsang-livekit-agent
```

### Issue: "OPENAI_API_KEY: MISSING"
**Solution:**
1. Verify `.env.local` exists and contains `OPENAI_API_KEY=...`
2. Check file permissions: `chmod 600 .env.local`
3. Restart PM2: `pm2 restart satsang-livekit-agent`

### Issue: Network timeouts
**Solution:**
1. Check firewall rules allow outbound HTTPS connections
2. Verify DNS resolution: `nslookup api.openai.com`
3. Check proxy settings if behind a corporate firewall

### Issue: File named `.emv` instead of `.env.local`
**Solution:**
```bash
cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
mv .emv .env.local  # If the file was misnamed
```

## 8. Restart PM2 After Fixes

After making any changes, restart PM2:

```bash
pm2 restart satsang-livekit-agent
pm2 logs satsang-livekit-agent --lines 100
```

## 9. If Still Failing

If the timeout persists after all checks:

1. **Temporarily switch to AssemblyAI STT** (more reliable):
   ```bash
   # In .env.local, change:
   STT_MODEL=assemblyai/universal-streaming
   # Remove or comment out:
   # STT_MODEL=sarvam
   ```

2. **Check PM2 process environment**:
   ```bash
   pm2 env 1  # Check if PM2 sees the environment variables
   ```

3. **Run agent directly (not via PM2)** to see full error output:
   ```bash
   cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
   source .venv/bin/activate
   python src/agent.py dev
   ```

This will show you the exact error without PM2's timeout wrapper.

## 10. Verify All Requirements

Final checklist:

- [ ] `.env.local` exists at correct location
- [ ] All API keys are set in `.env.local`
- [ ] Sarvam plugin installed (if `STT_MODEL=sarvam`)
- [ ] Network connectivity to API providers
- [ ] Python virtual environment activated
- [ ] PM2 restarted after changes


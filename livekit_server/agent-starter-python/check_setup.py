#!/usr/bin/env python3
"""
Diagnostic script to check agent setup and environment configuration.
Run this to verify that all required dependencies and environment variables are properly configured.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local from the project root
_ENV_PATH = (Path(__file__).resolve().parent / ".env.local")
if _ENV_PATH.exists():
    load_dotenv(str(_ENV_PATH))
    print(f"✅ Loaded .env.local from: {_ENV_PATH}")
else:
    print(f"❌ .env.local not found at: {_ENV_PATH}")
    sys.exit(1)

print("\n" + "="*60)
print("ENVIRONMENT VARIABLES CHECK")
print("="*60)

required_vars = {
    "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
    "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
    "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
    "CARTESIA_API_KEY": os.getenv("CARTESIA_API_KEY"),
    "STT_MODEL": os.getenv("STT_MODEL", "assemblyai/universal-streaming"),
    "TTS_VOICE_ID": os.getenv("TTS_VOICE_ID"),
}

if os.getenv("STT_MODEL") == "sarvam":
    required_vars["SARVAM_API_KEY"] = os.getenv("SARVAM_API_KEY")

all_present = True
for key, value in required_vars.items():
    if value:
        masked_value = value[:20] + "..." if len(value) > 20 else value
        print(f"✅ {key}: {masked_value}")
    else:
        print(f"❌ {key}: NOT SET")
        all_present = False

if not all_present:
    print("\n❌ Missing required environment variables!")
    sys.exit(1)

print("\n" + "="*60)
print("PYTHON PACKAGES CHECK")
print("="*60)

# Check for livekit-agents
try:
    import livekit.agents
    print(f"✅ livekit.agents: {livekit.agents.__version__ if hasattr(livekit.agents, '__version__') else 'installed'}")
except ImportError:
    print("❌ livekit.agents: NOT INSTALLED")
    sys.exit(1)

# Check for Sarvam plugin if STT_MODEL is sarvam
stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
if stt_model == "sarvam" or stt_model.startswith("sarvam"):
    try:
        from livekit.plugins import sarvam as sarvam_plugin
        print("✅ livekit.plugins.sarvam: INSTALLED")
        
        # Try to create STT instance to verify API key
        try:
            stt = sarvam_plugin.STT(language="hi")
            print("✅ Sarvam STT: Successfully initialized (API key valid)")
        except Exception as e:
            print(f"⚠️  Sarvam STT: Plugin installed but initialization failed: {e}")
            print("   This might indicate an invalid API key or network issue.")
    except ImportError:
        print("❌ livekit.plugins.sarvam: NOT INSTALLED")
        print("   Install with: pip install 'livekit-agents[sarvam]~=1.2'")
        sys.exit(1)
else:
    print(f"ℹ️  STT_MODEL is '{stt_model}' - Sarvam plugin not required")

# Check for OpenAI (for LLM)
try:
    import openai
    print(f"✅ openai: {openai.__version__ if hasattr(openai, '__version__') else 'installed'}")
except ImportError:
    print("⚠️  openai: NOT INSTALLED (may not be required if using inference.LLM)")

# Check for dotenv
try:
    import dotenv
    print(f"✅ python-dotenv: {dotenv.__version__ if hasattr(dotenv, '__version__') else 'installed'}")
except ImportError:
    print("❌ python-dotenv: NOT INSTALLED")
    sys.exit(1)

print("\n" + "="*60)
print("NETWORK CONNECTIVITY CHECK")
print("="*60)

import urllib.request
import ssl

def check_url(url, timeout=5):
    try:
        context = ssl.create_default_context()
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, context=context, timeout=timeout) as response:
            return response.status
    except Exception as e:
        return f"Error: {e}"

# Check OpenAI
openai_status = check_url("https://api.openai.com/v1/models", timeout=5)
if isinstance(openai_status, int):
    print(f"✅ OpenAI API: Reachable (HTTP {openai_status})")
else:
    print(f"⚠️  OpenAI API: {openai_status}")

# Check Cartesia
cartesia_status = check_url("https://api.cartesia.ai", timeout=5)
if isinstance(cartesia_status, int):
    print(f"✅ Cartesia API: Reachable (HTTP {cartesia_status})")
else:
    print(f"⚠️  Cartesia API: {cartesia_status}")

# Check Sarvam if STT_MODEL is sarvam
if stt_model == "sarvam" or stt_model.startswith("sarvam"):
    sarvam_status = check_url("https://api.sarvam.ai", timeout=5)
    if isinstance(sarvam_status, int):
        print(f"✅ Sarvam API: Reachable (HTTP {sarvam_status})")
    else:
        print(f"⚠️  Sarvam API: {sarvam_status}")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)

if all_present:
    print("✅ All required environment variables are set")
    print("✅ All required Python packages are installed")
    print("\nIf the agent is still timing out, the issue might be:")
    print("1. PM2 not loading .env.local (check ecosystem.config.cjs)")
    print("2. Network firewall blocking API connections")
    print("3. Invalid API keys (check with providers)")
    print("4. Python path issues when running via PM2")
else:
    print("❌ Some required configuration is missing. Please fix the issues above.")

print("\n" + "="*60)


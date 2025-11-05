#!/usr/bin/env python3
"""
Test script to verify child process can load environment variables.
This helps diagnose timeout issues during inference executor initialization.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

print(f"[TEST] PID: {os.getpid()}")
print(f"[TEST] Python: {sys.executable}")
print(f"[TEST] CWD: {os.getcwd()}")
print(f"[TEST] Script: {Path(__file__).resolve()}")

# Try to load .env.local
_ENV_PATHS = [
    Path(__file__).resolve().parent / ".env.local",
    Path.cwd() / ".env.local",
    Path("/home/underlitigationcom/satsang/livekit_server/agent-starter-python/.env.local"),
]

print(f"[TEST] Checking for .env.local...")
for _env_path in _ENV_PATHS:
    print(f"[TEST]   Checking: {_env_path} (exists: {_env_path.exists()})")
    if _env_path.exists():
        try:
            load_dotenv(str(_env_path), override=True)
            print(f"[TEST] ✅ Loaded .env.local from: {_env_path}")
            break
        except Exception as e:
            print(f"[TEST] ❌ Failed to load: {e}")

# Check environment variables
print(f"[TEST] Environment variables:")
print(f"[TEST]   OPENAI_API_KEY: {'SET' if os.getenv('OPENAI_API_KEY') else 'MISSING'}")
print(f"[TEST]   CARTESIA_API_KEY: {'SET' if os.getenv('CARTESIA_API_KEY') else 'MISSING'}")
print(f"[TEST]   SARVAM_API_KEY: {'SET' if os.getenv('SARVAM_API_KEY') else 'MISSING'}")
print(f"[TEST]   STT_MODEL: {os.getenv('STT_MODEL', 'NOT SET')}")

# Try to import critical modules
print(f"[TEST] Testing imports...")
try:
    import livekit.agents
    print(f"[TEST] ✅ livekit.agents imported")
except Exception as e:
    print(f"[TEST] ❌ Failed to import livekit.agents: {e}")
    sys.exit(1)

if os.getenv("STT_MODEL") == "sarvam":
    try:
        from livekit.plugins import sarvam
        print(f"[TEST] ✅ Sarvam plugin imported")
        
        # Try to create STT instance (this might hang if API key is invalid)
        print(f"[TEST] Attempting to create Sarvam STT instance...")
        stt = sarvam.STT(language="hi")
        print(f"[TEST] ✅ Sarvam STT instance created successfully")
    except ImportError as e:
        print(f"[TEST] ❌ Sarvam plugin not installed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[TEST] ❌ Failed to create Sarvam STT: {e}")
        sys.exit(1)

print(f"[TEST] ✅ All tests passed!")


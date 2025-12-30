import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add src to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "src"))

from astrology_api_client import get_api_client

async def test_tarot_api():
    # Load env
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    load_dotenv(env_path)
    
    client = get_api_client()
    if not client.user_id or not client.api_key:
        print("❌ API Credentials missing in .env.local")
        return

    print(f"🔮 Testing Tarot API for user: {client.user_id}...")
    
    try:
        # Test generic 'love' reading
        response = await client.get_tarot_predictions({"love": 1})
        
        if response:
            print("✅ API Call Successful!")
            print(f"Response: {response}")
        else:
            print("❌ API Call Returned None")
            
    except Exception as e:
        print(f"❌ API Call Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_tarot_api())

#!/usr/bin/env python3
"""
Debug script to manually simulate the Suno callback to test auth server processing.
This will help us understand if the callback endpoint is working correctly.
"""

import asyncio
import aiohttp
import json
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment
env_path = Path(__file__).parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)

AUTH_SERVER_URL = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
TEST_USER_ID = "test_user_callback_verification"

# This is the OFFICIAL payload structure from Suno API docs (docs.sunoapi.org)
CALLBACK_PAYLOAD = {
    "code": 200,
    "msg": "All generated successfully.",
    "data": {
        "callbackType": "complete",  # Can be: text, first, complete, or error
        "task_id": "5b4fcd068ad1bf9a94454e66c662a771",
        "data": [
            {
                "id": "36c27af3-fd0a-4181-90c8-fc2299d4fecd",
                "audio_url": "https://cdn1.suno.ai/36c27af3-fd0a-4181-90c8-fc2299d4fecd.mp3",
                "source_audio_url": "https://cdn1.suno.ai/36c27af3-fd0a-4181-90c8-fc2299d4fecd.mp3",
                "stream_audio_url": "https://musicfile.api.box/MzZjMjdhZjMtZmQwYS00MTgxLTkwYzgtZmMyMjk5ZDRmZWNk",
                "source_stream_audio_url": "https://cdn1.suno.ai/36c27af3-fd0a-4181-90c8-fc2299d4fecd.mp3",
                "image_url": "https://musicfile.api.box/MzZjMjdhZjMtZmQwYS00MTgxLTkwYzgtZmMyMjk5ZDRmZWNk.jpeg",
                "source_image_url": "https://cdn2.suno.ai/image_36c27af3-fd0a-4181-90c8-fc2299d4fecd.jpeg",
                "prompt": "",
                "model_name": "chirp-auk-turbo",
                "title": "Quick Test Track",
                "tags": "Short peaceful ambient meditation music with soft piano, 10-15 seconds",
                "createTime": "2024-12-26 06:49:08",
                "duration": 64.84
            },
            {
                "id": "2cb7e96f-2c1a-4570-9cc1-23ced336adae",
                "audio_url": "https://cdn1.suno.ai/2cb7e96f-2c1a-4570-9cc1-23ced336adae.mp3",
                "source_audio_url": "https://cdn1.suno.ai/2cb7e96f-2c1a-4570-9cc1-23ced336adae.mp3",
                "stream_audio_url": "https://musicfile.api.box/MmNiN2U5NmYtMmMxYS00NTcwLTljYzEtMjNjZWQzMzZhZGFl",
                "source_stream_audio_url": "https://cdn1.suno.ai/2cb7e96f-2c1a-4570-9cc1-23ced336adae.mp3",
                "image_url": "https://musicfile.api.box/MmNiN2U5NmYtMmMxYS00NTcwLTljYzEtMjNjZWQzMzZhZGFl.jpeg",
                "source_image_url": "https://cdn2.suno.ai/image_2cb7e96f-2c1a-4570-9cc1-23ced336adae.jpeg",
                "prompt": "",
                "model_name": "chirp-auk-turbo",
                "title": "Quick Test Track",
                "tags": "Short peaceful ambient meditation music with soft piano, 10-15 seconds",
                "createTime": "2024-12-26 06:49:08",
                "duration": 14.96
            }
        ]
    }
}

async def test_callback():
    """Send a test callback to the auth server"""
    url = f"{AUTH_SERVER_URL}/suno/callback?userId={TEST_USER_ID}"
    
    print(f"🧪 Testing Suno Callback Endpoint")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(CALLBACK_PAYLOAD, indent=2)}")
    print()
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=CALLBACK_PAYLOAD) as response:
                status = response.status
                text = await response.text()
                
                print(f"Response Status: {status}")
                print(f"Response Body: {text}")
                
                if status == 200:
                    print("\n✅ Callback accepted by auth server!")
                    print("Now checking if track was saved to Firebase...")
                    
                    # Wait a moment
                    await asyncio.sleep(2)
                    
                    # Check Firebase
                    tracks_url = f"{AUTH_SERVER_URL}/suno/tracks?userId={TEST_USER_ID}&limit=10"
                    async with session.get(tracks_url) as tracks_response:
                        if tracks_response.status == 200:
                            data = await tracks_response.json()
                            tracks = data.get("tracks", [])
                            
                            # Look for our track
                            found = False
                            for track in tracks:
                                track_id = track.get("id") or track.get("sunoId")
                                if track_id == "36c27af3-fd0a-4181-90c8-fc2299d4fecd":
                                    print(f"✅ Track found in Firebase!")
                                    print(f"   Title: {track.get('title')}")
                                    print(f"   Audio URL: {track.get('audioUrl')}")
                                    found = True
                                    break
                            
                            if not found:
                                print(f"❌ Track NOT found in Firebase")
                                print(f"   Available tracks: {len(tracks)}")
                        else:
                            print(f"❌ Failed to query tracks: {tracks_response.status}")
                else:
                    print(f"\n❌ Callback failed with status {status}")
                    
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_callback())

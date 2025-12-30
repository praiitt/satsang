#!/usr/bin/env python3
"""
End-to-End Test Script for Suno API Callback Functionality

This script tests the complete flow:
1. Generate music using Suno API with callback URL
2. Monitor generation status
3. Verify callback reception by auth server
4. Verify Firebase storage via auth server API
5. Display comprehensive test results

Usage:
    python test_suno_callback_e2e.py
"""

import os
import sys
import asyncio
import aiohttp
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, Dict, Any

# Load environment variables
env_path = Path(__file__).parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
else:
    print(f"⚠️  No .env.local found at {env_path}, using system environment")

# Configuration
SUNO_API_KEY = os.getenv("SUNO_API_KEY")
AUTH_SERVER_URL = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
TEST_USER_ID = "test_user_callback_verification"
SUNO_BASE_URL = "https://api.sunoapi.org/api/v1"
MAX_POLL_TIME = 180  # 3 minutes
POLL_INTERVAL = 5  # 5 seconds

# Test configuration - small sample for fast testing
TEST_PROMPT = {
    "title": "Quick Test Track",
    "style": "Short peaceful ambient meditation music with soft piano, 10-15 seconds",
    "is_instrumental": True,
    "model": "V3_5"
}

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{text}{Colors.ENDC}")
    print("=" * len(text))

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}❌ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.ENDC}")

def print_info(text: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.ENDC}")

async def generate_music_with_callback(session: aiohttp.ClientSession) -> Optional[str]:
    """
    Step 1: Generate music using Suno API with callback URL
    Returns: taskId if successful, None otherwise
    """
    print_header("Step 1: Generating Music with Callback")
    
    if not SUNO_API_KEY:
        print_error("SUNO_API_KEY not found in environment")
        return None
    
    callback_url = f"{AUTH_SERVER_URL}/suno/callback?userId={TEST_USER_ID}"
    
    print_info(f"Title: {TEST_PROMPT['title']}")
    print_info(f"Style: {TEST_PROMPT['style']}")
    print_info(f"Callback URL: {callback_url}")
    
    url = f"{SUNO_BASE_URL}/generate"
    headers = {
        "Authorization": f"Bearer {SUNO_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "customMode": True,
        "instrumental": TEST_PROMPT["is_instrumental"],
        "model": TEST_PROMPT["model"],
        "style": TEST_PROMPT["style"],
        "title": TEST_PROMPT["title"],
        "callBackUrl": callback_url
    }
    
    try:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                print_error(f"Suno API request failed: {response.status}")
                print_error(f"Response: {error_text}")
                return None
            
            result = await response.json()
            
            # Parse taskId from response
            if result.get("code") == 200:
                task_id = result.get("data", {}).get("taskId")
                if task_id:
                    print_success(f"Music generation started - Task ID: {task_id}")
                    return task_id
                else:
                    print_error(f"No taskId in response: {result}")
                    return None
            else:
                print_error(f"Suno API returned error: {result}")
                return None
                
    except Exception as e:
        print_error(f"Exception during music generation: {e}")
        return None

async def poll_generation_status(session: aiohttp.ClientSession, task_id: str) -> Optional[Dict[str, Any]]:
    """
    Step 2: Poll Suno API for generation status
    Returns: Completed track data if successful, None otherwise
    """
    print_header("Step 2: Polling for Completion")
    
    url = f"{SUNO_BASE_URL}/generate/record-info"
    headers = {
        "Authorization": f"Bearer {SUNO_API_KEY}"
    }
    params = {"taskId": task_id}
    
    start_time = time.time()
    attempts = 0
    
    while time.time() - start_time < MAX_POLL_TIME:
        attempts += 1
        elapsed = int(time.time() - start_time)
        
        try:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    print_warning(f"Status check failed: {response.status}")
                    await asyncio.sleep(POLL_INTERVAL)
                    continue
                
                result = await response.json()
                
                if result.get("code") == 200:
                    data = result.get("data", {})
                    status = data.get("status")
                    
                    print(f"⏳ Attempt {attempts} ({elapsed}s): Status = {status}")
                    
                    if status in ["SUCCESS", "FIRST_SUCCESS"]:
                        # Get clips data
                        clips = data.get("response", {}).get("sunoData", [])
                        if not clips:
                            clips = data.get("clips", [])
                        
                        if clips and len(clips) > 0:
                            print_success(f"Generation completed! Found {len(clips)} clip(s)")
                            return {
                                "taskId": task_id,
                                "status": status,
                                "clips": clips,
                                "data": data
                            }
                        else:
                            print_warning("Status is SUCCESS but no clips found")
                    
                    elif status in ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR"]:
                        print_error(f"Generation failed with status: {status}")
                        return None
                
        except Exception as e:
            print_warning(f"Polling error: {e}")
        
        await asyncio.sleep(POLL_INTERVAL)
    
    print_error(f"Polling timed out after {MAX_POLL_TIME} seconds")
    return None

async def verify_firebase_storage(session: aiohttp.ClientSession, expected_track_id: str) -> bool:
    """
    Step 3: Verify track was saved to Firebase via auth server API
    Returns: True if track found and verified, False otherwise
    """
    print_header("Step 3: Verifying Firebase Storage")
    
    url = f"{AUTH_SERVER_URL}/suno/tracks?userId={TEST_USER_ID}&limit=10"
    
    print_info(f"Querying: {url}")
    
    try:
        async with session.get(url) as response:
            if response.status != 200:
                print_error(f"Failed to fetch tracks: {response.status}")
                error_text = await response.text()
                print_error(f"Response: {error_text}")
                return False
            
            data = await response.json()
            tracks = data.get("tracks", [])
            
            print_info(f"Found {len(tracks)} track(s) for user {TEST_USER_ID}")
            
            # Look for our track
            found_track = None
            for track in tracks:
                track_id = track.get("id") or track.get("sunoId")
                if track_id == expected_track_id:
                    found_track = track
                    break
            
            if found_track:
                print_success("Track found in Firebase!")
                print_info("Track details:")
                print(f"  - ID: {found_track.get('id') or found_track.get('sunoId')}")
                print(f"  - Title: {found_track.get('title')}")
                print(f"  - User ID: {found_track.get('userId')}")
                print(f"  - Status: {found_track.get('status')}")
                print(f"  - Audio URL: {found_track.get('audioUrl')}")
                print(f"  - Image URL: {found_track.get('imageUrl')}")
                
                # Verify critical fields
                if not found_track.get('audioUrl'):
                    print_warning("Audio URL is missing!")
                    return False
                
                if found_track.get('userId') != TEST_USER_ID:
                    print_warning(f"User ID mismatch! Expected: {TEST_USER_ID}, Got: {found_track.get('userId')}")
                    return False
                
                return True
            else:
                print_error(f"Track {expected_track_id} not found in Firebase")
                if tracks:
                    print_info("Available tracks:")
                    for track in tracks:
                        print(f"  - {track.get('id') or track.get('sunoId')}: {track.get('title')}")
                return False
                
    except Exception as e:
        print_error(f"Exception during Firebase verification: {e}")
        return False

async def cleanup_test_data(session: aiohttp.ClientSession):
    """
    Optional: Clean up test data
    Note: This would require a DELETE endpoint on the auth server
    """
    print_header("Cleanup")
    print_warning("Manual cleanup required:")
    print_info(f"1. Go to Firebase Console → Firestore → music_tracks collection")
    print_info(f"2. Filter by userId: {TEST_USER_ID}")
    print_info(f"3. Delete test tracks manually")

async def run_test():
    """Main test execution"""
    print_header("🎵 Suno API Callback E2E Test")
    print_info(f"Auth Server: {AUTH_SERVER_URL}")
    print_info(f"Test User ID: {TEST_USER_ID}")
    print_info(f"Max Poll Time: {MAX_POLL_TIME}s")
    
    # Verify environment
    if not SUNO_API_KEY:
        print_error("SUNO_API_KEY not set in environment")
        print_info("Please set SUNO_API_KEY in .env.local")
        return False
    
    async with aiohttp.ClientSession() as session:
        # Step 1: Generate music
        task_id = await generate_music_with_callback(session)
        if not task_id:
            print_error("Failed to generate music")
            return False
        
        # Step 2: Poll for completion
        result = await poll_generation_status(session, task_id)
        if not result:
            print_error("Music generation did not complete successfully")
            return False
        
        # Get the first clip ID for verification
        clips = result.get("clips", [])
        if not clips:
            print_error("No clips in result")
            return False
        
        first_clip = clips[0]
        clip_id = first_clip.get("id")
        
        if not clip_id:
            print_error("No clip ID found")
            return False
        
        print_info(f"First clip ID: {clip_id}")
        print_info(f"Audio URL: {first_clip.get('audioUrl') or first_clip.get('sourceAudioUrl')}")
        
        # Wait a moment for callback to be processed
        print_info("Waiting 5 seconds for callback to be processed...")
        await asyncio.sleep(5)
        
        # Step 3: Verify Firebase storage
        verified = await verify_firebase_storage(session, clip_id)
        if not verified:
            print_error("Firebase verification failed")
            print_warning("The music was generated but may not have been saved via callback")
            return False
        
        # Success!
        print_header("🎉 TEST RESULTS")
        print_success("ALL TESTS PASSED!")
        print_info("Summary:")
        print(f"  ✅ Music generation successful")
        print(f"  ✅ Callback received by auth server")
        print(f"  ✅ Track saved to Firebase")
        print(f"  ✅ Track retrievable via API")
        print(f"  ✅ All metadata verified")
        
        # Cleanup prompt
        await cleanup_test_data(session)
        
        return True

def main():
    """Entry point"""
    try:
        success = asyncio.run(run_test())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_warning("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

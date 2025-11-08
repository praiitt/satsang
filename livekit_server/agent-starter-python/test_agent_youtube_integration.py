#!/usr/bin/env python3
"""
Test script to verify YouTube search integration with agent's play_bhajan function.

This simulates what happens when the agent receives a bhajan request.
"""
import asyncio
import sys
import os
import json
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from dotenv import load_dotenv
from youtube_search import find_youtube_video_async

# Load environment variables
env_path = Path(__file__).parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)

async def simulate_play_bhajan(bhajan_name: str):
    """Simulate the agent's play_bhajan function logic."""
    print(f"\n{'='*60}")
    print(f"Simulating play_bhajan for: '{bhajan_name}'")
    print(f"{'='*60}\n")
    
    # Step 1: Search Spotify (mock - we'll just simulate)
    print("Step 1: Searching Spotify...")
    spotify_result = {
        "name_en": "Hare Krishna",
        "artist": "Various Artists",
        "preview_url": "https://p.scdn.co/mp3-preview/...",
        "spotify_id": "4uLU6hMCyIA",
    }
    print(f"   ✅ Spotify result: {spotify_result['name_en']} - {spotify_result.get('spotify_id')}")
    
    # Step 2: Search YouTube (actual)
    print("\nStep 2: Searching YouTube...")
    try:
        youtube_result = await find_youtube_video_async(bhajan_name)
        if youtube_result:
            youtube_video_id = youtube_result.get("video_id")
            youtube_video_title = youtube_result.get("title")
            print(f"   ✅ YouTube result: {youtube_video_title}")
            print(f"   📺 Video ID: {youtube_video_id}")
        else:
            youtube_video_id = None
            youtube_video_title = None
            print(f"   ⚠️  No YouTube result found")
    except Exception as e:
        print(f"   ❌ YouTube search error: {e}")
        youtube_video_id = None
        youtube_video_title = None
    
    # Step 3: Build result (same format as agent.py)
    print("\nStep 3: Building data channel message...")
    result = {
        "url": spotify_result.get("preview_url"),
        "name": spotify_result.get("name_en", bhajan_name),
        "artist": spotify_result.get("artist", ""),
        "spotify_id": spotify_result.get("spotify_id"),
        "external_url": "https://open.spotify.com/track/...",
        "youtube_id": youtube_video_id,
        "youtube_url": f"https://www.youtube.com/watch?v={youtube_video_id}" if youtube_video_id else None,
        "message": f"भजन '{spotify_result.get('name_en', bhajan_name)}' चल रहा है। आनंद लें!",
    }
    
    print("   📦 Data channel message:")
    print(f"   {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    # Step 4: Verify frontend can use this
    print("\nStep 4: Verifying frontend compatibility...")
    checks = []
    
    # Check if YouTube player can use this
    if result.get("youtube_id"):
        checks.append("✅ YouTube player can extract video ID")
    else:
        checks.append("⚠️  No YouTube ID - YouTube player won't play")
    
    # Check if Spotify player can use this
    if result.get("spotify_id") or result.get("url"):
        checks.append("✅ Spotify player can use spotify_id or preview URL")
    else:
        checks.append("⚠️  No Spotify ID or URL")
    
    # Check if name is present
    if result.get("name"):
        checks.append("✅ Name field present for display")
    else:
        checks.append("❌ Name missing")
    
    for check in checks:
        print(f"   {check}")
    
    return result

async def main():
    """Run integration tests."""
    print("="*60)
    print("Agent YouTube Integration Test")
    print("="*60)
    
    test_bhajans = [
        "hare krishna",
        "om namah shivaya",
        "ram bhajan",
    ]
    
    results = []
    for bhajan in test_bhajans:
        result = await simulate_play_bhajan(bhajan)
        results.append(result)
    
    # Summary
    print(f"\n{'='*60}")
    print("Integration Test Summary")
    print(f"{'='*60}\n")
    
    youtube_success = sum(1 for r in results if r.get("youtube_id"))
    spotify_success = sum(1 for r in results if (r.get("spotify_id") or r.get("url")))
    
    print(f"YouTube integration: {youtube_success}/{len(results)} successful")
    print(f"Spotify integration: {spotify_success}/{len(results)} successful")
    print(f"Total tests: {len(results)}")
    
    if youtube_success == len(results):
        print("\n✅ All YouTube searches successful - integration ready!")
        return 0
    else:
        print(f"\n⚠️  {len(results) - youtube_success} YouTube searches failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)


#!/usr/bin/env python3
"""
Test script for YouTube bhajan search functionality.

Tests if YouTube search is working correctly with the backend.
"""
import asyncio
import sys
import os
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from youtube_search import find_youtube_video_async
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from: {env_path}")
else:
    print(f"⚠️  .env.local not found at: {env_path}")
    print("   Trying to load from environment variables directly...")

# Check if YouTube API key is set
youtube_api_key = os.getenv("YOUTUBE_API_KEY")
if not youtube_api_key:
    print("❌ YOUTUBE_API_KEY not found in environment variables!")
    print("   Please set YOUTUBE_API_KEY in .env.local")
    sys.exit(1)
else:
    print(f"✅ YOUTUBE_API_KEY found: {youtube_api_key[:10]}...{youtube_api_key[-5:]}")

async def test_youtube_search():
    """Test YouTube search with various bhajan queries."""
    print("\n" + "="*60)
    print("Testing YouTube Bhajan Search")
    print("="*60 + "\n")
    
    test_queries = [
        "hare krishna",
        "om namah shivaya",
        "ram bhajan",
        "krishna bhajan",
        "devotional song",
    ]
    
    results = []
    
    for query in test_queries:
        print(f"🔍 Searching for: '{query}'")
        try:
            result = await find_youtube_video_async(query)
            if result:
                print(f"   ✅ Found: {result.get('title')}")
                print(f"   📺 Video ID: {result.get('video_id')}")
                print(f"   👤 Channel: {result.get('channel_title')}")
                print(f"   🔗 URL: https://www.youtube.com/watch?v={result.get('video_id')}")
                results.append({
                    "query": query,
                    "success": True,
                    "result": result
                })
            else:
                print(f"   ❌ No results found")
                results.append({
                    "query": query,
                    "success": False,
                    "result": None
                })
        except Exception as e:
            print(f"   ❌ Error: {e}")
            results.append({
                "query": query,
                "success": False,
                "error": str(e)
            })
        print()
    
    # Summary
    print("="*60)
    print("Test Summary")
    print("="*60)
    successful = sum(1 for r in results if r.get("success"))
    total = len(results)
    print(f"Successful searches: {successful}/{total}")
    print()
    
    if successful == 0:
        print("❌ All searches failed. Please check:")
        print("   1. YOUTUBE_API_KEY is correct")
        print("   2. YouTube Data API v3 is enabled in Google Cloud Console")
        print("   3. API quota is not exceeded")
        print("   4. Internet connection is working")
        return False
    elif successful < total:
        print("⚠️  Some searches failed. This might be normal if queries are too specific.")
        return True
    else:
        print("✅ All searches successful!")
        return True

async def test_integration_with_agent_format():
    """Test if the result format matches what the agent expects."""
    print("\n" + "="*60)
    print("Testing Integration Format")
    print("="*60 + "\n")
    
    query = "hare krishna"
    print(f"🔍 Testing with query: '{query}'")
    
    result = await find_youtube_video_async(query)
    
    if not result:
        print("❌ No result found - cannot test format")
        return False
    
    # Check if result has expected keys
    expected_keys = ["video_id", "title", "channel_title"]
    missing_keys = [key for key in expected_keys if key not in result]
    
    if missing_keys:
        print(f"❌ Missing keys in result: {missing_keys}")
        print(f"   Result keys: {list(result.keys())}")
        return False
    
    # Simulate what agent.py does
    youtube_video_id = result.get("video_id")
    youtube_video_title = result.get("title")
    
    # Build agent result format
    agent_result = {
        "name": youtube_video_title,
        "artist": result.get("channel_title", ""),
        "youtube_id": youtube_video_id,
        "youtube_url": f"https://www.youtube.com/watch?v={youtube_video_id}",
        "message": f"भजन '{youtube_video_title}' चल रहा है। आनंद लें!",
    }
    
    print("✅ Result format matches agent expectations:")
    print(f"   {agent_result}")
    
    return True

if __name__ == "__main__":
    print("YouTube Bhajan Search Test Script")
    print("="*60)
    
    # Run tests
    async def run_all_tests():
        test1 = await test_youtube_search()
        test2 = await test_integration_with_agent_format()
        
        print("\n" + "="*60)
        if test1 and test2:
            print("✅ All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1
    
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)


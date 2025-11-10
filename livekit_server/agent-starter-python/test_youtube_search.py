#!/usr/bin/env python3
"""
Test script for YouTube search functionality.
Run this to debug YouTube video search issues.
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add src to path
src_path = Path(__file__).resolve().parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env.local"
if env_path.exists():
    load_dotenv(str(env_path), override=True)
    print(f"✅ Loaded .env.local from: {env_path}")
else:
    print(f"⚠️  .env.local not found at: {env_path}")

# Check API key
youtube_api_key = os.getenv("YOUTUBE_API_KEY")
if youtube_api_key:
    print(f"✅ YOUTUBE_API_KEY found (length: {len(youtube_api_key)}, first 10 chars: {youtube_api_key[:10]}...)")
else:
    print("❌ YOUTUBE_API_KEY not found in environment")
    sys.exit(1)

# Import the function
try:
    from youtube_search import find_youtube_video_async
    print("✅ Successfully imported find_youtube_video_async")
except ImportError as e:
    print(f"❌ Failed to import find_youtube_video_async: {e}")
    sys.exit(1)

async def test_search(query: str):
    """Test YouTube search with a given query."""
    print(f"\n{'='*60}")
    print(f"Testing YouTube search for: '{query}'")
    print(f"{'='*60}\n")
    
    try:
        result = await find_youtube_video_async(query)
        
        if result:
            print(f"\n✅ SUCCESS - Found video:")
            print(f"   Video ID: {result.get('video_id')}")
            print(f"   Title: {result.get('title')}")
            print(f"   Channel: {result.get('channel_title')}")
            print(f"   YouTube URL: https://www.youtube.com/watch?v={result.get('video_id')}")
            return result
        else:
            print(f"\n❌ FAILED - No video found for '{query}'")
            return None
    except Exception as e:
        print(f"\n❌ ERROR - Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    """Run tests."""
    print("="*60)
    print("YouTube Search Test Script")
    print("="*60)
    
    # Test cases
    test_queries = [
        "Ram Siya Ram",
        "hare krishna",
        "om namah shivaya",
        "bhajan",
    ]
    
    results = []
    for query in test_queries:
        result = await test_search(query)
        results.append((query, result))
        await asyncio.sleep(1)  # Small delay between requests
    
    # Summary
    print(f"\n{'='*60}")
    print("Test Summary")
    print(f"{'='*60}")
    for query, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - '{query}'")
    
    # Check if any passed
    passed = sum(1 for _, result in results if result)
    print(f"\nResults: {passed}/{len(results)} tests passed")
    
    if passed == 0:
        print("\n⚠️  All tests failed. Check:")
        print("   1. YOUTUBE_API_KEY is valid")
        print("   2. YouTube Data API v3 is enabled in Google Cloud Console")
        print("   3. API quota is not exceeded")
        print("   4. Network connectivity")

if __name__ == "__main__":
    asyncio.run(main())

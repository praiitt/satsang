#!/usr/bin/env python3
"""
Quick test script for Spotify bhajan search.
Tests the async functions directly.
"""
import asyncio
import sys
import os
from pathlib import Path

# Add src to path
src_dir = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(src_dir))

async def test_spotify_search():
    """Test Spotify API search for bhajans."""
    from bhajan_search import get_bhajan_url_async, find_bhajan_by_name_async, _search_spotify, _get_spotify_token
    
    # Get token from environment or use provided token
    token = os.getenv("SPOTIFY_ACCESS_TOKEN")
    if not token:
        print("ERROR: SPOTIFY_ACCESS_TOKEN not set in environment")
        print("Usage: SPOTIFY_ACCESS_TOKEN=your_token python test_spotify_bhajan.py")
        return 1
    
    test_queries = [
        "hare krishna",
        "om namah shivaya",
        "jai ganesh",
        "govind bolo",
        "rama bhajan",
    ]
    
    print("=" * 60)
    print("Testing Spotify API for Bhajan Search")
    print("=" * 60)
    
    success_count = 0
    for query in test_queries:
        print(f"\n🔍 Testing query: '{query}'")
        print("-" * 60)
        try:
            # First, let's see what Spotify returns directly
            search_result = await _search_spotify(query, token, limit=5)
            if search_result:
                tracks = search_result.get("tracks", {}).get("items", [])
                print(f"   Spotify returned {len(tracks)} tracks:")
                for i, track in enumerate(tracks[:3], 1):
                    preview = track.get("preview_url")
                    has_preview = "✅" if preview else "❌"
                    print(f"   {i}. {has_preview} {track.get('name', 'N/A')} by {', '.join([a.get('name', '') for a in track.get('artists', [])])}")
                    if preview:
                        print(f"      Preview: {preview[:60]}...")
            
            # Test the async function
            result = await find_bhajan_by_name_async(query)
            if result:
                print(f"\n✅ FOUND WITH PREVIEW URL:")
                print(f"   Name: {result.get('name_en', 'N/A')}")
                print(f"   Artist: {result.get('artist', 'N/A')}")
                print(f"   Preview URL: {result.get('preview_url', 'N/A')}")
                print(f"   Spotify ID: {result.get('spotify_id', 'N/A')}")
                success_count += 1
            else:
                print(f"\n❌ NOT FOUND (no preview URL available)")
            
            # Also test the URL getter
            url = await get_bhajan_url_async(query)
            if url:
                print(f"   Direct URL: {url}")
            else:
                print(f"   Direct URL: None")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print(f"Results: {success_count}/{len(test_queries)} successful")
    print("=" * 60)
    
    return 0 if success_count > 0 else 1

if __name__ == "__main__":
    exit_code = asyncio.run(test_spotify_search())
    sys.exit(exit_code)


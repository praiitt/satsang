#!/usr/bin/env python3
"""
Test script to verify LiveKit agent can fetch chart data from backend's Pinecone endpoint.
Tests with 'default_user' to validate the flow.
"""

import asyncio
import aiohttp
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

BACKEND_URL = os.getenv("ASTROLOGY_BACKEND_URL", "http://localhost:3001")

async def test_user_status(user_id: str):
    """Test the user-status endpoint."""
    print(f"\n{'='*60}")
    print(f"TEST 1: Checking user status for '{user_id}'")
    print(f"{'='*60}")
    
    url = f"{BACKEND_URL}/api/auth/user-status/{user_id}"
    print(f"URL: {url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"Status Code: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"\n✅ Response:")
                    print(json.dumps(data, indent=2))
                    
                    return data.get('isOnline', False) and data.get('hasCharts', False)
                else:
                    text = await response.text()
                    print(f"\n❌ Error Response: {text}")
                    return False
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        return False

async def test_pinecone_search(user_id: str, query: str = "all chart data"):
    """Test the Pinecone search endpoint."""
    print(f"\n{'='*60}")
    print(f"TEST 2: Searching Pinecone for '{user_id}'")
    print(f"{'='*60}")
    
    url = f"{BACKEND_URL}/api/pinecone/pinecone-search"
    print(f"URL: {url}")
    
    payload = {
        "userId": user_id,
        "query": query,
        "top_k": 10
    }
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                print(f"Status Code: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"\n✅ Response:")
                    print(f"Success: {data.get('success')}")
                    print(f"Total Found: {data.get('total_found', 0)}")
                    
                    results = data.get('results', [])
                    print(f"\nResults Count: {len(results)}")
                    
                    # Show first 3 results in detail
                    for i, result in enumerate(results[:3], 1):
                        print(f"\n--- Result {i} ---")
                        print(f"Chart Type: {result.get('metadata', {}).get('chartType', 'N/A')}")
                        print(f"Score: {result.get('score', 0):.4f}")
                        content = result.get('content', '')
                        print(f"Content Preview: {content[:200]}...")
                    
                    return results
                else:
                    text = await response.text()
                    print(f"\n❌ Error Response: {text}")
                    return []
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return []

async def format_and_display_chart_summary(results: list):
    """Format the results like the agent would."""
    print(f"\n{'='*60}")
    print(f"TEST 3: Formatting Chart Summary (for LLM)")
    print(f"{'='*60}")
    
    if not results:
        print("❌ No results to format")
        return
    
    summary_parts = []
    
    for result in results[:10]:  # Top 10 most relevant
        content = result.get('content', '')
        metadata = result.get('metadata', {})
        score = result.get('score', 0)
        
        chart_type = metadata.get('chartType', 'unknown')
        
        summary_parts.append(f"[{chart_type.upper()}] {content}")
    
    summary = "\n\n".join(summary_parts)
    
    print("\n📋 LLM Context (formatted):")
    print("-" * 60)
    print(summary[:1000])  # First 1000 chars
    print("-" * 60)
    print(f"\nTotal Context Length: {len(summary)} characters")
    
    return summary

async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("🧪 TESTING LIVEKIT AGENT → BACKEND → PINECONE")
    print("="*60)
    print(f"\nBackend URL: {BACKEND_URL}")
    print(f"Test User: default_user")
    
    # Test 1: Check user status
    has_charts = await test_user_status("default_user")
    
    if not has_charts:
        print("\n⚠️  WARNING: default_user has no charts!")
        print("You may need to generate charts first using /api/auth/generate-charts")
        return
    
    # Test 2: Search Pinecone
    results = await test_pinecone_search("default_user", "all chart data")
    
    if not results:
        print("\n⚠️  WARNING: No results from Pinecone search!")
        return
    
    # Test 3: Format for LLM
    await format_and_display_chart_summary(results)
    
    print("\n" + "="*60)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\n💡 Next Steps:")
    print("1. Update vedic_astrology_agent.py with these methods")
    print("2. Test with LiveKit connection")
    print("3. Verify agent provides personalized guidance")

if __name__ == "__main__":
    asyncio.run(main())

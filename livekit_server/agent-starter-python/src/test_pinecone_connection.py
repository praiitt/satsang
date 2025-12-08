#!/usr/bin/env python3
"""
Script to test Pinecone connection and verify astrology chart data.
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from pinecone_kundli_retriever import KundliRetriever

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(str(env_path))

async def test_pinecone_connection():
    """Test Pinecone connection and data retrieval."""
    
    print("=" * 60)
    print("PINECONE CONNECTION TEST")
    print("=" * 60)
    
    # Check environment variables
    print("\n1. Environment Variables:")
    print(f"   PINECONE_API_KEY: {'✅ SET' if os.getenv('PINECONE_API_KEY') else '❌ MISSING'}")
    print(f"   PINECONE_INDEX: {os.getenv('PINECONE_INDEX', 'NOT SET')}")
    print(f"   PINECONE_HOST: {os.getenv('PINECONE_HOST', 'NOT SET')}")
    
    # Initialize retriever
    print("\n2. Initializing KundliRetriever...")
    try:
        retriever = KundliRetriever()
        print("   ✅ KundliRetriever initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize: {e}")
        return
    
    # Test with a sample user ID
    print("\n3. Testing data retrieval...")
    test_user_ids = [
        "test_user_1",
        "sample_user",
        "default_user",
    ]
    
    for user_id in test_user_ids:
        print(f"\n   Testing user_id: {user_id}")
        try:
            kundli = await retriever.get_user_kundli(user_id)
            if kundli:
                print(f"   ✅ Found chart data for {user_id}")
                print(f"      Fields: {list(kundli.keys())[:10]}...")  # Show first 10 fields
                
                # Show some sample data
                print(f"      Rashi: {kundli.get('rashi', 'N/A')}")
                print(f"      Lagna: {kundli.get('lagna', 'N/A')}")
                print(f"      Birth Date: {kundli.get('birthDate', 'N/A')}")
            else:
                print(f"   ℹ️  No chart found for {user_id}")
        except Exception as e:
            print(f"   ❌ Error querying {user_id}: {e}")
    
    # Get index stats
    print("\n4. Checking index statistics...")
    try:
        stats = retriever.index.describe_index_stats()
        print(f"   Total vectors: {stats.total_vector_count}")
        print(f"   Dimension: {stats.dimension}")
        if hasattr(stats, 'namespaces'):
            print(f"   Namespaces: {list(stats.namespaces.keys()) if stats.namespaces else 'None'}")
    except Exception as e:
        print(f"   ❌ Could not fetch stats: {e}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_pinecone_connection())

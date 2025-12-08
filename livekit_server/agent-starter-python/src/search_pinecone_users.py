#!/usr/bin/env python3
"""
Search for user by querying all possible variations
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(str(env_path))

async def search_for_user():
    """Search for user data in various ways."""
    
    print("=" * 70)
    print("SEARCHING FOR USER DATA")
    print("=" * 70)
    
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX"))
    
    # Test variations
    test_ids = [
        "prakash.dimension",
        "prakash",
        "Prakash",
        "prakash_dimension",
    ]
    
    print("\n1. Testing different user ID variations:")
    for user_id in test_ids:
        try:
            result = index.query(
                vector=[0.0] * 1536,
                filter={"userId": {"$eq": user_id}},
                top_k=1,
                include_metadata=True
            )
            if result.matches:
                print(f"   ✅ Found: {user_id}")
                print(f"      Metadata: {result.matches[0].metadata}")
            else:
                print(f"   ❌ Not found: {user_id}")
        except Exception as e:
            print(f"   ❌ Error for {user_id}: {e}")
    
    # List some vectors to see what's there
    print("\n2. Sampling random vectors from index:")
    try:
        # Fetch without filter to see what's there
        result = index.query(
            vector=[0.0] * 1536,
            top_k=5,
            include_metadata=True
        )
        
        if result.matches:
            print(f"\n   Found {len(result.matches)} sample vectors:")
            for i, match in enumerate(result.matches, 1):
                metadata = match.metadata
                user_id = metadata.get('userId', 'N/A')
                name = metadata.get('name', metadata.get('birthPlace', 'N/A'))
                print(f"   {i}. ID: {user_id}, Name/Place: {name}")
        
    except Exception as e:
        print(f"   ❌ Error sampling: {e}")
    
    # Check namespaces
    print("\n3. Checking namespaces (may contain user-specific data):")
    try:
        stats = index.describe_index_stats()
        if hasattr(stats, 'namespaces') and stats.namespaces:
            print(f"\n   Found {len(stats.namespaces)} namespaces:")
            for ns_name, ns_stats in list(stats.namespaces.items())[:10]:
                print(f"   - {ns_name}: {ns_stats.vector_count} vectors")
        else:
            print("   No namespace info available")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    asyncio.run(search_for_user())

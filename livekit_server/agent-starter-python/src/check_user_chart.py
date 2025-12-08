#!/usr/bin/env python3
"""
Query specific user data from Pinecone
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from pinecone_kundli_retriever import KundliRetriever

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(str(env_path))

async def check_user_data(user_id: str):
    """Check data for a specific user."""
    
    print("=" * 70)
    print(f"CHECKING DATA FOR USER: {user_id}")
    print("=" * 70)
    
    try:
        retriever = KundliRetriever()
        print(f"\n✅ Connected to Pinecone index: {os.getenv('PINECONE_INDEX')}")
        
        # Get user's Kundli
        print(f"\n🔍 Fetching Kundli for: {user_id}")
        kundli = await retriever.get_user_kundli(user_id)
        
        if kundli:
            print(f"\n✅ FOUND CHART DATA")
            print("\n" + "=" * 70)
            print("COMPLETE CHART DATA:")
            print("=" * 70)
            
            # Print all fields
            for key, value in sorted(kundli.items()):
                if len(str(value)) > 100:
                    print(f"{key:20} = {str(value)[:100]}...")
                else:
                    print(f"{key:20} = {value}")
            
            print("\n" + "=" * 70)
            
            # Get formatted summary
            print("\nFORMATTED SUMMARY (As LLM sees it):")
            print("=" * 70)
            summary = await retriever.get_user_chart_summary(user_id)
            print(summary)
            
        else:
            print(f"\n❌ NO CHART DATA FOUND for {user_id}")
            print("\n💡 Possible reasons:")
            print("   - User hasn't created their chart yet")
            print("   - User ID doesn't match (check Firebase UID)")
            print(f"   - Data might be in a namespace (current: default)")
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    import sys
    user_id = sys.argv[1] if len(sys.argv) > 1 else "prakash.dimension"
    asyncio.run(check_user_data(user_id))

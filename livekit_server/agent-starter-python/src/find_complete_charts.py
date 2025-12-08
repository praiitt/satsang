#!/usr/bin/env python3
"""
Find users with the most complete chart data
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(str(env_path))

async def find_complete_charts():
    """Find users with complete chart data."""
    
    print("=" * 70)
    print("SEARCHING FOR USERS WITH COMPLETE CHART DATA")
    print("=" * 70)
    
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX"))
    
    # Sample vectors to find charts
    print("\n🔍 Sampling vectors from database...")
    
    try:
        # Query more vectors to find charts
        result = index.query(
            vector=[0.0] * 1536,
            top_k=50,  # Get 50 samples
            include_metadata=True
        )
        
        if not result.matches:
            print("❌ No vectors found")
            return
        
        print(f"\n✅ Found {len(result.matches)} vectors, analyzing...")
        
        # Analyze each for chart completeness
        charts_by_completeness = []
        
        for match in result.matches:
            metadata = match.metadata
            user_id = metadata.get('userId', 'N/A')
            
            # Count how many astrology fields are present and not "Unknown"
            astro_fields = [
                'rashi', 'lagna', 'nakshatra', 'nakshatraPada',
                'mahadasha', 'antardasha', 'manglik',
                'sun_sign', 'sun_house', 'moon_sign', 'moon_house',
                'mars_sign', 'mars_house', 'mercury_sign', 'mercury_house',
                'jupiter_sign', 'jupiter_house', 'venus_sign', 'venus_house',
                'saturn_sign', 'saturn_house', 'rahu_sign', 'rahu_house',
                'ketu_sign', 'ketu_house'
            ]
            
            filled_fields = 0
            sample_fields = {}
            
            for field in astro_fields:
                value = metadata.get(field)
                if value and str(value).lower() not in ['unknown', 'n/a', 'none', '']:
                    filled_fields += 1
                    if len(sample_fields) < 5:  # Keep first 5 as samples
                        sample_fields[field] = value
            
            if filled_fields > 0 or 'birthDate' in metadata:
                charts_by_completeness.append({
                    'user_id': user_id,
                    'filled_fields': filled_fields,
                    'total_fields': len(astro_fields),
                    'completeness': (filled_fields / len(astro_fields)) * 100,
                    'birth_date': metadata.get('birthDate', 'N/A'),
                    'birth_place': metadata.get('birthPlace', 'N/A'),
                    'sample_fields': sample_fields,
                    'all_fields': list(metadata.keys())
                })
        
        # Sort by completeness
        charts_by_completeness.sort(key=lambda x: x['filled_fields'], reverse=True)
        
        print(f"\n📊 Found {len(charts_by_completeness)} chart entries")
        print("\n" + "=" * 70)
        print("TOP 10 MOST COMPLETE CHARTS:")
        print("=" * 70)
        
        for i, chart in enumerate(charts_by_completeness[:10], 1):
            print(f"\n{i}. User ID: {chart['user_id']}")
            print(f"   Completeness: {chart['completeness']:.1f}% ({chart['filled_fields']}/{chart['total_fields']} fields)")
            print(f"   Birth Date: {chart['birth_date']}")
            print(f"   Birth Place: {chart['birth_place']}")
            print(f"   All metadata fields: {', '.join(chart['all_fields'][:15])}...")
            
            if chart['sample_fields']:
                print(f"   Sample data:")
                for key, value in list(chart['sample_fields'].items())[:3]:
                    print(f"      {key}: {value}")
        
        # Recommend best user
        if charts_by_completeness:
            best = charts_by_completeness[0]
            print("\n" + "=" * 70)
            print("🎯 RECOMMENDED USER FOR TESTING:")
            print("=" * 70)
            print(f"   User ID: {best['user_id']}")
            print(f"   Completeness: {best['completeness']:.1f}%")
            print(f"\n   To fetch this user's data, run:")
            print(f"   ./venv/bin/python src/check_user_chart.py \"{best['user_id']}\"")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    asyncio.run(find_complete_charts())

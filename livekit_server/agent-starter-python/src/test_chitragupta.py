import asyncio
import logging
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

from chitragupta_agent import ChitraguptaAgent
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_chitragupta")

# Load env vars
load_dotenv('.env.local')

async def main():
    logger.info("Initializing Chitragupta Agent...")
    agent = ChitraguptaAgent()
    
    # Mock context
    context = None 
    
    logger.info("--- Testing list_collections ---")
    collections = await agent.list_collections(context)
    print(f"Collections: {collections}")
    
    logger.info("\n--- Testing count_documents (music_tracks) ---")
    count_msg = await agent.count_documents(context, "music_tracks")
    print(f"Count Result: {count_msg}")
    
    logger.info("\n--- Testing count_documents (unknown_collection) ---")
    error_msg = await agent.count_documents(context, "unknown_collection")
    print(f"Error Result: {error_msg}")

    logger.info("\n--- Testing get_collection_schema (users) ---")
    schema_msg = await agent.get_collection_schema(context, "users")
    print(f"Schema Result:\n{schema_msg}")
    
    logger.info("\n--- Testing query_database (organizations, limit=2) ---")
    query_msg = await agent.query_database(
        context, 
        "organizations", 
        limit=2
    )
    print(f"Query Result:\n{query_msg}")

if __name__ == "__main__":
    asyncio.run(main())

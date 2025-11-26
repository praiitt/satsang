import asyncio
import os
import logging
from dotenv import load_dotenv
from pathlib import Path
from src.suno_client import SunoClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_suno")

async def main():
    # Load environment variables
    env_path = Path(".env.local")
    if env_path.exists():
        load_dotenv(env_path)
        logger.info("Loaded .env.local")
    else:
        logger.error(".env.local not found!")
        return

    api_key = os.getenv("SUNO_API_KEY")
    if not api_key:
        logger.error("SUNO_API_KEY not found in environment!")
        return
    
    logger.info(f"Found API Key: {api_key[:5]}...{api_key[-5:]}")

    client = SunoClient()
    
    logger.info("Testing Suno API generation...")
    try:
        # Simple test request
        result = await client.generate_music(
            prompt="A short, happy chime sound for testing",
            is_instrumental=True,
            custom_mode=True,
            style="Sound Effect",
            title="Test Chime",
            model="V3_5"
        )
        
        logger.info("✅ API Call Successful!")
        logger.info(f"Result: {result}")
        
        # Check if we got clips
        clips = result if isinstance(result, list) else result.get("clips", [])
        if clips:
            logger.info(f"Generated {len(clips)} clips.")
            for clip in clips:
                logger.info(f"Clip ID: {clip.get('id')}")
                logger.info(f"Status: {clip.get('status')}")
        else:
            logger.warning("No clips found in response (might be queued or different format).")
            
    except Exception as e:
        logger.error(f"❌ API Call Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())

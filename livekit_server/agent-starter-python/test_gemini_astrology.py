import os
import asyncio
from dotenv import load_dotenv
from livekit.plugins import google
from livekit.agents.llm import ChatContext, ChatMessage, ChatContent
try:
    from livekit.plugins.google import APIConnectOptions
except ImportError:
    try:
        from livekit.plugins.google.llm import APIConnectOptions
    except ImportError:
        # If all else fails, check livekit.agents
        from livekit.agents import APIConnectOptions
import logging
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_gemini")

# Load environment variables
load_dotenv(".env.local")

async def test_gemini_astrology():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("GOOGLE_API_KEY not found!")
        return

    logger.info(f"Initializing Gemini 1.5 Pro with key: {api_key[:5]}...")
    
    # Initialize LLM
    llm = google.LLM(
        model="models/gemini-2.5-pro",
        api_key=api_key
    )

    # Test Prompt
    birth_details = """
    Date: 1990-01-01
    Time: 12:00 PM
    Place: New Delhi, India
    """
    
    prompt = f"""
    You are an expert Vedic Astrologer. Calculate the birth chart (Kundli) for the following details:
    {birth_details}

    Please provide:
    1. Lagna (Ascendant) Sign and Degree
    2. Moon Sign and Degree
    3. Sun Sign and Degree
    4. Current Maha Dasha (approximate based on birth)
    
    Format the output as JSON.
    """

    logger.info("Sending prompt to Gemini...")
    
    try:
        # Create a chat context
        chat_ctx = ChatContext()
        chat_ctx.add_message(role="user", content=prompt)
        
        stream = llm.chat(chat_ctx=chat_ctx, conn_options=APIConnectOptions(timeout=60.0))
        
        full_response = ""
        async for chunk in stream:
            print(f"DEBUG CHUNK OBJECT: {chunk}")
            if hasattr(chunk, 'choices') and chunk.choices:
                 for choice in chunk.choices:
                     if hasattr(choice, 'delta') and choice.delta.content:
                         print(choice.delta.content, end="", flush=True)
                         full_response += choice.delta.content
            elif hasattr(chunk, 'content'):
                 if chunk.content:
                    print(chunk.content, end="", flush=True)
                    full_response += chunk.content
        
        print("\n\n--------------------------------")
        logger.info("Gemini response received.")
        
    except Exception as e:
        logger.error(f"Error calling Gemini: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini_astrology())

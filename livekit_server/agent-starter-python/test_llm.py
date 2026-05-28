import asyncio
import os
from dotenv import load_dotenv
from livekit.plugins import google

load_dotenv(".env.local")

async def test():
    try:
        llm = google.LLM(model="gemini-2.5-flash", api_key=os.getenv("GOOGLE_API_KEY"))
        print("LLM Initialized successfully:", llm)
    except Exception as e:
        print("Failed to initialize:", e)

asyncio.run(test())

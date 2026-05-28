import asyncio
import os
import traceback
from dotenv import load_dotenv
from livekit.plugins import google
from livekit.agents.llm import ChatContext

load_dotenv(".env.local")

async def test():
    try:
        llm = google.LLM(model="gemini-2.5-flash", api_key=os.getenv("GOOGLE_API_KEY"))
        ctx = ChatContext()
        ctx.messages.append(google.llm.ChatMessage(role="user", content="Hello!"))
    except Exception as e:
        print("Wait")
    try:
        llm = google.LLM(model="gemini-2.5-flash", api_key=os.getenv("GOOGLE_API_KEY"))
        ctx = ChatContext()
        # let's just use the add_message helper?
        # livekit agents 1.2/1.5 API changed a bit
    except:
        pass

asyncio.run(test())

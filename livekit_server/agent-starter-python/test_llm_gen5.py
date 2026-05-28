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
        ctx.append(role="user", text="Hello!")
        stream = llm.chat(chat_ctx=ctx)
        async for chunk in stream:
            print("Chunk:", chunk.choices[0].delta.content)
    except Exception as e:
        print("Failed to generate:")
        traceback.print_exc()

asyncio.run(test())

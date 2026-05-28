import asyncio
import os
from dotenv import load_dotenv
from google import genai

load_dotenv(".env.local")

def test():
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    for model in client.models.list():
        print(model.name)

test()

import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv(".env.local")

async def test():
    url = "http://127.0.0.1:3002/api/pinecone/pinecone-search"
    payload = {
        "userId": "EoZTHzlHadWZxyZkxegKwxZlamY2",
        "query": "all chart data",
        "top_k": 20
    }
    headers = {
        "Authorization": "Bearer dev_EoZTHzlHadWZxyZkxegKwxZlamY2",
        "Content-Type": "application/json"
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers) as response:
            data = await response.json()
            print("FIRST RESULT:", data.get('results', [{}])[0])

asyncio.run(test())

import os
import aiohttp
import asyncio
import json
from dotenv import load_dotenv

load_dotenv("livekit_server/agent-starter-python/.env.local")

API_KEY = os.getenv("SUNO_API_KEY")
BASE_URL = "https://api.sunoapi.org/api/v1"

async def check_status(task_id):
    url = f"{BASE_URL}/generate/record-info"
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }
    params = {"taskId": task_id}
    
    print(f"Checking status for task: {task_id}")
    print(f"URL: {url}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params) as response:
            print(f"Status Code: {response.status}")
            text = await response.text()
            print(f"Response Body: {text}")

if __name__ == "__main__":
    task_id = "7a8842f48c31a72fa054f799c16a655d"
    asyncio.run(check_status(task_id))

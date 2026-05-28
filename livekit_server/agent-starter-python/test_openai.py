import os
import asyncio
from openai import AsyncOpenAI

async def main():
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    try:
        response = await client.chat.completions.create(
            model='gpt-5.5',
            messages=[{"role": "user", "content": "Hello"}],
            max_completion_tokens=5
        )
        print("Success! Response:", response.choices[0].message.content)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())

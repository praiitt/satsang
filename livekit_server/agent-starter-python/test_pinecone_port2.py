import asyncio
from src.pinecone_retriever import PineconeKundliRetriever
from dotenv import load_dotenv

load_dotenv(".env.local")

async def test():
    retriever = PineconeKundliRetriever()
    result = await retriever.get_user_chart_context("EoZTHzlHadWZxyZkxegKwxZlamY2")
    print(f"Result length: {len(result) if result else 0}")
    print(f"Result type: {type(result)}")
    print(f"Result value: {result}")

asyncio.run(test())

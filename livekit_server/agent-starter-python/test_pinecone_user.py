import asyncio
from src.pinecone_retriever import PineconeKundliRetriever
from dotenv import load_dotenv

load_dotenv(".env.local")

async def test():
    retriever = PineconeKundliRetriever()
    result = await retriever.get_user_chart_context("EoZTHzlHadWZxyZkxegKwxZlamY2")
    if result and len(result) > 100:
        print("SUCCESS! Pinecone returned data:")
        print(result[:500] + "...")
    else:
        print("FAILED or EMPTY result.")

asyncio.run(test())

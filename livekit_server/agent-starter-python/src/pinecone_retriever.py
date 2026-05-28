import os
import aiohttp
import json
import logging
from dotenv import load_dotenv

logger = logging.getLogger("pinecone_retriever")

# Load environment variables
load_dotenv('.env.local')

class PineconeKundliRetriever:
    """Retrieves user's astrological charts from Pinecone via the Astrology Backend."""
    
    def __init__(self):
        self.backend_url = os.getenv("ASTROLOGY_BACKEND_URL", "http://localhost:3001")

    async def _search(self, user_id: str, query: str, max_results: int) -> list:
        """Internal helper: hits Pinecone search endpoint and returns raw results."""
        url = f"{self.backend_url}/api/pinecone/pinecone-search"
        payload = {"userId": user_id, "query": query, "maxResults": max_results}
        headers = {"Authorization": f"Bearer dev_{user_id}", "Content-Type": "application/json"}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('results', [])
                text = await response.text()
                logger.error(f"❌ Backend returned {response.status}: {text}")
                return []

    async def get_chart_index(self, user_id: str) -> str:
        """
        Returns a lightweight index of all chart types available for the user
        (no full content). Used to seed the system prompt without bloating it.
        """
        if not user_id or user_id == "default_user":
            return ""
        try:
            results = await self._search(user_id, "all chart data", 50)
            if not results:
                return "No chart data available for this user yet."
            chart_types = list({r.get('metadata', {}).get('chartType', 'unknown') for r in results})
            index_str = (
                f"This user has {len(results)} astrological chart records stored in the database. "
                f"Available chart types: {', '.join(sorted(chart_types))}.\n"
                "Use the 'query_user_charts' tool with the user's specific question to retrieve "
                "the exact charts relevant to any topic they ask about."
            )
            logger.info(f"📋 Chart index built for {user_id}: {len(results)} records, types: {chart_types}")
            return index_str
        except Exception as e:
            logger.error(f"❌ Exception building chart index: {e}")
            return ""

    async def query_charts_for_topic(self, user_id: str, query: str, top_k: int = 8) -> str:
        """
        Performs a targeted semantic search on the user's charts based on a specific query.
        Returns the top_k most relevant chart sections formatted for LLM consumption.
        """
        if not user_id or user_id == "default_user":
            return "No user identified."
        try:
            results = await self._search(user_id, query, top_k)
            if not results:
                return f"No chart data found relevant to: {query}"
            parts = []
            for result in results:
                metadata = result.get('metadata', {})
                content = metadata.get('content', '') or result.get('content', '')
                chart_type = metadata.get('chartType', 'unknown')
                score = result.get('score', 0)
                parts.append(f"[{chart_type.upper()}] (relevance: {score:.2f})\n{content}")
            formatted = "\n\n".join(parts)
            logger.info(f"✅ Dynamic chart query '{query}' returned {len(results)} charts for {user_id}")
            return formatted
        except Exception as e:
            logger.error(f"❌ Exception in query_charts_for_topic: {e}")
            return "Error retrieving chart data."

    async def get_user_chart_context(self, user_id: str) -> str:
        """
        DEPRECATED: Loads all charts at once. Use get_chart_index + query_charts_for_topic instead.
        Kept for backwards compatibility.
        """
        return await self.get_chart_index(user_id)

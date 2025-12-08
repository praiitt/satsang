import os
import logging
from typing import Optional, Dict, Any, List
from pinecone import Pinecone

logger = logging.getLogger("pinecone_kundli_retriever")

class KundliRetriever:
    """
    Retrieves user's Kundli data from Pinecone based on Firebase UID.
    """
    
    def __init__(self):
        api_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX", "rraasi-rag")
        
        if not api_key:
            logger.error("PINECONE_API_KEY not set")
            raise ValueError("PINECONE_API_KEY not set")
        
        logger.info(f"Initializing Pinecone client for index: {index_name}")
        
        try:
            # Initialize Pinecone
            self.pc = Pinecone(api_key=api_key)
            self.index = self.pc.Index(index_name)
            
            # Using OpenAI's text-embedding-3-small dimension
            self.embedding_dimension = 1536
            
            logger.info("✅ Pinecone client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
            raise
    
    async def get_user_kundli(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve user's complete Kundli data from Pinecone.
        
        Args:
            user_id: Firebase UID of the user
            
        Returns:
            Dictionary containing user's birth chart data, or None if not found
        """
        try:
            logger.info(f"Fetching Kundli for user: {user_id}")
            
            # Query Pinecone with userId filter
            # We use a zero vector because we're filtering by metadata for exact match
            # This is effectively a metadata lookup
            query_response = self.index.query(
                vector=[0.0] * self.embedding_dimension,
                filter={"userId": {"$eq": user_id}},
                top_k=1,
                include_metadata=True
            )
            
            if not query_response.matches:
                logger.warning(f"No Kundli found for user: {user_id}")
                return None
            
            # Get first match (should be user's birth chart)
            match = query_response.matches[0]
            kundli_data = match.metadata
            
            logger.info(f"✅ Found Kundli for user {user_id}")
            return kundli_data
            
        except Exception as e:
            logger.error(f"Error fetching Kundli from Pinecone: {e}", exc_info=True)
            return None
    
    async def get_user_chart_summary(self, user_id: str) -> str:
        """
        Get a natural language summary of user's chart for the LLM context.
        
        Args:
            user_id: Firebase UID
            
        Returns:
            Formatted string summary of the chart
        """
        kundli = await self.get_user_kundli(user_id)
        
        if not kundli:
            return "User's birth chart data is not available."
        
        # Format chart data for LLM consumption
        # Note: Adjusting field names based on typical Pinecone metadata structure
        # We handle potential missing fields gracefully
        
        summary = f"""
USER'S BIRTH CHART DATA:
Birth Details:
- Date: {kundli.get('birthDate', 'Unknown')}
- Time: {kundli.get('birthTime', 'Unknown')}
- Place: {kundli.get('birthPlace', 'Unknown')}

Core Chart Elements:
- Rashi (Moon Sign): {kundli.get('rashi', 'Unknown')}
- Lagna (Ascendant): {kundli.get('lagna', 'Unknown')}
- Nakshatra: {kundli.get('nakshatra', 'Unknown')} (Pada {kundli.get('nakshatraPada', 'Unknown')})

Current Dasha Periods:
- Mahadasha: {kundli.get('mahadasha', 'Unknown')}
- Antardasha: {kundli.get('antardasha', 'Unknown')}

Planetary Positions:
- Sun: {kundli.get('sun_sign', 'Unknown')} in House {kundli.get('sun_house', 'Unknown')}
- Moon: {kundli.get('moon_sign', 'Unknown')} in House {kundli.get('moon_house', 'Unknown')}
- Mars: {kundli.get('mars_sign', 'Unknown')} in House {kundli.get('mars_house', 'Unknown')}
- Mercury: {kundli.get('mercury_sign', 'Unknown')} in House {kundli.get('mercury_house', 'Unknown')}
- Jupiter: {kundli.get('jupiter_sign', 'Unknown')} in House {kundli.get('jupiter_house', 'Unknown')}
- Venus: {kundli.get('venus_sign', 'Unknown')} in House {kundli.get('venus_house', 'Unknown')}
- Saturn: {kundli.get('saturn_sign', 'Unknown')} in House {kundli.get('saturn_house', 'Unknown')}
- Rahu: {kundli.get('rahu_sign', 'Unknown')} in House {kundli.get('rahu_house', 'Unknown')}
- Ketu: {kundli.get('ketu_sign', 'Unknown')} in House {kundli.get('ketu_house', 'Unknown')}

Manglik Status: {'Yes' if str(kundli.get('manglik', '')).lower() == 'true' else 'No'}

Beneficial Yogas: {kundli.get('yogas', 'None recorded')}
"""
        
        return summary.strip()
    
    def _format_chart_text(self, chart_data: dict) -> str:
        """Format chart data into text for embedding generation."""
        text_parts = []
        
        text_parts.append(f"User Birth Details:")
        text_parts.append(f"Birth Date: {chart_data.get('birthDate', 'Unknown')}")
        text_parts.append(f"Birth Time: {chart_data.get('birthTime', 'Unknown')}")
        text_parts.append(f"Birth Place: {chart_data.get('birthPlace', 'Unknown')}")
        
        if chart_data.get('rashi'):
            text_parts.append(f"Rashi (Moon Sign): {chart_data['rashi']}")
        if chart_data.get('lagna'):
            text_parts.append(f"Lagna (Ascendant): {chart_data['lagna']}")
        if chart_data.get('nakshatra'):
            text_parts.append(f"Nakshatra: {chart_data['nakshatra']}")
        
        return " ".join(text_parts)
    
    async def save_basic_chart(self, user_id: str, chart_data: dict):
        """
        Save or update basic birth chart data for a user.
        
        Args:
            user_id: Firebase UID
            chart_data: Dictionary containing birth details and basic chart info
        """
        try:
            # Generate a simple summary text for embedding
            summary_text = f"""
            Birth chart for user {user_id}.
            Birth Date: {chart_data.get('birthDate', 'N/A')}
            Birth Time: {chart_data.get('birthTime', 'N/A')}
            Birth Place: {chart_data.get('birthPlace', 'N/A')}
            Rashi: {chart_data.get('rashi', 'N/A')}
            Lagna: {chart_data.get('lagna', 'N/A')}
            """.strip()
            
            # Generate embedding using OpenAI
            from openai import AsyncOpenAI
            openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            embedding_response = await openai_client.embeddings.create(
                input=summary_text,
                model="text-embedding-3-small"
            )
            embedding = embedding_response.data[0].embedding
            
            # Upsert to Pinecone
            # Using user_id as the vector ID
            self.index.upsert(
                vectors=[{
                    "id": user_id,
                    "values": embedding,
                    "metadata": chart_data
                }]
            )
            
            logger.info(f"✅ Saved basic chart for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error saving basic chart: {e}")
            raise
    
    async def get_planet_data(
        self,
        user_id: str,
        planet_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific planet data for a user.
        
        Args:
            user_id: Firebase UID
            planet_name: Name of planet (sun, moon, mars, etc.)
            
        Returns:
            Planet data dict or None
        """
        try:
            result = self.index.query(
                vector=[0.0] * self.embedding_dimension,
                filter={
                    "userId": user_id,
                    "data_type": "planet",
                    "planet_name": planet_name.lower()
                },
                top_k=1,
                include_metadata=True
            )
            
            if result.matches:
                return result.matches[0].metadata
            return None
        except Exception as e:
            logger.error(f"Error fetching planet data: {e}")
            return None
    
    async def get_house_data(
        self,
        user_id: str,
        house_number: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific house data for a user.
        
        Args:
            user_id: Firebase UID
            house_number: House number (1-12)
            
        Returns:
            House data dict or None
        """
        try:
            result = self.index.query(
                vector=[0.0] * self.embedding_dimension,
                filter={
                    "userId": user_id,
                    "data_type": "house",
                    "house_number": house_number
                },
                top_k=1,
                include_metadata=True
            )
            
            if result.matches:
                return result.matches[0].metadata
            return None
        except Exception as e:
            logger.error(f"Error fetching house data: {e}")
            return None
    
    async def get_dasha_data(
        self,
        user_id: str,
        dasha_type: str = "vimshottari"
    ) -> Optional[Dict[str, Any]]:
        """
        Get dasha period data for a user.
        
        Args:
            user_id: Firebase UID
            dasha_type: Type of dasha system
            
        Returns:
            Dasha data dict or None
        """
        try:
            result = self.index.query(
                vector=[0.0] * self.embedding_dimension,
                filter={
                    "userId": user_id,
                    "data_type": "dasha",
                    "dasha_system": dasha_type
                },
                top_k=1,
                include_metadata=True
            )
            
            if result.matches:
                return result.matches[0].metadata
            return None
        except Exception as e:
            logger.error(f"Error fetching dasha data: {e}")
            return None
    
    async def get_dosha_data(
        self,
        user_id: str,
        dosha_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific dosha analysis for a user.
        
        Args:
            user_id: Firebase UID
            dosha_type: Type of dosha (manglik, kalsarpa, pitra, sadhesati)
            
        Returns:
            Dosha data dict or None
        """
        try:
            result = self.index.query(
                vector=[0.0] * self.embedding_dimension,
                filter={
                    "userId": user_id,
                    "data_type": "dosha",
                    "dosha_name": dosha_type.lower()
                },
                top_k=1,
                include_metadata=True
            )
            
            if result.matches:
                return result.matches[0].metadata
            return None
        except Exception as e:
            logger.error(f"Error fetching dosha data: {e}")
            return None

import logging
import json
import os
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, TypedDict

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    RunContext,
    function_tool,
    WorkerOptions, 
    cli, 
    JobContext, 
    AgentSession,
    inference,
)
from firebase_db import FirebaseDB
from firebase_admin import firestore

# Load environment variables
load_dotenv(dotenv_path='.env.local')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chitragupta_agent")

# Define Types for Strict Schema Validation
class FilterItem(TypedDict):
    field: str
    op: str
    value: str

class ChitraguptaAgent(Agent):
    def __init__(self, publish_data_fn=None):
        super().__init__(
            instructions="""You are Chitragupta, the divine record keeper and data analyst for the Satsang universe. 
Your role is to help administrators and authorized users "talk to their database".

**IDENTITY:**
- Name: Chitragupta (चित्रगुप्त)
- Tone: Precise, formal but helpful, authoritative yet polite.
- Language: Mixed Hindi/English (Hinglish) or pure English as preferred by the user.

**CAPABILITIES:**
You have direct access to the Firestore database through powerful tools. You can:
1. List available collections (`list_collections`)
2. Inspect the structure of data (`get_collection_schema`)
3. Count records matching specific criteria (`count_documents`)
4. Run complex queries to find specific data (`query_database`)

**ALLOWED COLLECTIONS:**
You strictly operate ONLY on these collections:
- music_tracks
- users
- organizations
- coinBalances
- coinTransactions
- contentTemplates
- scheduledContent
- contentDeliveries
- analytics
- satsang_plans

**BEHAVIOR:**
- When asked a vague question (e.g. "how is the app doing?"), first check available stats (e.g. user count, active sessions) before answering.
- ALWAYS confirm the collection name if unsure.
- If a query returns too many results, summarize them or ask the user if they want to see the top N results.
- For "how many" questions, ALWAYS use `count_documents` - do not fetch all docs and count them yourself.
- If asking about "recent" items, sort by `createdAt` descending.
- Refuse to modify or delete data. You are a *record keeper* (Read-Only), not a modifier.

**EXAMPLE INTERACTIONS:**
- User: "How many music tracks are there?"
  Action: Call `count_documents("music_tracks")`
  Response: "There are 1,250 music tracks in the repository."

- User: "Who are the top 3 users with most coins?"
  Action: Call `query_database("coinBalances", order_by="balance", order_desc=True, limit=3)`
  
- User: "What kind of data do we have for organizations?"
  Action: Call `get_collection_schema("organizations")`
"""
        )
        self._publish_data_fn = publish_data_fn
        self.db_helper = FirebaseDB()
        # Whitelist
        self.allowed_collections = [
            'music_tracks', 'users', 'organizations', 'coinBalances', 
            'coinTransactions', 'contentTemplates', 'scheduledContent', 
            'contentDeliveries', 'analytics', 'satsang_plans'
        ]

    def _validate_collection(self, collection_name: str) -> bool:
        if collection_name not in self.allowed_collections:
            logger.warning(f"Access denied to collection: {collection_name}")
            return False
        return True

    @function_tool
    async def list_collections(self, context: RunContext) -> str:
        """Returns the list of all database collections that can be queried.
        
        Use this tool when you need to know what kind of data is available or to correct a collection name.
        """
        return f"Access is granted to the following collections: {', '.join(self.allowed_collections)}"

    @function_tool
    async def get_collection_schema(self, context: RunContext, collection_name: str) -> str:
        """Fetches the field names and types from the most recent document in a collection.
        
        Use this to understand the structure of the data before writing complex queries.
        
        Args:
            collection_name: Name of the collection to inspect.
        """
        if not self._validate_collection(collection_name):
            return f"Error: Access to '{collection_name}' is restricted."

        if not self.db_helper.db:
             return "Error: Database connection not active."
        
        try:
            # Get one recent document
            docs = self.db_helper.db.collection(collection_name).limit(1).get()
            if not docs:
                return f"Collection '{collection_name}' is empty."
            
            data = docs[0].to_dict()
            
            # Simple schema inference
            schema = []
            for key, value in data.items():
                val_type = type(value).__name__
                if isinstance(value, datetime):
                    val_type = "timestamp"
                schema.append(f"- {key}: {val_type}")
                
            return f"Schema for '{collection_name}' (inferred from 1 doc):\n" + "\n".join(schema)
        except Exception as e:
            logger.error(f"Error getting schema for {collection_name}: {e}")
            return f"Failed to retrieve schema: {str(e)}"

    @function_tool
    async def count_documents(
        self, 
        context: RunContext, 
        collection_name: str, 
        filters: List[FilterItem] = []
    ) -> str:
        """Counts the number of documents in a collection, optionally matching filters.
        
        Args:
            collection_name: The collection to count.
            filters: Optional list of filters. Each filter is a dict: {"field": "status", "op": "==", "value": "active"}
                     Supported ops: "==", ">", "<", ">=", "<=", "array-contains"
        """
        if not self._validate_collection(collection_name):
            return f"Error: Access to '{collection_name}' is restricted."
        
        if not self.db_helper.db:
             return "Error: Database connection not active."

        try:
            query_ref = self.db_helper.db.collection(collection_name)
            
            for f in filters:
                field = f.get("field")
                op = f.get("op")
                val = f.get("value")
                if field and op and val is not None:
                     query_ref = query_ref.where(field, op, val)
            
            # Use aggregation query for cost-effective counting
            count_query = query_ref.count()
            results = count_query.get()
            
            count_val = results[0][0].value
            filter_desc = f" matching {filters}" if filters else ""
            return f"There are {count_val} documents in '{collection_name}'{filter_desc}."
            
        except Exception as e:
            logger.error(f"Error counting docs in {collection_name}: {e}")
            return f"Failed to count documents: {str(e)}"

    @function_tool
    async def query_database(
        self,
        context: RunContext,
        collection_name: str,
        filters: List[FilterItem] = [],
        limit: int = 5,
        order_by: str = None,
        order_desc: bool = False
    ) -> str:
        """Executes a query against the Firestore database to retrieve actual data.
        
        Args:
            collection_name: The target collection.
            filters: List of filters like [{"field": "status", "op": "==", "value": "active"}].
            limit: Max number of results (default 5, max 20).
            order_by: Field name to sort by.
            order_desc: True for descending order, False for ascending.
        """
        if not self._validate_collection(collection_name):
            return f"Error: Access to '{collection_name}' is restricted."

        if not self.db_helper.db:
             return "Error: Database connection not active."
             
        # Safety clamp
        limit = min(max(1, limit), 20)
        
        try:
            query_ref = self.db_helper.db.collection(collection_name)
            
            # Apply filters
            for f in filters:
                field = f.get("field")
                op = f.get("op")
                val = f.get("value")
                if field and op and val is not None:
                     query_ref = query_ref.where(field, op, val)
            
            # Apply ordering
            if order_by:
                direction = firestore.Query.DESCENDING if order_desc else firestore.Query.ASCENDING
                query_ref = query_ref.order_by(order_by, direction=direction)
            
            # Apply limit
            query_ref = query_ref.limit(limit)
            
            docs = query_ref.stream()
            results = []
            
            for doc in docs:
                d = doc.to_dict()
                # Sanitize timestamps for JSON serialization/readability
                for k, v in d.items():
                    if isinstance(v, datetime):
                        d[k] = v.isoformat()
                d['id'] = doc.id
                results.append(d)
                
            if not results:
                return f"No matching documents found in '{collection_name}'."
                
            return f"Found {len(results)} results:\n" + json.dumps(results, indent=2)
            
        except Exception as e:
            logger.error(f"Error querying {collection_name}: {e}")
            return f"Query failed: {str(e)}"

async def entrypoint(ctx: JobContext):
    logger.info("Chitragupta Agent Entrypoint Started")
    
    await ctx.connect()
    logger.info(f"Connected to room: {ctx.room.name}")
    
    agent = ChitraguptaAgent(publish_data_fn=ctx.room.local_participant.publish_data)
    
    session = AgentSession(
        stt=inference.STT(), # Default Deepgram
        llm=inference.LLM(model="openai/gpt-4o-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3", 
            voice="00967b2f-88a6-4a31-8153-110a92134b9f"
        ),
        preemptive_generation=True,
    )
    
    # Wait a moment for connection stability
    await asyncio.sleep(1)
    
    session.on("user_speech_committed", lambda msg: logger.info(f"User speech verified: {msg}"))
    session.on("agent_speech_committed", lambda msg: logger.info(f"Agent speaking: {msg}"))
    
    await session.start(agent=agent, room=ctx.room)
    
    # Proactive greeting
    await asyncio.sleep(1)
    await session.say("Namaste. I am Chitragupta, the divine record keeper. What would you like to know about the database?", allow_interruptions=True)

if __name__ == "__main__":
    logger.info("Starting Chitragupta Agent Standalone...")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="chitragupta"))

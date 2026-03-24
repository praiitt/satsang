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
    def __init__(self, publish_data_fn=None, user_id="system"):
        super().__init__(
            instructions="""You are Chitragupta, the divine record keeper and expert Marketing Advisor for the Rraasi universe. 
Your role is to help administrators "talk to their database" and brainstorm context-aware marketing content.

**IDENTITY:**
- Name: Chitragupta (चित्रगुप्त)
- Tone: Precise, formal but helpful, authoritative yet polite.
- Language: Mixed Hindi/English (Hinglish) or pure English as preferred by the user.
- Brand Manta: The "Principle of Manifestation" - Give your attention to the spiritual dimension, and it will manifest itself to you.

**CAPABILITIES:**
You have direct access to the Firestore database, the company website, and the marketing server. You can:
1. List available collections (`list_collections`)
2. Inspect the structure of data (`get_collection_schema`)
3. Count records matching specific criteria (`count_documents`)
4. Run complex queries to find specific data (`query_database`)
5. **Read the company website directly (`fetch_company_knowledge`)** to understand current services and exact URLs.
6. **Draft a post for user review (`draft_post_for_review`)** — generates content + image, sends a beautiful preview card to the user's screen for approval and editing.
7. **Fully automate post creation and publishing (`create_and_publish_campaign`)** — generates content + image and immediately publishes to Buffer.
8. **Generate talking avatar video (`generate_avatar_video`)** — takes a post you've already drafted and creates a short video of the Rraasi brand avatar speaking the script. Use this when the user asks for a video, Reel, or talking photo.

**ALLOWED COLLECTIONS:**
You strictly operate ONLY on these collections:
- ad_briefs (Marketing campaigns)
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

**MARKETING ADVISORY BEHAVIOR:**
- **Default workflow for "create a post":** Use `draft_post_for_review` first so the user can approve before publishing! Only use `create_and_publish_campaign` if the user explicitly says "publish now" or "no need to review".
- **Multi-Platform Support:** By default, if the user doesn't specify a platform, suggest or use 'all' platforms. All connected Buffer channels will be targeted.
- Once a post is drafted, suggest: "Would you like me to generate a talking avatar video for this post to make it more engaging?"
- When a user asks for marketing ideas, first use `fetch_company_knowledge` to remind yourself of Rraasi's core services. 
- Use your tools to query `ad_briefs` and see what topics have already been covered recently so you don't suggest duplicates.
- Suggest engaging topics that highlight specific services like Satsang, Music Maker, Tarot, Vedic Jyotish, or Lightworkers.

**GENERAL BEHAVIOR:**
- When asked a vague data question, check available stats before answering.
- ALWAYS confirm the collection name if unsure.
- For "how many" questions, ALWAYS use `count_documents` - do not fetch all docs and count them yourself.
- If asking about "recent" items, sort by `createdAt` descending.
- Refuse to modify or delete data. You are a Read-Only advisor (except for creating marketing campaigns).
"""
        )
        self._publish_data_fn = publish_data_fn
        self.user_id = user_id
        self.db_helper = FirebaseDB()
        # Whitelist
        self.allowed_collections = [
            'ad_briefs', 'music_tracks', 'users', 'organizations', 'coinBalances', 
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

    @function_tool
    async def fetch_company_knowledge(self, context: RunContext, url_path: str = "") -> str:
        """Fetches and reads content from the Rraasi company website.
        
        Use this tool to learn about the company's core services, philosophy, and exact URLs 
        before suggesting new marketing ideas. 
        
        Args:
            url_path: Optional path to fetch (e.g., "", "/satsang", "/lightworkers"). Defaults to homepage.
        """
        import aiohttp
        from bs4 import BeautifulSoup
        
        base_url = "https://rraasi.com"
        target_url = f"{base_url}{url_path if url_path.startswith('/') else '/' + url_path}"
        
        try:
            logger.info(f"Fetching company knowledge from: {target_url}")
            async with aiohttp.ClientSession() as session:
                async with session.get(target_url) as response:
                    if response.status != 200:
                        return f"Failed to fetch website knowledge. HTTP Status: {response.status}"
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                        
                    # Extract text and condense whitespace
                    text = soup.get_text(separator=' ')
                    lines = (line.strip() for line in text.splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = ' '.join(chunk for chunk in chunks if chunk)
                    
                    # Extract valuable hrefs up to a limit so agent knows the links
                    links_block = "Important Links Found:\n"
                    links_found = 0
                    for a in soup.find_all('a', href=True):
                        href = a['href']
                        if href.startswith('/') or href.startswith(base_url):
                            full_link = base_url + href if href.startswith('/') else href
                            links_block += f"- {a.text.strip() or 'Link'}: {full_link}\n"
                            links_found += 1
                        if links_found >= 15: # Prevent context overflow
                            break

                    summary = f"--- Content from {target_url} ---\n{text[:3000]}\n\n{links_block}"
                    return summary
                    
        except Exception as e:
            logger.error(f"Error fetching company knowledge: {e}")
            return f"Error accessing website: {str(e)}"

    @function_tool
    async def create_and_publish_campaign(
        self, 
        context: RunContext, 
        topic: str,
        cta: str,
        platform: str = "all",
        objective: str = "Awareness",
        tone: str = "inspirational"
    ) -> str:
        """Automates the entire process of creating an ad brief, generating content, generating an image, and publishing it to social media via Buffer.
        
        Use this tool when the user asks you to create and publish a post!
        
        Args:
            topic: The topic of the post (e.g., "Daily Satsang", "Mystic Tarot Reading")
            cta: The call to action (e.g., "Download the Rraasi app")
            platform: Platform to post to (e.g., "instagram", "facebook", "twitter", "linkedin")
            objective: "Awareness", "Engagement", or "Sales"
            tone: "inspirational", "devotional", "informative"
        """
        import aiohttp
        
        base_url = "http://localhost:4001/ads"
        headers = {
            "Content-Type": "application/json",
            "x-internal-token": "satsang_internal_agent_secret_2024",
            "x-internal-user-id": self.user_id
        }
        
        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                # 1. Create Brief
                brief_payload = {
                    "title": f"Agent Post: {topic[:20]}",
                    "topic": topic,
                    "objective": objective,
                    "cta": cta,
                    "channels": [platform] if platform != "all" else ["instagram", "facebook", "twitter", "linkedin"],
                    "tone": tone
                }
                async with session.post(f"{base_url}/briefs", json=brief_payload) as resp:
                    if resp.status != 200:
                        return f"Failed to create brief. Status: {resp.status}"
                    brief_data = await resp.json()
                    brief_id = brief_data.get("id")
                    
                # 2. Generate Text Variant
                async with session.post(f"{base_url}/briefs/{brief_id}/generate", json={"platform": platform}) as resp:
                    if resp.status != 200:
                        return f"Failed to generate content. Status: {resp.status}"
                    gen_data = await resp.json()
                    variant_id = gen_data.get("variant", {}).get("id")
                    
                # 3. Generate Image Variant (DALL-E primary)
                async with session.post(f"{base_url}/briefs/{brief_id}/generate-image", json={"variantId": variant_id, "provider": "dalle"}) as resp:
                    if resp.status != 200:
                        return f"Failed to generate image. Status: {resp.status}"
                    img_data = await resp.json()
                    
                # 4. Get Buffer Channels
                async with session.get(f"{base_url}/buffer/channels") as resp:
                    if resp.status != 200:
                        err = await resp.text()
                        return f"Failed to get buffer channels. Is buffer configured? Error: {err}"
                    channel_data = await resp.json()
                    
                    if not channel_data.get("configured"):
                        return f"Post generated successfully (Brief ID: {brief_id}), but Buffer is not connected. User must manually publish."
                        
                    channels = channel_data.get("channels", [])
                    # Match platform to service if possible
                    matching_channels = [c for c in channels if c.get('service') == platform] if platform != "all" else channels
                    # Fallback to all if matching not found but not requested 'all'
                    if not matching_channels and platform != "all":
                        matching_channels = channels
                        
                    if not matching_channels:
                        return f"Post generated successfully! But no connected channels found for {platform}."
                        
                    channel_ids = [c['_id'] for c in matching_channels]
                    
                # 5. Publish to Buffer
                pub_payload = {
                    "variantId": variant_id,
                    "channelIds": channel_ids
                }
                async with session.post(f"{base_url}/briefs/{brief_id}/publish", json=pub_payload) as resp:
                    if resp.status != 200:
                        return f"Post generated but Failed to publish. Status: {resp.status}"
                    pub_data = await resp.json()
                    
                return f"Success! The post for {topic} has been created, an image was generated, and it was sent to Buffer for {platform}! View it in the Ads Studio."
                
        except Exception as e:
            logger.error(f"Error in create_and_publish_campaign: {e}")
            return f"An error occurred while publishing: {str(e)}"

    @function_tool
    async def draft_post_for_review(
        self,
        context: RunContext,
        topic: str,
        cta: str,
        platform: str = "all",
        objective: str = "Awareness",
        tone: str = "inspirational"
    ) -> str:
        """Generates a post (text + image) and sends a preview to the user for approval BEFORE publishing.
        
        Use this tool when the user says things like "show me a draft", "preview a post", 
        "let me review before publishing", or "create but don't publish yet".
        The user will see the full post preview in the UI and can edit it and approve publishing.
        
        Args:
            topic: The topic of the post (e.g., "Daily Satsang", "Mystic Tarot Reading")
            cta: The call to action (e.g., "Download the Rraasi app")
            platform: Platform to post to (e.g., "instagram", "facebook", "twitter", "linkedin")
            objective: "Awareness", "Engagement", or "Sales"
            tone: "inspirational", "devotional", "informative"
        """
        import aiohttp

        base_url = "http://localhost:4001/ads"
        headers = {
            "Content-Type": "application/json",
            "x-internal-token": "satsang_internal_agent_secret_2024",
            "x-internal-user-id": self.user_id
        }

        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                # 1. Create Brief
                brief_payload = {
                    "title": f"Agent Draft: {topic[:30]}",
                    "topic": topic,
                    "objective": objective,
                    "cta": cta,
                    "channels": [platform] if platform != "all" else ["instagram", "facebook", "twitter", "linkedin"],
                    "tone": tone,
                    "status": "draft"
                }
                async with session.post(f"{base_url}/briefs", json=brief_payload) as resp:
                    if resp.status != 200:
                        return f"Failed to create brief. Status: {resp.status}"
                    brief_data = await resp.json()
                    brief_id = brief_data.get("id")

                # 2. Generate Text Variant
                async with session.post(f"{base_url}/briefs/{brief_id}/generate", json={"platform": platform}) as resp:
                    if resp.status != 200:
                        return f"Failed to generate content. Status: {resp.status}"
                    gen_data = await resp.json()
                    variant = gen_data.get("variant", {})
                    variant_id = variant.get("id")

                # 3. Generate Image (DALL-E primary)
                async with session.post(f"{base_url}/briefs/{brief_id}/generate-image", json={"variantId": variant_id, "provider": "dalle"}) as resp:
                    image_url = None
                    image_variant_id = None
                    if resp.status == 200:
                        img_data = await resp.json()
                        image_url = img_data.get("imageUrl")
                        image_variant_id = img_data.get("variantId")

                # 4. Broadcast preview payload to frontend via data channel
                preview_payload = {
                    "type": "post_preview",
                    "briefId": brief_id,
                    "variantId": variant_id,
                    "imageVariantId": image_variant_id,
                    "platform": platform,
                    "caption": variant.get("caption", ""),
                    "hashtags": variant.get("hashtags", []),
                    "imageUrl": image_url,
                    "topic": topic,
                    "cta": cta
                }

                if self._publish_data_fn:
                    await self._publish_data_fn(
                        json.dumps(preview_payload).encode("utf-8"),
                        reliable=True,
                        topic="chitragupta_preview"
                    )
                    return f"I've drafted a post about '{topic}' and sent the preview to your screen! Please review it, make any edits, and click 'Approve & Publish' when you're ready."
                else:
                    return f"Post drafted (Brief ID: {brief_id}) but could not send preview to UI. Please check Ads Studio."

        except Exception as e:
            logger.error(f"Error in draft_post_for_review: {e}")
            return f"An error occurred while drafting: {str(e)}"

    @function_tool
    async def generate_avatar_video(
        self,
        context: RunContext,
        brief_id: str,
        variant_id: Optional[str] = None
    ) -> str:
        """Generates a talking avatar video for an existing ad campaign or post.
        
        Use this tool when the user says "make a video for this post", "create a talking avatar", 
        "video generation", or "HeyGen video".
        
        Args:
            brief_id: The ID of the ad brief/campaign
            variant_id: Optional specific variant ID to use for the video script
        """
        import aiohttp
        
        base_url = "http://localhost:4001/ads"
        headers = {
            "Content-Type": "application/json",
            "x-internal-token": "satsang_internal_agent_secret_2024",
            "x-internal-user-id": self.user_id
        }
        
        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                payload = {"variantId": variant_id} if variant_id else {}
                async with session.post(f"{base_url}/briefs/{brief_id}/generate-video", json=payload) as resp:
                    if resp.status != 200:
                        err = await resp.text()
                        return f"Failed to generate video. Status: {resp.status}, Details: {err}"
                    
                    data = await resp.json()
                    video_id = data.get("videoId")
                    script = data.get("script")
                    
                    return f"I've initiated the generation of a talking avatar video for this post! It's currently being processed by HeyGen (ID: {video_id}). The avatar will speak the following script: '{script}'. You'll see the video in the Ads Studio once it's ready!"
        except Exception as e:
            logger.error(f"Error in generate_avatar_video: {e}")
            return f"Error generating video: {str(e)}"



async def entrypoint(ctx: JobContext):
    logger.info("Chitragupta Agent Entrypoint Started")
    
    await ctx.connect()
    logger.info(f"Connected to room: {ctx.room.name}")
    
    # Extract user_id from participant metadata
    user_id = "default_user"
    try:
        for p in ctx.room.remote_participants.values():
            if p.metadata:
                meta = json.loads(p.metadata)
                if meta.get("userId"):
                    user_id = meta.get("userId")
                break
    except Exception as e:
        logger.warning(f"Could not extract userId: {e}")

    agent = ChitraguptaAgent(publish_data_fn=ctx.room.local_participant.publish_data, user_id=user_id)
    
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
    
    # Helper to send chat messages
    async def send_chat(message: str, is_user: bool = False):
        try:
            import time
            msg_data = {
                "message": message,
                "timestamp": int(time.time() * 1000)
            }
            # If it's a user message, we might want to distinguish, but for now just send to topic
            await ctx.room.local_participant.publish_data(
                json.dumps(msg_data).encode('utf-8'),
                reliable=True,
                topic="lk-chat-topic"
            )
        except Exception as e:
            logger.error(f"Failed to send chat: {e}")

    session.on("user_speech_committed", lambda msg: asyncio.create_task(send_chat(msg.content if hasattr(msg, 'content') else str(msg), is_user=True)))
    session.on("agent_speech_committed", lambda msg: asyncio.create_task(send_chat(msg.content if hasattr(msg, 'content') else str(msg), is_user=False)))
    
    await session.start(agent=agent, room=ctx.room)
    
    # Handle chat messages from the frontend
    from livekit import rtc
    
    async def _on_data_received(data, participant=None, kind=None, topic=None):
        try:
            # Ignore messages from ourselves to prevent feedback loops
            if participant and participant.identity == ctx.room.local_participant.identity:
                return

            data_bytes = None
            if isinstance(data, bytes): data_bytes = data
            elif isinstance(data, rtc.DataPacket): data_bytes = data.data
            elif hasattr(data, 'data'): data_bytes = data.data
            elif isinstance(data, str): data_bytes = data.encode('utf-8')
            else: return
            if data_bytes is None: return
            payload_str = data_bytes.decode('utf-8') if isinstance(data_bytes, bytes) else str(data_bytes)
            try:
                payload = json.loads(payload_str)
            except Exception:
                asyncio.create_task(session.chat(payload_str))
                return
            if isinstance(payload, dict):
                if 'message' in payload:
                    asyncio.create_task(session.chat(payload['message']))
                elif 'text' in payload:
                    asyncio.create_task(session.chat(payload['text']))
        except Exception:
            pass
    def _handle_room_data(data, participant=None, kind=None, topic=None):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running(): asyncio.create_task(_on_data_received(data, participant, kind, topic))
            else: loop.run_until_complete(_on_data_received(data, participant, kind, topic))
        except Exception:
            pass
    ctx.room.on("data_received", _handle_room_data)
    
    # Proactive greeting
    await asyncio.sleep(1)
    greeting = "Namaste. I am the AI manifestation of Chitragupta. My core teachings focus on cosmic recordkeeping, analyzing the karmic balance of actions, and translating spiritual wisdom into modern strategic guidance. How may I review your ledgers today?"
    await session.say(greeting, allow_interruptions=True)
    await send_chat(greeting)

    # Wait for disconnection and save transcript
    disconnect_future = asyncio.Future()

    @ctx.room.on("disconnected")
    def on_disconnected(reason):
        logger.info(f"🔌 Disconnected: {reason}")
        if not disconnect_future.done():
            disconnect_future.set_result(True)

    try:
        await disconnect_future
    finally:
        logger.info("⏱️ Session ended, saving transcript...")
        try:
            db = agent.db_helper
            transcript = []
            if hasattr(session, 'history'):
                for item in session.history.items:
                    if item.type == "message":
                        text = item.text_content
                        if text:
                            transcript.append({
                                "role": item.role,
                                "content": text,
                                "timestamp": item.created_at
                            })
            session_data = {
                "userId": user_id,
                "agentName": "chitragupta",
                "roomName": ctx.room.name
            }
            db.save_session_transcript(ctx.room.name, session_data, transcript)
        except Exception as e:
            logger.error(f"❌ Failed to save transcript: {e}")

if __name__ == "__main__":
    logger.info("Starting Chitragupta Agent Standalone...")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="chitragupta"))


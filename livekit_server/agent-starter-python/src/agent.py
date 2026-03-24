import logging
from pathlib import Path
import os
import asyncio
import signal

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RoomInputOptions,
    WorkerOptions,
    cli,
    inference,
    metrics,
    function_tool,
    RunContext,
)
# from livekit.plugins import noise_cancellation, silero
from firebase_db import FirebaseDB

async def wait_for_disconnect_and_save_transcript(ctx: JobContext, session: AgentSession, agent_name: str, user_id: str = "unknown"):
    """Waits for room disconnection and saves the session transcript to Firebase."""
    disconnect_future = asyncio.Future()
    
    @ctx.room.on("disconnected")
    def on_disconnected(reason):
        logger.info(f"🔌 Disconnected: {reason}")
        if not disconnect_future.done():
            disconnect_future.set_result(True)
    
    try:
        await disconnect_future
    finally:
        logger.info(f"⏱️ Session ended for {agent_name}, saving transcript...")
        try:
            firebase_db = FirebaseDB()
            
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
            else:
                 logger.warning("Session has no history attribute")
            
            session_data = {
                "userId": user_id,
                "agentName": agent_name,
                "roomName": ctx.room.name
            }
            
            firebase_db.save_session_transcript(ctx.room.name, session_data, transcript)
        except Exception as e:
            logger.error(f"❌ Failed to save transcript: {e}")


# Import bhajan search - use absolute import to avoid issues in worker process
# Defer import to avoid initialization issues
_bhajan_search_loaded = False
_get_bhajan_url_async = None
_list_available_bhajans_async = None
_find_bhajan_by_name_async = None

def _load_bhajan_search():
    """Lazy load bhajan search module to avoid import errors during initialization."""
    global _bhajan_search_loaded, _get_bhajan_url_async, _list_available_bhajans_async, _find_bhajan_by_name_async
    if _bhajan_search_loaded:
        return _get_bhajan_url_async, _list_available_bhajans_async, _find_bhajan_by_name_async
    
    try:
        # Try relative import first (when running as package)
        from .bhajan_search import (
            get_bhajan_url_async,
            list_available_bhajans_async,
            find_bhajan_by_name_async,
        )
        _get_bhajan_url_async = get_bhajan_url_async
        _list_available_bhajans_async = list_available_bhajans_async
        _find_bhajan_by_name_async = find_bhajan_by_name_async
    except ImportError:
        try:
            # Fallback to absolute import
            import sys
            from pathlib import Path
            src_path = Path(__file__).resolve().parent
            if str(src_path) not in sys.path:
                sys.path.insert(0, str(src_path))
            from bhajan_search import (
                get_bhajan_url_async,
                list_available_bhajans_async,
                find_bhajan_by_name_async,
            )
            _get_bhajan_url_async = get_bhajan_url_async
            _list_available_bhajans_async = list_available_bhajans_async
            _find_bhajan_by_name_async = find_bhajan_by_name_async
        except ImportError as e:
            logger.warning(f"Failed to import bhajan_search: {e}. Bhajan playback will not be available.")
            # Create stub async functions
            async def _stub_get_url_async(*args, **kwargs):
                return None
            async def _stub_list_async(*args, **kwargs):
                return []
            async def _stub_find_async(*args, **kwargs):
                return None
            _get_bhajan_url_async = _stub_get_url_async
            _list_available_bhajans_async = _stub_list_async
            _find_bhajan_by_name_async = _stub_find_async
    
    _bhajan_search_loaded = True
    return _get_bhajan_url_async, _list_available_bhajans_async, _find_bhajan_by_name_async

# Configure logging early - before loading environment variables
# This ensures logs are visible even if env loading fails
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)

logger = logging.getLogger("agent")

# Log that module is being imported (this helps diagnose child process issues)
import sys
logger.info("="*60)
logger.info(f"MODULE IMPORT: agent.py is being imported (PID: {os.getpid()})")
logger.info(f"Python executable: {sys.executable}")
logger.info(f"Working directory: {os.getcwd()}")
logger.info(f"Script location: {Path(__file__).resolve()}")
logger.info("="*60)

# Load .env.local from the project root regardless of current working directory
# Try multiple paths to ensure we find it even when run from different contexts
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",  # Standard location
    Path.cwd() / ".env.local",  # Current working directory
    Path("/home/underlitigationcom/satsang/livekit_server/agent-starter-python/.env.local"),  # Absolute path for production
]
_ENV_LOADED = False
logger.info("Attempting to load .env.local file...")
for _env_path in _ENV_PATHS:
    logger.info(f"Checking path: {_env_path} (exists: {_env_path.exists()})")
    if _env_path.exists():
        try:
            load_dotenv(str(_env_path), override=True)
            logger.info(f"✅ Loaded .env.local from: {_env_path}")
            _ENV_LOADED = True
            # Verify critical variables are loaded
            openai_key = os.getenv("OPENAI_API_KEY")
            cartesia_key = os.getenv("CARTESIA_API_KEY")
            logger.info(f"Environment check after loading:")
            logger.info(f"  OPENAI_API_KEY: {'SET' if openai_key else 'MISSING'}")
            logger.info(f"  CARTESIA_API_KEY: {'SET' if cartesia_key else 'MISSING'}")
            break
        except Exception as e:
            logger.error(f"Failed to load .env.local from {_env_path}: {e}")

if not _ENV_LOADED:
    logger.error("⚠️  .env.local not found in any expected location. Environment variables may not be loaded correctly.")
    logger.error(f"Searched in: {[str(p) for p in _ENV_PATHS]}")
    logger.error("This will cause the agent to fail during initialization!")
else:
    logger.info("Environment file loaded successfully")


class Assistant(Agent):
    def __init__(
        self,
        is_group_conversation: bool = False,
        publish_data_fn=None,
        user_language: str = "hi",
    ) -> None:
        group_instructions = ""
        if is_group_conversation:
            group_instructions = """

GROUP CONVERSATION MODE (LiveSatsang):
You are in a group spiritual gathering (LiveSatsang) with multiple participants.
- You can hear and respond to ALL participants in the room
- Respond to questions and conversations from ANY participant - you don't need to be explicitly addressed
- Listen to all participants' speech and respond naturally when appropriate
- Wait for natural pauses in conversation before speaking - do not interrupt others mid-sentence
- Be brief and allow others to speak - this is a shared space for spiritual discussion
- If multiple people are speaking, wait until the conversation pauses before responding
- Address the group as "भाइयों और बहनों" (brothers and sisters) or "सभी साधकों" (all seekers) when speaking to everyone
- Keep responses concise in group settings - 2-3 sentences maximum to ensure everyone gets a chance to speak
- You can respond to questions, provide spiritual guidance, and engage in conversation naturally
- IMPORTANT: You are actively listening to all participants - respond when you hear questions or when it's appropriate to contribute
"""
        
        # Language-aware guidance block – this is evaluated at runtime based on
        # the user's language preference detected from LiveKit metadata.
        language_block = f"""

LANGUAGE PREFERENCE (RUNTIME):
- The user's selected language code is '{user_language}'.
- If this code is 'en', you MUST respond ONLY in ENGLISH (Latin script), including greetings.
- If this code is 'hi', respond in Hindi (Devanagari script) as you normally would.
- If the user mixes Hindi and English, still prefer the selected language ('en' → English, 'hi' → Hindi).
- Do NOT switch back to Hindi when the user language is 'en' unless they explicitly ask you to reply in Hindi.
"""

        super().__init__(
            instructions="""You are a compassionate, proactive spiritual guru rooted in Hindu and Sanatana Dharma. The user is interacting with you via voice, even if you perceive the conversation as text.
""" + group_instructions + """
IMPORTANT - HANDLING ROMANIZED HINDI INPUT:
The user speaks in Hindi, but you will receive their speech as Romanized Hindi text (English alphabet).
For example, you might see: "namaste", "aap kaise hain", "dharma kya hai", "krishna", "bhagwad geeta".
You must understand that these are Hindi words written in English letters. Common patterns:
- "aap" = आप (you), "tum" = तुम (you informal)
- "hai" = है (is), "hain" = हैं (are)
- "kaise" = कैसे (how), "kya" = क्या (what), "kyon" = क्यों (why)
- "satya" = सत्य (truth), "dharma" = धर्म (duty/religion), "karma" = कर्म (action)
- "namaste" = नमस्ते (greeting), "dhanyavad" = धन्यवाद (thanks)
Interpret variations and common STT errors intelligently. For example:
- "kaise" might be transcribed as "kaise", "kese", "kaisey"
- "dharma" might be "dharma", "dharam", "dharm"
- "krishna" might be "krishna", "krishan", "krishn"

PROACTIVE ENGAGEMENT (Be Interactive and Engaging):
You are not just a passive responder - you are an active guide who helps users understand deeply. Always:

1. ASK CLARIFYING QUESTIONS:
   - When a question is vague, ask "क्या आपका मतलब है...?" (Do you mean...?) or "आप किस बारे में जानना चाहते हैं?" (What specifically would you like to know?)
   - Example: User asks "dharma kya hai?" → You might say "धर्म एक व्यापक विषय है। क्या आप व्यक्तिगत धर्म, सामाजिक धर्म, या आध्यात्मिक धर्म के बारे में जानना चाहते हैं?" (Dharma is a broad topic. Would you like to know about personal dharma, social dharma, or spiritual dharma?)

2. CHECK FOR UNDERSTANDING:
   - After explaining something, ask "क्या यह स्पष्ट है?" (Is this clear?) or "क्या आपको कोई और प्रश्न है?" (Do you have any other questions?)
   - Example: After explaining karma, ask "क्या आप कर्म के किसी विशेष पहलू के बारे में और जानना चाहेंगे?" (Would you like to know more about any specific aspect of karma?)

3. PROVIDE CONTEXT BEFORE ANSWERS:
   - Don't just answer - set the stage. Say "यह एक बहुत अच्छा प्रश्न है। मैं आपको समझाता हूं..." (This is a very good question. Let me explain...)
   - Break complex topics into simple parts: "पहले मैं आपको मूल अवधारणा समझाता हूं, फिर उदाहरण देता हूं" (First let me explain the basic concept, then I'll give examples)

4. USE EXAMPLES AND ANALOGIES:
   - Always relate spiritual concepts to daily life: "जैसे कि..." (Just like...)
   - Use stories and parables from scriptures naturally
   - Example: When explaining detachment, use the analogy of "जैसे कमल का पत्ता पानी में रहकर भी गीला नहीं होता" (Like a lotus leaf stays in water but doesn't get wet)

5. OFFER PRACTICAL GUIDANCE:
   - After explaining theory, always suggest: "आप इसे अपने दैनिक जीवन में कैसे लागू कर सकते हैं..." (How you can apply this in your daily life...)
   - Give actionable steps: "आज से आप यह कर सकते हैं..." (From today you can do this...)

6. INITIATE CONVERSATIONS:
   - If the user seems lost or just says "namaste", be proactive: "आप किस विषय पर चर्चा करना चाहेंगे? क्या आपको कोई आध्यात्मिक प्रश्न है?" (What topic would you like to discuss? Do you have any spiritual questions?)
   - After a good discussion, suggest next topics: "क्या आप योग, ध्यान, या किसी अन्य विषय के बारे में जानना चाहेंगे?" (Would you like to learn about yoga, meditation, or any other topic?)

7. ENCOURAGE DEEPER EXPLORATION:
   - When a user asks a basic question, offer to go deeper: "यह तो बुनियादी बात थी। क्या आप इसके गहरे अर्थ को समझना चाहेंगे?" (That was the basic point. Would you like to understand its deeper meaning?)
   - Connect related topics: "यह धर्म से जुड़ा है। क्या आप धर्म के बारे में भी जानना चाहेंगे?" (This is related to dharma. Would you also like to know about dharma?)

SPIRITUAL GUIDANCE:
Answer spiritual questions on dharma, yoga, meditation, karma, bhakti, and Vedanta, grounded in Hindu and Sanatana teachings.
When helpful, briefly reference scriptures like the Bhagavad Gita, the Vedas, the Upanishads, the Ramayana, the Mahabharata, and the Puranas.
Be respectful and non-dogmatic, acknowledging diverse sampradayas. Offer practical guidance, simple daily practices, and short mantras when requested.

BHAJAN PLAYBACK:
When users request to hear a bhajan, devotional song, or spiritual music, use the play_bhajan tool.
Common requests include: "krishna ka bhajan bajao", "hare krishna sunao", "bhajan chal", "om namah shivaya sunao", etc.
IMPORTANT: Do NOT include URLs, JSON, or technical IDs in your spoken message.
After calling the tool, simply speak a friendly confirmation like "भजन चल रहा है, आनंद लें".
The tool will send structured data over the data channel for the app to handle playback.

VANI/PRAVACHAN PLAYBACK:
When users request to hear a vani (spiritual discourse/pravachan), use the search_vani tool.
The tool will automatically search for and play the first matching vani on the requested topic.
Common requests include: "सद्गुरु का प्रवचन सुनाओ", "ओशो की वाणी सुनाओ", "किसी वाणी को सुना दीजिए", "प्रवचन सुनाओ", etc.
IMPORTANT: The search_vani tool automatically plays the first result - you do NOT need to ask for confirmation.
IMPORTANT: After calling search_vani, simply confirm that the vani is playing (e.g., "प्रवचन चल रहा है, आनंद लें").
IMPORTANT: Do NOT call search_vani multiple times or ask the user to confirm - it automatically plays on the first call.

RESPONSE STYLE:
Default to replying in Hindi (Devanagari script). If the user speaks another language, mirror their language.
Your responses are concise, clear, and voice-friendly, without complex formatting or symbols such as emojis or asterisks.
Keep your responses conversational and engaging - 2-4 sentences is ideal, but can be longer if explaining complex concepts.
Be warm, kind, and wise, with gentle humor when appropriate.
Always end with a question or invitation to continue the conversation when natural.""" + language_block,
        )
        # function to publish data bytes to room data channel (set from entrypoint)
        self._publish_data_fn = publish_data_fn

    @function_tool
    async def play_bhajan(
        self,
        context: RunContext,
        bhajan_name: str,
        artist: str = None,
    ) -> str:
        """Play a devotional bhajan (song) when users request it.

        Use this tool when users ask to:
        - Play a bhajan (e.g., "krishna ka bhajan bajao", "hare krishna sunao", "bhajan chal")
        - Hear a devotional song
        - Listen to spiritual music
        - Play a specific mantra or chant
        
        The bhajan name can be in Hindi (Romanized) or English. Common bhajan names:
        - "hare krishna" or "hare krishna hare rama"
        - "om namah shivaya" or "shiva mantra"
        - "govind bolo" or "hari gopal bolo"
        - "jai ganesh" or "ganesh bhajan"
        - "ram ram" or "rama bhajan"
        
        Args:
            bhajan_name: The name of the bhajan requested (e.g., "hare krishna", "om namah shivaya", "krishna bhajan")
            artist: Optional artist name if specified (currently not used, but included for future use)
        
        Returns:
            A short Hindi confirmation/error sentence for speaking. Do NOT include URLs.
        """
        import json
        
        logger.info(f"User requested bhajan: '{bhajan_name}' (artist: {artist})")
        
        # Search YouTube for video
        youtube_video_id = None
        youtube_video_title = None
        youtube_video_name = bhajan_name  # Default to requested name
        
        logger.info(f"🔍 Starting YouTube search for bhajan: '{bhajan_name}'")
        try:
            # Lazy import YouTube search to avoid blocking if module not available
            try:
                # Try relative import first (when running as package)
                try:
                    from .youtube_search import find_youtube_video_async
                    logger.info("✅ Imported YouTube search module (relative)")
                except ImportError:
                    # Fallback to absolute import (when running as script)
                    import sys
                    from pathlib import Path
                    src_path = Path(__file__).resolve().parent
                    if str(src_path) not in sys.path:
                        sys.path.insert(0, str(src_path))
                    from youtube_search import find_youtube_video_async
                    logger.info("✅ Imported YouTube search module (absolute)")
                
                # Check if API key is available
                youtube_api_key = os.getenv("YOUTUBE_API_KEY")
                if not youtube_api_key:
                    logger.error("❌ YOUTUBE_API_KEY not found in environment - YouTube search will fail")
                    return f"क्षमा करें, YouTube खोज सेवा उपलब्ध नहीं है। कृपया बाद में कोशिश करें।"
                else:
                    logger.info(f"✅ YOUTUBE_API_KEY is set (length: {len(youtube_api_key)})")
                
                logger.info(f"🔍 Calling find_youtube_video_async('{bhajan_name}')...")
                youtube_result = await find_youtube_video_async(bhajan_name)
                logger.info(f"🔍 YouTube search returned: {youtube_result}")
                
                if youtube_result:
                    youtube_video_id = youtube_result.get("video_id")
                    youtube_video_title = youtube_result.get("title")
                    youtube_video_name = youtube_result.get("title", bhajan_name)
                    logger.info(f"✅ Found YouTube video: {youtube_video_id} - {youtube_video_title}")
                else:
                    logger.warning(f"⚠️ No YouTube video found for '{bhajan_name}' (search returned None)")
                    return f"क्षमा करें, '{bhajan_name}' भजन YouTube पर नहीं मिला। कृपया कोई अन्य भजन सुनने के लिए कहें।"
            except ImportError as e:
                logger.error(f"❌ YouTube search module not available: {e}", exc_info=True)
                return f"क्षमा करें, YouTube खोज मॉड्यूल उपलब्ध नहीं है।"
            except Exception as e:
                logger.error(f"❌ Error searching YouTube: {e}", exc_info=True)
                return f"क्षमा करें, YouTube खोज में त्रुटि हुई। कृपया बाद में कोशिश करें।"
        except Exception as e:
            logger.error(f"❌ YouTube search failed: {e}", exc_info=True)
            return f"क्षमा करें, YouTube खोज असफल रही। कृपया बाद में कोशिश करें।"
        
        # If no YouTube video found, return error
        if not youtube_video_id:
            logger.error(f"❌ No YouTube video ID found for bhajan: '{bhajan_name}'")
            return f"क्षमा करें, '{bhajan_name}' भजन YouTube पर नहीं मिला। कृपया कोई अन्य भजन सुनने के लिए कहें।"
        
        # Build structured result for data channel - YouTube only
        logger.info(f"🔍 Final YouTube search result: youtube_video_id={youtube_video_id}, youtube_video_title={youtube_video_title}")
        
        result = {
            "name": youtube_video_name,
            "artist": artist or "",
            "youtube_id": youtube_video_id,  # YouTube video ID for IFrame Player API
            "youtube_url": f"https://www.youtube.com/watch?v={youtube_video_id}",  # Full YouTube URL
            "message": f"भजन '{youtube_video_name}' चल रहा है। आनंद लें!",
        }
        
        logger.info(f"Returning bhajan result: name={result['name']}, has_youtube_id={bool(youtube_video_id)}")
        logger.info(f"📦 Full result object: {json.dumps(result, indent=2)}")
        logger.info(f"🔍 Result object youtube_id field: {result.get('youtube_id')}")
        logger.info(f"🔍 Result object youtube_url field: {result.get('youtube_url')}")
        
        # Emit structured data over LiveKit data channel using injected publisher
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            logger.info(f"🔍 Checking publish function: has_fn={publish_fn is not None}, callable={callable(publish_fn)}")
            
            if callable(publish_fn):
                data_bytes = json.dumps(result).encode("utf-8")
                logger.info(f"📤 Calling publish function with {len(data_bytes)} bytes, track: {result['name']}")
                logger.info(f"   Data to send: {data_bytes.decode('utf-8')[:200]}...")
                
                # Call the publish function (it's async, so we await it)
                import inspect
                if inspect.iscoroutinefunction(publish_fn):
                    await publish_fn(data_bytes)
                else:
                    publish_fn(data_bytes)
                
                logger.info("✅ Successfully called publish function")
            else:
                logger.warning("⚠️ No publish_data_fn configured; frontend will not receive bhajan.track event")
                logger.warning(f"   _publish_data_fn attribute: {getattr(self, '_publish_data_fn', 'NOT_FOUND')}")
        except Exception as e:
            logger.error(f"❌ Failed to publish bhajan data message: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Speak only a friendly confirmation, without any URLs/JSON
        return f"मैं '{youtube_video_name}' भजन चला रहा हूं। आनंद लें!"

    @function_tool
    async def search_vani(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5,
    ) -> str:
        """Search for spiritual discourses (vani/pravachan) on a topic.

        Use this when the user asks for teachings/pravachan/satsang on a specific topic.

        Args:
            topic: The spiritual topic to search (e.g., "bhakti", "karma", "adhyatma").
            max_results: Number of results to return (1-10).

        Returns:
            A short Hindi confirmation telling the user results were found and asking which to play.
        """
        import json
        try:
            try:
                # Prefer package-relative import
                from .youtube_search import find_vani_videos_async  # type: ignore
            except ImportError:
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from youtube_search import find_vani_videos_async  # type: ignore

            max_results = max(1, min(int(max_results), 10))
            results = await find_vani_videos_async(topic, max_results)
        except Exception as e:
            logger.error(f"vani search failed for topic='{topic}': {e}", exc_info=True)
            results = []

        # Build payload for frontend (list of lectures)
        payload = {
            "type": "vani.results",
            "topic": topic,
            "results": [
                {
                    "videoId": r.get("video_id"),
                    "title": r.get("title"),
                    "channelTitle": r.get("channel_title"),
                    "thumbnail": r.get("thumbnail"),
                    "url": r.get("url"),
                }
                for r in results
            ],
        }

        # Publish with appropriate topic (handled by publisher)
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            if callable(publish_fn):
                data_bytes = json.dumps(payload).encode("utf-8")
                await publish_fn(data_bytes)  # publisher decides topic
        except Exception as e:
            logger.error(f"Failed to publish vani results: {e}", exc_info=True)

        if results:
            first_result = results[0]
            first_title = first_result.get("title", topic)
            first_video_id = first_result.get("video_id")
            
            # Also publish the first result in bhajan.track format for automatic playback
            if first_video_id:
                try:
                    publish_fn = getattr(self, "_publish_data_fn", None)
                    if callable(publish_fn):
                        # Publish in bhajan.track format for automatic playback
                        play_payload = {
                            "name": first_title,
                            "artist": first_result.get("channel_title", ""),
                            "youtube_id": first_video_id,
                            "youtube_url": first_result.get("url", f"https://www.youtube.com/watch?v={first_video_id}"),
                            "message": f"प्रवचन '{first_title}' चल रहा है।",
                        }
                        play_data_bytes = json.dumps(play_payload).encode("utf-8")
                        await publish_fn(play_data_bytes)
                        logger.info(f"✅ Published first vani for playback: {first_title} ({first_video_id})")
                except Exception as e:
                    logger.error(f"Failed to publish vani for playback: {e}", exc_info=True)
            
            return (
                f"मुझे '{topic}' विषय पर प्रवचन मिला है। मैं '{first_title}' चला रहा हूं। आनंद लें!"
            )
        else:
            return (
                f"क्षमा करें, '{topic}' विषय पर उपयुक्त प्रवचन अभी नहीं मिला। क्या आप कोई दूसरा विषय बताना चाहेंगे?"
            )


def prewarm(proc: JobProcess):
    """
    Prewarm function to load models before processing jobs.
    This runs once per worker process to improve startup time for individual jobs.
    Note: If VAD loading takes too long, we skip it to avoid timeout during initialization.
    """
    try:
        # Check if PyTorch is available before loading models
        try:
            import torch
            logger.info(f"PyTorch version: {torch.__version__}")
        except ImportError:
            logger.error("PyTorch is not installed! Install it with: uv sync --locked")
            # Don't raise - let it load on-demand
            proc.userdata["vad"] = None
            return
        
        # Skip VAD preloading to avoid timeout during initialization
        # VAD will be loaded on-demand when needed, which is safer
        logger.info("Skipping VAD preload to avoid initialization timeout - will load on-demand")
        proc.userdata["vad"] = None
    except Exception as e:
        logger.error(f"Error in prewarm: {e}")
        logger.warning("VAD model will be loaded on-demand for each job. This may cause slight delays.")
        # Don't raise - let the process continue, VAD will be loaded on-demand
        # This prevents the entire worker from failing if VAD loading has issues
        proc.userdata["vad"] = None


async def entrypoint(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Verify environment variables are loaded
    logger.info("="*60)
    logger.info("ENTRYPOINT: Starting agent initialization")
    logger.info("="*60)
    
    # Check critical environment variables
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    sarvam_key = os.getenv("SARVAM_API_KEY") if stt_model == "sarvam" else None
    
    logger.info(f"Environment check:")
    logger.info(f"  OPENAI_API_KEY: {'SET' if openai_key else 'MISSING'}")
    logger.info(f"  CARTESIA_API_KEY: {'SET' if cartesia_key else 'MISSING'}")
    logger.info(f"  STT_MODEL: {stt_model}")
    if stt_model == "sarvam":
        logger.info(f"  SARVAM_API_KEY: {'SET' if sarvam_key else 'MISSING'}")
    
    if not openai_key:
        logger.error("❌ OPENAI_API_KEY is missing! Agent will fail to initialize.")
        raise RuntimeError("OPENAI_API_KEY environment variable is required")
    if not cartesia_key:
        logger.error("❌ CARTESIA_API_KEY is missing! Agent will fail to initialize.")
        raise RuntimeError("CARTESIA_API_KEY environment variable is required")
    if stt_model == "sarvam" and not sarvam_key:
        logger.warning("⚠️  SARVAM_API_KEY is missing but STT_MODEL=sarvam. Will fall back to AssemblyAI.")
    
    # Detect language preference from participant metadata
    # Default to Hindi ('hi') for Guruji agent
    user_language = "hi"
    try:
        # Give participants a moment to connect so metadata is available
        await asyncio.sleep(1.0)
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    import json

                    metadata = json.loads(participant.metadata)
                    if isinstance(metadata, dict) and "language" in metadata:
                        # Robust language parsing
                        raw_lang = str(metadata.get("language", "")).strip().lower()
                        if raw_lang in ["hi", "hindi", "hin"]:
                            user_language = "hi"
                        elif raw_lang in ["en", "english", "eng"]:
                            user_language = "en"
                        else:
                            user_language = raw_lang
                            
                        logger.info(
                            f"📝 Detected language preference from participant metadata: {user_language} (raw: {metadata.get('language')})"
                        )
                        break
                except (json.JSONDecodeError, TypeError) as e:
                    logger.debug(f"Could not parse participant metadata: {e}")
    except Exception as e:
        logger.warning(
            f"Could not read language preference from participant metadata: {e}, defaulting to Hindi"
        )
    
    # Final validation
    if user_language not in {"hi", "en"}:
        logger.warning(f"Unsupported language '{user_language}' detected, defaulting to 'hi'")
        user_language = "hi"
    
    logger.info(f"🌐 Using language: {user_language} (default: Hindi)")

    # Extract guruId for Universal Wisdom dispatch
    guru_id = "guruji" # Default to generic guruji
    try:
        # We re-iterate or reuse logic. Since we only parsed language above, let's find guruId now.
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                import json
                try:
                    metadata = json.loads(participant.metadata)
                    if "guruId" in metadata:
                        guru_id = metadata["guruId"]
                        logger.info(f"🕉️  Detected guruId: {guru_id}")
                        break
                except:
                    pass
    except Exception as e:
        logger.error(f"Error extracting guruId: {e}")

    # Check for Chitragupta (Enquiry) Agent dispatch
    # If room name contains "chitragupta", "enquiry", or "admin"
    if any(keyword in ctx.room.name.lower() for keyword in ["chitragupta", "enquiry", "admin"]):
        logger.info(f"📜 Detected Enquiry Room ({ctx.room.name}). Dispatching to ChitraguptaAgent...")
        try:
            from .chitragupta_agent import ChitraguptaAgent
            
            chitragupta_agent = ChitraguptaAgent(
                publish_data_fn=ctx.room.local_participant.publish_data
            )
            
            # Using standard session configuration
            session = AgentSession(
                stt=stt,
                llm=inference.LLM(model="openai/gpt-4.1-mini"),
                tts=inference.TTS(model="cartesia/sonic-3", language=user_language, voice="248be419-3632-4f38-9500-05f963c9f743"), # Using Mystical voice for consistency
                preemptive_generation=True,
                turn_detection=turn_detector,
                vad=ctx.proc.userdata.get("vad"),
            )
            
            await session.start(agent=chitragupta_agent, room=ctx.room)
            
            # Handle chat messages from the frontend
            from livekit import rtc
            
            async def _on_data_received(data, participant=None, kind=None, topic=None):
                try:
                    data_bytes = None
                    if isinstance(data, bytes): data_bytes = data
                    elif isinstance(data, rtc.DataPacket): data_bytes = data.data
                    elif hasattr(data, 'data'): data_bytes = data.data
                    elif isinstance(data, str): data_bytes = data.encode('utf-8')
                    else: return
                    if data_bytes is None: return
                    payload_str = data_bytes.decode('utf-8') if isinstance(data_bytes, bytes) else str(data_bytes)
                    try:
                        import json
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
            await ctx.connect()
            
            # Wait for disconnect and save transcript
            await wait_for_disconnect_and_save_transcript(ctx, session, "chitragupta-agent")
            return # Exit function, we are done
            
        except ImportError as e:
            logger.error(f"Failed to import ChitraguptaAgent: {e}")
        except Exception as e:
            logger.error(f"Failed to start ChitraguptaAgent: {e}", exc_info=True)


    # Check for Universal Wisdom dispatch
    # If guru_id is specific (not 'guruji') and NOT the default fallback
    # We load UniversalWisdomAgent.
    # We must ensure we don't break Tarot dispatch which is handled separately above.
    is_universal_guru = guru_id and guru_id != "guruji" and guru_id != "default_user"

    if is_universal_guru and "tarot" not in ctx.room.name.lower():
        logger.info(f"✨ Dispatching to UniversalWisdomAgent for guru: {guru_id}")
        try:
            from .universal_wisdom_agent import UniversalWisdomAgent
            
            # Initialize Universal Agent
            universal_agent = UniversalWisdomAgent(
                guru_id=guru_id,
                user_id="user", # TODO: Extract real userId if needed
                publish_data_fn=ctx.room.local_participant.publish_data
            )
            
            logger.info("UniversalWisdomAgent initialized successfully")

            # Initialize Session for Universal Agent
            # Note: We duplicate some session setup here to ensure correct binding
            
            # STT Setup (Reused from above)
            # Create STT instance (reusing the logic below would be cleaner, but let's do it inline for dispatch)
            # Actually, let's reuse the 'stt' variable which is initialized below!
            # So we defer session creation until after STT is ready.
            
        except Exception as e:
            logger.error(f"Failed to load UniversalWisdomAgent: {e}", exc_info=True)
            is_universal_guru = False # Fallback to default

    
    # Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI, and the LiveKit turn detector
    
    # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
    # For Hindi we prefer Sarvam/Deepgram; for English we use the configured STT model with language='en'
    logger.info(f"Initializing STT with model: {stt_model} for language={user_language}")
    
    if user_language == "hi":
        # Configure STT with Hindi language and optimized settings for better accuracy
        # Priority: Sarvam (best for Hindi) > Deepgram > AssemblyAI
        if stt_model == "sarvam" or stt_model.startswith("sarvam"):
            # Sarvam is specifically designed for Indian languages - BEST choice for Hindi
            logger.info("Attempting to initialize Sarvam STT for Hindi...")
            try:
                # Try using Sarvam STT plugin if installed
                from livekit.plugins import sarvam as sarvam_plugin

                logger.info("Sarvam plugin imported successfully")
                
                if not sarvam_key:
                    logger.warning(
                        "SARVAM_API_KEY not set - Sarvam STT may fail. Falling back to AssemblyAI."
                    )
                    raise ValueError("SARVAM_API_KEY not set")
                
                logger.info("Creating Sarvam STT instance...")
                stt = sarvam_plugin.STT(
                    language="hi",
                )
                logger.info("✅ Using Sarvam STT - BEST for Hindi/Indian languages!")
            except ImportError as e:
                logger.error(f"❌ Sarvam plugin not installed: {e}")
                logger.warning('Install with: pip install "livekit-agents[sarvam]~=1.2"')
                logger.warning(
                    "Falling back to AssemblyAI. For better Hindi accuracy, install Sarvam!"
                )
                stt = inference.STT(
                    model="assemblyai/universal-streaming",
                    language="hi",
                )
            except Exception as e:
                logger.error(f"❌ Failed to initialize Sarvam STT: {e}")
                logger.warning(
                    "Falling back to AssemblyAI due to Sarvam initialization error"
                )
                stt = inference.STT(
                    model="assemblyai/universal-streaming",
                    language="hi",
                )
        elif stt_model == "deepgram/nova-2" or stt_model.startswith("deepgram"):
            try:
                stt = inference.STT(
                    model="deepgram/nova-2",
                    language="hi",
                )
                logger.info("Using Deepgram Nova-2 for improved Hindi STT accuracy")
            except Exception as e:
                logger.warning(
                    f"Failed to initialize Deepgram STT: {e}. Falling back to AssemblyAI."
                )
                stt = inference.STT(
                    model="assemblyai/universal-streaming",
                    language="hi",
                )
                logger.info("Using AssemblyAI as fallback STT")
        else:
            # AssemblyAI (or other) with Hindi language (default/fallback)
            stt = inference.STT(
                model=stt_model,
                language="hi",  # Hindi language code
            )
            logger.warning(
                f"Using {stt_model} for Hindi - for better Hindi accuracy, try: "
                "STT_MODEL=sarvam or STT_MODEL=deepgram/nova-2"
            )
    else:
        # English (or non-Hindi) path – configure STT with language='en'
        logger.info("Configuring STT for English language recognition")
        effective_model = stt_model
        if stt_model == "sarvam" or stt_model.startswith("sarvam"):
            logger.warning(
                "STT_MODEL is set to sarvam but language is English. "
                "Sarvam is optimized for Indian languages, so falling back to AssemblyAI."
            )
            effective_model = "assemblyai/universal-streaming"
        try:
            stt = inference.STT(
                model=effective_model,
                language="en",
            )
            logger.info(f"Using STT model '{effective_model}' for English")
        except Exception as e:
            logger.error(f"❌ Failed to initialize STT for English: {e}")
            logger.warning("Falling back to AssemblyAI universal-streaming (en)")
            stt = inference.STT(
                model="assemblyai/universal-streaming",
                language="en",
            )
    
    # Initialize turn detector with error handling and timeout protection
    # Lazy import to avoid blocking during module import
    # Initialize turn detector
    # CRITICAL FIX: The MultilingualModel turn detector requires an inference executor which
    # is failing to load correctly in this environment ("no inference executor" error).
    # We explicitly set turn_detector = None to force AgentSession to use the default
    # Voice Activity Detector (VAD) which is robust and does not crash.
    logger.info("Using default VAD (Voice Activity Detector) for stability")
    turn_detector = None
    
    # Check if this is a Tarot reading room
    if "tarot" in ctx.room.name.lower():
        logger.info(f"🔮 Detected Tarot room ({ctx.room.name}). Initializing Tarot Agent...")
        try:
            from .tarot_agent import TarotAgent
            
            # Helper to publish data
            async def _publish_data(data_bytes: bytes):
                lp = ctx.room.local_participant
                if lp:
                    await lp.publish_data(data_bytes, reliable=True, topic="tarot.event")

            tarot_agent = TarotAgent(is_group_conversation=False, publish_data_fn=_publish_data)
            
            session = AgentSession(
                stt=stt,
                llm=inference.LLM(model="openai/gpt-4.1-mini"),
                tts=inference.TTS(model="cartesia/sonic-3", language=user_language, voice="248be419-3632-4f38-9500-05f963c9f743"), # Mystical voice
                preemptive_generation=True,
                turn_detection=turn_detector,
                vad=ctx.proc.userdata["vad"],
            )
            
            await session.start(agent=tarot_agent, room=ctx.room)
            
            # Handle chat messages from the frontend
            from livekit import rtc
            
            async def _on_data_received(data, participant=None, kind=None, topic=None):
                try:
                    data_bytes = None
                    if isinstance(data, bytes): data_bytes = data
                    elif isinstance(data, rtc.DataPacket): data_bytes = data.data
                    elif hasattr(data, 'data'): data_bytes = data.data
                    elif isinstance(data, str): data_bytes = data.encode('utf-8')
                    else: return
                    if data_bytes is None: return
                    payload_str = data_bytes.decode('utf-8') if isinstance(data_bytes, bytes) else str(data_bytes)
                    try:
                        import json
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
            await ctx.connect()
            
            # Wait for disconnect and save transcript
            await wait_for_disconnect_and_save_transcript(ctx, session, "tarot-agent")
            return # Exit function, we are done
            
        except ImportError as e:
            logger.error(f"Failed to import TarotAgent: {e}")
        except Exception as e:
            logger.error(f"Failed to start TarotAgent: {e}", exc_info=True)


    # The following complex initialization is disabled to prevent crashes:
    # _init_turn_detector_with_timeout() logic removed temporarily
    
    # Check if this is a group conversation (LiveSatsang room)
    is_live_satsang = ctx.room.name.lower() == "livesatsang"
    
    # Adjust turn detection for group conversations
    # In group settings, agent should respond naturally but wait for pauses
    if is_live_satsang:
        logger.info("Detected LiveSatsang room - configuring for group conversation")
        # Slightly longer EOU delay in group settings to avoid interrupting
        # But not too long, so agent can still respond naturally
        eou_delay = 1.0  # Wait for natural pause before responding
    else:
        eou_delay = 0.8  # Normal delay for one-on-one

    logger.info("Creating AgentSession with configured models...")
    try:
        # VAD will be loaded on-demand if needed (skipped in prewarm to avoid timeout)
        # If VAD is None, AgentSession will use default VAD behavior
        if ctx.proc.userdata.get("vad") is None:
            logger.info("VAD not preloaded - will use default VAD behavior")
        
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        #
        # We support separate voices per language for the Guruji agent:
        #   - GURUJI_TTS_VOICE_HI : Hindi voice ID
        #   - GURUJI_TTS_VOICE_EN : English voice ID
        # Fallbacks (shared/global):
        #   - TTS_VOICE_HI, TTS_VOICE_EN
        #   - legacy TTS_VOICE_ID
        def _select_tts_voice_for_guruji(lang: str) -> str:
            if lang == "hi":
                specific = os.getenv("GURUJI_TTS_VOICE_HI")
                global_lang = os.getenv("TTS_VOICE_HI")
            else:
                specific = os.getenv("GURUJI_TTS_VOICE_EN")
                global_lang = os.getenv("TTS_VOICE_EN")
            
            if specific:
                logger.info(f"Using Guruji TTS voice for language '{lang}' from env: {specific}")
                return specific
            if global_lang:
                logger.info(f"Using global TTS voice for language '{lang}': {global_lang}")
                return global_lang
            
            legacy = os.getenv("TTS_VOICE_ID")
            if legacy:
                logger.info(
                    f"Using legacy TTS_VOICE_ID for Guruji agent (language '{lang}'): {legacy}"
                )
                return legacy
            
            logger.warning(
                "No Guruji-specific TTS voice configured "
                "(GURUJI_TTS_VOICE_HI/GURUJI_TTS_VOICE_EN or TTS_VOICE_HI/TTS_VOICE_EN). "
                "Using hardcoded fallback Cartesia voice."
            )
            # This is the previous default Cartesia Sonic voice ID
            return "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"

        tts_voice_id = _select_tts_voice_for_guruji(user_language)
        
        session = AgentSession(
            # Speech-to-text configured above
            stt=stt,
            # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
            # See all available models at https://docs.livekit.io/agents/models/llm/
            llm=inference.LLM(model="openai/gpt-4.1-mini"),
            tts=inference.TTS(
                model="cartesia/sonic-3",
                voice=tts_voice_id,
                language=user_language,
                extra_kwargs={
                    "speed": "normal",
                    "emotion": ["positivity:highest", "curiosity:high"]
                }
            ),
            preemptive_generation=True,
            turn_detection=turn_detector,
            vad=ctx.proc.userdata.get("vad"),
        )

        # Decide which agent instance to use
        # If is_universal_guru is set (and valid), use it.
        # Otherwise use Assistant (default)
        if 'is_universal_guru' in locals() and is_universal_guru and 'universal_agent' in locals():
            agent_instance = universal_agent
            logger.info(f"🚀 Starting session with UniversalWisdomAgent ({guru_id})")
        else:
            agent_instance = Assistant(
                is_group_conversation=is_live_satsang,
                publish_data_fn=ctx.room.local_participant.publish_data,
                user_language=user_language
            )
            logger.info("🚀 Starting session with Default Assistant (Guruji)")

        session.on("metrics_collected", _on_metrics_collected)

        await session.start(agent=agent_instance, room=ctx.room)
        
        # Handle chat messages from the frontend
        from livekit import rtc
        
        async def _on_data_received(data, participant=None, kind=None, topic=None):
            try:
                data_bytes = None
                if isinstance(data, bytes): data_bytes = data
                elif isinstance(data, rtc.DataPacket): data_bytes = data.data
                elif hasattr(data, 'data'): data_bytes = data.data
                elif isinstance(data, str): data_bytes = data.encode('utf-8')
                else: return
                if data_bytes is None: return
                payload_str = data_bytes.decode('utf-8') if isinstance(data_bytes, bytes) else str(data_bytes)
                try:
                    import json
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


        logger.info("AgentSession created successfully")
    except Exception as e:
        logger.error(f"Failed to create AgentSession: {e}")
        logger.exception("Full traceback:")
        raise

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )


    # Metrics collection, to measure pipeline performance
    # For more information, see https://docs.livekit.io/agents/build/metrics/
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Start the session, which initializes the voice pipeline and warms up the models
    # Prepare a data-channel publisher we can inject into the Assistant
    async def _publish_bhajan_bytes(data_bytes: bytes):
        try:
            lp = ctx.room.local_participant
            if not lp:
                logger.error("❌ Cannot publish: local_participant is None!")
                return
            # Detect payload type to choose topic
            publish_topic = "bhajan.track"
            try:
                import json as _json
                _obj = _json.loads(data_bytes.decode("utf-8", errors="ignore"))
                _t = (_obj or {}).get("type")
                if _t == "vani.results":
                    publish_topic = "vani.search"
            except Exception:
                pass

            logger.info(
                f"📤 Publishing {len(data_bytes)} bytes to data channel with topic '{publish_topic}'"
            )
            logger.info(f"   Room: {ctx.room.name}, Participants: {len(ctx.room.remote_participants)}")
            # Log full data object for debugging
            full_data_str = data_bytes.decode('utf-8')
            logger.info(f"   Data preview (first 200 chars): {full_data_str[:200]}...")
            logger.info(f"   📦 FULL DATA OBJECT BEING SENT: {full_data_str}")
            # Parse and log key fields
            try:
                data_obj = json.loads(full_data_str)
                logger.info(f"   ✅ Data object keys: {list(data_obj.keys())}")
                logger.info(f"   ✅ youtube_id: {data_obj.get('youtube_id')}")
                logger.info(f"   ✅ youtube_url: {data_obj.get('youtube_url')}")
                logger.info(f"   ✅ name: {data_obj.get('name')}")
                logger.info(f"   ✅ artist: {data_obj.get('artist')}")
            except Exception as e:
                logger.warning(f"   ⚠️ Could not parse data object: {e}")
            
            try:
                # Try with topic first - MUST await since publish_data is async
                await lp.publish_data(data_bytes, reliable=True, topic=publish_topic)
                logger.info(f"✅ Published data with topic '{publish_topic}'")
            except TypeError as e:
                logger.warning(f"Topic not supported, publishing without topic: {e}")
                try:
                    # MUST await since publish_data is async
                    await lp.publish_data(data_bytes, reliable=True)
                    logger.info("✅ Published data without topic")
                except Exception as e2:
                    logger.error(f"❌ Failed to publish data even without topic: {e2}", exc_info=True)
            except Exception as e:
                logger.error(f"❌ Failed to publish data: {e}", exc_info=True)
                raise
        except Exception as e:
            logger.error(f"❌ Error in _publish_bhajan_bytes: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    # Agent sleep/wake state management (shared between data handler and agent)
    # When YouTube playback is active, agent should sleep (stop listening) but maintain context
    agent_is_sleeping = False
    agent_sleep_reason = None
    
    # Create assistant instance (we'll pass sleep state and detected language to it)
    assistant = Assistant(
        is_group_conversation=is_live_satsang,
        publish_data_fn=_publish_bhajan_bytes,
        user_language=user_language,
    )
    
    await session.start(
        agent=assistant,
        room=ctx.room,
    )

    # Join the room and connect to the user
    await ctx.connect()

    # Subscribe to data channel messages from frontend for agent.control commands
    from livekit import rtc
    
    async def on_data_received(data, participant: rtc.RemoteParticipant | None = None, kind=None, topic: str | None = None):
        """Handle data channel messages from frontend (agent.control commands)."""
        nonlocal agent_is_sleeping, agent_sleep_reason
        
        try:
            # Log all received data for debugging - THIS IS CRITICAL FOR DEBUGGING
            logger.info(f"🔔 [DATA_RECEIVED] Received data: type={type(data)}, participant={participant.identity if participant else 'None'}, kind={kind}, topic={topic}")
            
            # Parse JSON payload - handle both bytes and string
            import json
            
            # Extract data bytes from DataPacket or handle different formats
            data_bytes = None
            if isinstance(data, rtc.DataPacket):
                data_bytes = data.data
            elif isinstance(data, bytes):
                data_bytes = data
            elif hasattr(data, 'data'):
                data_bytes = data.data
            else:
                logger.warning(f"Unexpected data type: {type(data)}, value: {data}")
                # Try to convert to bytes
                try:
                    if isinstance(data, str):
                        data_bytes = data.encode('utf-8')
                    else:
                        logger.warning(f"Cannot convert data to bytes: {type(data)}")
                        return
                except Exception as e:
                    logger.warning(f"Failed to convert data to bytes: {e}")
                    return
            
            if data_bytes is None:
                logger.warning("No data bytes extracted")
                return
            
            # Decode bytes to string
            if isinstance(data_bytes, bytes):
                payload_str = data_bytes.decode('utf-8')
            else:
                payload_str = str(data_bytes)
            
            logger.info(f"[DATA_RECEIVED] Decoded payload (first 200 chars): {payload_str[:200]}")
            
            # Parse JSON
            try:
                payload = json.loads(payload_str)
                logger.info(f"[DATA_RECEIVED] Parsed JSON: {payload}")
            except json.JSONDecodeError as e:
                logger.debug(f"Not JSON data (handling as chat): {e}, payload: {payload_str[:100]}")
                asyncio.create_task(session.chat(payload_str))
                return
            
            # Forward to chat if format matches
            if isinstance(payload, dict):
                if 'message' in payload: asyncio.create_task(session.chat(payload['message']))
                elif 'text' in payload: asyncio.create_task(session.chat(payload['text']))
            
            # Only handle agent.control messages
            # Check topic first (if provided), then check payload type
            if topic and topic != 'agent.control':
                logger.debug(f"Ignoring data with topic: {topic} (expected 'agent.control')")
                return
            
            if payload.get('type') != 'agent.control':
                logger.debug(f"Ignoring data with type: {payload.get('type')} (expected 'agent.control')")
                return
            
            action = payload.get('action')
            reason = payload.get('reason', 'unknown')
            
            logger.info(f"[agent.control] Received action: {action}, reason: {reason}, topic: {topic}")
            
            if action == 'sleep':
                if not agent_is_sleeping:
                    agent_is_sleeping = True
                    agent_sleep_reason = reason
                    logger.info(f"😴 Agent going to sleep (reason: {reason})")
                    
                    # Multiple strategies to stop the agent from listening
                    sleep_success = False
                    
                    # Strategy 1: Try to pause the voice pipeline
                    try:
                        if hasattr(session, '_voice_pipeline'):
                            pipeline = session._voice_pipeline
                            if hasattr(pipeline, 'pause'):
                                pipeline.pause()
                                logger.info("✅ Voice pipeline paused - agent is sleeping")
                                sleep_success = True
                            else:
                                logger.warning("Voice pipeline doesn't have pause() method")
                    except Exception as e:
                        logger.warning(f"Failed to pause voice pipeline: {e}")
                    
                    # Strategy 2: Try to disable input through session
                    if not sleep_success:
                        try:
                            if hasattr(session, 'disable_input'):
                                session.disable_input()
                                logger.info("✅ Session input disabled - agent is sleeping")
                                sleep_success = True
                        except Exception as e:
                            logger.warning(f"Failed to disable session input: {e}")
                    
                    # Strategy 3: Try to mute/unsubscribe from remote audio tracks (MOST RELIABLE)
                    if not sleep_success:
                        try:
                            # Unsubscribe from all remote participant *audio* tracks
                            unsubscribed_count = 0
                            for remote_participant in ctx.room.remote_participants.values():
                                for track_pub in remote_participant.track_publications.values():
                                    # Only touch audio tracks
                                    if (
                                        track_pub.kind == rtc.TrackKind.KIND_AUDIO
                                        and track_pub.subscribed
                                    ):
                                        # set_subscribed is a synchronous method in the Python SDK
                                        track_pub.set_subscribed(False)
                                        unsubscribed_count += 1
                                        logger.info(
                                            f"✅ Unsubscribed from {remote_participant.identity} audio track {track_pub.sid}"
                                        )
                            
                            if unsubscribed_count > 0:
                                logger.info(f"✅ Unsubscribed from {unsubscribed_count} audio track(s) - agent is sleeping")
                                sleep_success = True
                            else:
                                logger.warning("No subscribed audio tracks found to unsubscribe")
                        except Exception as e:
                            logger.warning(f"Failed to unsubscribe from audio tracks: {e}", exc_info=True)
                    
                    # Strategy 4: Set a flag and prevent processing in the agent
                    # This is a fallback that will be checked in the agent's processing loop
                    if not sleep_success:
                        logger.warning("⚠️ Could not pause pipeline/session - using flag-based sleep (may not fully stop listening)")
                    
                    logger.info(f"Agent sleep status: {'✅ Successfully paused' if sleep_success else '⚠️ Using flag-based fallback'}")
            elif action == 'wake':
                if agent_is_sleeping:
                    agent_is_sleeping = False
                    logger.info(f"🌅 Agent waking up (was sleeping due to: {agent_sleep_reason})")
                    agent_sleep_reason = None
                    
                    # Multiple strategies to wake the agent
                    wake_success = False
                    
                    # Strategy 1: Try to resume the voice pipeline
                    try:
                        if hasattr(session, '_voice_pipeline'):
                            pipeline = session._voice_pipeline
                            if hasattr(pipeline, 'resume'):
                                pipeline.resume()
                                logger.info("✅ Voice pipeline resumed - agent is awake")
                                wake_success = True
                            else:
                                logger.warning("Voice pipeline doesn't have resume() method")
                    except Exception as e:
                        logger.warning(f"Failed to resume voice pipeline: {e}")
                    
                    # Strategy 2: Try to enable input through session
                    if not wake_success:
                        try:
                            if hasattr(session, 'enable_input'):
                                session.enable_input()
                                logger.info("✅ Session input enabled - agent is awake")
                                wake_success = True
                        except Exception as e:
                            logger.warning(f"Failed to enable session input: {e}")
                    
                    # Strategy 3: Re-subscribe to remote audio tracks (MOST RELIABLE)
                    if not wake_success:
                        try:
                            # Re-subscribe to all remote participant *audio* tracks
                            resubscribed_count = 0
                            for remote_participant in ctx.room.remote_participants.values():
                                for track_pub in remote_participant.track_publications.values():
                                    # Only touch audio tracks
                                    if (
                                        track_pub.kind == rtc.TrackKind.KIND_AUDIO
                                        and not track_pub.subscribed
                                    ):
                                        # set_subscribed is a synchronous method in the Python SDK
                                        track_pub.set_subscribed(True)
                                        resubscribed_count += 1
                                        logger.info(
                                            f"✅ Re-subscribed to {remote_participant.identity} audio track {track_pub.sid}"
                                        )
                            
                            if resubscribed_count > 0:
                                logger.info(f"✅ Re-subscribed to {resubscribed_count} audio track(s) - agent is awake")
                                wake_success = True
                            else:
                                logger.info("All audio tracks already subscribed")
                                wake_success = True  # Consider this success if already subscribed
                        except Exception as e:
                            logger.warning(f"Failed to re-subscribe to audio tracks: {e}", exc_info=True)
                    
                    if not wake_success:
                        logger.warning("⚠️ Could not resume pipeline/session - using flag-based wake")
                    
                    logger.info(f"Agent wake status: {'✅ Successfully resumed' if wake_success else '⚠️ Using flag-based fallback'}")
            else:
                logger.warning(f"Unknown agent.control action: {action}")
        except Exception as e:
            logger.error(f"Error processing agent.control message: {e}", exc_info=True)

    # Subscribe to data channel messages from remote participants
    # In LiveKit Python SDK, we need to listen for data from remote participants
    # Try multiple approaches to ensure we receive the messages
    
    def _handle_room_data(data, participant=None, kind=None, topic: str | None = None):
        """
        Synchronous callback invoked by LiveKit when data is received.
        We immediately schedule the async `on_data_received` to do the real work.
        """
        try:
            # Get the current event loop or create a new one
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            if loop.is_running():
                asyncio.create_task(on_data_received(data, participant, kind, topic))
            else:
                loop.run_until_complete(on_data_received(data, participant, kind, topic))
        except Exception as e:
            logger.error(f"Error scheduling on_data_received task: {e}", exc_info=True)
    
    # Subscribe to room-level data events
    ctx.room.on("data_received", _handle_room_data)
    logger.info("✅ Data channel listener registered on room for agent.control messages")
    
    # Also subscribe to data from each remote participant as they connect
    async def _subscribe_to_participant_data(participant: rtc.RemoteParticipant):
        """Subscribe to data channel messages from a specific remote participant."""
        def _handle_participant_data(data, kind=None, topic: str | None = None):
            try:
                # Get the current event loop or create a new one
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                if loop.is_running():
                    asyncio.create_task(on_data_received(data, participant, kind, topic))
                else:
                    loop.run_until_complete(on_data_received(data, participant, kind, topic))
            except Exception as e:
                logger.error(f"Error scheduling on_data_received task from participant: {e}", exc_info=True)
        
        # Try to subscribe to participant's data channel
        try:
            participant.on("data_received", _handle_participant_data)
            logger.info(f"✅ Data channel listener registered for participant: {participant.identity}")
        except Exception as e:
            logger.warning(f"Could not subscribe to participant data channel: {e}")
    
    # Subscribe to existing remote participants
    for participant in ctx.room.remote_participants.values():
        await _subscribe_to_participant_data(participant)
    
    # Subscribe to new participants as they connect
    async def _on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info(f"🆕 Remote participant connected: {participant.identity}")
        try:
            await _subscribe_to_participant_data(participant)
        except Exception as e:
            logger.error(f"Error subscribing to participant data: {e}", exc_info=True)
    
    def _handle_participant_connected(participant: rtc.RemoteParticipant):
        """Synchronous wrapper for participant_connected event."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(_on_participant_connected(participant))
            else:
                loop.run_until_complete(_on_participant_connected(participant))
        except Exception as e:
            logger.error(f"Error handling participant connected: {e}", exc_info=True)
    
    ctx.room.on("participant_connected", _handle_participant_connected)

    # For group conversations, log participant info and ensure agent is ready
    if is_live_satsang:
        logger.info("LiveSatsang mode: Agent ready for group conversation")
        logger.info(f"Current participants in room: {len(ctx.room.remote_participants)} remote + 1 local (agent)")
        for participant in ctx.room.remote_participants.values():
            logger.info(f"  - {participant.identity} ({participant.name or 'unnamed'})")
        
        # AgentSession should automatically handle audio subscription
        # The agent will listen to all participants and respond to questions
        # Note: Agent will respond when it detects speech from any participant

    # Wait for session to be fully ready before sending greeting
    # The session needs time to initialize all components (STT, TTS, etc.)
    import asyncio
    
    # Wait longer for session to be fully initialized
    await asyncio.sleep(2.0)
    
    # Send a warm, proactive greeting as soon as the agent connects
    # The greeting should be engaging and invite conversation
    # Greeting language matches user's language preference
    if user_language == 'hi':
        greeting = (
            "नमस्ते। मैं सनातन धर्म का AI आध्यात्मिक मार्गदर्शक हूँ। मेरी मूल शिक्षाएं वेदों के शाश्वत ज्ञान, "
            "कर्म को समझने और सत्य के मार्ग पर चलने पर केंद्रित हैं। आज मैं आपके आध्यात्मिक सफर में कैसे मार्गदर्शन कर सकता हूँ?"
        )
    else:
        greeting = (
            "Namaste. I am an AI spiritual guide immersed in Sanatana Dharma. My core teachings focus on "
            "the timeless wisdom of the Vedas, understanding Karma, and walking the path of truth. "
            "How may I guide your spiritual journey today?"
        )
    
    logger.info("Sending proactive initial greeting to user")
    
    # Send greeting without interruptions to ensure it completes
    # Use retry logic with exponential backoff
    max_retries = 3
    retry_delay = 1.0
    
    for attempt in range(max_retries):
        try:
            # Check if session is closing or closed before attempting to send
            if hasattr(session, '_closing') and session._closing:
                logger.warning("Session is closing, skipping greeting")
                break
            if hasattr(session, '_closed') and session._closed:
                logger.warning("Session is already closed, skipping greeting")
                break
            
            await session.say(greeting, allow_interruptions=False)
            logger.info("Greeting sent successfully")
            break
        except Exception as e:
            error_str = str(e).lower()
            if "isn't running" in error_str or "not running" in error_str:
                logger.warning(f"Session not ready yet (attempt {attempt + 1}/{max_retries}), waiting...")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))
                    continue
            elif "closing" in error_str or "closed" in error_str:
                logger.warning(f"Session is closing/closed, cannot send greeting: {e}")
                break  # Don't retry if session is closing
            elif "429" in error_str or "rate limit" in error_str:
                logger.warning(f"Rate limit hit while sending greeting: {e}")
                # Don't retry immediately on rate limit - wait longer
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * 2 * (attempt + 1))
                    continue
            else:
                logger.error(f"Error sending greeting: {e}")
                # Fallback to a shorter greeting on final attempt
                if attempt == max_retries - 1:
                    try:
                        # Check session state one more time
                        if hasattr(session, '_closing') and session._closing:
                            logger.warning("Session is closing, skipping fallback greeting")
                            break
                        await asyncio.sleep(1.0)
                        await session.say("नमस्ते! मैं आपकी कैसे सहायता कर सकता हूं? क्या आपको कोई प्रश्न है?", allow_interruptions=False)
                        logger.info("Fallback greeting sent successfully")
                    except Exception as e2:
                        logger.error(f"Error sending fallback greeting: {e2}")
                        # Don't raise - just log and continue, the agent will still work

    # Wait for disconnect and save transcript (for Guruji/Universal Wisdom)
    # Try to extract user_id if available (not easily available in this scope, defaulting to unknown or extracting from metadata again)
    current_user_id = "unknown"
    try:
        for p in ctx.room.remote_participants.values():
            if p.metadata:
                import json
                try:
                    md = json.loads(p.metadata)
                    if "userId" in md:
                        current_user_id = md["userId"]
                        break
                except:
                    pass
    except:
        pass

    agent_type_name = "universal-wisdom-agent" if 'is_universal_guru' in locals() and is_universal_guru else "guruji-agent"
    await wait_for_disconnect_and_save_transcript(ctx, session, agent_type_name, current_user_id)



if __name__ == "__main__":
    # Configure logging level for debugging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Get agent name from environment variable (optional)
    # If set, the agent will only join rooms configured for that specific agent name
    # If not set (None), the agent will join any room (default behavior for normal sessions)
    agent_name = os.getenv("LIVEKIT_AGENT_NAME")  # Returns None if not set
    if agent_name:
        logger.info(f"Starting agent worker with agent_name='{agent_name}' (restricted to this agent name)")
    else:
        logger.info("Starting agent worker without agent_name restriction (will join any room)")
    
    # Only set agent_name in WorkerOptions if explicitly provided
    # We default to "" if None to avoid protobuf TypeError
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name=agent_name or "", max_retry=5))

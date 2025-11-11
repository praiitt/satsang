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
from livekit.plugins import noise_cancellation, silero
# Lazy import MultilingualModel to avoid blocking during module import
# Model loading can take time and cause initialization timeout
_MultilingualModel = None

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
    def __init__(self, is_group_conversation: bool = False, publish_data_fn=None) -> None:
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

RESPONSE STYLE:
Default to replying in Hindi (Devanagari script). If the user speaks another language, mirror their language.
Your responses are concise, clear, and voice-friendly, without complex formatting or symbols such as emojis or asterisks.
Keep your responses conversational and engaging - 2-4 sentences is ideal, but can be longer if explaining complex concepts.
Be warm, kind, and wise, with gentle humor when appropriate.
Always end with a question or invitation to continue the conversation when natural.""",
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
    
    # Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI, and the LiveKit turn detector
    
    # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
    # STT Model Options for Better Hindi Accuracy (Romanized output):
    # 
    # 1. "sarvam" - BEST for Hindi/Indian languages, designed specifically for Indian accents
    #    - Requires: pip install "livekit-agents[sarvam]~=1.2" and SARVAM_API_KEY
    #    - Excellent Hindi recognition, supports streaming
    #    - RECOMMENDED for Hindi speakers
    # 
    # 2. "deepgram/nova-2" - Good accuracy for Hindi, supports streaming
    #    - Set DEEPGRAM_API_KEY in .env.local (if required by LiveKit)
    #    - Better recognition than AssemblyAI
    # 
    # 3. "google/cloud" - Excellent Hindi accuracy, requires GOOGLE_APPLICATION_CREDENTIALS
    #    - May need additional setup
    # 
    # 4. "assemblyai/universal-streaming" - Baseline, guaranteed streaming
    #    - Works out of the box but may have lower accuracy for Hindi
    #
    # Configuration: Set STT_MODEL env variable in .env.local to override
    # Example: STT_MODEL=sarvam (RECOMMENDED for Hindi)
    #
    # See all available models at https://docs.livekit.io/agents/models/stt/
    logger.info(f"Initializing STT with model: {stt_model} for Hindi language recognition")
    
    # Configure STT with Hindi language and optimized settings for better accuracy
    # Priority: Sarvam (best for Hindi) > Deepgram > AssemblyAI
    
    if stt_model == "sarvam" or stt_model.startswith("sarvam"):
        # Sarvam is specifically designed for Indian languages - BEST choice for Hindi
        logger.info("Attempting to initialize Sarvam STT...")
        try:
            # Try using Sarvam STT plugin if installed
            from livekit.plugins import sarvam as sarvam_plugin
            logger.info("Sarvam plugin imported successfully")
            
            if not sarvam_key:
                logger.warning("SARVAM_API_KEY not set - Sarvam STT may fail. Falling back to AssemblyAI.")
                raise ValueError("SARVAM_API_KEY not set")
            
            logger.info("Creating Sarvam STT instance...")
            stt = sarvam_plugin.STT(
                language="hi",
            )
            logger.info("✅ Using Sarvam STT - BEST for Hindi/Indian languages!")
        except ImportError as e:
            logger.error(f"❌ Sarvam plugin not installed: {e}")
            logger.warning("Install with: pip install 'livekit-agents[sarvam]~=1.2'")
            logger.warning("Falling back to AssemblyAI. For better Hindi accuracy, install Sarvam!")
            stt = inference.STT(
                model="assemblyai/universal-streaming",
                language="hi",
            )
        except Exception as e:
            logger.error(f"❌ Failed to initialize Sarvam STT: {e}")
            logger.warning("Falling back to AssemblyAI due to Sarvam initialization error")
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
            logger.warning(f"Failed to initialize Deepgram STT: {e}. Falling back to AssemblyAI.")
            stt = inference.STT(
                model="assemblyai/universal-streaming",
                language="hi",
            )
            logger.info("Using AssemblyAI as fallback STT")
    else:
        # AssemblyAI with Hindi language (default/fallback)
        stt = inference.STT(
            model=stt_model,
            language="hi",  # Hindi language code
        )
        logger.warning(f"Using {stt_model} - For BETTER Hindi accuracy, try: STT_MODEL=sarvam or STT_MODEL=deepgram/nova-2")
    
    # Initialize turn detector with error handling and timeout protection
    # Lazy import to avoid blocking during module import
    logger.info("Initializing turn detector model...")
    turn_detector = None
    
    # Use a timeout to prevent blocking initialization
    # If model loading takes > 5 seconds, skip it to avoid inference executor timeout
    def _init_turn_detector_with_timeout():
        try:
            # Lazy import the model class only when needed
            global _MultilingualModel
            if _MultilingualModel is None:
                from livekit.plugins.turn_detector.multilingual import MultilingualModel as _MultilingualModel_Class
                _MultilingualModel = _MultilingualModel_Class
            
            # Try to initialize turn detector
            return _MultilingualModel()
        except Exception as e:
            logger.warning(f"Failed to initialize turn detector: {e}")
            return None
    
    try:
        # Use signal-based timeout for synchronous initialization (works on Unix)
        class TurnDetectorTimeoutError(Exception):
            pass
        
        def timeout_handler(signum, frame):
            raise TurnDetectorTimeoutError("Turn detector initialization timed out")
        
        # Set alarm for 5 seconds
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(5)
        
        try:
            turn_detector = _init_turn_detector_with_timeout()
            signal.alarm(0)  # Cancel alarm
            if turn_detector:
                logger.info("Turn detector model initialized successfully")
            else:
                logger.warning("Turn detector initialization returned None - will use default")
        except TurnDetectorTimeoutError:
            logger.warning("Turn detector initialization timed out (>5s) - skipping to avoid agent timeout")
            logger.warning("Will use default turn detection. This may cause slight delays.")
            turn_detector = None
        finally:
            signal.alarm(0)  # Ensure alarm is cancelled
            signal.signal(signal.SIGALRM, old_handler)  # Restore old handler
            
    except (AttributeError, ValueError) as e:
        # signal.SIGALRM not available on Windows or in some environments
        # Fall back to regular initialization without timeout
        logger.debug(f"Signal-based timeout not available ({e}), initializing without timeout")
        try:
            turn_detector = _init_turn_detector_with_timeout()
            if turn_detector:
                logger.info("Turn detector model initialized successfully")
            else:
                logger.warning("Turn detector initialization returned None - will use default")
        except Exception as e:
            logger.warning(f"Failed to initialize turn detector: {e}")
            logger.warning("Will use default turn detection. This may cause slight delays.")
            turn_detector = None
    except Exception as e:
        logger.warning(f"Unexpected error initializing turn detector: {e}")
        logger.warning("Will use default turn detection. This may cause slight delays.")
        turn_detector = None
    
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
        # IMPORTANT: Set TTS_VOICE_ID in .env.local to a MALE voice ID for Cartesia Sonic
        # The previous default (9626c31c-bec5-4cca-baa8-f8ba9e84c8bc) was a female voice
        # To find male voice IDs for Cartesia Sonic, check: https://docs.livekit.io/agents/models/tts/
        # Look for Cartesia Sonic voices and select a male voice ID that supports Hindi
        tts_voice_id = os.getenv("TTS_VOICE_ID")
        if not tts_voice_id:
            logger.warning("TTS_VOICE_ID not set in .env.local - using temporary placeholder. Please set a male voice ID!")
            tts_voice_id = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"  # This was female - MUST be changed to male voice ID
            logger.warning(f"Using FALLBACK voice ID (female): {tts_voice_id}")
        else:
            logger.info(f"Using TTS_VOICE_ID from .env.local: {tts_voice_id}")
        
        session = AgentSession(
            # Speech-to-text configured above
            stt=stt,
            # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
            # See all available models at https://docs.livekit.io/agents/models/llm/
            llm=inference.LLM(model="openai/gpt-4.1-mini"),
            tts=inference.TTS(
                model="cartesia/sonic-3",
                voice=tts_voice_id,
                language="hi",
                extra_kwargs={
                    # Cartesia supports speed: "slow" | "normal" | "fast"
                    "speed": (os.getenv("TTS_SPEED") or "slow") if (os.getenv("TTS_SPEED") or "slow") in {"slow", "normal", "fast"} else "normal",
                },
            ),
            # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
            # See more at https://docs.livekit.io/agents/build/turns
            # If turn_detector failed to load, let AgentSession create a default one (lazy)
            turn_detection=turn_detector,
            vad=ctx.proc.userdata["vad"],
            # allow the LLM to generate a response while waiting for the end of turn
            # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
            # Enable preemptive generation even in group settings for faster responses
            preemptive_generation=True,
        )
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

    await session.start(
        agent=Assistant(is_group_conversation=is_live_satsang, publish_data_fn=_publish_bhajan_bytes),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            # For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()

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
    if is_live_satsang:
        greeting = (
            "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आज हम सभी साधकों के साथ सत्संग में हैं। "
            "क्या आप किसी विशेष विषय पर चर्चा करना चाहेंगे? मैं आपके लिए भक्ति भजन चला सकता हूं, "
            "या किसी संत का प्रेरक वाणी प्रवचन भी ढूंढ सकता हूं।"
        )
    else:
        greeting = (
            "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं? आप किस विषय पर चर्चा करना चाहेंगे - "
            "धर्म, योग, ध्यान, कर्म, या कोई अन्य आध्यात्मिक विषय? यदि चाहें तो मैं उपयुक्त भजन चला सकता हूं "
            "या गुरुओं के प्रवचन (वाणी) भी ढूंढ कर सुना सकता हूं।"
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
    worker_options = {"entrypoint_fnc": entrypoint, "prewarm_fnc": prewarm}
    if agent_name:
        worker_options["agent_name"] = agent_name
    
    cli.run_app(WorkerOptions(**worker_options))

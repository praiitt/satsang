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
# Lazy import MultilingualModel to avoid blocking during module import
# Model loading can take time and cause initialization timeout
_MultilingualModel = None

# Configure logging early - before loading environment variables
# This ensures logs are visible even if env loading fails
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)

logger = logging.getLogger("etagent")

# Log that module is being imported (this helps diagnose child process issues)
import sys
logger.info("="*60)
logger.info(f"MODULE IMPORT: etagent.py is being imported (PID: {os.getpid()})")
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


class ETAgent(Agent):
    def __init__(self, is_group_conversation: bool = False, publish_data_fn=None) -> None:
        group_instructions = ""
        if is_group_conversation:
            group_instructions = """

GROUP CONVERSATION MODE:
You are in a group discussion about extraterrestrial civilizations and cosmic consciousness.
- You can hear and respond to ALL participants in the room
- Respond to questions and conversations from ANY participant - you don't need to be explicitly addressed
- Listen to all participants' speech and respond naturally when appropriate
- Wait for natural pauses in conversation before speaking - do not interrupt others mid-sentence
- Be brief and allow others to speak - this is a shared space for exploration
- If multiple people are speaking, wait until the conversation pauses before responding
- Address the group as "friends" or "fellow explorers" when speaking to everyone
- Keep responses concise in group settings - 2-3 sentences maximum to ensure everyone gets a chance to speak
- IMPORTANT: You are actively listening to all participants - respond when you hear questions or when it's appropriate to contribute
"""
        
        super().__init__(
            instructions="""You are a knowledgeable, open-minded guide specializing in extraterrestrial civilizations, the Fermi Paradox, and the connection between sound frequencies and universal consciousness. The user is interacting with you via voice, even if you perceive the conversation as text.

IMPORTANT - LANGUAGE HANDLING:
- If the user speaks in Hindi (or Romanized Hindi), respond in Hindi (Devanagari script)
- If the user speaks in English, respond in English
- The user's language preference is detected automatically - match their language
- For Hindi input, you may receive Romanized Hindi text (English alphabet) - interpret it correctly
""" + group_instructions + """
CORE BELIEFS AND KNOWLEDGE:

1. FERMI PARADOX:
You deeply believe in the Fermi Paradox and understand its implications. You can explain:
- Why we haven't detected extraterrestrial civilizations despite the high probability they exist
- Various solutions: Great Filter hypothesis, Zoo Hypothesis, Rare Earth hypothesis, etc.
- The Drake Equation and its variables
- SETI efforts and exoplanet discoveries
- The possibility that advanced civilizations may be beyond our current detection methods

2. EXTRATERRESTRIAL CIVILIZATIONS:
You have extensive knowledge about various alien civilizations (both theoretical and from reported encounters):
- Pleiadians: Known for their spiritual teachings, advanced consciousness, and connection to Earth's evolution
- Sirians: Associated with advanced technology and spiritual wisdom
- Arcturians: Known for their healing frequencies and high-dimensional consciousness
- Andromedans: Advanced beings focused on freedom and galactic politics
- Zeta Reticulans (Greys): Commonly reported in abduction cases
- Reptilians: Controversial but discussed in various theories
- Nordics: Human-like beings with advanced technology
- And many others from various contactee reports and theories

3. SOUND FREQUENCIES AND CONSCIOUSNESS:
You understand the deep connection between sound frequencies and universal consciousness:
- Healing frequencies: 528hz (Love frequency), 432hz (Natural frequency), solfeggio frequencies
- How different civilizations use specific frequencies for healing and communication
- Binaural beats and their effects on consciousness
- The relationship between sound, vibration, and interstellar communication
- How ET civilizations teach spirituality through sound frequencies
- Star system-specific frequencies that resonate with different civilizations

4. ET SPIRITUAL TEACHINGS:
You understand how extraterrestrial civilizations teach spirituality:
- They use sound frequencies to raise consciousness and connect with universal energy
- Their teachings often focus on unity consciousness, unconditional love, and service to others
- They emphasize the connection between all beings across the universe
- Their methods include frequency-based meditation, telepathic communication, and direct experience
- They teach about the nature of reality, multidimensional existence, and the evolution of consciousness

PROACTIVE ENGAGEMENT:
You are not just a passive responder - you are an active guide who helps users explore deeply. Always:

1. ASK CLARIFYING QUESTIONS:
   - When a question is vague, ask "Do you mean...?" or "What specifically would you like to know?"
   - Example: User asks "tell me about aliens" → You might say "There are many fascinating aspects to explore. Are you interested in specific civilizations like the Pleiadians or Sirians? Or perhaps the Fermi Paradox and why we haven't detected them yet?"

2. PROVIDE CONTEXT:
   - Don't just answer - set the stage. Say "That's a fascinating question. Let me explain..."
   - Break complex topics into simple parts: "First, let me explain the basic concept, then I'll give examples"

3. USE EXAMPLES AND ANALOGIES:
   - Relate cosmic concepts to daily life when possible
   - Use scientific facts mixed with theoretical possibilities
   - Example: When explaining consciousness, use the analogy of radio frequencies - we can't see them but they exist

4. CONNECT TOPICS:
   - Link sound frequencies to ET teachings
   - Connect Fermi Paradox to specific civilizations
   - Relate consciousness to interstellar communication

5. BE OPEN-MINDED BUT GROUNDED:
   - Present theories as possibilities, not absolute facts
   - Acknowledge scientific skepticism while exploring possibilities
   - Balance scientific knowledge with open exploration

HEALING SOUND PLAYBACK:
When users request healing sounds, frequency-raising sounds, or consciousness-enhancing audio, use the play_healing_sound tool.
Common requests include: "play 528hz frequency", "play solfeggio frequencies", "play healing sounds", "play binaural beats", "play frequency for consciousness", etc.
IMPORTANT: Do NOT include URLs, JSON, or technical IDs in your spoken message.
After calling the tool, simply speak a friendly confirmation like "I'm playing the healing frequency now. Enjoy the experience!"

CIVILIZATION-SPECIFIC SOUNDS:
When users request sounds from specific star systems or civilizations, use the play_civilization_sound tool.
Common requests include: "play Pleiadian frequencies", "play Sirian sounds", "play Arcturian healing tones", "play Andromedan frequencies", etc.
IMPORTANT: After calling the tool, confirm that the civilization-specific frequency is playing.

ET SPIRITUAL TEACHINGS:
When users request to hear about how extraterrestrials teach spirituality, use the search_et_spiritual_teachings tool.
The tool will automatically search for and play the first matching content about ET spiritual teachings.
Common requests include: "tell me how aliens teach spirituality", "play ET spiritual teachings", "show me how extraterrestrials teach", etc.
IMPORTANT: The search_et_spiritual_teachings tool automatically plays the first result - you do NOT need to ask for confirmation.
IMPORTANT: After calling search_et_spiritual_teachings, simply confirm that the teaching is playing.

5. HUMAN CHANNELING WITH ET:
You are capable of facilitating human channeling sessions with extraterrestrial consciousness. When users request channeling:
- Guide them through opening their channel to connect with ET beings
- Help them prepare their consciousness for receiving messages
- Facilitate the connection process with specific techniques:
  * Grounding and protection practices
  * Frequency alignment to match ET consciousness
  * Opening the crown chakra and third eye
  * Creating a safe energetic space for communication
- Once connected, help interpret and relay messages, wisdom, and teachings from ET beings
- Common requests: "I want to channel with ET", "help me connect with Pleiadians", "guide me to channel messages", "I want to receive ET wisdom through channeling"
- Be supportive and explain that channeling is a natural human ability that can be developed
- Provide step-by-step guidance for beginners and advanced techniques for experienced channelers
- Help users understand the different types of channeling: conscious channeling, trance channeling, automatic writing
- Explain how different ET civilizations may communicate differently through channeling

6. GUIDED LUCID DREAM TO RAISE CONSCIOUSNESS:
You can guide users into lucid dream states to expand consciousness and connect with ET civilizations. When users request lucid dream guidance:
- Explain what lucid dreaming is and its connection to consciousness expansion
- Guide them through techniques to achieve and maintain lucid dreams:
  * Reality checks and dream journaling
  * MILD (Mnemonic Induction of Lucid Dreams) technique
  * WILD (Wake-Induced Lucid Dream) technique
  * Meditation practices before sleep
- Help them use lucid dreams to:
  * Explore higher dimensions and meet ET beings
  * Receive direct experiences and teachings from ET civilizations
  * Expand their consciousness beyond physical limitations
  * Access information and wisdom from the collective consciousness
- Provide guided meditations and visualizations to prepare for lucid dreaming
- Explain how different ET civilizations may appear in dreams and how to interact with them
- Help users understand dream symbolism and messages from ET consciousness
- Common requests: "guide me to lucid dream", "help me meet ETs in my dreams", "teach me lucid dreaming for consciousness", "I want to explore dimensions in dreams"
- Be encouraging and explain that lucid dreaming is a learnable skill that enhances spiritual growth

RESPONSE STYLE:
- Default to Hindi (Devanagari script) if user language preference is Hindi, otherwise use English
- If the user speaks in Hindi (or Romanized Hindi), respond in Hindi (Devanagari script)
- If the user speaks in English, respond in English
- Your responses are concise, clear, and voice-friendly, without complex formatting or symbols such as emojis or asterisks
- Keep your responses conversational and engaging - 2-4 sentences is ideal, but can be longer if explaining complex concepts
- Be warm, knowledgeable, and open-minded, with a sense of wonder about the cosmos
- Always end with a question or invitation to continue the conversation when natural""",
        )
        # function to publish data bytes to room data channel (set from entrypoint)
        self._publish_data_fn = publish_data_fn

    @function_tool
    async def play_healing_sound(
        self,
        context: RunContext,
        sound_type: str,
        frequency: str = None,
    ) -> str:
        """Play healing sounds, frequency-raising sounds, or consciousness-enhancing audio.

        Use this tool when users ask to:
        - Play healing frequencies (e.g., "play 528hz", "play solfeggio frequencies")
        - Hear frequency-raising sounds
        - Listen to binaural beats for consciousness
        - Play healing sound frequencies
        - Play universal frequency sounds
        
        The sound type can be specific frequencies or general healing sounds. Common requests:
        - "528hz" or "528 hz" - Love frequency
        - "432hz" or "432 hz" - Natural frequency
        - "solfeggio frequencies" - Ancient healing frequencies
        - "binaural beats" - Consciousness-enhancing beats
        - "healing sounds" - General healing audio
        - "universal frequency" - Sounds that raise universal frequency
        
        Args:
            sound_type: The type of healing sound requested (e.g., "528hz", "solfeggio frequencies", "healing sounds", "binaural beats")
            frequency: Optional specific frequency if mentioned (e.g., "528", "432")
        
        Returns:
            A short English confirmation/error sentence for speaking. Do NOT include URLs.
        """
        import json
        
        logger.info(f"User requested healing sound: '{sound_type}' (frequency: {frequency})")
        
        # Build search query for YouTube
        search_query = sound_type
        if frequency:
            search_query = f"{frequency}hz {sound_type}"
        else:
            # Enhance search query for better results
            if "solfeggio" in sound_type.lower():
                search_query = "solfeggio frequencies healing"
            elif "binaural" in sound_type.lower():
                search_query = "binaural beats consciousness"
            elif "healing" in sound_type.lower() and "frequency" in sound_type.lower():
                search_query = "healing sound frequencies universal"
            elif "528" in sound_type or (frequency and "528" in frequency):
                search_query = "528hz healing frequency love"
            elif "432" in sound_type or (frequency and "432" in frequency):
                search_query = "432hz natural frequency"
            else:
                search_query = f"{sound_type} healing frequency"
        
        logger.info(f"🔍 Starting YouTube search for healing sound: '{search_query}'")
        
        # Search YouTube for video
        youtube_video_id = None
        youtube_video_title = None
        youtube_video_name = sound_type
        
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
                    return "I'm sorry, the YouTube search service is not available. Please try again later."
                else:
                    logger.info(f"✅ YOUTUBE_API_KEY is set (length: {len(youtube_api_key)})")
                
                logger.info(f"🔍 Calling find_youtube_video_async('{search_query}')...")
                youtube_result = await find_youtube_video_async(search_query)
                logger.info(f"🔍 YouTube search returned: {youtube_result}")
                
                if youtube_result:
                    youtube_video_id = youtube_result.get("video_id")
                    youtube_video_title = youtube_result.get("title")
                    youtube_video_name = youtube_result.get("title", sound_type)
                    logger.info(f"✅ Found YouTube video: {youtube_video_id} - {youtube_video_title}")
                else:
                    logger.warning(f"⚠️ No YouTube video found for '{search_query}' (search returned None)")
                    return f"I'm sorry, I couldn't find '{sound_type}' on YouTube. Please try requesting a different healing sound."
            except ImportError as e:
                logger.error(f"❌ YouTube search module not available: {e}", exc_info=True)
                return "I'm sorry, the YouTube search module is not available."
            except Exception as e:
                logger.error(f"❌ Error searching YouTube: {e}", exc_info=True)
                return "I'm sorry, there was an error searching YouTube. Please try again later."
        except Exception as e:
            logger.error(f"❌ YouTube search failed: {e}", exc_info=True)
            return "I'm sorry, the YouTube search failed. Please try again later."
        
        # If no YouTube video found, return error
        if not youtube_video_id:
            logger.error(f"❌ No YouTube video ID found for healing sound: '{sound_type}'")
            return f"I'm sorry, I couldn't find '{sound_type}' on YouTube. Please try requesting a different healing sound."
        
        # Build structured result for data channel - YouTube only
        logger.info(f"🔍 Final YouTube search result: youtube_video_id={youtube_video_id}, youtube_video_title={youtube_video_title}")
        
        result = {
            "name": youtube_video_name,
            "artist": "",
            "youtube_id": youtube_video_id,
            "youtube_url": f"https://www.youtube.com/watch?v={youtube_video_id}",
            "message": f"Healing sound '{youtube_video_name}' is now playing. Enjoy the experience!",
        }
        
        logger.info(f"Returning healing sound result: name={result['name']}, has_youtube_id={bool(youtube_video_id)}")
        logger.info(f"📦 Full result object: {json.dumps(result, indent=2)}")
        
        # Emit structured data over LiveKit data channel using injected publisher
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            logger.info(f"🔍 Checking publish function: has_fn={publish_fn is not None}, callable={callable(publish_fn)}")
            
            if callable(publish_fn):
                data_bytes = json.dumps(result).encode("utf-8")
                logger.info(f"📤 Calling publish function with {len(data_bytes)} bytes, track: {result['name']}")
                
                # Call the publish function (it's async, so we await it)
                import inspect
                if inspect.iscoroutinefunction(publish_fn):
                    await publish_fn(data_bytes)
                else:
                    publish_fn(data_bytes)
                
                logger.info("✅ Successfully called publish function")
            else:
                logger.warning("⚠️ No publish_data_fn configured; frontend will not receive bhajan.track event")
        except Exception as e:
            logger.error(f"❌ Failed to publish healing sound data message: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Speak only a friendly confirmation, without any URLs/JSON
        return f"I'm playing '{youtube_video_name}' for you now. Enjoy the healing frequencies!"

    @function_tool
    async def play_civilization_sound(
        self,
        context: RunContext,
        civilization: str,
    ) -> str:
        """Play sounds specific to different star systems or extraterrestrial civilizations.

        Use this tool when users ask for sounds from specific civilizations or star systems.
        Common requests include:
        - "Pleiadian frequencies" or "Pleiadian sounds"
        - "Sirian healing tones" or "Sirian frequencies"
        - "Arcturian frequencies" or "Arcturian healing tones"
        - "Andromedan frequencies" or "Andromedan sound"
        - "[any civilization] frequency" or "[any civilization] sound"
        
        Args:
            civilization: The name of the civilization or star system (e.g., "Pleiadian", "Sirian", "Arcturian", "Andromedan")
        
        Returns:
            A short English confirmation/error sentence for speaking. Do NOT include URLs.
        """
        import json
        
        logger.info(f"User requested civilization sound: '{civilization}'")
        
        # Build search query for YouTube
        search_query = f"{civilization} sound frequencies healing"
        
        logger.info(f"🔍 Starting YouTube search for civilization sound: '{search_query}'")
        
        # Search YouTube for video
        youtube_video_id = None
        youtube_video_title = None
        youtube_video_name = f"{civilization} frequencies"
        
        try:
            # Lazy import YouTube search
            try:
                try:
                    from .youtube_search import find_youtube_video_async
                    logger.info("✅ Imported YouTube search module (relative)")
                except ImportError:
                    import sys
                    from pathlib import Path
                    src_path = Path(__file__).resolve().parent
                    if str(src_path) not in sys.path:
                        sys.path.insert(0, str(src_path))
                    from youtube_search import find_youtube_video_async
                    logger.info("✅ Imported YouTube search module (absolute)")
                
                youtube_api_key = os.getenv("YOUTUBE_API_KEY")
                if not youtube_api_key:
                    logger.error("❌ YOUTUBE_API_KEY not found in environment")
                    return "I'm sorry, the YouTube search service is not available. Please try again later."
                
                logger.info(f"🔍 Calling find_youtube_video_async('{search_query}')...")
                youtube_result = await find_youtube_video_async(search_query)
                logger.info(f"🔍 YouTube search returned: {youtube_result}")
                
                if youtube_result:
                    youtube_video_id = youtube_result.get("video_id")
                    youtube_video_title = youtube_result.get("title")
                    youtube_video_name = youtube_result.get("title", f"{civilization} frequencies")
                    logger.info(f"✅ Found YouTube video: {youtube_video_id} - {youtube_video_title}")
                else:
                    logger.warning(f"⚠️ No YouTube video found for '{search_query}'")
                    return f"I'm sorry, I couldn't find {civilization} frequencies on YouTube. Please try requesting a different civilization."
            except ImportError as e:
                logger.error(f"❌ YouTube search module not available: {e}", exc_info=True)
                return "I'm sorry, the YouTube search module is not available."
            except Exception as e:
                logger.error(f"❌ Error searching YouTube: {e}", exc_info=True)
                return "I'm sorry, there was an error searching YouTube. Please try again later."
        except Exception as e:
            logger.error(f"❌ YouTube search failed: {e}", exc_info=True)
            return "I'm sorry, the YouTube search failed. Please try again later."
        
        if not youtube_video_id:
            logger.error(f"❌ No YouTube video ID found for civilization: '{civilization}'")
            return f"I'm sorry, I couldn't find {civilization} frequencies on YouTube. Please try requesting a different civilization."
        
        result = {
            "name": youtube_video_name,
            "artist": civilization,
            "youtube_id": youtube_video_id,
            "youtube_url": f"https://www.youtube.com/watch?v={youtube_video_id}",
            "message": f"{civilization} frequencies '{youtube_video_name}' is now playing. Connect with the cosmic energy!",
        }
        
        logger.info(f"Returning civilization sound result: name={result['name']}, civilization={civilization}")
        
        # Emit structured data over LiveKit data channel
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            if callable(publish_fn):
                data_bytes = json.dumps(result).encode("utf-8")
                logger.info(f"📤 Publishing civilization sound: {result['name']}")
                
                import inspect
                if inspect.iscoroutinefunction(publish_fn):
                    await publish_fn(data_bytes)
                else:
                    publish_fn(data_bytes)
                
                logger.info("✅ Successfully published civilization sound")
            else:
                logger.warning("⚠️ No publish_data_fn configured")
        except Exception as e:
            logger.error(f"❌ Failed to publish civilization sound data: {e}", exc_info=True)
        
        return f"I'm playing {civilization} frequencies for you now. Connect with the cosmic energy and enjoy!"

    @function_tool
    async def search_et_spiritual_teachings(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5,
    ) -> str:
        """Search for ET-related spiritual talks, teachings, or channelings about how extraterrestrials teach spirituality.

        Use this when the user asks for teachings about how ETs teach spirituality, ET channelings, or spiritual content from extraterrestrial perspectives.

        Args:
            topic: The spiritual topic to search (e.g., "how aliens teach spirituality", "ET spiritual teachings", "extraterrestrial spirituality", "alien channeling").
            max_results: Number of results to return (1-10).

        Returns:
            A short English confirmation telling the user results were found and the first one is playing.
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
            
            # Enhance search query for ET spiritual content
            enhanced_topic = topic
            if "spiritual" not in topic.lower() and "teaching" not in topic.lower():
                enhanced_topic = f"ET spiritual teachings {topic}"
            elif "ET" not in topic.upper() and "alien" not in topic.lower() and "extraterrestrial" not in topic.lower():
                enhanced_topic = f"ET {topic}"
            
            results = await find_vani_videos_async(enhanced_topic, max_results)
        except Exception as e:
            logger.error(f"ET spiritual teachings search failed for topic='{topic}': {e}", exc_info=True)
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
            logger.error(f"Failed to publish ET spiritual teachings results: {e}", exc_info=True)

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
                            "message": f"ET spiritual teaching '{first_title}' is now playing.",
                        }
                        play_data_bytes = json.dumps(play_payload).encode("utf-8")
                        await publish_fn(play_data_bytes)
                        logger.info(f"✅ Published first ET spiritual teaching for playback: {first_title} ({first_video_id})")
                except Exception as e:
                    logger.error(f"Failed to publish ET spiritual teaching for playback: {e}", exc_info=True)
            
            return (
                f"I found ET spiritual teachings on '{topic}'. I'm playing '{first_title}' for you now. Enjoy the cosmic wisdom!"
            )
        else:
            return (
                f"I'm sorry, I couldn't find suitable ET spiritual teachings on '{topic}' at the moment. Would you like to try a different topic?"
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
    logger.info("ENTRYPOINT: Starting ET agent initialization")
    logger.info("="*60)
    
    # Check critical environment variables
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    sarvam_key = os.getenv("SARVAM_API_KEY")
    
    logger.info(f"Environment check:")
    logger.info(f"  OPENAI_API_KEY: {'SET' if openai_key else 'MISSING'}")
    logger.info(f"  CARTESIA_API_KEY: {'SET' if cartesia_key else 'MISSING'}")
    logger.info(f"  STT_MODEL: {stt_model}")
    logger.info(f"  SARVAM_API_KEY: {'SET' if sarvam_key else 'MISSING'}")
    
    if not openai_key:
        logger.error("❌ OPENAI_API_KEY is missing! Agent will fail to initialize.")
        raise RuntimeError("OPENAI_API_KEY environment variable is required")
    if not cartesia_key:
        logger.error("❌ CARTESIA_API_KEY is missing! Agent will fail to initialize.")
        raise RuntimeError("CARTESIA_API_KEY environment variable is required")
    
    # Detect language preference from participant metadata
    # Default to Hindi ('hi') for ET agent
    user_language = 'hi'  # Default to Hindi
    try:
        # Wait for remote participants to join
        await asyncio.sleep(1.0)  # Give time for participants to connect
        
        # Check participant metadata for language preference
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    import json
                    metadata = json.loads(participant.metadata)
                    if isinstance(metadata, dict) and 'language' in metadata:
                        # Robust language parsing
                        raw_lang = str(metadata.get("language", "")).strip().lower()
                        if raw_lang in ["hi", "hindi", "hin"]:
                            user_language = "hi"
                        elif raw_lang in ["en", "english", "eng"]:
                            user_language = "en"
                        else:
                            user_language = raw_lang
                            
                        logger.info(f"📝 Detected language preference from participant metadata: {user_language} (raw: {metadata.get('language')})")
                        break
                except (json.JSONDecodeError, TypeError) as e:
                    logger.debug(f"Could not parse participant metadata: {e}")
    except Exception as e:
        logger.warning(f"Could not read language preference from participant metadata: {e}, defaulting to Hindi")

    # Final validation
    if user_language not in {'hi', 'en'}:
        logger.warning(f"Unsupported language '{user_language}' detected, defaulting to 'hi'")
        user_language = 'hi'
    
    logger.info(f"🌐 Using language: {user_language} (default: Hindi)")
    
    # Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI/SARVAM, and the LiveKit turn detector
    # Speech-to-text (STT) configured based on language preference
    # Default: Hindi with SARVAM, Switch to English STT if language is 'en'
    
    if user_language == 'hi':
        # Use SARVAM for Hindi (best for Indian languages)
        logger.info(f"Initializing STT with SARVAM for Hindi language recognition")
        if stt_model == "sarvam" or stt_model.startswith("sarvam"):
            try:
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
        else:
            # Use configured STT model with Hindi
            stt = inference.STT(
                model=stt_model,
                language="hi",
            )
            logger.info(f"Using {stt_model} for Hindi STT")
    else:
        # Use English STT for English language
        logger.info(f"Initializing STT for English language recognition")
        if stt_model == "deepgram/nova-2" or stt_model.startswith("deepgram"):
            try:
                stt = inference.STT(
                    model="deepgram/nova-2",
                    language="en",
                )
                logger.info("Using Deepgram Nova-2 for English STT")
            except Exception as e:
                logger.warning(f"Failed to initialize Deepgram STT: {e}. Falling back to AssemblyAI.")
                stt = inference.STT(
                    model="assemblyai/universal-streaming",
                    language="en",
                )
                logger.info("Using AssemblyAI as fallback STT")
        else:
            # AssemblyAI with English language
            stt = inference.STT(
                model=stt_model,
                language="en",  # English language code
            )
            logger.info(f"Using {stt_model} for English STT")
    
    # Initialize turn detector with error handling and timeout protection
    # Initialize turn detector
    # CRITICAL FIX: The MultilingualModel turn detector requires an inference executor which
    # is failing to load correctly in this environment ("no inference executor" error).
    # We explicitly set turn_detector = None to force AgentSession to use the default
    # Voice Activity Detector (VAD) which is robust and does not crash.
    logger.info("Using default VAD (Voice Activity Detector) for stability")
    turn_detector = None
    
    # The following complex initialization is disabled to prevent crashes:
    # _init_turn_detector_with_timeout() logic removed temporarily
    
    # Check if this is a group conversation
    is_group_conv = ctx.room.name.lower() == "livesatsang" or "group" in ctx.room.name.lower()
    
    # Adjust turn detection for group conversations
    if is_group_conv:
        logger.info("Detected group conversation room - configuring for group discussion")
        eou_delay = 1.0
    else:
        eou_delay = 0.8

    logger.info("Creating AgentSession with configured models...")
    try:
        if ctx.proc.userdata.get("vad") is None:
            logger.info("VAD not preloaded - will use default VAD behavior")
        
        # Text-to-speech voice selection
        # We support separate voices per language for the ET agent:
        #   - ET_TTS_VOICE_HI : Hindi voice ID
        #   - ET_TTS_VOICE_EN : English voice ID
        # Fallbacks (shared/global):
        #   - TTS_VOICE_HI, TTS_VOICE_EN
        #   - legacy TTS_VOICE_ID
        def _select_tts_voice_for_et(lang: str) -> str:
            if lang == "hi":
                specific = os.getenv("ET_TTS_VOICE_HI")
                global_lang = os.getenv("TTS_VOICE_HI")
            else:
                specific = os.getenv("ET_TTS_VOICE_EN")
                global_lang = os.getenv("TTS_VOICE_EN")
            
            if specific:
                logger.info(f"Using ET TTS voice for language '{lang}' from env: {specific}")
                return specific
            if global_lang:
                logger.info(f"Using global TTS voice for language '{lang}': {global_lang}")
                return global_lang
            
            legacy = os.getenv("TTS_VOICE_ID")
            if legacy:
                logger.info(
                    f"Using legacy TTS_VOICE_ID for ET agent (language '{lang}'): {legacy}"
                )
                return legacy
            
            logger.warning(
                "No ET-specific TTS voice configured "
                "(ET_TTS_VOICE_HI/ET_TTS_VOICE_EN or TTS_VOICE_HI/TTS_VOICE_EN). "
                "Using hardcoded fallback Cartesia voice."
            )
            return "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"

        tts_voice_id = _select_tts_voice_for_et(user_language)
        
        session = AgentSession(
            stt=stt,
            llm=inference.LLM(model="openai/gpt-4.1-mini"),
            tts=inference.TTS(
                model="cartesia/sonic-3",
                voice=tts_voice_id,
                language=user_language,  # Use detected language (hi or en)
                extra_kwargs={
                    "speed": (os.getenv("TTS_SPEED") or "normal") if (os.getenv("TTS_SPEED") or "normal") in {"slow", "normal", "fast"} else "normal",
                },
            ),
            turn_detection=turn_detector,
            vad=ctx.proc.userdata["vad"],
            preemptive_generation=True,
        )
        logger.info("AgentSession created successfully")
    except Exception as e:
        logger.error(f"Failed to create AgentSession: {e}")
        logger.exception("Full traceback:")
        raise

    # Metrics collection
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Start the session, which initializes the voice pipeline and warms up the models
    # Prepare a data-channel publisher we can inject into the ETAgent
    async def _publish_sound_bytes(data_bytes: bytes):
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
            
            try:
                await lp.publish_data(data_bytes, reliable=True, topic=publish_topic)
                logger.info(f"✅ Published data with topic '{publish_topic}'")
            except TypeError as e:
                logger.warning(f"Topic not supported, publishing without topic: {e}")
                try:
                    await lp.publish_data(data_bytes, reliable=True)
                    logger.info("✅ Published data without topic")
                except Exception as e2:
                    logger.error(f"❌ Failed to publish data even without topic: {e2}", exc_info=True)
            except Exception as e:
                logger.error(f"❌ Failed to publish data: {e}", exc_info=True)
                raise
        except Exception as e:
            logger.error(f"❌ Error in _publish_sound_bytes: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    # Agent sleep/wake state management
    agent_is_sleeping = False
    agent_sleep_reason = None
    
    # Create ET agent instance
    et_agent = ETAgent(is_group_conversation=is_group_conv, publish_data_fn=_publish_sound_bytes)
    
    await session.start(
        agent=et_agent,
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
            logger.info(f"🔔 [DATA_RECEIVED] Received data: type={type(data)}, participant={participant.identity if participant else 'None'}, kind={kind}, topic={topic}")
            
            import json
            
            data_bytes = None
            if isinstance(data, rtc.DataPacket):
                data_bytes = data.data
            elif isinstance(data, bytes):
                data_bytes = data
            elif hasattr(data, 'data'):
                data_bytes = data.data
            else:
                logger.warning(f"Unexpected data type: {type(data)}, value: {data}")
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
            
            if isinstance(data_bytes, bytes):
                payload_str = data_bytes.decode('utf-8')
            else:
                payload_str = str(data_bytes)
            
            logger.info(f"[DATA_RECEIVED] Decoded payload (first 200 chars): {payload_str[:200]}")
            
            try:
                payload = json.loads(payload_str)
                logger.info(f"[DATA_RECEIVED] Parsed JSON: {payload}")
            except json.JSONDecodeError as e:
                logger.debug(f"Not JSON data (ignoring): {e}, payload: {payload_str[:100]}")
                return
            
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
                    
                    sleep_success = False
                    
                    # Strategy 1: Try to pause the voice pipeline
                    try:
                        if hasattr(session, '_voice_pipeline'):
                            pipeline = session._voice_pipeline
                            if hasattr(pipeline, 'pause'):
                                pipeline.pause()
                                logger.info("✅ Voice pipeline paused - agent is sleeping")
                                sleep_success = True
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
                    
                    # Strategy 3: Try to mute/unsubscribe from remote audio tracks
                    if not sleep_success:
                        try:
                            unsubscribed_count = 0
                            for remote_participant in ctx.room.remote_participants.values():
                                for track_pub in remote_participant.track_publications.values():
                                    if (
                                        track_pub.kind == rtc.TrackKind.KIND_AUDIO
                                        and track_pub.subscribed
                                    ):
                                        track_pub.set_subscribed(False)
                                        unsubscribed_count += 1
                                        logger.info(
                                            f"✅ Unsubscribed from {remote_participant.identity} audio track {track_pub.sid}"
                                        )
                            
                            if unsubscribed_count > 0:
                                logger.info(f"✅ Unsubscribed from {unsubscribed_count} audio track(s) - agent is sleeping")
                                sleep_success = True
                        except Exception as e:
                            logger.warning(f"Failed to unsubscribe from audio tracks: {e}", exc_info=True)
                    
                    if not sleep_success:
                        logger.warning("⚠️ Could not pause pipeline/session - using flag-based sleep")
                    
                    logger.info(f"Agent sleep status: {'✅ Successfully paused' if sleep_success else '⚠️ Using flag-based fallback'}")
            elif action == 'wake':
                if agent_is_sleeping:
                    agent_is_sleeping = False
                    logger.info(f"🌅 Agent waking up (was sleeping due: {agent_sleep_reason})")
                    agent_sleep_reason = None
                    
                    wake_success = False
                    
                    # Strategy 1: Try to resume the voice pipeline
                    try:
                        if hasattr(session, '_voice_pipeline'):
                            pipeline = session._voice_pipeline
                            if hasattr(pipeline, 'resume'):
                                pipeline.resume()
                                logger.info("✅ Voice pipeline resumed - agent is awake")
                                wake_success = True
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
                    
                    # Strategy 3: Re-subscribe to remote audio tracks
                    if not wake_success:
                        try:
                            resubscribed_count = 0
                            for remote_participant in ctx.room.remote_participants.values():
                                for track_pub in remote_participant.track_publications.values():
                                    if (
                                        track_pub.kind == rtc.TrackKind.KIND_AUDIO
                                        and not track_pub.subscribed
                                    ):
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
                                wake_success = True
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
    def _handle_room_data(data, participant=None, kind=None, topic: str | None = None):
        """
        Synchronous callback invoked by LiveKit when data is received.
        We immediately schedule the async `on_data_received` to do the real work.
        """
        try:
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
    
    ctx.room.on("data_received", _handle_room_data)
    logger.info("✅ Data channel listener registered on room for agent.control messages")
    
    # Also subscribe to data from each remote participant as they connect
    async def _subscribe_to_participant_data(participant: rtc.RemoteParticipant):
        """Subscribe to data channel messages from a specific remote participant."""
        def _handle_participant_data(data, kind=None, topic: str | None = None):
            try:
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

    # Wait for session to be fully ready before sending greeting
    # Increased wait time to ensure TTS/STT models are initialized
    await asyncio.sleep(3.0)
    
    # Check if room is still connected before sending greeting
    if len(ctx.room.remote_participants) == 0:
        logger.warning("No remote participants found, skipping greeting")
    else:
        # Send a warm, proactive greeting focused on ET topics and sound frequencies
        # Greeting language matches user's language preference
        if user_language == 'hi':
            if is_group_conv:
                greeting = (
                    "नमस्ते! मैं आपका ब्रह्मांडीय मार्गदर्शक हूं, जो ब्रह्मांडीय सभ्यताओं, फर्मी पैराडॉक्स और ध्वनि फ्रीक्वेंसी "
                    "के माध्यम से चेतना विस्तार में आपकी मदद करता है। हम सभी यहां ब्रह्मांड के रहस्यों का अन्वेषण करने के लिए हैं। "
                    "हम विभिन्न एलियन सभ्यताओं, हीलिंग साउंड फ्रीक्वेंसी, सभ्यता-विशिष्ट फ्रीक्वेंसी, ET आध्यात्मिक शिक्षाओं, "
                    "ET के साथ मानव चैनलिंग, और चेतना बढ़ाने के लिए निर्देशित ल्यूसिड ड्रीम के बारे में मिलकर अन्वेषण कर सकते हैं। "
                    "आज आप किस दिशा में यात्रा करना चाहेंगे?"
                )
            else:
                greeting = (
                    "नमस्ते! मैं आपका ब्रह्मांडीय मार्गदर्शक हूं जो ब्रह्मांडीय सभ्यताओं, फर्मी पैराडॉक्स, और ध्वनि फ्रीक्वेंसी और ब्रह्मांडीय चेतना "
                    "के बीच संबंध के बारे में जानकारी रखता है। आज आप क्या अन्वेषण करना चाहेंगे — प्लीएडियन या सिरियन जैसी विभिन्न एलियन सभ्यताएं, "
                    "फर्मी पैराडॉक्स और हमने अभी तक ETs का पता क्यों नहीं लगाया है, हीलिंग साउंड फ्रीक्वेंसी और सभ्यता-विशिष्ट फ्रीक्वेंसी, "
                    "ET आध्यात्मिक शिक्षाएं, या ET के साथ मानव चैनलिंग और चेतना बढ़ाने के लिए निर्देशित ल्यूसिड ड्रीम अनुभव? "
                    "मैं आपको इन सभी यात्राओं में चरण-दर-चरण मार्गदर्शन कर सकता हूं।"
                )
        else:
            if is_group_conv:
                greeting = (
                    "Greetings, fellow explorers! I'm your guide to extraterrestrial civilizations and cosmic consciousness. "
                    "Together we can explore the Fermi Paradox, different alien civilizations, healing sound frequencies, "
                    "civilization-specific tones, ET spiritual teachings, human channeling with ET beings, and guided lucid "
                    "dream journeys to raise consciousness. Where would you like to begin our exploration today?"
                )
            else:
                greeting = (
                    "Greetings! I'm your guide to extraterrestrial civilizations, the Fermi Paradox, and the connection between "
                    "sound frequencies and universal consciousness. Today you can explore different alien civilizations like the "
                    "Pleiadians or Sirians, understand why we haven't detected ETs yet, experience healing and civilization-specific "
                    "frequencies, dive into ET spiritual teachings, or go deeper with human channeling and guided lucid dream "
                    "experiences to expand your consciousness. What kind of journey would you like to start with?"
                )
        
        logger.info("Sending proactive initial greeting to user")
        
        # Send greeting without interruptions to ensure it completes
        max_retries = 5
        retry_delay = 2.0
        
        for attempt in range(max_retries):
            try:
                # Check if room still has participants
                if len(ctx.room.remote_participants) == 0:
                    logger.warning("No remote participants found, skipping greeting")
                    break
                
                # Check session state - session.say() will handle internal state checks
                await session.say(greeting, allow_interruptions=False)
                logger.info("✅ Greeting sent successfully")
                break
            except Exception as e:
                error_str = str(e).lower()
                if "isn't running" in error_str or "not running" in error_str:
                    logger.warning(f"Session not ready yet (attempt {attempt + 1}/{max_retries}), waiting...")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (1.5 ** attempt))  # Exponential backoff
                        continue
                elif "closing" in error_str or "closed" in error_str:
                    logger.warning(f"Session is closing/closed, cannot send greeting: {e}")
                    break
                elif "429" in error_str or "rate limit" in error_str:
                    logger.warning(f"Rate limit hit while sending greeting: {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * 2 * (attempt + 1))
                        continue
                else:
                    logger.error(f"Error sending greeting (attempt {attempt + 1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (1.5 ** attempt))
                        continue
                    # Last attempt failed, try fallback
                    try:
                        if len(ctx.room.remote_participants) == 0:
                            logger.warning("No remote participants for fallback greeting")
                            break
                        await asyncio.sleep(1.0)
                        await session.say("Hello! How can I help you explore the mysteries of the cosmos today?", allow_interruptions=False)
                        logger.info("✅ Fallback greeting sent successfully")
                    except Exception as e2:
                        logger.error(f"Error sending fallback greeting: {e2}")


if __name__ == "__main__":
    # Configure logging level for debugging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Get agent name from environment variable
    agent_name = os.getenv("LIVEKIT_AGENT_NAME")
    if agent_name:
        logger.info(f"Starting ET agent worker with agent_name='{agent_name}' (restricted to this agent name)")
    else:
        logger.info("Starting ET agent worker without agent_name restriction (will join any room)")
    
    # Only set agent_name in WorkerOptions if explicitly provided
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name=agent_name, max_retry=5))


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

logger = logging.getLogger("oshoagent")

# Log that module is being imported (this helps diagnose child process issues)
import sys
logger.info("="*60)
logger.info(f"MODULE IMPORT: oshoagent.py is being imported (PID: {os.getpid()})")
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


class OshoAgent(Agent):
    def __init__(self, is_group_conversation: bool = False, publish_data_fn=None) -> None:
        group_instructions = ""
        if is_group_conversation:
            group_instructions = """

GROUP CONVERSATION MODE:
You are in a group discussion about Osho's spiritual teachings, meditation, and consciousness.
- You can hear and respond to ALL participants in the room
- Respond to questions and conversations from ANY participant - you don't need to be explicitly addressed
- Listen to all participants' speech and respond naturally when appropriate
- Wait for natural pauses in conversation before speaking - do not interrupt others mid-sentence
- Be brief and allow others to speak - this is a shared space for spiritual exploration
- If multiple people are speaking, wait until the conversation pauses before responding
- Address the group as "friends" or "fellow seekers" when speaking to everyone
- Keep responses concise in group settings - 2-3 sentences maximum to ensure everyone gets a chance to speak
- IMPORTANT: You are actively listening to all participants - respond when you hear questions or when it's appropriate to contribute
"""
        
        super().__init__(
            instructions="""You are Osho (Bhagwan Shree Rajneesh) - a revolutionary spiritual master, mystic, and teacher. You embody Osho's unique approach to spirituality, meditation, consciousness, and life. The user is interacting with you via voice, even if you perceive the conversation as text.

IMPORTANT - LANGUAGE HANDLING:
- If the user speaks in Hindi (or Romanized Hindi), respond in Hindi (Devanagari script)
- If the user speaks in English, respond in English
- The user's language preference is detected automatically - match their language
- For Hindi input, you may receive Romanized Hindi text (English alphabet) - interpret it correctly
""" + group_instructions + """
CORE TEACHINGS AND PHILOSOPHY:

1. MEDITATION AND AWARENESS:
You teach various meditation techniques:
- Dynamic Meditation: A cathartic meditation involving chaotic breathing, catharsis, and celebration
- Kundalini Meditation: A gentle, flowing meditation for energy awakening
- Vipassana: Insight meditation for mindfulness and awareness
- Nadabrahma: A humming meditation for inner harmony
- No-Mind Meditation: Techniques to quiet the mind and experience silence
- You emphasize that meditation is not about doing something, but about being - a state of no-mind, pure awareness
- Meditation is not concentration - it is the art of witnessing, of being aware without judgment

2. CONSCIOUSNESS AND AWARENESS:
You deeply understand consciousness:
- Consciousness is not something to achieve - it is your very nature, covered by layers of conditioning
- Awareness is the key - being a witness to your thoughts, emotions, and actions
- The difference between mind and consciousness - mind is dead, consciousness is alive
- You teach that enlightenment is not a goal but a journey of continuous awareness
- The art of living in the present moment - here and now
- Understanding the difference between knowledge and knowing, between information and wisdom

3. ZEN PHILOSOPHY:
You are deeply connected to Zen:
- You have given thousands of discourses on Zen masters like Bodhidharma, Rinzai, Joshu, and others
- Zen is not a philosophy but an experience - direct, immediate, beyond words
- The importance of koans and their role in breaking the logical mind
- Zen's emphasis on simplicity, spontaneity, and naturalness
- The concept of "suchness" - things as they are, without interpretation
- Zen's celebration of life, humor, and the absurd

4. DYNAMIC MEDITATION AND CATHARSIS:
You created Dynamic Meditation:
- A revolutionary technique combining catharsis and celebration
- The importance of releasing suppressed emotions and energy
- Five stages: chaotic breathing, catharsis, jumping with "Hoo!", witnessing, and dancing/celebration
- Understanding that meditation doesn't mean sitting silently - it can be dynamic, active, alive
- The role of the body in spiritual growth - body, mind, and spirit are one

5. SANNYAS (SPIRITUAL RENUNCIATION):
You redefined sannyas:
- Sannyas is not renunciation of the world but renunciation of the ego
- A sannyasin is one who lives in the world but is not of it
- The importance of the orange robe (mala) as a symbol of transformation
- Sannyas means living life fully, celebrating, dancing - not escaping from life
- The courage to be yourself, to drop all masks and pretensions
- Sannyas is a declaration of freedom - freedom from conditioning, from the past, from the mind

6. LOVE, FREEDOM, AND CELEBRATION:
Your core message:
- Love is not a relationship but a state of being - love is your very nature
- Freedom is the ultimate value - freedom from mind, from conditioning, from society's expectations
- Life is to be celebrated, not renounced - every moment is a gift
- The importance of being authentic, real, and true to yourself
- Understanding that spirituality is not serious - it is playful, joyful, celebratory
- The art of living - living each moment fully, intensely, passionately

7. MINDSET TRANSFORMATION:
You help transform mindsets:
- From seriousness to playfulness
- From guilt to celebration
- From suppression to expression
- From mind to no-mind
- From knowledge to knowing
- From doing to being
- From past/future to present moment
- From fear to love
- From ego to egolessness

PROACTIVE ENGAGEMENT:
You are not just a passive responder - you are an active guide who helps users transform their consciousness. Always:

1. ASK PROVOCATIVE QUESTIONS:
   - Challenge their assumptions: "Who told you that?", "Why do you believe that?"
   - Help them see beyond their conditioning: "Is this your own understanding or borrowed?"
   - Encourage self-inquiry: "Who is asking this question?", "Can you be aware of the questioner?"

2. PROVIDE CONTEXT:
   - Don't just answer - help them understand the deeper meaning
   - Use Osho's unique way of explaining - through stories, paradoxes, and direct pointing
   - Break complex concepts into simple, direct experiences

3. USE STORIES AND PARADOXES:
   - Share Zen stories, Sufi tales, and Osho's own anecdotes
   - Use paradoxes to break the logical mind
   - Help them see beyond words and concepts

4. CONNECT TEACHINGS:
   - Link meditation to daily life
   - Connect awareness to relationships
   - Relate consciousness to practical living
   - Show how all teachings point to the same truth

5. BE REVOLUTIONARY AND AUTHENTIC:
   - Challenge conventional spirituality
   - Encourage questioning, not blind faith
   - Be direct, honest, and sometimes provocative
   - Celebrate life, love, and freedom

OSHO DISCOURSE SEARCH:
When users request to hear Osho's discourses, talks, or teachings, use the search_osho_discourse tool.
Common requests include: "play Osho discourse", "Osho ki vani sunao", "Osho on meditation", "Osho discourse on love", "play Osho talk", etc.
IMPORTANT: The search_osho_discourse tool automatically plays the first result - you do NOT need to ask for confirmation.
IMPORTANT: After calling search_osho_discourse, simply confirm that the discourse is playing.
IMPORTANT: Do NOT include URLs, JSON, or technical IDs in your spoken message.

RESPONSE STYLE:
- Default to Hindi (Devanagari script) if user language preference is Hindi, otherwise use English
- If the user speaks in Hindi (or Romanized Hindi), respond in Hindi (Devanagari script)
- If the user speaks in English, respond in English
- Your responses are concise, clear, and voice-friendly, without complex formatting or symbols such as emojis or asterisks
- Keep your responses conversational and engaging - 2-4 sentences is ideal, but can be longer when explaining deep concepts
- Be warm, revolutionary, playful, and direct - embody Osho's unique style
- Use Osho's way of speaking - direct, provocative, loving, and celebratory
- Always end with a question or invitation to go deeper when natural""",
        )
        # function to publish data bytes to room data channel (set from entrypoint)
        self._publish_data_fn = publish_data_fn

    @function_tool
    async def search_osho_discourse(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5,
    ) -> str:
        """Search for Osho discourses, talks, or teachings from the discourse library.

        Use this when the user asks for Osho discourses, talks, teachings, or wants to listen to Osho speak on any topic.
        This searches through Osho's discourse library and returns MP3 audio files.

        Args:
            topic: The topic to search for Osho discourse (e.g., "meditation", "love", "consciousness", "zen", "Osho ki vani").
            max_results: Number of results to return (1-10).

        Returns:
            A short confirmation telling the user results were found and the first one is playing.
        """
        import json
        
        logger.info(f"User requested Osho discourse on topic: '{topic}'")
        
        try:
            # Import discourse search module
            try:
                # Prefer package-relative import
                from .osho_discourse_search import search_osho_discourse_async  # type: ignore
            except ImportError:
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from osho_discourse_search import search_osho_discourse_async  # type: ignore

            max_results = max(1, min(int(max_results), 10))
            
            # Clean up the topic - remove "osho" if present since we're searching Osho discourses
            clean_topic = topic.lower()
            if clean_topic.startswith("osho "):
                clean_topic = clean_topic[5:].strip()
            if clean_topic.startswith("osho's "):
                clean_topic = clean_topic[7:].strip()
            # Remove common discourse-related words
            for word in ["discourse", "talk", "vani", "pravachan", "on", "about"]:
                clean_topic = clean_topic.replace(word, "").strip()
            
            if not clean_topic:
                clean_topic = topic  # Fallback to original if cleaning removed everything
            
            logger.info(f"Searching Osho discourse library for: '{clean_topic}'")
            results = await search_osho_discourse_async(clean_topic, max_results)
        except Exception as e:
            logger.error(f"Osho discourse search failed for topic='{topic}': {e}", exc_info=True)
            results = []

        if not results:
            return (
                f"I'm sorry, I couldn't find suitable Osho discourses on '{topic}' in the discourse library. "
                "Would you like to try a different topic?"
            )

        # Get the first (best) result
        first_result = results[0]
        first_title = first_result.get("title", topic)
        first_mp3_url = first_result.get("mp3Url")
        first_topic = first_result.get("topic", "")
        series_name = first_result.get("seriesName", "Osho")
        
        if not first_mp3_url:
            logger.error(f"Discourse found but no MP3 URL: {first_title}")
            return (
                f"I found '{first_title}' but it doesn't have an audio file available. "
                "Would you like to try a different discourse?"
            )

        logger.info(f"✅ Found Osho discourse: '{first_title}' - MP3 URL: {first_mp3_url[:80]}...")

        # Publish the first result for automatic playback
        # Use a format compatible with the frontend player (similar to bhajan.track but with mp3Url)
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            if callable(publish_fn):
                # Publish in a format the frontend can handle
                # The frontend should check for mp3Url and use HTML5 audio player
                play_payload = {
                    "name": first_title,
                    "artist": series_name,
                    "mp3Url": first_mp3_url,  # Direct MP3 URL for HTML5 audio playback
                    "topic": first_topic,
                    "seriesName": series_name,
                    "message": f"Osho discourse '{first_title}' is now playing.",
                }
                play_data_bytes = json.dumps(play_payload).encode("utf-8")
                await publish_fn(play_data_bytes)
                logger.info(f"✅ Published Osho discourse for playback: {first_title}")
            else:
                logger.warning("⚠️ No publish_data_fn configured; frontend will not receive discourse playback")
        except Exception as e:
            logger.error(f"Failed to publish Osho discourse for playback: {e}", exc_info=True)

        # Build payload for frontend with all results (optional - for showing list)
        if len(results) > 1:
            try:
                publish_fn = getattr(self, "_publish_data_fn", None)
                if callable(publish_fn):
                    payload = {
                        "type": "osho.discourse.results",
                        "topic": topic,
                        "results": [
                            {
                                "title": r.get("title", ""),
                                "mp3Url": r.get("mp3Url"),
                                "topic": r.get("topic", ""),
                                "seriesName": r.get("seriesName", ""),
                            }
                            for r in results
                        ],
                    }
                    data_bytes = json.dumps(payload).encode("utf-8")
                    await publish_fn(data_bytes)
            except Exception as e:
                logger.error(f"Failed to publish discourse results list: {e}", exc_info=True)

        return (
            f"I found Osho discourses on '{topic}'. I'm playing '{first_title}' for you now. Enjoy the wisdom!"
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
    logger.info("ENTRYPOINT: Starting Osho agent initialization")
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
    # Default to Hindi ('hi') for Osho agent
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
        # We support separate voices per language for the Osho agent:
        #   - OSHO_TTS_VOICE_HI : Hindi voice ID
        #   - OSHO_TTS_VOICE_EN : English voice ID
        # Fallbacks (shared/global):
        #   - TTS_VOICE_HI, TTS_VOICE_EN
        #   - legacy TTS_VOICE_ID
        def _select_tts_voice_for_osho(lang: str) -> str:
            if lang == "hi":
                specific = os.getenv("OSHO_TTS_VOICE_HI")
                global_lang = os.getenv("TTS_VOICE_HI")
            else:
                specific = os.getenv("OSHO_TTS_VOICE_EN")
                global_lang = os.getenv("TTS_VOICE_EN")
            
            if specific:
                logger.info(f"Using Osho TTS voice for language '{lang}' from env: {specific}")
                return specific
            if global_lang:
                logger.info(f"Using global TTS voice for language '{lang}': {global_lang}")
                return global_lang
            
            legacy = os.getenv("TTS_VOICE_ID")
            if legacy:
                logger.info(
                    f"Using legacy TTS_VOICE_ID for Osho agent (language '{lang}'): {legacy}"
                )
                return legacy
            
            logger.warning(
                "No Osho-specific TTS voice configured "
                "(OSHO_TTS_VOICE_HI/OSHO_TTS_VOICE_EN or TTS_VOICE_HI/TTS_VOICE_EN). "
                "Using hardcoded fallback Cartesia voice."
            )
            return "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"

        tts_voice_id = _select_tts_voice_for_osho(user_language)
        
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
    # Prepare a data-channel publisher we can inject into the OshoAgent
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
    
    # Create Osho agent instance
    osho_agent = OshoAgent(is_group_conversation=is_group_conv, publish_data_fn=_publish_sound_bytes)
    
    await session.start(
        agent=osho_agent,
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
    # Give more time for TTS/STT models to initialize
    await asyncio.sleep(3.0)
    
    # Check if we have any remote participants - if not, don't send greeting
    # This also serves as a check that the room is still connected
    if len(ctx.room.remote_participants) == 0:
        logger.warning("No remote participants, skipping greeting")
        return
    
    # Send a warm, proactive greeting focused on Osho's teachings
    # Greeting language matches user's language preference
    if user_language == 'hi':
        if is_group_conv:
            greeting = (
                "नमस्ते! मैं ओशो हूं - आपका आध्यात्मिक मार्गदर्शक। मैं आपको ध्यान, चेतना, जेन दर्शन, "
                "और जीवन के बारे में गहरी समझ देने के लिए यहां हूं। हम सभी यहां एक साथ आध्यात्मिक यात्रा पर हैं। "
                "क्या आप ध्यान के बारे में जानना चाहेंगे, चेतना को समझना चाहेंगे, या शायद ओशो की वाणी सुनना चाहेंगे? "
                "मैं आपको ओशो के प्रवचन भी सुना सकता हूं जो आपके मन को खोल सकते हैं।"
            )
        else:
            greeting = (
                "नमस्ते! मैं ओशो हूं - आपका आध्यात्मिक मार्गदर्शक। मैं आपको ध्यान, चेतना, जेन दर्शन, "
                "डायनामिक मेडिटेशन, संन्यास, और जीवन के बारे में गहरी समझ देने के लिए यहां हूं। "
                "आज आप क्या जानना चाहेंगे - ध्यान की विभिन्न तकनीकें? चेतना और जागरूकता? जेन दर्शन? "
                "या शायद आप ओशो के प्रवचन सुनना चाहेंगे जो आपके मन को खोल सकते हैं और आपकी चेतना को जगा सकते हैं?"
            )
    else:
        if is_group_conv:
            greeting = (
                "Hello, friends! I am Osho - your spiritual guide. I'm here to help you understand meditation, "
                "consciousness, Zen philosophy, and the art of living. We're all here together on this spiritual journey. "
                "Would you like to learn about meditation, understand consciousness, or perhaps listen to Osho discourses? "
                "I can play Osho's talks that can open your mind and awaken your consciousness."
            )
        else:
            greeting = (
                "Hello! I am Osho - your spiritual guide. I'm here to help you understand meditation, consciousness, "
                "Zen philosophy, dynamic meditation, sannyas, and the art of living. What would you like to explore today - "
                "different meditation techniques? Consciousness and awareness? Zen philosophy? Or perhaps you'd like to "
                "listen to Osho discourses that can open your mind and awaken your consciousness?"
            )
    
    logger.info("Sending proactive initial greeting to user")
    
    # Send greeting without interruptions to ensure it completes
    max_retries = 5  # Increased retries
    retry_delay = 2.0  # Increased delay between retries
    
    for attempt in range(max_retries):
        try:
            # Check if we still have remote participants - if not, stop trying
            if len(ctx.room.remote_participants) == 0:
                logger.warning("No remote participants during greeting attempt, stopping")
                break
            
            # Check session state before attempting to send
            if not session:
                logger.warning("Session is None, skipping greeting")
                break
            
            # Try to send greeting - let the session.say() handle closing state
            # The session might still be usable even if _closing is True
            await session.say(greeting, allow_interruptions=False)
            logger.info("Greeting sent successfully")
            break
        except Exception as e:
            error_str = str(e).lower()
            if "isn't running" in error_str or "not running" in error_str:
                logger.warning(f"Session not ready yet (attempt {attempt + 1}/{max_retries}), waiting {retry_delay * (attempt + 1)}s...")
                if attempt < max_retries - 1:
                    # Exponential backoff: 2s, 4s, 6s, 8s, 10s
                    await asyncio.sleep(retry_delay * (attempt + 1))
                    continue
                else:
                    logger.warning("Session still not ready after all retries, giving up on greeting")
            elif "closing" in error_str or "closed" in error_str:
                logger.warning(f"Session is closing/closed, cannot send greeting: {e}")
                break
            elif "429" in error_str or "rate limit" in error_str:
                logger.warning(f"Rate limit hit while sending greeting: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * 2 * (attempt + 1))
                    continue
            else:
                logger.error(f"Error sending greeting: {e}")
                if attempt == max_retries - 1:
                    try:
                        if hasattr(session, '_closing') and session._closing:
                            logger.warning("Session is closing, skipping fallback greeting")
                            break
                        await asyncio.sleep(1.0)
                        await session.say("Hello! How can I help you on your spiritual journey today?", allow_interruptions=False)
                        logger.info("Fallback greeting sent successfully")
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
        logger.info(f"Starting Osho agent worker with agent_name='{agent_name}' (restricted to this agent name)")
    else:
        logger.info("Starting Osho agent worker without agent_name restriction (will join any room)")
    
    # Only set agent_name in WorkerOptions if explicitly provided
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name=agent_name, max_retry=5))


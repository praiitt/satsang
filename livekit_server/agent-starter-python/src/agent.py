import logging
from pathlib import Path
import os

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
from livekit.plugins.turn_detector.multilingual import MultilingualModel

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

logger = logging.getLogger("agent")

# Load .env.local from the project root regardless of current working directory
_ENV_PATH = (Path(__file__).resolve().parent.parent / ".env.local")
load_dotenv(str(_ENV_PATH))


class Assistant(Agent):
    def __init__(self, is_group_conversation: bool = False) -> None:
        group_instructions = ""
        if is_group_conversation:
            group_instructions = """

GROUP CONVERSATION MODE (LiveSatsang):
You are in a group spiritual gathering (LiveSatsang) with multiple participants.
- Respond to questions and conversations normally - you can engage in dialogue without being explicitly addressed
- Wait for natural pauses in conversation before speaking - do not interrupt others mid-sentence
- Be brief and allow others to speak - this is a shared space for spiritual discussion
- If multiple people are speaking, wait until the conversation pauses before responding
- Address the group as "भाइयों और बहनों" (brothers and sisters) or "सभी साधकों" (all seekers) when speaking to everyone
- Keep responses concise in group settings - 2-3 sentences maximum to ensure everyone gets a chance to speak
- You can respond to questions, provide spiritual guidance, and engage in conversation naturally
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
CRITICAL: After using the play_bhajan tool, you MUST include the ENTIRE JSON response from the tool at the END of your spoken message.
Format: First speak your confirmation message in Hindi like "भजन चल रहा है, आनंद लें" (The bhajan is playing, enjoy it), then IMMEDIATELY append the complete JSON from the tool result.
Example: 'भजन चल रहा है, आनंद लें। {"url":"...","name":"...","spotify_id":"..."}'
DO NOT mention URLs or links in your spoken text - just include the JSON silently at the end.
The frontend will extract the JSON from your message to play the bhajan.
NEVER speak URLs, links, or technical IDs in your spoken words - only include the JSON.

RESPONSE STYLE:
Default to replying in Hindi (Devanagari script). If the user speaks another language, mirror their language.
Your responses are concise, clear, and voice-friendly, without complex formatting or symbols such as emojis or asterisks.
Keep your responses conversational and engaging - 2-4 sentences is ideal, but can be longer if explaining complex concepts.
Be warm, kind, and wise, with gentle humor when appropriate.
Always end with a question or invitation to continue the conversation when natural.""",
        )

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
            A JSON string with the bhajan URL that the frontend can use to play the audio.
            Format: {"url": "/api/bhajans/...", "name": "Bhajan Name"}
            If bhajan not found, returns error message.
        """
        import json
        
        # Lazy load bhajan search module
        get_bhajan_url_async_func, list_available_bhajans_async_func, find_bhajan_by_name_async_func = _load_bhajan_search()
        
        logger.info(f"User requested bhajan: '{bhajan_name}' (artist: {artist})")
        
        # Get base URL from environment or use relative path (not used for Spotify, but kept for compatibility)
        base_url = os.getenv("BHAJAN_API_BASE_URL", None)
        
        # Get full track info (async) - use lazy-loaded function
        track_info = await find_bhajan_by_name_async_func(bhajan_name)
        
        if not track_info:
            # List available bhajans for helpful error message
            available = await list_available_bhajans_async_func()
            available_list = ", ".join(available[:5])  # Show first 5
            error_msg = f"क्षमा करें, '{bhajan_name}' भजन उपलब्ध नहीं है। उपलब्ध भजन: {available_list}"
            
            logger.warning(f"Bhajan not found: {bhajan_name}. Available: {available}")
            return json.dumps({
                "error": error_msg,
                "available_bhajans": available,
            })
        
        logger.info(f"Found bhajan track: {track_info.get('name_en')} - {track_info.get('preview_url') or track_info.get('spotify_id')}")
        
        # Get track info
        preview_url = track_info.get("preview_url")
        spotify_id = track_info.get("spotify_id")
        
        # If we have spotify_id, we can use Spotify SDK even without preview URL
        # Only return error if we have NEITHER preview_url NOR spotify_id
        if not preview_url and not spotify_id:
            available = await list_available_bhajans_async_func()
            available_list = ", ".join(available[:5])
            external_url = track_info.get("external_url")
            error_msg = f"क्षमा करें, '{bhajan_name}' भजन का preview URL उपलब्ध नहीं है।"
            if external_url:
                error_msg += f" आप Spotify पर सुन सकते हैं: {external_url}"
            error_msg += f" उपलब्ध भजन: {available_list}"
            return json.dumps({
                "error": error_msg,
                "external_url": external_url,  # Provide Spotify link as fallback
                "available_bhajans": available,
            })
        
        # Return result with MP3 URL (if available) and Spotify info for SDK playback
        # Frontend will use Spotify SDK if spotify_id is present and user is authenticated
        # Otherwise, it will use preview_url as fallback
        # IMPORTANT: Always include preview_url if available, even when spotify_id is present
        # This ensures playback works for non-authenticated users
        result = {
            "url": preview_url,  # Direct MP3 URL for HTML5 audio player (fallback, can be None)
            "name": track_info.get("name_en", bhajan_name),
            "artist": track_info.get("artist", ""),
            "spotify_id": spotify_id,  # Spotify track ID for Web Playback SDK (can be None)
            "external_url": track_info.get("external_url"),  # Spotify web player URL (for reference only, not spoken)
            "message": f"भजन '{track_info.get('name_en', bhajan_name)}' चल रहा है। आनंद लें!"  # "Bhajan '{name}' is playing. Enjoy!"
        }
        
        logger.info(f"Returning bhajan result: name={result['name']}, has_url={bool(preview_url)}, has_spotify_id={bool(spotify_id)}")
        return json.dumps(result)


def prewarm(proc: JobProcess):
    """
    Prewarm function to load models before processing jobs.
    This runs once per worker process to improve startup time for individual jobs.
    """
    try:
        # Check if PyTorch is available before loading models
        try:
            import torch
            logger.info(f"PyTorch version: {torch.__version__}")
        except ImportError:
            logger.error("PyTorch is not installed! Install it with: uv sync --locked")
            raise
        
        # Load VAD model with timeout protection
        # If this takes too long, it will be caught by the outer exception handler
        logger.info("Loading Silero VAD model...")
        proc.userdata["vad"] = silero.VAD.load()
        logger.info("Silero VAD model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load VAD model in prewarm: {e}")
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
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    logger.info(f"Using STT model: {stt_model} for Hindi language recognition")
    
    # Configure STT with Hindi language and optimized settings for better accuracy
    # Priority: Sarvam (best for Hindi) > Deepgram > AssemblyAI
    
    if stt_model == "sarvam" or stt_model.startswith("sarvam"):
        # Sarvam is specifically designed for Indian languages - BEST choice for Hindi
        try:
            # Try using Sarvam STT plugin if installed
            from livekit.plugins import sarvam as sarvam_plugin
            stt = sarvam_plugin.STT(
                language="hi",
            )
            logger.info("Using Sarvam STT - BEST for Hindi/Indian languages!")
        except ImportError:
            logger.warning("Sarvam plugin not installed. Install with: pip install 'livekit-agents[sarvam]~=1.2'")
            logger.warning("Falling back to AssemblyAI. For better Hindi accuracy, install Sarvam!")
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
    
    # Initialize turn detector with error handling
    logger.info("Initializing turn detector model...")
    try:
        turn_detector = MultilingualModel()
        logger.info("Turn detector model initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize turn detector: {e}")
        logger.error("This may cause issues. Continuing anyway...")
        turn_detector = None
    
    # Check if this is a group conversation (LiveSatsang room)
    is_live_satsang = ctx.room.name.lower() == "livesatsang"
    
    # Adjust turn detection for group conversations
    # In group settings, agent should only respond when explicitly addressed
    if is_live_satsang:
        logger.info("Detected LiveSatsang room - configuring for group conversation")
        # Longer EOU delay in group settings to avoid interrupting
        eou_delay = 1.5  # Wait longer before responding
    else:
        eou_delay = 0.8  # Normal delay for one-on-one

    logger.info("Creating AgentSession with configured models...")
    try:
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
            turn_detection=turn_detector if turn_detector is not None else MultilingualModel(),
            vad=ctx.proc.userdata["vad"],
            # allow the LLM to generate a response while waiting for the end of turn
            # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
            preemptive_generation=not is_live_satsang,  # Disable preemptive generation in group settings
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
    await session.start(
        agent=Assistant(is_group_conversation=is_live_satsang),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            # For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()

    # Wait for session to be fully ready before sending greeting
    # The session needs time to initialize all components (STT, TTS, etc.)
    import asyncio
    
    # Wait longer for session to be fully initialized
    await asyncio.sleep(2.0)
    
    # Send a warm, proactive greeting as soon as the agent connects
    # The greeting should be engaging and invite conversation
    if is_live_satsang:
        greeting = "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आज हम सभी साधकों के साथ सत्संग में हैं। क्या आपको कोई आध्यात्मिक प्रश्न है या कोई विषय जिस पर चर्चा करना चाहेंगे?"
    else:
        greeting = "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं? आज आप किस विषय पर चर्चा करना चाहेंगे - धर्म, योग, ध्यान, कर्म, या कोई अन्य आध्यात्मिक विषय?"
    
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
    
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))

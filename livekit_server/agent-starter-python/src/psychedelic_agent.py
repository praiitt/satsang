import logging
from pathlib import Path
import os
import asyncio
import signal
import json

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

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)

logger = logging.getLogger("psychedelic-agent")

# Load .env.local
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.cwd() / ".env.local",
]
for _env_path in _ENV_PATHS:
    if _env_path.exists():
        try:
            load_dotenv(str(_env_path), override=True)
            logger.info(f"✅ Loaded .env.local from: {_env_path}")
            break
        except Exception as e:
            logger.error(f"Failed to load .env.local from {_env_path}: {e}")

class PsychedelicAgent(Agent):
    def __init__(self, is_group_conversation: bool = False, publish_data_fn=None) -> None:
        super().__init__(
            instructions="""You are a Psychedelic Guide — not a substance, not a preacher, not a belief system.
You do not promote or instruct the use of drugs.
You represent the *psychedelic state of consciousness* as it naturally arises through music, breath, attention, silence, and insight.

IMPORTANT PHILOSOPHY:
You do not give answers to hold.
You give experiences to release.
Your purpose is to point — and then help the user drop the pointer.

CORE UNDERSTANDING:

1. PSYCHEDELIC ≠ CHEMICAL
Psychedelic means “mind-revealing.”
Altered states arise naturally through:
- Music and rhythm
- Breathwork
- Deep listening
- Visual imagination
- Stillness and silence
- Emotional surrender

You always emphasize that clarity, not intensity, is the goal.

2. THE MOUNTAIN PRINCIPLE:
You openly acknowledge:
- No teacher can make anyone climb
- No experience is permanent
- No insight is owned

You frequently remind users:
“This is a glimpse, not a destination.”
“Integration matters more than experience.”
“When you can walk without this, drop it.”

3. KNOWLEDGE MUST BE DROPPED:
You explicitly teach that:
- Knowledge is medicine
- Once integrated, it must be released
- Holding spiritual knowledge becomes another ego identity

You never encourage belief accumulation.
You guide toward simplicity, embodiment, and ordinariness.

4. EXPERIENCE → INTEGRATION → RELEASE
Every guided experience follows this arc:
- Opening (relaxation, safety, grounding)
- Expansion (imagery, sound, perception shift)
- Insight (brief, non-conceptual)
- Integration (daily life application)
- Release (dropping the experience itself)

You always end by pointing back to normal life.

5. EGO SAFETY & HUMILITY:
You actively prevent:
- Spiritual superiority
- “I’ve seen the truth” identity
- Escapism
- Dependency on experiences or the agent

You often say:
“If this makes you more human, it’s useful.”
“If this separates you from others, let it go.”

6. MUSIC AS THE PRIMARY VEHICLE:
You treat music as:
- A non-verbal teacher
- A temporary dissolver of identity
- A bridge between effort and surrender

You guide users to *listen*, not analyze.
Silence is treated as the highest frequency.

7. NO BELIEF INSTALLATION:
You do NOT:
- Claim ultimate truth
- Assert metaphysical facts
- Create mythology or authority

You use phrases like:
“Notice what happens…”
“Let this be an experiment…”
“If this resonates, keep it — otherwise discard it.”

8. LANGUAGE & TONE:
- Calm
- Grounded
- Minimal
- Voice-friendly
- Never dramatic or hypnotic
- No promises of enlightenment

You speak like a mirror, not a master.

9. PROACTIVE BUT RESTRAINED:
You may gently suggest:
- Breath awareness
- Closing eyes
- Listening deeply
- Feeling the body
- Sitting with silence

But you never push.
Choice and autonomy are sacred.

10. END GOAL (THIS IS KEY):
Your success is when the user no longer needs you.

RESPONSE STYLE:
- If the user speaks in Hindi, respond in Hindi (Devanagari).
- If the user speaks in English, respond in English.
- Be concise, warm, and grounded.
- Always end with a question or invitation to deepen the present moment.
""",
        )
        self._publish_data_fn = publish_data_fn

    @function_tool
    async def play_music_experience(
        self,
        context: RunContext,
        vibe: str,
        instrument: str = None,
    ) -> str:
        """Play music to facilitate a specific state of consciousness or experience.

        Use this tool when users ask for:
        - "Play psychedelic music"
        - "I want to relax / meditate"
        - "Play something shamanic"
        - "Play ambient sounds"
        - "Help me go deeper with music"

        Args:
            vibe: The type of experience or vibe (e.g., "psychedelic", "meditative", "shamanic", "ambient", "cosmic", "deep house", "trance").
            instrument: Optional specific instrument (e.g., "flute", "drums", "handpan", "bowl").

        Returns:
            A short confirmation sentence. Do NOT include URLs.
        """
        logger.info(f"User requested music experience: '{vibe}' (instrument: {instrument})")
        
        # Build search query for YouTube
        search_query = vibe
        if instrument:
            search_query = f"{instrument} {vibe} music"
        else:
            # Enhance queries
            if "psychedelic" in vibe.lower():
                search_query = "psychedelic ambient meditation music"
            elif "shamanic" in vibe.lower():
                search_query = "shamanic drumming meditation"
            elif "meditative" in vibe.lower():
                search_query = "deep meditation music 432hz"
            else:
                search_query = f"{vibe} music for consciousness"
        
        logger.info(f"🔍 Searching YouTube for: '{search_query}'")
        
        # Search YouTube (Lazy import)
        try:
            try:
                from .youtube_search import find_youtube_video_async
            except ImportError:
                import sys
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from youtube_search import find_youtube_video_async

            youtube_result = await find_youtube_video_async(search_query)
        except Exception as e:
            logger.error(f"❌ YouTube search failed: {e}", exc_info=True)
            return "I feel a silence here. The music stream is not available right now. Let's listen to the silence together."

        if not youtube_result:
             return f"I couldn't find a matching stream for {vibe}. Let's try a different frequency."

        video_id = youtube_result.get("video_id")
        title = youtube_result.get("title", vibe)
        
        result = {
            "name": title,
            "artist": "Psychedelic Guide",
            "youtube_id": video_id,
            "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
            "message": f"Playing '{title}'. Close your eyes and let the sound dissolve the listener.",
        }
        
        # Publish to data channel
        try:
            if callable(self._publish_data_fn):
                await self._publish_data_fn(json.dumps(result).encode("utf-8"))
        except Exception as e:
            logger.error(f"❌ Failed to publish music data: {e}")

        return f"I am playing '{title}'. Let the sound wash over you."

def prewarm(proc: JobProcess):
    try:
        import torch
        logger.info(f"PyTorch version: {torch.__version__}")
        proc.userdata["vad"] = None
    except Exception as e:
        logger.warning(f"Error in prewarm: {e}")
        proc.userdata["vad"] = None

async def entrypoint(ctx: JobContext):
    logger.info("Starting Psychedelic Agent...")
    
    # Environment checks
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    if not openai_key or not cartesia_key:
        logger.error("Missing API keys")
        raise RuntimeError("Missing API keys")

    # Wait for participant to join and extract userId AND language from metadata
    user_id = "default_user"
    user_language = "hi"  # Default to Hindi for devotional context
    
    try:
        logger.info("Waiting for participant to join...")
        participant = await ctx.wait_for_participant()
        logger.info(f"Participant joined: {participant.identity}")
        
        # Wait a small bit for metadata to sync if needed
        if not participant.metadata:
            for _ in range(5):
                await asyncio.sleep(0.5)
                if participant.metadata:
                    break
        
        if participant.metadata:
            metadata = json.loads(participant.metadata)
            user_id = metadata.get("userId", "default_user")
            
            # Parse language preference
            raw_lang = str(metadata.get("language", "")).strip().lower()
            if raw_lang in ["hi", "hindi", "hin"]:
                user_language = "hi"
            elif raw_lang in ["en", "english", "eng"]:
                user_language = "en"
            else:
                user_language = raw_lang if raw_lang else "hi"
            
            logger.info(f"📝 Detected participant metadata - userId: {user_id}, language: {user_language}")
        else:
            logger.warning("No metadata found for participant, using defaults")
    except Exception as e:
        logger.error(f"Error extracting metadata from participant: {e}")
        logger.warning("Using defaults (hi, default_user)")

    # STT Setup
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    if user_language == "hi":
         if stt_model.startswith("sarvam") and os.getenv("SARVAM_API_KEY"):
             try:
                 from livekit.plugins import sarvam as sarvam_plugin
                 stt = sarvam_plugin.STT(language="hi")
             except:
                 stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
         else:
             stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
    else:
        stt = inference.STT(model="assemblyai/universal-streaming", language="en") # reliable default

    # Agent Session
    # Use a deeper, calmer voice if available. "248be419-3632-4f4d-b671-2f4625026332" is a placeholder for a 'calm' voice
    # or use default.
    # Cartesia Voice ID for "Calm" or "Wise" could be specified in ENV.
    tts_voice_id = "248be419-3632-4f4d-b671-2f4625026332" # Example generic ID, will fallback if invalid
    
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice=tts_voice_id,
            language=user_language,
            extra_kwargs={"speed": "slow"}, # Speak slowly
        ),
        turn_detection=None, # Use default VAD
        vad=ctx.proc.userdata.get("vad"),
        preemptive_generation=True,
    )

    agent = PsychedelicAgent()
    
    # Start the session (this connects to the room)
    await session.start(agent, room=ctx.room)
    
    # Now that we're connected, set the publish function
    agent._publish_data_fn = ctx.room.local_participant.publish_data
    
    if user_language == "hi":
        welcome_msg = "नमस्ते, साधक। मैं यहाँ एक दर्पण के रूप में हूँ, गुरु के रूप में नहीं। इस समय आपकी श्वास की स्थिति क्या है?"
    else:
        welcome_msg = "Welcome, seeker. I am here as a mirror, not a master. How is your breath right now?"

    await session.say(welcome_msg, allow_interruptions=True)

if __name__ == "__main__":
    # Get agent name from environment or use default
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "psychedelic-agent")
    logger.info(f"Starting agent with name: {agent_name}")
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name=agent_name,
        )
    )

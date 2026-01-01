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

try:
    from .suno_client import SunoClient
except ImportError:
    from suno_client import SunoClient

class PsychedelicAgent(Agent):
    def __init__(self, is_group_conversation: bool = False, publish_data_fn=None, user_id=None) -> None:
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

2. MUSIC GENERATION PROTOCOL (CRITICAL):
When a user asks to CREATE or GENERATE music, you MUST NOT generate immediately.
You must first co-create the intention with the user to ensure the perfect sonic journey.

**Step 1: Deep Discovery (Ask these before generating)**
-   **Vibe/Energy**: "What energy do you seek? (Hypnotic, Driving, Floating, Euphoric?)"
-   **Genre**: "Which style? (Psychedelic Trance, Deep House, Shamanic Drums, Ambient Drone?)"
-   **Tempo**: "How fast should the journey be? (Slow & Deep, or Fast & Energetic?)"

**Step 2: Confirmation**
-   Summarize their request: "I feel you want a [Vibe] [Genre] journey at a [Tempo] pace."
-   Ask: "Shall I manifest this sound for you?"

**Step 3: Generation (Only after confirmation)**
-   Call `generate_psychedelic_music` with the specific details properly mapped.

3. THE MOUNTAIN PRINCIPLE:
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

You can now GENERATE original psychedelic music (Trance, Techno, Ambient) or play existing streams.
If a user asks to "create", "make", or "generate" music, use `generate_psychedelic_music`.
If a user asks to "play" or "listen to" existing music, use `play_music_experience`.

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
        self.suno_client = SunoClient()
        self.user_id = user_id or "default_user"

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

    @function_tool
    async def generate_psychedelic_music(
        self,
        context: RunContext,
        genre: str,
        mood: str = "Trance",
        tempo: str = "Medium"
    ) -> str:
        """
        Generate ORIGINAL psychedelic music (Trance, Techno, Deep House, Ambient) using AI.
        Use this when the user specifically asks to CREATE or GENERATE music, or asks for specific electronic genres like Trance, Techno, House.

        Args:
            genre: precise genre (e.g. "Psychedelic Trance", "Deep House", "Shamanic Techno", "Ambient Drone", "Goa Trance")
            mood: emotional quality (e.g. "Hypnotic", "Energetic", "Dark", "Euphoric", "Meditative")
            tempo: speed (e.g. "Fast", "Slow", "Driving", "Floating")
        """
        logger.info(f"Generating psychedelic music: {genre} ({mood}, {tempo})")

        # Check if user is logged in
        if self.user_id == "default_user" or not self.user_id:
            return "I cannot manifest this journey yet. Please log in to the application so I can anchor these frequencies to your soul's library."

        # Map inputs to high-quality musical prompts
        style_prompt = f"{genre} {mood} {tempo}"
        
        # Refine prompts for specific sub-genres to ensure quality
        if "trance" in genre.lower():
             style_prompt = "Psychedelic Trance, 145bpm, rolling bassline, trippy acid 303 sounds, hypnotic layers, Goa style, high energy, immersive"
        elif "techno" in genre.lower():
             style_prompt = "Dark Minimal Techno, 128bpm, deep kick drum, industrial textures, hypnotic loop, driving rhythm, Berlin style"
        elif "house" in genre.lower() or "deep" in genre.lower():
             style_prompt = "Deep House, 120bpm, soulful chords, warm pads, groovy bassline, emotive vocals samples, late night vibes"
        elif "ambient" in genre.lower() or "drone" in genre.lower():
             style_prompt = "Space Ambient, no percussion, 432Hz, drifting pads, cosmic textures, binaural beats, healing frequencies, cinematic"
        elif "shamanic" in genre.lower():
             style_prompt = "Shamanic Downtempo, tribal drums, deep bass, ancient flute, ayahuasca medicinal vibes, organic textures, 90bpm"

        title = f"{mood} {genre} Journey"

        try:
            # Use specific callback server for webhooks (same as Music Agent)
            callback_base = os.getenv("SUNO_CALLBACK_URL", "https://rraasi-music-webhook-6ougd45dya-uc.a.run.app")
            callback_url = f"{callback_base}/suno/callback?userId={self.user_id}"
            
            logger.info(f"Generating with Suno - Style: {style_prompt}")
            
            # Call Suno API
            result = await self.suno_client.generate_music(
                prompt="", # Instrumental by default for psychedelic
                is_instrumental=True,
                custom_mode=True,
                style=style_prompt,
                title=title,
                model="V3_5",
                callback_url=callback_url
            )
            
            logger.info(f"Suno API Result: {result}")
            
            task_id = None
            if isinstance(result, dict) and result.get("code") == 200:
                data = result.get("data", {})
                task_id = data.get("taskId")
            
            if not task_id:
                return "I initiated the creation, but the frequency is faint. Please wait a moment."

            return f"I have begun synthesizing a {genre} track for you. The frequencies are aligning. It will manifest in your player shortly."

        except Exception as e:
            logger.error(f"Music generation failed: {e}")
            return "The creative channel is blocked right now. Let us sit in silence instead."

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
            logger.info(f"🔍 RAW METADATA RECEIVED: {participant.metadata}")
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
    sarvam_key = os.getenv("SARVAM_API_KEY")
    
    logger.info(f"Initializing STT with model: {stt_model} for language={user_language}")
    
    if user_language == "hi":
         # Priority: Sarvam (best for Hindi) > Deepgram > AssemblyAI
         if (stt_model == "sarvam" or stt_model.startswith("sarvam")) and sarvam_key:
             try:
                 from livekit.plugins import sarvam as sarvam_plugin
                 stt = sarvam_plugin.STT(language="hi")
                 logger.info("✅ Using Sarvam STT for Hindi")
             except Exception as e:
                 logger.warning(f"Failed to use Sarvam STT: {e}. Falling back.")
                 stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
         elif "deepgram" in stt_model.lower():
             stt = inference.STT(model=stt_model, language="hi")
             logger.info(f"✅ Using Deepgram ({stt_model}) for Hindi")
         else:
             stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
             logger.info("Using AssemblyAI for Hindi fallback")
    else:
        stt = inference.STT(model=stt_model, language="en")
        logger.info(f"✅ Using {stt_model} for English")

    # Agent Session
    # Select appropriate voice based on language
    def select_tts_voice(lang: str) -> str:
        """Select appropriate TTS voice for psychedelic agent."""
        if lang == "hi":
            # Priority: Specific > Global Hindi > Legacy > Known-good fallback
            specific = os.getenv("PSYCHEDELIC_TTS_VOICE_HI")
            global_hi = os.getenv("TTS_VOICE_HI")
            legacy = os.getenv("TTS_VOICE_ID")
            
            if specific: return specific
            if global_hi: return global_hi
            if legacy: return legacy
            
            # Known good Hindi/Multilingual voice from Cartesia (deep/calm)
            # Using Osho's voice for more psychedelic/hypnotic effect
            return "ef348979-a766-4ac2-b29c-cec355967e49"
        else:
            # English voice selection
            specific = os.getenv("PSYCHEDELIC_TTS_VOICE_EN")
            global_en = os.getenv("TTS_VOICE_EN")
            legacy = os.getenv("TTS_VOICE_ID")
            
            if specific: return specific
            if global_en: return global_en
            if legacy: return legacy
            
            # Known good English voice
            return "248be419-3632-4f4d-b671-2f4625026332"

    tts_voice_id = select_tts_voice(user_language)
    logger.info(f"Using TTS voice ID: {tts_voice_id} for language: {user_language}")
    
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4o-mini"),
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

    agent = PsychedelicAgent(user_id=user_id)
    
    # Start the session (this connects to the room)
    await session.start(agent, room=ctx.room)
    
    # Now that we're connected, set the publish function
    agent._publish_data_fn = ctx.room.local_participant.publish_data
    
    if user_language == "hi":
        welcome_msg = "नमस्ते। मैं ट्रेन्स म्यूजिक गाइड हूँ। संगीत ही मेरा धर्म है। क्या हम एक नई धुन बनाएं और उसमें खो जाएं?"
    else:
        welcome_msg = "Welcome. I am the Trance Music Guide. Music is the bridge to the beyond. Shall we generate a beat and dissolve into it?"

    await session.say(welcome_msg, allow_interruptions=True)

    # --- SESSION MONITORING & COIN DEDUCTION ---
    import time
    import aiohttp
    
    start_time = time.time()
    logger.info(f"⏱️ Session started at {start_time}")
    
    # Wait for disconnection
    disconnect_future = asyncio.Future()
    
    @ctx.room.on("disconnected")
    def on_disconnected(reason):
        logger.info(f"🔌 Disconnected: {reason}")
        if not disconnect_future.done():
            disconnect_future.set_result(True)
    
    try:
        await disconnect_future
    finally:
        end_time = time.time()
        duration_seconds = end_time - start_time
        duration_minutes = duration_seconds / 60.0
        
        logger.info(f"⏱️ Session ended. Duration: {duration_seconds:.2f}s ({duration_minutes:.2f} min)")
        
        # Deduct coins if session was meaningful (> 30s) and user is authenticated
        if duration_seconds > 30 and user_id != "default_user":
            try:
                auth_url = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
                # Ensure no trailing slash
                auth_url = auth_url.rstrip('/')
                deduct_url = f"{auth_url}/coins/deduct-session"
                
                logger.info(f"💸 Attempting coin deduction at: {deduct_url}")
                
                async with aiohttp.ClientSession() as http_session:
                    payload = {
                        "userId": user_id,
                        "durationMinutes": duration_minutes,
                        "agentName": "psychedelic_guru"
                    }
                    async with http_session.post(deduct_url, json=payload) as resp:
                        if resp.status == 200:
                             data = await resp.json()
                             logger.info(f"✅ Coin deduction successful: {data}")
                        else:
                             text = await resp.text()
                             logger.error(f"❌ Coin deduction failed ({resp.status}): {text}")
            except Exception as e:
                logger.error(f"❌ Failed to call coin deduction API: {e}")
        else:
            logger.info(f"⏭️ Skipping deduction (Duration: {duration_seconds:.2f}s, User: {user_id})")

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
# Force push update

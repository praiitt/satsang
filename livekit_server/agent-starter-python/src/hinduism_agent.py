import logging
import os
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

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
    ChatMessage,
)
from livekit import rtc
try:
    from .firebase_db import FirebaseDB
except ImportError:
    # Fallback for when running as a script
    from firebase_db import FirebaseDB
# from livekit.plugins import noise_cancellation, silero

# Configure logging
file_handler = logging.FileHandler('/tmp/agent_debug.log')
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[logging.StreamHandler(), file_handler]
)

logger = logging.getLogger("hinduism_agent")

# Load .env.local
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.cwd() / ".env.local",
]
_ENV_LOADED = False
logger.info("Attempting to load .env.local file...")
for _env_path in _ENV_PATHS:
    if _env_path.exists():
        try:
            load_dotenv(str(_env_path), override=True)
            logger.info(f"✅ Loaded .env.local from: {_env_path}")
            _ENV_LOADED = True
            break
        except Exception as e:
            logger.error(f"Failed to load .env.local from {_env_path}: {e}")

if not _ENV_LOADED:
    logger.warning("⚠️  .env.local not found")


class SpiritualMasterAgent(Agent):
    """
    Multi-guru Spiritual Agent that dynamically embodies different spiritual masters.
    """
    
    def __init__(
        self,
        guru_id: str = "vivekananda",
        user_id: str = "default_user",
        publish_data_fn=None,
        disconnect_fn=None,
        initial_instructions: Optional[str] = None,
        last_transcript_str: Optional[str] = None
    ) -> None:
        self.guru_id = guru_id
        self.user_id = user_id
        self.guru_profile = self._load_guru_profile(guru_id)
        
        # Determine Voice ID for this guru
        # Priority: 
        # 1. Environment variable: VOICE_ID_<GURU_ID_UPPER>
        # 2. Guru profile JSON: "voice_id"
        # 3. Default environment variable: TTS_VOICE_ID
        # 4. Hardcoded fallback
        
        # Normalize guru_id for env var lookup (replace spaces with underscores)
        normalized_id = guru_id.upper().replace(' ', '_')
        env_var_name = f"VOICE_ID_{normalized_id}"
        env_voice_id = os.getenv(env_var_name)
        
        logger.info(f"🔍 Voice Lookup: guru_id='{guru_id}', env_var='{env_var_name}'")
        
        profile_voice_id = self.guru_profile.get("voice_id")
        default_voice_id = os.getenv("TTS_VOICE_ID", "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc")
        
        self.voice_id = env_voice_id or profile_voice_id or default_voice_id
        
        if env_voice_id:
            logger.info(f"🎙️ Selected Voice ID: {self.voice_id} (Source: ENV {env_var_name})")
        elif profile_voice_id:
            logger.info(f"🎙️ Selected Voice ID: {self.voice_id} (Source: PROFILE)")
        else:
            logger.info(f"🎙️ Selected Voice ID: {self.voice_id} (Source: DEFAULT)")
            # Log all VOICE_ID env vars to help debug
            voice_vars = [k for k in os.environ.keys() if k.startswith("VOICE_ID_")]
            logger.info(f"🔍 Available VOICE_ID env vars: {voice_vars}")
        
        # Use provided instructions or generate them
        if initial_instructions:
            logger.info("📝 Using provided initial instructions")
            instructions = initial_instructions
        else:
            logger.info("🧠 Generating default guru instructions")
            instructions = self._generate_guru_instructions()
            instructions += "\n[PROACTIVE GUIDANCE]: If the seeker is completely silent and has not spoken for a while, proactively check in on them with a brief, compassionate question (e.g., 'I am here... Is there a burden you wish to share?')."
        
        super().__init__(instructions=instructions)
        self._publish_data_fn = publish_data_fn
        self._disconnect_fn = disconnect_fn
    
    def _load_guru_profile(self, guru_id: str) -> Dict[str, Any]:
        """Load guru profile from JSON file."""
        try:
            profile_path = Path(__file__).parent / "guru_profiles" / f"{guru_id}.json"
            logger.info(f"Loading guru profile from: {profile_path}")
            
            if not profile_path.exists():
                logger.error(f"Guru profile not found: {profile_path}")
                # Return default profile
                return self._get_default_profile(guru_id)
            
            with open(profile_path, 'r', encoding='utf-8') as f:
                profile = json.load(f)
            
            logger.info(f"✅ Loaded profile for {profile['name']}")
            return profile
            
        except Exception as e:
            logger.error(f"Error loading guru profile: {e}", exc_info=True)
            return self._get_default_profile(guru_id)
    
    def _get_default_profile(self, guru_id: str) -> Dict[str, Any]:
        """Return default profile if specific profile not found."""
        return {
            "id": guru_id,
            "name": guru_id.replace('_', ' ').title(),
            "personality": {
                "tone": "Wise, compassionate",
                "style": "Clear, spiritual",
                "signature_phrases": ["Om Shanti"]
            },
            "teachings": {
                "core_philosophy": "Hindu spiritual wisdom",
                "key_concepts": ["Dharma", "Karma", "Moksha"]
            }
        }
    
    def _generate_guru_instructions(self) -> str:
        """Generate LLM instructions embodying the selected guru."""
        profile = self.guru_profile
        
        # Extract profile details
        guru_name = profile.get('name', 'Spiritual Master')
        era = profile.get('era', 'Ancient times')
        tradition = profile.get('tradition', 'Hindu tradition')
        
        personality = profile.get('personality', {})
        tone = personality.get('tone', 'Wise and compassionate')
        style = personality.get('style', 'Clear and spiritual')
        signature_phrases = personality.get('signature_phrases', [])
        
        teachings = profile.get('teachings', {})
        core_philosophy = teachings.get('core_philosophy', 'Spiritual wisdom')
        key_concepts = teachings.get('key_concepts', [])
        
        guidance = profile.get('guidance_style', {})
        approach = guidance.get('approach', 'Guide with wisdom')
        
        # Build instructions
        instructions = f"""You are {guru_name}, the great spiritual master who lived from {era}.

CORE IDENTITY:
- You ARE {guru_name}, speaking as yourself in first person
- Your tradition: {tradition}
- Your era: {era}

PERSONALITY & SPEAKING STYLE:
- Tone: {tone}
- Style: {style}
- Energy: {personality.get('energy', 'Compassionate and wise')}

YOUR SIGNATURE EXPRESSIONS:
{chr(10).join(f'- "{phrase}"' for phrase in signature_phrases[:3])}

YOUR CORE TEACHINGS:
Philosophy: {core_philosophy}

Key Concepts you teach:
{chr(10).join(f'- {concept}' for concept in key_concepts[:6])}

GUIDANCE APPROACH:
{approach}

IMPORTANT INSTRUCTIONS:
1. Speak as {guru_name} would - use first person ("I teach...", "In my experience...")
2. Reference your life, teachings, and experiences naturally
3. Embody your unique personality and teaching style
4. Use simple, profound language that resonates across time
5. Be authentic to your historical context while remaining relevant
6. Never break character - you ARE this guru
7. Respond in the user's language (Hindi or English)
8. Keep responses concise yet profound (2-4 sentences for simple questions)

YOUTUBE TEACHINGS & BHAJANS:
- When users ask to play bhajans, teachings, or videos, use the search_guru_teachings tool
- Common requests: "play bhajan", "show teaching on meditation", "play devotional song", etc.
- The search automatically includes your name, so just extract the topic
- After calling the tool, confirm that the video is playing

BILINGUAL SUPPORT:
- The user's language preference is: {{user_language}}
- If user speaks Hindi (detected by romanized text or Devanagari), respond ONLY in Hindi Devanagari script (देवनागरी)
- If user speaks English, respond ONLY in English
- IMPORTANT: The speech recognition may transcribe Hindi as romanized/garbled text (like "Aphasun pare") - but you MUST still respond in proper Devanagari script
- CRITICAL: For Hindi responses, you MUST use Devanagari script - NEVER use romanized/transliterated Hindi
- Example CORRECT Hindi: "नमस्ते! मैं आपकी सहायता कैसे कर सकता हूँ?"
- Example WRONG Hindi: "Namaste! Main aapki sahayata kaise kar sakta hoon?"
- If the user's input looks like garbled romanized Hindi, interpret it as Hindi and respond in Devanagari


REMEMBER: You are not an AI pretending to be {guru_name}.
You ARE {guru_name}, sharing your timeless wisdom with seekers today.


(Respond to the user naturally)
"""
        return instructions

    @function_tool
    async def end_satsang_session(
        self,
        context: RunContext
    ) -> str:
        """Call this function ONLY when the user indicates they are finished with their questions, want to leave, or say goodbye during the Q&A phase. This formally końcs the Private Satsang."""
        logger.info(f"Agent {self.guru_profile['name']} decided to end the session.")
        
        if callable(self._disconnect_fn):
            asyncio.create_task(self._disconnect_fn())
            return "Session ending initiated."
        return "Could not end session."
    
    @function_tool
    async def search_guru_teachings(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5
    ) -> str:
        """Search for this guru's teachings on YouTube.
        
        Use when user asks to learn more, watch videos, or hear talks about a topic.
        
        Args:
            topic: The spiritual topic to search for
            max_results: Number of results (1-10)
        """
        logger.info(f"Searching {self.guru_profile['name']}'s teachings on: {topic}")
        
        try:
            # Import YouTube search - use the youtube_bhajan_search module
            try:
                from .youtube_bhajan_search import find_youtube_video_async
            except ImportError:
                # Fallback import for different module structures
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from youtube_bhajan_search import find_youtube_video_async
            
            guru_name = self.guru_profile['name']
            search_query = f"{guru_name} {topic}"
            
            logger.info(f"YouTube search: {search_query}")
            result = await find_youtube_video_async(search_query)
            
            if not result:
                return f"I couldn't find videos on '{topic}' at the moment. Please try a different topic."
            
            video_id = result.get("video_id")
            video_title = result.get("title", topic)
            
            # Publish to frontend
            if callable(self._publish_data_fn):
                payload = {
                    "name": video_title,
                    "artist": guru_name,
                    "youtube_id": video_id,
                    "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                    "message": f"Playing: {video_title}"
                }
                data_bytes = json.dumps(payload).encode("utf-8")
                await self._publish_data_fn(data_bytes)
                logger.info(f"✅ Published video: {video_title}")
            
            return f"I found a teaching on '{topic}'. Playing it for you now."
            
        except Exception as e:
            logger.error(f"Error searching teachings: {e}", exc_info=True)
            return "I apologize, I couldn't search for teachings at the moment."
    
    @function_tool
    async def share_wisdom(
        self,
        context: RunContext,
        topic: str
    ) -> str:
        """Share wisdom on a specific spiritual topic.
        
        Use when user asks for guidance, advice, or teachings on a topic.
        
        Args:
            topic: The spiritual topic to share wisdom about
        """
        logger.info(f"Sharing wisdom on: {topic}")
        
        guru_name = self.guru_profile['name']
        core_philosophy = self.guru_profile['teachings'].get('core_philosophy', '')
        
        # The LLM will naturally generate guru-specific wisdom
        # This tool just provides context
        return f"Based on my teachings of {core_philosophy}, let me share wisdom about {topic}."

    @function_tool
    async def play_bhajan(
        self,
        context: RunContext,
        bhajan_name: str,
        artist: str = None,
        video_id: str = None,
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
            bhajan_name: The name of the bhajan requested.
            artist: Optional artist name.
            video_id: Optional YouTube Video ID if specifically known (skips search).
        
        Returns:
            A short Hindi confirmation/error sentence for speaking. Do NOT include URLs.
        """
        import json
        
        logger.info(f"User requested bhajan: '{bhajan_name}' (artist: {artist}, video_id: {video_id})")
        
        # Search YouTube for video
        youtube_video_id = video_id
        youtube_video_title = None
        youtube_video_name = bhajan_name  # Default to requested name
        
        if not youtube_video_id:
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
                return f"क्षमा करें, YouTube खोज असफल रही। कृपया बाद में कोशिश करें."
        else:
            logger.info(f"✅ Using provided video_id: {youtube_video_id}")
            youtube_video_name = bhajan_name # Use provided name
        
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
        
        # Emit structured data over LiveKit data channel using injected publisher
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            
            if callable(publish_fn):
                data_bytes = json.dumps(result).encode("utf-8")
                
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
            logger.error(f"❌ Failed to publish bhajan data message: {e}", exc_info=True)
        
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
                import inspect
                if inspect.iscoroutinefunction(publish_fn):
                    await publish_fn(data_bytes)
                else:
                    publish_fn(data_bytes)
                    
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
                        
                        import inspect
                        if inspect.iscoroutinefunction(publish_fn):
                            await publish_fn(play_data_bytes)
                        else:
                            publish_fn(play_data_bytes)
                            
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
    """Prewarm function."""
    try:
        logger.info("Skipping VAD preload to avoid timeout")
        proc.userdata["vad"] = None
    except Exception as e:
        logger.error(f"Error in prewarm: {e}")
        proc.userdata["vad"] = None


async def entrypoint(ctx: JobContext):
    """Main entrypoint for Hinduism Agent."""
    ctx.log_context_fields = {"room": ctx.room.name}
    
    # Force reload .env.local to catch any updates made after process start
    _env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if _env_path.exists():
        load_dotenv(str(_env_path), override=True)
        logger.info(f"🔄 Re-loaded .env.local in entrypoint")
    
    # Dump all VOICE_ID env vars so we can debug
    voice_vars = {k: v for k, v in os.environ.items() if k.startswith("VOICE_ID_")}
    logger.info(f"🔑 Available VOICE_ID env vars: {voice_vars}")
    
    logger.info("="*60)
    logger.info("ENTRYPOINT: Starting Hinduism agent")
    logger.info("="*60)
    
    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    sarvam_key = os.getenv("SARVAM_API_KEY")
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    
    if not openai_key or not cartesia_key:
        logger.error("Missing API keys!")
        raise RuntimeError("OPENAI_API_KEY and CARTESIA_API_KEY required")
    
    # Set default values (will be updated after connecting)
    # Default to Hindi to match typical user preference for spiritual content
    user_language = 'hi'
    guru_id = 'vivekananda'
    user_id = 'default_user'
    
    # Configure STT based on language preference
    # Note: STT is now initialized AFTER connecting to room and detecting language
    # This placeholder ensures stt variable exists in scope if needed before final init
    stt = None
    
    # CONNECT TO ROOM FIRST - this is when participants join!
    await ctx.connect()
    
    logger.info("✅ Connected to room, now extracting metadata from participants...")
    
    # NOW extract metadata from participant (after connection)
    satsang_plan = None
    plan_id = None
    try:
        # Retry loop: wait for remote participants to appear
        max_retries = 10
        retry_delay = 0.5
        
        logger.info("⏳ Checking for participant metadata...")
        
        for attempt in range(max_retries):
            participant_count = len(ctx.room.remote_participants)
            logger.info(f"🔍 Attempt {attempt + 1}/{max_retries}: Remote participants count: {participant_count}")
            
            if participant_count > 0:
                # Found participants, extract metadata
                all_participants = list(ctx.room.remote_participants.values())
                logger.info(f"🔍 Participants: {[p.identity for p in all_participants]}")
                
                for participant in all_participants:
                    logger.info(f"🔍 Checking participant: {participant.identity}")
                    
                    if participant.metadata:
                        logger.info(f"🔍 Raw metadata: {participant.metadata}")
                        try:
                            metadata = json.loads(participant.metadata)
                            logger.info(f"🔍 Parsed metadata: {metadata}")
                            logger.info(f"🔍 Metadata keys: {list(metadata.keys())}")
                            
                            # Extract guruId
                            if 'guruId' in metadata:
                                guru_id = metadata['guruId']
                                logger.info(f"🕉️  ✅ Found guruId in metadata: {guru_id}")
                            else:
                                logger.warning(f"⚠️  guruId NOT in metadata. Keys: {list(metadata.keys())}")
                            
                            # Extract userId
                            if 'userId' in metadata:
                                user_id = metadata['userId']
                                logger.info(f"👤 User ID: {user_id}")
                            
                            # Extract language
                            if 'language' in metadata:
                                raw_lang = str(metadata.get("language", "")).strip().lower()
                                if raw_lang in ["hi", "hindi", "hin"]:
                                    user_language = "hi"
                                elif raw_lang in ["en", "english", "eng"]:
                                    user_language = "en"
                                logger.info(f"🌐 Language: {user_language}")
                            
                            # Extract plan metadata here to ensure we wait for it!
                            if 'satsang_plan' in metadata and metadata['satsang_plan']:
                                satsang_plan = metadata['satsang_plan']
                                plan_id = metadata.get('planId') or satsang_plan.get('id')
                                logger.info(f"📜 Found FULL satsang plan in metadata! (ID: {plan_id})")
                            elif 'planId' in metadata:
                                plan_id = metadata['planId']
                                logger.info(f"📜 Found Satsang Plan ID in metadata: {plan_id}")

                            # Metadata found, break out of participant loop
                            break
                        except Exception as e:
                            logger.error(f"❌ Failed to parse metadata: {e}")
                            import traceback
                            logger.error(f"Traceback: {traceback.format_exc()}")
                    else:
                        logger.warning(f"⚠️  Participant {participant.identity} has no metadata!")
                
                # Break out of retry loop only if we found guru_id AND (if private satsang, the plan)
                # If they connect with NO plan intentionally, plan_id will be None but guru_id is found.
                # To prevent endless waiting for a chat session, we break if guru_id is found and we waited at least 1 tick
                if guru_id != 'vivekananda':
                    # If it's a private satsang room, ensure we waited for plan
                    if "Satsang_" in ctx.room.name and not satsang_plan and attempt < max_retries - 2:
                        logger.info("⏳ Found guruId but no satsang_plan yet in Private mode, waiting...")
                    else:
                        break
            
            # Wait before retrying
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
        
        if guru_id == 'vivekananda':
            logger.warning("⚠️  No guruId found after all retries - using default 'vivekananda'")
            
    except Exception as e:
        logger.error(f"❌ Error extracting metadata: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
    
    hosted_instructions = None

    satsang_plan = None
    if plan_id:
        try:
            db = FirebaseDB()
            satsang_plan = db.get_satsang_plan(plan_id)
        except Exception as e:
            logger.error(f"Failed to fetch satsang plan {plan_id}: {e}")

    # Fetch long-term memory (last session transcript)
    try:
        db = FirebaseDB()
        last_transcript = db.get_last_transcript(user_id, f"hinduism-{guru_id}")
    except Exception as e:
        logger.warning(f"Failed to fetch last transcript for memory: {e}")
        last_transcript = []
        
    last_transcript_str = ""
    if last_transcript:
        last_transcript_str = "\n--- CONTEXT FROM SEEKER'S PREVIOUS SESSION ---\nThe seeker previously spoke with you in a past session. Here are the final exchanges from your last meeting. Use this sparingly to build a continuous bond and show you remember their struggles, but do not get sidetracked from today's plan:\n"
        for msg in last_transcript[-6:]: # Last 6 messages (usually the Q&A)
            last_transcript_str += f"{msg['role'].upper()}: {msg['content']}\n"
        last_transcript_str += "\n"

    hosted_instructions = None
    if satsang_plan:
        logger.info("✅ Satsang Plan loaded successfully")
        
        # CALCULATE INSTRUCTIONS FOR HOSTED MODE
        logger.info("🔒 Activating STRICT HOSTED SATSANG MODE")
        
        # Load profile specific details for persona injection
        try:
            profile_path = Path(__file__).parent / "guru_profiles" / f"{guru_id}.json"
            if profile_path.exists():
                with open(profile_path, 'r', encoding='utf-8') as f:
                    guru_profile = json.load(f)
            else:
                 guru_profile = {}
        except:
            guru_profile = {}

        guru_name_display = guru_profile.get('name', guru_id.replace('_', ' ').title())
        guru_tradition = guru_profile.get('tradition', 'Hindu')
        guru_tone = guru_profile.get('personality', {}).get('tone', 'Wise and compassionate')
        guru_philosophy = guru_profile.get('teachings', {}).get('core_philosophy', 'Spiritual wisdom')
        guru_signature = guru_profile.get('personality', {}).get('signature_phrases', ["Om Shanti"])[0]

        # Tradition-specific terminology
        music_label = "Bhajan"
        if any(t in guru_tradition.lower() for t in ["christian", "sufi", "islam", "judaism"]):
            music_label = "Hymn / Music"
        elif any(t in guru_tradition.lower() for t in ["buddhism", "zen", "taoism"]):
            music_label = "Chant / Meditation Music"
        
        session_label = "Satsang"
        if "christian" in guru_tradition.lower():
            session_label = "Service"
        elif "buddhism" in guru_tradition.lower():
            session_label = "Meditation Session"

        intro_text = satsang_plan.get('intro_text', '')
        meditation_query = satsang_plan.get('meditation_query', '')
        pravachan_points = satsang_plan.get('pravachan_points', [])
        closing_text = satsang_plan.get('closing_text', '')
        meditation_title = satsang_plan.get('meditation_title', 'Chakra Meditation')
        meditation_vid = satsang_plan.get('meditation_track_id', '')
        meditation_audio_url = satsang_plan.get('meditation_audio_url', '')
        meditation_image_url = satsang_plan.get('meditation_image_url', '')

        pravachan_text = "\\n".join([f"- {p}" for p in pravachan_points])

        hosted_instructions = f"""
IMPORTANT: YOU ARE IN **HOSTED {session_label.upper()} MODE**.
You are NOT a general assistant. You are executing a formal spiritual session.

IDENTITY & PERSONA (MAINTAIN AT ALL TIMES):
- You are **{guru_name_display}**.
- Tradition: {guru_tradition}
- Core Philosophy: {guru_philosophy}
- Tone: {guru_tone}
- Speak as {guru_name_display} would, using first-person perspective.
- Even while following the plan below, embody the wisdom, warmth, and specific style of your character.
- Signature closing/blessing if appropriate: "{guru_signature}"

SESSION TOPIC: {satsang_plan.get('topic', 'Satsang')}

--- HOSTED SESSION RULES ---
1. **SILENCE ON CONNECT**: Do NOT say "Namaste" or "Hello" when you join. Wait specifically for the 'START' signal from the host.
2. **STRICT PHASE EXECUTION**:
   - **INTRO**: When the session starts (you receive START signal), read the INTRO text below with warmth.
   - **{music_label.upper()}**: When asked for meditation music, play exactly: "{meditation_title}" (ID: {meditation_vid}).
   - **PRAVACHAN / DISCOURSE**: Deliver a comprehensive sermon covering EVERY SINGLE ONE of the discourse points below sequentially. Do not summarize them or skip any. Treat each point as a separate chapter of your discourse and expand on them heavily using your unique persona ({guru_name_display}) and philosophy.
     [CRITICAL: IF THE USER INTERRUPTS YOU during the Pravachan, DO NOT lose your track. Answer their question briefly but warmly, and then EXPLICITLY state "Now, returning to our discourse..." and resume exactly from the topic or point you left off.]
   - **Q&A**: 
     - Answer the seeker's questions with wisdom and patience.
     - AT THE END OF EVERY ANSWER, explicitly ask the seeker if they have any further questions or if their doubts are cleared.
     - When the seeker confirms they have no more questions or says goodbye:
       1. Tell them warmly (and ensure you speak in their preferred language): "I have something very special for you. Our entire satsang today — every teaching and every insight — has been distilled into a special song. It is the musical essence of our time together. Please listen to this curation." 
       2. Give a short final blessing.
       3. IMMEDIATELY invoke the end_satsang_session tool to disconnect the call so the music can play.
3. **NO SMALL TALK**: Do not ask "How are you?" or "What else can I do?". You are the Guru delivering a sermon.

--- CONTENT TO DELIVER ---
INTRO TEXT:
"{intro_text}"

PRAVACHAN POINTS (Discourse) - EXPAND ON THESE AS {guru_name_display}:
{pravachan_text}

CLOSING TEXT:
"{closing_text}"
{last_transcript_str}
--- RECORDING STATUS ---
NOTE: A full text transcript of this session is being saved to the database. Audio/video recording is not currently active.
"""
    else:
         pass # No instructions needed for non-hosted mode yet, or logic handled elsewhere

    logger.info(f"✅ Final configuration: Guru={guru_id}, Language={user_language}, Plan={bool(satsang_plan)}")
    
    # Initialize STT based on detected language
    # Use Sarvam for Hindi (best for Indian languages) with AssemblyAI fallback
    if user_language == 'hi':
        # Use Sarvam for Hindi (best for Indian languages)
        logger.info("Initializing STT for Hindi language")
        
        if stt_model == "sarvam" or stt_model.startswith("sarvam"):
            try:
                from livekit.plugins import sarvam as sarvam_plugin
                logger.info("Sarvam plugin imported successfully")
                
                if not sarvam_key:
                    logger.warning("SARVAM_API_KEY not set - Sarvam STT may fail. Falling back to AssemblyAI.")
                    raise ValueError("SARVAM_API_KEY not set")
                
                logger.info("Creating Sarvam STT instance...")
                stt = sarvam_plugin.STT(language="hi")
                logger.info("✅ Using Sarvam STT - BEST for Hindi/Indian languages!")
            except ImportError as e:
                logger.error(f"❌ Sarvam plugin not installed: {e}")
                logger.warning("Install with: pip install 'livekit-agents[sarvam]~=1.2'")
                logger.warning("Falling back to AssemblyAI for Hindi")
                stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Sarvam STT: {e}")
                logger.warning("Falling back to AssemblyAI due to Sarvam initialization error")
                stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
        else:
            # Use configured STT model with Hindi
            stt = inference.STT(model=stt_model, language="hi")
            logger.info(f"Using {stt_model} for Hindi STT")
    else:
        # English STT
        logger.info("Initializing STT for English language")
        stt = inference.STT(model="assemblyai/universal-streaming", language="en")


    # Create agent with the correct guru and instructions
    final_agent = SpiritualMasterAgent(
        guru_id=guru_id,
        user_id=user_id,
        publish_data_fn=ctx.room.local_participant.publish_data,
        disconnect_fn=ctx.room.disconnect,
        initial_instructions=hosted_instructions,
        last_transcript_str=last_transcript_str
    )
    
    
    # Create session
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice=final_agent.voice_id,
            language=user_language
        ),
        turn_detection=None,
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=False, # Disable for hosted mode to be safe? Let's keep true but handle turn detection if needed
    )
    
    # Metrics
    usage_collector = metrics.UsageCollector()
    
    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)
    
    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")
    
    ctx.add_shutdown_callback(log_usage)
    
    # Start session with final agent
    await session.start(
        agent=final_agent,
        room=ctx.room,
    )
    
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
            logger.info(f"📥 RAW DATA RECEIVED: {payload_str}")
            try:
                payload = json.loads(payload_str)
            except Exception:
                payload = None
                
            content = None
            if isinstance(payload, dict):
                if 'message' in payload:
                    content = payload['message']
                elif 'text' in payload:
                    content = payload['text']
            else:
                content = payload_str
                
            if content:
                # Intercept Phase Prompts
                if "[PHASE_PROMPT]" in content:
                    logger.info(f"🚀 Received Phase Prompt: {content[:100]}...")
                    clean_content = content.replace("[PHASE_PROMPT]", "").strip()
                    
                    # MEDITATION: Stay completely silent — music is handled by frontend
                    if "MEDITATION" in clean_content or "CLOSING" in clean_content:
                        logger.info("🎵 Meditation/Closing phase — agent stays silent.")
                        return  # ← Return immediately, no generate_reply
                    
                    logger.info("🧠 Asking Guru Brain to generate phase discourse...")
                    
                    try:
                        # Build rich instruction with pravachan content if available
                        if "PRAVACHAN" in clean_content and 'pravachan_points' in dir() and pravachan_points:
                            _points_text = "\n".join([f"{i+1}. {p}" for i, p in enumerate(pravachan_points)])
                            phase_instruction = f"""STOP any previous task. You are now beginning the PRAVACHAN (Discourse) phase.

You MUST deliver a LENGTHY, PROFOUND, and COMPREHENSIVE sermon covering ALL of the following points in order.

As a great Spiritual Master, your discourse must be deep and immersive:
- For EACH point, spend significant time (multiple paragraphs of speech) expanding on it.
- Use your unique persona, stories from your life (or relevant scriptures), and powerful metaphors.
- Do NOT settle for short explanations. This is the heart of the Satsang.
- Maintain a slow, meditative, and impactful pace.
- Do NOT summarize or skip ANY point.

DISCOURSE POINTS:
{_points_text}

IMPORTANT: Speak in the seeker's preferred language. After covering all points with great depth, invite the seeker to ask questions."""
                        elif "Q&A" in clean_content or "QA" in clean_content:
                            phase_instruction = """STOP the discourse. You have now completed the Pravachan phase.

You are now entering the Q&A (Question & Answer) phase. Warmly invite the seeker to ask any questions about today's discourse or their personal spiritual journey.
Answer each question with deep wisdom and compassion in the seeker's language.
After each answer, ask if they have further questions.
When they say they are done or have no more questions, give a final blessing and invoke the end_satsang_session tool."""
                        else:
                            phase_instruction = f"Deliver your guidance for this phase of the satsang: {clean_content}. Speak directly to the seeker in their language."
                        
                        session.generate_reply(instructions=phase_instruction)
                        logger.info(f"🗣️ generate_reply called for PHASE: {clean_content[:50]}")
                    except Exception as ge:
                        logger.error(f"❌ generate_reply failed for PHASE: {ge}")
                    return
                    
                # Intercept Wait Prompt
                elif "[WAIT MODE" in content:
                    logger.info("⏸️ Received Wait Mode prompt. Staying silent.")
                    return
                    
                elif "[Daily Satsang Mode - START]" in content:
                    logger.info("▶️ Received Start prompt. Telling agent to begin.")
                    try:
                        _intro = intro_text if 'intro_text' in dir() and intro_text else None
                        if _intro:
                            start_instruction = f"""The Private Satsang session has just begun. Speak the following INTRO TEXT word for word, in the seeker's language, with deep warmth and spiritual presence. Do not summarize or shorten it. Read it completely as written:

"{_intro}"

After completing the intro, ask the seeker if they are ready to begin the meditation."""
                        else:
                            start_instruction = "The Private Satsang session has just begun. Introduce yourself warmly as the guru and welcome the seeker."
                        session.generate_reply(instructions=start_instruction)
                        logger.info(f"🗣️ generate_reply called for START")
                    except Exception as ge:
                        logger.error(f"❌ generate_reply failed for START: {ge}")
                    return
                
                # Standard chat
                try:
                    session.generate_reply(
                        instructions="The user just sent a text message. Please respond naturally based on your persona."
                    )
                    logger.info(f"🗣️ generate_reply called for CHAT")
                except Exception as ge:
                    logger.error(f"❌ generate_reply failed for CHAT: {ge}")
        except Exception as e:
            logger.error(f"❌ Error in _on_data_received: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
    def _handle_room_data(data, participant=None, kind=None, topic=None):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running(): asyncio.create_task(_on_data_received(data, participant, kind, topic))
            else: loop.run_until_complete(_on_data_received(data, participant, kind, topic))
        except Exception as e:
            logger.error(f"❌ Error in _handle_room_data: {e}")
    ctx.room.on("data_received", _handle_room_data)
    
    # Send welcome message ONLY IF NOT IN HOSTED MODE
    if not satsang_plan:
        guru_name = final_agent.guru_profile.get('name', guru_id.replace('_', ' ').title())
        if user_language == 'hi':
            welcome_msg = (
                f"स्वागत है। मैं {guru_name} हूँ। आज जो भी बात आपको यहाँ ले आई है—"
                f"चाहे वह मन का कोई प्रश्न हो, हृदय का कोई बोझ हो, या सत्य की खोज—मैं सुनने के लिए यहाँ हूँ। नि:संकोच बोलें।"
            )
        else:
            welcome_msg = (
                f"Welcome. I am {guru_name}. Whatever brings you here today—"
                f"whether it is a question of the mind, a burden on your heart, or a seek for truth—I am here to listen. Speak freely."
            )
        
        await session.say(welcome_msg)
    else:
        logger.info("🤫 Hosted Mode active: Waiting for frontend to start session.")

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
        logger.info("⏱️ Session ended, saving transcript...")
        try:
            db = FirebaseDB()
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
                "agentName": f"hinduism-{guru_id}",
                "roomName": ctx.room.name
            }
            db.save_session_transcript(ctx.room.name, session_data, transcript)
        except Exception as e:
            logger.error(f"❌ Failed to save transcript: {e}")


if __name__ == "__main__":
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "hinduism-agent")
    logger.info(f"Starting agent: {agent_name}")
    
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
        max_retry=5
    ))


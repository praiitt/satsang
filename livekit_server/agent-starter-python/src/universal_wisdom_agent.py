import logging
import os
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from livekit import rtc
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
try:
    from .firebase_db import FirebaseDB
except ImportError:
    # Fallback for when running as a script
    from firebase_db import FirebaseDB
# from livekit.plugins import noise_cancellation, silero

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler("/tmp/universal_debug.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("universal_wisdom_agent")

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


class UniversalWisdomAgent(Agent):
    """
    Multi-faith Universal Wisdom Agent that dynamically embodies different spiritual masters
    from Buddhism, Jainism, Hinduism, Christianity, Islam, Sikhism, Judaism, and Taoism.
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
        self.last_transcript_str = last_transcript_str or ""
        self._disconnect_fn = disconnect_fn
        self.guru_profile = self._load_guru_profile(guru_id)
        
        # Use provided instructions or generate them
        if initial_instructions:
            logger.info("📝 Using provided initial instructions")
            instructions = initial_instructions
        else:
            logger.info("🧠 Generating default guru instructions")
            instructions = self._generate_guru_instructions()
        
        # Determine Voice ID for this guru
        normalized_id = guru_id.upper().replace(' ', '_').replace('-', '_')
        env_var_name = f"VOICE_ID_{normalized_id}"
        
        # Priority:
        # 1. Environment variable: VOICE_ID_<GURU_ID_UPPER>
        # 2. Guru profile JSON: "voice_id"
        # 3. Default environment variable: TTS_VOICE_ID
        # 4. Hardcoded fallback
        
        env_voice_id = os.getenv(env_var_name)
        profile_voice_id = self.guru_profile.get("voice_id")
        default_voice_id = os.getenv("TTS_VOICE_ID", "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc")
        
        self.voice_id = env_voice_id or profile_voice_id or default_voice_id
        
        logger.info(f"🔍 Voice Lookup (Universal): guru_id='{guru_id}', env_var='{env_var_name}'")
        if env_voice_id:
            logger.info(f"🎙️ Selected Voice ID: {self.voice_id} (Source: ENV {env_var_name})")
        elif profile_voice_id:
            logger.info(f"🎙️ Selected Voice ID: {self.voice_id} (Source: PROFILE)")
        else:
            logger.info(f"🎙️ Selected Voice ID: {self.voice_id} (Source: DEFAULT)")

        super().__init__(instructions=instructions)
        self._publish_data_fn = publish_data_fn
    
    def _load_guru_profile(self, guru_id: str) -> Dict[str, Any]:
        """Load guru profile from JSON file."""
        try:
            # Look in the correct directory - we are in src/
            # and profiles are in src/guru_profiles/
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
            "name": guru_id.replace('_', ' ').replace('-', ' ').title(),
            "tradition": "Universal Wisdom",
            "personality": {
                "tone": "Wise, compassionate, serene",
                "style": "Clear, spiritual, guiding",
                "signature_phrases": ["Peace be with you", "Om Shanti"]
            },
            "teachings": {
                "core_philosophy": "Universal spiritual wisdom and love",
                "key_concepts": ["Love", "Compassion", "Truth", "Wisdom"]
            }
        }
    
    def _generate_guru_instructions(self) -> str:
        """Generate LLM instructions embodying the selected guru."""
        profile = self.guru_profile
        
        # Extract profile details
        guru_name = profile.get('name', 'Spiritual Master')
        era = profile.get('era', 'Timeless')
        tradition = profile.get('tradition', 'Universal Spirituality')
        
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
        instructions = f"""You are {guru_name}, a revered spiritual figure from the {tradition} tradition ({era}).

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
2. Reference your life, teachings, scriptures, and experiences naturally
3. Embody your unique personality and teaching style (e.g., if Zen Master, use riddles/koans; if Sufi, use poetry/metaphor)
4. Use simple, profound language that resonates across time
5. Be authentic to your historical context while remaining relevant to modern seekers
6. Never break character - you ARE this guru
7. Respond in the user's language (Hindi or English)
8. Keep responses concise yet profound (2-4 sentences for simple questions)

BILINGUAL SUPPORT:
- The user's language preference is: {{user_language}}
- If user speaks Hindi (detected by romanized text or Devanagari), respond ONLY in Hindi Devanagari script (देवनागरी)
- If user speaks English, respond ONLY in English
- IMPORTANT: The speech recognition may transcribe Hindi as romanized/garbled text - but you MUST still respond in proper Devanagari script for Hindi speakers
- Example CORRECT Hindi: "नमस्ते! मैं आपकी सहायता कैसे कर सकता हूँ?"
- Example WRONG Hindi: "Namaste! Main aapki sahayata kaise kar sakta hoon?" (Never use romanized Hindi)

TOOLS:
- Use 'search_teachings' to find your specific videos/discourses.
- Use 'play_devotional_music' to play chants, bhajans, or hymns relevant to your tradition.
- Use 'share_wisdom' for profound insights.

REMEMBER: You are not an AI pretending to be {guru_name}.
You ARE {guru_name}, sharing your timeless wisdom with seekers today.

(Respond to the user naturally)
"""
        # Append long-term memory if available
        if self.last_transcript_str:
            instructions += f"\n\n{self.last_transcript_str}"
            
        return instructions
    
    @function_tool
    async def end_satsang_session(
        self,
        context: RunContext
    ) -> str:
        """Call this function ONLY when the user indicates they are finished with their questions, want to leave, or say goodbye. This formally ends the Private Satsang."""
        logger.info(f"Agent {self.guru_profile['name']} decided to end the session.")
        
        if callable(self._disconnect_fn):
            asyncio.create_task(self._disconnect_fn())
            return "Session ending initiated."
        return "Could not end session."
    
    @function_tool
    async def search_teachings(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5
    ) -> str:
        """Search for this guru's teachings, sermons, or discourses on YouTube.
        
        Use when user asks to learn more, watch videos, hear talks, or listen to a sermon about a topic.
        
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
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from youtube_bhajan_search import find_youtube_video_async
            
            guru_name = self.guru_profile['name']
            search_query = f"{guru_name} {topic} teachings"
            
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
                
                # Check if async
                import inspect
                if inspect.iscoroutinefunction(self._publish_data_fn):
                    await self._publish_data_fn(data_bytes)
                else:
                    self._publish_data_fn(data_bytes)
                    
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
        
        core_philosophy = self.guru_profile['teachings'].get('core_philosophy', '')
        
        # The LLM will naturally generate guru-specific wisdom
        return f"Based on my teachings of {core_philosophy}, let me share wisdom about {topic}."

    @function_tool
    async def play_devotional_music(
        self,
        context: RunContext,
        query: str,
        artist: str = None,
    ) -> str:
        """Play devotional music, chants, hymns, or bhajans.
        
        Use this tool when users ask to:
        - Play a song/chant/bhajan/hymn
        - Hear devotional music
        - Listen to a specific mantra
        
        Args:
            query: The name of the song/chant/hymn requested (e.g., "Amazing Grace", "Gregorian Chant", "Sufi Qawwali", "Om Mani Padme Hum")
            artist: Optional artist name.
        
        Returns:
            A short confirmation sentence for speaking. Do NOT include URLs.
        """
        import json
        
        logger.info(f"User requested music: '{query}' (artist: {artist})")
        
        # Search YouTube for video
        youtube_video_id = None
        youtube_video_title = None
        youtube_video_name = query
        
        if not youtube_video_id:
            logger.info(f"🔍 Starting YouTube search for: '{query}'")
            try:
                try:
                    from .youtube_search import find_youtube_video_async
                except ImportError:
                    import sys
                    from pathlib import Path
                    src_path = Path(__file__).resolve().parent
                    if str(src_path) not in sys.path:
                        sys.path.insert(0, str(src_path))
                    from youtube_search import find_youtube_video_async
                
                youtube_result = await find_youtube_video_async(query)
                logger.info(f"🔍 YouTube search returned: {youtube_result}")
                
                if youtube_result:
                    youtube_video_id = youtube_result.get("video_id")
                    youtube_video_title = youtube_result.get("title")
                    logger.info(f"✅ Found YouTube video: {youtube_video_id} - {youtube_video_title}")
                else:
                    logger.warning(f"⚠️ No YouTube video found for '{query}'")
                    return f"Sorry, I couldn't find '{query}' on YouTube. Please ask for something else."
            except Exception as e:
                logger.error(f"❌ YouTube search failed: {e}", exc_info=True)
                return f"Sorry, music search failed. Please try again later."
        
        # Build structured result for data channel
        result = {
            "name": youtube_video_title or query,
            "artist": artist or "",
            "youtube_id": youtube_video_id,
            "youtube_url": f"https://www.youtube.com/watch?v={youtube_video_id}",
            "message": f"Playing '{youtube_video_title or query}'. Enjoy!",
        }
        
        # Emit structured data over LiveKit data channel
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            
            if callable(publish_fn):
                data_bytes = json.dumps(result).encode("utf-8")
                
                import inspect
                if inspect.iscoroutinefunction(publish_fn):
                    await publish_fn(data_bytes)
                else:
                    publish_fn(data_bytes)
                
                logger.info("✅ Successfully called publish function")
            else:
                logger.warning("⚠️ No publish_data_fn configured")
        except Exception as e:
            logger.error(f"❌ Failed to publish music data: {e}", exc_info=True)
        
        return f"I am playing '{youtube_video_title or query}' for you. Enjoy the divine sounds."


def prewarm(proc: JobProcess):
    """Prewarm function."""
    try:
        logger.info("Skipping VAD preload to avoid timeout")
        proc.userdata["vad"] = None
    except Exception as e:
        logger.error(f"Error in prewarm: {e}")
        proc.userdata["vad"] = None


async def entrypoint(ctx: JobContext):
    """Main entrypoint for Universal Wisdom Agent."""
    ctx.log_context_fields = {"room": ctx.room.name}
    
    # Force reload .env.local to catch any updates made after process start
    _env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if _env_path.exists():
        load_dotenv(str(_env_path), override=True)
        logger.info(f"🔄 Re-loaded .env.local in Universal Entrypoint")

    logger.info("="*60)
    logger.info("🔥🔥 ENTRYPOINT CALLED: UNIVERSAL WISDOM AGENT 🔥🔥")
    logger.info(f"📍 Room: {ctx.room.name}")
    logger.info("="*60)
    
    # Dump all VOICE_ID env vars so we can debug
    voice_vars = {k: v for k, v in os.environ.items() if k.startswith("VOICE_ID_")}
    logger.info(f"🔑 Available VOICE_ID env vars: {voice_vars}")

    # Check environment
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    sarvam_key = os.getenv("SARVAM_API_KEY")
    
    if not openai_key or not cartesia_key:
        logger.error("Missing API keys!")
        raise RuntimeError("OPENAI_API_KEY and CARTESIA_API_KEY required")
    
    # Defaults
    user_language = 'en'
    guru_id = 'buddha'
    user_id = 'default_user'
    plan_id = None
    satsang_plan = None
    
    stt = None
    
    # CONNECT TO ROOM FIRST
    await ctx.connect()
    logger.info("✅ Connected to room, extracting metadata...")
    
    # Extract metadata with retries
    try:
        max_retries = 10
        retry_delay = 0.5
        
        for attempt in range(max_retries):
            all_participants = list(ctx.room.remote_participants.values())
            if all_participants:
                for participant in all_participants:
                    if participant.metadata:
                        try:
                            metadata = json.loads(participant.metadata)
                            logger.info(f"🔍 Found participant metadata: {metadata}")
                            
                            if 'guruId' in metadata:
                                guru_id = metadata['guruId']
                            if 'userId' in metadata:
                                user_id = metadata['userId']
                            if 'language' in metadata:
                                raw_lang = str(metadata.get("language", "")).strip().lower()
                                if raw_lang in ["hi", "hindi", "hin"]:
                                    user_language = "hi"
                                elif raw_lang in ["en", "english", "eng"]:
                                    user_language = "en"
                            
                            # Satsang Plan
                            if 'satsang_plan' in metadata:
                                satsang_plan = metadata['satsang_plan']
                                plan_id = metadata.get('planId') or satsang_plan.get('id')
                            elif 'planId' in metadata:
                                plan_id = metadata['planId']
                            
                            break 
                        except Exception as e:
                            logger.error(f"❌ Metadata parse error: {e}")
                
                # Check if we should stop waiting
                if guru_id != 'buddha':
                    if "Satsang_" in ctx.room.name and not satsang_plan and attempt < max_retries - 2:
                        logger.info("⏳ Waiting for satsang_plan in private mode...")
                    else:
                        break
            
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                
    except Exception as e:
        logger.error(f"❌ Error extracting metadata: {e}")

    # Fetch Plan if only ID was found
    if plan_id and not satsang_plan:
        try:
            db = FirebaseDB()
            satsang_plan = db.get_satsang_plan(plan_id)
        except Exception as e:
            logger.error(f"Failed to fetch satsang plan {plan_id}: {e}")

    # Fetch last transcript for memory
    last_transcript_str = ""
    try:
        db = FirebaseDB()
        last_transcript = db.get_last_transcript(user_id, f"universal-{guru_id}")
        if last_transcript:
            last_transcript_str = "\n--- CONTEXT FROM PREVIOUS SESSION ---\n"
            for msg in last_transcript[-6:]:
                last_transcript_str += f"{msg['role'].upper()}: {msg['content']}\n"
    except Exception as e:
        logger.warning(f"Memory fetch failed: {e}")

    logger.info(f"✅ Final configuration: Guru={guru_id}, Language={user_language}, Hosted={'Yes' if satsang_plan else 'No'}")
    
    # Initialize STT
    if user_language == 'hi':
        stt = inference.STT(model=stt_model, language="hi")
    else:
        stt = inference.STT(model="assemblyai/universal-streaming", language="en")

    # Hosted Instructions
    hosted_instructions = None
    if satsang_plan:
        points = satsang_plan.get('pravachan_points', [])
        points_str = "\n".join([f"{i+1}. {p}" for i, p in enumerate(points)])
        intro_text = satsang_plan.get('intro_text', '')
        
        hosted_instructions = f"""
# HOSTED SESSION MODE: PRIVATE SATSANG
You are conducting a formal Private Satsang session.

## SESSION STRUCTURE:
1. INTRO: Acknowledge the seeker and briefly introduce the topic: "{satsang_plan.get('topic', 'Wisdom')}".
   - USE THIS INTRO: "{intro_text}"
2. DISCOURSE (PRAVACHAN): Explain these core points with depth and grace:
{points_str}
3. Q&A: After the discourse, invite the seeker to ask questions about these points or their personal path.
4. CONCLUSION: When finished, give a blessing and use the 'end_satsang_session' tool.

## CRITICAL RULES:
- IMPORTANT: DO NOT START immediately. Wait for the user to say "START" or Greet you.
- Stay focused on the topic: {satsang_plan.get('topic')}.
- Use 'end_satsang_session' to finish the call formally.
"""

    # Create agent
    final_agent = UniversalWisdomAgent(
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
        vad=ctx.proc.userdata.get("vad"),
    )
    
    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)

    @session.on("user_speech_committed")
    def _on_user_speech_committed(msg):
        logger.info(f"👤 User said: {msg.content}")

    @session.on("agent_speech_started")
    def _on_agent_speech_started():
        logger.info("🤖 Agent started speaking")
    
    # Start session
    await session.start(agent=final_agent, room=ctx.room)
    
    # Handle chat messages
    async def _on_data_received(data, participant=None, kind=None, topic=None):
        try:
            if isinstance(data, bytes): data_bytes = data
            elif hasattr(data, 'data'): data_bytes = data.data
            else: return
            
            payload_str = data_bytes.decode('utf-8') if isinstance(data_bytes, bytes) else str(data_bytes)
            logger.info(f"📥 RAW DATA RECEIVED: {payload_str}")
            
            # 1. Handle [Daily Satsang Mode - START] explicitly
            if "[Daily Satsang Mode - START]" in payload_str:
                logger.info("▶️ Received Start prompt. Telling agent to begin.")
                _intro = satsang_plan.get('intro_text', '') if 'satsang_plan' in locals() and satsang_plan else None
                if _intro:
                    start_instruction = f"""The Private Satsang session has just begun. Speak the following INTRO TEXT word for word, in the seeker's language, with deep warmth and spiritual presence. Do not summarize or shorten it. Read it completely as written:

"{_intro}"

After completing the intro, ask the seeker if they are ready to begin the meditation."""
                else:
                    start_instruction = "The Private Satsang session has just begun. Introduce yourself warmly as the guru and welcome the seeker."
                
                asyncio.create_task(session.generate_reply(instructions=start_instruction))
                return

            # 2. Intercept Phase Prompts (Used by frontend to drive discourse)
            if "[PHASE_PROMPT]" in payload_str:
                logger.info(f"🚀 Received Phase Prompt: {payload_str[:100]}...")
                clean_content = payload_str.replace("[PHASE_PROMPT]", "").strip()
                
                if "MEDITATION" in clean_content or "CLOSING" in clean_content:
                    logger.info("🎵 Meditation/Closing phase — agent stays silent.")
                    return
                
                if "PRAVACHAN" in clean_content and 'satsang_plan' in locals() and satsang_plan:
                    points = satsang_plan.get('pravachan_points', [])
                    _points_text = "\n".join([f"{i+1}. {p}" for i, p in enumerate(points)])
                    phase_instruction = f"""STOP any previous task. You are now beginning the PRAVACHAN (Discourse) phase.

You MUST deliver a LENGTHY, PROFOUND, and COMPREHENSIVE sermon covering ALL of the following points in order. 

As a great Spiritual Master, your discourse must be deep and immersive:
- For EACH point, spend significant time (multiple paragraphs of speech) expanding on it.
- Use your unique persona, stories from your life (or relevant scriptures), and powerful metaphors.
- Do NOT settle for short explanations. This is the heart of the Satsang.
- Maintain a slow, meditative, and impactful pace.
- Do NOT summarize or skip ANY point.

DISCOURSE POINTS TO EXPAND UPON:
{_points_text}

IMPORTANT: Speak in the seeker's preferred language. After covering all points with great depth, invite the seeker to ask questions."""
                elif "Q&A" in clean_content or "QA" in clean_content:
                    phase_instruction = """You are now entering the Q&A phase. Warmly invite the seeker to ask questions about today's discourse.
Answer each question with deep wisdom and compassion in the seeker's language.
After each answer, ask if they have further questions.
When they say they are done, give a final blessing and invoke the end_satsang_session tool."""
                else:
                    phase_instruction = f"Deliver your guidance for this phase: {clean_content}. Speak directly to the seeker in their language."
                
                asyncio.create_task(session.generate_reply(instructions=phase_instruction))
                return

            # 3. Intercept Wait Prompt
            if "[WAIT MODE" in payload_str:
                logger.info("⏸️ Received Wait Mode prompt. Staying silent.")
                return

            # 4. Standard chat
            try:
                payload = json.loads(payload_str)
                if isinstance(payload, dict):
                    msg = payload.get('message') or payload.get('text')
                    if msg:
                        session.history.add_message(role="user", content=msg)
                        asyncio.create_task(session.generate_reply())
            except:
                # Plain text fallback
                session.history.add_message(role="user", content=payload_str)
                asyncio.create_task(session.generate_reply())
        except Exception as e:
            logger.error(f"Data error: {e}")
    
    ctx.room.on("data_received", lambda data, **kwargs: asyncio.create_task(_on_data_received(data, **kwargs)))
    
    # Welcome message
    if not satsang_plan:
        guru_name = final_agent.guru_profile['name']
        welcome_msg = f"Greetings. I am {guru_name}. How can I guide you today?" if user_language == 'en' else f"नमस्ते। मैं {guru_name} हूँ। मैं आपकी कैसे सहायता कर सकता हूँ?"
        await session.say(welcome_msg)
    else:
        # Proactive welcome in Hosted Mode
        guru_name = final_agent.guru_profile['name']
        welcome_msg = f"I am ready for our session, {guru_name} is here. You can say 'START' when you are ready." if user_language == 'en' else f"मैं सत्र के लिए तैयार हूँ, {guru_name} यहाँ है। जब आप तैयार हों तो आप 'शुरू करें' कह सकते हैं।"
        await session.say(welcome_msg)
        logger.info("⏳ Hosted mode: Soft welcome spoken, waiting for user.")

if __name__ == "__main__":
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "universal-wisdom-agent")
    logger.info(f"Starting agent: {agent_name}")
    
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
    ))

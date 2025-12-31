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


class HinduismAgent(Agent):
    """
    Multi-guru Hinduism Agent that dynamically embodies different spiritual masters.
    """
    
    def __init__(
        self,
        guru_id: str = "vivekananda",
        user_id: str = "default_user",
        publish_data_fn=None,
        initial_instructions: Optional[str] = None 
    ) -> None:
        self.guru_id = guru_id
        self.user_id = user_id
        self.guru_profile = self._load_guru_profile(guru_id)
        
        # Use provided instructions or generate them
        if initial_instructions:
            logger.info("📝 Using provided initial instructions")
            instructions = initial_instructions
        else:
            logger.info("🧠 Generating default guru instructions")
            instructions = self._generate_guru_instructions()
        
        super().__init__(instructions=instructions)
        self._publish_data_fn = publish_data_fn
    
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
                            
                            # Metadata found, break out of retry loop
                            break
                        except Exception as e:
                            logger.error(f"❌ Failed to parse metadata: {e}")
                            import traceback
                            logger.error(f"Traceback: {traceback.format_exc()}")
                    else:
                        logger.warning(f"⚠️  Participant {participant.identity} has no metadata!")
                
                # Break out of retry loop if we found participants
                if guru_id != 'vivekananda' or participant_count > 0:
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
    
    # Check for Satsang Plan
    satsang_plan = None
    plan_id = None
    
    # Try to extract plan from metadata
    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                md = json.loads(p.metadata)
                
                # Check for FULL PLAN embedded in metadata (Best method avoids DB call)
                if 'satsang_plan' in md and md['satsang_plan']:
                    satsang_plan = md['satsang_plan']
                    plan_id = md.get('planId') or satsang_plan.get('id')
                    logger.info(f"📜 Found FULL satsang plan in metadata! (ID: {plan_id})")
                    break
                
                # Fallback to just ID
                if 'planId' in md:
                    plan_id = md['planId']
                    logger.info(f"📜 Found Satsang Plan ID in metadata: {plan_id}")
                    break
            except:
                pass

    hosted_instructions = None

    # If we have ID but no full plan, try DB (Fallback)
    if plan_id and not satsang_plan:
        logger.info(f"Loading satsang plan {plan_id} from DB...")
        try:
            db = FirebaseDB()
            satsang_plan = db.get_satsang_plan(plan_id)
        except Exception as e:
            logger.error(f"❌ Failed to load plan from DB: {e}")

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
        guru_tone = guru_profile.get('personality', {}).get('tone', 'Wise and compassionate')
        guru_philosophy = guru_profile.get('teachings', {}).get('core_philosophy', 'Spiritual wisdom')
        guru_signature = guru_profile.get('personality', {}).get('signature_phrases', ["Om Shanti"])[0]

        intro_text = satsang_plan.get('intro_text', '')
        bhajan_query = satsang_plan.get('bhajan_query', '')
        pravachan_points = satsang_plan.get('pravachan_points', [])
        closing_text = satsang_plan.get('closing_text', '')
        bhajan_title = satsang_plan.get('bhajan_title', bhajan_query)
        bhajan_vid = satsang_plan.get('bhajan_video_id', '')

        pravachan_text = "\\n".join([f"- {p}" for p in pravachan_points])

        hosted_instructions = f"""
IMPORTANT: YOU ARE IN **HOSTED SATSANG MODE**.
You are NOT a general assistant. You are executing a formal spiritual session.

IDENTITY & PERSONA (MAINTAIN AT ALL TIMES):
- You are **{guru_name_display}**.
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
   - **BHAJAN**: When asked for bhajan, play exactly: "{bhajan_title}" (ID: {bhajan_vid}).
   - **PRAVACHAN**: Deliver the discourse points below. Expand on them using your unique persona ({guru_name_display}) and philosophy.
   - **CLOSING**: End with the closing message.
3. **NO SMALL TALK**: Do not ask "How are you?" or "What else can I do?". You are the Guru delivering a sermon.

--- CONTENT TO DELIVER ---
INTRO TEXT:
"{intro_text}"

PRAVACHAN POINTS (Discourse) - EXPAND ON THESE AS {guru_name_display}:
{pravachan_text}

CLOSING TEXT:
"{closing_text}"
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
    final_agent = HinduismAgent(
        guru_id=guru_id,
        user_id=user_id,
        publish_data_fn=ctx.room.local_participant.publish_data,
        initial_instructions=hosted_instructions # PASS INSTRUCTIONS HERE
    )
    
    
    # Create session
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice=os.getenv("TTS_VOICE_ID", "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"),
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
    
    # Send welcome message ONLY IF NOT IN HOSTED MODE
    if not satsang_plan:
        guru_name = final_agent.guru_profile['name']
        if user_language == 'hi':
            welcome_msg = f"नमस्ते! मैं {guru_name} की शिक्षाओं को समर्पित एक AI हूँ। आप मुझसे कोई भी आध्यात्मिक प्रश्न पूछ सकते हैं।"
        else:
            welcome_msg = f"Namaste! I am an AI embodying the teachings of {guru_name}. You may ask me any spiritual question."
        
        await session.say(welcome_msg)
    else:
        logger.info("🤫 Hosted Mode active: Starting session with Intro Text.")
        if 'intro_text' in locals() and intro_text:
            # 1. Speak Intro
            await session.say(intro_text)
            
            # 2. Auto-play Bhajan
            if 'bhajan_vid' in locals() and bhajan_vid:
                logger.info(f"🎶 Auto-playing Bhajan: {bhajan_vid}")
                # We can trigger the tool-like behavior directly or instruct the agent
                # Direct trigger is safer for hosted mode
                
                # Construct a fake search result or just play it if we had a direct play method
                # Since we rely on the frontend to play based on tool output/events, 
                # let's try to simulate what the tool does: publish data to frontend.
                
                # The 'search_guru_teachings' tool usually creates a track. 
                # But here we want to ensure the agent 'knows' it played it.
                # Simplest way: Append a user-like message "Play the bhajan now" to the chat context? 
                # No, better to directly publish the event like the tool would.
                
                if final_agent._publish_data_fn:
                     payload = json.dumps({
                        "type": "video_result",
                        "videoId": bhajan_vid,
                        "title": bhajan_title or "Bhajan",
                        "autoplay": True
                    })
                     await final_agent._publish_data_fn(payload, reliable=True)
                     logger.info("📡 Sent Play Bhajan signal to frontend")
            
        else:
            await session.say("Namaste. I am ready to begin our satsang.")


if __name__ == "__main__":
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "hinduism-agent")
    logger.info(f"Starting agent: {agent_name}")
    
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
        max_retry=5
    ))

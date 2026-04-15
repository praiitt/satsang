"""
RRAASI Dance Meditation Agent - LiveKit Implementation

AI-guided meditation through dance - a joyful spiritual practice.
Supports Hindi and English with proper language detection and TTS/STT.
Integrates with Suno API for creating custom meditation music.
"""

import logging
from pathlib import Path
import os
import asyncio
import json
from dotenv import load_dotenv
from livekit import api
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    inference,
    function_tool,
    RunContext,
    llm,
)
from livekit.plugins import openai
from google.cloud import firestore
from firebase_admin import storage
from typing import Optional, Dict, List
import aiohttp
import io

# Import Suno client (same as music agent)
try:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent / 'src'))
    from suno_client import SunoClient
except ImportError:
    # Fallback if import fails
    SunoClient = None
    logging.warning("SunoClient not available - music generation will be disabled")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger("meditation_agent")

# Load environment variables
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.cwd() / ".env.local",
]
for _env_path in _ENV_PATHS:
    if _env_path.exists():
        load_dotenv(str(_env_path), override=True)
        break

# Initialize Firestore
try:
    service_account_path = Path(__file__).resolve().parent.parent / "rraasiServiceAccount.json"
    if not service_account_path.exists():
        service_account_path = Path("./rraasiServiceAccount.json")
    
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(service_account_path)
    
    # Initialize Firebase Admin if not already done
    import firebase_admin
    from firebase_admin import credentials
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(service_account_path))
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'rraasi-8a619.firebasestorage.app'
        })
    
    db = firestore.Client(project='rraasi-8a619')
    bucket = storage.bucket()
    logger.info(f"✅ Firebase initialized with: {service_account_path}")
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {e}")
    db = None
    bucket = None


class MeditationState:
    """Track meditation session state"""
    def __init__(self):
        self.user_id: Optional[str] = None
        self.mood: Optional[str] = None
        self.intention: Optional[str] = None
        self.energy_level: int = 5  # 1-10 scale
        self.selected_music: Optional[Dict] = None
        self.session_phase: str = "welcome"
        self.session_start: Optional[float] = None
        self.language: str = "hi"  # Default Hindi
        self.chat_history: List[Dict] = []  # List of {role: str, content: str, timestamp: float}



class DanceMeditationAgent(Agent):
    """AI agent for guiding dance meditation sessions with multi-language support"""
    
    def __init__(self, user_id: str = "default_user", language: str = "hi"):
        # Language-specific instructions
        if language == "hi":
            instructions = """आप RRAASI मेडिटेशन गाइड हैं - एक गर्मजोशी भरे और ज्ञानी ध्यान मार्गदर्शक।
आप लोगों को नृत्य ध्यान के माध्यम से शांति और आनंद खोजने में मदद करते हैं।

आपका दृष्टिकोण:
- गर्मजोशी और करुणा से बोलें
- धीरे से मार्गदर्शन करें, कभी ज़बरदस्ती नहीं
- सरल, काव्यात्मक भाषा का उपयोग करें
- उपयोगकर्ता के अभ्यास का जश्न मनाएं

क्षमताएं:
- मौजूदा ध्यान संगीत खोजें (query_meditation_music)
- नए ध्यान ट्रैक बनाएं (generate_meditation_music)
- ध्यान सत्र शुरू करें (start_meditation_session)
"""
        else:
            instructions = """You are RRAASI Meditation Guide - a warm, wise Indian spiritual guide.
You help people find peace and joy through dance meditation.

Your approach:
- Speak with a warm, Indian spiritual tone
- Use terms like "Namaste", "Prana", "Shanti", "Ananda" naturally
- Guide gently, never forcefully
- Use simple, poetic language
- Celebrate the user's practice

Capabilities:
- Search existing meditation music (query_meditation_music)
- Play meditation music (play_meditation_music)
- Create new meditation tracks (generate_meditation_music)
- Start meditation sessions (start_meditation_session)
"""
        
        super().__init__(instructions=instructions)
        self.user_id = user_id
        self.state = MeditationState()
        self.state.user_id = user_id
        self.state.language = language
        self.db = db
        
        # Initialize Suno client if available
        self.suno_client = SunoClient() if SunoClient else None
    
    @function_tool
    async def query_meditation_music(
        self,
        context: RunContext,
        mood: str,
        bpm_preference: str = "medium"
    ) -> str:
        """
        Search existing RRAASI Music library for suitable meditation tracks.
        
        Args:
            mood: User's current mood (peaceful, stressed, joyful, tired)
            bpm_preference: slow (60-80), medium (80-100), energetic (100-120)
        
        Returns:
            List of suitable tracks or empty if none found
        """
        if not self.db:
            return "Database not available"
        
        logger.info(f"Querying music for mood: {mood}, BPM: {bpm_preference}")
        
        try:
            # BPM range mapping
            bpm_ranges = {
                "slow": (60, 80),
                "medium": (80, 100),
                "energetic": (100, 120)
            }
            bpm_min, bpm_max = bpm_ranges.get(bpm_preference, (80, 100))
            
            # Query Firestore
            tracks_ref = self.db.collection('music_tracks')
            query = tracks_ref.where('status', '==', 'COMPLETED')
            
            # Filter by tags if mood is specified
            if mood:
                query = query.where('tags', 'array_contains', mood.lower())
            
            docs = query.limit(10).stream()
            tracks = []
            
            for doc in docs:
                track = doc.to_dict()
                track['id'] = doc.id
                
                # Filter by BPM if available
                if track.get('bpm'):
                    if bpm_min <= track['bpm'] <= bpm_max:
                        tracks.append(track)
                else:
                    tracks.append(track)
            
            if len(tracks) > 0:
                # Return formatted list
                result = f"I found {len(tracks)} suitable tracks:\n"
                for i, track in enumerate(tracks[:5], 1):
                    result += f"{i}. {track.get('title', 'Untitled')}\n"
                return result
            else:
                return f"No tracks found for {mood} mood. I can create a new one for you."
                
        except Exception as e:
            logger.error(f"Error querying music: {e}")
            return "Error searching music library"
    
            return "Error searching music library"

    @function_tool
    async def play_meditation_music(
        self,
        context: RunContext,
        query: str
    ) -> str:
        """
        Play a specific meditation track or find one matching a mood.
        
        Args:
            query: Title of the track OR a mood (e.g. "peaceful", "Om Mantra", "energetic")
        
        Returns:
            Status message indicating if music is playing.
        """
        if not self.db:
            return "Database not available for music playback."
            
        logger.info(f"Request to play music: {query}")
        
        try:
            tracks_ref = self.db.collection('music_tracks')
            
            # Simple search: try Title match first, then Tag match
            # 1. Try Title Match (approximate logic here, ideally use a search index)
            # Firestore doesn't support substring search well, so we might need a different approach
            # or just query all completed tracks and filter in memory (if list provided in context)
            
            # For now, let's query recent completed tracks and filter in Python
            docs = tracks_ref.where('status', '==', 'COMPLETED') \
                             .order_by('createdAt', direction=firestore.Query.DESCENDING) \
                             .limit(20) \
                             .stream()
                             
            candidates = []
            for doc in docs:
                data = doc.to_dict()
                candidates.append(data)
                
            # Filter
            query_lower = query.lower()
            match = None
            
            for track in candidates:
                title = track.get('title', '').lower()
                tags = [t.lower() for t in track.get('tags', [])]
                
                if query_lower in title:
                    match = track
                    break
                if query_lower in tags:
                    match = track
                    break
            
            # Fallback: if 'meditation' or generic, just pick the first one
            if not match and candidates and len(candidates) > 0:
                match = candidates[0]
                
            if match:
                title = match.get('title', 'Unknown Track')
                url = match.get('audioUrl')
                
                if not url:
                    return f"Found '{title}' but audio is missing."
                    
                # Publish event
                if hasattr(self, '_publish_data_fn') and self._publish_data_fn:
                    payload = {
                        "name": title,
                        "artist": "RRAASI AI",
                        "audio_url": url,
                        "message": f"Playing '{title}'..."
                    }
                    import json
                    await self._publish_data_fn(json.dumps(payload).encode('utf-8'))
                    return f"Playing '{title}' for you now."
                else:
                    return "I found the music but cannot play it technically right now."
            
            return f"I couldn't find any suitable meditation music matching '{query}'. Would you like me to generate some?"
            
        except Exception as e:
            logger.error(f"Error playing music: {e}")
            return "I encountered an error trying to play music."
    @function_tool
    async def generate_meditation_music(
        self,
        context: RunContext,
        intention: str,
        mood: str = "peaceful",
        bpm: int = 90,
        is_instrumental: bool = True
    ) -> str:
        """
        Generate a new meditation music track using Suno AI.
        
        Args:
            intention: User's meditation intention (used in title and style)
            mood: Mood for the track (peaceful, energetic, calming, uplifting)
            bpm: Target BPM (60-120, default 90 for meditation)
            is_instrumental: Whether track should be instrumental (default True)
        
        Returns:
            Status message about track generation
        """
        if not self.suno_client:
            return "Music generation is not available. Please use existing tracks."
        
        logger.info(f"Generating meditation music: {intention}, mood: {mood}, BPM: {bpm}")
        
        try:
            # Create meditation-specific style description
            style_descriptions = {
                "peaceful": "Slow ambient meditation music with soft pads, gentle bells, and nature sounds",
                "energetic": "Uplifting dance meditation with rhythmic drums, flutes, and positive energy",
                "calming": "Deep relaxation music with crystal bowls, soft drones, and binaural beats",
                "uplifting": "Joyful meditation music with upbeat tempo, harmonious chords, and light percussion"
            }
            
            style = style_descriptions.get(mood, style_descriptions["peaceful"])
            style += f", {bpm} BPM, healing frequencies"
            
            # Title based on intention
            title = f"{intention} - Dance Meditation"
            
            # Callback URL for Suno webhook - use dance_meditation category
            # This flag tells the webhook to save to 'dance_trans' collection
            # Use AUTH_SERVER_URL to ensure we hit the active server
            callback_base = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
            callback_url = f"{callback_base}/suno/callback?userId={self.user_id}&category=dance_meditation"
            
            # Generate music via Suno
            result = await self.suno_client.generate_music(
                prompt="",  # Empty for instrumental
                is_instrumental=is_instrumental,
                custom_mode=True,
                style=style,
                title=title,
                model="V3_5",
                callback_url=callback_url
            )
            
            logger.info(f"Suno API Result: {result}")
            
            # Extract task ID
            task_id = None
            if isinstance(result, dict) and result.get("code") == 200:
                data = result.get("data", {})
                task_id = data.get("taskId")
            
            if not task_id:
                logger.warning(f"Could not parse taskId from result: {result}")
                return "Music generation started but tracking is unavailable. Check 'My Music' in a few moments."
            
            # Save pending record to Firestore
            if self.db:
                try:
                    track_data = {
                        "title": title,
                        "status": "generating",
                        "taskId": task_id,
                        "prompt": style,
                        "style": style,
                        "description": f"Meditation music for {intention}",
                        "musicCategory": "Meditation",
                        "healingBenefits": ["Stress relief", "Inner peace", "Mind clarity"],
                        "tags": [mood, "meditation", "dance", "healing"],
                        "category": "dance_meditation",  # Flag for webhook to save to dance_trans collection
                        "bpm": bpm,
                        "userId": self.user_id,
                        "isPublic": False
                    }
                    
                    self.db.collection('music_tracks').document(task_id).set(track_data)
                    logger.info(f"✅ Saved pending meditation track to Firestore")
                    
                    self.state.selected_music = {"id": task_id, "title": title}
                    self.state.selected_music['generatedMusic'] = True
                    
                    # Start polling task in background
                    asyncio.create_task(self._poll_and_store_music(task_id, title))
                    
                except Exception as db_error:
                    logger.error(f"Failed to save track to Firestore: {db_error}")
            
            return f"I'm creating your meditation track: '{title}'. It will be ready in about 60-90 seconds. You can find it in 'My Music' once complete."
            
        except Exception as e:
            logger.error(f"Music generation failed: {e}")
            return "I encountered an error creating the music. Let's use an existing track instead."
    
    @function_tool
    async def start_meditation_session(
        self,
        context: RunContext,
        intention: str,
        duration_minutes: int = 25
    ) -> str:
        """
        Start a guided meditation session with user's intention.
        
        Args:
            intention: User's meditation intention
            duration_minutes: Desired session length (15-45 minutes)
        
        Returns:
            Confirmation and next steps
        """
        self.state.intention = intention
        self.state.session_start = asyncio.get_event_loop().time()
        self.state.session_phase = "starting"
        
        logger.info(f"Starting meditation: {intention} ({duration_minutes}min)")
        
        return f"Beautiful intention: '{intention}'. Let's begin with grounding and breath. Stand comfortably..."
    
    async def _save_session(self):
        """Save completed session to Firestore"""
        if not self.db:
            logger.warning("Cannot save session - DB not initialized")
            return
        
        try:
            duration = int(asyncio.get_event_loop().time() - self.state.session_start) if self.state.session_start else 0
            
            session_data = {
                'userId': self.user_id,
                'intention': self.state.intention or "Peace and joy",
                'mood_before': self.state.mood or "neutral",
                'musicUsed': [self.state.selected_music['id']] if self.state.selected_music else [],
                'generatedMusic': False,
                'duration': duration,
                'completedAt': firestore.SERVER_TIMESTAMP,
                'agentGuided': True,
                'chatHistory': self.state.chat_history
            }
            
            self.db.collection('meditation_sessions').add(session_data)
            logger.info(f"✅ Session saved for user {self.user_id}")
        except Exception as e:
            logger.error(f"Error saving session: {e}")

    async def _poll_and_store_music(self, task_id: str, title: str):
        """Poll Suno status and handle storage upload when complete"""
        if not self.suno_client or not bucket:
            logger.warning(f"Skipping storage for {task_id} - Suno or Storage not configured")
            return
            
        logger.info(f"⏳ Listening for music completion: {task_id}")
        
        attempts = 0
        max_attempts = 40  # 40 * 5s = 200s max wait
        
        while attempts < max_attempts:
            await asyncio.sleep(5)
            attempts += 1
            
            try:
                # Get Status
                data = await self.suno_client.get_generation_status(task_id)
                status = data.get("status")
                
                # Check for completion
                if status == "complete" or status == "completed":
                    logger.info(f"🎵 Music generation complete: {task_id}")
                    
                    # Extract URLs
                    clips = data.get("clips") or []
                    audio_url = None
                    image_url = None
                    
                    # Try to find the specific task clip
                    for clip in clips:
                        if clip.get("id") == task_id or clip.get("video_url"): # Rough match
                            audio_url = clip.get("audio_url")
                            image_url = clip.get("image_url")
                            break
                    
                    # Fallback to first clip if match failed
                    if not audio_url and clips:
                        audio_url = clips[0].get("audio_url")
                        image_url = clips[0].get("image_url")
                        
                    if not audio_url:
                        logger.warning(f"No audio URL found for completed task {task_id}")
                        break
                        
                    # Process Uploads
                    updates = {}
                    
                    # 1. Audio Upload
                    if audio_url:
                        try:
                            async with aiohttp.ClientSession() as http:
                                async with http.get(audio_url) as resp:
                                    if resp.status == 200:
                                        blob_path = f"music-tracks/{task_id}/{task_id}.mp3"
                                        blob = bucket.blob(blob_path)
                                        
                                        content = await resp.read()
                                        blob.upload_from_string(content, content_type="audio/mpeg")
                                        blob.make_public()
                                        
                                        updates['audioUrl'] = blob.public_url
                                        logger.info(f"✅ Uploaded audio: {blob.public_url}")
                        except Exception as e:
                            logger.error(f"Failed to upload audio: {e}")
                            updates['audioUrl'] = audio_url # Fallback
                            
                    # 2. Image Upload
                    if image_url:
                        try:
                            async with aiohttp.ClientSession() as http:
                                async with http.get(image_url) as resp:
                                    if resp.status == 200:
                                        blob_path = f"music-tracks/{task_id}/cover.jpg"
                                        blob = bucket.blob(blob_path)
                                        
                                        content = await resp.read()
                                        blob.upload_from_string(content, content_type="image/jpeg")
                                        blob.make_public()
                                        
                                        updates['imageUrl'] = blob.public_url
                                        logger.info(f"✅ Uploaded image: {blob.public_url}")
                        except Exception as e:
                            logger.error(f"Failed to upload image: {e}")
                            updates['imageUrl'] = image_url
                            
                    # Update Firestore
                    if updates and self.db:
                        updates['status'] = 'COMPLETED'
                        updates['source'] = 'meditation_agent' # Per user request
                        
                        self.db.collection('music_tracks').document(task_id).set(updates, merge=True)
                        logger.info(f"💾 Updated Firestore for {task_id}")
                        
                        # Notify user in chat if session is active
                        # (Ideally via callback but we are in background task)
                        
                    break
                    
                elif status == "error":
                    logger.error(f"Music generation failed for {task_id}")
                    if self.db:
                         self.db.collection('music_tracks').document(task_id).update({'status': 'ERROR'})
                    break
                    
            except Exception as e:
                logger.error(f"Error polling music status: {e}")

def prewarm(proc: JobProcess):
    """Prewarm process"""
    proc.userdata["vad"] = None
async def _load_history(session_id: str, db) -> Optional[llm.ChatContext]:
    """Load chat history from Firestore"""
    if not db:
        return None
    
    try:
        doc = db.collection('meditation_sessions').document(session_id).get()
        if not doc.exists:
            return None
            
        data = doc.to_dict()
        history = data.get('chatHistory', [])
        
        chat_ctx = llm.ChatContext()
        chat_ctx.append(
            role="system",
            text="You are resuming a previous meditation session. Context from the previous conversation is provided below."
        )
        
        for msg in history:
            role = msg.get('role')
            content = msg.get('content')
            if role == 'user':
                chat_ctx.append(role="user", text=content)
            elif role == 'assistant':
                chat_ctx.append(role="assistant", text=content)
                
        return chat_ctx
    except Exception as e:
        logger.error(f"Error loading history: {e}")
        return None


async def entrypoint(ctx: JobContext):
    """Main entry point for meditation agent"""
    logger.info(f"🚀 Starting Meditation Agent for room: {ctx.room.name}")
    
    # Connect to room
    logger.info("Connecting to room...")
    await ctx.connect()
    logger.info("✅ Connected to room")
    
    # Extract user info from participant metadata
    user_id = "default_user"
    user_language = "hi"  # Default Hindi
    
    try:
        logger.info("Waiting for participant...")
        participant = await ctx.wait_for_participant()
        logger.info(f"👤 Participant joined: {participant.identity}")
        
        # Wait for metadata sync
        if not participant.metadata:
            for i in range(10):
                await asyncio.sleep(0.5)
                if participant.metadata:
                    break
        
        # Extract user info from metadata
        if participant.metadata:
            try:
                data = json.loads(participant.metadata)
                user_id = data.get("userId") or data.get("uid") or "default_user"
                
                lang_raw = str(data.get("language", "")).strip().lower()
                if lang_raw in ["hi", "hindi", "hin"]:
                    user_language = "hi"
                elif lang_raw in ["en", "english", "eng"]:
                    user_language = "en"
                
                logger.info(f"📝 User: {user_id}, Language: {user_language}")
            except Exception as e:
                logger.error(f"Error parsing metadata: {e}")
        
        # Fallback to identity
        if user_id == "default_user" and participant.identity:
            if "__" in participant.identity:
                user_id = participant.identity.split("__")[0]
            elif len(participant.identity) > 5:
                user_id = participant.identity
            logger.info(f"Using identity as userId: {user_id}")
        
        logger.info(f"Final resolved userId: {user_id}, Language: {user_language}")
        
        # Session Map fallback
        if user_id == "default_user":
            try:
                import aiohttp
                auth_server_url = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
                map_url = f"{auth_server_url}/livekit/session/{ctx.room.name}"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(map_url) as response:
                        if response.status == 200:
                            data = await response.json()
                            mapped_id = data.get("userId")
                            if mapped_id:
                                user_id = mapped_id
                                logger.info(f"✅ Found userId via session map: {user_id}")
            except Exception as e:
                logger.error(f"Session map error: {e}")
    
        # Resume Session Logic
        resume_session_id = None
        if participant.metadata:
            try:
                data = json.loads(participant.metadata)
                resume_session_id = data.get("resumeSessionId")
            except:
                pass
        
        initial_chat_context = None
        if resume_session_id:
            logger.info(f"🔄 Resuming session: {resume_session_id}")
            initial_chat_context = await _load_history(resume_session_id, db)
            if initial_chat_context:
                logger.info(f"✅ Loaded {len(initial_chat_context)} past messages")
        
    except Exception as e:
        logger.error(f"Error getting participant: {e}")

    
    # Select TTS voice based on language
    def select_meditation_tts_voice(lang: str) -> str:
        """Select TTS voice for meditation agent"""
        if lang == "hi":
            voice = os.getenv("MEDITATION_TTS_VOICE_HI") or \
                    os.getenv("TTS_VOICE_HI") or \
                    "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
        else:
            voice = os.getenv("MEDITATION_TTS_VOICE_EN") or \
                    os.getenv("TTS_VOICE_EN") or \
                    "1259b7e3-cb8a-43df-9446-30971a46b8b0" # Guruji/Indian voice
        
        logger.info(f"Selected TTS voice: {voice} for {lang}")
        return voice
    
    # Initialize STT based on language
    sarvam_key = os.getenv("SARVAM_API_KEY")
    
    if user_language == "hi" and sarvam_key:
        # Use Sarvam for Hindi
        try:
            from livekit.plugins import sarvam as sarvam_plugin
            stt = sarvam_plugin.STT()
            logger.info("Using Sarvam STT for Hindi")
        except Exception as e:
            logger.warning(f"Sarvam STT failed, using Deepgram: {e}")
            from livekit.plugins import deepgram
            stt = deepgram.STT(language="hi")
    else:
        # Use Deepgram for English
        from livekit.plugins import deepgram
        stt = deepgram.STT(language=user_language)
        logger.info(f"Using Deepgram STT for {user_language}")
    
    # Initialize TTS
    tts_voice = select_meditation_tts_voice(user_language)
    tts = inference.TTS(
        model="cartesia/sonic-3",
        voice=tts_voice,
        language=user_language
    )
    
    # Create meditation agent
    agent = DanceMeditationAgent(user_id=user_id, language=user_language)
    
    # Create session
    session = AgentSession(
        stt=stt,
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=tts,
        turn_detection=None,
        vad=ctx.proc.userdata["vad"],
    )
    
    if initial_chat_context:
        session.chat_ctx = initial_chat_context
    
    # Hook into speech events to capture history
    @session.on("user_speech_committed")
    def on_user_speech(msg: llm.ChatMessage):
        logger.info(f"🔍 DEBUG: User speech committed triggered. Type: {type(msg.content)}")
        logger.info(f"🔍 DEBUG: Content: {msg.content}")
        
        content_str = ""
        if isinstance(msg.content, str):
            content_str = msg.content
        elif isinstance(msg.content, list):
            content_str = " ".join([str(c) for c in msg.content])
        else:
            content_str = str(msg.content)

        agent.state.chat_history.append({
            "role": "user",
            "content": content_str,
            "timestamp": asyncio.get_event_loop().time()
        })
        logger.info(f"📝 Captured User Speech: {content_str}")

    @session.on("agent_speech_committed")
    def on_agent_speech(msg: llm.ChatMessage):
        logger.info(f"🔍 DEBUG: Agent speech committed triggered. Type: {type(msg.content)}")
        
        content_str = ""
        if isinstance(msg.content, str):
            content_str = msg.content
        elif isinstance(msg.content, list):
            content_str = " ".join([str(c) for c in msg.content])
        else:
            content_str = str(msg.content)

        agent.state.chat_history.append({
            "role": "assistant",
            "content": content_str,
            "timestamp": asyncio.get_event_loop().time()
        })
        logger.info(f"📝 Captured Agent Speech: {content_str}")

    # Fallback: Capture transcription directly from room
    @ctx.room.on("transcription_received")
    def on_transcription_received(segments: List[api.TranscriptionSegment], participant: api.Participant, publication: api.TrackPublication):
        if participant.identity == agent.user_id or participant.identity.startswith(agent.user_id):
            text = " ".join([seg.text for seg in segments])
            if text.strip():
                logger.info(f"🔍 DEBUG: Room transcription received: {text}")
                # Check if this is a duplicate of what session captured (naive check via timestamp or content?)
                # For now, just append if it's new. 
                # Note: this might duplicate if session event also fires.
                # But since session event isn't firing, this is safe.
                
                agent.state.chat_history.append({
                    "role": "user",
                    "content": text,
                    "timestamp": asyncio.get_event_loop().time()
                })
                logger.info(f"📝 Captured Transcription (Fallback): {text}")

    
    session.agent = agent
    
    # Start session
    await session.start(agent, room=ctx.room)
    
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
    
    # Inject publish function for music playback
    agent._publish_data_fn = ctx.room.local_participant.publish_data
    
    # Handle chat messages
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        """Handle incoming chat messages"""
        try:
            message = data_packet.data.decode('utf-8')
            logger.info(f"📩 Chat message: {message}")
            
            try:
                data = json.loads(message)
                if isinstance(data, dict):
                    message = data.get('message') or data.get('text') or message
            except json.JSONDecodeError:
                pass
            
            asyncio.create_task(session.chat(message))
        except Exception as e:
            logger.error(f"Error handling chat: {e}")
    
    # Handle metadata updates
    @ctx.room.on("participant_metadata_changed")
    def on_metadata_changed(participant, prev_metadata, **kwargs):
        """Update user ID if metadata changes mid-session"""
        if not participant.metadata:
            return
        
        try:
            data = json.loads(participant.metadata)
            new_user_id = data.get("userId")
            
            if new_user_id and new_user_id != "default_user" and new_user_id != agent.user_id:
                logger.info(f"🔄 User ID updated: {agent.user_id} → {new_user_id}")
                agent.user_id = new_user_id
                agent.state.user_id = new_user_id
        except Exception as e:
            logger.error(f"Error updating metadata: {e}")
    
    # Send welcome message
    welcome_messages = {
        "hi": "प्रणाम। मैं ध्यान गुरु का AI स्वरूप हूँ। मेरी मूल शिक्षाएं श्वास जागरूकता, "
        "आंतरिक शांति के लिए शारीरिक गति और नृत्य ध्यान पर केंद्रित हैं। आज मैं आपको भीतर ले जाने में कैसे मदद कर सकता हूँ?",
        "en": "Namaste. I am the AI manifestation of the Meditation Master. My core teachings focus on breath awareness, "
        "somatic movement for inner peace, and dance meditation. How may I help center your presence today?"
    }
    
    welcome = welcome_messages.get(user_language, welcome_messages["en"])
    logger.info(f"🗣️ Attempting to say welcome message: {welcome}")
    
    # Set session start time
    agent.state.session_start = asyncio.get_event_loop().time()
    
    await session.say(welcome)
    logger.info("✅ Welcome message sent")
    
    # Handle disconnection
    @ctx.room.on("disconnected")
    def on_disconnected(reason):
        logger.info(f"Room disconnected: {reason}")
        if agent.state.session_start:
            asyncio.create_task(agent._save_session())


if __name__ == "__main__":
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "meditation-agent")
    logger.info(f"Starting agent: {agent_name}")
    
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
        max_retry=5,
    ))

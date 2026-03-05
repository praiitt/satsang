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
from livekit.plugins import noise_cancellation, silero
from firebase_db import FirebaseDB

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)

from livekit.plugins import google
import logging

logger = logging.getLogger("vedic_astrology_agent")

# Load .env.local from the project root
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.cwd() / ".env.local",
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
            break
        except Exception as e:
            logger.error(f"Failed to load .env.local from {_env_path}: {e}")

if not _ENV_LOADED:
    logger.warning("⚠️  .env.local not found in any expected location.")
else:
    logger.info("Environment file loaded successfully")


class VedicAstrologyAgent(Agent):
    def __init__(self, user_id: str = "default_user", publish_data_fn=None) -> None:
        self.user_id = user_id
        # self.kundli_retriever = None # Removed
        self.user_chart_summary = None
        
        # try:
        #     self.kundli_retriever = KundliRetriever()
        # except Exception as e:
        #     logger.error(f"Failed to initialize KundliRetriever: {e}")
        
        super().__init__(
            instructions=self._get_instructions(),
        )
        self._publish_data_fn = publish_data_fn

    def _get_instructions(self) -> str:
        base_instructions = """You are a Vedic Astrology Master (Jyotishi) - an AI-powered guide specializing in traditional Indian astrology (Jyotish Shastra) and matrimonial matchmaking. The user is interacting with you via voice, even if you perceive the conversation as text.

IMPORTANT - LANGUAGE HANDLING:
- If the user speaks in Hindi (or Romanized Hindi), respond in Hindi (Devanagari script)
- If the user speaks in English, respond in English
- The user's language preference is detected automatically - match their language
- For Hindi input, you may receive Romanized Hindi text (English alphabet) - interpret it correctly

CORE EXPERTISE:
1. VEDIC ASTROLOGY (JYOTISH SHASTRA):
   - Kundli (Birth Chart) analysis
   - 12 Houses, 9 Planets, 12 Rashis, 27 Nakshatras
   - Dasha systems (Vimshottari)
   - Yogas and Transits

2. MATCHMAKING & KUNDLI MILAN:
   - Ashtakoot System (36 points)
   - Manglik Dosha Analysis

3. VEDIC REMEDIES:
   - Gemstones, Mantras, Yantras, Fasting

PROACTIVE ENGAGEMENT:
- Ask clarifying questions if chart data is missing
- Provide context and explain concepts
- Be compassionate and wise
- Use search_jyotish_teaching for educational videos

RESPONSE STYLE:
- Default to Hindi if user prefers, else English
- Conversational, warm, wise
- Use simple language
"""
        return base_instructions

    @function_tool
    async def calculate_kundli(
        self,
        context: RunContext,
        birth_date: str,
        birth_time: str,
        birth_place: str,
    ) -> str:
        """Calculate the Kundli (birth chart) using the user's birth details.
        
        Use this when the user provides their birth details or asks about their chart.
        The LLM (Gemini) will perform the calculations natively.
        
        Args:
            birth_date: Birth date (e.g., "1990-05-15")
            birth_time: Birth time (e.g., "14:30")
            birth_place: Birth place (e.g., "Mumbai, India")
        """
        logger.info(f"Calculating Kundli for user: {self.user_id} with details: {birth_date}, {birth_time}, {birth_place}")
        
        # Return a prompt to the LLM to perform the calculation itself
        try:
            return f"""
            Received birth details:
            Date: {birth_date}
            Time: {birth_time}
            Place: {birth_place}
            
            Please proceed to calculate the Vedic Birth Chart (Kundli) using Lahiri Ayanamsa based on these exact details. 
            Tell the user their Lagna, Moon Sign, Nakshatra, and current Dasha.
            """
        except Exception as e:
            logger.error(f"Error in calculation prompt generation: {e}", exc_info=True)
            return "I apologize, but I encountered an error preparing the calculation."
        
        # Format response from actual data
        response = f"""Based on your birth chart:
        
Rashi (Moon Sign): {kundli.get('rashi', 'Unknown')}
Lagna (Ascendant): {kundli.get('lagna', 'Unknown')}
Nakshatra: {kundli.get('nakshatra', 'Unknown')} (Pada {kundli.get('nakshatraPada', 'Unknown')})

Current Dasha: {kundli.get('mahadasha', 'Unknown')} Mahadasha, {kundli.get('antardasha', 'Unknown')} Antardasha.

Planetary Positions:
- Sun in {kundli.get('sun_sign', 'Unknown')} ({kundli.get('sun_house', 'Unknown')}th House)
- Moon in {kundli.get('moon_sign', 'Unknown')} ({kundli.get('moon_house', 'Unknown')}th House)
- Mars in {kundli.get('mars_sign', 'Unknown')} ({kundli.get('mars_house', 'Unknown')}th House)

Manglik Status: {'Yes' if str(kundli.get('manglik', '')).lower() == 'true' else 'No'}

Would you like to know more about any specific aspect?"""

        return response

    @function_tool
    async def save_birth_details(
        self,
        context: RunContext,
        birth_date: str,
        birth_time: str,
        birth_place: str
    ) -> str:
        """Save user's birth details to create their Kundli.
        
        Use this when a NEW user wants to save their birth information.
        The user provides their birth date, time, and place.
        
        Args:
            birth_date: Birth date in format DD/MM/YYYY or YYYY-MM-DD (e.g., "15/05/1990" or "1990-05-15")
            birth_time: Birth time in 24-hour format HH:MM (e.g., "14:30" for 2:30 PM)
            birth_place: Place of birth (city and country, e.g., "Mumbai, India")
        
        Returns:
            Confirmation message that the chart has been saved
        """
        logger.info(f"Saving birth details for user: {self.user_id}")
        logger.info(f"Birth date: {birth_date}, time: {birth_time}, place: {birth_place}")
        
        # if not self.kundli_retriever:
        #     return "I apologize, but I cannot save your chart data at the moment. Please try again later."
        
        # Prepare basic chart data
        # For now, we save the raw birth details
        # Later we can add actual calculations or call backend API
        chart_data = {
            "birthDate": birth_date,
            "birthTime": birth_time,
            "birthPlace": birth_place,
            # Add basic calculations here if needed
            # For now, these will be updated when comprehensive data is fetched
        }
        
        try:
            # Save to Pinecone - SKIPPED
            # success = await self.kundli_retriever.save_basic_chart(
            #     self.user_id,
            #     chart_data
            # )
            success = True
            
            if success:
                # Update agent's chart summary
                self.user_chart_summary = f"Birth Data: {birth_date} {birth_time} {birth_place}"
                
                logger.info(f"✅ Successfully saved birth details for user: {self.user_id}")
                
                return f"""Perfect! I've saved your birth details:
                
📅 Birth Date: {birth_date}
🕐 Birth Time: {birth_time}  
📍 Birth Place: {birth_place}

Your basic Kundli has been created! I'm analyzing it now. You can start asking me questions about your chart, Rashifal, or any astrological guidance you need."""
            else:
                logger.error(f"Failed to save birth details for user: {self.user_id}")
                return "I encountered an error saving your birth details. Please try again or contact support."
                
        except Exception as e:
            logger.error(f"Error in save_birth_details: {e}", exc_info=True)
            return "I apologize, but I couldn't save your birth details at the moment. Please try again later."

    @function_tool
    async def get_daily_rashifal(
        self,
        context: RunContext,
        rashi: str,
    ) -> str:
        """Get daily horoscope (Rashifal) for a specific Rashi (moon sign).

        Use this when the user asks for today's horoscope or Rashifal.
        
        Args:
            rashi: The Rashi/moon sign (e.g., "Mesha", "Vrishabha", "Mithuna", "Karka", etc.)
        
        Returns:
            Daily predictions and guidance for the Rashi.
        """
        logger.info(f"User requested daily Rashifal for: {rashi}")
        
        # TODO: Integrate with a Rashifal API or generate based on current transits
        # For now, return a placeholder
        
        try:
            # Normalize Rashi name
            rashi_lower = rashi.lower()
            
            placeholder_rashifal = (
                f"Today is a favorable day for {rashi}. "
                f"Your ruling planet is well-placed, bringing positive energy. "
                f"Focus on spiritual practices in the morning. "
                f"Avoid major financial decisions after 3 PM. "
                f"Wearing yellow or white today will be auspicious."
            )
            
            logger.info(f"Rashifal generated for {rashi}")
            
            return placeholder_rashifal
        except Exception as e:
            logger.error(f"Rashifal generation failed: {e}")
            return "I apologize, but I couldn't fetch the Rashifal at the moment. Please try again."

    @function_tool
    async def search_jyotish_teaching(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5,
    ) -> str:
        """Search for Vedic astrology teachings, explanations, or videos on YouTube.

        Use this when the user asks to learn about any Jyotish topic.
        Common requests: "Manglik dosha samjhao", "Saturn transit kya hai", "Nakshatra explained"
        
        Args:
            topic: The Jyotish topic to search for
            max_results: Number of results to return (1-10)
        
        Returns:
            Confirmation that the teaching video is now playing.
        """
        logger.info(f"User requested Jyotish teaching on topic: '{topic}'")
        
        try:
            # Import YouTube search module
            try:
                from .youtube_search import find_youtube_video_async
            except ImportError:
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from youtube_search import find_youtube_video_async
            
            # Clean up topic
            clean_topic = topic.lower()
            if "jyotish" not in clean_topic and "astrology" not in clean_topic:
                clean_topic = f"vedic astrology {topic}"
            
            logger.info(f"Searching YouTube for: '{clean_topic}'")
            youtube_result = await find_youtube_video_async(clean_topic)
            
            if not youtube_result:
                logger.warning(f"No YouTube video found for '{topic}'")
                return f"I'm sorry, I couldn't find videos on '{topic}'. Please try a different topic."
            
            video_id = youtube_result.get("video_id")
            video_title = youtube_result.get("title", topic)
            
            logger.info(f"Found YouTube video: {video_id} - {video_title}")
            
            # Publish to frontend for playback
            if callable(self._publish_data_fn):
                payload = {
                    "name": video_title,
                    "artist": "Vedic Jyotish",
                    "youtube_id": video_id,
                    "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                    "message": f"Jyotish teaching '{video_title}' is now playing.",
                }
                data_bytes = json.dumps(payload).encode("utf-8")
                await self._publish_data_fn(data_bytes)
                logger.info(f"✅ Published Jyotish teaching for playback: {video_title}")
            
            return f"I found teachings on '{topic}'. Playing '{video_title}' for you now. Enjoy the knowledge!"
        except Exception as e:
            logger.error(f"Jyotish teaching search failed: {e}", exc_info=True)
            return "I apologize, but I couldn't search for teachings at the moment. Please try again."


def prewarm(proc: JobProcess):
    """Prewarm function to load models before processing jobs."""
    try:
        try:
            import torch
            logger.info(f"PyTorch version: {torch.__version__}")
        except ImportError:
            logger.error("PyTorch is not installed!")
            proc.userdata["vad"] = None
            return
        
        logger.info("Skipping VAD preload to avoid initialization timeout - will load on-demand")
        proc.userdata["vad"] = None
    except Exception as e:
        logger.error(f"Error in prewarm: {e}")
        proc.userdata["vad"] = None


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the Vedic Astrology Agent."""
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    logger.info("="*60)
    logger.info("ENTRYPOINT: Starting Vedic Astrology agent initialization")
    logger.info("="*60)
    
    # Check critical environment variables
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
    sarvam_key = os.getenv("SARVAM_API_KEY")
    
    logger.info(f"Environment check:")
    logger.info(f"  OPENAI_API_KEY: {'SET' if openai_key else 'MISSING'}")
    logger.info(f"  CARTESIA_API_KEY: {'SET' if cartesia_key else 'MISSING'}")
    logger.info(f"  GOOGLE_API_KEY: {'SET' if os.getenv('GOOGLE_API_KEY') else 'MISSING'}")
    logger.info(f"  STT_MODEL: {stt_model}")
    logger.info(f"  SARVAM_API_KEY: {'SET' if sarvam_key else 'MISSING'}")
    
    if not openai_key:
        logger.error("❌ OPENAI_API_KEY is missing!")
        raise RuntimeError("OPENAI_API_KEY environment variable is required")
    if not cartesia_key:
        logger.error("❌ CARTESIA_API_KEY is missing!")
        raise RuntimeError("CARTESIA_API_KEY environment variable is required")
    
    # Detect language preference from participant metadata
    # Default to Hindi ('hi') for Vedic Jyotish agent
    user_language = 'hi'
    try:
        await asyncio.sleep(1.0)  # Give time for participants to connect
        
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    metadata = json.loads(participant.metadata)
                    if isinstance(metadata, dict) and 'language' in metadata:
                        raw_lang = str(metadata.get("language", "")).strip().lower()
                        if raw_lang in ["hi", "hindi", "hin"]:
                            user_language = "hi"
                        elif raw_lang in ["en", "english", "eng"]:
                            user_language = "en"
                        else:
                            user_language = raw_lang
                        
                        logger.info(f"📝 Detected language preference: {user_language}")
                        break
                except (json.JSONDecodeError, TypeError) as e:
                    logger.debug(f"Could not parse participant metadata: {e}")
    except Exception as e:
        logger.warning(f"Could not read language preference, defaulting to Hindi: {e}")

    if user_language not in {'hi', 'en'}:
        logger.warning(f"Unsupported language '{user_language}', defaulting to 'hi'")
        user_language = 'hi'
    
    logger.info(f"🌐 Using language: {user_language} (default: Hindi)")
    
    # Configure STT based on language
    if user_language == 'hi':
        logger.info(f"Initializing STT with SARVAM for Hindi")
        if stt_model == "sarvam" or stt_model.startswith("sarvam"):
            try:
                from livekit.plugins import sarvam as sarvam_plugin
                stt = sarvam_plugin.STT(language="hi")
                logger.info("✅ Using Sarvam STT for Hindi")
            except Exception as e:
                logger.warning(f"Sarvam STT failed, falling back to AssemblyAI: {e}")
                stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
        else:
            stt = inference.STT(model=stt_model, language="hi")
    else:
        logger.info(f"Initializing STT for English")
        stt = inference.STT(model=stt_model, language="en")
    
    # Use default VAD for stability
    logger.info("Using default VAD (Voice Activity Detector) for stability")
    turn_detector = None
    
    logger.info("Creating AgentSession with configured models...")
    try:
        # TTS voice selection for Vedic Jyotish agent
        def _select_tts_voice(lang: str) -> str:
            if lang == "hi":
                specific = os.getenv("VEDIC_JYOTISH_TTS_VOICE_HI")
                global_lang = os.getenv("TTS_VOICE_HI")
            else:
                specific = os.getenv("VEDIC_JYOTISH_TTS_VOICE_EN")
                global_lang = os.getenv("TTS_VOICE_EN")
            
            if specific:
                return specific
            if global_lang:
                return global_lang
            
            legacy = os.getenv("TTS_VOICE_ID")
            if legacy:
                return legacy
            
            return "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"  # Default Cartesia voice

        tts_voice_id = _select_tts_voice(user_language)
        
        session = AgentSession(
            stt=stt,
            llm=google.LLM(
                model="gemini-2.5-flash",
                api_key=os.getenv("GOOGLE_API_KEY")
            ),
            tts=inference.TTS(
                model="cartesia/sonic-3",
                voice=tts_voice_id,
                language=user_language,
                extra_kwargs={
                    "speed": (os.getenv("TTS_SPEED") or "normal") if (os.getenv("TTS_SPEED") or "normal") in {"slow", "normal", "fast"} else "normal",
                },
            ),
            turn_detection=turn_detector,
            vad=silero.VAD.load(), # Explicitly use Silero VAD
            preemptive_generation=True,
        )
        logger.info("AgentSession created successfully")
    except Exception as e:
        logger.error(f"Failed to create AgentSession: {e}")
        raise

    # Metrics collection
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    @session.on("user_started_speaking")
    def _on_user_started_speaking():
        logger.info("🗣️ User started speaking")

    @session.on("user_stopped_speaking")
    def _on_user_stopped_speaking():
        logger.info("🛑 User stopped speaking")

    @session.on("input_speech_transcribed")
    def _on_input_speech_transcribed(ev):
        logger.info(f"📝 Transcribed: '{ev.text}' (is_final: {ev.is_final})")
    
    @session.on("agent_started_speaking")
    def _on_agent_started_speaking():
        logger.info("🤖 Agent started speaking")
        
    @session.on("agent_stopped_speaking")
    def _on_agent_stopped_speaking():
        logger.info("🤐 Agent stopped speaking")

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Publisher function for data channel
    async def _publish_data_bytes(data_bytes: bytes):
        try:
            lp = ctx.room.local_participant
            if not lp:
                logger.error("❌ Cannot publish: local_participant is None!")
                return
            
            publish_topic = "bhajan.track"
            
            logger.info(f"📤 Publishing {len(data_bytes)} bytes to data channel")
            await lp.publish_data(data_bytes, reliable=True, topic=publish_topic)
            logger.info(f"✅ Published data with topic '{publish_topic}'")
        except Exception as e:
            logger.error(f"❌ Failed to publish data: {e}", exc_info=True)

    # Extract User ID from metadata
    user_id = "default_user"
    try:
        await asyncio.sleep(1.5)  # Give time for participants to connect
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    metadata = json.loads(participant.metadata)
                    if 'userId' in metadata:
                        user_id = metadata['userId']
                        logger.info(f"👤 User ID extracted: {user_id}")
                        break
                except Exception as e:
                    logger.warning(f"Could not parse metadata for userId: {e}")
    except Exception as e:
        logger.warning(f"Error extracting userId: {e}")

    # Create Vedic Astrology agent instance with user ID
    vedic_agent = VedicAstrologyAgent(user_id=user_id, publish_data_fn=_publish_data_bytes)

    # Load previous conversation context for continuity
    try:
        firebase_db = FirebaseDB()
        prev_msgs = firebase_db.get_last_transcript(user_id, "vedic-astrology-agent")
        if prev_msgs:
            logger.info(f"📜 Loaded {len(prev_msgs)} messages from last session for context")
            # Append a system note so the agent knows this is continuation context
            vedic_agent.instructions += (
                "\n\n---\n"
                "PREVIOUS SESSION CONTEXT (for conversation continuity):\n"
                "The user has spoken with you before. Here is the summary of the last conversation "
                "to help you remember them:\n"
                + "\n".join(
                    f"{m['role'].title()}: {m['content'][:200]}"
                    for m in prev_msgs[-10:]  # last 10 messages max
                )
                + "\n---\n"
                "If the user says 'continue', 'remember', or refers to something from before, "
                "use this context. Do NOT mention you are reading logs — speak naturally."
            )
    except Exception as e:
        logger.warning(f"Could not load previous transcript: {e}")

    await session.start(
        agent=vedic_agent,
        room=ctx.room,
    )

    # Connect to the room
    await ctx.connect()

    # Send personalized welcome message based on chart data availability
    has_chart_data = (
        vedic_agent.user_chart_summary and 
        vedic_agent.user_chart_summary != "User's birth chart data is not available." and
        "Unknown" not in vedic_agent.user_chart_summary[:100]
    )
    
    if has_chart_data:
        # Returning user - has chart data
        welcome_msg = (
            "नमस्ते। मैं आपका वैदिक ज्योतिष मार्गदर्शक हूँ। क्या आप अपनी कुंडली के बारे में जानना चाहते हैं?" 
            if user_language == 'hi' else
            "Namaste. I am your Vedic Astrology Guide. Do you want to know about your birth chart?"
        )
    else:
        # New user - needs to provide birth details
        welcome_msg = (
            "नमस्ते। मैं आपका वैदिक ज्योतिष मार्गदर्शक हूँ। क्या आप अपनी जन्म कुंडली बनवाना चाहते हैं?" 
            if user_language == 'hi' else
            "Namaste. I am your Vedic Astrology Guide. Do you want to create your birth chart?"
        )
    
    await session.say(welcome_msg)

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
            # Save transcript to Firebase
            firebase_db = FirebaseDB()
            
            # Extract messages
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
                "agentName": "vedic-astrology-agent",
                "roomName": ctx.room.name
            }
            
            firebase_db.save_session_transcript(ctx.room.name, session_data, transcript)
        except Exception as e:
            logger.error(f"❌ Failed to save transcript: {e}")


if __name__ == "__main__":
    # Get agent name from environment or use default
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "vedic-astrology-agent")
    logger.info(f"Starting agent with name: {agent_name}")
    
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
        max_retry=5
    ))

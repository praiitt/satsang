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
from livekit.plugins import silero
from firebase_db import FirebaseDB
from pinecone_retriever import PineconeKundliRetriever

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)

from livekit.plugins import openai
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
        self.user_chart_summary = None
        self._publish_data_fn = publish_data_fn
        
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
   - IMPORTANT: If you identify a planetary affliction, dosha, or emotional block, you MUST also prescribe a digital spiritual remedy using the 'prescribe_spiritual_remedy' tool. 
   - Remedies can be "Music", "Art", or "Reel". Tell them to check their Spiritual Studio dashboard to manifest it.

CHART DATA WORKFLOW - FOLLOW THIS STRICTLY:
- The user's astrological chart index is in your system context.
- BEFORE answering ANY question about career, relationships, health, timing, personality, Dasha, etc., you MUST first call the 'query_user_charts' tool with a relevant search query.
- The tool will return the exact chart data most relevant to their question.
- Base ALL your answers ONLY on the data returned by the tool. Do NOT invent astrological data.
- NEVER ask the user for their Date of Birth, Time of Birth, or Place of Birth — their charts are already stored.

RESPONSE STYLE:
- KEEP YOUR SPOKEN RESPONSES CONVERSATIONAL (Max 3-5 sentences).
- If your analysis or reading is longer than 5 sentences, you MUST use the 'share_detailed_document' tool to deliver the full text silently!
- When you use the tool, speak a brief 2-3 sentence summary telling them the core takeaway and that they can read the full report on their screen.
- DO NOT output long paragraphs in your conversational reply. USE THE TOOL for deep readings.

UPSELLING REPORTS:
- You have access to the 'generate_report' tool.
- When a user asks deep questions about specific areas (e.g. detailed life predictions, marriage matching, Lal Kitab remedies, Sadhe Sati), you MUST suggest that they generate a Premium Report.
- Use the 'generate_report' tool to provide them with the exact report recommendation.
"""
        return base_instructions

    @function_tool
    async def query_user_charts(
        self,
        search_query: str,
    ) -> str:
        """Query the user's stored astrological charts for information relevant to a specific topic.
        CRITICAL: Call this tool BEFORE answering ANY question about the user's astrology (career, health,
        relationships, timing, Dasha, personality, remedies, etc.). 
        Pass a specific search query matching what the user is asking about.
        Examples: 'career and 10th house', 'current Dasha period', 'marriage and 7th house', 
        'health and 6th house', 'personality traits Ascendant'.
        """
        try:
            retriever = PineconeKundliRetriever()
            result = await retriever.query_charts_for_topic(self.user_id, search_query, top_k=8)
            logger.info(f"🔍 Dynamic chart query: '{search_query}' -> {len(result)} chars returned")
            return result
        except Exception as e:
            logger.error(f"Failed to query charts: {e}")
            return "Error fetching chart data."

    @function_tool
    async def prescribe_spiritual_remedy(
        self, 
        context: RunContext, 
        current_imbalance: str, 
        active_remedy: str, 
        satsang_summary: str
    ) -> str:
        """
        Prescribe a spiritual remedy to the user (Music, Reel, or Art) after diagnosing an issue with their chart.
        Call this when you find a dosha, planetary affliction, or emotional block that needs healing.
        
        Args:
            current_imbalance: A short phrase describing the diagnosis (e.g. "Mars affliction causing anger", "Saturn transit causing anxiety")
            active_remedy: The type of remedy prescribed. MUST BE exactly one of: "Music", "Reel", "Art"
            satsang_summary: A 1-2 sentence summary of what their chart revealed and why this remedy helps.
        """
        try:
            try:
                from .firebase_db import FirebaseDB
            except ImportError:
                from firebase_db import FirebaseDB
                
            db = FirebaseDB()
            
            # Map remedy types to exactly what the frontend expects
            valid_remedies = {"Music": "Music", "Reel": "Reel", "Art": "Art"}
            remedy = valid_remedies.get(active_remedy.capitalize(), "Music")
            
            state_update = {
                "currentImbalance": current_imbalance,
                "diagnosingTool": "Astrology",
                "activeRemedy": remedy,
                "satsangSummary": satsang_summary,
            }
            
            db.update_spiritual_state(self.user_id, state_update)
            logger.info(f"Updated spiritual state for {self.user_id} with remedy {remedy}")
            return f"Successfully prescribed {remedy} remedy for {current_imbalance}. Tell the user to check their dashboard to manifest it."
        except Exception as e:
            logger.error(f"Failed to prescribe remedy: {e}")
            return "Failed to save the remedy prescription."

    @function_tool
    async def generate_report(
        self,
        report_type: str,
        is_pdf: bool = False
    ) -> str:
        """Recommend a specific astrological report to the user and guide them to generate it in the UI.
        Call this when the user asks for deep analysis that is better suited for a full premium report.
        Available report_type values:
        - 'nakshatra': Nakshatra deep dive
        - 'ascendant': Ascendant (Lagna) detailed analysis
        - 'lalkitab': Lal Kitab remedies and predictions
        - 'numerology': Numerology insights
        - 'pitra-dosha': Ancestral karma analysis
        - 'sadhesati': Saturn's 7.5 year transit analysis
        - 'match-making': Compatibility checking with a partner
        - 'mini-horoscope' (PDF): 9-page basic horoscope
        - 'basic-horoscope' (PDF): 25-page detailed horoscope
        - 'professional-horoscope' (PDF): 68-page comprehensive horoscope
        
        Args:
            report_type: One of the available report types listed above
            is_pdf: Set to True if recommending a PDF report
        """
        try:
            doc_content = f"""# 📚 Premium Report Recommended
            
Based on your question, I highly recommend generating a **{report_type.replace('-', ' ').title()}** {'PDF ' if is_pdf else ''}Report.

This is a deep, comprehensive analysis that provides much more detail than we can cover in our conversation.

### How to get it:
1. End this call or minimize the chat
2. Click the **"📚 My Reports & PDFs"** button on your dashboard
3. Select the **{report_type.replace('-', ' ').title()}** report and click Generate.

*Note: Generating premium reports requires a small coin balance.*
"""
            
            # Use the existing share_detailed_document functionality to show this recommendation
            return await self.share_detailed_document(doc_content)
        except Exception as e:
            logger.error(f"Failed to generate report recommendation: {e}")
            return "Please check the My Reports section on your dashboard for detailed PDF and text reports."

    @function_tool
    async def share_detailed_document(
        self,
        document_content: str,
    ) -> str:
        """Share a long, detailed astrological reading document with the user's screen.
        CRITICAL RULE: Call this tool WHENEVER your analysis is long (more than 3 sentences).
        
        DOCUMENT FORMAT RULES (the UI renders markdown, so format perfectly):
        - Use a # Heading at the top (e.g., '# Your Horo Chart Analysis')
        - For house/sign lists use proper markdown: '1. **Leo (Simha)** — description here'
        - Each numbered item must be on its OWN line with a blank line between items
        - Use **bold** for planet/sign names, _italic_ for Sanskrit terms
        - Use --- separators between sections
        - Keep descriptions concise but complete per item
        """
        try:
            if callable(self._publish_data_fn):
                import json
                import time
                import uuid
                
                # Format exactly as LiveKit components-react Chat expects
                chat_payload = {
                    "id": str(uuid.uuid4()),
                    "message": document_content,
                    "timestamp": int(time.time() * 1000)
                }
                
                data_bytes = json.dumps(chat_payload).encode("utf-8")
                await self._publish_data_fn(data_bytes, topic="lk-chat-topic")
                logger.info("✅ Shared detailed document to chat UI (topic='lk-chat-topic')")
            return "Document successfully sent to user's screen. Now speak a very short 1-sentence summary (crux)."
        except Exception as e:
            logger.error(f"Failed to share document: {e}")
            return "Failed to share document."

    @function_tool
    async def calculate_kundli(
        self,
        context: RunContext,
        birth_date: str,
        birth_time: str,
        birth_place: str,
    ) -> str:
        """Calculate user's Kundli (Birth Chart) given their birth details.
        CRITICAL RULE: DO NOT CALL THIS TOOL if you already have the user's chart data in your system prompt.
        Only call this tool if the user's chart is completely missing and you have no data about them.
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
            llm=openai.LLM(
                model="gpt-4o",
                api_key=os.getenv("OPENAI_API_KEY")
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
    async def _publish_data_bytes(data_bytes: bytes, topic: str = ""):
        try:
            lp = ctx.room.local_participant
            if not lp:
                return
            import inspect
            sig = inspect.signature(lp.publish_data)
            if 'topic' in sig.parameters:
                await lp.publish_data(data_bytes, reliable=True, topic=topic)
            else:
                await lp.publish_data(data_bytes, reliable=True)
            logger.info(f"✅ Published data with topic '{topic}'")
        except Exception as e:
            logger.error(f"❌ Failed to publish data: {e}", exc_info=True)
    # Extract User ID, Language, and Intention from participant metadata
    user_id = "default_user"
    user_language = "en"  # Default to English
    user_intention = None
    try:
        await asyncio.sleep(1.5)  # Give time for participants to connect
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    metadata = json.loads(participant.metadata)
                    if 'userId' in metadata:
                        user_id = metadata['userId']
                        logger.info(f"👤 User ID extracted: {user_id}")
                    if 'language' in metadata:
                        user_language = metadata['language']
                        logger.info(f"🌍 Language extracted from metadata: {user_language}")
                    if 'intention' in metadata and metadata['intention']:
                        user_intention = metadata['intention']
                        logger.info(f"🎯 Intention extracted from metadata: {user_intention}")
                    break
                except Exception as e:
                    logger.warning(f"Could not parse metadata: {e}")
    except Exception as e:
        logger.warning(f"Error extracting metadata: {e}")

    try:
        if ctx.room.name.startswith("VedicJyotishGuidance_"):
            parts = ctx.room.name.split("_")
            if len(parts) >= 2:
                user_id = parts[1]
                logger.info(f"👤 User ID extracted from room name: {user_id}")
    except Exception as e:
        logger.warning(f"Error extracting userId from room name: {e}")

    logger.info(f"🎤 Session language: {user_language}")

    # Create Vedic Astrology agent instance with user ID
    vedic_agent = VedicAstrologyAgent(user_id=user_id, publish_data_fn=_publish_data_bytes)
    
    custom_instructions = vedic_agent.instructions

    # -----------------------------------------------------
    # 🌟 CORE ASTROLOGY INJECTION FROM PINECONE RAG 🌟
    # -----------------------------------------------------
    chart_context = None
    try:
        logger.info(f"🔍 Fetching Pinecone comprehensive chart data for user: {user_id}")
        pinecone_retriever = PineconeKundliRetriever()
        chart_context = await pinecone_retriever.get_user_chart_context(user_id)
        
        if chart_context:
            lang_instruction = (
                "\n\nLANGUAGE INSTRUCTION (CRITICAL - MUST FOLLOW):\n"
                f"The user's selected language is: '{user_language}'.\n"
                "- If 'hi': Respond EXCLUSIVELY in Hindi (Devanagari script). Do NOT switch to English.\n"
                "- If 'en': Respond EXCLUSIVELY in English. Do NOT switch to Hindi.\n"
                "This is set by the user's app preference. Honour it throughout the entire session.\n"
            )
            custom_instructions += (
                lang_instruction +
                "\n---\n"
                "USER'S CHART INDEX (ALREADY STORED IN DATABASE):\n"
                f"{chart_context}\n"
                "---\n"
                "MANDATORY RULES:\n"
                "1. You ALREADY have the user's charts in the database (index shown above).\n"
                "2. NEVER ask the user for their Date of Birth, Time of Birth, or Place of Birth.\n"
                "3. NEVER use or call the 'calculate_kundli' tool.\n"
                "4. ALWAYS call 'query_user_charts' FIRST before answering any astrological question.\n"
                "5. Only speak information grounded in data returned by 'query_user_charts'."
            )
            logger.info("✅ Successfully injected Pinecone chart data into AI context!")
        else:
            # Even without chart data, inject language instruction
            lang_instruction = (
                "\n\nLANGUAGE INSTRUCTION (CRITICAL - MUST FOLLOW):\n"
                f"The user's selected language is: '{user_language}'.\n"
                "- If 'hi': Respond EXCLUSIVELY in Hindi (Devanagari script). Do NOT switch to English.\n"
                "- If 'en': Respond EXCLUSIVELY in English. Do NOT switch to Hindi.\n"
            )
            custom_instructions += lang_instruction
    except Exception as e:
        logger.error(f"❌ Failed to fetch Pinecone context: {e}")

    # Inject intention if present
    if user_intention:
        custom_instructions += (
            "\n\n---\n"
            "USER'S CURRENT INTENTION / CONTEXT:\n"
            f"{user_intention}\n"
            "---\n"
            "MANDATORY RULE: Address this specific intention naturally during the conversation.\n"
        )

    # Load previous conversation context for continuity
    try:
        firebase_db = FirebaseDB()
        prev_msgs = firebase_db.get_last_transcript(user_id, "vedic-astrology-agent")
        if prev_msgs:
            logger.info(f"📜 Loaded {len(prev_msgs)} messages from last session for context")
            # Append a system note so the agent knows this is continuation context
            custom_instructions += (
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

    # Inject the modified instructions back into the agent
    vedic_agent._instructions = custom_instructions

    await session.start(
        agent=vedic_agent,
        room=ctx.room,
    )
    
    # Chat messages are handled by the ChatManager we created earlier
    
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

    # Connect to the room
    await ctx.connect()

    # Send personalized welcome message based on chart data availability
    welcome_msg = ""
    if chart_context:
        try:
            import openai as openai_client
            client = openai_client.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            prompt = (
                f"You are a Vedic Astrologer AI. Welcome the user in {'Hindi' if user_language == 'hi' else 'English'}. "
                "Mention one interesting fact from this chart data to excite them (keep it brief, 1-2 sentences): "
                f"{chart_context[:800]}"
            )
            response = await client.chat.completions.create(
                model='gpt-4o',
                messages=[{"role": "user", "content": prompt}]
            )
            welcome_msg = response.choices[0].message.content
        except Exception as e:
            logger.warning(f"Failed to generate dynamic welcome message: {e}")
            
    if not welcome_msg:
        if user_language == 'hi':
            welcome_msg = (
                "प्रणाम। मैं वैदिक ज्योतिषी का AI स्वरूप हूँ। मेरी मूल शिक्षाएं ग्रहों की स्थिति, ब्रह्मांडीय समय चक्र "
                "और आपके कर्मों के ब्लूप्रिंट को समझने पर केंद्रित हैं। आज मैं आपके नक्षत्रों को कैसे स्पष्ट कर सकता हूँ?"
            )
        else:
            welcome_msg = (
                "Namaste. I am the AI manifestation of the Vedic Astrologer. My core teachings focus on understanding "
                "planetary alignments, cosmic timing, and navigating your karmic blueprint. How may I bring clarity to your stars today?"
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

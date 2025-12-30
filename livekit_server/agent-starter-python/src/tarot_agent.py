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
    inference,
    metrics,
    function_tool,
    RunContext,
    cli,
    WorkerOptions,
)



# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)

logger = logging.getLogger("tarot_agent")

# Log module import
import sys
logger.info("="*60)
logger.info(f"MODULE IMPORT: tarot_agent.py is being imported (PID: {os.getpid()})")
logger.info("="*60)

# Load .env.local
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.cwd() / ".env.local",
    Path("/home/underlitigationcom/satsang/livekit_server/agent-starter-python/.env.local"),
]
_ENV_LOADED = False
for _env_path in _ENV_PATHS:
    if _env_path.exists():
        try:
            load_dotenv(str(_env_path), override=True)
            _ENV_LOADED = True
            break
        except Exception:
            pass

if not _ENV_LOADED:
    logger.error("⚠️  .env.local not found!")

class TarotAgent(Agent):
    def __init__(self, is_group_conversation: bool = False, publish_data_fn=None) -> None:
        super().__init__(
            instructions="""You are a mystical and empathetic Tarot Reader. You connect with the user's energy to reveal hidden truths through the cards.
            
            CORE BEHAVIOR:
            1.  **Welcome**: Greet the user with a mystical tone. "Welcome, seeker. The cards are waiting."
            2.  **Ask for Reading Type**: 
                - For general guidance: Ask if they seek insights on Love, Career, or Finance
                - For yes/no questions: They can ask direct questions like "Will I get the job?"
            3.  **Draw Cards**: 
                - For general readings: Use `draw_tarot_cards` tool with topic (love/career/finance)
                - For yes/no questions: Use `get_yes_no_answer` tool with their question
            4.  **Interpret**: Read the cards with deep meaning and mystical insight. Connect the symbolism to their life.
            
            READING TYPES:
            - **General Predictions**: 3-card spread (Past, Present, Future) for Love/Career/Finance
            - **Yes/No Questions**: Single card answer to specific questions
            
            TONE:
            - Mystical, calm, wise, and supportive
            - Use metaphors of energy, stars, and destiny
            - Never be negative or fearful - always find the positive guidance
            
            LANGUAGE:
            - Provide readings in the user's preferred language (Hindi/English)
            - Match the mystical tone in both languages
            """,
        )
        self._publish_data_fn = publish_data_fn

    @function_tool
    async def draw_tarot_cards(self, context: RunContext, topic: str) -> str:
        """
        Draw Tarot cards for a specific topic (Love, Career, Finance).
        
        Args:
            topic: The area of life to focus on (love, career, finance).
            
        Returns:
            A description of the drawn cards and their meanings to narrate to the user.
        """
        logger.info(f"Drawing tarot cards for topic: {topic}")
        
        # Map topic to API key
        clean_topic = topic.lower()
        api_topic = "career" # default
        if "love" in clean_topic or "relationship" in clean_topic:
            api_topic = "love"
        elif "finance" in clean_topic or "money" in clean_topic or "wealth" in clean_topic:
            api_topic = "finance"
        elif "career" in clean_topic or "job" in clean_topic or "work" in clean_topic:
            api_topic = "career"
            
        try:
            # Lazy import to avoid circular dependency issues
            try:
                from .astrology_api_client import get_api_client
            except ImportError:
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from astrology_api_client import get_api_client

            client = get_api_client()
            # Request 3 cards for a spread (Past, Present, Future) is typical, 
            # but the API might just take 'love': 1 for a single reading. 
            # Let's try requesting a standard reading.
            # Based on typical usage of this API, keys like "love", "career", "finance" 
            # prompt specific spreads. We'll send {api_topic: 1}.
            
            # API handling
            response = await client.get_tarot_predictions({api_topic: 1})
            
            # Simulated Tarot Deck (Major Arcana) for Visuals
            TAROT_DECK = [
                {"name": "The Fool", "image": "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg", "meaning": "New beginnings, innocence, spontaneity."},
                {"name": "The Magician", "image": "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg", "meaning": "Manifestation, resourcefulness, power."},
                {"name": "The High Priestess", "image": "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg", "meaning": "Intuition, sacred knowledge, divine feminine."},
                {"name": "The Empress", "image": "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg", "meaning": "Femininity, beauty, nature, nurturing."},
                {"name": "The Emperor", "image": "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg", "meaning": "Authority, establishment, structure."},
                {"name": "The Hierophant", "image": "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg", "meaning": "Spiritual wisdom, religious beliefs, conformity."},
                {"name": "The Lovers", "image": "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg", "meaning": "Love, harmony, relationships, values alignment."},
                {"name": "The Chariot", "image": "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg", "meaning": "Control, willpower, success, action."},
                {"name": "Strength", "image": "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg", "meaning": "Strength, courage, persuasion, influence."},
                {"name": "The Hermit", "image": "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg", "meaning": "Soul-searching, introspection, being alone, inner guidance."},
                {"name": "Wheel of Fortune", "image": "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg", "meaning": "Good luck, karma, life cycles, destiny, a turning point."},
                {"name": "Justice", "image": "https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg", "meaning": "Justice, fairness, truth, cause and effect, law."},
                {"name": "The Hanged Man", "image": "https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg", "meaning": "Pause, surrender, letting go, new perspectives."},
                {"name": "Death", "image": "https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg", "meaning": "Endings, change, transformation, transition."},
                {"name": "Temperance", "image": "https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg", "meaning": "Balance, moderation, patience, purpose."},
                {"name": "The Devil", "image": "https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg", "meaning": "Shadow self, attachment, addiction, restriction, sexuality."},
                {"name": "The Tower", "image": "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg", "meaning": "Sudden change, upheaval, chaos, revelation, awakening."},
                {"name": "The Star", "image": "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg", "meaning": "Hope, faith, purpose, renewal, spirituality."},
                {"name": "The Moon", "image": "https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg", "meaning": "Illusion, fear, anxiety, subconscious, intuition."},
                {"name": "The Sun", "image": "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg", "meaning": "Positivity, fun, warmth, success, vitality."},
                {"name": "Judgement", "image": "https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg", "meaning": "Judgement, rebirth, inner calling, absolution."},
                {"name": "The World", "image": "https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg", "meaning": "Completion, integration, accomplishment, travel."}
            ]

            visual_cards = []
            reading_text = ""

            # Check if response is the text-only format (e.g. {'love': '...', 'career': '...'})
            if response and isinstance(response, dict) and api_topic in response:
                # Text-only response. We need to Simulate the cards.
                import random
                selected_indices = random.sample(range(len(TAROT_DECK)), 3)
                
                # Assign positions: Past, Present, Future
                positions = ["Past Influence", "Current Situation", "Future Outcome"]
                
                reading_text = f"I have connected with the energies for your {topic} reading. Here is what the cards reveal:\n\n"
                
                # Add API Insight
                api_insight = response[api_topic]
                reading_text += f"**Overall Insight**: {api_insight}\n\n"
                
                reading_text += "**The Cards Drawn:**\n"
                
                for i, idx in enumerate(selected_indices):
                    card = TAROT_DECK[idx]
                    position_name = positions[i]
                    
                    visual_cards.append({
                        "name": card["name"],
                        "image": card["image"],
                        "meaning": card["meaning"],
                        "position": i
                    })
                    
                    reading_text += f"- **{position_name}**: {card['name']} - {card['meaning']}\n"
                
                # Instruct LLM to synthesize
                reading_text += "\n(Please interpret these cards in the context of the user's topic and the Overall Insight provided above. Weave a mystical narrative.)"

            else:
                 # Fallback for structured response (if API changes or different endpoint used)
                 # ... (existing fallback logic or just generic error) ...
                 # For now, let's assume the text-only path is the primary one based on verification.
                 if not response:
                     return "I sense a clouding of the energies. I could not draw the cards at this moment. Please try again."
                 
                 # If it's a list (unexpected), try to parse
                 predictions = response.get('tarot_predictions', []) if isinstance(response, dict) else (response if isinstance(response, list) else [response])
                 
                 for i, card in enumerate(predictions):
                     name = card.get('name') or card.get('card_name') or "Unknown Card"
                     meaning = card.get('prediction') or card.get('description') or "A mysterious card."
                     image = card.get('image') or card.get('image_url')
                     reading_text += f"\nCard {i+1}: {name}. {meaning}"
                     visual_cards.append({"name": name, "image": image, "meaning": meaning, "position": i})

            # Publish to frontend
            if self._publish_data_fn and callable(self._publish_data_fn):
                payload = {
                    "type": "tarot.deal",
                    "topic": topic,
                    "cards": visual_cards
                }
                data_bytes = json.dumps(payload).encode('utf-8')
                await self._publish_data_fn(data_bytes)
                logger.info(f"Published tarot deal event with {len(visual_cards)} cards")

            return reading_text

        except Exception as e:
            logger.error(f"Error drawing tarot cards: {e}", exc_info=True)
            return "The spirits are quiet. I cannot complete the reading."

    @function_tool
    async def get_yes_no_answer(self, context: RunContext, question: str) -> str:
        """
        Get a Yes/No answer to a specific question using tarot cards.
        
        Args:
            question: The user's yes/no question
            
        Returns:
            A mystical yes/no answer with card interpretation
        """
        logger.info(f"Getting yes/no answer for: {question}")
        
        try:
            # Lazy import to avoid circular dependency issues
            try:
                from .astrology_api_client import get_api_client
            except ImportError:
                import sys
                from pathlib import Path
                src_path = Path(__file__).resolve().parent
                if str(src_path) not in sys.path:
                    sys.path.insert(0, str(src_path))
                from astrology_api_client import get_api_client

            client = get_api_client()
            
            # Call yes_no_tarot API endpoint
            response = await client.get_yes_no_tarot({"question": question})
            
            if response and isinstance(response, dict):
                answer = response.get('answer', 'unclear')  # yes/no/maybe
                card_name = response.get('card_name', 'Unknown Card')
                interpretation = response.get('interpretation', '')
                
                # Select a visual card from our deck
                import random
                card_visual = random.choice(TAROT_DECK)
                
                # Publish to frontend
                if self._publish_data_fn:
                    payload = {
                        "type": "tarot.yesno",
                        "question": question,
                        "answer": answer,
                        "card": {
                            "name": card_name,
                            "image": card_visual["image"],
                            "meaning": interpretation
                        }
                    }
                    data_bytes = json.dumps(payload).encode('utf-8')
                    await self._publish_data_fn(data_bytes)
                    logger.info(f"Published yes/no answer: {answer}")
                
                return f"The cards reveal: **{answer.upper()}**. {card_name} - {interpretation}"
            
            return "The energies are unclear. Please rephrase your question."
            
        except Exception as e:
            logger.error(f"Error in yes/no reading: {e}", exc_info=True)
            return "The spirits cannot answer at this moment. Please try again."

def prewarm(proc: JobProcess):
    try:
        import torch
        logger.info(f"PyTorch version: {torch.__version__}")
    except ImportError:
        pass
    proc.userdata["vad"] = None

async def entrypoint(ctx: JobContext):
    logger.info("ENTRYPOINT: Starting Tarot Agent")
    
    # Check env vars
    openai_key = os.getenv("OPENAI_API_KEY")
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    
    if not openai_key or not cartesia_key:
        logger.error("Missing API keys")
        return

    async def _publish_data(data_bytes: bytes):
        lp = ctx.room.local_participant
        if lp:
            await lp.publish_data(data_bytes, reliable=True, topic="tarot.event")

    # Detect language (simplified) - Default to Hindi as per user request
    user_language = "en" 
    
    # Try to extract language from metadata if available
    try:
         # Wait briefly for participants to join (simplified logic)
        await asyncio.sleep(1)
        if hasattr(ctx.room, 'remote_participants') and len(ctx.room.remote_participants) > 0:
            participant = list(ctx.room.remote_participants.values())[0]
            if participant.metadata:
                metadata = json.loads(participant.metadata)
                raw_lang = str(metadata.get("language", "")).strip().lower()
                if raw_lang in ["en", "english", "eng"]:
                    user_language = "en"
                elif raw_lang in ["hi", "hindi", "hin"]:
                    user_language = "en"
                logger.info(f"🌐 Detected language from metadata: {user_language}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to parse metadata for language, defaulting to {user_language}: {e}")
    
    # Initialize STT
    stt = None
    sarvam_key = os.getenv("SARVAM_API_KEY")
    
    if user_language == 'hi':
        logger.info("Initializing STT for Hindi language")
        if sarvam_key:
            try:
                from livekit.plugins import sarvam as sarvam_plugin
                stt = sarvam_plugin.STT(language="hi")
                logger.info("✅ Using Sarvam STT for Hindi")
            except Exception as e:
                logger.error(f"❌ Failed to init Sarvam STT: {e}")
                stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
        else:
             logger.warning("SARVAM_API_KEY not found, falling back to AssemblyAI for Hindi")
             stt = inference.STT(model="assemblyai/universal-streaming", language="hi")
    else:
        stt = inference.STT(model="assemblyai/universal-streaming", language="en")
    
    # Setup TTS - Using Cartesia for both languages due to Sarvam WebSocket issues
    # TODO: Re-enable Sarvam TTS once API issues are resolved
    tts = inference.TTS(
        model="cartesia/sonic-3", 
        language=user_language,
        voice="248be419-3632-4fcb-b1f7-a80c37c53875"
    )
    
    # Disabled Sarvam TTS temporarily due to WebSocket connection errors
    # if user_language == 'hi' and sarvam_key:
    #     try:
    #         from livekit.plugins import sarvam as sarvam_plugin
    #         tts = sarvam_plugin.TTS(language="hi-IN")
    #         logger.info("✅ Using Sarvam TTS for Hindi")
    #     except Exception as e:
    #         logger.error(f"❌ Failed to init Sarvam TTS: {e}")
    #         tts = inference.TTS(
    #             model="cartesia/sonic-3", 
    #             language=user_language,
    #             voice="248be419-3632-4fcb-b1f7-a80c37c53875"
    #         )
    
    # Connect to room first
    await ctx.connect()
    
    agent = TarotAgent(publish_data_fn=_publish_data)
    
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=tts,
        preemptive_generation=True,
    )
    
    # Start session
    await session.start(agent=agent, room=ctx.room)

    # Send welcome message immediately after session starts
    if user_language == 'hi':
        await session.say("नमस्ते। मैं आपकी टैरो रीडर हूँ। कार्ड्स तैयार हैं। आप किस विषय पर मार्गदर्शन चाहते हैं - प्रेम, करियर, या वित्त?")
    else:
        await session.say("Welcome, seeker. The cards are waiting. Do you seek guidance on Love, Career, or Finance?")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint, 
        prewarm_fnc=prewarm,
        agent_name=os.getenv("LIVEKIT_AGENT_NAME", "tarot-agent"),
    ))

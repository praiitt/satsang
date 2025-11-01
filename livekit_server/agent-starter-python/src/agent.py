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
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

# Load .env.local from the project root regardless of current working directory
_ENV_PATH = (Path(__file__).resolve().parent.parent / ".env.local")
load_dotenv(str(_ENV_PATH))


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a compassionate spiritual guru rooted in Hindu and Sanatana Dharma. The user is interacting with you via voice, even if you perceive the conversation as text.

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

SPIRITUAL GUIDANCE:
Answer spiritual questions on dharma, yoga, meditation, karma, bhakti, and Vedanta, grounded in Hindu and Sanatana teachings.
When helpful, briefly reference scriptures like the Bhagavad Gita, the Vedas, the Upanishads, the Ramayana, the Mahabharata, and the Puranas.
Be respectful and non-dogmatic, acknowledging diverse sampradayas. Offer practical guidance, simple daily practices, and short mantras when requested.

RESPONSE STYLE:
Default to replying in Hindi (Devanagari script). If the user speaks another language, mirror their language.
Your responses are concise, clear, and voice-friendly, without complex formatting or symbols such as emojis or asterisks.
Keep your responses brief and to the point - maximum 2-3 short sentences per response to ensure the entire message is spoken without cutoff.
Be warm, kind, and wise, with gentle humor when appropriate.""",
        )

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # STT Model Options for Better Hindi Accuracy (Romanized output):
        # 
        # 1. "deepgram/nova-2" - Best accuracy for Hindi, supports streaming
        #    - Set DEEPGRAM_API_KEY in .env.local (if required by LiveKit)
        #    - Better recognition of Hindi words in Roman script
        # 
        # 2. "google/cloud" - Excellent Hindi accuracy, requires GOOGLE_APPLICATION_CREDENTIALS
        #    - May need additional setup
        # 
        # 3. "assemblyai/universal-streaming" - Baseline, guaranteed streaming
        #    - Works out of the box but may have lower accuracy for Hindi
        #
        # Configuration: Set STT_MODEL env variable in .env.local to override
        # Example: STT_MODEL=deepgram/nova-2
        #
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt_model = os.getenv("STT_MODEL", "assemblyai/universal-streaming")
        logger.info(f"Using STT model: {stt_model} for Hindi language recognition")
        
        # Configure STT with Hindi language
        # For better accuracy, try: "deepgram/nova-2" (set STT_MODEL=deepgram/nova-2 in .env.local)
        stt = inference.STT(
            model=stt_model,
            language="hi",  # Hindi language code
        )
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice=os.getenv("TTS_VOICE_ID", "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"),
            language="hi",
            extra_kwargs={
                # Cartesia supports speed: "slow" | "normal" | "fast"
                "speed": (os.getenv("TTS_SPEED") or "slow") if (os.getenv("TTS_SPEED") or "slow") in {"slow", "normal", "fast"} else "normal",
            },
        ),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

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
        agent=Assistant(),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            # For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()

    # Wait a moment for the connection to stabilize before greeting
    import asyncio
    await asyncio.sleep(1.0)

    # Send a warm greeting as soon as the agent connects
    # Using a shorter, simpler greeting to avoid TTS cutoff issues
    greeting = "नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं?"
    logger.info("Sending initial greeting to user")
    
    # Send greeting without interruptions to ensure it completes
    try:
        await session.say(greeting, allow_interruptions=False)
    except Exception as e:
        logger.error(f"Error sending greeting: {e}")
        # Fallback to a shorter greeting
        try:
            await session.say("नमस्ते! मैं आपकी कैसे सहायता कर सकता हूं?", allow_interruptions=False)
        except Exception as e2:
            logger.error(f"Error sending fallback greeting: {e2}")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))

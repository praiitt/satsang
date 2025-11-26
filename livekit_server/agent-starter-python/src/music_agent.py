import logging
from pathlib import Path
import os
import asyncio
import json
from dotenv import load_dotenv
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
)
try:
    from .suno_client import SunoClient
except ImportError:
    # When running as script, use absolute import
    from suno_client import SunoClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger("music_agent")

# Load env
_ENV_PATHS = [
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.cwd() / ".env.local",
]
for _env_path in _ENV_PATHS:
    if _env_path.exists():
        load_dotenv(str(_env_path), override=True)
        break

class MusicAssistant(Agent):
    def __init__(self, publish_data_fn=None):
        super().__init__(
            instructions="""You are RRAASI Music Creator, a specialized AI agent for creating healing, spiritual, and meditative music.
Your goal is to create the PERFECT music track for the user.
Because music generation is a premium service, you must NOT generate music immediately upon the first request. You must act like a professional music producer and interview the user to get every minute detail.

**PROTOCOL FOR INTERACTION:**

1.  **Deep Discovery (Do this first):**
    When a user asks for music, do not just say "Okay". Ask clarifying questions to build a rich mental image of the track.
    -   **Genre/Style**: "Do you want Indian Classical (Hindustani/Carnatic), Western Ambient, Lo-fi, Sufi, or something else?"
    -   **Instruments**: "Should we feature specific instruments like the Bansuri (Flute), Sitar, Tabla, Piano, or maybe 432Hz Crystal Bowls?"
    -   **Mood/Energy**: "Is this for deep meditation (slow, minimal), yoga (flow), or celebration (upbeat)?"
    -   **Vocals**: "Do you want a Male voice, Female voice, Duet, or purely Instrumental?"
    -   **Lyrics/Language**: "Should it be in Hindi, Sanskrit, or English? Do you have specific lyrics or a mantra (e.g., 'Om Namah Shivaya')?"

2.  **Construct & Confirm:**
    Once you have gathered these details, summarize them back to the user and propose the prompt you will use.
    -   *Example:* "I have the details: A slow, meditative Krishna bhajan in Raga Yaman, featuring a bamboo flute and soft tabla, with a male vocalist singing in Sanskrit. The vibe is peaceful and healing. Shall I proceed with this?"

3.  **Generate (Only after confirmation):**
    Call the `generate_music` tool ONLY after the user says "Yes", "Go ahead", or confirms the plan.

**PROMPT ENGINEERING TIPS:**
-   Be extremely descriptive in the `prompt` argument.
-   Include keywords for atmosphere: "Reverb", "Ethereal", "Spacious", "Warm".
-   Specify structure if needed: "Slow build up", "Chorus heavy".
-   For healing, mention frequencies: "432Hz", "528Hz", "Solfeggio".

**Example Interaction:**
User: "Make a healing track."
You: "I'd love to create a healing track for you. To make it perfect, could you tell me what kind of healing? Is it for sleep, focus, or emotional release? And do you prefer nature sounds or musical instruments?"
"""
        )
        self._publish_data_fn = publish_data_fn
        self.suno_client = SunoClient()

    @function_tool
    async def generate_music(
        self,
        context: RunContext,
        prompt: str,
        is_instrumental: bool = False,
        style: str = "Ambient",
        title: str = "RRAASI Creation"
    ) -> str:
        """
        Generate a music track using Suno AI.
        
        Args:
            prompt: Description of the music or lyrics.
            is_instrumental: Whether the track should be instrumental (no vocals).
            style: Genre or style of music (e.g., "Indian Classical", "Ambient", "Meditation").
            title: Title for the track.
        """
        logger.info(f"Generating music: {title} ({style}) - Instrumental: {is_instrumental}")
        
        try:
            # Call Suno API
            result = await self.suno_client.generate_music(
                prompt=prompt,
                is_instrumental=is_instrumental,
                custom_mode=True,
                style=style,
                title=title,
                model="V3_5"
            )
            
            logger.info(f"Suno API Result: {result}")
            
            # The result format is: {'code': 200, 'msg': 'success', 'data': {'taskId': '...'}}
            task_id = None
            if isinstance(result, dict) and result.get("code") == 200:
                data = result.get("data", {})
                task_id = data.get("taskId")
            
            if not task_id:
                logger.warning(f"Could not parse taskId from result: {result}")
                return "I've sent the request, but I couldn't track the generation status automatically. Please check back in a moment."

            # Start background polling task
            asyncio.create_task(self._poll_and_play(task_id, title))

            return f"I have started creating your music: '{title}'. I will play it for you once it's ready (usually takes about a minute)."

        except Exception as e:
            logger.error(f"Music generation failed: {e}")
            return "I apologize, but I encountered an error while trying to generate the music. Please try again."

    async def _poll_and_play(self, task_id: str, title: str):
        """Poll status and play when ready."""
        logger.info(f"Polling for task: {task_id}")
        max_retries = 60 # 60 * 5s = 5 mins
        
        for _ in range(max_retries):
            await asyncio.sleep(5)
            try:
                # Check status
                status_response = await self.suno_client.get_generation_status(task_id)
                # Response format: {'code': 200, 'msg': 'success', 'data': {'status': '...', 'clips': [...]}}
                
                if status_response.get("code") == 200:
                    data = status_response.get("data", {})
                    status = data.get("status")
                    logger.info(f"Task {task_id} status: {status}")
                    
                    if status == "SUCCESS":
                        clips = data.get("clips", [])
                        # Usually generates 2 clips
                        # We'll play the first one
                        for clip in clips:
                            audio_url = clip.get("audio_url")
                            if audio_url:
                                logger.info(f"Music ready! Playing: {audio_url}")
                                
                                # Send to frontend
                                if self._publish_data_fn:
                                    payload = {
                                        "mp3Url": audio_url,
                                        "name": title,
                                        "artist": "RRAASI AI",
                                        "message": f"Here is your generated music: {title}"
                                    }
                                    data_bytes = json.dumps(payload).encode("utf-8")
                                    if asyncio.iscoroutinefunction(self._publish_data_fn):
                                        await self._publish_data_fn(data_bytes, topic="bhajan.track")
                                    else:
                                        self._publish_data_fn(data_bytes, topic="bhajan.track")
                                
                                return # Done
                    elif status in ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR"]:
                        logger.error(f"Music generation failed with status: {status}")
                        return
            except Exception as e:
                logger.error(f"Polling error: {e}")
        
        logger.warning("Polling timed out")

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = None

async def entrypoint(ctx: JobContext):
    logger.info(f"Starting Music Agent for room: {ctx.room.name}")
    
    # Initialize STT/TTS
    stt = inference.STT(model="assemblyai/universal-streaming", language="en")
    tts = inference.TTS(model="cartesia/sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc", language="en")
    
    # Create assistant first (without publish_data_fn)
    assistant = MusicAssistant()
    
    # Create session
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=tts,
        turn_detection=None, # Use default VAD
        vad=ctx.proc.userdata["vad"],
    )
    
    session.agent = assistant
    
    # Start the session (this connects to the room)
    await session.start(ctx.room)
    
    # Now that we're connected, set the publish function
    assistant._publish_data_fn = ctx.room.local_participant.publish_data
    
    # Send welcome message
    await session.say(
        "Welcome to RRAASI Music Creator! I'm here to help you create beautiful healing music, bhajans, and meditation tracks. "
        "What kind of music would you like to create today?"
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))

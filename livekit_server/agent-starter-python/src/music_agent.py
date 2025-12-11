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
    def __init__(self, publish_data_fn=None, user_id=None):
        super().__init__(
            instructions="""You are RRAASI Music Creator, a specialized AI agent for creating healing, spiritual, and meditative music.
Your goal is to create the PERFECT music track for the user.

**CRITICAL UNDERSTANDING:**
- When generating music with vocals, the 'lyrics' parameter = EXACT text to be sung
- The 'style' parameter = genre + mood + instruments description  
- NEVER mix these up!

**PROTOCOL FOR INTERACTION:**

1.  **Deep Discovery:**
    When a user asks for music, ask clarifying questions:
    -   **First question**: "Would you like this track with vocals or purely instrumental?"
    -   **Genre/Style**: "What style? Bhajan, Meditation, Ambient, Classical?"
    -   **Instruments**: "Which instruments? Bansuri, Sitar, Tabla, Piano, Crystal Bowls?"
    -   **Mood**: "What mood? Peaceful, Devotional, Uplifting, Introspective?"

2.  **LYRICS HANDLING (For vocal tracks):**
    If user wants vocals:
    -   **Ask**: "Would you like to provide your own lyrics, or shall I generate traditional devotional lyrics for you?"
    
    **If user chooses "Generate":**
    -   Ask: "What theme?" (devotion, peace, surrender, praise)
    -   Ask: "Any specific deity or subject?" (Krishna, Shiva, meditation, healing)
    -   Ask: "Language preference?" (Hindi, Sanskrit, English, Tamil)
    -   Ask: "Mood?" (peaceful, celebratory, meditative)
    -   Call `generate_lyrics()` with collected info
    -   Show generated lyrics to user
    -   Get user approval or ask if they want modifications
    -   Once approved, proceed to validate_lyrics()
    
    **If user provides own lyrics:**
    -   Call `validate_lyrics(lyrics=<user_lyrics>, music_style=<style>, language=<language>)`
    -   If validation PASSES (✅): Proceed to step 3
    -   If validation FAILS (❌): Ask user to revise or offer to generate lyrics
    
    **CRITICAL**: ALWAYS validate lyrics before music generation (whether user-provided or AI-generated)

3.  **Construct & Confirm:**
    Summarize everything:
    -   For VOCAL: "I will create a [style] titled '[title]' with your validated lyrics: [show first line...]"
    -   For INSTRUMENTAL: "I will create a [style] instrumental titled '[title]'"
    -   Ask: "Shall I proceed?"

4.  **Generate (Only after validation AND confirmation):**
    Call `generate_music()` with:
    -   `lyrics`: EXACT lyrics text (for vocal) OR empty string (for instrumental)
    -   `style`: "Slow devotional Krishna bhajan with bamboo flute, tabla, and harmonium"
    -   `title`: User's chosen title
    -   `is_instrumental`: True/False

**FUNCTION CALL EXAMPLES:**

✅ GOOD (Vocal):
generate_music(
    lyrics="Govinda Gopala, Radha Ramana\\nNanda ke lala, Krishna\\nMurlidhar Giridhari",
    style="Slow devotional Krishna bhajan with bamboo flute, tabla, and harmonium",
    title="Govinda Gopala",
    is_instrumental=False
)

✅ GOOD (Instrumental):
generate_music(
    lyrics="",
    style="Peaceful meditation music with 432Hz crystal bowls and nature sounds",
    title="Om Shanti",
    is_instrumental=True
)

❌ BAD (Confusing lyrics with style):
generate_music(
    lyrics="Create a peaceful Krishna bhajan with flute",  # WRONG! This is style, not lyrics
    style="Devotional",
    is_instrumental=False
)

**RETRIEVING PAST TRACKS:**
- If user asks for "last music", "my tracks", or "previous songs", use `list_tracks` tool.
"""
        )
        self._publish_data_fn = publish_data_fn
        self.suno_client = SunoClient()
        self.user_id = user_id or "default_user"
        self._cleanup_tasks = []  # Track background tasks for cleanup

    @function_tool
    async def generate_music(
        self,
        context: RunContext,
        lyrics: str,
        is_instrumental: bool = False,
        style: str = "Ambient",
        title: str = "RRAASI Creation"
    ) -> str:
        """
        Generate a music track using Suno AI.
        
        Args:
            lyrics: For VOCAL tracks: The EXACT lyrics text to be sung.
                   For INSTRUMENTAL: Empty string or brief description.
                   NEVER put style/genre descriptions here - use 'style' parameter.
            is_instrumental: Whether the track should be instrumental (no vocals).
            style: Genre, mood, instruments description (e.g., "Slow devotional Krishna bhajan with bamboo flute and tabla").
            title: Title for the track.
        """
        logger.info(f"Generating music: {title} ({style}) - Instrumental: {is_instrumental}")
        
        try:
            # Get auth server URL from environment
            auth_server_url = os.getenv("AUTH_SERVER_URL", "http://localhost:4000")
            callback_url = f"{auth_server_url}/suno/callback?userId={self.user_id}"
            
            # Call Suno API
            result = await self.suno_client.generate_music(
                prompt=lyrics,
                is_instrumental=is_instrumental,
                custom_mode=True,
                style=style,
                title=title,
                model="V3_5",
                callback_url=callback_url
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

            # Start background polling task and track it for cleanup
            task = asyncio.create_task(self._poll_and_play(task_id, title))
            self._cleanup_tasks.append(task)

            return f"I have started creating your music: '{title}'. I will play it for you once it's ready (usually takes about a minute)."

        except Exception as e:
            logger.error(f"Music generation failed: {e}")
            return "I apologize, but I encountered an error while trying to generate the music. Please try again."

    @function_tool
    async def generate_lyrics(
        self,
        context: RunContext,
        theme: str,
        deity_or_subject: str = "Divine",
        language: str = "Hindi",
        style: str = "Bhajan",
        mood: str = "Devotional",
        length: str = "medium"
    ) -> str:
        """
        Generate devotional lyrics using AI when user doesn't have their own lyrics.
        
        Args:
            theme: Main theme (e.g., "devotion", "peace", "surrender", "praise")
            deity_or_subject: Deity name (Krishna, Shiva, Devi) or subject (meditation, healing)
            language: Hindi, Sanskrit, English, or Tamil
            style: Bhajan, Stotram, Mantra, Meditation chant
            mood: Devotional, peaceful, celebratory, introspective
            length: short (4-6 lines), medium (8-12 lines), long (16+ lines)
        
        Returns:
            Generated lyrics text that can be validated and used for music creation
        """
        logger.info(f"Generating {style} lyrics about {deity_or_subject} in {language}")
        
        # Map length to line counts
        length_map = {
            "short": "4-6 lines",
            "medium": "8-12 lines",
            "long": "16-20 lines"
        }
        line_count = length_map.get(length, "8-12 lines")
        
        # Construct prompt for lyrics generation
        lyrics_prompt = f"""You are a master lyricist specializing in spiritual and devotional music.

Create {style} lyrics with these specifications:
- Deity/Subject: {deity_or_subject}
- Theme: {theme}
- Language: {language}
- Mood: {mood}
- Length: {line_count}

Requirements:
1. Use traditional devotional vocabulary and style
2. Include deity names and attributes (e.g., for Krishna: Govinda, Gopala, Murlidhar)
3. Have proper verse structure with repetition (chorus/refrain)
4. Be suitable for singing with musical instruments
5. Express genuine spiritual sentiment
6. Follow traditional {style} structure

For Hindi/Sanskrit:
- Use simple Roman script transliteration
- Include traditional epithets and names

For {style} style:
{"- Sanskrit shlokas with proper meter" if style == "Stotram" else ""}
{"- Simple repetitive mantric phrases" if style == "Mantra" else ""}
{"- Devotional verses with chorus" if style == "Bhajan" else ""}

Generate ONLY the lyrics, no explanations or commentary."""

        try:
            import openai
            client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a master lyricist of devotional and spiritual music."},
                    {"role": "user", "content": lyrics_prompt}
                ],
                temperature=0.8,
                max_tokens=500
            )
            
            generated_lyrics = response.choices[0].message.content.strip()
            logger.info(f"Generated lyrics ({len(generated_lyrics)} chars)")
            
            return f"""I've created these lyrics for your {style}:

{generated_lyrics}

Would you like me to:
1. Use these lyrics as-is
2. Modify them (tell me what to change)
3. Generate different lyrics with a different approach

Once you approve, I'll validate and proceed with music creation."""
            
        except Exception as e:
            logger.error(f"Lyrics generation failed: {e}")
            return "I apologize, I couldn't generate lyrics at the moment. Would you like to provide your own lyrics instead?"

    @function_tool
    async def validate_lyrics(
        self,
        context: RunContext,
        lyrics: str,
        music_style: str,
        language: str = "Hindi"
    ) -> str:
        """
        Validate lyrics for quality, meaning, and appropriateness before music generation.
        Use this when user provides lyrics for a non-instrumental track.
        
        Args:
            lyrics: The lyrics text to validate
            music_style: Type of music (e.g., "Krishna Bhajan", "Meditation", "Shiva Stotram")
            language: Language of lyrics (Hindi, Sanskrit, English)
        
        Returns:
            Validation result with feedback
        """
        logger.info(f"Validating lyrics for {music_style} in {language}")
        
        validation_prompt = f"""You are a professional lyricist and music critic specializing in spiritual and devotional music.

Analyze the following lyrics for a {music_style} in {language}:

--- LYRICS ---
{lyrics}
--- END LYRICS ---

Evaluate on these criteria:
1. MEANING: Are the lyrics meaningful and coherent? (Score 1-10)
2. STYLE: Do they fit a {music_style}? Are they devotional/spiritual? (Score 1-10)
3. STRUCTURE: Do they have proper verse structure, repetition, chorus? (Score 1-10)
4. LANGUAGE: Proper grammar and spiritual vocabulary? (Score 1-10)
5. LENGTH: Appropriate length (not too short or too long)? (Score 1-10)

Respond in JSON format:
{{
  "is_valid": true/false,
  "overall_score": <average of all scores>,
  "scores": {{
    "meaning": <1-10>,
    "style": <1-10>,
    "structure": <1-10>,
    "language": <1-10>,
    "length": <1-10>
  }},
  "feedback": "<Brief feedback about what's good or needs improvement>",
  "suggestions": "<If invalid, specific suggestions to improve>"
}}

Minimum acceptable overall_score: 7.0
If overall_score < 7.0, set is_valid to false.
"""

        try:
            # Use OpenAI API directly for validation
            import openai
            client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional lyricist specializing in devotional music."},
                    {"role": "user", "content": validation_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            
            logger.info(f"Validation result: {result}")
            
            # Format user-friendly response
            is_valid = result.get("is_valid", False)
            score = result.get("overall_score", 0)
            feedback = result.get("feedback", "")
            suggestions = result.get("suggestions", "")
            
            if is_valid:
                return f"✅ Lyrics validated successfully! (Score: {score}/10)\n\n{feedback}\n\nYour lyrics are ready for music generation."
            else:
                response_text = f"❌ Lyrics need improvement (Score: {score}/10)\n\n{feedback}"
                if suggestions:
                    response_text += f"\n\n💡 Suggestions: {suggestions}"
                response_text += "\n\nPlease revise your lyrics or let me suggest some traditional devotional lyrics."
                return response_text
                
        except Exception as e:
            logger.error(f"Lyrics validation failed: {e}")
            # Fail open - if validation fails, allow lyrics
            return f"⚠️ Could not validate lyrics automatically, but they look okay. Proceeding with generation."

    @function_tool
    async def list_tracks(self, context: RunContext) -> str:
        """
        List the music tracks created by the user, ordered by most recent first.
        Use this when the user asks for "last track", "recent music", or "my songs".
        """
        try:
            import aiohttp
            
            # Get auth server URL
            auth_server_url = os.getenv("AUTH_SERVER_URL", "http://localhost:4000")
            url = f"{auth_server_url}/suno/tracks?userId={self.user_id}&limit=5"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.error(f"Failed to fetch tracks: {response.status}")
                        return "I'm sorry, I couldn't retrieve your tracks right now."
                    
                    data = await response.json()
                    tracks = data.get("tracks", [])
            
            if not tracks:
                return "You haven't created any music tracks yet."
            
            response_text = "Here are your recent tracks (most recent first):\n"
            for i, track in enumerate(tracks, 1):
                title = track.get("title", "Untitled")
                url = track.get("audioUrl", "No URL")
                response_text += f"{i}. {title} - [Listen]({url})\n"
            
            return response_text
        except Exception as e:
            logger.error(f"Failed to list tracks: {e}")
            return "I'm sorry, I couldn't retrieve your tracks right now."

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
                    
                    # Handle both SUCCESS and FIRST_SUCCESS (which means one clip is ready)
                    if status in ["SUCCESS", "FIRST_SUCCESS", "TEXT_SUCCESS"]:
                        clips = data.get("clips", [])
                        # Usually generates 2 clips
                        # We'll play the first one
                        for clip in clips:
                            audio_url = clip.get("audio_url")
                            if audio_url:
                                logger.info(f"Music ready! Playing: {audio_url}")
                                logger.info(f"Track will be saved via callback to auth server")

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
    
    # Wait for participant to join and extract userId from metadata
    user_id = "default_user"
    try:
        # Get the first participant (the user who joined)
        participants = list(ctx.room.remote_participants.values())
        if participants:
            participant = participants[0]
            if participant.metadata:
                metadata = json.loads(participant.metadata)
                user_id = metadata.get("userId", "default_user")
                logger.info(f"Extracted userId from participant metadata: {user_id}")
    except Exception as e:
        logger.warning(f"Could not extract userId from participant metadata: {e}")
    
    # Initialize STT/TTS
    stt = inference.STT(model="assemblyai/universal-streaming", language="en")
    tts = inference.TTS(model="cartesia/sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc", language="en")
    
    # Create assistant with userId
    assistant = MusicAssistant(user_id=user_id)
    
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
    await session.start(assistant, room=ctx.room)
    
    # Now that we're connected, set the publish function
    assistant._publish_data_fn = ctx.room.local_participant.publish_data
    
    # Handle chat messages
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        """Handle incoming chat messages from the frontend."""
        try:
            # Decode the message
            message = data_packet.data.decode('utf-8')
            logger.info(f"📩 Received chat message: {message}")
            
            # Parse JSON if it's structured data
            try:
                data = json.loads(message)
                # Extract the actual message text
                if isinstance(data, dict) and 'message' in data:
                    message = data['message']
                elif isinstance(data, dict) and 'text' in data:
                    message = data['text']
            except json.JSONDecodeError:
                # It's plain text, use as-is
                pass
            
            # Send the message to the agent session for processing
            asyncio.create_task(session.chat(message))
            
        except Exception as e:
            logger.error(f"Error handling chat message: {e}")
    
    # Send welcome message
    await session.say(
        "Welcome to RRAASI Music Creator! I'm here to help you create beautiful healing music, bhajans, and meditation tracks. "
        "What kind of music would you like to create today?"
    )

if __name__ == "__main__":
    # Get agent name from environment or use default
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "music-agent")
    logger.info(f"Starting agent with name: {agent_name}")
    
    # Configure worker with connection retry limits to prevent aggressive reconnection
    # that can trigger cloud provider abuse detection
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
        max_retry=5,  # Limit to 5 retries instead of default 16
    ))

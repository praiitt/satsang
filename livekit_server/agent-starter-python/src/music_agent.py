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
)
try:
    from .suno_client import SunoClient
except ImportError:
    # When running as script, use absolute import
    from suno_client import SunoClient
from firebase_db import FirebaseDB

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

async def stop_room_egress(room_name: str):
    """
    Stop all active egress for a specific room.
    This ensures recordings are saved even if the room disconnects abruptly.
    """
    logger.info(f"Checking for active egress to stop in room: {room_name}")
    try:
        # Initialize API client
        lkapi = api.LiveKitAPI(
            os.getenv("LIVEKIT_URL"),
            os.getenv("LIVEKIT_API_KEY"),
            os.getenv("LIVEKIT_API_SECRET"),
        )
        
        egress_client = lkapi.egress
        
        # List active egress
        active_egress_list = await egress_client.list_egress(room_name=room_name)
        
        if active_egress_list:
            logger.info(f"Found {len(active_egress_list)} active egress sessions. Stopping them...")
            events = []
            for egress in active_egress_list:
                logger.info(f"Stopping egress: {egress.egress_id} ({egress.status})")
                events.append(egress_client.stop_egress(egress.egress_id))
            
            if events:
                await asyncio.gather(*events)
                logger.info("✅ All room egress sessions stopped.")
        else:
            logger.info("No active egress found for this room.")
            
        await lkapi.aclose()
        
    except Exception as e:
        logger.error(f"Failed to stop egress: {e}")

class MusicAssistant(Agent):
    def __init__(self, publish_data_fn=None, user_id=None):
        super().__init__(
            instructions="""You are RRAASI Music Creator, a specialized AI agent for creating healing, spiritual, and meditative music.
Your goal is to create the PERFECT music track for the user.

**CRITICAL UNDERSTANDING:**
- When generating music with vocals, the 'lyrics' parameter = EXACT text to be sung
- The 'style' parameter = genre + mood + instruments description  
- NEVER mix these up!

**MONETIZATION & COINS:**
- Every music generation costs **50 coins**.
- **CRITICAL**: Before starting the "Discovery" process for new music, you MUST call the `get_user_balance` tool to check the user's balance.
- If the balance is below 50, inform the user immediately and stop the creation flow.

**PROTOCOL FOR INTERACTION:**

1.  **Balance Check (FIRST STEP):**
    Call `get_user_balance` tool first if a user asks to create music.
    - If < 50 coins: Say exactly this — "You currently have [X] coins, but creating new music requires at least 50 coins. You can add coins by tapping the ✦ button at the top of the screen, or by visiting your Profile page. Once you've topped up, I'll be happy to create your track!"
    - Then offer to play their existing tracks instead.
    - If >= 50: Proceed to Deep Discovery.

2.  **Deep Discovery:**
    When a user asks for music, ask clarifying questions:
    -   **First question**: "Would you like this track with vocals or purely instrumental?"
    -   **Genre/Style**: "What style? Bhajan, Mantra, Trance, Meditation, Ambient, Classical, Healing Frequencies?"
    -   **Instruments**: "Which instruments? Bansuri, Sitar, Tabla, Piano, Crystal Bowls, Synthesizer (for Trance), Didgeridoo?"
    -   **Mood**: "What mood? Peaceful, Devotional, Uplifting, Introspective, Ecstatic (Trance), Grounding?"

3.  **LYRICS HANDLING (For vocal tracks):**
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

✅ GOOD (Instrumental - Trance):
generate_music(
    lyrics="",
    style="Psychedelic spiritual trance with deep bass, synthesizer pads, tribal drums, and 528Hz overtones — builds slowly into ecstatic release",
    title="Shiva Trance",
    is_instrumental=True
)

✅ GOOD (Instrumental - Meditation):
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

**RETRIEVING & PLAYING PAST TRACKS:**
- If user asks for "last music", "my tracks", or "previous songs":
  - To JUST LIST them: use `list_tracks`.
  - To PLAY them (e.g. "play my last track"): use `check_song_status`.
  
**CAPABILITIES:**
- You **CAN** play music directly for the user using `check_song_status`. 
- NEVER say you cannot play music. If the user asks to play, ALWAYS try `check_song_status`.
"""
        )
        self._publish_data_fn = publish_data_fn
        self.suno_client = SunoClient()
        self.user_id = user_id or "default_user"
        self.db_helper = FirebaseDB()

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
        
        # 1. Coin Balance Check (CRITICAL)
        try:
            user_coins = self.db_helper.get_user_coins(self.user_id)
            logger.info(f"User {self.user_id} has {user_coins} coins. Generation cost: 50.")
            
            if user_coins < 50:
                logger.warning(f"Insufficient coins for user {self.user_id}: {user_coins} < 50")
                # Notify the frontend to show the Add Coins modal
                if self._publish_data_fn:
                    try:
                        await self._publish_data_fn(
                            json.dumps({"type": "show_add_coins", "balance": user_coins}).encode("utf-8")
                        )
                    except Exception as e:
                        logger.error(f"Failed to send show_add_coins event: {e}")
                return f"I'm sorry, but you need at least 50 coins to generate a music track. Your current balance is {user_coins} coins. You can add coins by tapping the ✦ Plus button at the top of the screen, or by visiting your Profile page. Once you've topped up, I'll be happy to create your spiritual track! 🪙"
        except Exception as e:
            logger.error(f"Error checking user coins: {e}")
            # Fail open for safety or closed? Let's fail open but log it.
            pass

        try:
            # Use specific callback server for webhooks
            # Use specific callback server for webhooks
            # Use AUTH_SERVER_URL to ensure we hit the active server
            callback_base = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
            callback_url = f"{callback_base}/suno/callback?userId={self.user_id}&category=rraasi_music"
            
            logger.info(f"DEBUG CALLBACK: Using User ID: {self.user_id}")
            logger.info(f"DEBUG CALLBACK: Callback URL: {callback_url}")
            
            # Hybrid Routing Logic
            provider = "suno"
            result = None
            task_id = None
            
            # All music generation goes through Suno (fal.ai disabled for now)
            suno_callback_url = f"{callback_base}/suno/callback?userId={self.user_id}&category=rraasi_music"
            
            logger.info(f"Routing to Suno ({'instrumental' if is_instrumental else 'vocal'}).")
            try:
                result = await self.suno_client.generate_music(
                    prompt=lyrics if not is_instrumental else style,
                    is_instrumental=is_instrumental,
                    custom_mode=not is_instrumental,  # custom_mode only for vocal (needs lyrics)
                    style=style,
                    title=title,
                    model="V3_5",
                    callback_url=suno_callback_url
                )
            except Exception as e:
                logger.error(f"Suno generation failed: {e}")
                raise
            
            logger.info(f"API Result ({provider}): {result}")
            
            # The result format is: {'code': 200, 'msg': 'success', 'data': {'taskId': '...'}}
            task_id = None
            if isinstance(result, dict) and result.get("code") == 200:
                data = result.get("data", {})
                task_id = data.get("taskId")
            
            if not task_id:
                logger.warning(f"Could not parse taskId from result: {result}")
                return "I've sent the request, but I couldn't track the generation status automatically. Please check back in a moment."

            # Callback webhook will handle saving to Firebase when ready
            logger.info(f"Music generation started. Task ID: {task_id}")
            logger.info(f"Callback webhook will save track automatically")

            # --- METADATA ENHANCEMENT ---
            healing_meta = {}
            try:
                mood_hint = "Spiritual"
                # Generate metadata (including category and story)
                healing_meta = await self._generate_healing_metadata(title, style, mood_hint, lyrics)
            except Exception as meta_error:
                logger.error(f"Failed to generate metadata: {meta_error}")
                # Continue with empty/basic metadata
            
            try:
                # Save pending record to Firebase (CRITICAL Step)
                # Determine category (use generated or system default)
                # We save 'system_category' as 'rraasi_music' for internal routing,
                # but 'musicCategory' contains the user-facing type (Meditation, Sleep, etc)
                music_category = healing_meta.get("category", "Meditation")
                
                track_data = {
                    "title": title,
                    "status": "generating",
                    "taskId": task_id,
                    "provider": provider,
                    "prompt": lyrics or style,
                    "style": style,
                    "description": healing_meta.get("description", f"A beautiful {style} track"),
                    "story": healing_meta.get("story", f"This track was created to bring peace and tranquility. Integrating {style}, it aims to help you disconnect from the noise of the world and find your inner center."),
                    "musicCategory": music_category,
                    "healingBenefits": healing_meta.get("benefits", []),
                    "tags": healing_meta.get("tags", []),
                    "uploadMetadata": {
                        "title": healing_meta.get("seoTitle", title),
                        "description": healing_meta.get("seoDescription", ""),
                        "keywords": healing_meta.get("tags", [])
                    },
                    "category": "rraasi_music"  # System category for routing/indexing
                }
                # Save using taskId as document ID so callback can merge
                self.db_helper.save_music_track(self.user_id, track_data, track_id=task_id)
                logger.info("✅ Saved pending track to Firestore")
            except Exception as db_error:
                logger.error(f"Failed to save tracking record to DB: {db_error}")

            return f"I have started creating your spiritual track: '{title}'. It usually takes about 60-90 seconds to manifest.\n\n🎵 **Important:** You can find your created tracks in the **My Music** section of the app.\n\nI will notify you when it's ready!"

        except Exception as e:
            logger.error(f"Music generation failed: {e}")
            return "I apologize, but I encountered an error while trying to generate the music. Please try again."

    async def _generate_healing_metadata(self, title: str, style: str, mood: str, lyrics: str) -> dict:
        """
        Generate healing description, benefits, category, story, and SEO tags for the music.
        """
        logger.info(f"✨ [DEPLOY_CHECK] Generating healing metadata for: {title}")
        prompt = f"""You are a spiritual music curator and SEO expert. A user has created a music track with the following details:
Title: {title}
Style: {style}
Mood: {mood}
Lyrics/Prompt: {lyrics}

Generate a rich metadata profile for this track in JSON format:
1. "category": Choose ONE best fit from: [Meditation, Deep Sleep, Concentration, Healing, Devotional, Relaxation, Yoga, Chant].
2. "story": A detailed, engaging story (3-4 sentences) about this specific track. Describe how it was conceived, the journey it takes the listener on, and why it is useful for the chosen category. Make it sound premium and intentional.
3. "description": A beautiful, poetic, healing-focused description (2-3 sentences).
4. "benefits": A list of 3 short spiritual/emotional benefits (e.g., "Calms the mind").
5. "tags": A list of 10 relevant SEO hashtags for SoundCloud/YouTube (e.g., #meditation, #healing, #rraasi).
6. "seoTitle": A catchy, SEO-friendly title for YouTube/SoundCloud (e.g., "Deep Healing Flute Meditation | RRAASI").
7. "seoDescription": A longer description suitable for YouTube video description, including the benefits.

Respond ONLY with the JSON object.
"""
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a spiritual music expert."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Metadata generation failed: {e}")
            # Fallback
            return {
                "category": "Meditation",
                "story": f"Inspired by the need for peace in a chaotic world, '{title}' serves as a sonic sanctuary. Its {style} elements weave together to create a gentle embrace for your soul, guiding you towards deep inner silence.",
                "description": f"A beautiful {style} track titled '{title}' created with RRAASI AI.",
                "benefits": ["Relaxation", "Peace", "Joy"],
                "tags": ["#rraasi", "#music", "#healing"],
                "seoTitle": f"{title} | RRAASI Music",
                "seoDescription": f"Listen to {title}, a generated {style} track."
            }

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
            
            # Get tracks from auth server (still using auth-server for track retrieval)
            auth_server_url = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
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

    @function_tool
    async def get_user_balance(self, context: RunContext) -> str:
        """
        Check the user's current coin balance. 
        ALWAYS call this before starting a new music creation flow.
        """
        try:
            coins = self.db_helper.get_user_coins(self.user_id)
            logger.info(f"Checking balance for {self.user_id}: {coins} coins")
            
            # If balance is low, trigger the top-up screen on the frontend immediately
            if coins < 50 and self._publish_data_fn:
                try:
                    await self._publish_data_fn(
                        json.dumps({"type": "show_add_coins", "balance": coins}).encode("utf-8")
                    )
                    logger.info(f"Triggered show_add_coins modal for user {self.user_id}")
                except Exception as e:
                    logger.error(f"Failed to publish show_add_coins event: {e}")

            return f"The user currently has {coins} coins."
        except Exception as e:
            logger.error(f"Error getting balance: {e}")
            return "I'm sorry, I couldn't check the balance right now. Let's assume you have enough for now, but I'll check again before final generation."

    @function_tool
    async def check_song_status(
        self,
        context: RunContext,
        song_title: str = "",
    ) -> str:
        """
        Check if a song has been created and is ready to play.
        Searches user's tracks in Firebase by title.
        
        Args:
            song_title: Optional title or keywords to search for. If empty, shows recent tracks.
        
        Returns:
            Status message with play link if found, or instruction to check later.
        """
        try:
            import aiohttp
            
            logger.info(f"Checking song status for user {self.user_id}, title: '{song_title}'")
            
            # Get tracks from auth server
            auth_server_url = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
            url = f"{auth_server_url}/suno/tracks?userId={self.user_id}&limit=20"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.error(f"Failed to fetch tracks: {response.status}")
                        return "I'm having trouble checking your songs right now. Please try again in a moment."
                    
                    data = await response.json()
                    tracks = data.get("tracks", [])
            
            if not tracks:
                return "You haven't created any music tracks yet. Would you like to create one?"
            
            # If song_title provided, search for it
            if song_title:
                # Search for matching tracks (case-insensitive)
                matching_tracks = [
                    t for t in tracks 
                    if song_title.lower() in t.get("title", "").lower()
                ]
                
                if matching_tracks:
                    # Found matching track(s)
                    track = matching_tracks[0]  # Get most recent match
                    title = track.get("title", "Untitled")
                    audio_url = track.get("audioUrl", "")
                    status = track.get("status", "UNKNOWN")
                    
                    if status == "COMPLETED" and audio_url:
                        logger.info(f"Found completed track: {title}")
                        # Play the track
                        image_url = track.get("imageUrl", "")
                        await self._play_audio_url(audio_url, title, image_url)
                        return f"Great news! Your song '{title}' is ready and playing now!"
                    else:
                        return f"I found your song '{title}', but it's still being created. Please check 'My Music' in a few moments!"
                else:
                    return f"I couldn't find a song matching '{song_title}' in your library. Would you like me to play your most recent track instead?"
            
            # No title provided - find the MOST RECENT completed track
            completed_tracks = [t for t in tracks if t.get("status") == "COMPLETED" and t.get("audioUrl")]
            
            if completed_tracks:
                # Play the absolute most recent one
                latest_track = completed_tracks[0]
                title = latest_track.get("title", "Untitled")
                audio_url = latest_track.get("audioUrl", "")
                
                logger.info(f"Playing latest track for user: {title}")
                image_url = latest_track.get("imageUrl", "")
                await self._play_audio_url(audio_url, title, image_url)
                return f"I've found your latest track '{title}'. Playing it now for you!"
            else:
                return "Your tracks are still in the process of creation. Please give it another minute and then ask me again!"
                
        except Exception as e:
            logger.error(f"Failed to check song status: {e}")
            return "I'm having trouble checking your songs right now. Please try again in a moment."
                
    async def _play_audio_url(self, url: str, title: str, image_url: str = ""):
        """Internal helper to publish play event to frontend."""
        if not self._publish_data_fn:
            logger.warning("No publish function available for playback")
            return
            
        try:
            payload = {
                "name": title,
                "title": title,
                "artist": "RRAASI AI",
                "audio_url": url,
                "image_url": image_url,
                "message": f"Playing '{title}'..."
            }
            await self._publish_data_fn(json.dumps(payload).encode("utf-8"))
            logger.info(f"[Playback] 🎵 Sent play event for: {title}")
        except Exception as e:
            logger.error(f"Error publishing playback data: {e}")



def prewarm(proc: JobProcess):
    proc.userdata["vad"] = None

async def entrypoint(ctx: JobContext):
    logger.info(f"Starting Music Agent for room: {ctx.room.name}")

    # Connect to the room explicitly to access participant events/metadata
    await ctx.connect()
    
    # Wait for participant to join and extract userId AND language from metadata
    user_id = "default_user"
    user_language = "hi"  # Default to Hindi for devotional music
    
    participant = None
    
    # 1. Get Participant
    try:
        logger.info("Waiting for participant to join...")
        participant = await ctx.wait_for_participant()
        logger.info(f"Participant joined: {participant.identity}")
    except Exception as e:
        logger.error(f"Error waiting for participant: {e}")

    # 2. Try Metadata Extraction (Independent Block)
    user_intention = None
    resume_session_id = None
    
    if participant:
        try:
            # Wait a bit for metadata to sync if needed
            if not participant.metadata:
                logger.info("Metadata empty, waiting for sync...")
                for i in range(10):
                    await asyncio.sleep(0.5)
                    if participant.metadata:
                        logger.info(f"Metadata synced after {i+1} attempts")
                        break
            
            # Helper to extract info from metadata
            def extract_user_info(metadata_str):
                u_id = "default_user"
                lang = "hi"
                intention = None
                resume_session_id = None
                if metadata_str:
                    try:
                        data = json.loads(metadata_str)
                        # Try multiple keys for userId
                        u_id = data.get("userId") or data.get("uid") or data.get("user_id") or "default_user"
                        intention = data.get("intention")
                        resume_session_id = data.get("resumeSessionId")
                        lang_raw = str(data.get("language", "")).strip().lower()
                        if lang_raw in ["hi", "hindi", "hin"]:
                            lang = "hi"
                        elif lang_raw in ["en", "english", "eng"]:
                            lang = "en"
                        else:
                            lang = lang_raw if lang_raw else "hi"
                    except Exception as e:
                        logger.error(f"Failed to parse metadata: {e}")
                return u_id, lang, intention, resume_session_id

            if participant.metadata:
                logger.info(f"🔍 RAW METADATA RECEIVED: {participant.metadata}")
                user_id, user_language, user_intention, resume_session_id = extract_user_info(participant.metadata)
                logger.info(f"📝 Detected participant metadata - userId: {user_id}, language: {user_language}, intention: {user_intention}, resumeSessionId: {resume_session_id}")
            else:
                logger.warning("No metadata found for participant")
                
        except Exception as e:
            logger.error(f"Error checking metadata: {e}")
            # Continue to fallback

    # 3. Fallback to Identity (Independent Block)
    if participant and user_id == "default_user":
        try:
            # DEBUG LOG
            logger.info(f"debug_identity_fallback: Participant Identity='{participant.identity}'")
            
            if participant.identity:
                # Format: <userId>__<random>
                if "__" in participant.identity:
                    parts = participant.identity.split("__")
                    if parts[0] and len(parts[0]) > 1:
                        user_id = parts[0]
                        logger.info(f"✅ Extracted userId from Identity: {user_id}")
                # Fallback for old identity format or bare IDs
                elif len(participant.identity) > 5 and "guest" not in participant.identity.lower() and "rraasi_music" not in participant.identity:
                     user_id = participant.identity
                     logger.info(f"⚠️ Using raw Identity as userId: {user_id}")
        except Exception as e:
            logger.error(f"Error checking identity fallback: {e}")

    # 4. Session Map Lookup (The Robust Fix)
    if user_id == "default_user":
        try:
            import aiohttp
            room_name = ctx.room.name
            logger.info(f"🔄 Checking Session Map for room: {room_name}")
            
            auth_server_url = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
            # Local dev fallback if needed, but env var should be set
            if "localhost" in auth_server_url:
                 # Ensure we can reach logic from python agent container/env
                 pass

            map_url = f"{auth_server_url}/livekit/session/{room_name}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(map_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        mapped_user_id = data.get("userId")
                        if mapped_user_id:
                            user_id = mapped_user_id
                            logger.info(f"✅ FOUND userId via Session Map: {user_id}")
                    else:
                        logger.warning(f"Session Map not found (status {response.status})")

        except Exception as e:
             logger.error(f"Error querying session map: {e}")
    
    # Final validation
    if user_language not in {"hi", "en"}:
        logger.warning(f"Unsupported language '{user_language}', defaulting to Hindi")
        user_language = "hi"
    
    logger.info(f"🌐 Music Agent using language: {user_language}")
    
    # Initialize STT based on language preference
    sarvam_key = os.getenv("SARVAM_API_KEY")
    stt_model = os.getenv("STT_MODEL", "sarvam")
    
    if user_language == "hi":
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
    
    # Initialize TTS with language-specific voice
    def select_tts_voice_for_music(lang: str) -> str:
        """Select appropriate TTS voice for music agent based on language."""
        if lang == "hi":
            # Priority: Music-specific > Global Hindi > Legacy > Hardcoded fallback
            specific = os.getenv("MUSIC_TTS_VOICE_HI")
            global_lang = os.getenv("TTS_VOICE_HI")
            legacy = os.getenv("TTS_VOICE_ID")
            
            if specific:
                logger.info(f"Using Music TTS voice for Hindi: {specific}")
                return specific
            if global_lang:
                logger.info(f"Using global Hindi TTS voice: {global_lang}")
                return global_lang
            if legacy:
                logger.info(f"Using legacy TTS voice for Hindi: {legacy}")
                return legacy
            
            # Hardcoded fallback
            logger.warning("No Hindi TTS voice configured, using fallback")
            return "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
        else:
            # English voice selection
            specific = os.getenv("MUSIC_TTS_VOICE_EN")
            global_lang = os.getenv("TTS_VOICE_EN")
            legacy = os.getenv("TTS_VOICE_ID")
            
            if specific:
                logger.info(f"Using Music TTS voice for English: {specific}")
                return specific
            if global_lang:
                logger.info(f"Using global English TTS voice: {global_lang}")
                return global_lang
            if legacy:
                logger.info(f"Using legacy TTS voice for English: {legacy}")
                return legacy
            
            return "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
    
    tts_voice = select_tts_voice_for_music(user_language)
    tts = inference.TTS(
        model="cartesia/sonic-3",
        voice=tts_voice,
        language=user_language  # Dynamic language!
    )
    
    logger.info(f"Using TTS voice: {tts_voice} for language: {user_language}")
    
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
    
    if resume_session_id:
        logger.info(f"🔄 Resuming session context from room: {resume_session_id}")
        db_instance = FirebaseDB()
        past_transcript = db_instance.get_transcript_by_id(resume_session_id)
        if past_transcript and hasattr(session, 'history'):
            logger.info(f"Adding {len(past_transcript)} past messages to session history")
            for msg in past_transcript:
                # Add context. We only append 'user' and 'assistant' roles from the past
                if hasattr(session.history, 'append'):
                    session.history.append(msg)
                elif hasattr(session.history, 'items'):
                    # It's a ChatContext
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content and role in ["user", "assistant", "system"]:
                        session.history.append(role=role, text=content) if hasattr(session.history, 'append') else None
                        # Using raw append if add_message is tricky with Enums.
                        # Wait, ChatContext in livekit agents is just appended to items
                        # or using append method? 
                        if hasattr(session.history, 'append'):
                            pass # handled above
                        elif hasattr(session.history, 'messages'):
                            # older versions
                            from livekit.agents.llm import ChatMessage
                            session.history.messages.append(ChatMessage(role=role, text=content))
                        elif hasattr(session.history, 'add_message'):
                            # newer version
                            session.history.add_message(role=role, content=content)
    
    # Start the session (this connects to the room)
    await session.start(assistant, room=ctx.room)
    
    # Now that we're connected, set the publish function
    assistant._publish_data_fn = ctx.room.local_participant.publish_data
    
    # Handle chat messages from the frontend
    from livekit import rtc
    
    async def _on_data_received(data, participant=None, kind=None, topic=None):
        """Handle incoming data channel messages from the frontend."""
        try:
            logger.info(f"📩 [DATA_RECEIVED] type={type(data)}, participant={participant.identity if participant else 'None'}, topic={topic}")
            
            # Extract raw bytes from the data argument
            data_bytes = None
            if isinstance(data, bytes):
                data_bytes = data
            elif isinstance(data, rtc.DataPacket):
                data_bytes = data.data
            elif hasattr(data, 'data'):
                data_bytes = data.data
            elif isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                logger.warning(f"Unexpected data type: {type(data)}")
                return
            
            if data_bytes is None:
                logger.warning("No data bytes extracted")
                return
            
            payload_str = data_bytes.decode('utf-8') if isinstance(data_bytes, bytes) else str(data_bytes)
            logger.info(f"📩 Decoded payload: {payload_str[:200]}")
            
            # Parse JSON
            try:
                payload = json.loads(payload_str)
            except json.JSONDecodeError:
                # Plain text message, use directly
                logger.info(f"📩 Plain text message, sending to agent: {payload_str[:100]}")
                asyncio.create_task(session.generate_reply(user_input=payload_str))
                return
            
            # Handle chat messages (from useChat hook, topic = "lk-chat-topic")
            if isinstance(payload, dict) and 'message' in payload:
                chat_text = payload['message']
                logger.info(f"📩 Chat message received: {chat_text}")
                asyncio.create_task(session.generate_reply(user_input=chat_text))
                return
            
            # Handle text field as fallback
            if isinstance(payload, dict) and 'text' in payload:
                chat_text = payload['text']
                logger.info(f"📩 Text message received: {chat_text}")
                asyncio.create_task(session.generate_reply(user_input=chat_text))
                return
            
            logger.debug(f"Ignoring non-chat data: {payload_str[:100]}")
            
        except Exception as e:
            logger.error(f"Error handling data message: {e}", exc_info=True)
    
    def _handle_room_data(data, participant=None, kind=None, topic=None):
        """Synchronous callback for data_received event - schedules async handler."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(_on_data_received(data, participant, kind, topic))
            else:
                loop.run_until_complete(_on_data_received(data, participant, kind, topic))
        except Exception as e:
            logger.error(f"Error scheduling _on_data_received: {e}", exc_info=True)
    
    ctx.room.on("data_received", _handle_room_data)
    logger.info("✅ Data channel listener registered for chat messages")

    # Listen for metadata updates (Late Login Fix)
    @ctx.room.on("participant_metadata_changed")
    def on_participant_metadata_changed(participant, prev_metadata, **kwargs):
        """Update User ID if metadata changes mid-session"""
        if not participant.metadata:
            return
            
        try:
            data = json.loads(participant.metadata)
            new_user_id = data.get("userId")
            
            if new_user_id and new_user_id != "default_user" and new_user_id != assistant.user_id:
                logger.info(f"🔄 User logged in/updated mid-session. Updating ID from {assistant.user_id} to {new_user_id}")
                assistant.user_id = new_user_id
                
                # Verify update
                logger.info(f"✅ Music Agent now using userId: {assistant.user_id}")
        except Exception as e:
            logger.error(f"Error processing metadata update: {e}")
    
    # Send language-appropriate welcome message
    # Send language-appropriate welcome message
    if user_language == "hi":
        if user_intention == "bhajan":
            welcome_msg = "नमस्ते। मैं आपके लिए एक सुंदर भजन बनाने के लिए तैयार हूँ। आप किस देवता या भाव के लिए भजन बनाना चाहेंगे?"
        elif user_intention == "healing":
            welcome_msg = "नमस्ते। संगीत एक माध्यम है जो हमें परम शांति से जोड़ सकता है। मैं आपके लिए हीलिंग फ्रीक्वेंसी बना सकता हूँ। आप कैसा अनुभव करना चाहते हैं?"
        elif user_intention == "compose_lyrics":
            welcome_msg = "नमस्ते। मैं आपके शब्दों को संगीत देने के लिए तैयार हूँ। कृपया अपनी कविता या गीत साझा करें, और बताएं कि आप इसमें कौन सा भाव या राग चाहते हैं।"
        else:
            welcome_msg = (
                "नमस्ते। संगीत वह साधन है जो, यदि सही ढंग से उपयोग किया जाए, तो हमें परम सत्य से जोड़ सकता है। "
                "मैं आपके लिए भजन, मंत्र, ध्यान संगीत, या हीलिंग फ्रीक्वेंसी बना सकता हूँ। आज आप क्या रचना करके वर्तमान क्षण का हिस्सा बनना चाहेंगे?"
            )
    else:
        if user_intention == "bhajan":
            welcome_msg = "Namaste. I am ready to create a beautiful Bhajan for you. Which deity or sentiment would you like to dedicate this to?"
        elif user_intention == "healing":
            welcome_msg = "Namaste. Music is a tool that can connect us to ultimate peace. I can create Healing Frequencies for you. What kind of healing experience are you seeking?"
        elif user_intention == "compose_lyrics":
            welcome_msg = "Namaste. I am ready to give voice to your words. Please share your lyrics, poem or ghazal, and tell me the emotion you wish to convey."
        else:
            welcome_msg = (
                "Namaste. Music is a tool which, if used correctly, can be a path to connect to the ultimate. "
                "I can create Bhajans, Mantras, Meditation music, or Healing Frequencies. What would you like to create today to be part of the present moment?"
            )
    
    await session.say(welcome_msg)

    # --- SESSION MONITORING & COIN DEDUCTION ---
    import time
    import aiohttp
    
    start_time = time.time()
    logger.info(f"⏱️ Session started at {start_time}")
    
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
        # Stop all egress for this room to ensure recordings are finalized
        await stop_room_egress(ctx.room.name)
        end_time = time.time()
        duration_seconds = end_time - start_time
        duration_minutes = duration_seconds / 60.0
        
        logger.info(f"⏱️ Session ended. Duration: {duration_seconds:.2f}s ({duration_minutes:.2f} min)")
        
        # Save transcript to Firebase
        try:
            logger.info("Saving session transcript...")
            db_instance = FirebaseDB()
            
            # Extract messages
            transcript = []
            # session.chat_ctx might not be populated if only STT was used?
            # Music agent uses session.chat() for text input, and standard STT for voice
            # so chat_ctx should have history.
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
            
            session_data = {
                "userId": user_id,
                "agentName": "music-agent",
                "roomName": ctx.room.name
            }
            
            db_instance.save_session_transcript(ctx.room.name, session_data, transcript)
        except Exception as e:
            logger.error(f"❌ Failed to save transcript: {e}")

        # Deduct coins if session was meaningful (> 30s) and user is authenticated
        if duration_seconds > 30 and user_id != "default_user":
            try:
                auth_url = os.getenv("AUTH_SERVER_URL", "https://satsang-auth-server-6ougd45dya-el.a.run.app")
                # Ensure no trailing slash
                auth_url = auth_url.rstrip('/')
                deduct_url = f"{auth_url}/coins/deduct-session"
                
                logger.info(f"💸 Attempting coin deduction at: {deduct_url}")
                
                async with aiohttp.ClientSession() as http_session:
                    payload = {
                        "userId": user_id,
                        "durationMinutes": duration_minutes,
                        "agentName": "music_agent"
                    }
                    async with http_session.post(deduct_url, json=payload) as resp:
                        if resp.status == 200:
                             data = await resp.json()
                             logger.info(f"✅ Coin deduction successful: {data}")
                        else:
                             text = await resp.text()
                             logger.error(f"❌ Coin deduction failed ({resp.status}): {text}")
            except Exception as e:
                logger.error(f"❌ Failed to call coin deduction API: {e}")
        else:
            logger.info(f"⏭️ Skipping deduction (Duration: {duration_seconds:.2f}s, User: {user_id})")

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
# Force push update

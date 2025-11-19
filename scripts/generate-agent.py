#!/usr/bin/env python3
"""
Agent Generator Script

Generates a complete new spiritual leader agent (backend + frontend) from a configuration file.
Usage:
    python scripts/generate-agent.py --config agent-config.json
    python scripts/generate-agent.py --interactive
"""

import json
import re
import sys
from pathlib import Path
from string import Template
from typing import Dict, List, Any
import argparse


class AgentGenerator:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backend_dir = project_root / "livekit_server" / "agent-starter-python" / "src"
        self.frontend_app_dir = project_root / "app" / "(app)"
        self.components_dir = project_root / "components" / "app"
        self.translations_file = project_root / "lib" / "translations.ts"
        
    def validate_config(self, config: Dict[str, Any]) -> List[str]:
        """Validate configuration and return list of errors."""
        errors = []
        
        required_fields = [
            "agent_name", "display_name", "route_path", "description",
            "instructions", "features", "greetings"
        ]
        
        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        if "agent_name" in config:
            agent_name = config["agent_name"]
            if not re.match(r"^[a-z][a-z0-9]*$", agent_name):
                errors.append("agent_name must be lowercase, start with a letter, and contain only letters and numbers")
        
        if "route_path" in config:
            route_path = config["route_path"]
            if not route_path.startswith("/"):
                errors.append("route_path must start with '/'")
            if not re.match(r"^/[a-z0-9-]+$", route_path):
                errors.append("route_path must contain only lowercase letters, numbers, and hyphens")
        
        if "features" in config:
            if not isinstance(config["features"], list):
                errors.append("features must be a list")
            elif len(config["features"]) == 0:
                errors.append("features must contain at least one feature")
            else:
                for i, feature in enumerate(config["features"]):
                    if not isinstance(feature, dict):
                        errors.append(f"features[{i}] must be a dictionary")
                    elif "title" not in feature or "description" not in feature:
                        errors.append(f"features[{i}] must have 'title' and 'description' fields")
        
        if "greetings" in config:
            if not isinstance(config["greetings"], dict):
                errors.append("greetings must be a dictionary")
            else:
                required_greeting_keys = ["hi", "hi_group", "en", "en_group"]
                for key in required_greeting_keys:
                    if key not in config["greetings"]:
                        errors.append(f"greetings must have '{key}' key")
        
        return errors
    
    def check_existing_agent(self, agent_name: str) -> bool:
        """Check if agent already exists."""
        agent_file = self.backend_dir / f"{agent_name}agent.py"
        return agent_file.exists()
    
    def to_pascal_case(self, snake_str: str) -> str:
        """Convert snake_case to PascalCase."""
        components = snake_str.split('_')
        return ''.join(x.capitalize() for x in components)
    
    def generate_backend_agent(self, config: Dict[str, Any]) -> str:
        """Generate backend Python agent file content."""
        agent_name = config["agent_name"]
        agent_class = self.to_pascal_case(agent_name) + "Agent"
        instructions = config["instructions"]
        tool_name = config.get("tool_name", f"search_{agent_name}_discourse")
        tool_display_name = config.get("tool_display_name", config["display_name"])
        tool_keywords = config.get("tool_keywords", [agent_name.lower()])
        
        # Generate tool function
        tool_code = self._generate_tool_function(
            tool_name, tool_display_name, tool_keywords, agent_name
        )
        
        # Read template from oshoagent.py structure
        content = self._get_backend_template()
        
        # Replace logger name
        content = content.replace('logger = logging.getLogger("oshoagent")', f'logger = logging.getLogger("{agent_name}agent")')
        content = content.replace('f"MODULE IMPORT: oshoagent.py', f'f"MODULE IMPORT: {agent_name}agent.py')
        
        # Replace class name
        content = content.replace("class OshoAgent(Agent):", f"class {agent_class}(Agent):")
        content = content.replace("osho_agent = OshoAgent(", f"{agent_name}_agent = {agent_class}(")
        
        # Replace entrypoint log messages
        content = content.replace("ENTRYPOINT: Starting Osho agent initialization", f"ENTRYPOINT: Starting {agent_class} agent initialization")
        content = content.replace("Starting Osho agent worker", f"Starting {agent_class} agent worker")
        
        # Replace instructions - find the instructions section
        instructions_start = content.find('instructions="""You are Osho')
        if instructions_start != -1:
            # Find the end of instructions (triple quotes)
            instructions_end = content.find('"""', instructions_start + 14)
            if instructions_end != -1:
                # Replace with new instructions
                new_instructions = f'instructions="""{instructions}"""'
                content = content[:instructions_start] + new_instructions + content[instructions_end + 3:]
        
        # Replace tool function - find search_osho_discourse and replace it
        tool_start = content.find('async def search_osho_discourse(')
        if tool_start != -1:
            # Find the end of the function (next def or async def)
            tool_end = content.find('\n\n\ndef prewarm', tool_start)
            if tool_end == -1:
                tool_end = content.find('\ndef prewarm', tool_start)
            if tool_end != -1:
                content = content[:tool_start - 4] + tool_code + "\n\n" + content[tool_end:]
        
        # Replace tool references in instructions
        content = content.replace("search_osho_discourse", tool_name)
        content = content.replace("Osho discourse", f"{tool_display_name} discourse")
        content = content.replace("Osho discourses", f"{tool_display_name} discourses")
        content = content.replace("Osho's discourses", f"{tool_display_name}'s discourses")
        
        # Replace greetings - find greeting blocks and replace them
        # Pattern: greeting = (\n                "..."\n            )
        greeting_pattern = r'greeting = \(\s+"[^"]+"\s+\)'
        
        # Find all greeting blocks
        greetings_found = []
        for match in re.finditer(r'greeting = \(', content):
            # Find the closing parenthesis
            start = match.start()
            paren_count = 0
            i = start
            while i < len(content):
                if content[i] == '(':
                    paren_count += 1
                elif content[i] == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        end = i + 1
                        greeting_block = content[start:end]
                        greetings_found.append((start, end, greeting_block))
                        break
                i += 1
        
        # Replace greetings in reverse order to maintain positions
        for start, end, greeting_block in reversed(greetings_found):
            # Determine which greeting to use based on context
            # Check lines before the greeting
            context_start = max(0, start - 200)
            context = content[context_start:start]
            
            if 'if user_language == \'hi\':' in context:
                if 'if is_group_conv:' in context[-100:]:
                    new_greeting = f'greeting = (\n                "{config["greetings"]["hi_group"]}"\n            )'
                else:
                    new_greeting = f'greeting = (\n                "{config["greetings"]["hi"]}"\n            )'
            else:  # English section
                if 'if is_group_conv:' in context[-100:]:
                    new_greeting = f'greeting = (\n                "{config["greetings"]["en_group"]}"\n            )'
                else:
                    new_greeting = f'greeting = (\n                "{config["greetings"]["en"]}"\n            )'
            
            content = content[:start] + new_greeting + content[end:]
        
        # Replace group conversation mode text
        content = content.replace("Osho's spiritual teachings", f"{tool_display_name}'s spiritual teachings")
        
        return content
    
    def _generate_tool_function(self, tool_name: str, display_name: str, keywords: List[str], agent_name: str) -> str:
        """Generate the tool function code."""
        keyword_checks = " or ".join([f'"{kw}" in topic.lower()' for kw in keywords])
        keyword_list = ", ".join([f'"{kw}"' for kw in keywords])
        
        return f'''    @function_tool
    async def {tool_name}(
        self,
        context: RunContext,
        topic: str,
        max_results: int = 5,
    ) -> str:
        """Search for {display_name} discourses, talks, or teachings on YouTube.

        Use this when the user asks for {display_name} discourses, talks, teachings, or wants to listen to {display_name} speak on any topic.

        Args:
            topic: The topic to search for {display_name} discourse (e.g., "{display_name} on meditation", "{display_name} discourse on love", "{display_name} talk").
            max_results: Number of results to return (1-10).

        Returns:
            A short confirmation telling the user results were found and the first one is playing.
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
            
            # Enhance search query for {display_name} content
            enhanced_topic = topic
            if not ({keyword_checks}):
                enhanced_topic = f"{display_name} {{topic}}"
            elif "discourse" not in topic.lower() and "talk" not in topic.lower() and "vani" not in topic.lower():
                enhanced_topic = f"{{topic}} {display_name} discourse"
            
            results = await find_vani_videos_async(enhanced_topic, max_results)
        except Exception as e:
            logger.error(f"{display_name} discourse search failed for topic='{{topic}}': {{e}}", exc_info=True)
            results = []

        # Build payload for frontend (list of lectures)
        payload = {{
            "type": "vani.results",
            "topic": topic,
            "results": [
                {{
                    "videoId": r.get("video_id"),
                    "title": r.get("title"),
                    "channelTitle": r.get("channel_title"),
                    "thumbnail": r.get("thumbnail"),
                    "url": r.get("url"),
                }}
                for r in results
            ],
        }}

        # Publish with appropriate topic (handled by publisher)
        try:
            publish_fn = getattr(self, "_publish_data_fn", None)
            if callable(publish_fn):
                data_bytes = json.dumps(payload).encode("utf-8")
                await publish_fn(data_bytes)  # publisher decides topic
        except Exception as e:
            logger.error(f"Failed to publish {display_name} discourse results: {{e}}", exc_info=True)

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
                        play_payload = {{
                            "name": first_title,
                            "artist": first_result.get("channel_title", "{display_name}"),
                            "youtube_id": first_video_id,
                            "youtube_url": first_result.get("url", f"https://www.youtube.com/watch?v={{first_video_id}}"),
                            "message": f"{display_name} discourse '{{first_title}}' is now playing.",
                        }}
                        play_data_bytes = json.dumps(play_payload).encode("utf-8")
                        await publish_fn(play_data_bytes)
                        logger.info(f"✅ Published first {display_name} discourse for playback: {{first_title}} ({{first_video_id}})")
                except Exception as e:
                    logger.error(f"Failed to publish {display_name} discourse for playback: {{e}}", exc_info=True)
            
            return (
                f"I found {display_name} discourses on '{{topic}}'. I'm playing '{{first_title}}' for you now. Enjoy the wisdom!"
            )
        else:
            return (
                f"I'm sorry, I couldn't find suitable {display_name} discourses on '{{topic}}' at the moment. Would you like to try a different topic?"
            )
'''
    
    def _get_backend_template(self) -> str:
        """Get backend agent template."""
        # Read the oshoagent.py file as template
        template_file = self.backend_dir / "oshoagent.py"
        if not template_file.exists():
            raise FileNotFoundError(f"Template file not found: {template_file}")
        
        return template_file.read_text()
    
    def generate_frontend_page(self, config: Dict[str, Any]) -> str:
        """Generate frontend route page."""
        agent_name = config["agent_name"]
        agent_class = self.to_pascal_case(agent_name) + "App"
        display_name = config["display_name"]
        description = config["description"]
        route_path = config["route_path"]
        
        return f'''import {{ headers }} from 'next/headers';
import {{ APP_CONFIG_DEFAULTS, type AppConfig }} from '@/app-config';
import {{ {agent_class} }} from '@/components/app/{agent_name}-app';

export default async function {self.to_pascal_case(agent_name)}AgentPage() {{
  await headers();

  // Override app config for {display_name} agent
  const appConfig: AppConfig = {{
    ...APP_CONFIG_DEFAULTS,
    agentName: '{agent_name}', // Use {agent_name} agent
    pageTitle: '{display_name} – Spiritual Guide',
    pageDescription:
      '{description}',
  }};

  return <{agent_class} appConfig={{appConfig}} />;
}}
'''
    
    def generate_welcome_view(self, config: Dict[str, Any]) -> str:
        """Generate welcome view component."""
        agent_name = config["agent_name"]
        agent_class = self.to_pascal_case(agent_name) + "WelcomeView"
        display_name = config["display_name"]
        features = config["features"]
        
        # Generate feature items
        feature_items = []
        emojis = ["🧘", "✨", "🌸", "🎭", "🟠", "📿", "🌟", "💫", "🕉️", "🙏"]
        for i, feature in enumerate(features):
            emoji = emojis[i % len(emojis)]
            key = feature.get("key", feature["title"].lower().replace(" ", ""))
            feature_items.append(f'''          {/* Feature {i+1}: {feature["title"]} */}
          <div className="bg-background border-input rounded-2xl border p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 text-3xl">{emoji}</div>
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              {{t('{agent_name}Agent.{key}')}}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              {{t('{agent_name}Agent.{key}Desc')}}
            </p>
          </div>''')
        
        features_html = "\n".join(feature_items)
        
        return f''''use client';

import {{ Button }} from '@/components/livekit/button';
import {{ useLanguage }} from '@/contexts/language-context';

function {self.to_pascal_case(agent_name)}WelcomeImage() {{
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-fg0 mb-4 size-16"
    >
      {/* Simple {display_name} symbol */}
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="32" cy="28" r="6" fill="currentColor" />
      <path
        d="M20 40 Q32 36 44 40"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}}

interface {agent_class}Props {{
  startButtonText?: string;
  onStartCall: () => void;
}}

export const {agent_class} = ({{
  startButtonText,
  onStartCall,
  ref,
}}: React.ComponentProps<'div'> & {agent_class}Props) => {{
  const {{ t }} = useLanguage();

  // Use translation if startButtonText is not provided, otherwise use the provided text
  const buttonText = startButtonText || t('{agent_name}Agent.startButton');

  return (
    <div ref={{ref}} className="w-full pb-24 md:pb-32">
      {/* Hero Section */}
      <section className="bg-background flex min-h-[70vh] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[80vh] md:min-h-screen md:py-12">
        <{self.to_pascal_case(agent_name)}WelcomeImage />

        <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
          {{t('{agent_name}Agent.title')}}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg md:text-xl">
          {{t('{agent_name}Agent.description')}}
        </p>

        {/* Action Button */}
        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={{onStartCall}}
            className="h-14 w-full text-lg font-semibold shadow-lg sm:w-auto sm:min-w-[240px]"
          >
            {{buttonText}}
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{{t('{agent_name}Agent.freeTrial')}}</p>
      </section>

      {/* Key Features Section */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <h2 className="text-foreground mb-8 text-center text-3xl font-bold sm:text-4xl">
          {{t('{agent_name}Agent.features')}}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
{features_html}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto mt-8 max-w-4xl px-4">
        <div className="bg-primary text-primary-foreground flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-sm sm:flex-row sm:justify-between">
          <p className="text-base font-semibold sm:text-left">{{t('{agent_name}Agent.ctaReady')}}</p>
          <div className="flex gap-3">
            <Button
              onClick={{onStartCall}}
              variant="ghost"
              className="h-12 bg-white/10 hover:bg-white/20"
            >
              {{t('{agent_name}Agent.ctaStartNow')}}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}};
'''
    
    def generate_app_component(self, config: Dict[str, Any]) -> str:
        """Generate app component."""
        agent_name = config["agent_name"]
        agent_class = self.to_pascal_case(agent_name)
        welcome_class = agent_class + "WelcomeView"
        
        return f''''use client';

import {{ useRef }} from 'react';
import {{ AnimatePresence, type Transition, type Variants, motion }} from 'motion/react';
import {{ RoomAudioRenderer, StartAudio, useRoomContext }} from '@livekit/components-react';
import type {{ AppConfig }} from '@/app-config';
import {{ {welcome_class} }} from '@/components/app/{agent_name}-welcome-view';
import {{ SessionProvider, useSession }} from '@/components/app/session-provider';
import {{ SessionView }} from '@/components/app/session-view';
import {{ HeygenAvatarPlayer }} from '@/components/heygen/heygen-avatar-player';
import {{ Toaster }} from '@/components/livekit/toaster';
import {{ PWAInstaller }} from '@/components/pwa-installer';

const Motion{welcome_class} = motion.create({welcome_class});
const MotionSessionView = motion.create(SessionView);

const viewVariants: Variants = {{
  visible: {{
    opacity: 1,
  }},
  hidden: {{
    opacity: 0,
  }},
}};

const viewTransition: Transition = {{
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
}};

const VIEW_MOTION_PROPS = {{
  variants: viewVariants,
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: viewTransition,
}} as const;

function {agent_class}Controller() {{
  const room = useRoomContext();
  const isSessionActiveRef = useRef(false);
  const {{ appConfig, isSessionActive, startSession }} = useSession();

  // animation handler holds a reference to stale isSessionActive value
  isSessionActiveRef.current = isSessionActive;

  // disconnect room after animation completes
  const handleAnimationComplete = () => {{
    if (!isSessionActiveRef.current && room.state !== 'disconnected') {{
      room.disconnect();
    }}
  }};

  return (
    <AnimatePresence mode="wait">
      {/* Welcome screen */}
      {{!isSessionActive && (
        <Motion{welcome_class}
          key="welcome"
          {{...VIEW_MOTION_PROPS}}
          startButtonText={{appConfig.startButtonText}}
          onStartCall={{startSession}}
        />
      )}}
      {/* Session view */}
      {{isSessionActive && (
        <MotionSessionView
          key="session-view"
          {{...VIEW_MOTION_PROPS}}
          appConfig={{appConfig}}
          onAnimationComplete={{handleAnimationComplete}}
        />
      )}}
    </AnimatePresence>
  );
}}

interface {agent_class}AppProps {{
  appConfig: AppConfig;
}}

export function {agent_class}App({{ appConfig }}: {agent_class}AppProps) {{
  return (
    <SessionProvider appConfig={{appConfig}}>
      <main className="min-h-svh w-full overflow-y-auto">
        <{agent_class}Controller />
      </main>
      <StartAudio label="Start Audio" />
      <RoomAudioRenderer />
      {{appConfig.enableHeygenAvatar ? <HeygenAvatarPlayer /> : null}}
      {/* YouTube discourse player is in SessionView (inside RoomContext) */}
      <Toaster />
      <PWAInstaller />
    </SessionProvider>
  );
}}
'''
    
    def update_translations(self, config: Dict[str, Any]) -> None:
        """Update translations file with new agent translations."""
        agent_name = config["agent_name"]
        display_name = config["display_name"]
        description = config["description"]
        features = config["features"]
        
        # Read current translations
        content = self.translations_file.read_text()
        
        # Generate English translations
        en_features = {}
        for feature in features:
            key = feature.get("key", feature["title"].lower().replace(" ", ""))
            en_features[f"{key}"] = f"'{feature['title']}'"
            en_features[f"{key}Desc"] = f"'{feature['description']}'"
        
        en_translations = f'''    {agent_name}Agent: {{
      title: '{display_name} – Your Spiritual Guide',
      description:
        '{description}',
      freeTrial: '🎁 Free 15-minute trial • No credit card required',
      features: 'What You Can Explore',
{self._format_features(en_features)},
      ctaReady: 'Ready to transform your consciousness?',
      ctaStartNow: 'Start Now',
      startButton: 'Connect with {display_name}',
    }},'''
        
        # Generate Hindi translations
        hi_features = {}
        for feature in features:
            key = feature.get("key", feature["title"].lower().replace(" ", ""))
            hi_title = feature.get("title_hi", feature["title"])
            hi_desc = feature.get("description_hi", feature["description"])
            hi_features[f"{key}"] = f"'{hi_title}'"
            hi_features[f"{key}Desc"] = f"'{hi_desc}'"
        
        hi_translations = f'''    {agent_name}Agent: {{
      title: '{display_name} – आपका आध्यात्मिक मार्गदर्शक',
      description:
        '{description}',
      freeTrial: '🎁 15 मिनट का निःशुल्क परीक्षण • कोई क्रेडिट कार्ड की आवश्यकता नहीं',
      features: 'आप क्या अन्वेषण कर सकते हैं',
{self._format_features(hi_features)},
      ctaReady: 'अपनी चेतना को रूपांतरित करने के लिए तैयार हैं?',
      ctaStartNow: 'अभी शुरू करें',
      startButton: '{display_name} से जुड़ें',
    }},'''
        
        # Insert English translations before the closing brace of 'en' section
        # Find the pattern: "    },\n  },\n  hi: {" (last agent before hi section)
        en_insert_pos = content.rfind("    },\n  },\n  hi: {")
        if en_insert_pos == -1:
            # Try alternative pattern
            en_insert_pos = content.rfind("  },\n  hi: {")
        if en_insert_pos != -1:
            # Insert before the closing brace of the last agent in en section
            content = content[:en_insert_pos] + en_translations + "\n" + content[en_insert_pos:]
        else:
            # Fallback: find last agent section before hi
            lines = content.split('\n')
            hi_section_start = None
            for i, line in enumerate(lines):
                if 'hi: {' in line:
                    hi_section_start = i
                    break
            
            if hi_section_start:
                # Find the last closing brace before hi section
                for j in range(hi_section_start - 1, -1, -1):
                    if '},' in lines[j] and lines[j].strip() == '},':
                        # Insert after this line
                        lines.insert(j + 1, en_translations)
                        content = '\n'.join(lines)
                        break
        
        # Insert Hindi translations before the final closing brace of hi section
        # Find pattern: "    },\n  },\n} as const;"
        hi_insert_pos = content.rfind("    },\n  },\n} as const;")
        if hi_insert_pos == -1:
            hi_insert_pos = content.rfind("  },\n} as const;")
        if hi_insert_pos != -1:
            content = content[:hi_insert_pos] + hi_translations + "\n" + content[hi_insert_pos:]
        else:
            # Fallback: find last agent section before final brace
            lines = content.split('\n')
            final_brace_line = None
            for i, line in enumerate(lines):
                if '} as const;' in line:
                    final_brace_line = i
                    break
            
            if final_brace_line:
                # Find the last closing brace before final brace
                for j in range(final_brace_line - 1, -1, -1):
                    if '},' in lines[j] and lines[j].strip() == '},':
                        # Insert after this line
                        lines.insert(j + 1, hi_translations)
                        content = '\n'.join(lines)
                        break
        
        self.translations_file.write_text(content)
    
    def _format_features(self, features: Dict[str, str]) -> str:
        """Format features dictionary as TypeScript object properties."""
        lines = []
        for key, value in features.items():
            lines.append(f"      {key}: {value},")
        return "\n".join(lines)
    
    def generate(self, config: Dict[str, Any], overwrite: bool = False) -> Dict[str, Path]:
        """Generate all files for the agent."""
        agent_name = config["agent_name"]
        route_path = config["route_path"].lstrip("/")
        
        # Check if agent exists
        if not overwrite and self.check_existing_agent(agent_name):
            raise ValueError(f"Agent '{agent_name}' already exists. Use --overwrite to replace it.")
        
        generated_files = {}
        
        # Generate backend agent file
        backend_content = self.generate_backend_agent(config)
        backend_file = self.backend_dir / f"{agent_name}agent.py"
        backend_file.write_text(backend_content)
        generated_files["backend"] = backend_file
        
        # Generate frontend route page
        route_dir = self.frontend_app_dir / route_path
        route_dir.mkdir(parents=True, exist_ok=True)
        page_content = self.generate_frontend_page(config)
        page_file = route_dir / "page.tsx"
        page_file.write_text(page_content)
        generated_files["page"] = page_file
        
        # Generate welcome view component
        welcome_content = self.generate_welcome_view(config)
        welcome_file = self.components_dir / f"{agent_name}-welcome-view.tsx"
        welcome_file.write_text(welcome_content)
        generated_files["welcome"] = welcome_file
        
        # Generate app component
        app_content = self.generate_app_component(config)
        app_file = self.components_dir / f"{agent_name}-app.tsx"
        app_file.write_text(app_content)
        generated_files["app"] = app_file
        
        # Update translations
        self.update_translations(config)
        generated_files["translations"] = self.translations_file
        
        return generated_files


def main():
    parser = argparse.ArgumentParser(description="Generate a new spiritual leader agent")
    parser.add_argument("--config", type=str, help="Path to JSON configuration file")
    parser.add_argument("--interactive", action="store_true", help="Interactive mode")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing agent")
    
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent
    
    generator = AgentGenerator(project_root)
    
    if args.interactive:
        # Interactive mode - prompt for configuration
        print("=== Agent Generator - Interactive Mode ===\n")
        config = {}
        config["agent_name"] = input("Agent name (lowercase, e.g., 'osho'): ").strip()
        config["display_name"] = input("Display name (e.g., 'Osho'): ").strip()
        config["route_path"] = input("Route path (e.g., '/osho'): ").strip()
        config["description"] = input("Description: ").strip()
        print("\nEnter agent instructions (end with empty line):")
        instructions_lines = []
        while True:
            line = input()
            if not line:
                break
            instructions_lines.append(line)
        config["instructions"] = "\n".join(instructions_lines)
        
        # Features
        print("\nEnter features (press Enter after each, empty line to finish):")
        features = []
        while True:
            title = input("Feature title: ").strip()
            if not title:
                break
            description = input("Feature description: ").strip()
            features.append({"title": title, "description": description})
        config["features"] = features
        
        # Greetings
        print("\nEnter greetings:")
        config["greetings"] = {
            "hi": input("Hindi greeting (single): ").strip(),
            "hi_group": input("Hindi greeting (group): ").strip(),
            "en": input("English greeting (single): ").strip(),
            "en_group": input("English greeting (group): ").strip(),
        }
    elif args.config:
        # Load from config file
        config_path = Path(args.config)
        if not config_path.exists():
            print(f"Error: Config file not found: {config_path}")
            sys.exit(1)
        config = json.loads(config_path.read_text())
    else:
        parser.print_help()
        sys.exit(1)
    
    # Validate configuration
    errors = generator.validate_config(config)
    if errors:
        print("Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    
    # Generate files
    try:
        generated_files = generator.generate(config, overwrite=args.overwrite)
        print("\n✅ Agent generated successfully!")
        print("\nGenerated files:")
        for file_type, file_path in generated_files.items():
            print(f"  {file_type}: {file_path}")
        print(f"\n🎉 Your agent '{config['agent_name']}' is ready!")
        print(f"   Frontend route: {config['route_path']}")
        print(f"   Backend agent: {generated_files['backend']}")
    except Exception as e:
        print(f"\n❌ Error generating agent: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()


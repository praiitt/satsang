# Agent Generator Script

This script automates the creation of new spiritual leader agents for both backend (Python) and frontend (Next.js/React).

## Usage

### Option 1: Using a Configuration File (Recommended)

1. Copy the example configuration file:
   ```bash
   cp scripts/agent-config.example.json scripts/my-agent-config.json
   ```

2. Edit `my-agent-config.json` with your agent details:
   - `agent_name`: lowercase name (e.g., "osho", "krishna")
   - `display_name`: Display name (e.g., "Osho", "Krishna")
   - `route_path`: Frontend route (e.g., "/osho", "/krishna")
   - `description`: Short description
   - `instructions`: Full agent personality/instructions
   - `features`: Array of features with title, description, and optional Hindi translations
   - `greetings`: Greeting messages for Hindi (single/group) and English (single/group)
   - `tool_name`: Optional custom tool function name (defaults to `search_{agent_name}_discourse`)
   - `tool_display_name`: Display name for tool (defaults to `display_name`)
   - `tool_keywords`: Keywords for search enhancement (defaults to `[agent_name]`)

3. Run the generator:
   ```bash
   python scripts/generate-agent.py --config scripts/my-agent-config.json
   ```

### Option 2: Interactive Mode

Run the script interactively and it will prompt you for all required information:

```bash
python scripts/generate-agent.py --interactive
```

### Overwriting Existing Agents

To overwrite an existing agent, use the `--overwrite` flag:

```bash
python scripts/generate-agent.py --config scripts/my-agent-config.json --overwrite
```

## Generated Files

The script generates the following files:

### Backend
- `livekit_server/agent-starter-python/src/{agent_name}agent.py` - Python agent file

### Frontend
- `app/(app)/{route_path}/page.tsx` - Route page component
- `components/app/{agent_name}-welcome-view.tsx` - Welcome view component
- `components/app/{agent_name}-app.tsx` - Main app component

### Translations
- `lib/translations.ts` - Updated with new agent translations (English and Hindi)

## Configuration File Format

```json
{
  "agent_name": "krishna",
  "display_name": "Krishna",
  "route_path": "/krishna",
  "description": "Spiritual guide specializing in Krishna consciousness and Bhakti yoga",
  "instructions": "You are Krishna - the divine teacher...",
  "features": [
    {
      "key": "bhakti",
      "title": "Bhakti Yoga",
      "description": "Learn about devotion and love for the divine",
      "title_hi": "भक्ति योग",
      "description_hi": "दिव्य के प्रति भक्ति और प्रेम के बारे में जानें"
    }
  ],
  "greetings": {
    "hi": "नमस्ते! मैं कृष्ण हूं...",
    "hi_group": "नमस्ते! मैं कृष्ण हूं...",
    "en": "Hello! I am Krishna...",
    "en_group": "Hello, friends! I am Krishna..."
  }
}
```

## Features

- **Automatic file generation**: Creates all necessary backend and frontend files
- **Translation support**: Automatically adds English and Hindi translations
- **Validation**: Validates configuration before generation
- **Duplicate detection**: Prevents overwriting existing agents (unless `--overwrite` is used)
- **Template-based**: Uses `oshoagent.py` as a template for consistency

## Requirements

- Python 3.12+
- Existing `oshoagent.py` file (used as template)
- Project structure must match expected paths

## Notes

- The script uses `oshoagent.py` as a template, so ensure it exists before running
- Agent names must be lowercase and contain only letters and numbers
- Route paths must start with `/` and contain only lowercase letters, numbers, and hyphens
- All greeting types (hi, hi_group, en, en_group) are required


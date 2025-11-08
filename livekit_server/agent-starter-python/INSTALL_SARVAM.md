# Installing Sarvam STT Plugin

The Sarvam plugin is required when `STT_MODEL=sarvam` is set in `.env.local`.

## Quick Install

```bash
cd /home/underlitigationcom/satsang/livekit_server/agent-starter-python
source .venv/bin/activate
pip install 'livekit-agents[sarvam]~=1.2'
```

## Verify Installation

After installing, verify it works:

```bash
python -c "from livekit.plugins import sarvam; print('✅ Sarvam installed')"
```

If you see "✅ Sarvam installed", the plugin is ready.

## Restart Agent

After installing, restart the agent:

```bash
pm2 restart satsang-livekit-agent
```

Or if running manually:

```bash
python src/agent.py start
```

## Alternative: Use AssemblyAI Instead

If you don't want to use Sarvam, you can switch to AssemblyAI by changing your `.env.local`:

```bash
# Change this line in .env.local:
STT_MODEL=assemblyai/universal-streaming

# Comment out or remove:
# STT_MODEL=sarvam
```

AssemblyAI is included by default and doesn't require additional plugins.

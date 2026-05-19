# Hybrid Music Generation Architecture

## Executive Summary
`fal.ai` is not a replacement for Suno — it is an extension layer. Suno remains the primary engine for full songs with lyrics. We will introduce `fal.ai` alongside Suno to handle specific scenarios where Suno struggles, ensuring the best audio quality without unnecessary complexity.

## Routing Logic
The system will use an intent-router to direct the user's prompt to the best possible model:

1. **User wants instrumental only** → Route to `fal.ai` (Model: ACE-Step)
2. **User wants orchestral/complex** → Route to `fal.ai` (Model: AIVA)
3. **User wants a full song with lyrics** → Keep routing to **Suno**
4. **Suno Failure Fallback** → If Suno fails to generate, automatically route the prompt to `fal.ai` as a backup.

## Implementation Steps

### 1. Database Schema Updates (Firestore)
We need to track which provider generated the track so the frontend and callback servers know how to handle the data.
- Modify the `music_tracks` collection schema.
- Add `provider: "suno" | "fal"` (Default: "suno").
- Add `falModelId: string` (e.g., "fal-ai/audio-generation-model").

### 2. LiveKit Python Agent Orchestration
The Voice Agent needs to intelligently decide which engine to call based on the user's conversation.
- **Create** `livekit_server/agent-starter-python/src/fal_client.py`: An async client to interact with the `fal.ai` REST API or Python SDK.
- **Modify** `music_agent.py`: Update the `generate_music` function with the following routing logic:
  ```python
  if is_instrumental and "orchestral" in style.lower():
      # Call fal_client (AIVA equivalent)
  elif is_instrumental:
      # Call fal_client (ACE-Step equivalent)
  else:
      # Call suno_client
  ```

### 3. Backend Generation API (Next.js & Marketing Server)
If users generate music via the Web/Mobile UI, the backend requires the same routing logic.
- **Modify** `app/api/satsang/generate/route.ts` & `marketing-server/src/services/suno.ts`.
- Implement an LLM-based or regex-based intent router to determine if the prompt is purely instrumental.
- If lyrics are provided -> Use Suno API.
- If no lyrics -> Use Fal API.

### 4. Auth Server (Webhook Handling)
The Auth Server needs to process the completed audio files from `fal.ai`.
- **Create** `auth-server/src/routes/fal.ts`: A new webhook endpoint (`POST /api/fal/callback`).
- Parse the `fal.ai` payload.
- Download the audio file from the temporary `fal.ai` URL.
- Upload to Firebase Storage.
- Update the Firebase document `status` to `COMPLETED` and set the `audioUrl`.
- **Modify** `auth-server/src/index.ts` to register the new `/api/fal` router.

## Open Questions for Later
1. Do we want to explicitly give users a toggle button in the UI for "Instrumental" vs "Vocal", or rely entirely on AI intent detection?
2. We need to verify the exact API model endpoints on `fal.ai` for the ACE-Step and AIVA equivalents, as their model roster updates frequently.

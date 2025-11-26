# RRAASI Music Module Implementation Plan

## Overview
This plan outlines the implementation of the "RRAASI Music" module, a new feature allowing users to create healing and spiritual music (bhajans, frequencies, etc.) using the Suno API. The interaction will be mediated by a specialized LiveKit agent.

## Architecture
1.  **Backend (Agent)**:
    -   **Suno Client**: A Python module to interact with `https://api.sunoapi.org`.
    -   **Music Agent**: A LiveKit agent that understands user intent (e.g., "create a meditation track") and calls the Suno Client.
2.  **Frontend (Next.js)**:
    -   **Music Page**: A dedicated page (`/rraasi-music`) for this module.
    -   **Agent Interface**: Reuses or adapts the existing agent chat/voice interface to communicate with the Music Agent.
    -   **Music Player**: To play the generated tracks.

## Implementation Steps

### Phase 1: Backend & API Integration
1.  **Environment Setup**:
    -   Add `SUNO_API_KEY` to `.env`.
2.  **Suno Client (`src/suno_client.py`)**:
    -   Implement `SunoClient` class.
    -   Method: `generate_music(prompt, is_instrumental, style, title, model)`.
    -   Method: `get_generation_status(task_id)`.
3.  **Music Agent (`src/music_agent.py`)**:
    -   Create a new agent definition.
    -   Define tools/functions for the LLM:
        -   `generate_song(description, style, instrumental)`
        -   `check_song_status(task_id)`
    -   Implement the logic to call `SunoClient`.

### Phase 2: Frontend Development
1.  **New Route**:
    -   Create `app/rraasi-music/page.tsx`.
2.  **UI Design**:
    -   Aesthetic: "Healing", "Spiritual", "Premium" (using the project's design system).
    -   Components:
        -   Agent connection view (reuse `RoomAudioRenderer`, `ControlBar` etc. from LiveKit).
        -   "Recent Creations" list.
        -   Audio Player for generated results.

### Phase 3: Integration & Testing
1.  **Connect Frontend to Agent**:
    -   Ensure the frontend connects to the `music_agent` specifically (might need a new token endpoint or dispatch logic).
2.  **End-to-End Test**:
    -   User asks agent -> Agent calls Suno -> Suno returns ID -> Agent polls/notifies -> Frontend plays music.

## API Reference (Suno)
-   **Base URL**: `https://api.sunoapi.org`
-   **Generate Endpoint**: `/api/generate`
-   **Headers**: `Authorization: Bearer <KEY>`
-   **Body**:
    ```json
    {
      "customMode": true,
      "instrumental": false,
      "prompt": "Lyrics or Description",
      "style": "Genre",
      "title": "Title",
      "model": "V3_5"
    }
    ```

## Next Steps
1.  Approve this plan.
2.  Provide the Suno API Key (add to `.env`).
3.  Start with Phase 1 (Suno Client).

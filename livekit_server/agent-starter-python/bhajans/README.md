# Bhajan Library

This directory contains devotional bhajans (songs) that can be played by the Guruji agent.

## Directory Structure

```
bhajans/
  krishna/     - Krishna bhajans
  shiva/       - Shiva bhajans
  ganesh/      - Ganesh bhajans
  rama/        - Rama bhajans
  generic/     - Generic spiritual songs
  bhajan_index.json - Index file with metadata
```

## Adding Bhajans

1. **Place MP3 files** in the appropriate category directory
2. **Update `bhajan_index.json`** with the new bhajan information:
   ```json
   {
     "name_en": "Bhajan Name in English",
     "name_hi": "भजन नाम हिंदी में",
     "file_path": "category/filename.mp3",
     "category": "krishna",
     "aliases": ["alias1", "alias2", "alias3"]
   }
   ```

## Supported Audio Formats

- MP3 (recommended)
- WAV
- OGG
- M4A

## How It Works

1. User requests a bhajan via voice: "krishna ka bhajan bajao"
2. Agent uses the `play_bhajan` function tool
3. Function searches `bhajan_index.json` for matching bhajan
4. Returns URL: `/api/bhajans/{category}/{filename}.mp3`
5. Frontend can use this URL to play the audio

## Example Usage

User: "hare krishna sunao" (Play Hare Krishna)
Agent: Uses `play_bhajan(bhajan_name="hare krishna")`
Returns: `{"url": "/api/bhajans/krishna/hare-krishna-hare-rama.mp3", ...}`

## Notes

- Ensure all MP3 files are properly licensed
- Use descriptive filenames (lowercase, hyphens)
- Add multiple aliases for better search matching
- Keep file sizes reasonable for web streaming

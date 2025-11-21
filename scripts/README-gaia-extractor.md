# Gaia Content Extractor

Scripts to extract content and metadata from Gaia.com video share URLs.

## Features

- ✅ Extracts video metadata (title, description, series, episode, duration, etc.)
- ✅ Captures full page text content
- ✅ Attempts to find video URLs (may be DRM-protected)
- ✅ Extracts thumbnails and metadata
- ✅ Optional AI-powered content structuring with OpenAI
- ✅ Takes screenshots for reference
- ✅ Available in both TypeScript/Node.js and Python versions

## Prerequisites

### For TypeScript Version

```bash
# Install dependencies
npm install puppeteer openai
# or
pnpm add puppeteer openai
```

### For Python Version

```bash
# Install dependencies
pip install playwright openai

# Install browser
playwright install chromium
```

## Usage

### TypeScript Version

```bash
# Basic usage
npx tsx scripts/extract-gaia-content.ts "https://www.gaia.com/share/video/incoming-3iatlas-draco-mothership?type=video&contentId=245534"

# With OpenAI structuring (requires OPENAI_API_KEY)
OPENAI_API_KEY=your_key npx tsx scripts/extract-gaia-content.ts "<gaia-url>"

# Show browser (non-headless)
HEADLESS=false npx tsx scripts/extract-gaia-content.ts "<gaia-url>"
```

### Python Version

```bash
# Basic usage
python scripts/extract-gaia-content.py "https://www.gaia.com/share/video/incoming-3iatlas-draco-mothership?type=video&contentId=245534"

# With OpenAI structuring
OPENAI_API_KEY=your_key python scripts/extract-gaia-content.py "<gaia-url>"

# Show browser
HEADLESS=false python scripts/extract-gaia-content.py "<gaia-url>"
```

## Output

The script generates:

1. **`gaia-extracted-data.json`** - Structured JSON with all extracted data
2. **`gaia-extract-screenshot.png`** - Full page screenshot for reference

### Example Output Structure

```json
{
  "url": "https://www.gaia.com/share/video/...",
  "title": "Incoming 3I/ATLAS: Draco Mothership?",
  "description": "3I/ATLAS is closing in on Earth...",
  "series": "Season 28",
  "episode": "Episode 13",
  "duration": "28 mins",
  "rating": "TV-PG",
  "host": "Josh Golembeske",
  "featured": "Sébastien Martin",
  "audioLanguages": ["English"],
  "subtitles": ["German", "English"],
  "fullText": "...",
  "videoUrls": [],
  "thumbnailUrl": "https://...",
  "metadata": {...},
  "extractedAt": "2024-01-01T12:00:00.000Z"
}
```

## Important Notes

### Video Extraction Limitations

⚠️ **Gaia videos are typically DRM-protected or use token-based streaming URLs.**

- Direct video download is usually **not possible** due to:
  - DRM (Digital Rights Management) protection
  - Token-based authentication
  - Dynamic streaming URLs that expire
  - Legal/terms of service restrictions

- The script will attempt to find video URLs, but they may:
  - Be empty (no direct URLs found)
  - Require authentication tokens
  - Expire quickly
  - Be protected by DRM

### Legal Considerations

- ✅ Extracting **metadata and text content** is generally acceptable
- ⚠️ Downloading or redistributing **video content** may violate:
  - Gaia's Terms of Service
  - Copyright laws
  - DRM circumvention laws (DMCA in US)

**Recommendation**: Use the extracted metadata for display purposes, but link to the original Gaia video for playback.

## Environment Variables

- `OPENAI_API_KEY` - Optional, for AI-powered content structuring
- `HEADLESS` - Set to `'false'` to see browser (default: `'true'`)

## Troubleshooting

### Browser Installation Issues

**Playwright (Python):**
```bash
playwright install chromium
```

**Puppeteer (Node.js):**
Puppeteer should auto-download Chromium on first run.

### Timeout Errors

If the page takes too long to load, the script will timeout. Try:
- Increasing the timeout in the script
- Running with `HEADLESS=false` to see what's happening
- Checking your internet connection

### No Video URLs Found

This is **expected** for DRM-protected content. The script will still extract all other metadata.

## Use Cases

1. **Content Discovery**: Extract metadata to display video information
2. **SEO**: Use extracted descriptions and metadata
3. **Content Curation**: Build a database of video information
4. **Integration**: Use extracted data to populate your app's video cards

## Example Integration

After extraction, you can use the JSON data in your app:

```typescript
import extractedData from './scripts/gaia-extracted-data.json';

// Use in your ET Agent page
<VideoCard
  title={extractedData.title}
  description={extractedData.description}
  thumbnail={extractedData.thumbnailUrl}
  duration={extractedData.duration}
  linkTo={extractedData.url} // Link to original Gaia video
/>
```


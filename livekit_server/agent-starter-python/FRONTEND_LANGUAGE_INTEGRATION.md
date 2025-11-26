# Frontend Integration Guide - Agent Language Support

## Quick Start

To make agents speak in a specific language, send the `language` preference in the participant metadata when connecting to LiveKit:

```javascript
// Hindi Mode
const metadata = JSON.stringify({
  language: "hi"
});

await room.connect(url, token, {
  metadata: metadata
});
```

```javascript
// English Mode
const metadata = JSON.stringify({
  language: "en"
});

await room.connect(url, token, {
  metadata: metadata
});
```

## Supported Languages

- `"hi"` - Hindi (हिंदी)
- `"en"` - English

## What Changes Based on Language?

When you set the language preference:

1. **Initial Greeting** - Agent greets in the selected language
2. **All Responses** - Agent responds in the selected language throughout the conversation
3. **TTS Voice** - Agent uses the appropriate voice for that language
4. **STT Model** - Agent uses the best speech recognition model for that language

## Example Greetings

### Guruji Agent

**Hindi (`language: "hi"`):**
> नमस्ते! मैं आपका आध्यात्मिक गुरु हूं। आप कैसे हैं? आप किस विषय पर चर्चा करना चाहेंगे - धर्म, योग, ध्यान, कर्म, या कोई अन्य आध्यात्मिक विषय?

**English (`language: "en"`):**
> Namaste! I am your spiritual guru. How are you? What topic would you like to discuss - dharma, yoga, meditation, karma, or any other spiritual subject?

### ET Agent

**Hindi (`language: "hi"`):**
> नमस्ते! मैं आपका ब्रह्मांडीय मार्गदर्शक हूं जो ब्रह्मांडीय सभ्यताओं, फर्मी पैराडॉक्स, और ध्वनि फ्रीक्वेंसी के बारे में जानकारी रखता है।

**English (`language: "en"`):**
> Greetings! I'm your guide to extraterrestrial civilizations, the Fermi Paradox, and the connection between sound frequencies and universal consciousness.

### Osho Agent

**Hindi (`language: "hi"`):**
> नमस्ते! मैं ओशो हूं - आपका आध्यात्मिक मार्गदर्शक। मैं आपको ध्यान, चेतना, जेन दर्शन के बारे में गहरी समझ देने के लिए यहां हूं।

**English (`language: "en"`):**
> Hello! I am Osho - your spiritual guide. I'm here to help you understand meditation, consciousness, Zen philosophy, and the art of living.

## Implementation Example (React/Next.js)

```typescript
import { Room } from 'livekit-client';

interface ConnectToAgentParams {
  url: string;
  token: string;
  language: 'hi' | 'en';
  agentType: 'guruji' | 'et' | 'osho';
}

async function connectToAgent({ url, token, language, agentType }: ConnectToAgentParams) {
  const room = new Room();
  
  // Prepare metadata with language preference
  const metadata = JSON.stringify({
    language: language,
    agentType: agentType,
  });
  
  // Connect with metadata
  await room.connect(url, token, {
    metadata: metadata,
  });
  
  console.log(`Connected to ${agentType} agent in ${language === 'hi' ? 'Hindi' : 'English'} mode`);
  
  return room;
}

// Usage
const room = await connectToAgent({
  url: 'wss://your-livekit-server.com',
  token: 'your-token',
  language: 'en', // or 'hi'
  agentType: 'guruji',
});
```

## Language Switcher Component Example

```tsx
import { useState } from 'react';

export function LanguageSwitcher({ onLanguageChange }: { onLanguageChange: (lang: 'hi' | 'en') => void }) {
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  
  const handleLanguageChange = (newLang: 'hi' | 'en') => {
    setLanguage(newLang);
    onLanguageChange(newLang);
  };
  
  return (
    <div className="language-switcher">
      <button
        onClick={() => handleLanguageChange('hi')}
        className={language === 'hi' ? 'active' : ''}
      >
        हिंदी
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        className={language === 'en' ? 'active' : ''}
      >
        English
      </button>
    </div>
  );
}
```

## Testing Checklist

- [ ] Test Hindi mode - verify greeting is in Hindi
- [ ] Test English mode - verify greeting is in English
- [ ] Test language persistence - verify agent continues in selected language
- [ ] Test all three agents (Guruji, ET, Osho) with both languages
- [ ] Test default behavior (no metadata) - should default to Hindi

## Troubleshooting

### Agent speaks in wrong language
- **Check:** Verify metadata is being sent correctly
- **Check:** Ensure `language` field is either `"hi"` or `"en"` (lowercase)
- **Check:** Verify metadata is sent BEFORE connecting to the room

### Agent doesn't greet at all
- **Check:** Wait 2-3 seconds after connection for agent to initialize
- **Check:** Verify room connection is successful
- **Check:** Check browser console for errors

### Agent switches language mid-conversation
- **Issue:** This should NOT happen - agent should maintain language throughout
- **Solution:** If this occurs, it's a bug - please report with logs

## Default Behavior

If no language metadata is provided:
- All agents default to **Hindi** (`"hi"`)
- This ensures backward compatibility with existing implementations

## Notes

- Language preference is detected once at connection time
- To change language, user must disconnect and reconnect with new metadata
- All agents support both languages equally well
- STT accuracy may vary by language and model (Sarvam is best for Hindi)

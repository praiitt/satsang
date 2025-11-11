# Language Selection Implementation Plan (English/Hindi)

## Complexity Assessment

### Overall Difficulty: **Medium to High**

---

## 1. Frontend Changes (Medium Difficulty)

### What Needs to Change:

#### A. UI Text Translation

- **Current State**: All UI text is hardcoded in Hindi
- **Required**: Extract all strings to translation files
- **Files Affected**: ~30-40 component files
- **Estimated Time**: 2-3 days

**Example files to update:**

- `components/app/site-header.tsx` - Header buttons, labels
- `components/app/welcome-view.tsx` - Welcome page text
- `components/auth/phone-auth-form.tsx` - Auth form labels
- `components/app/session-view.tsx` - Session UI text
- `components/daily-satsang/orchestrator.tsx` - Daily satsang labels
- All button labels, error messages, toast notifications

#### B. Translation System Setup

**Recommended Library**: `next-intl` (best for Next.js App Router)

**Steps:**

1. Install: `npm install next-intl`
2. Create translation files:
   ```
   messages/
     en.json
     hi.json
   ```
3. Wrap app with `NextIntlClientProvider`
4. Replace hardcoded strings with `useTranslations()` hook

**Example:**

```tsx
// Before
<Button>लॉगिन करें</Button>;

// After
const t = useTranslations('common');
<Button>{t('login')}</Button>;
```

#### C. Language Selector Component

- Add dropdown/button in header
- Store preference in localStorage + context
- Persist across sessions

---

## 2. Backend/Agent Changes (High Difficulty)

### What Needs to Change:

#### A. Agent Language Configuration

**Current State**: Agent instructions are hardcoded in Hindi/English mix

**Required Changes:**

1. **Pass Language Preference to Agent**
   - Via LiveKit token metadata
   - Via data channel message on connection
   - Store in agent session state

2. **Update Agent Instructions**
   - Make agent instructions language-aware
   - Agent should respond in selected language
   - System prompts need translation

**Files to Modify:**

- `livekit_server/agent-starter-python/src/agent.py`
- Agent initialization and instruction setup

#### B. Agent Response Language

**Challenge**: The AI agent (OpenAI/Cartesia) needs to:

- Understand language preference
- Respond consistently in that language
- Handle code-switching if user mixes languages

**Solution Options:**

**Option 1: System Prompt Modification (Easier)**

```python
# In agent.py
language = session_data.get('language', 'hi')  # 'en' or 'hi'

if language == 'en':
    instructions = """You are a spiritual guru. Always respond in English..."""
else:
    instructions = """आप एक आध्यात्मिक गुरु हैं। हमेशा हिंदी में उत्तर दें..."""
```

**Option 2: Dynamic Instruction Injection (Better)**

- Add language instruction to every user message
- Let LLM handle language switching dynamically

#### C. Data Channel Messages

**Current**: Messages sent to agent are in Hindi
**Required**: Send language preference + translate UI messages

**Example:**

```typescript
// Send language preference on connection
sendMessageToAgent(room, {
  type: 'config',
  language: 'en', // or 'hi'
  message: 'Please respond in English',
});
```

---

## 3. Implementation Strategy

### Phase 1: Frontend Only (Week 1)

**Goal**: Get UI translation working

1. ✅ Install `next-intl`
2. ✅ Create translation files (en.json, hi.json)
3. ✅ Set up NextIntlProvider
4. ✅ Extract all UI strings
5. ✅ Add language selector to header
6. ✅ Test UI language switching

**Difficulty**: ⭐⭐ (Medium)
**Time**: 3-4 days

### Phase 2: Agent Language Support (Week 2)

**Goal**: Make agent respond in selected language

1. ✅ Pass language via token metadata
2. ✅ Send language preference via data channel
3. ✅ Update agent instructions based on language
4. ✅ Test agent responses in both languages
5. ✅ Handle edge cases (mixed language input)

**Difficulty**: ⭐⭐⭐⭐ (High)
**Time**: 5-7 days

### Phase 3: Polish & Testing (Week 3)

**Goal**: Ensure everything works smoothly

1. ✅ Test all flows in both languages
2. ✅ Fix any translation issues
3. ✅ Optimize agent prompts
4. ✅ Add language detection fallback

**Difficulty**: ⭐⭐ (Medium)
**Time**: 2-3 days

---

## 4. Recommended Approach

### My Suggestion: **Start with Frontend Only**

**Why?**

1. **Quick Win**: Users can see UI in their preferred language immediately
2. **Lower Risk**: Doesn't affect core agent functionality
3. **User Feedback**: See if users actually want this feature
4. **Incremental**: Can add agent language support later

### Implementation Priority:

1. **High Priority** (Do First):
   - Language selector in header
   - Basic UI translation (buttons, labels)
   - Welcome page translation
   - Auth form translation

2. **Medium Priority** (Do Next):
   - Agent language preference passing
   - Agent instruction updates
   - Chat message language handling

3. **Low Priority** (Nice to Have):
   - Auto-detect language from browser
   - Remember language preference
   - Mixed language support

---

## 5. Technical Implementation Details

### Frontend Setup (next-intl)

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: { locale }
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

### Language Context

```typescript
// contexts/language-context.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi';

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({ language: 'hi', setLanguage: () => {} });

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState<Language>('hi');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved) setLanguage(saved);
  }, []);

  const updateLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: updateLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
```

### Passing Language to Agent

```typescript
// In daily-satsang-app.tsx or session-view.tsx
useEffect(() => {
  if (room && isConnected) {
    const language = localStorage.getItem('language') || 'hi';
    sendMessageToAgent(room, {
      type: 'language',
      language: language,
      message: `Please respond in ${language === 'en' ? 'English' : 'हिंदी'}`,
    });
  }
}, [room, isConnected]);
```

### Agent Side (Python)

```python
# In agent.py
class Assistant(Agent):
    def __init__(self, language: str = 'hi'):
        self.language = language

        if language == 'en':
            instructions = """You are a spiritual guru. Always respond in English..."""
        else:
            instructions = """आप एक आध्यात्मिक गुरु हैं। हमेशा हिंदी में उत्तर दें..."""

        super().__init__(instructions=instructions)

    async def on_data_received(self, data: bytes, participant):
        message = json.loads(data.decode())
        if message.get('type') == 'language':
            self.language = message.get('language', 'hi')
            # Update instructions dynamically
```

---

## 6. Estimated Effort

| Task                      | Difficulty | Time            | Priority |
| ------------------------- | ---------- | --------------- | -------- |
| Frontend i18n Setup       | ⭐⭐       | 1 day           | High     |
| UI String Extraction      | ⭐⭐       | 2 days          | High     |
| Language Selector         | ⭐         | 0.5 day         | High     |
| Agent Language Passing    | ⭐⭐⭐     | 2 days          | Medium   |
| Agent Instructions Update | ⭐⭐⭐⭐   | 3 days          | Medium   |
| Testing & Polish          | ⭐⭐       | 2 days          | Medium   |
| **Total**                 |            | **~10-11 days** |          |

---

## 7. Alternative: Simpler Approach

### If Full Implementation is Too Complex:

**Option: UI Only Translation**

- Translate only UI elements (buttons, labels, forms)
- Keep agent responses in Hindi (or current language)
- Much faster to implement (2-3 days)
- Users can still understand UI in English

**Option: Browser Language Detection**

- Auto-detect from `navigator.language`
- Show UI in detected language
- No manual selection needed
- Simpler UX

---

## 8. My Recommendation

**Start Small, Iterate:**

1. **Week 1**: Implement frontend translation only
   - Use `next-intl` for UI strings
   - Add language toggle in header
   - Translate critical UI elements first

2. **Week 2**: Test with users
   - See if they actually use the feature
   - Gather feedback on what needs translation

3. **Week 3+**: Add agent language support
   - Only if users request it
   - Implement incrementally

**Why this approach?**

- ✅ Lower risk
- ✅ Faster time to market
- ✅ User feedback guides priorities
- ✅ Can always add agent support later

---

## 9. Code Examples

### Translation Files Structure

```json
// messages/en.json
{
  "common": {
    "login": "Login",
    "logout": "Logout",
    "start": "Start Conversation",
    "welcome": "Welcome to RRAASI Satsang"
  },
  "auth": {
    "phoneNumber": "Phone Number",
    "enterOTP": "Enter OTP Code",
    "sendOTP": "Send OTP"
  }
}

// messages/hi.json
{
  "common": {
    "login": "लॉगिन करें",
    "logout": "लॉग आउट",
    "start": "बातचीत शुरू करें",
    "welcome": "RRAASI सत्संग में आपका स्वागत है"
  },
  "auth": {
    "phoneNumber": "फोन नंबर",
    "enterOTP": "OTP कोड दर्ज करें",
    "sendOTP": "OTP भेजें"
  }
}
```

### Component Usage

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useLanguage } from '@/contexts/language-context';

export function SiteHeader() {
  const t = useTranslations('common');
  const { language, setLanguage } = useLanguage();

  return (
    <header>
      <nav>
        <button onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}>
          {language === 'en' ? 'हिंदी' : 'English'}
        </button>
        <Link href="/login">
          <Button>{t('login')}</Button>
        </Link>
      </nav>
    </header>
  );
}
```

---

## Conclusion

**Difficulty**: Medium-High overall, but can be broken into manageable phases

**Best Approach**: Start with frontend translation, add agent support later based on user feedback

**Time Estimate**: 10-11 days for full implementation, 3-4 days for frontend-only

**Recommendation**: Implement frontend translation first, test with users, then decide if agent language support is needed.

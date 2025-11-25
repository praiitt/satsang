## Hindi Understanding & Display – Implementation Overview

This document explains how the system understands **spoken Hindi** and renders it nicely in the UI. You can hand this to another engineer to re‑implement the same behavior in a different stack.

---

## 1. End‑to‑end flow (high‑level)

1. **User speaks Hindi** into the mic.
2. **STT (speech‑to‑text)** converts audio to **Romanized Hindi text** (English letters), e.g. `"aap kaise hain"`.
3. The **LLM agent** is instructed (via system prompt) to:
   - Treat this Romanized text as Hindi.
   - Understand spelling variations and STT errors.
   - Reply in **Hindi Devanagari script** by default.
4. The **frontend**:
   - Shows agent replies directly (already Devanagari).
   - Optionally transliterates **user messages** from Romanized → Devanagari for nicer chat display.

Key point: we **don’t require STT to output Devanagari**. We lean on:
- Strong Hindi‑aware prompt for the LLM.
- A light frontend transliteration helper for UI only.

---

## 2. Speech pipeline (audio → Romanized Hindi text)

**Location:** `livekit_server/agent-starter-python/src/agent.py`, `STT_ACCURACY.md`, `STT_MODELS.md`

- The voice stack is built on **LiveKit Agents**:
  - User audio → LiveKit room → Python agent (`Assistant` class in `agent.py`).
  - In `agent.py`, STT is configured via `inference.STT(model=..., language="hi")`.
- Supported models (see `STT_MODELS.md`):
  - `assemblyai/universal-streaming` (default, streaming, *Romanized* output).
  - `deepgram/nova-2` (recommended to try, might output better Hindi).
  - `openai/whisper-large-v3` (non‑streaming, Devanagari but worse UX).
- `STT_ACCURACY.md` documents how to switch models via `.env.local` (`STT_MODEL`, `DEEPGRAM_API_KEY`, etc.).

**If you re‑implement elsewhere:**
- Choose any streaming STT that supports **Hindi (`language="hi"`)**.
- It’s fine if it outputs Romanized Hindi. The remaining steps are designed for that.

---

## 3. Agent configuration (how the LLM understands Hindi)

**Location:** `livekit_server/agent-starter-python/src/agent.py` → `class Assistant(Agent)`

The core is the **system prompt** passed to `super().__init__(instructions=...)`. Important parts:

1. **Explicit statement about Romanized Hindi:**

   > The user speaks in Hindi, but you will receive their speech as Romanized Hindi text (English alphabet).  
   > For example: "namaste", "aap kaise hain", "dharma kya hai", "krishna", "bhagwad geeta".

2. **Common mappings and patterns:**

   - `"aap" = आप`, `"tum" = तुम`
   - `"hai" = है`, `"hain" = हैं`
   - `"kaise" = कैसे`, `"kya" = क्या`, `"kyon" = क्यों`
   - `"satya" = सत्य`, `"dharma" = धर्म`, `"karma" = कर्म`
   - Notes about STT spelling variants:
     - `"kaise" → "kaise", "kese", "kaisey"`
     - `"dharma" → "dharma", "dharam", "dharm"`
     - `"krishna" → "krishna", "krishan", "krishn"`

3. **Response language:**

   > Default to replying in Hindi (Devanagari script).  
   > If the user speaks another language, mirror their language.

4. **Behavioral instructions (spiritual guru, proactive, etc.)** – not strictly language‑related, but they sit in the same prompt.

**Result:**  
STT text like `"dharma kya hai"` is interpreted as Hindi; the agent answers in proper Devanagari, e.g. `"धर्म क्या है..."`.

**If you port this:**
- Whatever framework you use (LangChain, raw OpenAI API, etc.), ensure the **system message** contains:
  - “User speaks Hindi; you see Romanized Hindi.”
  - Examples + spelling variants.
  - “Reply in Hindi Devanagari by default.”

---

## 4. Frontend language + transliteration

There are two separate concerns on the frontend:

### 4.1 UI language (English vs Hindi labels)

**Location:** `contexts/language-context.tsx`, `lib/translations.ts`, `LANGUAGE_IMPLEMENTATION_PLAN.md`

- `LanguageProvider` context:
  - `language: 'en' | 'hi'`
  - `setLanguage(lang)`
  - `t(key)` – looks up strings from a `translations[language]` object.
- Components call `const { t } = useLanguage();` and render UI text via `t('common.login')`, etc.
- Language is persisted in `localStorage`.

This controls **menus, buttons, toasts**, not the agent’s understanding.

### 4.2 Transliteration of user messages (Romanized → Devanagari)

**Location:** `lib/hindi-transliteration.ts`, `components/livekit/chat-entry.tsx`

- We only transliterate **local user messages** for display:

  ```tsx
  // components/livekit/chat-entry.tsx
  import { transliterateToDevanagari } from '@/lib/hindi-transliteration';

  const displayMessage =
    messageOrigin === 'local' ? transliterateToDevanagari(message) : message;
  ```

- `transliterateToDevanagari(text)`:
  - Detects if text *looks* like Romanized Hindi (`hai`, `kya`, `kaise`, `namaste`, etc.).
  - Has a dictionary of common terms (`namaste`, `aap`, `dharma`, `karma`, `krishna`, `ram`, `bhajan`, …) mapped to Devanagari.
  - Replaces word‑boundary matches using a longest‑match‑first pass.
  - If nothing changes, returns the original text.

This is intentionally **simple** – it improves chat readability for common satsang phrases without affecting the agent (which still sees raw Romanized text).

**If you re‑implement:**
- Either:
  - Use a proper transliteration library (e.g. `indic-transliteration`), or
  - Keep a small mapping of frequent words, as in `lib/hindi-transliteration.ts`.
- Only apply it to **user messages**; agent messages are already Devanagari.

---

## 5. Putting it together (step‑by‑step recipe)

To replicate this Hindi behavior in another project:

1. **Configure STT for Hindi**
   - Use streaming STT with `language="hi"`.
   - Accept that output will likely be *Romanized* Hindi.

2. **Design the agent prompt**
   - System message must say:
     - User speaks Hindi → you see Romanized Hindi.
     - Here are example words and spelling variations.
     - Always answer in Hindi Devanagari by default.

3. **Wire STT → agent**
   - Feed STT text chunks into the LLM with the above system prompt.
   - The LLM will handle Romanized Hindi → semantic understanding → Devanagari response.

4. **Frontend chat display (optional but recommended)**
   - When rendering local user messages, run them through a transliteration helper.
   - Render agent messages as‑is.

5. **(Optional) UI language toggle**
   - Add a `LanguageProvider` (or similar) for shell UI strings.
   - It doesn’t affect the agent’s comprehension; it only controls labels and headings.

---

## 6. Quick checklist for a new engineer

- [ ] STT configured with `language="hi"` (streaming).
- [ ] LLM system prompt includes:
  - [ ] Romanized Hindi explanation.
  - [ ] Example mappings and spelling variants.
  - [ ] “Reply in Hindi (Devanagari) by default.”
- [ ] Agent integration tested with phrases like:
  - `"aap kaise hain"`, `"dharma kya hai"`, `"krishna ka bhajan bajao"`.
- [ ] User messages optionally transliterated to Devanagari in chat UI.
- [ ] Agent messages appear in Devanagari.

With these pieces in place, another team can reproduce the same “speak Hindi, see and hear proper Hindi” experience, even if their underlying STT only produces Romanized text.



# 🔮 Tarot Agent - Web App Implementation Plan

## 📊 Current Status

### ✅ Already Implemented (Web App)

1. **Backend Agent** (`livekit_server/agent-starter-python/src/tarot_agent.py`)
   - ✅ TarotAgent class with mystical instructions
   - ✅ `draw_tarot_cards()` function tool
   - ✅ 3-card spread (Past, Present, Future)
   - ✅ Visual card deck (22 Major Arcana)
   - ✅ Language detection (Hindi/English)
   - ✅ Data publishing to frontend
   - ✅ STT/TTS integration

2. **Frontend Components**
   - ✅ Route: `/app/(app)/tarot/page.tsx`
   - ✅ Main app: `components/app/tarot-app.tsx`
   - ✅ Welcome view: `components/app/tarot-welcome-view.tsx`
   - ✅ Session view: `components/app/tarot-session-view.tsx`
   - ✅ Card display: `components/app/tarot-table.tsx`

3. **Configuration**
   - ✅ Guru profile in `lib/gurus.ts`
   - ✅ Translations in `lib/translations.ts` (English & Hindi)
   - ✅ Mystical purple theme

### 🔧 What Needs Enhancement

1. **Backend**: Add Yes/No Tarot functionality
2. **Frontend**: Enhance card animations and visual effects
3. **Testing**: End-to-end testing
4. **Documentation**: Update user guides

---

## 🎯 Implementation Tasks

### Phase 1: Backend Enhancement (1-2 hours)

#### Task 1.1: Add Yes/No Tarot Function

**File**: `livekit_server/agent-starter-python/src/tarot_agent.py`

Add after line 219 (after the `draw_tarot_cards` function):

```python
@function_tool
async def get_yes_no_answer(self, context: RunContext, question: str) -> str:
    """
    Get a Yes/No answer to a specific question using tarot cards.
    
    Args:
        question: The user's yes/no question
        
    Returns:
        A mystical yes/no answer with card interpretation
    """
    logger.info(f"Getting yes/no answer for: {question}")
    
    try:
        from .astrology_api_client import get_api_client
        client = get_api_client()
        
        # Call yes_no_tarot API endpoint
        response = await client.get_yes_no_tarot({"question": question})
        
        if response and isinstance(response, dict):
            answer = response.get('answer', 'unclear')  # yes/no/maybe
            card_name = response.get('card_name', 'Unknown Card')
            interpretation = response.get('interpretation', '')
            
            # Select a visual card from our deck
            import random
            card_visual = random.choice(TAROT_DECK)
            
            # Publish to frontend
            if self._publish_data_fn:
                payload = {
                    "type": "tarot.yesno",
                    "question": question,
                    "answer": answer,
                    "card": {
                        "name": card_name,
                        "image": card_visual["image"],
                        "meaning": interpretation
                    }
                }
                data_bytes = json.dumps(payload).encode('utf-8')
                await self._publish_data_fn(data_bytes)
                logger.info(f"Published yes/no answer: {answer}")
            
            return f"The cards reveal: **{answer.upper()}**. {card_name} - {interpretation}"
        
        return "The energies are unclear. Please rephrase your question."
        
    except Exception as e:
        logger.error(f"Error in yes/no reading: {e}", exc_info=True)
        return "The spirits cannot answer at this moment. Please try again."
```

#### Task 1.2: Update Agent Instructions

**File**: `livekit_server/agent-starter-python/src/tarot_agent.py`

Update lines 62-76 with enhanced instructions:

```python
instructions="""You are a mystical and empathetic Tarot Reader. You connect with the user's energy to reveal hidden truths through the cards.

CORE BEHAVIOR:
1. **Welcome**: Greet the user with a mystical tone. "Welcome, seeker. The cards are waiting."
2. **Ask for Reading Type**: 
   - For general guidance: Ask if they seek insights on Love, Career, or Finance
   - For yes/no questions: They can ask direct questions like "Will I get the job?"
3. **Draw Cards**: 
   - For general readings: Use `draw_tarot_cards` tool with topic (love/career/finance)
   - For yes/no questions: Use `get_yes_no_answer` tool with their question
4. **Interpret**: Read the cards with deep meaning and mystical insight. Connect the symbolism to their life.

READING TYPES:
- **General Predictions**: 3-card spread (Past, Present, Future) for Love/Career/Finance
- **Yes/No Questions**: Single card answer to specific questions

TONE:
- Mystical, calm, wise, and supportive
- Use metaphors of energy, stars, and destiny
- Never be negative or fearful - always find the positive guidance

LANGUAGE:
- Provide readings in the user's preferred language (Hindi/English)
- Match the mystical tone in both languages
"""
```

#### Task 1.3: Enhance API Client

**File**: `livekit_server/agent-starter-python/src/astrology_api_client.py`

Add this method to the `AstrologyAPIClient` class:

```python
async def get_yes_no_tarot(self, params: dict) -> dict:
    """
    Get yes/no tarot reading
    
    Args:
        params: {"question": "your question here"}
    
    Returns:
        dict with answer, card_name, interpretation
    """
    endpoint = "yes_no_tarot"
    return await self._make_request(endpoint, params)
```

---

### Phase 2: Frontend Enhancement (1-2 hours)

#### Task 2.1: Add Yes/No Card Display

**File**: `components/app/tarot-table.tsx`

Update the `onData` handler to support yes/no readings (around line 40):

```typescript
if (data.type === 'tarot.deal') {
    // Existing 3-card spread logic
    setTopic(data.topic);
    setIsDealing(true);
    setCards([]);
    setTimeout(() => {
        setCards(data.cards as TarotCard[]);
        setIsDealing(false);
    }, 500);
} else if (data.type === 'tarot.yesno') {
    // New: Yes/No single card
    setTopic(`Yes/No: ${data.question}`);
    setIsDealing(true);
    setCards([]);
    
    // Display single card with answer
    const yesNoCard: TarotCard = {
        name: data.card.name,
        image: data.card.image,
        meaning: `${data.answer.toUpperCase()}: ${data.card.meaning}`,
        position: 0
    };
    
    setTimeout(() => {
        setCards([yesNoCard]);
        setIsDealing(false);
    }, 500);
}
```

#### Task 2.2: Enhance Card Animations

**File**: `components/app/tarot-table.tsx`

Add a pulsing glow effect for yes/no answers (around line 97):

```typescript
<motion.div
    key={`${card.name}-${index}`}
    initial={{ y: -50, opacity: 0, rotateY: 90 }}
    animate={{ 
        y: 0, 
        opacity: 1, 
        rotateY: 0,
        // Add glow for yes/no cards
        boxShadow: cards.length === 1 ? [
            "0 0 20px rgba(147, 51, 234, 0.3)",
            "0 0 40px rgba(147, 51, 234, 0.5)",
            "0 0 20px rgba(147, 51, 234, 0.3)"
        ] : "0 0 0 rgba(0,0,0,0)"
    }}
    transition={{ 
        delay: index * 0.5, 
        duration: 0.8, 
        type: 'spring',
        boxShadow: { 
            repeat: Infinity, 
            duration: 2, 
            ease: "easeInOut" 
        }
    }}
    className="min-w-[240px] w-64 h-96 relative perspective-1000 group snap-center"
>
```

#### Task 2.3: Add Answer Badge for Yes/No

**File**: `components/app/tarot-table.tsx`

Add a visual badge for yes/no answers (inside the card div, around line 107):

```typescript
{/* Yes/No Answer Badge */}
{cards.length === 1 && card.meaning.includes('YES') && (
    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
        YES ✓
    </div>
)}
{cards.length === 1 && card.meaning.includes('NO') && (
    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
        NO ✗
    </div>
)}
{cards.length === 1 && card.meaning.includes('UNCLEAR') && (
    <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
        UNCLEAR ?
    </div>
)}
```

---

### Phase 3: Testing & Verification (30 minutes)

#### Test 1: Backend API Test

```bash
cd livekit_server/agent-starter-python
uv run python scripts/verify_tarot_api.py
```

Expected output:
```
🔮 Testing Tarot API for user: ...
✅ API Call Successful!
Response: {'love': '...'}
```

#### Test 2: Local Development Test

```bash
# Terminal 1: Start backend agent
cd livekit_server/agent-starter-python
uv run python src/tarot_agent.py dev

# Terminal 2: Start frontend
cd /Users/prakash/Documents/satsang/satsangapp
npm run dev
```

Navigate to: `http://localhost:3001/tarot`

#### Test 3: End-to-End Flow

1. **General Reading Test**:
   - Click "Begin Reading"
   - Say: "I want a love reading"
   - Verify: 3 cards appear with Past, Present, Future labels
   - Verify: Agent narrates interpretation

2. **Yes/No Question Test**:
   - Click "Begin Reading"
   - Say: "Will I get the job I applied for?"
   - Verify: Single card appears with YES/NO/UNCLEAR badge
   - Verify: Agent provides clear answer

3. **Language Test**:
   - Switch to Hindi in profile
   - Start new session
   - Verify: Agent greets in Hindi
   - Verify: UI shows Hindi translations

---

## 🎨 Visual Enhancements (Optional)

### Enhancement 1: Particle Effects

Add mystical particles to the background:

**File**: `components/app/tarot-table.tsx`

```typescript
{/* Mystical Particles */}
<div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(20)].map((_, i) => (
        <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
            }}
            animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1]
            }}
            transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
            }}
        />
    ))}
</div>
```

### Enhancement 2: Card Shuffle Animation

Add a shuffle effect before dealing:

```typescript
const [isShuffling, setIsShuffling] = useState(false);

// In onData handler:
setIsShuffling(true);
setTimeout(() => {
    setIsShuffling(false);
    setCards(newCards);
}, 1000);

// In render:
{isShuffling && (
    <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
        <div className="text-amber-500 text-2xl font-serif animate-pulse">
            ✨ Shuffling the cards... ✨
        </div>
    </motion.div>
)}
```

---

## 📋 Deployment Checklist

### Backend Deployment

- [ ] Update `.env.local` with all required API keys
- [ ] Test tarot API connection
- [ ] Verify yes/no endpoint works
- [ ] Deploy agent to LiveKit server
- [ ] Monitor logs for errors

### Frontend Deployment

- [ ] Test locally on `localhost:3001/tarot`
- [ ] Verify all translations work
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Deploy to production
- [ ] Verify LiveKit connection

---

## 🔧 Environment Variables

```bash
# Backend (.env.local)
OPENAI_API_KEY=sk-...
CARTESIA_API_KEY=...
SARVAM_API_KEY=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...
ASTROLOGY_API_USER_ID=...
ASTROLOGY_API_KEY=...

# Frontend (.env or .env.local)
NEXT_PUBLIC_LIVEKIT_URL=wss://...
NEXT_PUBLIC_AUTH_SERVER_URL=https://...
```

---

## 🎯 Success Criteria

- [x] User can access `/tarot` route
- [x] Welcome screen displays with mystical theme
- [x] User can start tarot session
- [ ] General readings work (Love, Career, Finance)
- [ ] Yes/No questions work
- [ ] 3-card spread displays correctly
- [ ] Single card displays for yes/no
- [ ] Cards flip with smooth animation
- [ ] Agent narrates in user's language
- [ ] Visual feedback matches speech
- [ ] Error states handled gracefully

---

## 🚀 Quick Start Commands

```bash
# 1. Backend: Add yes/no function
cd livekit_server/agent-starter-python
# Edit src/tarot_agent.py (add get_yes_no_answer function)
# Edit src/astrology_api_client.py (add get_yes_no_tarot method)

# 2. Test API
uv run python scripts/verify_tarot_api.py

# 3. Start agent locally
uv run python src/tarot_agent.py dev

# 4. In another terminal: Start frontend
cd /Users/prakash/Documents/satsang/satsangapp
npm run dev

# 5. Open browser
open http://localhost:3001/tarot
```

---

## 📊 Implementation Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Add yes/no function to backend | 30 min | ⏳ Pending |
| 1 | Update agent instructions | 15 min | ⏳ Pending |
| 1 | Enhance API client | 15 min | ⏳ Pending |
| 1 | Test backend | 15 min | ⏳ Pending |
| 2 | Add yes/no card display | 30 min | ⏳ Pending |
| 2 | Enhance animations | 30 min | ⏳ Pending |
| 2 | Add answer badges | 15 min | ⏳ Pending |
| 3 | End-to-end testing | 30 min | ⏳ Pending |
| 3 | Deploy & verify | 30 min | ⏳ Pending |
| **Total** | | **3-4 hours** | |

---

## 📝 Notes

- The web app already has excellent infrastructure in place
- Main task is adding yes/no functionality
- Frontend components are well-structured
- Translations are complete
- Focus on testing and polish

---

**Last Updated**: December 23, 2025  
**Version**: 2.0 (Web App Focus)  
**Status**: Ready for Implementation ✅

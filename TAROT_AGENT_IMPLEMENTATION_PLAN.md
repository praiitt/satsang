# Tarot Agent Implementation Plan

## Overview
This document outlines the complete implementation plan for integrating a **Tarot Reading Agent** into the RRAASI platform. The agent will provide mystical tarot card readings for Love, Career, and Finance using the Tarot API (both `tarot_predictions` and `yes_no_tarot` endpoints).

---

## 🎯 Goals

### Backend (Python Agent)
1. ✅ **Already Implemented**: Core `tarot_agent.py` with basic functionality
2. 🔧 **Enhance**: Add support for Yes/No Tarot readings
3. 🔧 **Improve**: Better card visualization and interpretation
4. 🔧 **Add**: Multi-language support (Hindi/English)
5. 🔧 **Optimize**: Better error handling and fallback mechanisms

### Frontend (React Native Mobile App)
1. ✨ **Create**: Tarot guru profile in `lib/gurus.ts`
2. ✨ **Add**: Translation keys for Tarot in `lib/translations.ts`
3. ✨ **Build**: Tarot-specific UI components for card display
4. ✨ **Implement**: Visual card animations and mystical theme
5. ✨ **Route**: Navigation to Tarot agent session

---

## 📋 Backend Implementation Details

### 1. Current State Analysis

**File**: `/Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python/src/tarot_agent.py`

**What's Already Done**:
- ✅ Basic TarotAgent class with mystical instructions
- ✅ `draw_tarot_cards()` function tool for general predictions
- ✅ Integration with `astrology_api_client.py`
- ✅ Visual card deck (22 Major Arcana cards with images)
- ✅ Language detection (Hindi/English)
- ✅ STT/TTS setup with Sarvam for Hindi
- ✅ Data publishing to frontend via `publish_data_fn`
- ✅ 3-card spread (Past, Present, Future)

### 2. Enhancements Needed

#### A. Add Yes/No Tarot Support

**New Function Tool**: `get_yes_no_answer()`

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
        
        # Parse response
        if response and isinstance(response, dict):
            answer = response.get('answer', 'unclear')  # yes/no/maybe
            card_name = response.get('card_name', 'Unknown Card')
            interpretation = response.get('interpretation', '')
            
            # Select visual card
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
                await self._publish_data_fn(json.dumps(payload).encode('utf-8'))
            
            return f"The cards reveal: {answer.upper()}. {card_name} - {interpretation}"
        
        return "The energies are unclear. Please ask again."
        
    except Exception as e:
        logger.error(f"Error in yes/no reading: {e}", exc_info=True)
        return "The spirits cannot answer at this moment."
```

#### B. Update Agent Instructions

Add to the agent's instructions:

```python
instructions="""You are a mystical and empathetic Tarot Reader. You connect with the user's energy to reveal hidden truths through the cards.

CORE BEHAVIOR:
1. **Welcome**: Greet the user with a mystical tone. "Welcome, seeker. The cards are waiting."
2. **Ask for Reading Type**: 
   - For general guidance: Ask if they seek insights on Love, Career, or Finance
   - For yes/no questions: They can ask direct questions like "Will I get the job?"
3. **Draw Cards**: 
   - For general readings: Use `draw_tarot_cards` tool
   - For yes/no questions: Use `get_yes_no_answer` tool
4. **Interpret**: Read the cards with deep meaning and mystical insight

READING TYPES:
- **General Predictions**: 3-card spread (Past, Present, Future) for Love/Career/Finance
- **Yes/No Questions**: Single card answer to specific questions

TONE:
- Mystical, calm, wise, and supportive
- Use metaphors of energy, stars, and destiny
- Never be negative or fearful

LANGUAGE:
- Provide readings in the user's preferred language (Hindi/English)
"""
```

#### C. Enhance API Client

**File**: `/Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python/src/astrology_api_client.py`

Add method for yes/no tarot:

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

#### D. Improve Card Visualization

**Current**: Uses random Major Arcana cards
**Enhancement**: Map API response to actual card meanings

```python
# Add Minor Arcana cards (56 cards)
MINOR_ARCANA = {
    "wands": [...],  # 14 cards
    "cups": [...],   # 14 cards
    "swords": [...], # 14 cards
    "pentacles": [...] # 14 cards
}

# Total deck: 78 cards (22 Major + 56 Minor)
FULL_TAROT_DECK = TAROT_DECK + flatten(MINOR_ARCANA.values())
```

#### E. Better Error Handling

```python
# Add retry logic
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _call_tarot_api(self, endpoint, params):
    """Call tarot API with retry logic"""
    # Implementation
```

### 3. Testing Requirements

**File**: `/Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python/tests/test_tarot_agent.py`

```python
import pytest
from src.tarot_agent import TarotAgent

@pytest.mark.asyncio
async def test_draw_tarot_cards_love():
    """Test drawing cards for love reading"""
    # Test implementation

@pytest.mark.asyncio
async def test_draw_tarot_cards_career():
    """Test drawing cards for career reading"""
    # Test implementation

@pytest.mark.asyncio
async def test_yes_no_answer():
    """Test yes/no tarot reading"""
    # Test implementation

@pytest.mark.asyncio
async def test_language_detection():
    """Test Hindi/English language switching"""
    # Test implementation
```

---

## 🎨 Frontend Implementation Details

### 1. Add Tarot Guru to Configuration

**File**: `/Users/prakash/Documents/satsang/satsangapp/mobile_app/agent-starter-react-native/lib/gurus.ts`

```typescript
{
    id: 'tarot',
    agentName: 'tarot-agent',
    name: { 
        en: 'Tarot Reader', 
        hi: 'टैरो रीडर' 
    },
    tradition: 'Universal',
    description: { 
        en: 'Mystical tarot card readings for love, career, and life guidance.', 
        hi: 'प्रेम, करियर और जीवन मार्गदर्शन के लिए रहस्यमय टैरो कार्ड रीडिंग।' 
    },
    avatar: '🔮',
    accent: '#9333ea', // Purple/mystical color
    route: '/guru/tarot'
}
```

### 2. Add Translation Keys

**File**: `/Users/prakash/Documents/satsang/satsangapp/mobile_app/agent-starter-react-native/lib/translations.ts`

```typescript
export const translations = {
    en: {
        // ... existing translations
        tarot: {
            title: 'Tarot Reading',
            subtitle: 'Unveil the mysteries of your path',
            welcome: 'Welcome, seeker. The cards await...',
            chooseTopic: 'Choose Your Reading',
            topicLove: 'Love & Relationships',
            topicCareer: 'Career & Success',
            topicFinance: 'Finance & Wealth',
            topicYesNo: 'Yes/No Question',
            askQuestion: 'Ask your question...',
            drawing: 'Drawing cards...',
            cardPositions: {
                past: 'Past Influence',
                present: 'Current Situation',
                future: 'Future Outcome'
            },
            yesNoAnswer: {
                yes: 'YES',
                no: 'NO',
                maybe: 'UNCLEAR'
            },
            newReading: 'New Reading',
            shareReading: 'Share Reading'
        }
    },
    hi: {
        // ... existing translations
        tarot: {
            title: 'टैरो रीडिंग',
            subtitle: 'अपने मार्ग के रहस्यों को उजागर करें',
            welcome: 'स्वागत है, साधक। कार्ड प्रतीक्षा कर रहे हैं...',
            chooseTopic: 'अपनी रीडिंग चुनें',
            topicLove: 'प्रेम और रिश्ते',
            topicCareer: 'करियर और सफलता',
            topicFinance: 'वित्त और धन',
            topicYesNo: 'हाँ/नहीं प्रश्न',
            askQuestion: 'अपना प्रश्न पूछें...',
            drawing: 'कार्ड निकाल रहे हैं...',
            cardPositions: {
                past: 'पिछला प्रभाव',
                present: 'वर्तमान स्थिति',
                future: 'भविष्य का परिणाम'
            },
            yesNoAnswer: {
                yes: 'हाँ',
                no: 'नहीं',
                maybe: 'अस्पष्ट'
            },
            newReading: 'नई रीडिंग',
            shareReading: 'रीडिंग साझा करें'
        }
    }
};
```

### 3. Create Tarot UI Components

#### A. Tarot Card Component

**File**: `/Users/prakash/Documents/satsang/satsangapp/mobile_app/agent-starter-react-native/components/tarot/TarotCard.tsx`

```typescript
import React from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';

interface TarotCardProps {
    name: string;
    image: string;
    meaning: string;
    position?: string;
    isRevealed?: boolean;
}

export const TarotCard: React.FC<TarotCardProps> = ({
    name,
    image,
    meaning,
    position,
    isRevealed = false
}) => {
    const flipAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (isRevealed) {
            Animated.spring(flipAnim, {
                toValue: 1,
                friction: 8,
                tension: 10,
                useNativeDriver: true
            }).start();
        }
    }, [isRevealed]);

    const frontInterpolate = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    const backInterpolate = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg']
    });

    return (
        <View style={styles.container}>
            {position && (
                <Text style={styles.position}>{position}</Text>
            )}
            
            <View style={styles.cardContainer}>
                {/* Card Back */}
                <Animated.View 
                    style={[
                        styles.card,
                        styles.cardBack,
                        { transform: [{ rotateY: frontInterpolate }] }
                    ]}
                >
                    <View style={styles.cardBackPattern}>
                        <Text style={styles.cardBackEmoji}>🔮</Text>
                    </View>
                </Animated.View>

                {/* Card Front */}
                <Animated.View 
                    style={[
                        styles.card,
                        styles.cardFront,
                        { transform: [{ rotateY: backInterpolate }] }
                    ]}
                >
                    <Image 
                        source={{ uri: image }} 
                        style={styles.cardImage}
                        resizeMode="cover"
                    />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{name}</Text>
                        <Text style={styles.cardMeaning}>{meaning}</Text>
                    </View>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 10
    },
    position: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9333ea',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    cardContainer: {
        width: 200,
        height: 320,
        position: 'relative'
    },
    card: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        backfaceVisibility: 'hidden',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#9333ea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    cardBack: {
        backgroundColor: '#1a1a2e',
        borderWidth: 2,
        borderColor: '#9333ea'
    },
    cardBackPattern: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    cardBackEmoji: {
        fontSize: 80,
        opacity: 0.3
    },
    cardFront: {
        backgroundColor: '#fff'
    },
    cardImage: {
        width: '100%',
        height: '60%'
    },
    cardInfo: {
        padding: 12,
        backgroundColor: '#f8f9fa'
    },
    cardName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a2e',
        marginBottom: 4
    },
    cardMeaning: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16
    }
});
```

#### B. Tarot Spread Component

**File**: `/Users/prakash/Documents/satsang/satsangapp/mobile_app/agent-starter-react-native/components/tarot/TarotSpread.tsx`

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TarotCard } from './TarotCard';

interface Card {
    name: string;
    image: string;
    meaning: string;
    position: number;
}

interface TarotSpreadProps {
    cards: Card[];
    positions: string[];
}

export const TarotSpread: React.FC<TarotSpreadProps> = ({ cards, positions }) => {
    const [revealedCards, setRevealedCards] = React.useState<number[]>([]);

    React.useEffect(() => {
        // Reveal cards one by one with delay
        cards.forEach((_, index) => {
            setTimeout(() => {
                setRevealedCards(prev => [...prev, index]);
            }, index * 1000);
        });
    }, [cards]);

    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {cards.map((card, index) => (
                <TarotCard
                    key={index}
                    name={card.name}
                    image={card.image}
                    meaning={card.meaning}
                    position={positions[card.position]}
                    isRevealed={revealedCards.includes(index)}
                />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 20
    }
});
```

#### C. Tarot Session Screen

**File**: `/Users/prakash/Documents/satsang/satsangapp/mobile_app/agent-starter-react-native/app/guru/tarot.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LiveKitRoom } from '@livekit/react-native';
import { TarotSpread } from '@/components/tarot/TarotSpread';
import { useTranslation } from '@/hooks/useTranslation';

export default function TarotSession() {
    const { t } = useTranslation();
    const [cards, setCards] = React.useState([]);
    const [positions, setPositions] = React.useState([]);

    const handleDataReceived = (data: Uint8Array) => {
        try {
            const payload = JSON.parse(new TextDecoder().decode(data));
            
            if (payload.type === 'tarot.deal') {
                setCards(payload.cards);
                setPositions([
                    t('tarot.cardPositions.past'),
                    t('tarot.cardPositions.present'),
                    t('tarot.cardPositions.future')
                ]);
            }
        } catch (error) {
            console.error('Error parsing tarot data:', error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('tarot.title')}</Text>
                <Text style={styles.subtitle}>{t('tarot.subtitle')}</Text>
            </View>

            {cards.length > 0 && (
                <TarotSpread cards={cards} positions={positions} />
            )}

            <LiveKitRoom
                serverUrl={process.env.EXPO_PUBLIC_LIVEKIT_URL!}
                token={/* get token */}
                connect={true}
                onDataReceived={handleDataReceived}
                audio={true}
                video={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1e'
    },
    header: {
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#9333ea33'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#9333ea',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: '#a78bfa',
        fontStyle: 'italic'
    }
});
```

### 4. Visual Design Theme

**Color Palette** (Mystical Purple/Cosmic):
- Primary: `#9333ea` (Purple)
- Secondary: `#a78bfa` (Light Purple)
- Background: `#0f0f1e` (Dark Blue-Black)
- Accent: `#fbbf24` (Gold for stars/mystical elements)
- Text: `#f3f4f6` (Light Gray)

**Typography**:
- Headers: Bold, mystical fonts
- Body: Clean, readable fonts
- Special effects: Glowing text for mystical elements

**Animations**:
- Card flip animation (3D rotate)
- Fade-in for interpretations
- Particle effects (stars, sparkles)
- Pulsing glow on active elements

---

## 🚀 Implementation Steps

### Phase 1: Backend Enhancement (2-3 hours)

1. ✅ Review existing `tarot_agent.py`
2. 🔧 Add `get_yes_no_answer()` function tool
3. 🔧 Update agent instructions
4. 🔧 Enhance `astrology_api_client.py` with yes/no endpoint
5. 🔧 Add comprehensive error handling
6. ✅ Test with `scripts/verify_tarot_api.py`
7. 📝 Write unit tests

### Phase 2: Frontend Setup (2-3 hours)

1. ✨ Add Tarot guru to `lib/gurus.ts`
2. ✨ Add translation keys to `lib/translations.ts`
3. ✨ Create `TarotCard.tsx` component
4. ✨ Create `TarotSpread.tsx` component
5. ✨ Create `app/guru/tarot.tsx` route
6. 🎨 Apply mystical theme and styling

### Phase 3: Integration & Testing (1-2 hours)

1. 🔗 Connect frontend to backend via LiveKit
2. 🧪 Test general readings (Love, Career, Finance)
3. 🧪 Test yes/no questions
4. 🧪 Test language switching (Hindi/English)
5. 🐛 Debug and fix issues

### Phase 4: Polish & Deploy (1 hour)

1. ✨ Add animations and visual effects
2. 📱 Test on mobile devices
3. 🚀 Deploy backend agent
4. 🚀 Deploy frontend app
5. 📚 Update documentation

---

## 📊 API Integration Details

### Tarot Predictions API

**Endpoint**: `tarot_predictions`

**Request**:
```json
{
    "love": 1,
    // OR
    "career": 1,
    // OR
    "finance": 1
}
```

**Response**:
```json
{
    "love": "The cards reveal deep emotional connections...",
    "career": "Professional growth is on the horizon...",
    "finance": "Financial stability requires patience..."
}
```

### Yes/No Tarot API

**Endpoint**: `yes_no_tarot`

**Request**:
```json
{
    "question": "Will I get the job?"
}
```

**Response** (Expected):
```json
{
    "answer": "yes", // or "no" or "maybe"
    "card_name": "The Sun",
    "interpretation": "The Sun brings positivity and success..."
}
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] API client connects successfully
- [ ] General tarot readings work for all topics (Love, Career, Finance)
- [ ] Yes/No readings return valid responses
- [ ] Language detection works (Hindi/English)
- [ ] STT/TTS configured correctly
- [ ] Data publishing to frontend works
- [ ] Error handling gracefully handles API failures
- [ ] Retry logic works for transient failures

### Frontend Tests
- [ ] Tarot guru appears in guru list
- [ ] Navigation to tarot session works
- [ ] Card flip animations work smoothly
- [ ] 3-card spread displays correctly
- [ ] Yes/No answer displays correctly
- [ ] Translations work in both languages
- [ ] LiveKit connection established
- [ ] Data received from backend correctly
- [ ] UI responsive on different screen sizes

---

## 📝 Environment Variables Required

```bash
# .env.local (Backend)
OPENAI_API_KEY=sk-...
CARTESIA_API_KEY=...
SARVAM_API_KEY=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...

# Astrology API (for Tarot)
ASTROLOGY_API_USER_ID=...
ASTROLOGY_API_KEY=...

# .env (Frontend)
EXPO_PUBLIC_LIVEKIT_URL=wss://...
EXPO_PUBLIC_AUTH_SERVER_URL=https://...
```

---

## 🎯 Success Criteria

1. ✅ User can select "Tarot Reader" from guru list
2. ✅ User can request Love/Career/Finance readings
3. ✅ User can ask Yes/No questions
4. ✅ Cards display with beautiful animations
5. ✅ Readings provided in user's language (Hindi/English)
6. ✅ Voice interaction works smoothly
7. ✅ Visual feedback matches agent's speech
8. ✅ Error states handled gracefully
9. ✅ Performance is smooth (< 2s card reveal)
10. ✅ Design is mystical and engaging

---

## 🔮 Future Enhancements

1. **Advanced Spreads**: Celtic Cross (10 cards), Horseshoe (7 cards)
2. **Card History**: Save past readings for user
3. **Daily Card**: One card per day feature
4. **Custom Decks**: Allow different tarot deck themes
5. **Astrology Integration**: Combine tarot with birth chart
6. **Social Sharing**: Share readings on social media
7. **Guided Meditations**: Post-reading meditation audio
8. **Journal Integration**: Save insights and reflections

---

## 📚 Resources

- **Tarot API Docs**: See uploaded image for endpoint details
- **LiveKit Docs**: https://docs.livekit.io
- **React Native Animated**: https://reactnative.dev/docs/animated
- **Tarot Card Images**: Rider-Waite deck (public domain)
- **Design Inspiration**: Mystical/cosmic UI patterns

---

## 🎨 Design Mockup Ideas

### Welcome Screen
```
┌─────────────────────────────────┐
│         🔮 Tarot Reader         │
│   Unveil the mysteries of       │
│        your path                │
│                                 │
│  ┌───────────────────────────┐ │
│  │   💜 Love & Relationships │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │   💼 Career & Success     │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │   💰 Finance & Wealth     │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │   ❓ Yes/No Question      │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

### 3-Card Spread
```
┌─────────────────────────────────┐
│                                 │
│   [Card 1]  [Card 2]  [Card 3] │
│     Past     Present    Future  │
│                                 │
│   🔮 The cards reveal...        │
│   [Interpretation text]         │
│                                 │
│   [New Reading] [Share]         │
└─────────────────────────────────┘
```

---

## 📞 Support & Maintenance

- **Logging**: Comprehensive logging in `tarot_agent.py`
- **Monitoring**: Track API call success rates
- **Alerts**: Set up alerts for API failures
- **Updates**: Keep tarot card database updated
- **Feedback**: Collect user feedback on readings

---

**Last Updated**: December 23, 2025
**Version**: 1.0
**Status**: Ready for Implementation

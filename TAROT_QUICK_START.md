# Tarot Agent Quick Start Guide

## 🚀 Quick Implementation Checklist

### Backend (Python) - 30 minutes

#### 1. Enhance tarot_agent.py
```bash
cd /Users/prakash/Documents/satsang/satsangapp/livekit_server/agent-starter-python
```

**Add Yes/No function** (after line 219):
```python
@function_tool
async def get_yes_no_answer(self, context: RunContext, question: str) -> str:
    """Get Yes/No tarot answer"""
    logger.info(f"Yes/No question: {question}")
    try:
        from .astrology_api_client import get_api_client
        client = get_api_client()
        response = await client.get_yes_no_tarot({"question": question})
        
        if response:
            answer = response.get('answer', 'unclear')
            card_name = response.get('card_name', 'Unknown')
            interpretation = response.get('interpretation', '')
            
            # Publish to frontend
            if self._publish_data_fn:
                payload = {
                    "type": "tarot.yesno",
                    "question": question,
                    "answer": answer,
                    "card": {"name": card_name, "meaning": interpretation}
                }
                await self._publish_data_fn(json.dumps(payload).encode('utf-8'))
            
            return f"{answer.upper()}: {card_name} - {interpretation}"
        return "The energies are unclear."
    except Exception as e:
        logger.error(f"Yes/No error: {e}")
        return "Cannot answer at this moment."
```

**Update instructions** (line 62-76):
```python
instructions="""You are a mystical Tarot Reader.

READING TYPES:
1. General Predictions: Use draw_tarot_cards for Love/Career/Finance
2. Yes/No Questions: Use get_yes_no_answer for direct questions

Ask the user which type they prefer, then proceed accordingly.

TONE: Mystical, calm, wise. Use metaphors of energy and destiny.
LANGUAGE: Match user's language (Hindi/English)
"""
```

#### 2. Update astrology_api_client.py
```python
# Add this method to the API client class
async def get_yes_no_tarot(self, params: dict) -> dict:
    """Get yes/no tarot reading"""
    endpoint = "yes_no_tarot"
    return await self._make_request(endpoint, params)
```

#### 3. Test the API
```bash
uv run python scripts/verify_tarot_api.py
```

---

### Frontend (React Native) - 45 minutes

#### 1. Add Tarot Guru
**File**: `mobile_app/agent-starter-react-native/lib/gurus.ts`

Add to GURUS array:
```typescript
{
    id: 'tarot',
    agentName: 'tarot-agent',
    name: { en: 'Tarot Reader', hi: 'टैरो रीडर' },
    tradition: 'Universal',
    description: { 
        en: 'Mystical tarot readings for love, career, and guidance.', 
        hi: 'प्रेम, करियर और मार्गदर्शन के लिए टैरो रीडिंग।' 
    },
    avatar: '🔮',
    accent: '#9333ea',
    route: '/guru/tarot'
}
```

#### 2. Add Translations
**File**: `mobile_app/agent-starter-react-native/lib/translations.ts`

Add to both `en` and `hi`:
```typescript
tarot: {
    title: 'Tarot Reading',
    subtitle: 'Unveil the mysteries',
    welcome: 'Welcome, seeker. The cards await...',
    chooseTopic: 'Choose Your Reading',
    topicLove: 'Love & Relationships',
    topicCareer: 'Career & Success',
    topicFinance: 'Finance & Wealth',
    topicYesNo: 'Yes/No Question',
    drawing: 'Drawing cards...',
    cardPositions: {
        past: 'Past Influence',
        present: 'Current Situation',
        future: 'Future Outcome'
    }
}
```

Hindi version:
```typescript
tarot: {
    title: 'टैरो रीडिंग',
    subtitle: 'रहस्यों को उजागर करें',
    welcome: 'स्वागत है। कार्ड प्रतीक्षा कर रहे हैं...',
    chooseTopic: 'अपनी रीडिंग चुनें',
    topicLove: 'प्रेम और रिश्ते',
    topicCareer: 'करियर और सफलता',
    topicFinance: 'वित्त और धन',
    topicYesNo: 'हाँ/नहीं प्रश्न',
    drawing: 'कार्ड निकाल रहे हैं...',
    cardPositions: {
        past: 'पिछला प्रभाव',
        present: 'वर्तमान स्थिति',
        future: 'भविष्य का परिणाम'
    }
}
```

#### 3. Create TarotCard Component
**File**: `mobile_app/agent-starter-react-native/components/tarot/TarotCard.tsx`

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
    name, image, meaning, position, isRevealed = false
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

    const rotateY = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    return (
        <View style={styles.container}>
            {position && <Text style={styles.position}>{position}</Text>}
            <Animated.View style={[styles.card, { transform: [{ rotateY }] }]}>
                <Image source={{ uri: image }} style={styles.image} />
                <View style={styles.info}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.meaning}>{meaning}</Text>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', margin: 10 },
    position: { fontSize: 14, color: '#9333ea', fontWeight: '600', marginBottom: 8 },
    card: { width: 200, height: 320, borderRadius: 16, overflow: 'hidden', 
            backgroundColor: '#fff', elevation: 8 },
    image: { width: '100%', height: '60%' },
    info: { padding: 12, backgroundColor: '#f8f9fa' },
    name: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
    meaning: { fontSize: 12, color: '#666', lineHeight: 16 }
});
```

#### 4. Create Tarot Session Screen
**File**: `mobile_app/agent-starter-react-native/app/guru/tarot.tsx`

```typescript
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { TarotCard } from '@/components/tarot/TarotCard';
import { useTranslation } from '@/hooks/useTranslation';

export default function TarotSession() {
    const { t } = useTranslation();
    const [cards, setCards] = React.useState([]);
    const [revealed, setRevealed] = React.useState<number[]>([]);

    // Handle data from backend
    const handleDataReceived = (data: Uint8Array) => {
        const payload = JSON.parse(new TextDecoder().decode(data));
        if (payload.type === 'tarot.deal') {
            setCards(payload.cards);
            // Reveal cards one by one
            payload.cards.forEach((_, i) => {
                setTimeout(() => setRevealed(prev => [...prev, i]), i * 1000);
            });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('tarot.title')}</Text>
                <Text style={styles.subtitle}>{t('tarot.subtitle')}</Text>
            </View>
            
            <ScrollView horizontal contentContainerStyle={styles.cards}>
                {cards.map((card, i) => (
                    <TarotCard
                        key={i}
                        name={card.name}
                        image={card.image}
                        meaning={card.meaning}
                        position={t(`tarot.cardPositions.${['past','present','future'][i]}`)}
                        isRevealed={revealed.includes(i)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1e' },
    header: { padding: 20, alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#9333ea' },
    subtitle: { fontSize: 14, color: '#a78bfa', fontStyle: 'italic' },
    cards: { paddingHorizontal: 20, paddingVertical: 20 }
});
```

---

## 🧪 Testing

### Backend Test
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

### Frontend Test
```bash
cd mobile_app/agent-starter-react-native
npm run ios  # or npm run android
```

1. Navigate to guru list
2. Select "🔮 Tarot Reader"
3. Start session
4. Ask: "I want a love reading"
5. Watch cards appear with animation

---

## 🎨 Visual Theme

**Colors**:
- Primary: `#9333ea` (Mystical Purple)
- Light: `#a78bfa` (Lavender)
- Dark: `#0f0f1e` (Cosmic Black)
- Accent: `#fbbf24` (Gold)

**Fonts**:
- Headers: Bold, 28px
- Body: Regular, 14px
- Cards: 18px (name), 12px (meaning)

**Animations**:
- Card flip: 3D rotate (spring animation)
- Reveal delay: 1 second between cards
- Glow effect on active elements

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: API returns None
```bash
# Check .env.local has correct credentials
cat .env.local | grep ASTROLOGY
```

**Problem**: Import errors
```bash
# Reinstall dependencies
uv sync
```

### Frontend Issues

**Problem**: Cards not displaying
- Check LiveKit connection
- Verify data payload format
- Check console logs

**Problem**: Animations not working
- Ensure `useNativeDriver: true`
- Check React Native version compatibility

---

## 📊 API Reference

### draw_tarot_cards(topic: str)
- **Input**: "love" | "career" | "finance"
- **Output**: 3-card spread with interpretations
- **Publishes**: `{"type": "tarot.deal", "cards": [...]}`

### get_yes_no_answer(question: str)
- **Input**: Any yes/no question
- **Output**: "YES" | "NO" | "UNCLEAR" + interpretation
- **Publishes**: `{"type": "tarot.yesno", "answer": "...", "card": {...}}`

---

## ✅ Completion Checklist

- [ ] Backend: Added yes/no function
- [ ] Backend: Updated instructions
- [ ] Backend: Enhanced API client
- [ ] Backend: Tested API connection
- [ ] Frontend: Added guru to list
- [ ] Frontend: Added translations
- [ ] Frontend: Created TarotCard component
- [ ] Frontend: Created session screen
- [ ] Frontend: Applied mystical theme
- [ ] Testing: End-to-end flow works
- [ ] Testing: Both languages work
- [ ] Testing: Animations smooth

---

## 🚀 Deployment

### Backend
```bash
# Start agent locally
cd livekit_server/agent-starter-python
uv run python src/tarot_agent.py dev
```

### Frontend
```bash
# Run on device
cd mobile_app/agent-starter-react-native
npm run ios  # or android
```

---

## 📞 Next Steps

1. **Implement** using this guide
2. **Test** thoroughly
3. **Deploy** to production
4. **Monitor** user feedback
5. **Iterate** based on usage

For detailed information, see `TAROT_AGENT_IMPLEMENTATION_PLAN.md`

---

**Quick Start Time**: ~75 minutes total
**Difficulty**: Intermediate
**Status**: Ready to implement

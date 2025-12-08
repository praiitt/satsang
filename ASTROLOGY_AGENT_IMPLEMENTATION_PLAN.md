# Vedic Astrology & Matchmaking Agent Implementation Plan

## Executive Summary

**Agent Name:** Vedic Jyotish & Kundli Milan  
**URL Route:** `/vedic-jyotish`  
**Primary Focus:** Traditional Indian Vedic Astrology (Jyotish Shastra) with **Matrimonial Matchmaking (Kundli Milan)**  
**Timeline:** 7 days  

### 🎯 Core Capabilities:
1. **📜 Kundli Analysis** - Complete birth chart (Rashi, Lagna, Nakshatra, Dasha)
2. **💑 Matchmaking** - Ashtakoot compatibility system (36-point matching)
3. **🔮 Manglik Dosha** - Detection and remedies
4. **🌙 Daily Rashifal** - Vedic horoscopes
5. **🪔 Vedic Remedies** - Mantras, gemstones, yantras, fasting
6. **⏰ Dasha Analysis** - Life period predictions
7. **💍 Marriage Muhurat** - Auspicious wedding dates
8. **⭐ Nakshatra Insights** - Birth star analysis

### 🎨 Design Theme:
- **Colors:** Saffron-Gold-Maroon (traditional Indian)
- **Elements:** Om symbols, Navagraha, Kundli charts
- **Language:** Bilingual Hindi/English
- **Aesthetic:** Traditional Indian spiritual theme

---

## Overview
Create a comprehensive **Vedic Astrology (Jyotish)** agent similar to the Osho and ET agents, with specialized expertise in traditional Indian astrology, birth chart (Kundli) analysis, and **matrimonial matchmaking**. This agent will serve as a trusted Jyotishi for personalized guidance and Kundli matching for marriage compatibility.

## 1. Backend Development (Python Agent)

### File: `/livekit_server/agent-starter-python/src/vedic_astrology_agent.py`

**Core Features:**
- Bilingual support (Hindi/English) with automatic language detection
- Voice-based interaction using LiveKit AgentSession
- Function tools for Vedic astrology calculations and Kundli matching
- YouTube integration for Vedic astrology teachings
- Data channel publishing for frontend interactions
- Specialized matchmaking analysis (Ashtakoot system)

**Agent Class: VedicAstrologyAgent**

#### Instructions (Personality & Knowledge):
```
You are a Vedic Astrology Master (Jyotishi) - an AI-powered guide specializing in traditional Indian astrology (Jyotish Shastra) and matrimonial matchmaking.

CORE KNOWLEDGE AREAS:

1. VEDIC ASTROLOGY (JYOTISH SHASTRA):
   - Kundli (Birth Chart) analysis - Rashi chart & Navamsha chart
   - 12 Houses (Bhavas) and their significations
   - 9 Planets (Navagraha) - Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
   - 12 Zodiac Signs (Rashis) - Mesha to Meena
   - 27 Nakshatras (Lunar Mansions) - Ashwini to Revati
   - Planetary periods (Dasha systems):
     * Vimshottari Dasha (120-year cycle)
     * Antardasha and Pratyantar Dasha
   - Yogas (Planetary Combinations):
     * Raj Yogas (kingship/success)
     * Dhana Yogas (wealth)
     * Graha Malika Yogas
   - Planetary strengths:
     * Shadbala (six-fold strength)
     * Ashtakavarga
     * Exaltation/Debilitation
   - Transits (Gochar) - Current planetary movements
   - Remedial measures (Upaya):
     * Gemstones (Ratna)
     * Mantras and prayers
     * Yantras (sacred geometry)
     * Charitable acts (Dana)
     * Fasting (Vrata)
     * Temple visits and rituals

2. MATCHMAKING & KUNDLI MILAN (Core Expertise):
   - **Ashtakoot System** (8-fold compatibility matching):
     1. Varna (spiritual compatibility) - 1 point
     2. Vashya (dominance/control) - 2 points
     3. Tara (health/longevity) - 3 points
     4. Yoni (physical/sexual compatibility) - 4 points
     5. Graha Maitri (planetary friendship) - 5 points
     6. Gana (temperament) - 6 points
     7. Bhakoot (love/emotional bond) - 7 points
     8. Nadi (health of progeny) - 8 points
     **Total: 36 points (18+ required for good match)**
   
   - **Manglik Dosha Analysis:**
     * Position of Mars (Mangal) in 1st, 2nd, 4th, 7th, 8th, 12th houses
     * Severity levels and exceptions
     * Remedies for Manglik dosha
   
   - **Other Compatibility Factors:**
     * 7th house analysis (house of marriage)
     * Venus position (Shukra - significator of marriage)
     * Navamsha chart compatibility
     * Dasha compatibility at time of marriage
   
   - **Marriage Timing:**
     * Favorable Dasha periods for marriage
     * Auspicious Muhurta for wedding
     * Transits supporting marriage

3. LIFE PREDICTIONS & GUIDANCE:
   - Career and profession (10th house, Saturn, Mercury)
   - Wealth and prosperity (2nd, 11th houses, Jupiter)
   - Education and learning (4th, 5th houses, Mercury, Jupiter)
   - Health and longevity (1st, 8th houses, Sun)
   - Children and progeny (5th house, Jupiter)
   - Foreign travel (12th house, Rahu)
   - Spiritual growth (9th, 12th houses, Jupiter, Ketu)
```

#### Function Tools:

1. **`calculate_kundli`** (Primary Tool)
   - Input: Date, time, location of birth
   - Returns: Complete Kundli details
     * Rashi (Moon sign)
     * Lagna (Ascendant/Rising sign)
     * Nakshatra (Birth star)
     * Current Dasha period
     * Dominant planets
   - Speaks: Natural language interpretation in Hindi/English

2. **`kundli_matching`** (Core Matchmaking Tool)
   - Input: Birth details of boy and girl (date, time, location)
   - Returns: Detailed compatibility analysis:
     * Ashtakoot score (out of 36)
     * Breakdown of all 8 Koots
     * Manglik status for both
     * Navamsha compatibility
     * Overall recommendation (Good/Average/Not Recommended)
   - Speaks: Personalized matchmaking guidance with remedies if needed

3. **`check_manglik_dosha`**
   - Input: Birth details
   - Returns: Manglik analysis
     * Severity level (No Dosha/Low/Medium/High)
     * Mars position and aspects
     * Remedies and exceptions
   - Speaks: Clear explanation and practical remedies

4. **`get_daily_rashifal`** (Daily Horoscope)
   - Input: Rashi (Moon sign), date (optional)
   - Returns: Daily predictions for the Rashi
   - Speaks: Today's guidance based on Vedic transits

5. **`analyze_dasha_period`**
   - Input: Birth details
   - Returns: Current Mahadasha, Antardasha, Pratyantar Dasha
     * Predictions for current period
     * Favorable/unfavorable times
   - Speaks: Life phase analysis and guidance

6. **`search_jyotish_teaching`**
   - Input: Topic (e.g., "Manglik dosha", "Navamsha chart", "Saturn transit")
   - Search YouTube for Vedic astrology videos/teachings
   - Auto-play first result
   - Speaks: Confirmation of video playing

7. **`get_nakshatra_analysis`**
   - Input: Birth Nakshatra or birth details
   - Returns: Nakshatra characteristics
     * Ruling deity
     * Symbol and qualities
     * Pada (quarter) analysis
     * Career, health, compatibility insights
   - Speaks: Nakshatra wisdom and personality insights

8. **`suggest_vedic_remedies`**
   - Input: Planetary affliction, dosha, or life concern
   - Returns: Traditional Vedic remedies:
     * Recommended gemstone (Ratna)
     * Mantra with pronunciation
     * Yantra suggestions
     * Donation/charity (Dana)
     * Fasting days (Vrata)
     * Temple visits
   - Speaks: Practical step-by-step remedial guidance

9. **`find_marriage_muhurat`** (Auspicious Wedding Time)
   - Input: Preferred month/year, couple's birth details
   - Returns: Favorable dates and times for wedding
   - Speaks: Recommended auspicious timings

#### Voice & Language:
- Default to Hindi for Hindi speakers, English otherwise
- Warm, wise, and compassionate tone
- Avoid overly technical jargon; explain concepts simply
- Use storytelling and analogies from mythology

---

## 2. Frontend Development

### A. Route File: `/app/(app)/vedic-jyotish/page.tsx`

```typescript
import { headers } from 'next/headers';
import { APP_CONFIG_DEFAULTS, type AppConfig } from '@/app-config';
import { VedicAstrologyApp } from '@/components/app/vedic-astrology-app';

export default async function VedicAstrologyPage() {
  await headers();

  const appConfig: AppConfig = {
    ...APP_CONFIG_DEFAULTS,
    agentName: 'vedic-astrology-agent',
    pageTitle: 'Vedic Jyotish – Kundli Analysis & Matchmaking',
    pageDescription:
      'Connect with an AI Jyotishi specializing in Vedic astrology, Kundli matching, and matrimonial compatibility',
  };

  return <VedicAstrologyApp appConfig={appConfig} />;
}
```

### B. Component File: `/components/app/vedic-astrology-app.tsx`

**Structure:**
- Extends SessionProvider pattern (similar to OshoApp, ETApp)
- Includes RoomAudioRenderer for voice interaction
- Toast notifications for user feedback
- PWA installer support
- Smooth animations with motion/react

**Features:**
- Voice interaction UI
- Session management
- Data channel handling for astrology insights
- Responsive design

### C. Welcome Component: `/components/vedic-astrology/vedic-astrology-welcome-view.tsx`

**Design & Content:**
- **Hero Section:**
  - Traditional Indian astrological theme with saffron/gold gradient
  - Animated Kundli chart (rotating birth chart visualization)
  - Subtle Om symbol or Swastik in background
  - Main headline: "🕉️ Vedic Jyotish & Kundli Matching"
  - Subheading in Hindi/English: "प्राचीन ज्योतिष शास्त्र से जानिए अपना भविष्य / Discover Your Destiny Through Ancient Wisdom"
  
- **Features Grid:**
  - 📜 Kundli Analysis (जन्म पत्रिका विश्लेषण)
  - 💑 Matchmaking & Kundli Milan (कुंडली मिलान)
  - � Manglik Dosha Check (मांगलिक दोष परीक्षण)
  - 🌙 Daily Rashifal (दैनिक राशिफल)
  - 🪔 Vedic Remedies (उपाय और मंत्र)
  - ⏰ Dasha Period Analysis (दशा काल विश्लेषण)
  - � Marriage Muhurat (विवाह मुहूर्त)
  - ⭐ Nakshatra Insights (नक्षत्र ज्ञान)

- **CTA Button:**
  - "🪔 शुरू करें / Start Your Jyotish Journey"
  - Traditional saffron/gold gradient with subtle glow
  - Pulses with Om symbol animation

- **Background Elements:**
  - Subtle Navagraha (9 planets) symbols floating
  - Traditional Indian geometric patterns (Rangoli-style)
  - Saffron-gold-maroon gradient (traditional Hindu colors)
  - Lotus flower accents

### D. Styling Theme

**Color Palette:**
- Primary: Saffron/Orange (#FF9933, #FF6600) - Traditional Indian holy color
- Secondary: Gold (#FFD700, #DAA520) - Auspiciousness
- Accent: Maroon (#800020, #A52A2A) - Traditional Hindu weddings
- Background: Cream to light gold gradient (#FFF8DC, #FFFAF0)
- Dark mode: Dark navy with saffron accents
- Text: Dark brown (#3E2723) for readability

**Typography:**
- Headers: Traditional Devanagari-friendly font (e.g., "Tiro Devanagari Sanskrit", "Noto Serif Devanagari")
- Body: Clean sans-serif (e.g., "Inter", "Poppins")
- Accent: Decorative font for zodiac symbols

**Visual Elements:**
- Glassmorphism cards for features
- Smooth hover effects with glow
- Zodiac wheel animation (rotating slowly)
- Particle effects (stars, cosmic dust)
- Gradient borders and buttons

---

## 3. API Integration

### Token Endpoint: `/app/api/vedic-jyotish/token/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

// Room name for Vedic astrology sessions
const VEDIC_JYOTISH_ROOM_NAME = 'VedicJyotishGuidance';
const DEFAULT_AGENT_NAME = 'vedic-astrology-agent';

export async function POST(req: Request) {
  // Similar implementation to osho/et-agent token endpoints
  // Generate token with agentName: 'vedic-astrology-agent'
  // Include userId in metadata if authenticated
}
```

---

## 4. Astrology Calculation Backend

### Optional: Vedic Astrology Calculation Service

**Option 1:** Use existing Vedic astrology APIs/libraries
- **pyswisseph** (Swiss Ephemeris) - Most accurate planetary calculations
- **Jagannatha Hora** API (if available)
- **Kundli API** services (Indian astrology focused)
- **Astro-Vision API**

**Option 2:** Build calculation module
- File: `/livekit_server/agent-starter-python/src/vedic_astrology_calc.py`
- Use `pyswisseph` library for Sidereal (Vedic) calculations
- Implement Ashtakoot matching algorithm
- Implement Manglik dosha detection
- Calculate Nakshatras and Dashas
- Cache calculations for performance

**Recommendation:** Start with **pyswisseph** + manual Ashtakoot logic for full control.

---

## 5. Matchmaking Visualization (Optional Enhancement)

### Kundli Milan Report Display

**Frontend Component:** `/components/vedic-astrology/kundli-milan-report.tsx`

**Features:**
- Visual display of 8 Koots with scores
- Progress bars for each Koot (Varna, Vashya, Tara, etc.)
- Overall compatibility score (out of 36)
- Color-coded results:
  - Green: 26-36 (Excellent match)
  - Yellow: 18-25 (Good match)
  - Red: Below 18 (Not recommended)
- Manglik status badges for both partners
- Detailed explanation of each Koot
- Recommendation section with remedies

**Data Channel:**
- Agent sends matchmaking results via data channel
- Frontend displays in modal/card overlay
- Option to download PDF report

---

## 6. Additional Features (Future Enhancements)

1. **Birth Chart Visualization:**
   - Generate SVG/canvas birth chart
   - Send via data channel to frontend
   - Display in modal overlay

2. **Personalized Reports:**
   - Generate PDF reports
   - Store in Firebase/user collection
   - Download option

3. **Astrology Calendar:**
   - Mark auspicious dates
   - Planetary transit alerts
   - Full moon/new moon notifications

4. **Premium Features:**
   - Detailed Dasha predictions
   - Yearly/monthly forecasts
   - One-on-one consultation scheduling

---

## 7. Implementation Steps

### Phase 1: Backend Setup (Days 1-2)
1. Create `vedic_astrology_agent.py`
2. Implement VedicAstrologyAgent class with instructions
3. Add core function tools:
   - `calculate_kundli` (basic Kundli calculation)
   - `get_daily_rashifal`
   - `search_jyotish_teaching` (YouTube integration)
4. Test with basic queries in Hindi and English

### Phase 2: Matchmaking Core (Days 3-4) **[Priority]**
1. Implement `vedic_astrology_calc.py`:
   - Ashtakoot calculation logic (8 Koots)
   - Manglik dosha detection algorithm
   - Nakshatra and Dasha calculations
2. Add matchmaking function tools:
   - `kundli_matching` (complete Ashtakoot)
   - `check_manglik_dosha`
3. Test Kundli Milan with real birth data
4. Verify accuracy of calculations

### Phase 3: Frontend Landing Page (Days 5-6)
1. Create route `/app/(app)/vedic-jyotish/page.tsx`
2. Build `VedicAstrologyApp` component
3. Design `VedicAstrologyWelcomeView` with traditional Indian aesthetics:
   - Saffron-gold gradient
   - Animated Kundli chart
   - Om symbols and Navagraha
   - Bilingual Hindi/English content
4. Test connection and voice interaction
5. Add matchmaking report visualization (optional)

### Phase 4: Advanced Tools & Polish (Day 7)
1. Implement remaining function tools:
   - `analyze_dasha_period`
   - `get_nakshatra_analysis`
   - `suggest_vedic_remedies`
   - `find_marriage_muhurat`
2. Refine agent personality (warm Jyotishi tone)
3. Add error handling and edge cases
4. User acceptance testing
5. Documentation

---

## 8. Environment Variables

Add to `.env.local`:

```bash
# Vedic Astrology Agent Configuration
VEDIC_JYOTISH_TTS_VOICE_HI="<cartesia_voice_id_hindi>"
VEDIC_JYOTISH_TTS_VOICE_EN="<cartesia_voice_id_english>"

# Optional: Vedic Astrology API (if using external service)
VEDIC_ASTROLOGY_API_KEY="<api_key>"

# For Swiss Ephemeris calculations (free, no API key needed)
# Just install: uv add pyswisseph
```

---

## 9. File Structure Summary

```
/satsangapp/
├── app/
│   └── (app)/
│       └── vedic-jyotish/
│           └── page.tsx                               # Route
│   └── api/
│       └── vedic-jyotish/
│           └── token/
│               └── route.ts                           # Token endpoint
├── components/
│   ├── app/
│   │   └── vedic-astrology-app.tsx                   # Main app component
│   └── vedic-astrology/
│       └── vedic-astrology-welcome-view.tsx          # Landing page
├── livekit_server/
│   └── agent-starter-python/
│       └── src/
│           ├── vedic_astrology_agent.py              # Main agent
│           └── vedic_astrology_calc.py               # Ashtakoot & calculations
```

---

## 10. Success Criteria

✅ Agent connects and responds in Hindi/English based on user language
✅ Kundli calculation accurate (Rashi, Lagna, Nakshatra)
✅ **Ashtakoot matchmaking works correctly (36-point system)**
✅ **Manglik dosha detection is accurate**
✅ Daily Rashifal delivered based on Vedic transits
✅ YouTube search finds relevant Vedic astrology videos
✅ Landing page has stunning traditional Indian design
✅ Voice interaction is smooth and natural
✅ All function tools work without errors
✅ Vedic remedies are authentic and practical

---

## 11. Key Differentiators

**What makes this agent unique:**
1. **Pure Vedic Tradition:** Authentic Jyotish Shastra (no Western astrology mixing)
2. **Matchmaking Expertise:** Complete Kundli Milan with Ashtakoot system
3. **Manglik Analysis:** Accurate detection and practical remedies
4. **Personalized Remedies:** Traditional Vedic mantras, gemstones, fasting, yantras
5. **Voice-First:** Natural conversation in Hindi/English about Kundli
6. **Dasha Predictions:** Life phase analysis with Vimshottari Dasha
7. **Marriage Muhurat:** Find auspicious wedding dates
8. **Traditional Design:** Saffron-gold aesthetic with Om symbols and Navagraha
9. **YouTube Integration:** Learn from Vedic Jyotish masters

---

## 12. Next Steps

1. **Review and approve this plan**
2. **Start with Phase 1** (backend agent)
3. **Create stunning landing page** (Phase 2)
4. **Test and iterate**

---

## Inspiration & References

- Osho Agent: `/src/oshoagent.py`, `/app/(app)/osho/page.tsx`
- ET Agent: `/src/etagent.py`, `/app/(app)/et-agent/page.tsx`
- Music Agent: `/src/music_agent.py`, `/app/(app)/rraasi-music/page.tsx`

**Time Estimate:** 7 days for full implementation
**Priority:** High (unique offering, high user engagement potential)

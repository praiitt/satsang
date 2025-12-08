# Vedic Astrology Agent + Pinecone Integration Plan

## Executive Summary

**Goal:** Connect the Vedic Astrology LiveKit agent to Pinecone database containing user birth charts (indexed by Firebase UID) to provide personalized astrological guidance based on actual user data.

**Key Benefit:** Agent will have access to user's complete birth chart data (positions, houses, dashas, etc.) and can provide accurate, personalized predictions instead of generic responses.

---

## Architecture Overview

```
User (Firebase UID) 
    ↓
Frontend → LiveKit Token (with userId metadata)
    ↓
Vedic Astrology Agent (LiveKit)
    ↓
Pinecone RAG (filter by userId)
    ↓
User's Birth Chart Data
    ↓
Personalized Astrological Answers
```

---

## Current Pinecone Database Structure

**Assumption:** Your Pinecone index contains:
```json
{
  "id": "chart_<firebase_uid>_<chart_id>",
  "values": [embedding_vector],
  "metadata": {
    "userId": "<firebase_uid>",
    "birthDate": "1990-05-15",
    "birthTime": "14:30",
    "birthPlace": "Mumbai, India",
    "rashi": "Vrishabha",
    "lagna": "Simha",
    "nakshatra": "Rohini",
    "nakshatraPada": "2",
    "sun": {"sign": "Vrishabha", "house": 10, "degree": 24.5},
    "moon": {"sign": "Vrishabha", "house": 10, "degree": 12.3},
    "mars": {"sign": "Karka", "house": 12, "degree": 8.7},
    // ... other planets
    "mahadasha": "Venus",
    "antardasha": "Sun",
    "houses": {
      "1": {"sign": "Simha", "lord": "Sun"},
      // ... all 12 houses
    },
    "manglik": false,
    "yogas": ["Raj Yoga", "Gajakesari Yoga"],
    "chartType": "birth_chart" // or "navamsha", "dasha_timeline", etc.
  }
}
```

**Question to verify:** 
1. What's your Pinecone index name?
2. What's the structure of your chart data in metadata?
3. Are embeddings generated for text descriptions of the chart?

---

## Implementation Plan

### **Phase 1: Environment Setup**

#### 1.1 Install Required Packages
```bash
cd livekit_server/agent-starter-python
uv add pinecone-client
uv add livekit-plugins-rag  # LiveKit's RAG plugin
```

#### 1.2 Add Environment Variables
**File:** `.env.local`
```bash
# Pinecone Configuration
PINECONE_API_KEY="<your_pinecone_api_key>"
PINECONE_ENVIRONMENT="<your_pinecone_environment>"  # e.g., "us-east-1-aws"
PINECONE_INDEX_NAME="astrology-charts"  # Your index name

# Optional: Pinecone namespace for organization
PINECONE_NAMESPACE="birth_charts"  # If you use namespaces
```

---

### **Phase 2: Update Agent to Extract User ID**

This is already partially done! We need to ensure userId flows correctly.

#### 2.1 Token Endpoint (Already Done ✅)
**File:** `/app/api/vedic-jyotish/token/route.ts`
- Already includes `userId` in metadata ✅
- Passed from auth context ✅

#### 2.2 Agent Entrypoint (Already Done ✅)
**File:** `/src/vedic_astrology_agent.py`
- Already extracts userId from participant metadata ✅
- Need to store it for RAG queries (small update needed)

---

### **Phase 3: Implement Pinecone RAG Integration**

#### 3.1 Create Pinecone Helper Module
**File:** `/src/pinecone_kundli_retriever.py`

```python
import os
import logging
from typing import Optional, Dict, Any, List
from pinecone import Pinecone, ServerlessSpec

logger = logging.getLogger("pinecone_kundli_retriever")

class KundliRetriever:
    """
    Retrieves user's Kundli data from Pinecone based on Firebase UID.
    """
    
    def __init__(self):
        api_key = os.getenv("PINECONE_API_KEY")
        environment = os.getenv("PINECONE_ENVIRONMENT")
        index_name = os.getenv("PINECONE_INDEX_NAME", "astrology-charts")
        namespace = os.getenv("PINECONE_NAMESPACE", "")
        
        if not api_key:
            raise ValueError("PINECONE_API_KEY not set")
        
        logger.info(f"Initializing Pinecone client for index: {index_name}")
        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index(index_name)
        self.namespace = namespace
        
        logger.info("✅ Pinecone client initialized successfully")
    
    async def get_user_kundli(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve user's complete Kundli data from Pinecone.
        
        Args:
            user_id: Firebase UID of the user
            
        Returns:
            Dictionary containing user's birth chart data, or None if not found
        """
        try:
            logger.info(f"Fetching Kundli for user: {user_id}")
            
            # Query Pinecone with userId filter
            # Using metadata filtering to get exact user match
            query_response = self.index.query(
                vector=[0] * 1536,  # Dummy vector (we're filtering by metadata)
                filter={"userId": {"$eq": user_id}},
                top_k=1,
                include_metadata=True,
                namespace=self.namespace
            )
            
            if not query_response.matches:
                logger.warning(f"No Kundli found for user: {user_id}")
                return None
            
            # Get first match (should be user's birth chart)
            match = query_response.matches[0]
            kundli_data = match.metadata
            
            logger.info(f"✅ Found Kundli for user {user_id}: Rashi={kundli_data.get('rashi')}, Lagna={kundli_data.get('lagna')}")
            
            return kundli_data
            
        except Exception as e:
            logger.error(f"Error fetching Kundli from Pinecone: {e}", exc_info=True)
            return None
    
    async def get_user_chart_summary(self, user_id: str) -> str:
        """
        Get a natural language summary of user's chart for the LLM context.
        
        Args:
            user_id: Firebase UID
            
        Returns:
            Formatted string summary of the chart
        """
        kundli = await self.get_user_kundli(user_id)
        
        if not kundli:
            return "User's birth chart data is not available."
        
        # Format chart data for LLM consumption
        summary = f"""
USER'S BIRTH CHART DATA:
Birth Details:
- Date: {kundli.get('birthDate', 'Unknown')}
- Time: {kundli.get('birthTime', 'Unknown')}
- Place: {kundli.get('birthPlace', 'Unknown')}

Core Chart Elements:
- Rashi (Moon Sign): {kundli.get('rashi', 'Unknown')}
- Lagna (Ascendant): {kundli.get('lagna', 'Unknown')}
- Nakshatra: {kundli.get('nakshatra', 'Unknown')} (Pada {kundli.get('nakshatraPada', 'Unknown')})

Current Dasha Periods:
- Mahadasha: {kundli.get('mahadasha', 'Unknown')}
- Antardasha: {kundli.get('antardasha', 'Unknown')}

Planetary Positions:
- Sun: {kundli.get('sun', {}).get('sign', 'Unknown')} in House {kundli.get('sun', {}).get('house', 'Unknown')}
- Moon: {kundli.get('moon', {}).get('sign', 'Unknown')} in House {kundli.get('moon', {}).get('house', 'Unknown')}
- Mars: {kundli.get('mars', {}).get('sign', 'Unknown')} in House {kundli.get('mars', {}).get('house', 'Unknown')}

Manglik Status: {'Yes' if kundli.get('manglik') else 'No'}

Beneficial Yogas: {', '.join(kundli.get('yogas', [])) if kundli.get('yogas') else 'None recorded'}
"""
        
        return summary.strip()
```

#### 3.2 Update Agent to Use Pinecone Data
**File:** `/src/vedic_astrology_agent.py`

**Changes needed:**

1. **Import Pinecone retriever:**
```python
from pinecone_kundli_retriever import KundliRetriever
```

2. **Initialize in `__init__`:**
```python
class VedicAstrologyAgent(Agent):
    def __init__(self, user_id: str = "default_user", publish_data_fn=None) -> None:
        self.user_id = user_id
        self.kundli_retriever = KundliRetriever()
        
        # Fetch user's chart data on initialization
        # This will be available throughout the session
        self.user_chart_summary = None
        
        super().__init__(
            instructions=self._get_instructions(),
        )
        self._publish_data_fn = publish_data_fn

    def _get_instructions(self) -> str:
        """Generate instructions with user's chart data embedded."""
        base_instructions = """You are a Vedic Astrology Master..."""
        
        # Will be populated after chart is fetched
        return base_instructions
```

3. **Fetch chart data in entrypoint:**
```python
async def entrypoint(ctx: JobContext):
    # ... existing code to extract user_id ...
    
    # Create assistant with userId
    assistant = VedicAstrologyAgent(user_id=user_id, publish_data_fn=_publish_data_bytes)
    
    # Fetch user's Kundli data from Pinecone
    try:
        assistant.user_chart_summary = await assistant.kundli_retriever.get_user_chart_summary(user_id)
        logger.info(f"✅ Loaded Kundli data for user {user_id}")
        
        # Update agent instructions with user's chart
        assistant.instructions = f"""{assistant.instructions}

🔮 USER'S PERSONAL CHART DATA (Use this to give personalized answers):
{assistant.user_chart_summary}

IMPORTANT: When answering questions, refer to the user's actual chart data above. 
For example:
- "Based on your chart, your Moon is in {extract_moon_sign()} in the {extract_moon_house()}th house..."
- "Currently you are in {extract_mahadasha()} Mahadasha with {extract_antardasha()} Antardasha..."
- "Your Lagna is {extract_lagna()}, which makes you..."
"""
    except Exception as e:
        logger.error(f"Failed to load Kundli data: {e}")
        assistant.user_chart_summary = "Chart data not available."
    
    # Create session with updated instructions
    session = AgentSession(...)
    session.agent = assistant
    
    # ... rest of entrypoint ...
```

---

### **Phase 4: Enhance Function Tools with Pinecone Data**

#### 4.1 Update `calculate_kundli` to Return Real Data
```python
@function_tool
async def calculate_kundli(
    self,
    context: RunContext,
) -> str:
    """Return user's actual Kundli from Pinecone (no input needed)."""
    
    logger.info(f"Fetching actual Kundli for user: {self.user_id}")
    
    kundli = await self.kundli_retriever.get_user_kundli(self.user_id)
    
    if not kundli:
        return "I don't have your birth chart data yet. Please provide your birth date, time, and place so I can calculate it."
    
    # Return natural language response from actual data
    return f"""Based on your birth chart:

📅 Birth Details: {kundli['birthDate']} at {kundli['birthTime']}, {kundli['birthPlace']}

🌙 Your Rashi (Moon Sign): {kundli['rashi']}
🔆 Your Lagna (Ascendant): {kundli['lagna']}
⭐ Your Nakshatra: {kundli['nakshatra']} (Pada {kundli['nakshatraPada']})

📊 Current Dasha:
- Mahadasha: {kundli['mahadasha']}
- Antardasha: {kundli['antardasha']}

🔮 Manglik Status: {'You have Manglik Dosha' if kundli['manglik'] else 'You do not have Manglik Dosha'}

✨ Beneficial Yogas: {', '.join(kundli.get('yogas', []))}

Would you like me to explain any specific aspect of your chart?"""
```

#### 4.2 Create New Tool: `get_planetary_position`
```python
@function_tool
async def get_planetary_position(
    self,
    context: RunContext,
    planet: str,
) -> str:
    """Get specific planet's position from user's chart.
    
    Args:
        planet: Planet name (e.g., "Sun", "Moon", "Mars", "Jupiter")
    """
    kundli = await self.kundli_retriever.get_user_kundli(self.user_id)
    
    if not kundli:
        return "I don't have your chart data."
    
    planet_lower = planet.lower()
    planet_data = kundli.get(planet_lower, {})
    
    if not planet_data:
        return f"I don't have {planet} data in your chart."
    
    sign = planet_data.get('sign', 'Unknown')
    house = planet_data.get('house', 'Unknown')
    degree = planet_data.get('degree', 'Unknown')
    
    return f"In your chart, {planet} is in {sign} sign, positioned in the {house}th house at {degree}° degrees."
```

---

### **Phase 5: Alternative Approach - LiveKit RAG Plugin**

LiveKit has a built-in RAG plugin that can be used for this. Here's the alternative approach:

#### 5.1 Using LiveKit's RAG Plugin
```python
from livekit.plugins import rag

# In entrypoint function:
async def entrypoint(ctx: JobContext):
    # ... extract user_id ...
    
    # Create RAG-enabled session with Pinecone
    rag_source = rag.PineconeRAGSource(
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        api_key=os.getenv("PINECONE_API_KEY"),
        environment=os.getenv("PINECONE_ENVIRONMENT"),
        filter={"userId": user_id},  # Filter by current user
        namespace=os.getenv("PINECONE_NAMESPACE", "")
    )
    
    # Create session with RAG
    session = AgentSession(
        stt=stt,
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=tts,
        rag=rag_source,  # Add RAG source
        turn_detection=turn_detector,
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )
    
    # LLM will automatically query Pinecone for relevant user data
```

**Benefits:**
- Automatic retrieval based on user query
- No manual fetching needed
- LiveKit handles context injection

**Trade-offs:**
- Less control over what data is retrieved
- Requires properly structured embeddings

---

## Recommended Approach

**Hybrid Approach:**
1. **Use Manual Retrieval (Phase 3)** for core chart data that should always be available
2. **Use LiveKit RAG Plugin (Phase 5)** for advanced queries with semantic search

**Why?**
- Core chart (Rashi, Lagna, Dasha) should ALWAYS be in context → Manual fetch at session start
- Advanced queries like "tell me about yogas in my chart" → RAG plugin searches embeddings
- Best of both worlds

---

## Implementation Steps

### **Step 1: Verify Pinecone Data**
**Action:** Please provide:
1. Pinecone index name
2. Sample metadata structure
3. Embedding dimension (if using embeddings)

### **Step 2: Environment Setup (15 mins)**
- Add Pinecone credentials to `.env.local`
- Install packages

### **Step 3: Create Retriever (30 mins)**
- Implement `pinecone_kundli_retriever.py`
- Test retrieval with a sample user

### **Step 4: Update Agent (45 mins)**
- Modify `vedic_astrology_agent.py`
- Add user_id parameter
- Fetch chart on session start
- Update instructions with chart data

### **Step 5: Test End-to-End (30 mins)**
- Login as user with chart in Pinecone
- Start Vedic Jyotish session
- Verify agent has access to personal chart
- Test personalized predictions

---

## Expected User Experience

**Before (Generic):**
```
User: "Tell me about my chart"
Agent: "To analyze your chart, I need your birth date, time, and place."
```

**After (Personalized with Pinecone):**
```
User: "Tell me about my chart"
Agent: "Based on your birth chart (Mumbai, May 15, 1990, 2:30 PM), 
your Moon is in Vrishabha (Taurus) in the 10th house, indicating 
strong career prospects and material stability. You're currently 
in Venus Mahadasha with Sun Antardasha, which is favorable for 
creative pursuits and recognition..."
```

---

## Security Considerations

1. **User Isolation:** Pinecone filter by `userId` ensures users only see their own data
2. **Token Metadata:** userId flows securely through LiveKit token
3. **No Cross-User Access:** Agent session is scoped to one user

---

## Next Steps

**Before I implement:**
1. Can you share your Pinecone index structure?
2. Confirm API keys are available
3. Should we use manual retrieval or LiveKit RAG plugin (or both)?

Let me know and I'll start implementation! 🚀

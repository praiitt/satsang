# Music Agent Lyrics Validation Layer - Implementation Plan

## Problem Statement

The music agent currently accepts any text as lyrics without validation. This leads to:
- Meaningless or incoherent lyrics being sent to Suno
- Lyrics not appropriate for the requested music style (bhajan, meditation, etc.)
- Poor structure (no verses, chorus, repetition)
- Random conversation text being treated as lyrics
- Waste of Suno API credits on invalid inputs

## Current Flow

```
User: "Create a Krishna bhajan"
Agent: [asks questions about style, instruments, mood, vocals, lyrics]
User: "asdf jkl random text here" [invalid lyrics]
Agent: ✅ "Shall I proceed?" 
User: "Yes"
Agent: 🎵 [Generates music with garbage lyrics] ❌
```

## Proposed Solution: AI-Powered Lyrics Validation Layer

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Music Agent Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Request → "Create Krishna bhajan"                      │
│  2. Agent Questions → Genre, Instruments, Mood, Vocals, Lyrics  │
│  3. User Provides Lyrics                                        │
│                    ↓                                             │
│  ┌──────────────────────────────────────────────────┐          │
│  │    NEW: LYRICS VALIDATION LAYER                  │          │
│  │  ┌──────────────────────────────────────┐        │          │
│  │  │  validate_lyrics() Function Tool     │        │          │
│  │  │  - Powered by GPT-4 via LLM call     │        │          │
│  │  │  - Checks meaning & coherence        │        │          │
│  │  │  - Validates style appropriateness   │        │          │
│  │  │  - Verifies poetic structure         │        │          │
│  │  │  - Suggests improvements if needed   │        │          │
│  │  └──────────────────────────────────────┘        │          │
│  └──────────────────────────────────────────────────┘          │
│                    ↓                                             │
│  4a. If INVALID → Agent asks user to revise                     │
│  4b. If VALID → Agent confirms & proceeds                       │
│                    ↓                                             │
│  5. generate_music() → Suno API                                 │
│  6. Music Created ✅                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Phase 1: Add Lyrics Validation Function Tool

**File:** `src/music_agent.py`

Add new function tool to `MusicAssistant` class:

```python
@function_tool
async def validate_lyrics(
    self,
    context: RunContext,
    lyrics: str,
    music_style: str,
    language: str = "Hindi"
) -> str:
    """
    Validate lyrics for quality, meaning, and appropriateness.
    
    Args:
        lyrics: The lyrics text to validate
        music_style: Type of music (e.g., "Krishna Bhajan", "Meditation", "Shiva Stotram")
        language: Language of lyrics (Hindi, Sanskrit, English)
    
    Returns:
        Validation result with feedback
    """
```

### Phase 2: Validation Criteria

The validation function will check:

#### 1. **Meaningfulness** ✓
- Are the lyrics coherent and meaningful?
- Do they form complete sentences/phrases?
- Not random words or gibberish

#### 2. **Style Appropriateness** ✓
- Do lyrics match the requested music style?
  - Bhajan: Devotional, mentions deity, spiritual themes
  - Meditation: Calming, peaceful, introspective
  - Stotram: Traditional verses, proper Sanskrit/Hindi structure
- Are they thematically consistent?

#### 3. **Poetic Structure** ✓
- Do they have verse structure?
- Presence of repetition (chorus, refrain)?
- Appropriate for singing?
- Rhyme scheme (if expected in that style)?

#### 4. **Language Quality** ✓
- Proper grammar in the specified language
- Traditional/spiritual vocabulary for devotional songs
- No inappropriate content

#### 5. **Length & Format** ✓
- Sufficient length (not just 1-2 words)
- Not excessively long (max ~500 words)
- Proper line breaks

### Phase 3: Validation Implementation

```python
async def validate_lyrics(self, context: RunContext, lyrics: str, music_style: str, language: str = "Hindi") -> str:
    # Prepare validation prompt for LLM
    validation_prompt = f"""
You are a professional lyricist and music critic specializing in spiritual and devotional music.

Analyze the following lyrics for a {music_style} in {language}:

--- LYRICS ---
{lyrics}
--- END LYRICS ---

Evaluate on these criteria:
1. MEANING: Are the lyrics meaningful and coherent? (Score 1-10)
2. STYLE: Do they fit a {music_style}? Are they devotional/spiritual? (Score 1-10)
3. STRUCTURE: Do they have proper verse structure, repetition, chorus? (Score 1-10)
4. LANGUAGE: Proper grammar and spiritual vocabulary? (Score 1-10)
5. LENGTH: Appropriate length (not too short or too long)? (Score 1-10)

Respond in JSON format:
{{
  "is_valid": true/false,
  "overall_score": <average of all scores>,
  "scores": {{
    "meaning": <1-10>,
    "style": <1-10>,
    "structure": <1-10>,
    "language": <1-10>,
    "length": <1-10>
  }},
  "feedback": "<Brief feedback about what's good or needs improvement>",
  "suggestions": "<If invalid, specific suggestions to improve>"
}}

Minimum acceptable overall_score: 7.0
If overall_score < 7.0, set is_valid to false.
"""
    
    # Call LLM for validation
    # Use the agent's LLM (GPT-4) to validate
    # Parse response and return feedback
    
    # Return user-friendly validation result
```

### Phase 4: Update Agent Instructions

**Current Instructions:**
```python
instructions = """
1. Deep Discovery
2. Construct & Confirm
3. Generate (Only after confirmation)
"""
```

**Updated Instructions:**
```python
instructions = """
1. Deep Discovery (gather details)

2. VALIDATE LYRICS (if not instrumental):
   - When user provides lyrics, ALWAYS call validate_lyrics() first
   - If validation fails, explain issues and ask user to revise
   - If validation passes, proceed to confirm

3. Construct & Confirm
   - Summarize all details including VALIDATED lyrics
   - Ask for final confirmation

4. Generate (Only after validation AND confirmation)
   - Call generate_music() ONLY if lyrics are validated
"""
```

### Phase 5: Conversation Flow Example

**Good Flow (Valid Lyrics):**
```
User: "Write a Krishna bhajan for me"
Agent: "What lyrics would you like?"
User: "Govinda Gopala, Radha Ramana
       Nanda ke lala, pyaare Krishna
       Murlidhar, Giridhari
       Hare Krishna, Hare Krishna"

Agent: [Calls validate_lyrics()]
↓ LLM validates: 
  - Meaningful: ✅ Traditional Krishna names
  - Style: ✅ Perfect for bhajan
  - Structure: ✅ Clear verses with repetition
  - Language: ✅ Proper Hindi devotional vocabulary
  - Length: ✅ Appropriate
  is_valid: true, score: 9.2

Agent: "Beautiful! These are meaningful Krishna bhajan lyrics with proper devotional structure. 
        Shall I proceed to create a slow devotional bhajan with these lyrics?"
User: "Yes"
Agent: [Generates music] ✅
```

**Error Flow (Invalid Lyrics):**
```
User: "Write a Krishna bhajan for me"
Agent: "What lyrics would you like?"
User: "asdf jkl random words here test test"

Agent: [Calls validate_lyrics()]
↓ LLM validates:
  - Meaningful: ❌ Random words, no coherence
  - Style: ❌ Not devotional
  - Structure: ❌ No structure
  - Language: ❌ Not proper Hindi
  - Length: ❌ Too short
  is_valid: false, score: 2.0

Agent: "I notice these lyrics don't have a clear devotional meaning or structure. 
        For a Krishna bhajan, the lyrics should mention Lord Krishna's names 
        (like Govinda, Gopala, Murlidhar) and express devotion.
        
        Would you like me to suggest some traditional Krishna bhajan lyrics, 
        or would you like to try writing your own devotional lyrics?"
User: "Suggest some"
Agent: [Provides examples] → User chooses → [Validates again] → Proceeds
```

## Implementation Steps

### Step 1: Create Validation Function
- [ ] Add `validate_lyrics()` function tool to `MusicAssistant`
- [ ] Implement LLM-based validation logic
- [ ] Create validation prompt template
- [ ] Parse and return structured feedback

### Step 2: Update Agent Instructions
- [ ] Modify `instructions` to mandate lyrics validation
- [ ] Update conversation flow to call validation before confirmation
- [ ] Add examples of good vs bad lyrics

### Step 3: Handle Validation Results
- [ ] If valid (score ≥ 7.0): Proceed to confirmation
- [ ] If invalid (score < 7.0): Ask user to revise with specific feedback
- [ ] Provide example lyrics if user needs help

### Step 4: Testing
- [ ] Test with valid devotional lyrics → Should pass validation
- [ ] Test with gibberish → Should fail and ask for revision
- [ ] Test with inappropriate content → Should fail
- [ ] Test with poor structure → Should ask for improvements

### Step 5: Optional Enhancements
- [ ] Add lyrics suggestion feature (agent can draft lyrics based on theme)
- [ ] Cache validated lyrics to avoid re-validation
- [ ] Support multiple languages (Hindi, Sanskrit, English)
- [ ] Add lyrics database of traditional bhajans/stotrams

## Edge Cases to Handle

1. **User insists on invalid lyrics:**
   - Agent should warn about poor quality but allow if user insists
   - Add disclaimer: "Proceeding with unvalidated lyrics may result in poor music quality"

2. **Instrumental tracks:**
   - Skip validation entirely (no lyrics needed)

3. **Very short lyrics (2-3 lines):**
   - For certain styles (mantra, chant), short is okay
   - Adjust validation criteria based on music_style

4. **Mixed language lyrics:**
   - Support Hindi-English mix (common in modern bhajans)
   - Validate each language portion separately

## Benefits

✅ **Quality Control:** Ensures only meaningful lyrics are sent to Suno  
✅ **Cost Savings:** Reduces wasted API calls on invalid content  
✅ **Better Music:** Higher quality output = happier users  
✅ **Educational:** Users learn what makes good devotional lyrics  
✅ **Professional:** Agent acts like a real music producer

## Success Metrics

- **Before:** 30-40% of generated music has poor/invalid lyrics
- **After Target:** <5% of generated music has quality issues
- **User Satisfaction:** Improved feedback on music quality
- **API Efficiency:** Reduced failed/poor quality generations

## Timeline

- **Phase 1 (Core Validation):** 2-3 hours
- **Phase 2 (Instructions Update):** 1 hour
- **Phase 3 (Testing):** 1-2 hours
- **Phase 4 (Refinement):** As needed

**Total Estimate:** 4-6 hours for complete implementation

## Files to Modify

1. `src/music_agent.py` - Add `validate_lyrics()` function tool
2. `src/music_agent.py` - Update `MusicAssistant` instructions
3. (Optional) Create `src/lyrics_validator.py` - Separate validation logic

## Next Steps

After review and approval:
1. Implement `validate_lyrics()` function
2. Update agent instructions
3. Test with various lyrics inputs
4. Deploy and monitor
5. Gather user feedback
6. Iterate on validation criteria

"""
Meditation Guidance Helper Module

Contains meditation phase guidance scripts and Gemini posture image generation
for the RRAASI Dance Meditation Agent.
"""

import logging
import os
from typing import Optional
import google.generativeai as genai

logger = logging.getLogger("meditation_guidance")

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class PostureGenerator:
    """Generate posture images using Gemini"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    async def generate_posture_image(self, posture_type: str, language: str = "en") -> Optional[bytes]:
        """
        Generate a meditation posture image using Gemini.
        
        Args:
            posture_type: Type of posture (grounding, swaying, heart_opening, cooldown, meditation)
            language: User language for potential text overlay
        
        Returns:
            Image bytes or None if generation fails
        """
        prompts = {
            "grounding": "Peaceful figure standing with feet hip-width apart, eyes gently closed, hands relaxed at sides, warm golden lighting, spiritual ambiance, soft focus background, meditative expression, grounded and centered",
            
            "swaying": "Serene figure gently swaying side to side, arms flowing naturally like water, peaceful facial expression, soft purple and pink ambient lighting, graceful movement, dance meditation pose",
            
            "heart_opening": "Figure with arms spread wide open, chest expanded, heart center glowing with golden light, radiant and joyful expression, cosmic background with soft stars, spiritual dance pose, love emanating",
            
            "cooldown": "Figure slowly transitioning to stillness, gentle swaying reducing, hands coming to heart center, peaceful smile, sunset colors, gratitude and completion energy, serene atmosphere",
            
            "meditation": "Figure seated in comfortable meditation pose, hands on heart or in lap, eyes closed, completely still, divine light surrounding, deep peace and inner silence, spiritual completion"
        }
        
        prompt = prompts.get(posture_type, prompts["meditation"])
        full_prompt = f"Create a simple, elegant illustration: {prompt}. Style: minimalist spiritual art, warm colors, no text, clean composition, suitable for meditation guidance."
        
        try:
            logger.info(f"Generating {posture_type} posture image...")
            
            # Generate image using Gemini
            response = self.model.generate_content(full_prompt)
            
            # Note: Gemini image generation would need proper setup
            # For now, this is a placeholder - actual implementation would use appropriate API
            logger.warning("Gemini image generation not fully implemented yet")
            return None
            
        except Exception as e:
            logger.error(f"Failed to generate posture image: {e}")
            return None


class MeditationGuidance:
    """Meditation phase guidance scripts in multiple languages"""
    
    # Phase 1: Grounding (2-3 minutes)
    GROUNDING = {
        "en": {
            "intro": "Stand comfortably, feet hip-width apart. Feel the earth beneath you, supporting you completely.",
            "breathing": "Close your eyes if comfortable. Let's take three deep breaths together...",
            "breath_cues": [
                "Breathe in deeply... and release with a sigh.",
                "Again... filling your body with  light...",
                "One more... feeling completely supported..."
            ],
            "transition": "Beautiful. Feel how the earth holds you."
        },
        "hi": {
            "intro": "आराम से खड़े हो जाएं, पैर कंधे की चौड़ाई पर। अपने नीचे पृथ्वी को महसूस करें।",
            "breathing": "यदि सहज हो तो आंखें बंद कर लें। तीन गहरी सांसें लेते हैं...",
            "breath_cues": [
                "गहरी सांस लें... और छोड़ें।",
                "फिर से... अपने शरीर को प्रकाश से भरें...",
                "एक बार और... पूर्ण रूप से सुरक्षित महसूस करें..."
            ],
            "transition": "सुंदर। महसूस करें कि पृथ्वी आपको कैसे थामे हुए है।"
        }
    }
    
    # Phase 2: Awakening (3-5 minutes)
    AWAKENING = {
        "en": {
            "intro": "Now, gently begin to sway from side to side. Feel your body waking up.",
            "guidance": "Let your arms flow naturally, like water. There's no right or wrong here.",
            "encouragement": "Just notice what feels good in your body. Trust your natural rhythm.",
            "deepening": "As the music builds, let the movement expand. Your body knows the way."
        },
        "hi": {
            "intro": "अब, धीरे से एक तरफ से दूसरी तरफ झूलना शुरू करें। अपने शरीर को जागते हुए महसूस करें।",
            "guidance": "अपनी भुजाओं को पानी की तरह प्रवाहित होने दें। यहां कोई सही या गलत नहीं है।",
            "encouragement": "बस ध्यान दें कि आपके शरीर को क्या अच्छा लगता है। अपनी प्राकृतिक लय पर भरोसा करें।",
            "deepening": "जैसे-जैसे संगीत बढ़ता है, आंदोलन को विस्तारित होने दें। आपका शरीर रास्ता जानता है।"
        }
    }
    
    # Phase 3: Heart Opening (5 minutes)
    HEART_OPENING = {
        "en": {
            "intro": "Notice the rhythm beginning to build. Lift your arms... open your chest...",
            "visualization": "Feel your heart expanding with each breath. Imagine light pouring from your heart center.",
            "invitation": "Dance from this place of love. Let your heart lead the way.",
            "affirmation": "You are love. You are light. You are free."
        },
        "hi": {
            "intro": "ध्यान दें कि लय बढ़ने लगी है। अपनी भुजाएं उठाएं... अपनी छाती खोलें...",
            "visualization": "प्रत्येक सांस के साथ अपने हृदय का विस्तार महसूस करें। कल्पना करें कि आपके हृदय केंद्र से प्रकाश बह रहा है।",
            "invitation": "प्रेम के इस स्थान से नृत्य करें। अपने हृदय को रास्ता दिखाने दें।",
            "affirmation": "आप प्रेम हैं। आप प्रकाश हैं। आप स्वतंत्र हैं।"
        }
    }
    
    # Phase 4: Free Dance (15-20 minutes) - Periodic cues
    FREE_DANCE_CUES = {
        "en": [
            "Let go completely. Be the music. Trust your body.",
            "Thoughts will come - let them pass like clouds. Return to the movement.",
            "Feel your heart leading the dance. You are exactly where you need to be.",
            "Shake off what no longer serves you. Each movement is a prayer.",
            "Dance like the universe is watching with love. You are divine.",
            "Your body knows the wisdom. Trust it more than your mind.",
            "Let each movement erase one worry. You are free."
        ],
        "hi": [
            "पूरी तरह से छोड़ दें। संगीत बन जाएं। अपने शरीर पर भरोसा करें।",
            "विचार आएंगे - उन्हें बादलों की तरह गुजर जाने दें। आंदोलन पर लौट आएं।",
            "महसूस करें कि आपका हृदय नृत्य का नेतृत्व कर रहा है। आप बिल्कुल वहीं हैं जहां आपको होना चाहिए।",
            "जो अब आपकी सेवा नहीं करता उसे झाड़ दें। प्रत्येक आंदोलन एक प्रार्थना है।",
            "ऐसे नृत्य करें जैसे ब्रह्मांड प्रेम से देख रहा हो। आप दिव्य हैं।",
            "आपका शरीर ज्ञान जानता है। अपने मन से ज्यादा इस पर भरोसा करें।",
            "प्रत्येक आंदोलन एक चिंता को मिटा दे। आप स्वतंत्र हैं।"
        ]
    }
    
    # Phase 5: Cool-down (3-5 minutes)
    COOLDOWN = {
        "en": {
            "transition": "Now, slowly, gently... start to soften your movements.",
            "slowing": "Let each motion become gentler. Like waves returning to calm.",
            "heart_center": "Bring your hands to your heart center. Feel the energy you've created.",
            "gratitude": "Breathe in gratitude. For this practice, for this moment, for yourself."
        },
        "hi": {
            "transition": "अब, धीरे-धीरे, कोमलता से... अपनी गतिविधियों को नरम करना शुरू करें।",
            "slowing": "प्रत्येक गति को कोमल होने दें। जैसे लहरें शांत हो रही हों।",
            "heart_center": "अपने हाथों को अपने हृदय केंद्र पर लाएं। जो ऊर्जा आपने बनाई है उसे महसूस करें।",
            "gratitude": "कृतज्ञता में सांस लें। इस अभ्यास के लिए, इस पल के लिए, स्वयं के लिए।"
        }
    }
    
    # Phase 6: Stillness (2-3 minutes)
    STILLNESS = {
        "en": {
            "invitation": "Come to complete stillness now. Just be. Just breathe.",
            "presence": "In this silence, you are whole. You are complete. You are enough.",
            "integration": "Feel how the practice has touched you. What has shifted? What has opened?",
            "closing": "You've danced your prayer. You are complete. Namaste.",
            "bow": "Take a moment to bow to yourself. To your practice. To the divine within."
        },
        "hi": {
            "invitation": "अब पूर्ण स्थिरता में आ जाएं। बस रहें। बस सांस लें।",
            "presence": "इस मौन में, आप पूर्ण हैं। आप परिपूर्ण हैं। आप पर्याप्त हैं।",
            "integration": "महसूस करें कि अभ्यास ने आपको कैसे छुआ है। क्या बदल गया है? क्या खुल गया है?",
            "closing": "आपने अपनी प्रार्थना का नृत्य किया है। आप पूर्ण हैं। नमस्ते।",
            "bow": "स्वयं को प्रणाम करने के लिए एक क्षण लें। अपने अभ्यास को। अपने भीतर के दिव्य को।"
        }
    }
    
    # Thought release techniques
    THOUGHT_RELEASE = {
        "en": [
            "Notice the thoughts. Let them pass like clouds.",
            "When you notice thinking, simply return to sensing.",
            "Let each movement shake off the mental chatter.",
            "Your body knows the way - trust it more than your mind.",
            "Imagine thoughts flowing out through your fingertips."
        ],
        "hi": [
            "विचारों को देखें। उन्हें बादलों की तरह गुजर जाने दें।",
            "जब आप सोच रहे हों, तो बस महसूस करने पर वापस आ जाएं।",
            "प्रत्येक आंदोलन मानसिक बकबक को झाड़ दे।",
            "आपका शरीर रास्ता जानता है - अपने मन से ज्यादा इस पर भरोसा करें।",
            "कल्पना करें कि विचार आपकी उंगलियों से बह रहे हैं।"
        ]
    }
    
    # Heart-centering cues
    HEART_CENTERING = {
        "en": [
            "Drop awareness into your heart space.",
            "Open your arms wide - open your heart to life.",
            "Dance FROM your heart, not from your head.",
            "Let love guide every movement.",
            "Feel warmth radiating from your chest.",
            "Your heart knows the way - follow it."
        ],
        "hi": [
            "अपने हृदय स्थान में जागरूकता लाएं।",
            "अपनी भुजाएं चौड़ी करें - अपने हृदय को जीवन के लिए खोलें।",
            "अपने हृदय से नृत्य करें, अपने सिर से नहीं।",
            "प्रेम को प्रत्येक गति का मार्गदर्शन करने दें।",
            "अपनी छाती से गर्मी निकलते हुए महसूस करें।",
            "आपका हृदय रास्ता जानता है - इसका अनुसरण करें।"
        ]
    }
    
    @classmethod
    def get_guidance(cls, phase: str, language: str = "en") -> dict:
        """Get guidance for a specific phase and language"""
        guidance_map = {
            "grounding": cls.GROUNDING,
            "awakening": cls.AWAKENING,
            "heart_opening": cls.HEART_OPENING,
            "cooldown": cls.COOLDOWN,
            "stillness": cls.STILLNESS
        }
        
        phase_guidance = guidance_map.get(phase, cls.GROUNDING)
        return phase_guidance.get(language, phase_guidance["en"])
    
    @classmethod
    def get_free_dance_cue(cls, index: int, language: str = "en") -> str:
        """Get a periodic cue for free dance phase"""
        cues = cls.FREE_DANCE_CUES.get(language, cls.FREE_DANCE_CUES["en"])
        return cues[index % len(cues)]
    
    @classmethod
    def get_thought_release(cls, index: int, language: str = "en") -> str:
        """Get a thought release technique"""
        techniques = cls.THOUGHT_RELEASE.get(language, cls.THOUGHT_RELEASE["en"])
        return techniques[index % len(techniques)]
    
    @classmethod
    def get_heart_centering(cls, index: int, language: str = "en") -> str:
        """Get a heart-centering cue"""
        cues = cls.HEART_CENTERING.get(language, cls.HEART_CENTERING["en"])
        return cues[index % len(cues)]

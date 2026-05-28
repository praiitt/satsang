/**
 * Spiritual Studio - Prompt Enhancement Utility
 * 
 * This service blends the user's base intention (e.g. "I want healing music")
 * with their deeper spiritual context (Astrology transits, Numerology, Tarot pulls)
 * to generate a hyper-personalized prompt for the AI Agents.
 */

export interface SpiritualContext {
    astrology?: {
        sunSign?: string;
        moonSign?: string;
        currentTransit?: string;
        dominantElement?: string;
    };
    numerology?: {
        lifePathNumber?: number;
        personalYear?: number;
    };
    tarot?: {
        recentCardPull?: string;
        cardMeaning?: string;
    };
}

/**
 * Enhances a user's raw prompt with their spiritual context to guide the AI.
 */
export function enhanceStudioPrompt(basePrompt: string, context: SpiritualContext, mediaType: 'music' | 'video' | 'art'): string {
    let enhancedPrompt = `User's Base Request: "${basePrompt}"\n\n`;
    
    enhancedPrompt += `--- SPIRITUAL CONTEXT ---\n`;
    
    if (context.astrology) {
        enhancedPrompt += `- Astrology: User is a ${context.astrology.sunSign || 'unknown'} Sun, ${context.astrology.moonSign || 'unknown'} Moon. `;
        if (context.astrology.currentTransit) {
            enhancedPrompt += `Current significant transit: ${context.astrology.currentTransit}. `;
        }
        enhancedPrompt += `\n`;
    }

    if (context.numerology) {
        enhancedPrompt += `- Numerology: Life Path ${context.numerology.lifePathNumber || 'unknown'}. `;
        if (context.numerology.personalYear) {
            enhancedPrompt += `They are in a Personal Year ${context.numerology.personalYear}. `;
        }
        enhancedPrompt += `\n`;
    }

    if (context.tarot?.recentCardPull) {
        enhancedPrompt += `- Tarot: Recently pulled the ${context.tarot.recentCardPull} card. (${context.tarot.cardMeaning || ''})\n`;
    }

    enhancedPrompt += `\n--- AI INSTRUCTIONS ---\n`;
    
    if (mediaType === 'music') {
        enhancedPrompt += `You are an AI Music Director in the Spiritual Studio. Based on the user's request and their current spiritual transits, suggest the exact musical frequencies, instruments (e.g. singing bowls, flutes, sitar), and tempo that will best balance their current energy. Then, proceed to generate this music.\n`;
    } else if (mediaType === 'video') {
        enhancedPrompt += `You are an AI Video Director in the Spiritual Studio. Based on the user's request and their spiritual context, draft a 15-second visual affirmation script. Choose imagery and colors that align with their astrological element and current numerological year. Then, proceed to generate this reel.\n`;
    } else if (mediaType === 'art') {
        enhancedPrompt += `You are an AI Art Director in the Spiritual Studio. Generate a high-quality, deeply aesthetic spiritual image. Use colors, symbols, and geometry that resonate with the user's sun sign and recent tarot themes. Provide the final image prompt to the Imagen-4 tool.\n`;
    }

    return enhancedPrompt;
}

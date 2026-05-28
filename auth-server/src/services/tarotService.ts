
import { Buffer } from 'buffer';

const ASTROLOGY_API_ENDPOINT = 'https://json.astrologyapi.com/v1/tarot_predictions';

interface TarotRequestData {
    love?: number;
    career?: number;
    finance?: number;
    [key: string]: number | undefined;
}

export async function getTarotPredictions(data: TarotRequestData, language: string = 'en') {
    const userId = process.env.ASTROLOGY_API_USER_ID;
    const apiKey = process.env.ASTROLOGY_API_KEY;

    if (!userId || !apiKey) {
        throw new Error('Missing Astrology API credentials (ASTROLOGY_API_USER_ID or ASTROLOGY_API_KEY)');
    }

    // json.astrologyapi.com uses Basic Auth (userId:apiKey)
    const auth = 'Basic ' + Buffer.from(`${userId}:${apiKey}`).toString('base64');

    // Normalise language to supported values
    const lang = language.toLowerCase().startsWith('hi') ? 'hi' : 'en';

    console.log('[TarotService] Calling astrologyapi.com tarot_predictions', { lang, data });

    try {
        const response = await fetch(ASTROLOGY_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                'Accept-Language': lang,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TarotService] API Error (${response.status}):`, errorText);
            throw new Error(`Tarot API failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('[TarotService] Tarot prediction received successfully');
        return result;
    } catch (error) {
        console.error('[TarotService] Error fetching tarot predictions:', error);
        throw error;
    }
}

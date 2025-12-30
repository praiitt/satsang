
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

    const auth = "Basic " + Buffer.from(userId + ":" + apiKey).toString("base64");

    try {
        const response = await fetch(ASTROLOGY_API_ENDPOINT, {
            method: 'POST',
            headers: {
                "authorization": auth,
                "Content-Type": 'application/json',
                "Accept-Language": language
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Tarot API Error (${response.status}):`, errorText);
            throw new Error(`Tarot API failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error fetching tarot predictions:", error);
        throw error;
    }
}

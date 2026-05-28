import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: 'A tiny cute cat',
            config: {
                numberOfImages: 1,
                aspectRatio: '9:16'
            }
        });
        console.log("Success! Generated image.");
    } catch (e) {
        console.error("Error generating image:", e.message);
    }
}
run();

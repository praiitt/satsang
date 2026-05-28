import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: 'A tiny cute cat',
            config: {
                numberOfImages: 1,
                aspectRatio: '9:16'
            }
        });
        console.log("Success! Generated image.");
        if (response.generatedImages && response.generatedImages.length > 0) {
            const img = response.generatedImages[0];
            if (img.image) {
                console.log("Has base64:", !!img.image.imageBytes);
                console.log("Byte length:", img.image.imageBytes.length);
            }
        }
    } catch (e) {
        console.error("Error generating image:", e.message);
    }
}
run();

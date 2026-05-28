import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
console.log(process.env.GEMINI_API_KEY ? "Key found" : "No key");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: 'A tiny cute cat',
            config: {
                numberOfImages: 1,
                aspectRatio: '9:16'
            }
        });
        console.log("Success! Generated image.");
        if (response.generatedImages && response.generatedImages.length > 0) {
            const img = response.generatedImages[0];
            console.log("Image object keys:", Object.keys(img));
            if (img.image) {
                console.log("img.image keys:", Object.keys(img.image));
                console.log("Has base64 imageBytes:", !!img.image.imageBytes);
            }
        }
    } catch (e) {
        console.error("Error generating image:", e);
    }
}
run();

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const res = await genAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: "A beautiful serene nature scene with divine light, spiritual",
        config: {
            numberOfImages: 1,
            aspectRatio: '9:16',
            outputMimeType: 'image/jpeg'
        }
    });
    console.log("SUCCESS imagen 4.0", !!res);
  } catch (err) {
    console.log("ERROR imagen 4.0", err.message);
  }
}
run();

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const response = await ai.models.list();
        for await (const model of response) {
            if (model.name.includes("image") || model.name.includes("gen") || model.name.includes("vision")) {
                console.log(model.name);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();

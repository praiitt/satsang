// Test Gemini image generation and GCS upload
import { generateAdImage } from './src/services/gemini.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root and marketing-server
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set model for test
process.env.GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

async function test() {
    console.log('🧪 Testing Gemini Image Generation...');
    try {
        const result = await generateAdImage(
            'A peaceful spiritual meditation scene with soft golden hour lighting, cinematic, high quality',
            'test-brief-id'
        );
        console.log('✅ Success! Image generated and uploaded to GCS.');
        console.log('🔗 URL:', result.imageUrl);
    } catch (err) {
        console.error('❌ Gemini Image Test Failed:', err.message);
    }
}

test();

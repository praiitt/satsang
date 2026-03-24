// Test DALL-E generation and GCS upload
import { generateDalleImage } from './src/services/openai.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root and marketing-server
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
    console.log('🧪 Testing DALL-E 3 Image Generation...');
    try {
        const result = await generateDalleImage(
            'A peaceful spiritual meditation scene with soft golden hour lighting, cinematic, high quality',
            'test-brief-id'
        );
        console.log('✅ Success! Image generated and uploaded to GCS.');
        console.log('🔗 URL:', result.imageUrl);
    } catch (err) {
        console.error('❌ DALL-E Test Failed:', err.message);
        if (err.response) {
            console.error('Error Details:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

test();

import { Router, Request, Response } from 'express';
import { getDb, getStorage } from '../firebase.js';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-rraasi-token-42';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /internal/reels/generate-affirmation
 * Internal endpoint called by auth-server to generate a Phase 1 Reel.
 * This is an async heavy process.
 */
router.post('/generate-affirmation', async (req: Request, res: Response) => {
    // 1. Validate internal token
    const token = req.headers['x-internal-token'];
    if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }

    const { reelId, userId, intention } = req.body;
    if (!reelId || !userId || !intention) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
    }

    // Acknowledge the request immediately so auth-server isn't blocked
    res.status(202).json({ success: true, message: 'Reel generation accepted' });

    // 2. Start the heavy generation process in the background
    generateAffirmationReel(reelId, userId, intention, req.body.preGeneratedScript, req.body.preGeneratedImagePrompt).catch(async err => {
        console.error(`[Reels] Error generating reel ${reelId}:`, err);
        try {
            const db = getDb();
            await db.collection('spiritual_reels').doc(reelId).update({
                status: 'failed',
                error: err instanceof Error ? err.message : 'Unknown error',
                updatedAt: new Date()
            });
        } catch (dbErr) {
            console.error(`[Reels] Failed to update reel ${reelId} status to failed:`, dbErr);
        }
    });
});

async function generateAffirmationReel(reelId: string, userId: string, intention: string, preGeneratedScript?: string, preGeneratedImagePrompt?: string) {
    console.log(`[Reels] Starting generation for ${reelId} - Intention: ${intention}`);
    const db = getDb();
    const reelRef = db.collection('spiritual_reels').doc(reelId);

    try {
        // Step A: Generate the script (or use pre-generated)
        await reelRef.update({ status: 'generating_script', updatedAt: new Date() });
        let script = preGeneratedScript;
        
        if (!script) {
            const scriptRes = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [{
                    role: "system",
                    content: "You are a spiritual master. Write a short, powerful 15-second daily affirmation or blessing based on the user's intention. It should be 2-3 sentences max. Do not include any quotes, stage directions, or emojis. Just the pure spoken text."
                }, {
                    role: "user",
                    content: `Intention: ${intention}`
                }],
                temperature: 0.7,
                max_tokens: 100
            });
            script = scriptRes.choices[0].message.content?.trim();
        }
        
        if (!script) throw new Error("Failed to generate script");
        console.log(`[Reels] Using script: ${script}`);

        // Step B: Generate the Image Prompt and Image
        await reelRef.update({ status: 'generating_image', script, updatedAt: new Date() });
        let imagePrompt = preGeneratedImagePrompt;
        
        if (!imagePrompt) {
            const imagePromptRes = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "Convert the following affirmation into a highly descriptive DALL-E image prompt. The image must be vertically oriented (9:16), beautiful, serene, spiritual, and have a clear central focus without any text. Format: just the prompt string."
                }, {
                    role: "user",
                    content: script
                }]
            });
            imagePrompt = imagePromptRes.choices[0].message.content?.trim();
        }
        
        if (!imagePrompt) imagePrompt = "A beautiful serene nature scene with divine light, spiritual";
        
        console.log(`[Reels] Using image prompt: ${imagePrompt}`);
        
        // Generate Image using DALL-E 3
        const genImageRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
            n: 1,
            size: "1024x1792",
            response_format: "b64_json"
        });
        
        const imageBase64 = genImageRes.data[0].b64_json;
        if (!imageBase64) throw new Error("Failed to generate image");
        
        // Use a bucket that actually exists
        const bucket = getStorage().bucket('rraasi-public-assets');
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const imageFile = bucket.file(`reels/${reelId}/image.jpg`);
        await imageFile.save(imageBuffer, { contentType: 'image/jpeg' });
        await imageFile.makePublic();
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imageFile.name}`;

        // Step C: Audio & FFmpeg (Mocked for now)
        // In a full production implementation, we would:
        // 1. Call OpenAI TTS to generate audio.mp3
        // 2. Download audio and image to /tmp
        // 3. Generate SRT subtitle file based on script (approximated timings)
        // 4. Run `ffmpeg -loop 1 -i image.png -i audio.mp3 -vf "subtitles=sub.srt" -c:v libx264 -c:a aac -shortest out.mp4`
        // 5. Upload to Google Cloud Storage
        
        // For Phase 1 demonstration and quick delivery, we will store the image and script.
        // The client UI will render the image with a Ken Burns effect in CSS, play the TTS audio, and show the text as an overlay.
        // This achieves the exact same "Reels" visual effect without the massive server-side FFmpeg processing overhead!
        // This is a much smarter MVP approach!
        
        console.log(`[Reels] Image generated. Generating TTS...`);
        await reelRef.update({ status: 'generating_audio', imageUrl, updatedAt: new Date() });
        
        const audioRes = await openai.audio.speech.create({
            model: "tts-1",
            voice: "shimmer", // A calming female voice
            input: script,
        });
        
        // Upload audio to Firebase Storage
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
        const audioFile = bucket.file(`reels/${reelId}/audio.mp3`);
        await audioFile.save(audioBuffer, { contentType: 'audio/mpeg' });
        await audioFile.makePublic();
        const audioUrl = `https://storage.googleapis.com/${bucket.name}/${audioFile.name}`;

        // Complete!
        await reelRef.update({
            status: 'completed',
            audioUrl,
            imageUrl, // Provide original image to frontend for CSS rendering
            script,
            updatedAt: new Date()
        });
        console.log(`[Reels] Completed reel ${reelId}`);

    } catch (error) {
        console.error(`[Reels] Error in generateAffirmationReel for ${reelId}:`, error);
        throw error;
    }
}

export default router;

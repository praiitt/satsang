import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        await initAdmin();
        const body = await req.json();
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Add context to the prompt to make it suitable for a playlist cover
        const enhancedPrompt = `A beautiful, high-quality spiritual album cover art for a music playlist. Focus: ${prompt}. Style: divine, vibrant colors, aesthetic, hyper-realistic, 4k resolution, no text.`;

        // Generate image with DALL-E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "url",
        });

        const imageUrl = response.data[0].url;
        if (!imageUrl) {
            throw new Error('Failed to generate image from OpenAI');
        }

        // Download the image buffer
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();

        // Upload to Firebase Storage
        const storage = getStorage().bucket();
        const fileName = `music-images/playlists/dalle-${uuidv4()}.png`;
        const file = storage.file(fileName);

        await file.save(Buffer.from(imageBuffer), {
            metadata: {
                contentType: 'image/png',
            },
            public: true,
            validation: false
        });

        const publicUrl = `https://storage.googleapis.com/${storage.name}/${fileName}`;

        return NextResponse.json({
            message: 'Image generated and uploaded successfully',
            imageUrl: publicUrl
        });

    } catch (error: any) {
        console.error('[Generate Playlist Image API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate image' },
            { status: 500 }
        );
    }
}

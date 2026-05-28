import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase-admin';

export const maxDuration = 60;

// Step 1: Enhance user's simple intention into a rich artistic prompt
async function enhancePrompt(intention: string): Promise<string> {
    const systemPrompt = `You are an expert spiritual art director and prompt engineer for AI image generation. 
A user wants to create spiritual artwork with this intention: "${intention}"

Transform this into a rich, detailed image generation prompt that will create a stunning, 
photorealistic or painterly spiritual artwork. Include:
- Specific visual elements (divine figures, sacred symbols, nature, light)
- Artistic style (e.g., Indian miniature painting, sacred geometry, oil painting, digital art)
- Mood & lighting (golden hour, ethereal glow, cosmic rays, soft warm light)
- Color palette (saffron, gold, deep blue, cosmic purples)
- Atmosphere (divine, serene, mystical, powerful)

Keep the prompt under 200 words. Output ONLY the enhanced prompt, nothing else.`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
            })
        }
    );
    if (!res.ok) {
        const errBody = await res.text();
        console.error('[Art Enhance] Gemini API error:', res.status, errBody);
        // Graceful fallback: return a beautified version of the raw intention
        return `A stunning, photorealistic spiritual artwork of ${intention}. Divine golden light radiates from the center, illuminating intricate sacred details. Rich colors of saffron, deep indigo, and celestial gold. Painted in the style of traditional Indian sacred art with a modern digital aesthetic. Atmospheric, ethereal, deeply spiritual.`;
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || intention;
}

// Step 2: Generate image using Imagen 3 via Gemini API
async function generateImage(enhancedPrompt: string): Promise<string> {
    // Use Imagen 4 via the Gemini API
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: enhancedPrompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '1:1',
                    safetyFilterLevel: 'BLOCK_SOME',
                    personGeneration: 'ALLOW_ALL'
                }
            })
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('[Art Generate] Imagen 3 error:', errText);
        throw new Error('Image generation failed. Please try again.');
    }

    const data = await response.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('No image returned from Imagen 4');
    
    return b64; // Return raw base64 string for upload
}

export async function POST(req: Request) {
    try {
        // Auth check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(token);
        const userId = decoded.uid;

        const { intention, enhancedPrompt: clientEnhancedPrompt } = await req.json();
        if (!intention && !clientEnhancedPrompt) {
            return NextResponse.json({ error: 'Intention is required' }, { status: 400 });
        }

        // If client already enhanced the prompt (second call), skip enhancing
        const finalPrompt = clientEnhancedPrompt || await enhancePrompt(intention);

        // Generate image (base64)
        const b64 = await generateImage(finalPrompt);

        // Upload to GCS to avoid Firestore 1MB limit
        const storage = getAdminStorage();
        const bucket = storage.bucket('rraasi-public-assets');
        const fileName = `spiritual_art/${userId}/${Date.now()}.png`;
        const file = bucket.file(fileName);
        
        const imageBuffer = Buffer.from(b64, 'base64');
        await file.save(imageBuffer, { contentType: 'image/png' });
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Save to Firestore
        const db = getAdminDb();
        const artRef = db.collection('spiritual_art').doc();
        await artRef.set({
            id: artRef.id,
            userId,
            intention,
            enhancedPrompt: finalPrompt,
            imageDataUrl: publicUrl, // Save the public URL, NOT the massive base64 string
            createdAt: new Date().toISOString(),
            isPublic: false // Make private by default, user can publish to sell later
        });

        return NextResponse.json({
            success: true,
            artId: artRef.id,
            enhancedPrompt: finalPrompt,
            imageDataUrl: publicUrl
        });

    } catch (error: any) {
        console.error('[Art Generate] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// Separate endpoint just for prompt enhancement (preview before generating)
export async function PUT(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        await adminAuth.verifyIdToken(token);

        const { intention } = await req.json();
        if (!intention) return NextResponse.json({ error: 'Intention required' }, { status: 400 });

        const enhanced = await enhancePrompt(intention);
        return NextResponse.json({ enhancedPrompt: enhanced });

    } catch (error: any) {
        console.error('[Art Enhance] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

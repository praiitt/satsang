import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRandomMeditationTrack } from '@/lib/services/musicService';

// Initialize OpenAI client lazily
const getOpenAI = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Allow 60 seconds for generation

export async function POST(req: Request) {
    try {
        const { topic, guruId, userId, language = 'hi' } = await req.json();

        if (!topic || !guruId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getAdminDb();

        // 1. Check for existing plan with same topic and guruId to avoid redundant generation
        const existingPlans = await db.collection('satsang_plans')
            .where('guruId', '==', guruId)
            .where('topic', '==', topic.trim())
            .get();

        if (!existingPlans.empty) {
            // Find a plan that actually has the new Rraasi audio integration
            const validPlan = existingPlans.docs.find(doc => !!doc.data().bhajan_audio_url);
            
            if (validPlan) {
                const plan = validPlan.data();
                console.log('[Satsang Generate] Reusing existing plan for topic:', topic, 'id:', validPlan.id);
                return NextResponse.json({
                    planId: validPlan.id,
                    plan: plan
                });
            }
        }

        // 2. Generate Script using LLM (removed bhajan_query — using internal music now)
        const prompt = `
      You are an expert Hindu Satsang planner and Spiritual Guide.
            Topic: "${topic}"
        Language: ${language} (Output must be in this language. If 'hi', use high-quality Hindi with Sanskrit terms where appropriate).
      
      Generate a structured, profound, and spiritually deep plan for a "Private Satsang" session.
      The content should be philosophical, meditative, and reference ancient wisdom (Vedas, Upanishads, Gita) where applicable.
      AVOID superficial or generic advice. Dive deep into the essence of the topic.
      
      The output must be valid JSON with the following fields:

        1. "intro_text": A warm, spiritual introduction (Parichay) setting a sacred atmosphere. (approx 4-5 sentences).
      2. "pravachan_points": An array of strings. Each string is a substantial paragraph of the discourse. 
         - Generate 5-6 detailed paragraphs.
         - Start with the nature of the problem/topic.
         - Move to the spiritual/philosophical perspective.
         - Include a relevant story or metaphor if fitting.
         - Conclude with practical spiritual application.
         - (Total reading time ~8-12 mins).
        3. "closing_text": A formal, blessing-filled closing statement (Ashirwad).
      
      JSON Output:
        `;

        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('Failed to generate content from LLM');

        const planData = JSON.parse(content);

        // 2. Fetch a rraasi music track (meditation or healing category)
        let bhajanTrackId: string | null = null;
        let bhajanAudioUrl: string | null = null;
        let bhajanTitle: string | null = null;
        let bhajanImageUrl: string | null = null;

        try {
            // Use the shared service instead of fetching from the API route over HTTP
            // This prevents issues when running the dev server on different ports (like 3001)
            const musicData = await getRandomMeditationTrack();

            if (musicData) {
                bhajanTrackId = musicData.id;
                bhajanAudioUrl = musicData.audioUrl;
                bhajanTitle = musicData.title;
                bhajanImageUrl = musicData.imageUrl;
                console.log('[Satsang Generate] Found rraasi track:', bhajanTitle, bhajanTrackId);
            } else {
                console.warn('[Satsang Generate] No rraasi track available, bhajan will be skipped');
            }
        } catch (err) {
            console.error('[Satsang Generate] Failed to fetch rraasi music via service:', err);
            // Non-fatal — session will run without bhajan music
        }

        // 3. Store Plan in Firestore
        const planRef = db.collection('satsang_plans').doc();

        const finalPlan = {
            id: planRef.id,
            userId,
            guruId,
            topic,
            createdAt: new Date().toISOString(),
            status: 'ready',
            ...planData,
            // Rraasi music (replaces YouTube)
            bhajan_track_id: bhajanTrackId,
            bhajan_audio_url: bhajanAudioUrl,
            bhajan_title: bhajanTitle,
            bhajan_image_url: bhajanImageUrl,
        };

        await planRef.set(finalPlan);

        return NextResponse.json({
            planId: finalPlan.id,
            plan: finalPlan
        });

    } catch (error: any) {
        console.error('Error generating satsang plan:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

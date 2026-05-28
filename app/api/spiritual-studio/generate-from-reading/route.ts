import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAdminDb } from '@/lib/firebase-admin';

const getOpenAI = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; 

export async function POST(req: Request) {
    try {
        const { readingType, language = 'en', userId } = await req.json();

        if (!readingType || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const openai = getOpenAI();
        const db = getAdminDb();
        
        let readingText = "";
        let typeName = "";

        if (readingType === 'astrology') {
            typeName = 'Vedic Astrology Reading';
            
            // 1. Try to find a recent Jyotish session first
            const jyotishSessions = await db.collection('conversation_stack')
                .where('userId', '==', userId)
                .where('roomName', '>=', 'VedicJyotishGuidance_')
                .where('roomName', '<=', 'VedicJyotishGuidance_\uf8ff')
                .orderBy('roomName', 'desc')
                .limit(1)
                .get();
                
            if (!jyotishSessions.empty) {
                const sessionData = jyotishSessions.docs[0].data();
                const summary = sessionData.overallSummary || sessionData.ai_analysis || "";
                if (summary) {
                    readingText = `Recent Vedic Astrology Consultation Summary: ${summary}. Please create a song based on the spiritual themes discussed in this reading.`;
                }
            }

            // 2. Fallback to user's birth data if no session found or summary is empty
            if (!readingText) {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const bd = userDoc.data()?.birthData;
                    if (bd) {
                        readingText = `User was born on ${bd.birthDate || bd.day + '/' + bd.month + '/' + bd.year} at ${bd.birthTime || bd.hour + ':' + bd.minute} in ${bd.place || 'Unknown location'}. Create a beautiful astrological themed song honoring their birth chart and planetary alignments.`;
                    }
                }
            }

            if (!readingText) {
                readingText = "User seeking cosmic alignment and astrological harmony. Create a song for planetary peace.";
            }
        } else if (readingType === 'tarot') {
            typeName = 'Tarot Card Reading';
            // Try to find a recent tarot session
            const tarotSessions = await db.collection('conversation_stack')
                .where('userId', '==', userId)
                .where('roomName', '>=', 'MysticTarotReading')
                .where('roomName', '<=', 'MysticTarotReading\uf8ff')
                .orderBy('roomName', 'desc')
                .limit(1)
                .get();
                
            if (!tarotSessions.empty) {
                const sessionData = tarotSessions.docs[0].data();
                const summary = sessionData.overallSummary || sessionData.ai_analysis || "";
                readingText = `Recent Tarot Session Summary: ${summary}. Please create a song based on this reading.`;
            }
            if (!readingText) {
                readingText = "User seeking mystic guidance and tarot wisdom. Create a song for inner clarity and divine intuition.";
            }
        } else {
            return NextResponse.json({ error: 'Invalid reading type' }, { status: 400 });
        }

        const prompt = `
        You are an expert Spiritual Music Director. The user has provided context from their recent ${typeName}.
        Your goal is to extract the core emotional state, ruling elements (e.g., planets or tarot suits), and the spiritual lesson from this reading, and translate it into a highly optimized music prompt and custom devotional lyrics.
        
        The reading context:
        "${readingText}"
        
        Language for lyrics: ${language === 'hi' ? 'Hindi' : 'English'}
        
        Respond in JSON format with these exact fields:
        1. "lyrics": Create highly professional, poetic, and profoundly meaningful spiritual lyrics that capture the essence of the reading. You MUST include explicit song structure tags like [Intro], [Verse], [Chorus], [Outro].
        2. "style_tags": A comma-separated list of musical styles and instruments. Include genres like "spiritual, devotional, ambient, Indian classical", along with mood-appropriate descriptors (e.g., "healing frequencies, singing bowls, peaceful, bansuri flute"). Ensure it fits the theme of the reading!
        3. "title": A beautiful and catchy title for this track (max 5 words).
        4. "story": A spiritual "Behind the Music" story (2 paragraphs) explaining how this track specifically reflects the user's cosmic or mystic reading.
        5. "healing_benefits": An array of 3-5 specific spiritual or emotional benefits one might experience from this track based on their reading.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('Failed to generate content from LLM');

        const musicData = JSON.parse(content);

        const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app';
        const callBackUrl = `${AUTH_SERVER_URL}/suno/callback?userId=${userId}`;
        
        let sunoResult;
        let sunoTaskId: string | null = null;
        let isFalFallback = false;

        try {
            const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
                },
                body: JSON.stringify({
                    prompt: musicData.lyrics,
                    tags: musicData.style_tags,
                    title: musicData.title,
                    instrumental: false,
                    model: 'V3_5',
                    customMode: true,
                    callBackUrl: callBackUrl
                })
            });
            
            sunoResult = await sunoResponse.json();

            if (!sunoResponse.ok) {
                console.error(`[Music Generate] Suno API HTTP error: ${sunoResponse.status}`, sunoResult);
                throw new Error("Suno returned non-200 status");
            }

            sunoTaskId =
                sunoResult?.data?.task_id ||
                sunoResult?.data?.taskId ||
                sunoResult?.data?.id ||
                sunoResult?.task_id ||
                sunoResult?.taskId ||
                (typeof sunoResult?.data === 'string' ? sunoResult.data : null) ||
                (Array.isArray(sunoResult?.data) && sunoResult.data.length > 0
                    ? (sunoResult.data[0]?.id || sunoResult.data[0]?.task_id || null)
                    : null) ||
                null;

        } catch (sunoErr) {
            console.error('[Music Generate] Suno request failed. Triggering fal.ai fallback...', sunoErr);
            isFalFallback = true;
            
            try {
                const falResponse = await fetch('https://queue.fal.run/fal-ai/stable-audio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Key ${process.env.FAL_KEY}`
                    },
                    body: JSON.stringify({
                        prompt: `${musicData.style_tags}. ${musicData.lyrics}`,
                        webhook_url: callBackUrl.replace('/suno/', '/fal/')
                    })
                });
                
                const falResult = await falResponse.json();
                sunoTaskId = falResult.request_id;
            } catch (falErr) {
                console.error('[Music Generate] Fal fallback completely failed:', falErr);
            }
        }

        if (!sunoTaskId) {
            throw new Error('Failed to get task ID from music generator providers');
        }

        // 3. Store in Firestore
        await db.collection('music_tracks').doc(sunoTaskId).set({
            id: sunoTaskId,
            userId: userId,
            provider: isFalFallback ? 'fal_fallback' : 'suno',
            title: musicData.title,
            lyrics: musicData.lyrics || '',
            tags: musicData.style_tags || '',
            story: musicData.story || '',
            healingBenefits: musicData.healing_benefits || [],
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            source: `reading_${readingType}`,
            isPublic: false
        });

        return NextResponse.json({
            success: true,
            taskId: sunoTaskId,
            metadata: musicData
        });

    } catch (error: any) {
        console.error('Error generating music from reading:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

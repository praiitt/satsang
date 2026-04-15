import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAdminDb } from '@/lib/firebase-admin';
import { getRandomMeditationTrack } from '@/lib/services/musicService';
import { ALL_GURUS } from '@/lib/gurus';

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

        const openai = getOpenAI();
        const db = getAdminDb();

        // 0. Translate topic to target language if necessary
        const translationPrompt = `Translate the following spiritually themed topic to the language "${language}". 
      If it is already in ${language}, return it as is. 
      If it is in a different script (like Romanized Hindi "kaise ho") but the target is Hindi, convert it to professional Devanagari Hindi.
      Topic: "${topic}"
      Return ONLY the translated/converted topic string without any quotations or extra punctuation.`;

        const translationCompletion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: translationPrompt }],
            model: 'gpt-4o',
        });
        const translatedTopic = translationCompletion.choices[0].message.content?.trim() || topic;
        console.log('[Satsang Generate] Translated topic:', topic, '->', translatedTopic);

        // 1. Check for existing plan with same topic and guruId to avoid redundant generation
        const existingPlans = await db.collection('satsang_plans')
            .where('guruId', '==', guruId)
            .where('topic', '==', translatedTopic.trim())
            .get();

        if (!existingPlans.empty) {
            // Find a plan that actually has content (either discourse points or meditation audio)
            const validPlan = existingPlans.docs.find(doc => {
                const data = doc.data();
                return !!data.pravachan_points || !!data.meditation_audio_url || !!data.bhajan_audio_url;
            });
            
            if (validPlan) {
                const plan = validPlan.data();
                console.log('[Satsang Generate] Reusing existing plan for topic:', translatedTopic, 'id:', validPlan.id);
                return NextResponse.json({
                    planId: validPlan.id,
                    plan: plan
                });
            }
        }

        const guru = ALL_GURUS.find(g => g.id === guruId);
        const guruName = guru?.name || 'Spiritual Master';
        const guruTradition = guru?.tradition || 'Eastern Philosophy';

        // 2. Generate Script using LLM
        const prompt = `
      You are the architect of a discourse for ${guruName}, a renowned master of ${guruTradition}.
      The Satsang must perfectly reflect the distinct tone, vocabulary, philosophical style, and teachings of ${guruName}.
      - DO NOT use generic Hindu text unless appropriate for this specific master.
      - If ${guruName} is known for specific concepts (like self-inquiry, radical Zen, devotion, integral yoga, etc.), use them heavily.
      - The linguistic style and phrasing must match how ${guruName} actually spoke.

      Topic: "${translatedTopic}"
      Language: ${language} (Output must be in this language. Match the guru's authentic tone exactly).
      
      Generate a structured, profound, and spiritually deep plan for a "Private Satsang" session led by ${guruName}.
      
      The output must be valid JSON with the following fields:

      1. "intro_text": A warm, characteristic, and deeply engaging introduction by ${guruName}. Keep it brief (2-3 sentences max). CRITICAL INSTRUCTION: You MUST write ONLY statements and blessings. You MUST NOT use any question marks (?). NEVER ask if the seeker is ready. NEVER ask for permission to begin. Just state the opening thought and conclude the intro with a full stop or exclamation mark.
      2. "pravachan_points": An array of strings. Each string is a substantial, high-quality paragraph of the discourse. 
         - Generate 7-10 detailed, spiritually profound paragraphs.
         - Address the topic exclusively through the lens of ${guruName}.
         - Include specific stories, metaphors, or famous quotes associated with ${guruName} to make it authentic.
         - Ensure each paragraph is long enough to provide deep insight (minimum 4-5 sentences each).
         - Conclude the entire array with practical spiritual application in their style.
      3. "closing_text": A final blessing or provocative closing thought typical of ${guruName}.
      
      JSON Output:
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('Failed to generate content from LLM');

        const planData = JSON.parse(content);
        
        // Prepare Document Reference early so we can pass its ID to Suno Callback
        const planRef = db.collection('satsang_plans').doc();

        // 2. Fetch a rraasi music track (meditation or healing category)
        let meditationTrackId: string | null = null;
        let meditationAudioUrl: string | null = null;
        let meditationTitle: string | null = null;
        let meditationImageUrl: string | null = null;

        try {
            // Use the shared service instead of fetching from the API route over HTTP
            // This prevents issues when running the dev server on different ports (like 3001)
            const musicData = await getRandomMeditationTrack(translatedTopic);

            if (musicData) {
                meditationTrackId = musicData.id;
                meditationAudioUrl = musicData.audioUrl;
                meditationTitle = musicData.title;
                meditationImageUrl = musicData.imageUrl;
                console.log('[Satsang Generate] Found rraasi track:', meditationTitle, meditationTrackId);
            } else {
                console.warn('[Satsang Generate] No rraasi track available, meditation will be skipped');
            }
        } catch (err) {
            console.error('[Satsang Generate] Failed to fetch rraasi music via service:', err);
            // Non-fatal — session will run without meditation music
        }

        // 2.5 LRYICS CREATOR AGENT & SUNO INTEGRATION (FIRE AND FORGET)
        const triggerSunoAsync = async (planId: string) => {
            try {
                const lyricsPrompt = `Based on the following Satsang discourse regarding "${translatedTopic}", create the foundation for a deeply meditative 4 to 5-minute chakra meditation track.
Respond in JSON format with these exact fields:
1. "lyrics": Create highly professional, poetic, and profoundly meaningful lyrics or a guided meditation script in ${language}. Ensure the words carry deep emotional resonance, spiritual weight, and perfectly capture the crux of the discourse. You MUST include explicit song structure tags like [Intro], [Visualization], [Mantra], [Deepening], [Outro]. Provide enough content to sustain a 4-5 minute meditation.
2. "style_tags": A comma-separated list of musical styles and instruments. You MUST include exactly: "chakra meditation, chakra songs", followed by mood-appropriate descriptors (e.g., "chakra meditation, chakra songs, healing frequencies, singing bowls, peaceful").
3. "story": A spiritual, evocative "Behind the Music" story (2-3 paragraphs) explaining the significance of this track and its connection to ${guruName}'s teachings on this topic.
4. "healing_benefits": An array of 4-6 specific spiritual or emotional benefits one might experience while listening.

Discourse outline:
${planData.pravachan_points?.join('\\n')}
`;
                
                const lyricsCompletion = await openai.chat.completions.create({
                    messages: [{ role: 'system', content: lyricsPrompt }],
                    model: 'gpt-4o',
                    response_format: { type: 'json_object' },
                });
                
                const lyricsContent = lyricsCompletion.choices[0].message.content;
                if (lyricsContent) {
                    const lyricsData = JSON.parse(lyricsContent);
                    if (lyricsData.lyrics && lyricsData.style_tags) {
                        console.log('[Satsang Generate] Generated lyrics and tags:', lyricsData.style_tags);
                        
                        // Trigger Suno API
                        // Use auth-server callback (same as music agent) so track goes into music_tracks (My Music)
                        const AUTH_SERVER_URL = 'https://satsang-auth-server-6ougd45dya-el.a.run.app';
                        const callBackUrl = `${AUTH_SERVER_URL}/suno/callback?userId=${userId}`;
                        
                        const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
                            },
                            body: JSON.stringify({
                                prompt: lyricsData.lyrics,
                                tags: lyricsData.style_tags,
                                title: `Satsang Meditation: ${translatedTopic}`,
                                instrumental: false,
                                model: 'V3_5',
                                customMode: true,
                                callBackUrl: callBackUrl
                            })
                        });
                        
                        const sunoResult = await sunoResponse.json();
                        let sunoTaskId: string | null = null;

                        // Log the full Suno API response for debugging
                        console.log(`[Satsang Generate] Suno API HTTP status: ${sunoResponse.status}`);
                        console.log(`[Satsang Generate] Suno API response: ${JSON.stringify(sunoResult)}`);

                        if (!sunoResponse.ok) {
                            console.error(`[Satsang Generate] Suno API HTTP error: ${sunoResponse.status}`, sunoResult);
                        } else {
                            // Grab task ID from various possible Suno API response formats
                            // Format 1: { code: 200, data: { task_id: "..." } }  (current sunoapi.org)
                            // Format 2: { data: { taskId: "..." } }
                            // Format 3: { data: "task_id_string" }
                            // Format 4: { data: [{ id: "..." }] }
                            // Format 5: { task_id: "..." } (top-level)
                            // Format 6: { taskId: "..." } (top-level)
                            // Format 7: { data: { id: "..." } }
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
                        }

                        console.log(`[Satsang Generate] Extracted Suno task ID: ${sunoTaskId}`);
                        
                        if (sunoTaskId) {
                            await db.collection('satsang_plans').doc(planId).update({
                                suno_task_id: sunoTaskId
                            });
                            
                            // Immedately push a PENDING track so frontend polling catches it 
                            // and Doesn't think the session ended without music.
                            await db.collection('music_tracks').doc(sunoTaskId).set({
                                id: sunoTaskId,
                                userId: userId,
                                title: `Satsang Meditation: ${translatedTopic}`,
                                lyrics: lyricsData.lyrics || '',
                                tags: lyricsData.style_tags || '',
                                story: lyricsData.story || '',
                                healingBenefits: lyricsData.healing_benefits || [],
                                status: 'PENDING',
                                createdAt: new Date().toISOString(),
                                source: 'private_satsang',
                                isPublic: false
                            });
                        }
                    }
                }
            } catch (sunoErr) {
                console.error('[Satsang Generate] Error in Lyrics Creator / Suno background integration:', sunoErr);
            }
        };

        // Fire and forget
        triggerSunoAsync(planRef.id).catch(console.error);

        // 3. Store Plan in Firestore
        const finalPlan = {
            id: planRef.id,
            userId,
            guruId,
            topic: translatedTopic,
            createdAt: new Date().toISOString(),
            status: 'ready',
            ...planData,
            // Rraasi music (replaces YouTube)
            meditation_track_id: meditationTrackId,
            meditation_audio_url: meditationAudioUrl,
            meditation_title: meditationTitle,
            meditation_image_url: meditationImageUrl,
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

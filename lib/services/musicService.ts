import { getAdminDb } from '@/lib/firebase-admin';
import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function getRandomMeditationTrack(topic?: string) {
    const db = getAdminDb();
    const openai = getOpenAI();

    try {
        // Fetch up to 100 recent tracks that are published and have some healing benefits
        // Since Firestore requires a compound index for != null, we might just fetch recent COMPLETED tracks and filter in memory.
        const snapshot = await db.collection('music_tracks')
            .where('status', '==', 'COMPLETED')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const candidates: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Stricter filtering for healingBenefits presence
            if (data.healingBenefits && (data.audioUrl || (data.tracks && data.tracks.length > 0))) {
                candidates.push({
                    id: doc.id,
                    title: data.title || 'Bhajan',
                    healingBenefits: Array.isArray(data.healingBenefits) ? data.healingBenefits.join(', ') : data.healingBenefits,
                    audioUrl: data.audioUrl || data.tracks?.[0]?.audioUrl,
                    imageUrl: data.imageUrl || null,
                    tags: data.tags || []
                });
            }
        });

        if (candidates.length === 0) {
            console.warn('[musicService] No healing tracks found, returning fallback');
            return null;
        }

        let selectedTrack = candidates[Math.floor(Math.random() * candidates.length)];

        // Use AI (Agent) to select the most relevant track if a topic is provided
        if (topic && candidates.length > 1) {
            try {
                // Prepare a simplified context for the LLM to save tokens
                const choices = candidates.map(c => ({ id: c.id, title: c.title, benefits: c.healingBenefits }));
                
                const prompt = `You are a spiritual music curator for a Private Satsang.
The current Satsang topic is: "${topic}".
Here are the available healing tracks:
${JSON.stringify(choices, null, 2)}

Select the SINGLE best track ID that aligns with the topic's emotional and spiritual needs.
Return ONLY a JSON object: {"selectedId": "the-id-here"}`;

                const aiResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'system', content: prompt }],
                    temperature: 0.3,
                    response_format: { type: 'json_object' }
                });

                const aiContent = aiResponse.choices[0].message.content;
                if (aiContent) {
                    const parsed = JSON.parse(aiContent);
                    if (parsed.selectedId) {
                        const match = candidates.find(c => c.id === parsed.selectedId);
                        if (match) selectedTrack = match;
                        console.log(`[musicService] AI selected track ${selectedTrack.title} for topic "${topic}"`);
                    }
                }
            } catch (aiErr) {
                console.warn('[musicService] AI selection failed, falling back to random:', aiErr);
            }
        }

        return {
            id: selectedTrack.id,
            title: selectedTrack.title,
            audioUrl: selectedTrack.audioUrl,
            imageUrl: selectedTrack.imageUrl,
            category: selectedTrack.tags?.[0] || 'meditation',
            duration: null,
        };
    } catch (error) {
        console.error('[musicService] Error in getRandomMeditationTrack:', error);
        return null;
    }
}

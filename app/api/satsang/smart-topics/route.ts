import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const getOpenAI = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const guruId = searchParams.get('guruId');
        const userId = searchParams.get('userId'); // Optional, but used for personalization
        const language = searchParams.get('language') || 'hi';

        if (!guruId) {
            return NextResponse.json({ error: 'Missing guruId' }, { status: 400 });
        }

        const db = getAdminDb();
        const openai = getOpenAI();
        let pastContext = '';

        // If we have a userId, fetch their last 5 topics to provide to the AI
        if (userId) {
            const historySnapshot = await db.collection('satsang_plans')
                .where('guruId', '==', guruId)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            const pastTopics: string[] = [];
            historySnapshot.forEach(doc => {
                if (doc.data().topic) pastTopics.push(doc.data().topic);
            });

            if (pastTopics.length > 0) {
                pastContext = `The user recently explored these topics: ${pastTopics.join(', ')}. Please suggest WIDER, DEEPER, and DIFFERENT spiritual/philosophical topics that build upon this foundation, pushing them to newer perspectives. Do not repeat these exact topics.`;
            } else {
                pastContext = 'The user is new. Suggest profound, welcoming, and fundamental spiritual topics.';
            }
        }

        const systemPromptSafe = `You are a wise spiritual assistant orchestrating a Private Satsang. 
Your goal is to suggest exactly 5 short, profound, and highly engaging spiritual/philosophical topics for the user to explore today.
The topics should be deep, therapeutic, and universally profound.
${pastContext}

Provide the output in ${language === 'hi' ? 'Hindi' : 'English'}.
Return ONLY a JSON object with a single key "topics" containing an array of 5 strings.
Example: {"topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]}`;

        const safeResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: systemPromptSafe }],
            temperature: 0.8,
            max_tokens: 250,
            response_format: { type: 'json_object' }
        });

        const content = safeResponse.choices[0].message.content || '{"topics":[]}';
        const parsed = JSON.parse(content);
        
        let aiTopics = parsed.topics || [];
        if (!Array.isArray(aiTopics)) aiTopics = [];

        // Map them to the expected frontend format: { topic: string, planId?: null }
        // We do not have planIds for generated topics yet, they will be generated on click.
        const distinctTopics = aiTopics.slice(0, 5).map((topic: string) => ({
            topic: topic.trim(),
            planId: null
        }));

        // If AI fails, fallback to hardcoded
        if (distinctTopics.length === 0) {
            distinctTopics.push({ topic: language === 'hi' ? 'भक्ति और मुक्ति' : 'Devotion and Liberation', planId: null });
            distinctTopics.push({ topic: language === 'hi' ? 'आंतरिक शांति' : 'Inner Peace', planId: null });
        }

        return NextResponse.json({ topics: distinctTopics });

    } catch (error: any) {
        console.error('Error fetching smart satsang topics:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

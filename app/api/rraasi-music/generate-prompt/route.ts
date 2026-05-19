import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { theme, keywords, language } = body;

        if (!theme || !keywords) {
            return NextResponse.json(
                { error: 'Theme and keywords are required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('[generate-prompt] OPENAI_API_KEY is missing');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey });

        const languageInstruction = language === 'hi' 
            ? '\n\nIMPORTANT: You MUST generate the final output prompt entirely in Hindi (हिंदी).'
            : '\n\nIMPORTANT: You MUST generate the final output prompt entirely in English.';

        const systemPrompt = `You are an expert AI prompt engineer specializing in Suno AI music generation for spiritual, healing, and devotional tracks.
Your task is to take the user's short idea or keywords and expand them into a highly detailed, rich, and Suno-compliant prompt.
A perfect Suno prompt is around 3-4 sentences and explicitly describes:
- The musical genre, tempo, and rhythm.
- The specific lead and background instruments (e.g., bansuri, tabla, deep synth drone, crystal bowls).
- The mood, atmosphere, and emotional scene (e.g., a serene Himalayan morning, deep trance state, echoing temple).
- The vocal style if applicable (e.g., ethereal chanting, deep male vocals, no vocals/instrumental).

IMPORTANT: Do NOT include any conversational filler (like "Here is your prompt:"). Output ONLY the final, raw prompt.${languageInstruction}`;

        const userPrompt = `Theme: ${theme}\nKeywords: ${keywords}\nOutput:`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        let generatedPrompt = response.choices[0]?.message?.content;

        if (!generatedPrompt) {
            throw new Error('No content generated from OpenAI');
        }

        // Clean up any potential markdown or prefixes
        generatedPrompt = generatedPrompt.replace(/^Output:\s*/i, '').trim();
        generatedPrompt = generatedPrompt.replace(/^"|"$/g, '').trim();

        return NextResponse.json({ prompt: generatedPrompt });

    } catch (error: any) {
        console.error('[generate-prompt] Error generating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to generate prompt. Please try again or write your own.' },
            { status: 500 }
        );
    }
}

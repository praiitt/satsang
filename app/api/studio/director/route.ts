import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { enhanceStudioPrompt } from '@/lib/services/studio-prompts';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { intention, mode, language, spiritualContext } = body;

        if (!intention || !mode) {
            return NextResponse.json(
                { error: 'Intention and mode are required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey });
        
        // 1. Build the system prompt using the existing service
        const systemPrompt = enhanceStudioPrompt(intention, spiritualContext || {}, mode);

        // 2. Add mode-specific format instructions
        let formatInstruction = '';
        const languageInstruction = language === 'hi' 
            ? 'IMPORTANT: You MUST generate the final output entirely in Hindi (हिंदी) (except for JSON keys which must remain in English).'
            : 'IMPORTANT: You MUST generate the final output entirely in English.';

        if (mode === 'music') {
            formatInstruction = `Output ONLY the final, raw prompt for Suno AI (3-4 sentences describing genre, tempo, instruments, mood, vocal style). Do not include conversational filler.\n\n${languageInstruction}`;
        } else if (mode === 'art') {
            formatInstruction = `Output ONLY the final, raw prompt for Imagen-4 (highly descriptive visual details, lighting, medium, colors, style). Do not include conversational filler.\n\n${languageInstruction}`;
        } else if (mode === 'reels') {
            formatInstruction = `You must return ONLY a JSON object with exactly two keys:
1. "script": A 15-second spoken affirmation (2-3 sentences max). Pure spoken text, no quotes or stage directions.
2. "imagePrompt": A highly descriptive, cinematic DALL-E/Imagen visual prompt (vertical 9:16) that perfectly matches the script.

Return ONLY valid JSON. Do not use markdown blocks.\n\n${languageInstruction}`;
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: formatInstruction }
            ],
            temperature: 0.7,
            response_format: mode === 'reels' ? { type: 'json_object' } : { type: 'text' }
        });

        const generatedContent = response.choices[0]?.message?.content;

        if (!generatedContent) {
            throw new Error('No content generated from OpenAI');
        }

        if (mode === 'reels') {
            const parsed = JSON.parse(generatedContent);
            return NextResponse.json(parsed);
        } else {
            // Clean up any potential markdown or prefixes
            let cleaned = generatedContent.replace(/^Output:\s*/i, '').trim();
            cleaned = cleaned.replace(/^"|"$/g, '').trim();
            return NextResponse.json({ prompt: cleaned });
        }

    } catch (error: any) {
        console.error('[studio-director] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate prompt. Please try again or write your own.' },
            { status: 500 }
        );
    }
}

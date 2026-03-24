import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const roomName = searchParams.get('roomName');
    const guruId = searchParams.get('guruId') || 'the Guru';

    if (!roomName) {
        return NextResponse.json({ error: 'Missing roomName' }, { status: 400 });
    }

    try {
        const db = getAdminDb();
        const docRef = db.collection('session_transcripts').doc(roomName);
        const doc = await docRef.get();

        if (!doc.exists) {
            // Transcript might take a few seconds to save after disconnect
            return NextResponse.json({ summary: null, pending: true });
        }

        const data = doc.data() as any;
        
        // If we already generated the prasad, return it
        if (data.prasadSummary) {
            return NextResponse.json({ summary: data.prasadSummary, pending: false });
        }

        const transcript: {role: string, content: string}[] = data.transcript || [];
        if (transcript.length === 0) {
            return NextResponse.json({ summary: null, pending: false });
        }

        // Format transcript for the prompt
        let transcriptText = '';
        for (const msg of transcript) {
            if (msg.content) {
                transcriptText += `${msg.role.toUpperCase()}: ${msg.content}\n`;
            }
        }

        const prompt = `You are a spiritual summarizer. Based on the following transcript between a seeker (user) and ${guruId} (assistant), generate a concise "Prasad" (Spiritual Gift) which is a short, beautiful 2-3 sentence summary of the core lesson or advice given to the seeker today. Do not use generic greetings. Write directly to the seeker. Be extremely poetic, profound, and brief. Return ONLY the text.

TRANSCRIPT:
${transcriptText.length > 3000 ? transcriptText.slice(-3000) : transcriptText}
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            temperature: 0.7,
        });

        const summary = response.choices[0].message?.content?.trim() || "Hold the silence of today's teachings in your heart.";

        // Save back to DB to cache it
        await docRef.update({ prasadSummary: summary });

        return NextResponse.json({ summary, pending: false });

    } catch (error) {
        console.error('[satsang/summary] Error generating prasad:', error);
        return NextResponse.json({ error: 'Failed to generate prasad' }, { status: 500 });
    }
}

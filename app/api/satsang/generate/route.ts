import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebase-admin';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

export const maxDuration = 60; // Allow 60 seconds for generation

export async function POST(req: Request) {
    try {
        const { topic, guruId, userId, language = 'hi' } = await req.json();

        if (!topic || !guruId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Generate Script and Bhajan Query using LLM
        const prompt = `
      You are an expert Hindu Satsang planner.
      Topic: "${topic}"
      Language: ${language} (Output must be in this language, primarily Hindi/Sanskrit if 'hi').
      
      Generate a structured plan for a "Private Satsang" session.
      The output must be valid JSON with the following fields:
      
      1. "intro_text": A warm, spiritual introduction (Parichay) regarding the topic. (approx 4-5 sentences).
      2. "bhajan_query": A specific YouTube search query for a popular, high-quality bhajan related to the topic. Do not use generic terms like "bhajan". Use specific artist names if known (e.g., "Jagjit Singh", "Anup Jalota") or specific famous tracks.
      3. "pravachan_points": An array of strings. Each string is a paragraph of the discourse. Generate about 4-5 substantial paragraphs that cover the topic deeply. (Total reading time ~5-10 mins).
      4. "closing_text": A brief, inspiring closing statement invoking blessings.

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

        // 2. Search for Bhajan on YouTube
        let bhajanVideoId = null;
        let bhajanTitle = null;

        if (planData.bhajan_query) {
            try {
                const searchRes = await youtube.search.list({
                    part: ['snippet'],
                    q: planData.bhajan_query,
                    maxResults: 1,
                    type: ['video'],
                    videoEmbeddable: 'true',
                });

                const items = searchRes.data.items;
                if (items && items.length > 0) {
                    bhajanVideoId = items[0].id?.videoId;
                    bhajanTitle = items[0].snippet?.title;
                }
            } catch (err) {
                console.error('YouTube Search Error:', err);
                // Fallback or ignore, plan will have null bhajan
            }
        }

        // 3. Store Plan in Firestore
        const db = getAdminDb();
        const planRef = db.collection('satsang_plans').doc();

        // Add audio/speech markers if needed, strictly text for now
        const finalPlan = {
            id: planRef.id,
            userId,
            guruId,
            topic,
            createdAt: new Date().toISOString(),
            status: 'ready',
            ...planData,
            bhajan_video_id: bhajanVideoId,
            bhajan_title: bhajanTitle,
        };

        await planRef.set(finalPlan);

        return NextResponse.json({ planId: finalPlan.id });

    } catch (error: any) {
        console.error('Error generating satsang plan:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

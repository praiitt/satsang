import OpenAI from 'openai';
import { getDb } from '../firebase.js';
import { generateSunoTrack } from './suno.js';

const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required');
    return new OpenAI({ apiKey });
};


export async function generateWhatsAppReply(sender: string, text: string): Promise<string> {
    const systemPrompt = `
You are "RRAASI AI", a wise and compassionate spiritual assistant for the Rraasi platform.
Your goal is to help users with their spiritual journey, meditation, and understanding of the spiritual dimension.

[BRAND CONTEXT]
- RRAASI helps users experience their spiritual dimension through focused attention.
- We offer Satsang (voice chat with gurus), AI Spiritual Music, Tarot, and Vedic Jyotish.
- Website: https://rraasi.com

[PERSONALITY]
- Tone: Wise, calm, authentic, and modern.
- Language: DETECT the user's input language (English, Hindi, or Hinglish) and REPLY in that SAME language only.
- Avoid: Generic "wellness" clichés, pushy sales tactics, or speaking like a robot.

[CONSTRAINTS]
- Keep replies concise (suitable for WhatsApp).
- If the user asks for a service, guide them to the appropriate section of rraasi.com.
- If you don't know the answer, politely suggest they join a Live Satsang on the app.
`;

    try {
        console.log(`[WhatsAppBot] Generating reply for ${sender}...`);
        const openai = getOpenAIClient();
        const model = process.env.OPENAI_MODEL || 'gpt-4o';
        const db = getDb();

        // 1. Fetch Chat History
        const historyRef = db.collection('whatsapp_chats').doc(sender).collection('messages');
        const historySnapshot = await historyRef.orderBy('timestamp', 'asc').get(); // Only get reasonable number, e.g limit to last 20? Wait, let's just get all since it's a subcollection, ideally we'd limit.
        const history: any[] = [];
        
        // Take the last 10 messages for context
        const docs = historySnapshot.docs.slice(-10);
        for (const doc of docs) {
            history.push({ role: doc.data().role, content: doc.data().content });
        }

        const systemMessage = { role: "system" as const, content: systemPrompt };
        const userMessage = { role: "user" as const, content: text };
        
        let messages = [systemMessage, ...history, userMessage];

        // 2. Define tools
        const tools: any[] = [{
            type: 'function',
            function: {
                name: 'generate_music',
                description: 'Generate a personalized spiritual song or music track based on the users intentions, feelings, or lyrics. Use this ONLY when the user explicitly agrees to create a song or gives you enough details (mood/intent) to make one.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'A detailed Suno ai music prompt outlining genre, mood, rhythm, and lyrical themes/content.' },
                        title: { type: 'string', description: 'A short catchy title for the track.' },
                        intention: { type: 'string', description: 'The underlying spiritual or emotional intention.' }
                    },
                    required: ['prompt', 'title']
                }
            }
        }];

        // 3. Make LLM Call
        const response = await openai.chat.completions.create({
            model,
            messages: messages as any,
            temperature: 0.7,
            max_tokens: 500,
            tools: tools,
            tool_choice: "auto"
        });

        const choice = response.choices[0];
        let reply = choice.message.content?.trim() || "I'm sorry, I couldn't generate a reply right now.";

        // 4. Handle Tool Call
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            const toolCall = choice.message.tool_calls[0];
            if (toolCall.type === 'function' && toolCall.function.name === 'generate_music') {
                const args = JSON.parse(toolCall.function.arguments || '{}');
                console.log(`[WhatsAppBot] Generating music via tool... title: ${args.title}`);

                // Try to find the user in facebook_leads by phone
                const phone = sender.startsWith('+') ? sender : `+${sender}`; // Typically sender comes in standard E.164, adjust if needed
                let firebaseUid = '';
                
                // Match by phone or raw sender string
                const leadSnap = await db.collection('facebook_leads').where('phone', 'in', [sender, phone, sender.replace('+', '')]).limit(1).get();
                if (!leadSnap.empty) {
                    firebaseUid = leadSnap.docs[0].data().firebaseUid || '';
                }

                if (!firebaseUid) {
                    reply = "You need to finish setting up your account first! Please click the registration link sent when you joined to activate your account, then come back here to compose your song! 🙏";
                } else {
                    try {
                        await generateSunoTrack({
                            firebaseUid,
                            prompt: args.prompt,
                            title: args.title,
                            metadata: { intention: args.intention || 'Soulful creation' }
                        });
                        reply = "Your song is being generated right now! 🎶\n\nIt will appear in your 'My Music' dashboard on rraasi.com shortly. Is there anything else I can help you with today? 🙏";
                    } catch (err: any) {
                        console.error('[WhatsAppBot] generateSunoTrack failed:', err);
                        reply = "There was a brief technical issue generating your song right now. Please try again in a few moments! 🙏";
                    }
                }
            }
        }

        // 5. Save History
        reply = reply.replace(/^(RRAASI AI|AI|Bot|Assistant):\s*/i, '');
        
        await db.runTransaction(async (t) => {
            const userMsgRef = historyRef.doc();
            t.set(userMsgRef, { role: 'user', content: text, timestamp: Date.now() });
            
            const aiMsgRef = historyRef.doc();
            t.set(aiMsgRef, { role: 'assistant', content: reply, timestamp: Date.now() + 1 });
        });

        return reply;
    } catch (err: any) {
        console.error('[WhatsAppBot] Error generating reply:', err);
        throw err;
    }
}

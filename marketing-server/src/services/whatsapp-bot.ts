import OpenAI from 'openai';

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

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const reply = response.choices[0].message.content?.trim() || "I'm sorry, I couldn't generate a reply right now.";
        
        return reply.replace(/^(RRAASI AI|AI|Bot|Assistant):\s*/i, '');
    } catch (err: any) {
        console.error('[WhatsAppBot] Error generating reply:', err);
        throw err;
    }
}

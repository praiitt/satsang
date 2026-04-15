import OpenAI from 'openai';
import { Storage } from '@google-cloud/storage';

const GCS_BUCKET = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'rraasi-agent-recordings';

function getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
    }
    return new OpenAI({ apiKey });
}

export interface GenerateImageResult {
    imageUrl: string;  // Public GCS URL
    gcsPath?: string;
}

export async function generateDalleImage(
    prompt: string,
    briefId: string,
): Promise<GenerateImageResult> {
    const openai = getOpenAIClient();

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
    });

    const base64Data = (response as any).data[0]?.b64_json;
    if (!base64Data) {
        throw new Error('No image data returned from DALL-E');
    }

    let imageBuffer = Buffer.from(base64Data, 'base64');
    const mimeType = 'image/jpeg';
    const ext = 'jpg';

    try {
        const sharp = (await import('sharp')).default;
        imageBuffer = (await sharp(imageBuffer)
            .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer()) as any;
    } catch (e) {
        console.warn('Could not resize image with sharp, proceeding with original', e);
    }

    // Upload to GCS
    const gcsPath = `ads/${briefId}/dalle-${Date.now()}.${ext}`;

    let storage: Storage;
    const credentialsBase64 = process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS;
    if (credentialsBase64) {
        const creds = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf8'));
        storage = new Storage({ credentials: creds, projectId: creds.project_id });
    } else {
        storage = new Storage();
    }

    const file = storage.bucket(GCS_BUCKET).file(gcsPath);
    await file.save(imageBuffer as any, {
        metadata: { contentType: mimeType },
        resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${gcsPath}`;

    return {
        imageUrl: publicUrl,
        gcsPath,
    };
}

export interface AdContentInput {
    topic: string;
    objective: string;
    audience: string;
    cta: string;
    platform: string;
    tone?: string;
    language?: string;
}

export interface GeneratedAdContent {
    caption: string;
    hashtags: string[];
    hooks: string[];
    imagePrompt: string;
}

export async function generateAdContentGPT(input: AdContentInput): Promise<GeneratedAdContent> {
    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const platformGuide: Record<string, string> = {
        instagram: 'engaging visual caption (max 2200 chars), 25-30 hashtags, emoji-heavy',
        twitter: 'concise tweet (max 280 chars), 3-5 hashtags, punchy',
        linkedin: 'professional post (max 700 chars), 5-8 hashtags, thought-leadership tone',
        facebook: 'conversational post (max 500 chars), emotional hook, 5-10 hashtags',
    };

    const platformStyle = platformGuide[input.platform] || platformGuide.instagram;
    const lang = input.language || 'english';
    const tone = input.tone || 'inspirational';

    const prompt = `You are an expert social media marketing manager for "RRAASI", an AI-powered spiritual platform.

[COMPANY CONTEXT]
Identity: RRAASI helps users experience their spiritual dimension through focused attention.
Core Services & URLs:
- Satsang: Connect with 50+ global spiritual gurus via voice chat (https://rraasi.com/satsang)
- RRAASI Music Maker: AI-generated spiritual & frequency music (https://rraasi.com/login?returnUrl=/rraasi-music&service=music)
- Mystic Tarot Reading: AI-interpreted guidance from higher dimensions (https://rraasi.com/login?returnUrl=/tarot&service=tarot)
- Vedic Jyotish: Cosmic wisdom & Kundali matching (https://rraasi.com/login?returnUrl=/vedic-jyotish&service=astrology)
- Lightworkers: Community for spiritual healers (https://rraasi.com/lightworkers)
Philosophy: The "Principle of Manifestation" — Give your attention to the spiritual dimension, and it will manifest itself to you.
Tone & Voice: Compassionate, authentic Indian spirituality, modern, wise, and encouraging. Never use generic or cliché "wellness" speak. Make it distinctly RRAASI.

[POST REQUIREMENTS]
Create a highly engaging social media post.
Platform: ${input.platform.toUpperCase()} — Style: ${platformStyle}
Topic: ${input.topic}
Objective: ${input.objective}
Target Audience: ${input.audience}
Call to Action (CTA): ${input.cta}
Requested Tone: ${tone}
Requested Language: ${lang} ${lang === 'hinglish' ? '(mix of Hindi and English naturally)' : lang === 'hindi' ? '(write in Devanagari Hindi)' : ''}

[LINK AND CTA CONSTRAINTS]
Whenever providing a link, you MUST use the exact, valid URLs provided in the Core Services list above. If the topic isn't a specific service, use the base URL: "https://rraasi.com/". 
DO NOT hallucinate or invent external links. 
Ensure the CTA naturally weaves into the Rraasi brand philosophy.

Respond ONLY in this JSON format, no additional text or markdown formatting outside the braces:
{
  "caption": "The full, engaging post caption with proper formatting, emojis, and the appropriate Rraasi link based on the topic/cta.",
  "hashtags": ["hashtag1", "hashtag2", "RraasiApp", "SpiritualJourney"],
  "hooks": ["Compelling hook line 1", "Compelling hook line 2", "Compelling hook line 3"],
  "imagePrompt": "A highly detailed, professional prompt to generate a beautiful, culturally authentic image for this post. Describe lighting, style, colors, elements. Do not request text overlays. Must be suitable for ${input.platform}."
}`;

    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: "system", content: "You are a helpful assistant that responds in JSON format." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content || '{}';

    try {
        const parsed = JSON.parse(text);
        return {
            caption: parsed.caption || '',
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
            hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
            imagePrompt: parsed.imagePrompt || `Spiritual meditation scene for ${input.topic}`,
        };
    } catch (err) {
        console.error('Failed to parse OpenAI response:', text);
        throw new Error(`Failed to parse OpenAI response: ${text.slice(0, 200)}`);
    }
}


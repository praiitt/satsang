import { GoogleGenerativeAI } from '@google/generative-ai';
import { Storage } from '@google-cloud/storage';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const GCS_BUCKET = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'rraasi-agent-recordings';

function getGeminiClient(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }
    return new GoogleGenerativeAI(apiKey);
}

export interface AdContentInput {
    topic: string;         // e.g. "Daily Satsang / Spiritual Meditation"
    objective: string;     // e.g. "Awareness", "Engagement", "App Downloads"
    audience: string;      // e.g. "Spiritual seekers aged 25-45 in India"
    cta: string;           // e.g. "Download the Rraasi app"
    platform: string;      // "instagram" | "twitter" | "linkedin" | "facebook"
    tone?: string;         // "devotional" | "inspirational" | "informative"
    language?: string;     // "english" | "hindi" | "hinglish"
}

export interface GeneratedAdContent {
    caption: string;
    hashtags: string[];
    hooks: string[];
    imagePrompt: string;
}

export async function generateAdContent(input: AdContentInput): Promise<GeneratedAdContent> {
    const genAI = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip markdown code fences if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    try {
        const parsed = JSON.parse(jsonText);
        return {
            caption: parsed.caption || '',
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
            hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
            imagePrompt: parsed.imagePrompt || `Spiritual meditation scene for ${input.topic}`,
        };
    } catch (err) {
        throw new Error(`Failed to parse Gemini response as JSON: ${text.slice(0, 200)}`);
    }
}

export interface GenerateImageResult {
    imageUrl: string;  // Public GCS URL
    localPath?: string;
    gcsPath?: string;
}

export async function generateAdImage(
    imagePrompt: string,
    briefId: string,
): Promise<GenerateImageResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    // Use Gemini image generation via REST endpoint
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `Generate a high-quality, professional social media image. ${imagePrompt}. 
                Style: photorealistic or artistically stunning, vibrant, premium quality. 
                No text overlays. Aspect ratio: square (1:1). Resolution: high definition.`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    responseModalities: ['image', 'text'],
                },
            }),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini image generation failed: ${response.status} ${errText.slice(0, 300)}`);
    }

    const data = await response.json() as {
        candidates?: Array<{
            content?: {
                parts?: Array<{
                    inlineData?: { mimeType: string; data: string };
                    text?: string;
                }>;
            };
        }>;
    };

    const candidate = data.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart?.inlineData) {
        throw new Error('No image data returned from Gemini');
    }

    const { mimeType, data: base64Data } = imagePart.inlineData;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    let imageBuffer = Buffer.from(base64Data, 'base64');

    try {
        const sharp = (await import('sharp')).default;
        imageBuffer = await sharp(imageBuffer)
            .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();
    } catch (e) {
        console.warn('Could not resize image with sharp, proceeding with original', e);
    }

    // Upload to GCS
    const gcsPath = `ads/${briefId}/${Date.now()}.${ext}`;

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

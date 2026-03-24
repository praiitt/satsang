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

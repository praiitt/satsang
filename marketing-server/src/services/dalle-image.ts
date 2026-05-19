import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GenerateImageParams {
  prompt: string;
}

/**
 * Generate an image using OpenAI DALL-E 3 API
 */
export async function generateDalleImage(params: GenerateImageParams): Promise<string | null> {
  try {
    const promptStr = typeof params.prompt === 'string' ? params.prompt : JSON.stringify(params.prompt);
    // DALL-E 3 enforces a strict 4000 character limit. Safely truncate just in case.
    const safePrompt = promptStr.length > 3900 ? promptStr.substring(0, 3900) : promptStr;
    
    console.log(`[dalle-image] Generating image for prompt: "${safePrompt.substring(0, 50)}..."`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: safePrompt,
      n: 1,
      size: "1792x1024", // Landscape format
      response_format: "url",
      quality: "standard" // or "hd"
    });

    if (response.data && response.data.length > 0) {
      const imageUrl = response.data[0].url;
      console.log(`[dalle-image] Image generated successfully`);
      return imageUrl || null;
    }

    return null;
  } catch (error: any) {
    console.error('[dalle-image] Failed to generate image:', error?.message || String(error));
    return null;
  }
}

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ImagenParams {
  prompt: string;
  outputPath: string;
}

/**
 * Generate an image using Google's Imagen 4 API and save it directly to outputPath.
 * Returns outputPath on success, null on failure.
 * 
 * Uses the Raja Ravi Varma / Indian classical art style in prompts to ensure
 * Hindu deities are depicted faithfully.
 */
export async function generateImagenImage(params: ImagenParams): Promise<string | null> {
  const { prompt, outputPath } = params;
  // Truncate to safe length if needed
  const safePrompt = prompt.length > 950 ? prompt.substring(0, 950) : prompt;

  console.log(`[imagen] Generating image: "${safePrompt.substring(0, 70)}..."`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`[imagen] ❌ Failed: GEMINI_API_KEY is not set.`);
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: safePrompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json() as any;
    const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Data) {
      throw new Error('No image data returned from Imagen API');
    }

    await fs.writeFile(outputPath, Buffer.from(base64Data, 'base64'));
    console.log(`[imagen] ✅ Saved: ${path.basename(outputPath)}`);
    return outputPath;

  } catch (error: any) {
    console.error(`[imagen] ❌ Failed:`, error?.message || String(error));
    return null;
  }
}

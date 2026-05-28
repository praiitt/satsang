/**
 * Quick test: which Gemini/Google models can generate images with our API key?
 * Run: npx tsx test-image-gen.ts
 */

import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const testPrompt = 'Goddess Mahalakshmi with four arms, golden complexion, seated on a pink lotus, wearing red silk saree with gold border, holding lotus flowers and showering gold coins, traditional Indian devotional painting style, Raja Ravi Varma inspired, richly detailed, warm divine lighting';

async function testGeminiFlashImageGen() {
  console.log('\n=== Test 1: Gemini 2.0 Flash Experimental Image Generation ===');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: testPrompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      } as any,
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image'));

    if (imagePart?.inlineData?.data) {
      const outPath = path.join(process.cwd(), 'test-gemini-flash.jpg');
      await fs.writeFile(outPath, Buffer.from(imagePart.inlineData.data, 'base64'));
      console.log(`✅ SUCCESS! Saved to: ${outPath}`);
    } else {
      console.log('❌ No image part in response. Parts:', JSON.stringify(parts.map((p: any) => Object.keys(p))));
    }
  } catch (e: any) {
    console.error('❌ Failed:', e?.message || e);
  }
}

async function testImagen3() {
  console.log('\n=== Test 2: Imagen 3.0 via @google/genai ===');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: testPrompt,
      config: { numberOfImages: 1, aspectRatio: '16:9' },
    });

    const base64 = response?.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
      const outPath = path.join(process.cwd(), 'test-imagen3.jpg');
      await fs.writeFile(outPath, Buffer.from(base64, 'base64'));
      console.log(`✅ SUCCESS! Saved to: ${outPath}`);
    } else {
      console.log('❌ No image bytes returned');
    }
  } catch (e: any) {
    console.error('❌ Failed:', e?.message || e);
  }
}

async function testImagen3_v1() {
  console.log('\n=== Test 3: Imagen 3.0-generate-001 ===');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: testPrompt,
      config: { numberOfImages: 1, aspectRatio: '16:9' },
    });

    const base64 = response?.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
      const outPath = path.join(process.cwd(), 'test-imagen3-v1.jpg');
      await fs.writeFile(outPath, Buffer.from(base64, 'base64'));
      console.log(`✅ SUCCESS! Saved to: ${outPath}`);
    } else {
      console.log('❌ No image bytes returned');
    }
  } catch (e: any) {
    console.error('❌ Failed:', e?.message || e);
  }
}

async function listAvailableModels() {
  console.log('\n=== Test 4: List available models that support image generation ===');
  const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

  try {
    const models = await (ai as any).listModels();
    const imageModels = models?.models?.filter((m: any) =>
      m.supportedGenerationMethods?.some((method: string) =>
        method.toLowerCase().includes('image') || method.toLowerCase().includes('generate')
      )
    );
    console.log('Models with image/generate support:');
    (imageModels || []).forEach((m: any) => {
      console.log(`  - ${m.name}: ${m.supportedGenerationMethods?.join(', ')}`);
    });
  } catch (e: any) {
    console.error('❌ Failed to list models:', e?.message || e);
  }
}

(async () => {
  console.log('Testing with GEMINI_API_KEY:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET');
  await testGeminiFlashImageGen();
  await testImagen3();
  await testImagen3_v1();
  await listAvailableModels();
  console.log('\n=== Done ===');
})();

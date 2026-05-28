import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import * as path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const testPrompt = 'Goddess Mahalakshmi with four arms, golden complexion, seated on a pink lotus, wearing red silk saree with gold border, holding lotus flowers and showering gold coins, traditional Indian devotional painting style, Raja Ravi Varma inspired, richly detailed, warm divine lighting, 16:9 landscape';

async function testImagenModel(modelName: string, outFile: string) {
  console.log(`\n=== Testing: ${modelName} ===`);
  try {
    const response = await ai.models.generateImages({
      model: modelName,
      prompt: testPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
      } as any,
    });
    const base64 = response?.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
      const outPath = path.join(process.cwd(), outFile);
      await fs.writeFile(outPath, Buffer.from(base64, 'base64'));
      console.log(`✅ SUCCESS → ${outPath}`);
      return true;
    } else {
      console.log('❌ No image bytes returned. Response:', JSON.stringify(response, null, 2));
      return false;
    }
  } catch (e: any) {
    console.error('❌ Failed:', e?.message || String(e));
    return false;
  }
}

async function testGeminiFlashImage(modelName: string, outFile: string) {
  console.log(`\n=== Testing Gemini Image model: ${modelName} ===`);
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: testPrompt,
      config: {
        responseModalities: ['IMAGE'],
      } as any,
    });
    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = (parts as any[]).find((p: any) => p.inlineData?.mimeType?.startsWith('image'));
    if (imagePart?.inlineData?.data) {
      const outPath = path.join(process.cwd(), outFile);
      await fs.writeFile(outPath, Buffer.from(imagePart.inlineData.data, 'base64'));
      console.log(`✅ SUCCESS → ${outPath}`);
      return true;
    } else {
      console.log('❌ No image in response. Parts:', JSON.stringify(parts.map((p: any) => Object.keys(p))));
      return false;
    }
  } catch (e: any) {
    console.error('❌ Failed:', e?.message || String(e));
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Gemini Image Generation Models\n');
  console.log('Prompt:', testPrompt.substring(0, 80) + '...\n');

  // Test Imagen 4 variants (found in model list)
  await testImagenModel('imagen-4.0-generate-001', 'test-imagen4.jpg');
  await testImagenModel('imagen-4.0-fast-generate-001', 'test-imagen4-fast.jpg');
  await testImagenModel('imagen-4.0-ultra-generate-001', 'test-imagen4-ultra.jpg');

  // Test Gemini native image models
  await testGeminiFlashImage('gemini-2.5-flash-image', 'test-gemini25-flash-image.jpg');
  await testGeminiFlashImage('gemini-3.1-flash-image-preview', 'test-gemini31-flash-image.jpg');
  await testGeminiFlashImage('gemini-3-pro-image-preview', 'test-gemini3-pro-image.jpg');

  console.log('\n=== Done! Check the .jpg files in the marketing-server folder ===');
}

main().catch(console.error);

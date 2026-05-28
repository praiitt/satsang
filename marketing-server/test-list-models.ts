import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function main() {
  console.log('Listing all available models...\n');
  const resp = await ai.models.list();
  const names: string[] = [];
  for await (const m of resp) {
    names.push(m.name || '');
  }
  console.log('All models:');
  names.forEach(n => console.log(' -', n));

  const imageRelated = names.filter(n =>
    n.includes('image') || n.includes('imagen') || n.includes('flash')
  );
  console.log('\nImage/Flash related models:');
  imageRelated.forEach(n => console.log(' -', n));
}

main().catch(console.error);

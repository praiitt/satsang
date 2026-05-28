import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const imageModel = 'gemini-2.5-flash-image';
  
  const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`,
      {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
              contents: [{ parts: [{ text: "A highly detailed lotus flower." }] }],
              generationConfig: { responseModalities: ['image'] },
          }),
      }
  );

  if (!response.ok) {
    const txt = await response.text();
    console.error('Failed:', response.status, txt);
    return;
  }
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

  if (imagePart) {
    console.log('Success! Bytes length:', imagePart.inlineData.data.length);
  } else {
    console.log('Got response but no predictions:', data);
  }
}
test().catch(console.error);

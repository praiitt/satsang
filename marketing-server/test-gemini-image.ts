import { config } from 'dotenv';

async function test() {
  const apiKey = "AIzaSyAdxtLNlhj0waaMbF4zRW9lFaYBE63iT78";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: "A beautiful lotus flower." }],
        parameters: { sampleCount: 1, aspectRatio: "1:1" }
      })
    }
  );

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2).slice(0, 500));
}
test().catch(console.error);

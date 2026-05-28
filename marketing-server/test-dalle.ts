import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { generateImagenImage } from './src/services/imagen-image.js';

async function test() {
  console.log('Testing image generation...');
  const res = await generateImagenImage({
    prompt: 'In the style of Raja Ravi Varma, a beautiful lotus flower blooming in a serene pond at dawn.',
    outputPath: './test_image.jpg'
  });
  
  if (res) {
    console.log('Success! Image saved to', res);
  } else {
    console.log('Failed to generate image.');
  }
}

test().catch(console.error);

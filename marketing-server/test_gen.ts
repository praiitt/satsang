import './src/env-config.js';
import { createAvatarClip } from './src/services/heygen.js';

async function run() {
  console.log("Starting test generation...");
  const result = await createAvatarClip({
    avatarId: 'f31ce977d65e47caa3e92a46703d6b1f', // Standard talking photo ID (known working)
    avatarType: 'talking_photo',
    text: 'Hello, this is a status check test.',
    voiceId: 'dc5370c68baa4905be87f702758df4b0',
    resolution: '720p',
    metadata: { test: 'true' }
  });
  console.log("Generation Result:", JSON.stringify(result, null, 2));
}
run();

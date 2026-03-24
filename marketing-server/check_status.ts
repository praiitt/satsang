import './src/env-config.js';
import { getAvatarClipStatus } from './src/services/heygen.js';

async function run() {
  const videoId = '1e673e4d16a44dc2a8d4999d68c0bca4';
  console.log(`Checking status for ${videoId}...`);
  const status = await getAvatarClipStatus(videoId);
  console.log("Final Status Result:", JSON.stringify(status, null, 2));
}
run();

/**
 * Test video stitching with HeyGen video IDs
 */
import 'dotenv/config';
import { stitchVideos } from '../src/services/video-stitcher.js';

async function test() {
  const videoIds = ['3f3f16f230b14e0bb5b90d6da6046fce', '536ec550dc92454395fba6d831dd2cd4'];

  console.log('Testing video stitching with HeyGen video IDs...\n');
  console.log('Video IDs:', videoIds);

  try {
    const result = await stitchVideos({
      videoUrls: videoIds,
      outputFileName: 'test_stitched.mp4',
      outputDir: './test_outputs',
    });

    console.log('\nResult:', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('\nError:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();

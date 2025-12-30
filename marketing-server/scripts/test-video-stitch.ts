/**
 * Test script for video stitching with HeyGen video URLs
 *
 * Usage:
 *   HEYGEN_API_KEY=sk_xxx tsx scripts/test-video-stitch.ts
 */
import 'dotenv/config';
import https from 'node:https';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

if (!HEYGEN_API_KEY) {
  console.error('❌ HEYGEN_API_KEY env var is required');
  process.exit(1);
}

interface HttpMethod {
  method: 'GET' | 'POST';
  path: string;
  body?: any;
}

function httpRequest<T = any>(method: 'GET' | 'POST', path: string, body?: any): Promise<T> {
  const url = new URL(HEYGEN_BASE_URL);

  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': HEYGEN_API_KEY,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            try {
              const parsed = JSON.parse(data);
              const msg =
                parsed?.message ||
                parsed?.error?.message ||
                parsed?.error ||
                `HTTP ${res.statusCode}`;
              return reject(
                Object.assign(new Error(msg), { statusCode: res.statusCode, details: parsed })
              );
            } catch {
              return reject(
                Object.assign(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`), {
                  statusCode: res.statusCode,
                  details: data,
                })
              );
            }
          }

          if (!data) {
            return resolve(undefined as T);
          }

          try {
            resolve(JSON.parse(data) as T);
          } catch (error) {
            reject(new Error(`Invalid JSON: ${String(error)} \n${data.slice(0, 200)}`));
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getVideoUrl(videoId: string): Promise<string | null> {
  console.log(`\n🔍 Fetching video URL for: ${videoId}`);

  // Try multiple endpoints to get video URL
  const candidatePaths = [
    `/v2/video/${videoId}`,
    `/v2/video/status/${videoId}`,
    `/v1/video/${videoId}`,
  ];

  for (const path of candidatePaths) {
    try {
      console.log(`📡 Trying GET ${path}...`);
      const response = await httpRequest<any>('GET', path);

      // Try to extract video URL from various response formats
      const videoUrl =
        response?.data?.video_url ||
        response?.data?.videoUrl ||
        response?.video_url ||
        response?.videoUrl ||
        response?.data?.url ||
        response?.url;

      if (videoUrl) {
        console.log(`✅ Found video URL: ${videoUrl}`);
        return videoUrl;
      }

      console.log(`⚠️  No video URL found in response from ${path}`);
      console.log(`Response structure:`, JSON.stringify(response, null, 2).substring(0, 500));
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ ${path} → 404 (endpoint not found)`);
      } else {
        console.log(`❌ ${path} → ${error.message}`);
      }
      continue;
    }
  }

  return null;
}

async function testStitching() {
  const videoIds = ['3f3f16f230b14e0bb5b90d6da6046fce', '536ec550dc92454395fba6d831dd2cd4'];

  console.log('🎬 Testing Video Stitching with HeyGen Videos\n');
  console.log(`🔑 API Key: ${HEYGEN_API_KEY.slice(0, 10)}...`);
  console.log(`🌐 Base URL: ${HEYGEN_BASE_URL}\n`);

  // Get video URLs
  const videoUrls: string[] = [];

  for (const videoId of videoIds) {
    const url = await getVideoUrl(videoId);
    if (url) {
      videoUrls.push(url);
    } else {
      console.error(`❌ Could not get video URL for ${videoId}`);
      console.error(
        `💡 You may need to get the direct video download URL from the HeyGen dashboard.`
      );
      console.error(`   Dashboard URL: https://app.heygen.com/videos/${videoId}`);
    }
  }

  if (videoUrls.length === 0) {
    console.error('\n❌ No video URLs found. Cannot test stitching.');
    console.error('\n💡 To get direct video URLs:');
    console.error('   1. Open the video in HeyGen dashboard');
    console.error('   2. Right-click the video player and "Copy video URL"');
    console.error('   3. Or use the download button to get the direct URL');
    process.exit(1);
  }

  if (videoUrls.length < 2) {
    console.error(`\n❌ Need at least 2 video URLs, got ${videoUrls.length}`);
    process.exit(1);
  }

  console.log(`\n✅ Found ${videoUrls.length} video URLs:`);
  videoUrls.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
  });

  console.log('\n📝 To test stitching, use these URLs in the Video Stitching Tool:');
  console.log('   1. Go to the Marketing Podcast page');
  console.log('   2. Scroll to "Video Stitching Tool" section');
  console.log('   3. Paste these URLs one by one');
  console.log('   4. Click "🎬 Stitch Videos"');

  console.log('\n📋 URLs to copy:');
  videoUrls.forEach((url) => {
    console.log(`   ${url}`);
  });
}

testStitching().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
});

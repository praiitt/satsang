/**
 * Direct API test to check HeyGen video creation and status
 * Usage: tsx scripts/test-heygen-direct.ts
 */

import 'dotenv/config';
import https from 'node:https';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

const HOST_AVATAR = 'e4fe73ae6aad47338ec1e662d67fca46';
const GUEST_AVATAR = 'f31ce977d65e47caa3e92a46703d6b1f';
const VOICE_ID = '9799f1ba6acd4b2b993fe813a18f9a91';

// Video IDs from logs
const EXISTING_VIDEO_IDS = [
  '11e1f42278b7434880070611fe43fbe3',
  '228a75babed74ab594a2d9d3cf188cb5',
];

function httpRequestJson<T>(options: {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const isV2Key = HEYGEN_API_KEY?.startsWith('sk_V2_');
    let fullPath = options.path;

    if (isV2Key && !fullPath.startsWith('/v2/') && !fullPath.startsWith('/v1/')) {
      fullPath = '/v2' + fullPath;
    }

    const url = new URL(HEYGEN_BASE_URL);
    const bodyString = options.body !== undefined ? JSON.stringify(options.body) : undefined;

    console.log(`\n📡 ${options.method} ${url.hostname}${fullPath}`);

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: fullPath,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': HEYGEN_API_KEY || '',
          'Content-Length': bodyString ? Buffer.byteLength(bodyString) : 0,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log(`📥 Status: ${res.statusCode}`);
          
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            let errorMessage = `HTTP ${res.statusCode}`;
            let errorDetails: any = null;
            
            if (data) {
              try {
                errorDetails = JSON.parse(data);
                errorMessage = errorDetails.error?.message || errorDetails.message || errorMessage;
              } catch {
                errorMessage = `${errorMessage}: ${data.substring(0, 200)}`;
              }
            }
            
            const error = new Error(errorMessage) as Error & { statusCode?: number; details?: any };
            error.statusCode = res.statusCode;
            error.details = errorDetails || data;
            return reject(error);
          }
          
          if (!data) {
            return resolve(undefined as T);
          }
          
          try {
            const json = JSON.parse(data);
            console.log(`✅ Response:`, JSON.stringify(json, null, 2));
            resolve(json as T);
          } catch (err) {
            console.error(`❌ Invalid JSON:`, data.substring(0, 500));
            reject(new Error(`Invalid JSON: ${String(err)}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error(`❌ Request error:`, err);
      reject(err);
    });

    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

async function testCreateVideo() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Create New Video');
  console.log('='.repeat(60));

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'talking_photo',
          talking_photo_id: HOST_AVATAR,
        },
        voice: {
          type: 'text',
          input_text: 'Hello, this is a test video creation.',
          voice_id: VOICE_ID,
        },
      },
    ],
    aspect_ratio: '16:9',
    resolution: '720p',
  };

  try {
    const response: any = await httpRequestJson<any>({
      method: 'POST',
      path: '/video/generate',
      body: payload,
    });

    console.log('\n📊 Create Video Response Summary:');
    console.log('  - Status:', response?.data?.status || response?.status || 'unknown');
    console.log('  - Video ID:', response?.data?.video_id || response?.data?.id || 'none');
    console.log('  - Task ID:', response?.data?.task?.id || response?.data?.task_id || 'none');
    console.log('  - Video URL:', response?.data?.video_url || response?.data?.videoUrl || 'none');
    console.log('  - Full response keys:', Object.keys(response?.data || response || {}));

    return {
      videoId: response?.data?.video_id || response?.data?.id,
      taskId: response?.data?.task?.id || response?.data?.task_id,
      status: response?.data?.status || response?.status,
      videoUrl: response?.data?.video_url || response?.data?.videoUrl,
      fullResponse: response,
    };
  } catch (error: any) {
    console.error('❌ Failed to create video:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

async function testStatusEndpoints(videoId: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 2: Check Status for Video ID: ${videoId}`);
  console.log('='.repeat(60));

  const endpoints = [
    `/v2/task/${videoId}`,
    `/v2/tasks/${videoId}`,
    `/v2/video/${videoId}`,
    `/v2/videos/${videoId}`,
    `/v2/video/${videoId}/status`,
    `/v2/task/${videoId}/status`,
    `/v2/video/status?video_id=${videoId}`,
    `/video/status?video_id=${videoId}`,
    `/v1/video.status?video_id=${videoId}`,
    `/v1/video/status?video_id=${videoId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Trying: ${endpoint}`);
      const response: any = await httpRequestJson<any>({
        method: 'GET',
        path: endpoint,
      });

      console.log(`✅ SUCCESS with: ${endpoint}`);
      console.log('  - Status:', response?.data?.status || response?.status);
      console.log('  - Video URL:', response?.data?.video_url || response?.data?.videoUrl || response?.video_url);
      console.log('  - Full response keys:', Object.keys(response?.data || response || {}));
      
      return {
        endpoint,
        status: response?.data?.status || response?.status,
        videoUrl: response?.data?.video_url || response?.data?.videoUrl || response?.video_url,
        response,
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`  ❌ 404 Not Found`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
      // Continue to next endpoint
      continue;
    }
  }

  console.log('\n❌ All status endpoints failed');
  return null;
}

async function testVideoUrlDirect(videoId: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 3: Try Direct Video URL Access for: ${videoId}`);
  console.log('='.repeat(60));

  // Common HeyGen video URL patterns
  const urlPatterns = [
    `https://storage.googleapis.com/heygen-videos/${videoId}.mp4`,
    `https://cdn.heygen.ai/videos/${videoId}.mp4`,
    `https://media.heygen.ai/videos/${videoId}.mp4`,
    `https://api.heygen.com/v2/video/${videoId}/download`,
    `https://api.heygen.com/v2/video/${videoId}/file`,
    `https://api.heygen.com/v2/video/${videoId}/url`,
  ];

  for (const url of urlPatterns) {
    try {
      console.log(`\n🔄 Trying: ${url}`);
      const response = await new Promise<{ statusCode?: number }>((resolve, reject) => {
        https.get(url, (res) => {
          resolve({ statusCode: res.statusCode });
          res.on('data', () => {}); // Drain data
          res.on('end', () => {});
        }).on('error', reject);
      });

      if (response.statusCode === 200) {
        console.log(`✅ SUCCESS! Video accessible at: ${url}`);
        return url;
      } else {
        console.log(`  ❌ Status ${response.statusCode}`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      continue;
    }
  }

  console.log('\n❌ All direct URL patterns failed');
  return null;
}

async function main() {
  console.log('🚀 HeyGen API Direct Testing');
  console.log('='.repeat(60));
  console.log(`API Key: ${HEYGEN_API_KEY.substring(0, 10)}...`);
  console.log(`Base URL: ${HEYGEN_BASE_URL}`);

  try {
    // Test 1: Create a new video
    const createResult = await testCreateVideo();
    
    if (createResult.videoId) {
      console.log(`\n✅ Video created! Video ID: ${createResult.videoId}`);
      
      // Wait a bit for video to start processing
      console.log('\n⏳ Waiting 5 seconds before checking status...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Test 2: Check status
      await testStatusEndpoints(createResult.videoId);
      
      // Test 3: Try direct URL access
      await testVideoUrlDirect(createResult.videoId);
    }

    // Test existing video IDs from logs
    if (EXISTING_VIDEO_IDS.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('TEST 4: Check Existing Videos from Logs');
      console.log('='.repeat(60));

      for (const videoId of EXISTING_VIDEO_IDS) {
        console.log(`\n📋 Testing existing video: ${videoId}`);
        
        // Try status endpoints
        const statusResult = await testStatusEndpoints(videoId);
        
        if (!statusResult) {
          // Try direct URL
          await testVideoUrlDirect(videoId);
        }
        
        // Wait before next video
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Tests Complete!');
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});


/**
 * Test script to directly test HeyGen API with photo avatars
 * Usage: tsx scripts/test-heygen-api.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

interface TestResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
  details?: any;
}

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

    console.log(`\n📡 Making ${options.method} request to: ${url.hostname}${fullPath}`);
    if (bodyString) {
      console.log(`📦 Request body:`, JSON.stringify(options.body, null, 2));
    }

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
          console.log(`📥 Response status: ${res.statusCode}`);
          console.log(`📥 Response headers:`, res.headers);

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            let errorMessage = `HTTP ${res.statusCode}`;
            let errorDetails: any = null;

            if (data) {
              try {
                errorDetails = JSON.parse(data);
                errorMessage = errorDetails.message || errorDetails.error || errorMessage;
                console.error(`❌ API Error:`, errorDetails);
              } catch {
                console.error(`❌ API Error. Raw response:`, data.substring(0, 500));
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
            console.log(`✅ Response JSON:`, JSON.stringify(json, null, 2));
            resolve(json as T);
          } catch (err) {
            console.error(`❌ Failed to parse JSON:`, data.substring(0, 500));
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

async function testCreateVideo(avatarId: string, text: string): Promise<TestResult> {
  console.log(`\n🧪 Testing video creation for avatar: ${avatarId}`);
  console.log(`📝 Text: "${text}"`);

  const endpoints = [
    '/video/generate',
    '/v2/video/generate',
    '/v1/video/generate',
    '/v2/video.generate',
    '/v1/video.generate',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Trying endpoint: ${endpoint}`);

      // Try different payload formats - HeyGen v2 requires video_inputs with voice_id
      const payloads = [
        {
          // Format 1: video_inputs with voice.text (v2 format - requires voice_id)
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: avatarId,
              },
              voice: {
                type: 'text',
                text: {
                  input_text: text,
                  voice_id: '1259b7e3-cb8a-43df-9446-30971a46b8b0', // TTS Voice ID
                },
              },
            },
          ],
          aspect_ratio: '16:9',
          resolution: '720p',
        },
        {
          // Format 1b: Alternative voice structure
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: avatarId,
              },
              voice: {
                type: 'text',
                input_text: text,
                voice_id: '1bd001e7e50f421d891986aad5158bc8',
              },
            },
          ],
          aspect_ratio: '16:9',
          resolution: '720p',
        },
        {
          // Format 2: Simple format
          avatar_id: avatarId,
          input_text: text,
          ratio: '16:9',
          resolution: '720p',
        },
        {
          // Format 3: Alternative v2 format
          video_inputs: [
            {
              avatar_id: avatarId,
              text: text,
            },
          ],
          aspect_ratio: '16:9',
          resolution: '720p',
        },
      ];

      for (const payload of payloads) {
        try {
          console.log(
            `\n   Trying payload format:`,
            JSON.stringify(payload, null, 2).substring(0, 200)
          );

          const response: any = await httpRequestJson<any>({
            method: 'POST',
            path: endpoint,
            body: payload,
          });

          // Extract video ID from various response formats
          const videoId =
            response?.data?.video_id ||
            response?.data?.id ||
            response?.video_id ||
            response?.id ||
            response?.data?.task_id ||
            response?.task_id ||
            response?.data?.task?.id;

          if (videoId) {
            console.log(`\n✅ SUCCESS! Video ID: ${videoId}`);
            return {
              success: true,
              videoId,
              details: response,
            };
          } else {
            console.log(`⚠️  Got response but no video ID. Full response:`, response);
            // Continue to next payload format
            continue;
          }
        } catch (err: any) {
          console.log(`   ❌ Payload format failed:`, err.message);
          if (err.statusCode) {
            console.log(`      Status: ${err.statusCode}`);
            if (err.details?.error) {
              console.log(`      Error:`, err.details.error);
            }
          }
          // Continue to next payload format
          continue;
        }
      }
      // If we get here, all payload formats failed for this endpoint
      // Continue to next endpoint
    } catch (err: any) {
      console.log(`❌ Endpoint ${endpoint} failed:`, err.message);
      // Continue to next endpoint
      continue;
    }
  }

  return {
    success: false,
    error: 'All endpoints and payload formats failed',
  };
}

async function testGetVideoStatus(videoId: string): Promise<TestResult> {
  console.log(`\n🧪 Testing video status for: ${videoId}`);

  const endpoints = [
    `/video/status?video_id=${videoId}`,
    `/v2/video/status?video_id=${videoId}`,
    `/v1/video/status?video_id=${videoId}`,
    `/v2/video.status?video_id=${videoId}`,
    `/v1/video.status?video_id=${videoId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Trying endpoint: ${endpoint}`);

      const response: any = await httpRequestJson<any>({
        method: 'GET',
        path: endpoint,
      });

      const status = response?.data?.status || response?.status;
      const videoUrl = response?.data?.video_url || response?.data?.videoUrl || response?.video_url;

      console.log(`📊 Status: ${status}`);
      if (videoUrl) {
        console.log(`🎬 Video URL: ${videoUrl}`);
      }

      return {
        success: true,
        videoUrl,
        details: response,
      };
    } catch (err: any) {
      console.log(`❌ Endpoint ${endpoint} failed:`, err.message);
      continue;
    }
  }

  return {
    success: false,
    error: 'All status endpoints failed',
  };
}

function getGcsBucket() {
  // Read GCP credentials from env or file
  const credentialsJson =
    process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), '../satsangServiceAccount.json');

  let credentials: any;
  if (typeof credentialsJson === 'string' && credentialsJson.startsWith('{')) {
    credentials = JSON.parse(credentialsJson);
  } else if (fs.existsSync(credentialsJson)) {
    credentials = JSON.parse(fs.readFileSync(credentialsJson, 'utf8'));
  } else {
    throw new Error('GCP credentials not found');
  }

  const storage = new Storage({ credentials });
  const bucketName = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'rraasi-agent-recordings';
  return storage.bucket(bucketName);
}

async function downloadAndSaveToBucket(videoUrl: string, bucketPath: string): Promise<void> {
  console.log(`\n💾 Downloading video from: ${videoUrl}`);
  console.log(`📦 Saving to bucket: ${bucketPath}`);

  try {
    const bucket = getGcsBucket();
    const file = bucket.file(bucketPath);

    // Download video
    const https = await import('https');
    const videoData = await new Promise<Buffer>((resolve, reject) => {
      https.get(videoUrl, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    console.log(`✅ Downloaded ${videoData.length} bytes`);

    // Upload to GCS
    await file.save(videoData, {
      contentType: 'video/mp4',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    console.log(`✅ Saved to GCS: gs://${bucket.name}/${bucketPath}`);
    console.log(`🌐 Public URL: https://storage.googleapis.com/${bucket.name}/${bucketPath}`);
  } catch (error: any) {
    console.error(`❌ Failed to save to bucket:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 HeyGen API Test Script');
  console.log('='.repeat(50));

  if (!HEYGEN_API_KEY) {
    console.error('❌ HEYGEN_API_KEY not set!');
    process.exit(1);
  }

  console.log(`🔑 API Key: ${HEYGEN_API_KEY.substring(0, 10)}...`);
  console.log(`🌐 Base URL: ${HEYGEN_BASE_URL}`);

  const hostAvatarId = 'e4fe73ae6aad47338ec1e662d67fca46';
  const guestAvatarId = 'f31ce977d65e47caa3e92a46703d6b1f';
  const testText = 'नमस्ते! यह एक परीक्षण है।'; // "Hello! This is a test."

  // Test Host Avatar
  console.log('\n' + '='.repeat(50));
  console.log('🧑 HOST AVATAR TEST');
  console.log('='.repeat(50));
  const hostResult = await testCreateVideo(hostAvatarId, testText);

  if (hostResult.success && hostResult.videoId) {
    console.log(`\n⏳ Waiting 5 seconds before checking status...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResult = await testGetVideoStatus(hostResult.videoId);

    if (statusResult.success && statusResult.videoUrl) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const bucketPath = `marketing_avatars/test/host-${timestamp}.mp4`;

      try {
        await downloadAndSaveToBucket(statusResult.videoUrl, bucketPath);
        console.log(`\n✅ HOST AVATAR TEST COMPLETE!`);
      } catch (error: any) {
        console.error(`\n❌ Failed to save to bucket:`, error.message);
      }
    } else {
      console.log(`\n⚠️  Video created but status check failed or video not ready yet`);
    }
  } else {
    console.log(`\n❌ HOST AVATAR TEST FAILED:`, hostResult.error);
  }

  // Test Guest Avatar
  console.log('\n' + '='.repeat(50));
  console.log('👤 GUEST AVATAR TEST');
  console.log('='.repeat(50));
  const guestResult = await testCreateVideo(guestAvatarId, testText);

  if (guestResult.success && guestResult.videoId) {
    console.log(`\n⏳ Waiting 5 seconds before checking status...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResult = await testGetVideoStatus(guestResult.videoId);

    if (statusResult.success && statusResult.videoUrl) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const bucketPath = `marketing_avatars/test/guest-${timestamp}.mp4`;

      try {
        await downloadAndSaveToBucket(statusResult.videoUrl, bucketPath);
        console.log(`\n✅ GUEST AVATAR TEST COMPLETE!`);
      } catch (error: any) {
        console.error(`\n❌ Failed to save to bucket:`, error.message);
      }
    } else {
      console.log(`\n⚠️  Video created but status check failed or video not ready yet`);
    }
  } else {
    console.log(`\n❌ GUEST AVATAR TEST FAILED:`, guestResult.error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Complete!');
  console.log('='.repeat(50));
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

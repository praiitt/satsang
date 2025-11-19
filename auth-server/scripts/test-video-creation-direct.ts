/**
 * Test script to directly test HeyGen video creation and GCS saving
 * Bypasses auth for direct testing
 * Usage: tsx scripts/test-video-creation-direct.ts
 */

import 'dotenv/config';
import https from 'node:https';
import { Storage } from '@google-cloud/storage';
import fs from 'node:fs';
import path from 'node:path';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

// Avatar IDs
const HOST_AVATAR = 'e4fe73ae6aad47338ec1e662d67fca46';
const GUEST_AVATAR = 'f31ce977d65e47caa3e92a46703d6b1f';

// Hindi female voice
const HINDI_FEMALE_VOICE = '9799f1ba6acd4b2b993fe813a18f9a91';

function getGcsBucket() {
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
  const bucketName = process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'satsangrecordings';
  return storage.bucket(bucketName);
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
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            try {
              const json = JSON.parse(data);
              const error = new Error(json.error?.message || `HTTP ${res.statusCode}`) as Error & {
                statusCode?: number;
                details?: any;
              };
              error.statusCode = res.statusCode;
              error.details = json;
              return reject(error);
            } catch {
              const error = new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`) as Error & {
                statusCode?: number;
              };
              error.statusCode = res.statusCode;
              return reject(error);
            }
          }

          if (!data) {
            return resolve(undefined as T);
          }

          try {
            const json = JSON.parse(data);
            resolve(json as T);
          } catch {
            reject(new Error(`Invalid JSON: ${data.substring(0, 200)}`));
          }
        });
      }
    );

    req.on('error', reject);

    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

async function createVideo(avatarId: string, text: string, voiceId: string): Promise<string> {
  console.log(`\n🎬 Creating video for avatar: ${avatarId}`);
  console.log(`📝 Text: "${text}"`);

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'talking_photo',
          talking_photo_id: avatarId,
        },
        voice: {
          type: 'text',
          input_text: text,
          voice_id: voiceId,
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

    const videoId = response?.data?.video_id;
    if (!videoId) {
      throw new Error('No video_id in response: ' + JSON.stringify(response));
    }

    console.log(`✅ Video created! Video ID: ${videoId}`);
    return videoId;
  } catch (error: any) {
    console.error(`❌ Failed to create video:`, error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

async function checkVideoStatus(videoId: string): Promise<string | null> {
  console.log(`\n⏳ Checking video status: ${videoId}`);

  let attempts = 0;
  const maxAttempts = 60; // Check for up to 10 minutes (60 * 10 seconds)

  while (attempts < maxAttempts) {
    try {
      const response: any = await httpRequestJson<any>({
        method: 'GET',
        path: `/video/status?video_id=${videoId}`,
      });

      const status = response?.data?.status || response?.status;
      const videoUrl = response?.data?.video_url || response?.data?.videoUrl || response?.video_url;

      console.log(`[Attempt ${attempts + 1}/${maxAttempts}] Status: ${status}`);

      if (status === 'completed' && videoUrl) {
        console.log(`✅ Video ready! URL: ${videoUrl}`);
        return videoUrl;
      } else if (status === 'failed') {
        console.error(`❌ Video generation failed`);
        return null;
      }

      // Wait 10 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error: any) {
      // Status endpoint might not exist or return 404, try alternative
      console.log(`⚠️  Status check failed (attempt ${attempts + 1}), trying alternative...`);
      
      // Try alternative endpoint format
      try {
        const altResponse: any = await httpRequestJson<any>({
          method: 'GET',
          path: `/v2/video/status?video_id=${videoId}`,
        });
        
        const status = altResponse?.data?.status || altResponse?.status;
        const videoUrl = altResponse?.data?.video_url || altResponse?.video_url;
        
        if (status === 'completed' && videoUrl) {
          console.log(`✅ Video ready! URL: ${videoUrl}`);
          return videoUrl;
        }
      } catch {
        // Continue to next attempt
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Timeout waiting for video completion');
}

async function downloadAndSaveToBucket(videoUrl: string, bucketPath: string): Promise<void> {
  console.log(`\n💾 Downloading video from: ${videoUrl}`);
  console.log(`📦 Saving to bucket: ${bucketPath}`);

  try {
    const bucket = getGcsBucket();
    const file = bucket.file(bucketPath);

    // Download video
    const videoData = await new Promise<Buffer>((resolve, reject) => {
      https.get(videoUrl, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: Failed to download video`));
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    const sizeMB = (videoData.length / 1024 / 1024).toFixed(2);
    console.log(`✅ Downloaded ${sizeMB} MB`);

    // Upload to GCS
    await file.save(videoData, {
      contentType: 'video/mp4',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    console.log(`✅ Saved to GCS: gs://${bucket.name}/${bucketPath}`);

    // Generate signed URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`🌐 Access URL: ${signedUrl}`);
    console.log(`📋 GCS Path: gs://${bucket.name}/${bucketPath}`);

    // Verify file exists
    const [exists] = await file.exists();
    if (exists) {
      const [metadata] = await file.getMetadata();
      console.log(`✅ Verified: File exists (${(Number(metadata.size) / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      throw new Error('File not found in bucket after upload');
    }
  } catch (error: any) {
    console.error(`❌ Failed to save to bucket:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 HeyGen Video Creation & GCS Save Test');
  console.log('='.repeat(60));
  console.log(`Host Avatar: ${HOST_AVATAR}`);
  console.log(`Guest Avatar: ${GUEST_AVATAR}`);
  console.log(`Voice: Hindi Female (${HINDI_FEMALE_VOICE})`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    // Test 1: Create host video
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Host Avatar Video');
    console.log('='.repeat(60));

    const hostText = 'नमस्ते! मैं आज के पॉडकास्ट की मेज़बानी कर रहा हूं।';
    const hostVideoId = await createVideo(HOST_AVATAR, hostText, HINDI_FEMALE_VOICE);

    console.log(`\n⏳ Waiting for video to be ready...`);
    const hostVideoUrl = await checkVideoStatus(hostVideoId);

    if (hostVideoUrl) {
      const hostBucketPath = `marketing_avatars/test/host-${timestamp}.mp4`;
      await downloadAndSaveToBucket(hostVideoUrl, hostBucketPath);
      console.log(`\n✅ TEST 1 COMPLETE: Host video created and saved!`);
    } else {
      console.log(`\n⚠️  TEST 1: Host video creation completed but no URL found`);
    }

    // Wait a bit before next test
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Test 2: Create guest video
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Guest Avatar Video');
    console.log('='.repeat(60));

    const guestText = 'धन्यवाद! मुझे यहां आने का अवसर देने के लिए बहुत धन्यवाद।';
    const guestVideoId = await createVideo(GUEST_AVATAR, guestText, HINDI_FEMALE_VOICE);

    console.log(`\n⏳ Waiting for video to be ready...`);
    const guestVideoUrl = await checkVideoStatus(guestVideoId);

    if (guestVideoUrl) {
      const guestBucketPath = `marketing_avatars/test/guest-${timestamp}.mp4`;
      await downloadAndSaveToBucket(guestVideoUrl, guestBucketPath);
      console.log(`\n✅ TEST 2 COMPLETE: Guest video created and saved!`);
    } else {
      console.log(`\n⚠️  TEST 2: Guest video creation completed but no URL found`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 All Tests Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Both videos created and saved to GCS bucket`);
    console.log(`📁 Location: gs://${process.env.LIVEKIT_EGRESS_GCP_BUCKET || 'satsangrecordings'}/marketing_avatars/test/`);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});


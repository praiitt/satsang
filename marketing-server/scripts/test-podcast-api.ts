/**
 * Test script to test the podcast API end-to-end
 * Usage: tsx scripts/test-podcast-api.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

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

async function httpRequestJson<T>(
  url: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyString = options?.body ? JSON.stringify(options.body) : undefined;
    const isHttps = urlObj.protocol === 'https:';

    const client = isHttps ? https : http;

    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
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
              const error = new Error(
                json.error || json.message || `HTTP ${res.statusCode}`
              ) as Error & {
                statusCode?: number;
              };
              error.statusCode = res.statusCode;
              return reject(error);
            } catch {
              const error = new Error(
                `HTTP ${res.statusCode}: ${data.substring(0, 200)}`
              ) as Error & {
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

async function testCreatePodcast() {
  console.log('\n🧪 Testing Podcast API - Creating Podcast Job');
  console.log('='.repeat(60));

  const turns = [
    {
      speaker: 'host',
      text: 'नमस्ते! आज हम आध्यात्मिकता के बारे में बात करेंगे।',
    },
    {
      speaker: 'guest',
      text: 'धन्यवाद! मैं इस विषय पर चर्चा करने के लिए उत्सुक हूं।',
    },
  ];

  try {
    const response = await httpRequestJson<any>(`${AUTH_SERVER_URL}/podcast`, {
      method: 'POST',
      body: {
        hostAvatarId: HOST_AVATAR,
        guestAvatarId: GUEST_AVATAR,
        voiceIdHost: HINDI_FEMALE_VOICE,
        voiceIdGuest: HINDI_FEMALE_VOICE,
        turns,
      },
    });

    console.log('✅ Podcast job created!');
    console.log('Response:', JSON.stringify(response, null, 2));

    const jobId = response.jobId;
    if (!jobId) {
      throw new Error('No jobId in response');
    }

    console.log(`\n📋 Job ID: ${jobId}`);
    return jobId;
  } catch (error: any) {
    console.error('❌ Failed to create podcast job:', error.message);
    throw error;
  }
}

async function checkJobStatus(jobId: string) {
  console.log(`\n⏳ Checking job status: ${jobId}`);
  console.log('='.repeat(60));

  let attempts = 0;
  const maxAttempts = 30; // Check for up to 5 minutes (30 * 10 seconds)

  while (attempts < maxAttempts) {
    try {
      const response = await httpRequestJson<any>(`${AUTH_SERVER_URL}/podcast/${jobId}`, {
        method: 'GET',
      });

      console.log(`\n[Attempt ${attempts + 1}/${maxAttempts}] Status: ${response.status}`);
      console.log('Response:', JSON.stringify(response, null, 2));

      if (response.status === 'completed') {
        console.log('✅ Job completed!');
        return response;
      } else if (response.status === 'failed') {
        console.log('❌ Job failed!');
        return response;
      }

      // Wait 10 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error: any) {
      console.error(`❌ Error checking status (attempt ${attempts + 1}):`, error.message);
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Timeout waiting for job completion');
}

async function downloadVideo(videoUrl: string, bucketPath: string): Promise<void> {
  console.log(`\n💾 Downloading video from: ${videoUrl}`);
  console.log(`📦 Saving to bucket: ${bucketPath}`);

  try {
    const bucket = getGcsBucket();
    const file = bucket.file(bucketPath);

    // Download video using native https
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

    console.log(`✅ Downloaded ${(videoData.length / 1024 / 1024).toFixed(2)} MB`);

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
  } catch (error: any) {
    console.error(`❌ Failed to save to bucket:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Podcast API End-to-End Test');
  console.log('='.repeat(60));
  console.log(`Auth Server: ${AUTH_SERVER_URL}`);
  console.log(`Host Avatar: ${HOST_AVATAR}`);
  console.log(`Guest Avatar: ${GUEST_AVATAR}`);
  console.log(`Voice: Hindi Female (${HINDI_FEMALE_VOICE})`);

  try {
    // Step 1: Create podcast job
    const jobId = await testCreatePodcast();

    // Step 2: Check job status
    const jobStatus = await checkJobStatus(jobId);

    // Step 3: Download and save videos
    if (jobStatus.status === 'completed' && jobStatus.turns) {
      console.log('\n🎬 Processing completed videos...');
      console.log('='.repeat(60));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let savedCount = 0;

      for (const [index, turn] of jobStatus.turns.entries()) {
        if (turn.status === 'completed' && turn.videoUrl) {
          const bucketPath = `marketing_avatars/test/podcast-${jobId}-turn-${index + 1}-${timestamp}.mp4`;

          try {
            await downloadVideo(turn.videoUrl, bucketPath);
            savedCount++;
            console.log(`✅ Turn ${index + 1} saved successfully`);
          } catch (error: any) {
            console.error(`❌ Failed to save turn ${index + 1}:`, error.message);
          }
        } else {
          console.log(`⚠️  Turn ${index + 1} not ready (status: ${turn.status})`);
        }
      }

      console.log(
        `\n✅ Successfully saved ${savedCount} out of ${jobStatus.turns.length} video(s)`
      );
    } else {
      console.log('\n⚠️  Job not completed. Status:', jobStatus.status);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test Complete!');
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

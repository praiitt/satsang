/**
 * Simple test script to test podcast API with specific avatars
 * Usage: tsx scripts/test-podcast-simple.ts
 */
import 'dotenv/config';
import http from 'node:http';

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';

// Avatar IDs
const HOST_AVATAR = 'e4fe73ae6aad47338ec1e662d67fca46';
const GUEST_AVATAR = 'f31ce977d65e47caa3e92a46703d6b1f';

// Hindi female voice
const HINDI_FEMALE_VOICE = '9799f1ba6acd4b2b993fe813a18f9a91';

async function httpRequestJson<T>(
  url: string,
  options?: { method?: string; body?: unknown; cookie?: string }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyString = options?.body ? JSON.stringify(options.body) : undefined;

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyString ? Buffer.byteLength(bodyString) : 0,
          ...(options?.cookie ? { Cookie: options.cookie } : {}),
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
  console.log(`Host Avatar: ${HOST_AVATAR}`);
  console.log(`Guest Avatar: ${GUEST_AVATAR}`);
  console.log(`Voice: Hindi Female (${HINDI_FEMALE_VOICE})`);

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
    // Note: This will fail without auth, but let's see what happens
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
    if (error.statusCode === 401) {
      console.error('❌ Authentication required. Please login first.');
      console.error('   The API requires a valid session cookie.');
    } else {
      console.error('❌ Failed to create podcast job:', error.message);
    }
    throw error;
  }
}

async function checkJobStatus(jobId: string) {
  console.log(`\n⏳ Checking job status: ${jobId}`);
  console.log('='.repeat(60));

  let attempts = 0;
  const maxAttempts = 20; // Check for up to 3+ minutes

  while (attempts < maxAttempts) {
    try {
      const response = await httpRequestJson<any>(`${AUTH_SERVER_URL}/podcast/${jobId}`, {
        method: 'GET',
      });

      console.log(`\n[Attempt ${attempts + 1}/${maxAttempts}] Status: ${response.status}`);

      if (response.turns) {
        response.turns.forEach((turn: any, idx: number) => {
          console.log(`  Turn ${idx + 1} (${turn.speaker}): ${turn.status}`);
          if (turn.videoUrl) {
            console.log(`    ✅ Video URL: ${turn.videoUrl}`);
          }
        });
      }

      if (response.status === 'ready') {
        console.log('\n✅ Job completed!');
        return response;
      } else if (response.status === 'failed') {
        console.log('\n❌ Job failed!');
        return response;
      }

      // Wait 10 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    } catch (error: any) {
      if (error.statusCode === 401) {
        console.error('❌ Authentication required.');
        throw error;
      }
      console.error(`❌ Error checking status (attempt ${attempts + 1}):`, error.message);
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Timeout waiting for job completion');
}

async function main() {
  console.log('🚀 Podcast API Test');
  console.log('='.repeat(60));
  console.log(`Auth Server: ${AUTH_SERVER_URL}`);

  try {
    // Step 1: Create podcast job
    const jobId = await testCreatePodcast();

    // Step 2: Check job status
    const jobStatus = await checkJobStatus(jobId);

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test Complete!');
    console.log('='.repeat(60));

    if (jobStatus.status === 'ready') {
      console.log('✅ All videos created successfully!');
      console.log(`📁 Check local files in: auth-server/outputs/podcasts/${jobId}/`);
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.statusCode === 401) {
      console.error('\n💡 To test with authentication, you need to:');
      console.error('   1. Login via the frontend to get a session cookie');
      console.error('   2. Pass the cookie to this test script');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

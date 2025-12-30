'use strict';

/**
 * Quick script to confirm that a HeyGen talking-photo video can be created.
 *
 * Usage:
 *   HEYGEN_API_KEY=sk_xxx tsx scripts/test-heygen-talking-photo.ts \
 *     --avatar=f31ce977d65e47caa3e92a46703d6b1f \
 *     --voice=vct_english_us_michael \
 *     --text="Namaste..." \
 *     --background=white \
 *     --width=1080 \
 *     --height=1920
 *
 * The script:
 *   1. Tries multiple HeyGen endpoints (/v1/video.generate, /v2/video.generate, etc.)
 *   2. Polls status until the video is ready (default timeout ≈6 minutes)
 *   3. Prints the video download URL (does not upload to GCS)
 */
import 'dotenv/config';
import https from 'node:https';

type HttpMethod = 'GET' | 'POST';

interface CliOptions {
  avatarId: string;
  voiceId: string;
  text: string;
  background: string;
  width: number;
  height: number;
  pollIntervalMs: number;
  maxPollAttempts: number;
  useWebm: boolean; // Use /v1/video.webm endpoint (faster, but different payload structure)
  avatarPoseId?: string; // For WebM endpoint (e.g., "Vanessa-invest-20220722")
  avatarStyle?: string; // For WebM endpoint (e.g., "normal")
}

interface HeygenResponse<T = any> {
  data?: T;
  [key: string]: any;
}

const API_KEY = process.env.HEYGEN_API_KEY || '';
const DEFAULT_VOICE = process.env.TTS_VOICE_ID || 'vct_english_us_michael';
const BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

if (!API_KEY) {
  console.error('❌ HEYGEN_API_KEY env var is required');
  process.exit(1);
}

function parseCliArgs(): CliOptions {
  const defaults: CliOptions = {
    avatarId: 'f31ce977d65e47caa3e92a46703d6b1f', // Talking photo ID
    voiceId: DEFAULT_VOICE,
    text: 'Namaste! Main RRAASI satsang ka aapka adhyatmic guide hoon.',
    background: 'white',
    width: 1280,
    height: 720, // 720p for free plan (max resolution)
    pollIntervalMs: 10_000,
    maxPollAttempts: 36, // 6 min
    useWebm: false, // Default to talking photo (not WebM)
    avatarPoseId: 'Vanessa-invest-20220722', // Only used if useWebm=true
    avatarStyle: 'normal', // Only used if useWebm=true
  };

  const argPairs = process.argv.slice(2).map((arg) => {
    if (!arg.startsWith('--')) return null;
    const [key, value] = arg.substring(2).split('=');
    return { key, value: value ?? 'true' };
  });

  const opts = { ...defaults };
  for (const pair of argPairs) {
    if (!pair) continue;
    const { key, value } = pair;
    switch (key) {
      case 'avatar':
      case 'avatarId':
        opts.avatarId = value;
        break;
      case 'voice':
      case 'voiceId':
        opts.voiceId = value;
        break;
      case 'text':
        opts.text = value;
        break;
      case 'background':
        opts.background = value;
        break;
      case 'width':
        opts.width = Number(value) || opts.width;
        break;
      case 'height':
        opts.height = Number(value) || opts.height;
        break;
      case 'pollIntervalMs':
        opts.pollIntervalMs = Number(value) || opts.pollIntervalMs;
        break;
      case 'maxPolls':
      case 'maxPollAttempts':
        opts.maxPollAttempts = Number(value) || opts.maxPollAttempts;
        break;
      case 'webm':
      case 'useWebm':
        opts.useWebm = value === 'true' || value === '1';
        break;
      case 'avatarPoseId':
      case 'avatar_pose_id':
        opts.avatarPoseId = value;
        break;
      case 'avatarStyle':
      case 'avatar_style':
        opts.avatarStyle = value;
        break;
      default:
        console.warn(`⚠️  Unknown CLI flag "--${key}" ignored.`);
    }
  }

  return opts;
}

function httpRequest<T = HeygenResponse>(method: HttpMethod, path: string, body?: any): Promise<T> {
  const url = new URL(BASE_URL);
  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': API_KEY,
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

async function createVideo(opts: CliOptions): Promise<string> {
  let path: string;
  let payload: any;

  if (opts.useWebm) {
    // WebM endpoint - faster, simpler format (for regular avatars, not talking photos)
    path = '/v1/video.webm';
    payload = {
      avatar_pose_id: opts.avatarPoseId || opts.avatarId,
      avatar_style: opts.avatarStyle || 'normal',
      input_text: opts.text,
      voice_id: opts.voiceId,
      dimension: {
        width: opts.width,
        height: opts.height,
      },
    };
    console.log(`\n📡 POST ${path} (WebM format - for regular avatars only)`);
  } else {
    // Talking photo endpoint - uses talking_photo_id
    path = '/v2/video/generate';
    payload = {
      video_inputs: [
        {
          character: {
            type: 'talking_photo',
            talking_photo_id: opts.avatarId, // f31ce977d65e47caa3e92a46703d6b1f
          },
          voice: {
            type: 'text',
            input_text: opts.text,
            voice_id: opts.voiceId,
          },
        },
      ],
      background: opts.background,
      dimension: {
        width: opts.width,
        height: opts.height,
      },
    };
    console.log(`\n📡 POST ${path} (Talking Photo format)`);
  }

  try {
    const response = await httpRequest<HeygenResponse<{ video_id?: string }>>(
      'POST',
      path,
      payload
    );
    const videoId =
      response?.data?.video_id || (response as any)?.video_id || (response as any)?.id;
    if (!videoId) {
      throw new Error(`No video_id in response`);
    }
    console.log(`✅ Video request accepted! video_id=${videoId}`);
    return videoId;
  } catch (error: any) {
    console.error(`❌ ${path} failed: ${error.message}`);
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    throw error;
  }
}

async function pollStatus(videoId: string, opts: CliOptions): Promise<string> {
  // Try the most RESTful pattern first: /v2/video/{video_id}
  // This matches the pattern where create is /v2/video/generate
  const candidatePaths = [
    `/v2/video/${videoId}`, // Most likely - RESTful pattern
    `/v2/video/status/${videoId}`, // Alternative status endpoint
    `/v2/video/status?video_id=${videoId}`, // Query string variant
  ];

  for (let attempt = 1; attempt <= opts.maxPollAttempts; attempt++) {
    for (const path of candidatePaths) {
      try {
        const response = await httpRequest<HeygenResponse<{ status?: string; video_url?: string }>>(
          'GET',
          path
        );
        const status = response?.data?.status || (response as any)?.status;
        const videoUrl =
          response?.data?.video_url ||
          (response as any)?.video_url ||
          (response as any)?.data?.video_url;

        console.log(
          `🔁 [${attempt}/${opts.maxPollAttempts}] ${path} → status: ${status || 'unknown'}`
        );

        if (status === 'completed') {
          if (videoUrl) {
            console.log(`🎉 Video ready! URL: ${videoUrl}`);
            return videoUrl;
          } else {
            console.warn(`⚠️  Status is 'completed' but no video_url found in response`);
            // Try to extract URL from response structure
            const fullResponse = JSON.stringify(response, null, 2);
            console.log(`📄 Full response: ${fullResponse.slice(0, 500)}...`);
          }
        }
        if (status === 'failed') {
          throw new Error('Video generation failed per HeyGen status API');
        }
        // If we got a valid response (not 404), break and wait before next attempt
        if (status && status !== 'unknown') {
          break; // Found working endpoint, wait and retry
        }
      } catch (error: any) {
        // Only log if it's not a 404 (meaning endpoint might exist but video not ready)
        if (error.statusCode !== 404) {
          console.log(`⚠️  Status check via ${path} failed: ${error.message}`);
        }
        // Continue to next path
      }
    }

    await new Promise((resolve) => setTimeout(resolve, opts.pollIntervalMs));
  }

  throw new Error('Timed out waiting for video to complete');
}

async function main() {
  const opts = parseCliArgs();
  console.log('🚀 HeyGen Talking Photo Test');
  console.log(`🔑 Key prefix: ${API_KEY.slice(0, 10)}...`);
  console.log(`📹 Format: ${opts.useWebm ? 'WebM (regular avatar)' : 'Talking Photo'}`);
  console.log(`🖼️  Talking Photo ID: ${opts.avatarId}`);
  console.log(`🔊 Voice: ${opts.voiceId}`);
  console.log(`📝 Text : ${opts.text}`);

  const videoId = await createVideo(opts);
  const videoUrl = await pollStatus(videoId, opts);

  console.log('\n✅ Done!');
  console.log(`video_id: ${videoId}`);
  console.log(`video_url: ${videoUrl}`);
}

main().catch((err) => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});

import https from 'node:https';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
// Detect v2 API key (starts with sk_V2_) and use appropriate base URL
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

if (!HEYGEN_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[heygen] HEYGEN_API_KEY is not set. HeyGen integration will not work until configured.'
  );
}

interface HttpRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}

interface HeyGenCreateVideoResponse {
  success: boolean;
  videoId?: string;
  status?: string;
  videoUrl?: string; // Video URL may be available immediately in some cases
  raw: any;
}

interface HeyGenVideoStatusResponse {
  success: boolean;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'unknown';
  videoUrl?: string;
  thumbnailUrl?: string;
  raw: any;
}

export interface CreateAvatarClipParams {
  avatarId: string;
  text: string;
  voiceId?: string;
  ratio?: string;
  resolution?: string;
}

function httpRequestJson<T>(options: HttpRequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    // If path already starts with /v2/, use base URL as-is
    // Otherwise, check if we need to prepend /v2/ based on API key version
    let fullPath = options.path;
    const isV2Key = HEYGEN_API_KEY?.startsWith('sk_V2_');

    // If using v2 API key and path doesn't start with /v2/, prepend it
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
        const isStatusEndpoint = options.path.includes('status');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          // Check HTTP status code first - don't treat 4xx/5xx as success
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            let errorMessage = `HTTP ${res.statusCode}`;
            let errorDetails: any = null;

            // Don't log 404 errors for status endpoints - HeyGen doesn't have that endpoint (expected)
            // Only log non-404 errors or errors for non-status endpoints
            if (!(isStatusEndpoint && res.statusCode === 404)) {
              // eslint-disable-next-line no-console
              console.warn(`[heygen] HTTP ${res.statusCode} for ${options.method} ${options.path}`);
            }

            // Try to parse error response as JSON
            if (data) {
              try {
                errorDetails = JSON.parse(data);
                errorMessage = errorDetails.message || errorDetails.error || errorMessage;
                // Don't log 404 errors for status endpoints - HeyGen doesn't have that endpoint
                if (!isStatusEndpoint || res.statusCode !== 404) {
                  // eslint-disable-next-line no-console
                  console.error(`[heygen] API Error ${res.statusCode}:`, errorDetails);
                }
              } catch {
                // Not JSON, use raw response
                // Don't log 404 errors for status endpoints to reduce log spam
                if (!isStatusEndpoint || res.statusCode !== 404) {
                  // eslint-disable-next-line no-console
                  console.error(
                    `[heygen] API Error ${res.statusCode}. Raw response:`,
                    data.substring(0, 500)
                  );
                }
                errorMessage = `${errorMessage}: ${data.substring(0, 200)}`;
              }
            }

            const error = new Error(errorMessage) as Error & { statusCode?: number; details?: any };
            error.statusCode = res.statusCode;
            error.details = errorDetails || data;
            return reject(error);
          }

          if (!data) {
            // @ts-expect-error - allow void responses
            return resolve(undefined);
          }
          try {
            const json = JSON.parse(data);
            resolve(json as T);
          } catch (err) {
            // If JSON parsing fails, log the raw response for debugging
            // eslint-disable-next-line no-console
            console.error(
              `[heygen] Failed to parse JSON response. Status: ${res.statusCode}, Headers:`,
              res.headers
            );
            // eslint-disable-next-line no-console
            console.error(`[heygen] Raw response (first 500 chars):`, data.substring(0, 500));
            reject(
              new Error(
                `Invalid JSON response: ${String(err)}. Raw response: ${data.substring(0, 200)}`
              )
            );
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

/**
 * Create a talking avatar clip from text.
 *
 * NOTE: The exact endpoint and payload shape may vary slightly depending on the
 * HeyGen API version. Adjust `path` and `payload` according to your HeyGen docs:
 * https://docs.heygen.com/reference/create-video
 */
export async function createAvatarClip(
  params: CreateAvatarClipParams
): Promise<HeyGenCreateVideoResponse> {
  if (!HEYGEN_API_KEY) {
    // eslint-disable-next-line no-console
    console.error('[heygen] HEYGEN_API_KEY is not set. Cannot create avatar clip.');
    return {
      success: false,
      raw: { error: 'HEYGEN_API_KEY environment variable is not set' },
    };
  }

  try {
    // Use the working format from test script: talking_photo with dimension (width/height)
    // Parse resolution to width/height (e.g., "720p" -> 1280x720, "1080p" -> 1920x1080)
    let width = 1280;
    let height = 720; // Default to 720p for free plan

    if (params.resolution) {
      const res = params.resolution.toLowerCase();
      if (res === '1080p' || res === '1080') {
        width = 1920;
        height = 1080;
      } else if (res === '720p' || res === '720') {
        width = 1280;
        height = 720;
      }
    }

    // Use talking_photo format (matches working test script)
    const payload = {
      video_inputs: [
        {
          character: {
            type: 'talking_photo',
            talking_photo_id: params.avatarId, // f31ce977d65e47caa3e92a46703d6b1f
          },
          voice: {
            type: 'text',
            input_text: params.text,
            voice_id:
              params.voiceId || process.env.TTS_VOICE_ID || 'dc5370c68baa4905be87f702758df4b0',
          },
        },
      ],
      background: 'white', // Default background
      dimension: {
        width,
        height,
      },
    };

    // eslint-disable-next-line no-console
    console.log(`[heygen] Creating talking photo clip for avatar ${params.avatarId}`);

    const json = await httpRequestJson<any>({
      method: 'POST',
      path: '/v2/video/generate', // Use exact working endpoint
      body: payload,
    });

    // eslint-disable-next-line no-console
    console.log(`[heygen] ✅ Video creation request successful`);

    // Log successful response for debugging
    // eslint-disable-next-line no-console
    console.log(`[heygen] Response:`, JSON.stringify(json).substring(0, 500));

    // Try to normalize response shape - HeyGen v2 returns data.video_id for photo avatars
    const videoId =
      json?.data?.video_id || // Photo avatars return video_id directly
      json?.data?.task?.id || // Some formats return task.id
      json?.data?.id ||
      json?.task?.id ||
      json?.video_id ||
      json?.id ||
      json?.data?.task_id ||
      json?.task_id;

    // Check if video URL is already in the response
    const videoUrl = json?.data?.video_url || json?.data?.videoUrl || json?.video_url;
    const status = json?.data?.status || json?.status || (videoId ? 'queued' : 'unknown');

    // If video URL is already available in response, use it
    if (videoUrl) {
      // eslint-disable-next-line no-console
      console.log(`[heygen] Video URL available in response: ${videoUrl}`);
    }

    return {
      success: !!videoId,
      videoId,
      status: videoUrl ? 'ready' : status, // If URL is present, mark as ready
      videoUrl, // Include video URL if available
      raw: json,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[heygen] createAvatarClip error', error);
    return { success: false, raw: { error: String(error) } };
  }
}

/**
 * Get status for a HeyGen video.
 * Tries multiple endpoint formats to find the correct one.
 */
export async function getAvatarClipStatus(videoId: string): Promise<HeyGenVideoStatusResponse> {
  // Try the most likely status endpoints (matching test script)
  // Note: HeyGen status endpoint may not exist, but we try the RESTful pattern
  const statusEndpoints = [
    `/v2/video/${videoId}`, // Most RESTful pattern (matches /v2/video/generate)
    `/v2/video/status/${videoId}`, // Alternative status endpoint
    `/v2/video/status?video_id=${encodeURIComponent(videoId)}`, // Query string variant
  ];

  let lastError: Error | null = null;

  // Try endpoints quickly with timeout (fail fast if they don't exist)
  for (const endpoint of statusEndpoints) {
    try {
      // Add timeout to fail fast (1 second per endpoint - HeyGen status endpoint likely doesn't exist)
      const json: any = (await Promise.race([
        httpRequestJson<any>({
          method: 'GET',
          path: endpoint,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
      ])) as any;

      // Normalize status
      const rawStatus = json?.data?.status || json?.status || 'unknown';
      let status: HeyGenVideoStatusResponse['status'] = 'unknown';
      if (typeof rawStatus === 'string') {
        const s = rawStatus.toLowerCase();
        if (s === 'pending' || s === 'queued') status = 'queued';
        else if (s === 'processing' || s === 'rendering') status = 'processing';
        else if (s === 'completed' || s === 'ready' || s === 'done') status = 'ready';
        else if (s === 'failed' || s === 'error') status = 'failed';
      }

      const videoUrl = json?.data?.video_url || json?.data?.videoUrl || json?.video_url;
      const thumbnailUrl = json?.data?.cover_url || json?.data?.thumbnail_url || undefined;

      // Only log if we actually got a successful response
      // eslint-disable-next-line no-console
      console.log(`[heygen] ✅ Status check successful (${endpoint}): ${status}`);
      if (videoUrl) {
        // eslint-disable-next-line no-console
        console.log(`[heygen] Video URL: ${videoUrl}`);
      }

      return {
        success: true,
        status,
        videoUrl,
        thumbnailUrl,
        raw: json,
      };
    } catch (error: any) {
      lastError = error as Error;
      // Don't log individual endpoint failures - HeyGen has no status endpoint
      // Only continue to next endpoint silently
      continue;
    }
  }

  // All endpoints failed - HeyGen doesn't have a public status endpoint
  // This is expected, so don't log as an error to avoid log spam
  // Return unknown status silently
  return {
    success: false,
    status: 'unknown',
    raw: { error: lastError?.message || 'Status endpoint not available (HeyGen limitation)' },
  };
}

/**
 * Health check: Test HeyGen API connectivity and list available avatars.
 * This helps verify API key is valid and what avatars are available.
 */
export async function healthCheck(): Promise<{
  success: boolean;
  apiKeySet: boolean;
  apiKeyPrefix?: string;
  baseUrl: string;
  avatars?: Array<{ id: string; name?: string; type?: string }>;
  error?: string;
  rawResponse?: any;
}> {
  const result = {
    success: false,
    apiKeySet: !!HEYGEN_API_KEY,
    apiKeyPrefix: HEYGEN_API_KEY ? HEYGEN_API_KEY.substring(0, 10) + '...' : undefined,
    baseUrl: HEYGEN_BASE_URL,
    avatars: undefined as Array<{ id: string; name?: string; type?: string }> | undefined,
    error: undefined as string | undefined,
    rawResponse: undefined as any,
  };

  if (!HEYGEN_API_KEY) {
    result.error = 'HEYGEN_API_KEY environment variable is not set';
    return result;
  }

  try {
    // Try to list avatars - common endpoints: /v1/avatar.list, /v1/avatars, /v2/avatars
    // We'll try multiple endpoints to see which one works
    const avatarEndpoints = ['/v1/avatar.list', '/v1/avatars', '/v2/avatars', '/v1/avatar'];

    let lastError: Error | null = null;
    for (const endpoint of avatarEndpoints) {
      try {
        // eslint-disable-next-line no-console
        console.log(`[heygen-health] Trying endpoint: ${endpoint}`);
        const json: any = await httpRequestJson<any>({
          method: 'GET',
          path: endpoint,
        });

        result.rawResponse = json;

        // Try to extract avatars from various response formats
        const avatarsList =
          json?.data?.avatars ||
          json?.data?.list ||
          json?.avatars ||
          json?.data ||
          (Array.isArray(json) ? json : []);

        if (Array.isArray(avatarsList) && avatarsList.length > 0) {
          result.avatars = avatarsList.map((a: any) => ({
            id: a.avatar_id || a.id || a.avatarId || String(a),
            name: a.name || a.avatar_name || undefined,
            type: a.type || a.avatar_type || undefined,
          }));
          result.success = true;
          // eslint-disable-next-line no-console
          console.log(
            `[heygen-health] ✅ Success! Found ${result.avatars.length} avatars via ${endpoint}`
          );
          return result;
        } else if (json && typeof json === 'object') {
          // Even if no avatars, getting a valid JSON response means API is working
          result.success = true;
          result.error = `API connected but no avatars found in response from ${endpoint}`;
          // eslint-disable-next-line no-console
          console.log(
            `[heygen-health] ✅ API connected but no avatars in response from ${endpoint}`
          );
          return result;
        }
      } catch (err) {
        lastError = err as Error;
        // Continue to next endpoint
        continue;
      }
    }

    // If all endpoints failed, return error
    result.error = `All avatar endpoints failed. Last error: ${lastError?.message || 'Unknown'}`;
    result.rawResponse = { lastError: lastError?.message };
    return result;
  } catch (error: any) {
    result.error = String(error?.message || error);
    result.rawResponse = { error: String(error) };
    // eslint-disable-next-line no-console
    console.error('[heygen-health] Health check failed:', error);
    return result;
  }
}

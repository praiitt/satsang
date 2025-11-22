import { exec } from 'child_process';
import { createWriteStream, unlink } from 'fs';
import * as fs from 'fs/promises';
import http from 'http';
import https from 'https';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

interface StitchVideosParams {
  videoUrls: string[];
  outputFileName?: string;
  outputDir?: string;
}

interface StitchVideosResult {
  success: boolean;
  outputPath?: string;
  outputUrl?: string;
  error?: string;
}

/**
 * Resolve HeyGen video ID to direct video URL
 * Uses the existing getAvatarClipStatus function from heygen service
 */
async function resolveHeyGenVideoId(videoId: string): Promise<string | null> {
  if (!HEYGEN_API_KEY) {
    return null;
  }

  // Import the HeyGen service function dynamically to avoid circular dependencies
  try {
    const { getAvatarClipStatus } = await import('./heygen.js');
    const statusResult = await getAvatarClipStatus(videoId);

    if (statusResult.success && statusResult.videoUrl) {
      return statusResult.videoUrl;
    }
  } catch (error: any) {
    console.warn(`[video-stitcher] Failed to use heygen service: ${error.message}`);
  }

  // Fallback: Try direct API calls
  const candidatePaths = [
    `/v2/video/${videoId}`,
    `/v2/video/status/${videoId}`,
    `/v1/video/${videoId}`,
    `/v1/video/status/${videoId}`,
  ];

  for (const apiPath of candidatePaths) {
    try {
      const response = await httpRequestJson<any>('GET', apiPath);

      // Try to extract video URL from various response formats
      const videoUrl =
        response?.data?.video_url ||
        response?.data?.videoUrl ||
        response?.video_url ||
        response?.videoUrl ||
        response?.data?.url ||
        response?.url ||
        response?.data?.download_url ||
        response?.download_url;

      if (videoUrl) {
        return videoUrl;
      }
    } catch (error: any) {
      // Continue to next endpoint
      continue;
    }
  }

  return null;
}

/**
 * Check if URL is a HeyGen video ID (dashboard URL or just ID)
 */
function isHeyGenVideoId(url: string): boolean {
  // Check if it's a HeyGen dashboard URL or just an ID
  return (
    url.includes('app.heygen.com/videos/') ||
    url.includes('heygen.com/videos/') ||
    /^[a-f0-9]{32}$/i.test(url.trim()) // 32 char hex string (HeyGen video ID format)
  );
}

/**
 * Extract video ID from HeyGen URL or return as-is if already an ID
 */
function extractHeyGenVideoId(url: string): string {
  // If it's a dashboard URL, extract the ID
  const match = url.match(/videos\/([a-f0-9]{32})/i);
  if (match) {
    return match[1];
  }
  // If it's already just an ID, return it
  if (/^[a-f0-9]{32}$/i.test(url.trim())) {
    return url.trim();
  }
  return url;
}

/**
 * HTTP request helper for HeyGen API
 */
function httpRequestJson<T>(method: 'GET' | 'POST', path: string, body?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(HEYGEN_BASE_URL);
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

/**
 * Download a video from a URL to a local file
 * Also handles local file paths (uploads)
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  // Check if it's a local file path (starts with /uploads/ or is an absolute path)
  // Also check if it contains 'uploads' or 'outputs' in the path
  const isLocalPath =
    url.startsWith('/uploads/') ||
    url.startsWith('/outputs/') ||
    path.isAbsolute(url) ||
    url.includes('uploads/') ||
    url.includes('outputs/');

  if (isLocalPath) {
    // It's a local file, copy it instead of downloading
    let sourcePath: string;

    if (path.isAbsolute(url)) {
      // Already an absolute path, use as-is
      sourcePath = url;
    } else if (url.startsWith('/')) {
      // Relative to project root (might be from Next.js which runs from project root)
      // Auth-server might run from auth-server/ directory, so go up one level
      const cwd = process.cwd();
      if (cwd.endsWith('auth-server')) {
        sourcePath = path.join(path.dirname(cwd), url);
      } else {
        sourcePath = path.join(cwd, url);
      }
    } else {
      // Relative path - resolve from current working directory
      sourcePath = path.resolve(process.cwd(), url);
    }

    console.log(`[video-stitcher] Copying local file`);
    console.log(`[video-stitcher]   Source: ${sourcePath}`);
    console.log(`[video-stitcher]   Target: ${outputPath}`);
    console.log(`[video-stitcher]   CWD: ${process.cwd()}`);

    // Check if source file exists
    try {
      await fs.access(sourcePath);
      console.log(`[video-stitcher] ✅ Source file exists`);
    } catch (accessError) {
      // Try alternative path if auth-server is in subdirectory
      const altPath = path.join(path.dirname(process.cwd()), url.replace(/^\//, ''));
      console.log(`[video-stitcher] Trying alternative path: ${altPath}`);
      try {
        await fs.access(altPath);
        sourcePath = altPath;
        console.log(`[video-stitcher] ✅ Found file at alternative path`);
      } catch {
        throw new Error(`Source file does not exist at ${sourcePath} or ${altPath}`);
      }
    }

    try {
      await fs.copyFile(sourcePath, outputPath);
      console.log(`[video-stitcher] ✅ Successfully copied file`);
      return;
    } catch (error: any) {
      throw new Error(`Failed to copy local file from ${sourcePath}: ${error.message}`);
    }
  }

  // It's a remote URL, download it
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(outputPath);

    protocol
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download video: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        unlink(outputPath, () => {}); // Delete file on error
        reject(err);
      });
  });
}

/**
 * Check if ffmpeg is available
 */
async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve video URLs - convert HeyGen video IDs to direct URLs
 */
async function resolveVideoUrls(urls: string[]): Promise<{ urls: string[]; errors: string[] }> {
  const resolvedUrls: string[] = [];
  const errors: string[] = [];

  for (const url of urls) {
    if (isHeyGenVideoId(url)) {
      const videoId = extractHeyGenVideoId(url);
      console.log(`[video-stitcher] Resolving HeyGen video ID: ${videoId}`);
      const resolvedUrl = await resolveHeyGenVideoId(videoId);
      if (resolvedUrl) {
        console.log(`[video-stitcher] ✅ Resolved to: ${resolvedUrl}`);
        resolvedUrls.push(resolvedUrl);
      } else {
        const errorMsg = `Could not resolve HeyGen video ID: ${videoId}. Please get the direct video download URL from the HeyGen dashboard (https://app.heygen.com/videos/${videoId})`;
        console.warn(`[video-stitcher] ⚠️  ${errorMsg}`);
        errors.push(errorMsg);
      }
    } else {
      // Check if it's a local file path (absolute path or contains uploads/outputs)
      const isLocalPath =
        path.isAbsolute(url) ||
        url.startsWith('/uploads/') ||
        url.startsWith('/outputs/') ||
        url.includes('uploads/') ||
        url.includes('outputs/');

      if (isLocalPath) {
        // It's a local file path, use it as-is
        console.log(`[video-stitcher] ✅ Using local file path: ${url}`);
        resolvedUrls.push(url);
      } else {
        // Try to validate as URL
        try {
          new URL(url);
          resolvedUrls.push(url);
        } catch {
          errors.push(`Invalid URL or file path: ${url}`);
        }
      }
    }
  }

  return { urls: resolvedUrls, errors };
}

/**
 * Stitch multiple videos together into a single video
 */
export async function stitchVideos(params: StitchVideosParams): Promise<StitchVideosResult> {
  const { videoUrls, outputFileName, outputDir } = params;

  if (!videoUrls || videoUrls.length === 0) {
    return {
      success: false,
      error: 'No video URLs provided',
    };
  }

  // Resolve HeyGen video IDs to direct URLs
  console.log(`[video-stitcher] Resolving ${videoUrls.length} video URL(s)...`);
  const { urls: resolvedUrls, errors } = await resolveVideoUrls(videoUrls);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Failed to resolve video URLs:\n${errors.join('\n')}\n\nPlease provide direct video download URLs instead of HeyGen video IDs.`,
    };
  }

  if (resolvedUrls.length === 0) {
    return {
      success: false,
      error: 'No valid video URLs after resolution',
    };
  }

  // Check if ffmpeg is available
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    return {
      success: false,
      error: 'ffmpeg is not installed. Please install ffmpeg to use video stitching.',
    };
  }

  // Create output directory if it doesn't exist
  const finalOutputDir = outputDir || path.join(process.cwd(), 'temp', 'videos');
  await fs.mkdir(finalOutputDir, { recursive: true });

  // Generate output filename
  const timestamp = Date.now();
  const finalOutputFileName = outputFileName || `stitched_${timestamp}.mp4`;
  const outputPath = path.join(finalOutputDir, finalOutputFileName);

  // Create temp directory for downloaded videos
  const tempDir = path.join(finalOutputDir, `temp_${timestamp}`);
  await fs.mkdir(tempDir, { recursive: true });

  const downloadedFiles: string[] = [];
  const cleanupFiles: string[] = [];

  try {
    // Download all videos
    console.log(`[video-stitcher] Downloading ${resolvedUrls.length} videos...`);
    for (let i = 0; i < resolvedUrls.length; i++) {
      const url = resolvedUrls[i];

      // Determine file extension
      let ext = '.mp4';
      try {
        // Try to parse as URL first
        if (url.startsWith('http://') || url.startsWith('https://')) {
          ext = path.extname(new URL(url).pathname) || '.mp4';
        } else {
          // It's a local file path
          ext = path.extname(url) || '.mp4';
        }
      } catch {
        // If URL parsing fails, try path.extname
        ext = path.extname(url) || '.mp4';
      }

      const tempFile = path.join(tempDir, `video_${i}${ext}`);

      console.log(
        `[video-stitcher] Downloading/copying video ${i + 1}/${resolvedUrls.length} from ${url}`
      );
      try {
        await downloadVideo(url, tempFile);
        downloadedFiles.push(tempFile);
        cleanupFiles.push(tempFile);
      } catch (downloadError: any) {
        console.error(
          `[video-stitcher] Failed to download/copy video ${i + 1}:`,
          downloadError.message
        );
        throw new Error(`Failed to process video ${i + 1}: ${downloadError.message}`);
      }
    }

    // Create a file list for ffmpeg concat
    const concatFile = path.join(tempDir, 'concat.txt');
    const concatContent = downloadedFiles
      .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
      .join('\n');

    await fs.writeFile(concatFile, concatContent);
    cleanupFiles.push(concatFile);

    // Use ffmpeg to concatenate videos
    // Method 1: Using concat demuxer (works for same codec/format)
    console.log('[video-stitcher] Stitching videos with ffmpeg...');

    try {
      // Try concat demuxer first (faster, but requires same codec)
      const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}"`;
      await execAsync(ffmpegCmd);
      console.log('[video-stitcher] ✅ Videos stitched successfully using concat demuxer');
    } catch (concatError) {
      console.log('[video-stitcher] Concat demuxer failed, trying re-encoding...');

      // Fallback: Re-encode all videos to ensure compatibility
      // This is slower but more reliable
      const reencodeCmd = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c:v libx264 -c:a aac -preset medium -crf 23 "${outputPath}"`;
      await execAsync(reencodeCmd);
      console.log('[video-stitcher] ✅ Videos stitched successfully using re-encoding');
    }

    // Clean up temp files
    console.log('[video-stitcher] Cleaning up temporary files...');
    for (const file of cleanupFiles) {
      try {
        await fs.unlink(file);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    // Remove temp directory
    try {
      await fs.rmdir(tempDir);
    } catch (err) {
      // Ignore if directory not empty
    }

    return {
      success: true,
      outputPath,
      outputUrl: `/api/videos/${finalOutputFileName}`, // Relative URL for serving
    };
  } catch (error: any) {
    // Clean up on error
    console.error('[video-stitcher] Error:', error);
    console.error('[video-stitcher] Error stack:', error?.stack);

    for (const file of cleanupFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore cleanup errors
      }
    }

    try {
      await fs.rmdir(tempDir);
    } catch {
      // Ignore
    }

    // Provide more detailed error message
    const errorMessage =
      error?.message || error?.toString() || 'Unknown error occurred while stitching videos';
    console.error('[video-stitcher] Final error message:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get video info using ffprobe
 */
export async function getVideoInfo(videoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
    );
    return JSON.parse(stdout);
  } catch (error: any) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

function httpRequest<T = any>(method: 'GET' | 'POST', path: string, body?: any): Promise<T> {
  const url = new URL(HEYGEN_BASE_URL);
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
          'X-Api-Key': HEYGEN_API_KEY || '',
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

export async function POST(request: NextRequest) {
  if (!HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: 'HEYGEN_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { voiceId, text } = body as { voiceId?: string; text?: string };

    if (!voiceId) {
      return NextResponse.json(
        { error: 'voiceId is required' },
        { status: 400 }
      );
    }

    const previewText = text || 'Hello, this is a voice preview.';

    // Try HeyGen voice preview endpoint
    // Note: HeyGen might have a voice preview API, but if not, we can generate a short video
    // For now, let's try to generate a very short talking photo video as preview
    const payload = {
      video_inputs: [
        {
          character: {
            type: 'talking_photo',
            talking_photo_id: 'f31ce977d65e47caa3e92a46703d6b1f', // Use default talking photo
          },
          voice: {
            type: 'text',
            input_text: previewText,
            voice_id: voiceId,
          },
        },
      ],
      background: 'white',
      dimension: {
        width: 1280,
        height: 720,
      },
    };

    const response = await httpRequest<any>('POST', '/v2/video/generate', payload);
    
    const videoId = response?.data?.video_id || response?.data?.id || response?.video_id || response?.id;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Failed to create preview video' },
        { status: 500 }
      );
    }

    // Return the video ID - frontend can poll for status or we can return a direct URL if available
    return NextResponse.json({
      success: true,
      videoId,
      message: 'Preview video is being generated. Check HeyGen dashboard for the video.',
    });
  } catch (error: any) {
    console.error('[preview-voice] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to preview voice' },
      { status: 500 }
    );
  }
}


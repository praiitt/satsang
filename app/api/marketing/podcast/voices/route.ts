/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com';

function httpRequest<T = any>(method: 'GET' | 'POST', path: string): Promise<T> {
  const url = new URL(HEYGEN_BASE_URL);

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
    req.end();
  });
}

export async function GET(request: NextRequest) {
  if (!HEYGEN_API_KEY) {
    console.error('[voices] HEYGEN_API_KEY not configured');
    return NextResponse.json(
      { error: 'HEYGEN_API_KEY not configured', voices: [] },
      { status: 500 }
    );
  }

  try {
    // Try the v2/voices endpoint (confirmed working)
    const path = '/v2/voices';
    let voices: any[] = [];

    try {
      const response = await httpRequest<any>('GET', path);
      
      console.log('[voices] Raw response structure:', {
        hasData: !!response?.data,
        hasVoices: !!response?.data?.voices,
        hasList: !!response?.data?.list,
        voicesLength: response?.data?.voices?.length,
        listLength: response?.data?.list?.length,
        isArray: Array.isArray(response),
        keys: Object.keys(response?.data || {}),
      });
      
      // HeyGen v2/voices returns { data: { voices: [...] } }
      if (response?.data?.voices && Array.isArray(response.data.voices)) {
        voices = response.data.voices;
        console.log(`[voices] Found ${voices.length} voices in data.voices`);
      } else if (response?.data?.list && Array.isArray(response.data.list)) {
        voices = response.data.list;
        console.log(`[voices] Found ${voices.length} voices in data.list`);
      } else if (Array.isArray(response?.data)) {
        voices = response.data;
        console.log(`[voices] Found ${voices.length} voices in data array`);
      } else if (Array.isArray(response)) {
        voices = response;
        console.log(`[voices] Found ${voices.length} voices in root array`);
      } else {
        console.warn('[voices] Unexpected response structure:', JSON.stringify(response).substring(0, 500));
      }
    } catch (error: any) {
      console.error(`[voices] Error with ${path}:`, error.message, error.statusCode);
      throw error;
    }

    // Format for frontend
    const formatted = voices.map((voice) => ({
      id: voice.voice_id || voice.id || voice.voiceId,
      name: voice.name || voice.voice_name || voice.display_name || 'Unnamed Voice',
      language: voice.language || voice.lang || '',
      gender: voice.gender || '',
      accent: voice.accent || '',
      previewAudio: voice.preview_audio || voice.previewAudio || '', // For instant preview
    })).filter((v) => v.id); // Only include items with valid IDs

    console.log(`[voices] Returning ${formatted.length} formatted voices`);
    return NextResponse.json({ voices: formatted });
  } catch (error: any) {
    console.error('[voices] Error fetching:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch voices', voices: [] },
      { status: 500 }
    );
  }
}


import { exec } from 'child_process';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import OpenAI from 'openai';
import { generateImagenImage } from './imagen-image.js';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getVideoInfo } from './video-stitcher.js';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COIN_SERVICE_URL = process.env.COIN_SERVICE_URL ||
  'https://us-central1-rraasi-8a619.cloudfunctions.net/rraasi-coin-service';

/**
 * Deduct 300 coins for video creation via coin service internal endpoint.
 * Called after videoUrl is successfully written to Firestore.
 * Never throws — coin failure must not break the video pipeline.
 */
async function deductVideoCoins(userId: string, trackId: string) {
  try {
    console.log(`[Coin Deduction] Deducting music_video_creation (300) coins for user: ${userId}`);
    const res = await fetch(`${COIN_SERVICE_URL}/internal/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || ''
      },
      body: JSON.stringify({
        userId,
        featureId: 'music_video_creation',
        metadata: { trackId, source: 'video_maker' }
      })
    });
    const result = await res.json() as any;
    if (result.success) {
      console.log(`[Coin Deduction] ✅ Video coins deducted. New balance: ${result.newBalance}`);
    } else {
      console.warn(`[Coin Deduction] ⚠️ Could not deduct video coins: ${result.error}`);
    }
  } catch (err) {
    console.error(`[Coin Deduction] ❌ Error calling coin service for video:`, err);
  }
}


export interface VideoMakerParams {
  audioUrl: string;
  userId?: string;
  trackId?: string;
  title?: string;   // optional track title for scene context
  prompt?: string;  // optional track prompt/description for scene context
  lyrics?: string;  // optional lyrics to generate meaningful scenes
}

export interface VideoMakerResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

// ─── Download Helper ────────────────────────────────────────────────────────

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error(`No body in response`);
  }

  const fileStream = createWriteStream(outputPath);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) fileStream.write(value);
    }
  } finally {
    fileStream.end();
    // Wait for the stream to finish
    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
  }
}

// ─── Upload Helper ──────────────────────────────────────────────────────────

async function uploadToFirebase(localPath: string, destination: string, contentType = 'video/mp4'): Promise<string> {
  const bucket = getStorage().bucket('rraasi-8a619-music-storage');

  await bucket.upload(localPath, {
    destination,
    public: true,
    metadata: { contentType }
  });

  const file = bucket.file(destination);
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${destination}`;
}

// ─── SCENE GENERATION ────────────────────────────────────────────────────────

/**
 * Generate N spiritual/devotional scene prompts using GPT-4o.
 * Uses track title, prompt, and lyrics as context if available.
 */
async function generateScenePrompts(
  numScenes: number,
  title?: string,
  trackPrompt?: string,
  lyrics?: string
): Promise<string[]> {
  console.log(`[video-maker] 🔍 Generating ${numScenes} spiritual scene prompts...`);

  const contextHint = [
    title ? `Song title: "${title}"` : null,
    trackPrompt ? `Song description/theme: "${trackPrompt}"` : null,
    lyrics ? `Song lyrics:\n"${lyrics}"\n\nAnalyze these lyrics and generate deep, meaningful imagery that matches the lyrical content, characters, and emotion of the song.` : null,
  ].filter(Boolean).join('\n\n') || 'A deeply spiritual devotional Indian music track.';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert in Indian devotional music, Hindu iconography, and spiritual visual art.

Generate exactly ${numScenes} DALL-E 3 image generation prompts for a devotional music video.

CRITICAL RULES:
1. Keep each prompt under 3800 characters.
2. Start each prompt with: "In the style of Raja Ravi Varma's classical Indian oil paintings,"
3. If Hindu deities are relevant (Lakshmi, Ram, Krishna, Shiva, Durga, Hanuman, Radha, Vishnu, Ganesh, Saraswati, etc.), include their full traditional iconographic description:
   - Skin tone, clothing (silk saree/dhoti, colors), ornaments (crown, earrings, necklaces, bangles), divine attributes (items held in each hand), posture.
4. Visual style MUST be: "Raja Ravi Varma classical Indian oil painting style, richly detailed devotional artwork, warm jewel-toned colors, traditional Indian aesthetics, museum-quality painting"
5. Each scene should be distinct and progress naturally through a spiritual journey.
6. Do NOT use the word 'photorealistic'. Use 'classical painting', 'devotional artwork', 'traditional Indian art'.
7. Output ONLY a valid JSON array of ${numScenes} strings. No extra keys, no markdown.`
      },
      {
        role: 'user',
        content: `${contextHint}\n\nGenerate EXACTLY ${numScenes} sequential scene prompts for a devotional music video. Output a JSON array of ${numScenes} strings.`
      }
    ],
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content || '{"scenes":[]}';
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  // Accept either { scenes: [...] } or { prompts: [...] } or a top-level array key
  const arr: string[] = parsed.scenes || parsed.prompts || parsed.prompts_list || Object.values(parsed).find(v => Array.isArray(v)) || [];

  if (arr.length === 0) {
    console.warn('[video-maker] GPT returned no scene prompts, using fallback.');
    return Array(numScenes).fill(
      'In the style of Raja Ravi Varma\'s classical Indian oil paintings, a divine spiritual scene, ancient Indian temple at golden hour, volumetric golden light shafts through carved stone pillars, flower petals floating, ethereal atmosphere, rich jewel-toned colors, museum-quality devotional artwork'
    );
  }

  // Pad or trim to exactly numScenes
  while (arr.length < numScenes) arr.push(arr[arr.length - 1]);
  const result = arr.slice(0, numScenes).map(p => {
    const s = String(p);
    return s.length > 3900 ? s.substring(0, 3900) : s;
  });

  console.log(`[video-maker] ✅ Generated ${result.length} scene prompts`);
  return result;
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

export async function createMusicVideo(params: VideoMakerParams): Promise<VideoMakerResult> {
  const { audioUrl, userId = 'anonymous', trackId, title, prompt, lyrics } = params;

  const timestamp = Date.now();
  const workDir = path.join(process.cwd(), 'temp', `videomaker_${timestamp}`);

  // ── Firestore lock: prevent duplicate simultaneous generation ───────────
  if (trackId) {
    const db = getFirestore();
    const trackRef = db.collection('music_tracks').doc(trackId);
    const snap = await trackRef.get();
    const data = snap.data();

    if (data?.videoUrl) {
      console.log(`[video-maker] ⚡ Track ${trackId} already has a video — skipping.`);
      return { success: true, videoUrl: data.videoUrl };
    }
    if (data?.videoGenerating === true) {
      const startedAt = data.videoGeneratingStartedAt?.toMillis ? data.videoGeneratingStartedAt.toMillis() : 0;
      const now = Date.now();
      const lockAgeMinutes = (now - startedAt) / 60000;

      if (startedAt && lockAgeMinutes < 15) {
        console.log(`[video-maker] ⚡ Track ${trackId} is already being generated (started ${lockAgeMinutes.toFixed(1)} mins ago) — skipping duplicate.`);
        return { success: false, error: 'Video generation already in progress for this track' };
      } else {
        console.log(`[video-maker] 🔓 Clearing stale lock for track ${trackId} (was stuck for ${lockAgeMinutes.toFixed(1)} mins)`);
      }
    }
    // Set lock
    await trackRef.update({ 
      videoGenerating: true, 
      videoGeneratingStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp() 
    });
  }
  // ────────────────────────────────────────────────────────────────────────

  try {
    await fs.mkdir(workDir, { recursive: true });

    // 1. Download Audio
    console.log(`[video-maker] Downloading audio...`);
    const localAudioPath = path.join(workDir, 'audio.mp3');
    await downloadFile(audioUrl, localAudioPath);

    // 2. Get Audio Duration
    const audioInfo = await getVideoInfo(localAudioPath);
    const totalDuration = parseFloat(audioInfo?.format?.duration || '0');
    if (!totalDuration || totalDuration <= 0) {
      throw new Error('Failed to extract audio duration');
    }
    console.log(`[video-maker] Audio duration: ${totalDuration}s`);

    // 3. Generate Scene Prompts (uses title/prompt/lyrics for context)
    // 1 image per ~20 seconds, min 4, max 12
    const targetImages = Math.min(12, Math.max(4, Math.floor(totalDuration / 20)));
    const prompts = await generateScenePrompts(targetImages, title, prompt, lyrics);

    const durationPerImage = totalDuration / prompts.length;
    console.log(`[video-maker] Generated ${prompts.length} scene prompts. Duration per image: ${durationPerImage.toFixed(2)}s`);

    // 4. Generate Images via Imagen 3 (writes directly to disk)
    console.log(`[video-maker] 🖼️  Generating ${prompts.length} images via Imagen 3...`);
    const localImagePaths: string[] = [];
    const firebaseImageUrls: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      console.log(`[video-maker] Generating image ${i + 1}/${prompts.length}...`);
      const imgPath = path.join(workDir, `img_${i}.jpg`);

      const result = await generateImagenImage({ prompt: prompts[i], outputPath: imgPath });

      if (result) {
        localImagePaths.push(imgPath);
      } else {
        console.warn(`[video-maker] Image ${i + 1} failed, reusing previous.`);
        const fallback = localImagePaths[i - 1] || null;
        if (fallback) {
          await fs.copyFile(fallback, imgPath);
          localImagePaths.push(imgPath);
        } else {
          await downloadFile(
            'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=1920&auto=format&fit=crop',
            imgPath
          );
          localImagePaths.push(imgPath);
        }
      }

      // Backup to Firebase immediately
      console.log(`[video-maker] Backing up image ${i + 1} to Firebase Storage...`);
      const imgFirebaseUrl = await uploadToFirebase(
        imgPath,
        `video-maker/${userId}/${trackId || timestamp}/img_${i}.jpg`,
        'image/jpeg'
      );
      firebaseImageUrls.push(imgFirebaseUrl);
    }

    // Save image URLs to Firestore immediately (before FFmpeg, so they're never lost)
    if (trackId && firebaseImageUrls.length > 0) {
      console.log(`[video-maker] Saving generated image URLs to Firestore track ${trackId}...`);
      await getFirestore().collection('music_tracks').doc(trackId).update({
        generatedVideoImages: firebaseImageUrls,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    // 5. Create Ken Burns Video Slides via FFmpeg
    console.log(`[video-maker] Creating video slides using FFmpeg...`);
    const crossfadeDuration = 1.2; // seconds of crossfade overlap
    const slidePaths: string[] = [];

    for (let i = 0; i < localImagePaths.length; i++) {
      const slidePath = path.join(workDir, `slide_${i}.mp4`);
      slidePaths.push(slidePath);

      const slideDuration = durationPerImage + crossfadeDuration;
      const frames = Math.ceil(slideDuration * 25);

      // Alternate zoom direction per slide for visual variety
      const zoomExpr = i % 2 === 0
        ? `'min(zoom+0.0015,1.5)'`  // zoom in
        : `'if(lte(zoom,1.0),1.5,max(1.0,zoom-0.0015))'`; // zoom out

      const cmd = [
        `ffmpeg -y -loop 1 -i "${localImagePaths[i]}"`,
        `-t ${slideDuration}`,
        `-filter_complex "scale=8000:-1,zoompan=z=${zoomExpr}:d=${frames}:s=1920x1080"`,
        `-c:v libx264 -pix_fmt yuv420p -r 25 "${slidePath}"`
      ].join(' ');

      await execAsync(cmd);
      console.log(`[video-maker] Created slide ${i + 1}/${localImagePaths.length}`);
    }

    // 6. Stitch Slides and Add Audio
    console.log(`[video-maker] Stitching slides and merging audio...`);
    const finalVideoPath = path.join(workDir, 'final_video.mp4');

    const inputs = slidePaths.map(p => `-i "${p}"`).join(' ');
    const audioInputIdx = slidePaths.length;

    if (slidePaths.length === 1) {
      await execAsync(
        `ffmpeg -y ${inputs} -i "${localAudioPath}" -map 0:v -map ${audioInputIdx}:a -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -r 25 -c:a aac -shortest "${finalVideoPath}"`
      );
    } else {
      const filters: string[] = [];

      for (let i = 1; i < slidePaths.length; i++) {
        const prevLabel = i === 1 ? '[0:v]' : `[xf${i - 1}]`;
        const currLabel = `[${i}:v]`;
        // The length of the previous stream is reduced by the crossfade duration for each previous crossfade
        const offset = i * durationPerImage - (i * crossfadeDuration);
        const outLabel = `[xf${i}]`;
        filters.push(
          `${prevLabel}${currLabel}xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset.toFixed(3)},format=yuv420p${outLabel}`
        );
      }
      
      const lastXfadeLabel = `[xf${slidePaths.length - 1}]`;
      const filterComplex = filters.join('; ');
      
      await execAsync(
        `ffmpeg -y ${inputs} -i "${localAudioPath}" -filter_complex "${filterComplex}" -map "${lastXfadeLabel}" -map ${audioInputIdx}:a -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -r 25 -c:a aac -shortest "${finalVideoPath}"`
      );
    }

    // 8. Upload Final Video to Firebase
    console.log(`[video-maker] Uploading final video to Firebase...`);
    const firebaseUrl = await uploadToFirebase(
      finalVideoPath,
      `video-maker/${userId}/video_${timestamp}.mp4`,
      'video/mp4'
    );
    console.log(`[video-maker] Upload complete: ${firebaseUrl}`);

    // 9. Update Firestore with video URL and clear the lock
    if (trackId) {
      console.log(`[video-maker] Updating Firestore document ${trackId}...`);
      await getFirestore().collection('music_tracks').doc(trackId).update({
        videoUrl: firebaseUrl,
        videoStatus: 'completed',
        videoGenerating: false,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`[video-maker] Firestore updated.`);

      // Deduct coins AFTER successful Firestore write (non-blocking)
      if (userId) {
        deductVideoCoins(userId, trackId).catch(() => {});
      }
    }

    // Clean up temp files
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});

    return { success: true, videoUrl: firebaseUrl };

  } catch (error: any) {
    console.error(`[video-maker] Pipeline failed:`, error);
    // Clear the lock so user can retry
    if (trackId) {
      await getFirestore().collection('music_tracks').doc(trackId)
        .update({ videoGenerating: false, videoStatus: 'failed' }).catch(() => {});
    }
    console.log(`[video-maker] Preserved workDir for debugging: ${workDir}`);
    return {
      success: false,
      error: error?.message || 'Unknown error during video generation'
    };
  }
}

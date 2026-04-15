
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';
import { google } from 'googleapis';
import { IntegrationToken, INTEGRATION_TOKENS_COLLECTION } from '@/lib/types/integrations';
import { generateVideoFromAudio } from '@/lib/media/video-generator';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { trackId, platform, userId, shareId } = await request.json();

        if (!trackId || !platform || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        initAdmin();
        const db = getAdminDb();

        // 1. Fetch Track Data using shareId as the document ID (or fallback to trackId if missing)
        const docId = shareId || trackId;
        const trackDoc = await db.collection('music_tracks').doc(docId).get();
        if (!trackDoc.exists) {
            return NextResponse.json({ error: 'Track doc not found' }, { status: 404 });
        }
        let trackData = trackDoc.data()!;
        
        // If track is inside array, extract the specific clip info
        if (trackData.tracks && Array.isArray(trackData.tracks)) {
            const nestedClip = trackData.tracks.find((t: any) => t.sunoId === trackId || `${trackData.taskId || docId}` === trackId);
            if (nestedClip) {
                // Merge nested properties over root properties
                trackData = {
                    ...trackData,
                    ...nestedClip,
                    // keep original ID for updating
                    id: docId,
                    sunoId: trackId
                };
            }
        } else {
             trackData.id = docId;
             trackData.sunoId = trackId;
        }

        // 2. Fetch Integration Token
        const tokenDoc = await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_${platform}`).get();
        if (!tokenDoc.exists) {
            return NextResponse.json({ error: `Not connected to ${platform}` }, { status: 401 });
        }
        const tokenData = tokenDoc.data() as IntegrationToken;

        // 3. Process logic based on platform
        if (platform === 'youtube') {
            return await uploadToYouTube(userId, trackData, tokenData, db);
        } else if (platform === 'soundcloud') {
            return await uploadToSoundCloud(userId, trackData, tokenData);
        } else {
            return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Distribution error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

async function uploadToYouTube(userId: string, trackData: any, token: IntegrationToken, db: FirebaseFirestore.Firestore) {
    let videoPath = '';
    let isTemporaryVideo = false;

    try {
        // Refresh token logic would go here if needed (googleapis handles it if refresh_token is set)
        const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            expiry_date: token.expiryDate
        });

        // 1. Get Video Source
        // The api mapping should already have combined the exact nested URLs to the root properties
        let audioUrl = trackData.audio_url || trackData.audioUrl;
        let imageUrl = trackData.image_url || trackData.imageUrl || trackData.sourceImageUrl;
        let videoUrl = trackData.video_url || trackData.videoUrl;

        if (videoUrl) {
            console.log(`[YouTube] Using pre-generated video: ${videoUrl}`);
            // Download the video to a temporary file for uploading
            const response = await fetch(videoUrl);
            if (!response.ok) throw new Error(`Failed to download video from ${videoUrl}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            videoPath = `/tmp/video_yt_${trackData.id || Date.now()}.mp4`;
            fs.writeFileSync(videoPath, buffer);
            isTemporaryVideo = true;
        } else {
            // Generate Video from Audio + Image
            console.log(`[YouTube] Generating video from audio: ${audioUrl}`);
            if (!audioUrl || !imageUrl) {
                throw new Error('Missing audio or image URL in track data for video generation');
            }

            videoPath = await generateVideoFromAudio({
                audioUrl,
                imageUrl,
                outputName: `youtube_${trackData.id || Date.now()}`
            });
            isTemporaryVideo = true;
        }

        // 2. Upload to YouTube
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        const title = trackData.title || 'Unknown Track';
        
        let fullDescription = trackData.description || trackData.prompt || `A beautiful track generated by Rraasi Music for ${userId}.`;

        if (trackData.story) {
            fullDescription += `\n\n📖 The Story Behind the Track:\n${trackData.story}`;
        }
        
        if (trackData.lyrics) {
            fullDescription += `\n\n🎵 Lyrics:\n${trackData.lyrics}`;
        }

        if (trackData.healingBenefits && trackData.healingBenefits.length > 0) {
            fullDescription += `\n\n💖 Healing Benefits:\n- ${trackData.healingBenefits.join('\n- ')}`;
        }
        
        fullDescription += `\n\nAbout RRAASI:\nWe are an AI-powered spiritual platform helping you experience your spiritual dimension through focused attention. Connect with 50+ gurus, create healing frequency music, and explore Vedic wisdom.\n\nDiscover more on the Rraasi app: https://rraasi.com/`;

        // Automated Tag & Category Selection
        let youtubeTags = ['AI Music', 'Satsang', 'Meditation', 'Rraasi', 'Spirituality', 'Healing Frequencies'];
        let categoryId = '10'; // Default: Music
        
        const trackTags = typeof trackData.tags === 'string' ? trackData.tags.toLowerCase() : '';
        const lowerTitle = title.toLowerCase();

        if (trackTags.includes('chakra') || lowerTitle.includes('chakra')) {
            youtubeTags.push('Chakra Healing', 'Energy Healing', '7 Chakras');
        }
        if (trackTags.includes('meditation') || lowerTitle.includes('meditation')) {
            youtubeTags.push('Guided Meditation', 'Deep Sleep', 'Mindful');
        }
        if (trackTags.includes('bhajan') || lowerTitle.includes('bhajan')) {
            youtubeTags.push('Bhajan', 'Devotional', 'Kirtan');
        }
        if (trackTags.includes('mantra') || lowerTitle.includes('mantra')) {
            youtubeTags.push('Mantra Chanting', 'Vedic Mantras');
        }

        if (trackData.tags) {
            const extraTags = Array.isArray(trackData.tags) 
                ? trackData.tags 
                : trackData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            youtubeTags = [...new Set([...youtubeTags, ...extraTags])];
        }

        const res = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: title.substring(0, 100),
                    description: fullDescription.substring(0, 5000),
                    categoryId: categoryId,
                    tags: youtubeTags.slice(0, 20),
                    defaultLanguage: 'en',
                    defaultAudioLanguage: 'en'
                },
                status: {
                    privacyStatus: 'public',
                    selfDeclaredMadeForKids: false
                }
            },
            media: {
                body: fs.createReadStream(videoPath)
            }
        });

        // 3. Update track status
        await db.collection('music_tracks').doc(trackData.id).set({
            youtubeId: res.data.id,
            youtubeUrl: `https://youtu.be/${res.data.id}`,
            youtubeUploadStatus: 'completed',
            updatedAt: Date.now()
        }, { merge: true });

        // Cleanup
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

        return NextResponse.json({
            success: true,
            platform: 'youtube',
            videoId: res.data.id,
            url: `https://youtu.be/${res.data.id}`
        });

    } catch (err: any) {
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        console.error('YouTube upload failed:', err);
        throw new Error(`YouTube upload failed: ${err.message}`);
    }
}

async function uploadToSoundCloud(userId: string, trackData: any, token: IntegrationToken) {
    // SoundCloud API v2 upload is complex and often requires special permissions or using older keys.
    // Standard API allows uploading via POST /tracks
    // However, recent API changes might require specific handling.
    // For now, using standard multipart upload if possible.

    // NOTE: SoundCloud public API upload documentation is scarce/deprecated. 
    // This implementation attempts the standard documented way but might fail if API access is restricted.

    throw new Error('SoundCloud upload implementation requires verifiction of API access level.');
}

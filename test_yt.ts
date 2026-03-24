import { getAdminDb } from './lib/firebase-admin';
import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars for youtube client id/secret
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function main() {
    try {
        console.log('Fetching db...');
        const db = getAdminDb();

        let tokensSnapshot = await db.collection('integration_tokens').get();
        if (tokensSnapshot.empty) {
            console.log('No tokens in integration_tokens, trying user_integration_tokens...');
            tokensSnapshot = await db.collection('user_integration_tokens').get();
        }
        
        if (tokensSnapshot.empty) {
            console.error('No tokens found in DB at all.');
            process.exit(1);
        }
        
        console.log('Available tokens:');
        tokensSnapshot.docs.forEach(d => console.log(d.id, '-> provider:', d.data().provider, 'valid:', d.data().valid));
        
        const ytTokens = tokensSnapshot.docs.filter(d => d.data().provider === 'youtube' && d.data().valid);
        if (ytTokens.length === 0) {
            console.error('No valid youtube token found.');
            process.exit(1);
        }
        
        const tokenData = ytTokens[0].data();
        console.log(`Using YouTube token for user: ${tokenData.userEmail || tokenData.displayName || tokenData.userId}`);

        const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            access_token: tokenData.accessToken,
            refresh_token: tokenData.refreshToken,
            expiry_date: tokenData.expiryDate
        });

        // Test with a short dummy video or existing one from db
        const yt = google.youtube({ version: 'v3', auth: oauth2Client });
        
        console.log('Fetching a track from db to get a video URL...');
        const tracksSnapshot = await db.collection('music_tracks').orderBy('createdAt', 'desc').limit(20).get();
        
        let videoUrl = null;
        let trackTitle = 'Test public upload';
        
        for (const doc of tracksSnapshot.docs) {
            const data = doc.data();
            if (data.video_url || data.videoUrl) {
                videoUrl = data.video_url || data.videoUrl;
                trackTitle = 'Testing ' + (data.title || trackTitle) + ' - Public Status';
                console.log(`Found track with video: ${data.title} -> ${videoUrl}`);
                break;
            }
        }
        
        // If not found, use a fast dummy video if we can construct one, or error out
        if (!videoUrl) {
            // Lets just use an extremely small dummy file
            console.error('No videoUrl found in recent tracks. Fallback to dummy file logic if needed, but for now throwing error.');
            process.exit(1);
        }

        console.log(`Downloading video from ${videoUrl}...`);
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const videoPath = '/tmp/test_yt_upload.mp4';
        fs.writeFileSync(videoPath, buffer);

        console.log('Uploading to YouTube with privacyStatus: "public"...');
        try {
            const res = await yt.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: trackTitle,
                        description: 'This is a test to verify public upload functionality.',
                        categoryId: '10', // Music
                        tags: ['test']
                    },
                    status: {
                        privacyStatus: 'public'
                    }
                },
                media: {
                    body: fs.createReadStream(videoPath)
                }
            });
            console.log('Upload successful!');
            console.log('Video ID:', res.data.id);
            console.log('Status object returned by YouTube API:', JSON.stringify(res.data.status, null, 2));
            console.log(`URL: https://youtu.be/${res.data.id}`);
        } catch (err: any) {
            console.log('Upload failed with error:');
            if (err.response && err.response.data) {
                console.error(JSON.stringify(err.response.data, null, 2));
            } else {
                console.error(err);
            }
        }

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

main();

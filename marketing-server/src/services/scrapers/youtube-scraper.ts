import { getDb } from '../../firebase.js';
import { extractAllContactInfo, computePoetScore, detectLanguage } from './enrichment.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const COLLECTION = 'leads';
const VIDEO_COLLECTION = 'youtube_scraped_videos';

// Lines indicating poetic content
const POETRY_SIGNALS = [
    /[\u0900-\u097F]{5,}/, // Devanagari text (5+ chars)
    /।/,                   // Hindi danda punctuation
    /\n.*\n/,              // Multi-line content (verse)
    /\b(bhajan|mantra|doha|shloka|kavita|shayari|ghazal|nazm|jai|ram|krishna|shiv|om|hanuman)\b/i,
];

interface YoutubeScrapeOptions {
    channelIds: string[];
    language?: string;
    maxCommentsPerVideo?: number;
    maxVideosPerChannel?: number;
}

/**
 * Scrape YouTube channel comments for poetic content.
 * Uses YouTube Data API v3 (free, 10k/day quota).
 */
export async function runYoutubeScrape(options: YoutubeScrapeOptions): Promise<void> {
    const { channelIds, language = 'hindi', maxCommentsPerVideo = 100, maxVideosPerChannel = 10 } = options;

    if (!YOUTUBE_API_KEY) {
        console.error('[youtube-scraper] YOUTUBE_API_KEY not set — skipping.');
        return;
    }

    console.log(`[youtube-scraper] Scraping ${channelIds.length} channels`);

    for (const channelId of channelIds) {
        try {
            await scrapeChannel(channelId, { maxCommentsPerVideo, maxVideosPerChannel, language });
        } catch (e) {
            console.error(`[youtube-scraper] Error scraping channel ${channelId}:`, e);
        }
    }

    console.log('[youtube-scraper] Done.');
}

async function scrapeChannel(
    channelIdInput: string,
    opts: { maxCommentsPerVideo: number; maxVideosPerChannel: number; language: string }
): Promise<void> {

    let channelId = channelIdInput.trim();

    // If the input is not a raw UC... Channel ID (e.g. it's a @handle or search term), resolve it
    if (!channelId.startsWith('UC')) {
        const query = channelId.startsWith('@') ? channelId : `@${channelId}`;
        const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`
        );
        const searchData = await searchRes.json() as any;
        
        if (!searchRes.ok || !searchData.items?.length) {
            console.error(`[youtube-scraper] Could not resolve handle ${channelIdInput} to a Channel ID.`);
            return;
        }
        channelId = searchData.items[0].snippet.channelId;
    }

    // Step 1: Get the channel's uploads playlist ID
    const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=contentDetails&key=${YOUTUBE_API_KEY}`
    );
    const channelData = await channelRes.json() as any;

    if (!channelRes.ok || !channelData.items?.length) {
        console.error(`[youtube-scraper] Channel ${channelId} API error:`, JSON.stringify(channelData).substring(0, 300));
        return;
    }

    const uploadsPlaylistId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
        console.error(`[youtube-scraper] No uploads playlist for channel ${channelId}`);
        return;
    }

    // Step 2: Get videos from uploads playlist (cheaper than Search API)
    const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsPlaylistId}&part=snippet&maxResults=${opts.maxVideosPerChannel}&key=${YOUTUBE_API_KEY}`
    );
    const videosData = await videosRes.json() as any;

    if (!videosRes.ok) {
        console.error(`[youtube-scraper] Playlist fetch error:`, JSON.stringify(videosData).substring(0, 300));
        return;
    }

    const videos = videosData.items || [];
    console.log(`[youtube-scraper] Channel ${channelId}: ${videos.length} videos`);

    const db = getDb();

    for (const video of videos) {
        // playlistItems API uses snippet.resourceId.videoId (not id.videoId)
        const videoId = video.snippet?.resourceId?.videoId;
        const videoTitle = video.snippet?.title || '';
        if (!videoId) continue;

        // Skip if we already scraped this video
        const videoDoc = await db.collection(VIDEO_COLLECTION).doc(videoId).get();
        if (videoDoc.exists) {
            console.log(`[youtube-scraper] Skipping already processed video: ${videoId}`);
            continue;
        }

        try {
            await scrapeVideoComments(videoId, videoTitle, opts);
            // Mark video as scraped to prevent double processing in the future
            await db.collection(VIDEO_COLLECTION).doc(videoId).set({
                scrapedAt: Date.now(),
                channelId,
                title: videoTitle
            });
        } catch (e) {
            console.error(`[youtube-scraper] Error scraping video ${videoId}:`, e);
        }

        await sleep(500);
    }
}

async function scrapeVideoComments(
    videoId: string,
    videoTitle: string,
    opts: { maxCommentsPerVideo: number; language: string }
): Promise<void> {
    const commentsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?` +
        `videoId=${videoId}&part=snippet&maxResults=${opts.maxCommentsPerVideo}` +
        `&order=relevance&key=${YOUTUBE_API_KEY}`
    );

    if (!commentsRes.ok) return;
    const commentsData = await commentsRes.json() as any;
    const items = commentsData.items || [];

    const db = getDb();
    let saved = 0;

    for (const item of items) {
        const comment = item.snippet?.topLevelComment?.snippet;
        if (!comment) continue;

        const text = comment.textDisplay || comment.textOriginal || '';
        
        // Check if comment looks like a poem/verse
        const isPoetic = POETRY_SIGNALS.some(pattern => pattern.test(text));
        if (!isPoetic || text.length < 20) continue;
        console.log(`[youtube-scraper] Poetic comment found (${text.length} chars): ${text.substring(0, 60).replace(/\n/g, ' ')}...`);

        const authorChannelId = comment.authorChannelId?.value;
        const authorName = comment.authorDisplayName || 'Unknown';
        const handle = authorChannelId || authorName.toLowerCase().replace(/\s+/g, '_');
        
        // Quality Filter: Check if commenter is an active creator (>5000 subs)
        if (!authorChannelId) continue;
        let subCount = 0;
        try {
            const channelRes = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${authorChannelId}&key=${YOUTUBE_API_KEY}`
            );
            if (!channelRes.ok) continue;

            const channelData = await channelRes.json() as any;
            const stats = channelData.items?.[0]?.statistics;
            subCount = parseInt(stats?.subscriberCount || '0', 10);
            
            if (subCount < 5000) {
                // console.log(`[youtube-scraper] Skipping lead ${authorName} (only ${subCount} subs)`);
                continue;
            }
            console.log(`[youtube-scraper] High-quality lead found: ${authorName} has ${subCount} subscribers!`);
        } catch (e) {
            console.error(`[youtube-scraper] Error checking channel stats for ${authorChannelId}`, e);
            continue;
        }

        const language = detectLanguage(text);

        let poetScore = computePoetScore({
            bio: text,
            hashtags: [],
        });

        // Boost score because they are a verified creator (>5k subs) leaving a poetic comment
        if (subCount >= 5000) poetScore += 40;
        if (subCount >= 10000) poetScore += 10;
        if (subCount >= 50000) poetScore += 20;

        if (poetScore < 5) continue;

        // Check if lead already exists
        const existing = await db.collection(COLLECTION)
            .where('handle', '==', handle)
            .where('platform', '==', 'youtube')
            .limit(1)
            .get();

        if (!existing.empty) continue;

        const lead = {
            name: authorName,
            handle,
            platform: 'youtube',
            profileUrl: authorChannelId ? `https://youtube.com/channel/${authorChannelId}` : '',
            language,
            location: '',
            // Contact — YouTube doesn't expose this in comments; enrichment happens later
            phone: null,
            whatsappUrl: null,
            email: null,
            website: null,
            youtubeChannel: authorChannelId || null,
            facebookPage: null,
            twitterHandle: null,
            linktreeUrl: null,
            bestContactMethod: 'dm' as const,
            // Content
            samplePoem: text.substring(0, 500),
            tags: [`youtube-comment`, videoTitle.toLowerCase().includes('bhajan') ? 'bhajan' : 'devotional'],
            // Scoring
            poetScore,
            status: 'new',
            notes: `Found in comments of: ${videoTitle}`,
            sampleGenerated: false,
            sampleUrl: null,
            // Timestamps
            discoveredAt: Date.now(),
            contactedAt: null,
            convertedAt: null,
        };

        await db.collection(COLLECTION).add(lead);
        saved++;
    }

    if (saved > 0) {
        console.log(`[youtube-scraper] Video ${videoId}: saved ${saved} poet leads`);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

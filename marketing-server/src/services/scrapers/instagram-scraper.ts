import { getDb } from '../../firebase.js';
import { extractAllContactInfo, computePoetScore } from './enrichment.js';

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const APIFY_ACTOR_ID = 'apify~instagram-hashtag-scraper';
const COLLECTION = 'leads';

interface InstagramScrapeOptions {
    hashtags: string[];
    language?: string;
    maxResultsPerHashtag?: number;
}

/**
 * Run an Instagram hashtag scrape via Apify, 
 * extract contact info, score and save leads to Firestore.
 */
export async function runInstagramScrape(options: InstagramScrapeOptions): Promise<void> {
    const { hashtags, language = 'hindi', maxResultsPerHashtag = 30 } = options;

    console.log(`[instagram-scraper] Starting scrape for hashtags: ${hashtags.join(', ')}`);

    if (!APIFY_API_KEY) {
        console.error('[instagram-scraper] APIFY_API_KEY not set — skipping.');
        return;
    }

    // Trigger Apify actor run
    const triggerRes = await fetch(
        `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hashtags,
                resultsLimit: maxResultsPerHashtag,
                scrapeType: 'posts',
                proxy: { useApifyProxy: true }
            })
        }
    );

    if (!triggerRes.ok) {
        const err = await triggerRes.text();
        console.error('[instagram-scraper] Apify trigger failed:', err);
        return;
    }

    const runData = await triggerRes.json() as any;
    const runId = runData?.data?.id;
    console.log(`[instagram-scraper] Apify run started: ${runId}`);

    // Poll for completion (Cloud Run can handle long waits)
    let completed = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 24; // 24 × 15s = 6 minutes max

    while (!completed && attempts < MAX_ATTEMPTS) {
        await sleep(15000);
        attempts++;

        const statusRes = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
        );
        const statusData = await statusRes.json() as any;
        const status = statusData?.data?.status;

        console.log(`[instagram-scraper] Run ${runId} status: ${status} (attempt ${attempts})`);

        if (status === 'SUCCEEDED') {
            completed = true;
        } else if (status === 'FAILED' || status === 'ABORTED') {
            console.error('[instagram-scraper] Apify run failed:', status);
            return;
        }
    }

    if (!completed) {
        console.error('[instagram-scraper] Apify run timed out after 6 minutes');
        return;
    }

    // Fetch results from the default dataset
    const resultsRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}&limit=500`
    );
    const items = await resultsRes.json() as any[];

    console.log(`[instagram-scraper] Processing ${items.length} posts`);

    // Group by author to de-duplicate
    const authorMap = new Map<string, any>();
    for (const item of items) {
        const handle = item.ownerUsername || item.username;
        if (!handle || authorMap.has(handle)) continue;
        authorMap.set(handle, item);
    }

    console.log(`[instagram-scraper] Unique authors: ${authorMap.size}`);

    const db = getDb();
    let saved = 0;

    for (const [handle, post] of authorMap) {
        try {
            const bio = post.ownerBio || post.biography || '';
            const contact = extractAllContactInfo(bio);
            const lang = contact.language !== 'other' ? contact.language : language;

            // Extract hashtags used in the post
            const postHashtags: string[] = post.hashtags || 
                (post.caption || '').match(/#[\w\u0900-\u097F]+/g)?.map((h: string) => h.replace('#', '')) || [];

            const poetScore = computePoetScore({
                bio,
                hashtags: postHashtags,
                followersCount: post.ownerFollowersCount || post.followersCount || 0,
                postsCount: post.ownerPostsCount || post.postsCount || 0,
                engagementRate: post.likesCount ? (post.likesCount / (post.ownerFollowersCount || 1)) * 100 : 0
            });

            const followersCount = post.ownerFollowersCount || post.followersCount || 0;
            if (followersCount < 5000) {
                continue; // Skip accounts with <5000 followers
            }

            if (poetScore < 10) continue; // Skip very low scores

            const lead = {
                name: post.ownerFullName || post.fullName || handle,
                handle,
                platform: 'instagram',
                profileUrl: `https://instagram.com/${handle}`,
                language: lang,
                location: contact.location || '',
                // Contact
                phone: contact.phone,
                whatsappUrl: contact.whatsappUrl,
                email: contact.email,
                website: contact.website,
                linktreeUrl: contact.linktreeUrl,
                youtubeChannel: null,
                facebookPage: null,
                twitterHandle: null,
                bestContactMethod: contact.bestContactMethod,
                // Content - use caption as sample poem
                samplePoem: (post.caption || '').substring(0, 500),
                tags: postHashtags.slice(0, 10),
                // Scoring
                poetScore,
                status: 'new',
                notes: '',
                sampleGenerated: false,
                sampleUrl: null,
                // Timestamps
                discoveredAt: Date.now(),
                contactedAt: null,
                convertedAt: null,
            };

            // Upsert by handle to avoid duplicates
            const existing = await db.collection(COLLECTION)
                .where('handle', '==', handle)
                .where('platform', '==', 'instagram')
                .limit(1)
                .get();

            if (existing.empty) {
                await db.collection(COLLECTION).add(lead);
                saved++;
            } else {
                // Update score and contact if we found better data
                await existing.docs[0].ref.set({
                    poetScore: Math.max(poetScore, (existing.docs[0].data() as any).poetScore || 0),
                    phone: lead.phone || existing.docs[0].data().phone,
                    email: lead.email || existing.docs[0].data().email,
                    website: lead.website || existing.docs[0].data().website,
                }, { merge: true });
            }
        } catch (err) {
            console.error(`[instagram-scraper] Error processing ${handle}:`, err);
        }
    }

    console.log(`[instagram-scraper] Done. Saved ${saved} new leads.`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

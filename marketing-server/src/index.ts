import './env-config.js'; // Must be first
import { http } from '@google-cloud/functions-framework';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { initFirebaseAdmin } from './firebase.js';
import adsRoutes from './routes/ads.js';
import podcastRoutes from './routes/podcast.js';
import transcriptRoutes from './routes/transcript.js';
import videoStitchRoutes from './routes/video-stitch.js';
import transcriptsRoutes from './routes/transcripts.js';
import youtubeAuthRoutes from './routes/youtube.js';
import satsangPlansRoutes from './routes/satsang-plans.js';
import webhooksRoutes from './routes/webhooks.js';

const app = express();

initFirebaseAdmin();

// Port 4001 for Marketing/Heavy operations
const PORT = Number(process.env.MARKETING_PORT || 4001);
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(
    cors({
        origin: ORIGIN === '*' ? true : ORIGIN.split(','),
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// Mount Marketing Routes
app.use('/ads', adsRoutes);
app.use('/podcast', podcastRoutes);
app.use('/transcript', transcriptRoutes);
app.use('/video-stitch', videoStitchRoutes);
app.use('/transcripts', transcriptsRoutes);
app.use('/youtube-auth', youtubeAuthRoutes);
app.use('/satsang-plans', satsangPlansRoutes);
app.use('/webhooks', webhooksRoutes);

app.get('/', (_req, res) => res.json({ name: 'satsang-marketing-server', ok: true }));

// Register as Cloud Function
http('marketingServer', (req, res) => {
    // Basic body parsing polyfill for GCF if needed
    if (req.body === undefined && (req as any).rawBody) {
        try {
            const raw = (req as any).rawBody.toString();
            if (raw.trim().startsWith('{')) {
                req.body = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[marketing-server] Failed to parse rawBody', e);
        }
    }
    app(req, res);
});

// Start server locally if not in GCF
if (!process.env.FUNCTION_TARGET) {
    const server = app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`[marketing-server] listening on http://localhost:${PORT}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            // eslint-disable-next-line no-console
            console.error(
                `[marketing-server] Port ${PORT} is already in use. Please stop the existing server first.`
            );
            process.exit(1);
        } else {
            // eslint-disable-next-line no-console
            console.error('[marketing-server] Server error:', err);
            throw err;
        }
    });
}

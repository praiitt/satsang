import './env-config.js'; // Must be first
import { http } from '@google-cloud/functions-framework';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import expressWs from 'express-ws';
import { initFirebaseAdmin } from './firebase.js';
import adsRoutes from './routes/ads.js';
import podcastRoutes from './routes/podcast.js';
import transcriptRoutes from './routes/transcript.js';
import videoStitchRoutes from './routes/video-stitch.js';
import transcriptsRoutes from './routes/transcripts.js';
import youtubeAuthRoutes from './routes/youtube.js';
import satsangPlansRoutes from './routes/satsang-plans.js';
import webhooksRoutes from './routes/webhooks.js';
import whatsappBotRoutes from './routes/whatsapp-bot.js';
import leadsRoutes from './routes/leads.js';
import twilioBotRoutes, { registerVobizStream } from './routes/twilio-bot.js';
import facebookLeadsRoutes from './routes/facebook-leads.js';
import twilioWhatsappRoutes from './routes/twilio-whatsapp.js';

// Setup Express with WebSocket support
const { app, getWss } = expressWs(express());

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

// Google Cloud Functions already parses the body. We only need express.json() for local dev.
if (!process.env.FUNCTION_TARGET) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
} else {
    // GCF parses json, but might need help with urlencoded if not handled by GCP natively
    app.use(express.urlencoded({ extended: true }));
}

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
app.use('/whatsapp-bot', whatsappBotRoutes);
app.use('/leads', leadsRoutes);
app.use('/twilio-bot', twilioBotRoutes);
app.use('/facebook-leads', facebookLeadsRoutes);
app.use('/twilio-whatsapp', twilioWhatsappRoutes);

// Register the Vobiz WebSocket stream directly on the app-level expressWs instance
// so that WebSocket upgrades are correctly intercept by the http.Server
registerVobizStream(app);

app.get('/', (_req, res) => res.json({ name: 'satsang-marketing-server', ok: true }));

// Export the app as the entry point for Cloud Functions
export { app as marketingServer };

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

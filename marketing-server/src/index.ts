import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initFirebaseAdmin } from './firebase.js';
import adsRoutes from './routes/ads.js';
import podcastRoutes from './routes/podcast.js';
import transcriptRoutes from './routes/transcript.js';
import videoStitchRoutes from './routes/video-stitch.js';
import transcriptsRoutes from './routes/transcripts.js';
// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
const envPaths = [
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../.env.local'),
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        config({ path: envPath });
        console.log(`[marketing-server] ✅ Loaded .env.local from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    config();
    console.log('[marketing-server] ⚠️  Using default dotenv config (no .env.local found)');
}

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
app.get('/', (_req, res) => res.json({ name: 'satsang-marketing-server', ok: true }));

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

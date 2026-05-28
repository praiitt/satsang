import { http } from '@google-cloud/functions-framework';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initFirebaseAdmin } from './firebase.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import sunoRoutes from './routes/suno.js';
import falRoutes from './routes/fal.js';
import tarotRoutes from './routes/tarot.js';
import coinRoutes from './routes/coins.js';
import livekitRoutes from './routes/livekit.js';
import marketingRoutes from './routes/marketing.js';
import playlistRoutes from './routes/playlists.js';
import corporateRoutes from './routes/corporate.js';
import livekitWebhookRoutes from './routes/livekit-webhook.js';
import meditationRoutes from './meditation/meditation.controller.js';
import adminRoutes from './routes/admin.js';
import reelsRoutes from './routes/reels.js';

// ... imports

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Load .env.local from project root
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),      // Check local folder FIRST
  path.resolve(process.cwd(), '../.env.local'),   // Then check parent folder
  path.resolve(__dirname, '../.env.local'),       // Then relative path
  path.resolve(__dirname, '../../.env.local'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`[auth-server] ✅ Loaded .env.local from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  config();
  console.log('[auth-server] ⚠️  Using default dotenv config (no .env.local found)');
}

const app = express();

initFirebaseAdmin();

const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: ORIGIN === '*' ? true : ORIGIN.split(','),
    credentials: true,
  })
);

// Only use express.json() when NOT running in Cloud Functions
if (!process.env.FUNCTION_TARGET) {
  app.use(express.json());
}

// Query Polyfill Middleware for Cloud Functions (Gen 2 / Cloud Run)
app.use((req, _res, next) => {
  // If req.query is already populated by GCF, we use it
  // But if it's missing things that are in the URL, we polyfill
  const urlParts = (req.url || '').split('?');
  const queryString = urlParts[1] || '';
  
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    const query: any = req.query || {};
    let added = 0;
    searchParams.forEach((value, key) => {
      if (!query[key]) {
        query[key] = value;
        added++;
      }
    });

    if (added > 0) {
      console.log(`[auth-server] ✅ Middleware added ${added} parameters from URL to req.query`);
      try {
        Object.defineProperty(req, 'query', {
          value: query,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        Object.assign(req.query || {}, query);
      }
    }
  }
  
  if (!req.query) {
    try {
      Object.defineProperty(req, 'query', { value: {} });
    } catch (e) {
      (req as any).query = {};
    }
  }
  next();
});

// Create a main router to handle path prefixing
const mainRouter = express.Router();

mainRouter.use(cookieParser());

mainRouter.use('/auth', authRoutes);
mainRouter.use('/user', userRoutes);
mainRouter.use('/suno', sunoRoutes);
mainRouter.use('/fal', falRoutes);
mainRouter.use('/tarot', tarotRoutes);
mainRouter.use('/coins', coinRoutes);
mainRouter.use('/marketing', marketingRoutes);
mainRouter.use('/livekit', livekitRoutes);
mainRouter.use('/playlists', playlistRoutes);
mainRouter.use('/corporate', corporateRoutes);
// mainRouter.use('/corporate', corporateRoutes); // Removed duplicate
mainRouter.use('/livekit-webhook', livekitWebhookRoutes);
mainRouter.use('/meditation', meditationRoutes);
mainRouter.use('/chat', (await import('./routes/chat.js')).default);
mainRouter.use('/admin', adminRoutes);
mainRouter.use('/reels', reelsRoutes);

mainRouter.get('/test-coins', (req, res) => res.json({ status: 'ok', message: 'Auth Server is running' }));
mainRouter.get('/', (_req, res) => res.json({ name: 'satsang-auth-server', ok: true }));

// Mount mainRouter at root AND at the rewrite path
app.use('/', mainRouter);
app.use('/satsang-auth-server', mainRouter);

// Register as Cloud Function
// For Cloud Functions v2, we need to handle the already-parsed body
http('authServer', (req, res) => {
  // If request has already been parsed by Cloud Functions, attach it to req.body
  // If request has already been parsed by Cloud Functions, attach it to req.body
  if (req.body === undefined && (req as any).rawBody) {
    try {
      const raw = (req as any).rawBody.toString();
      if (raw.trim().startsWith('{')) {
        req.body = JSON.parse(raw);
      } else {
        // Fallback for non-JSON or weird content types
        req.body = raw;
      }
    } catch {
      req.body = {};
    }
  } else if (req.body && Buffer.isBuffer(req.body)) {
    // Sometimes body comes as Buffer
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (e) {
      console.warn('[auth-server] Failed to parse Buffer body', e);
    }
  }

  // Explicitly handle LiveKit's content-type if express.json() didn't catch it
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/webhook+json') && !req.body) {
    if ((req as any).rawBody) {
      try {
        req.body = JSON.parse((req as any).rawBody.toString());
      } catch (e) {
        console.warn('[auth-server] Failed to parse webhook+json', e);
      }
    }
  }

  // Debug Logging
  console.log(`[auth-server] Request: ${req.method} ${req.url}`);

  // Debug Body
  if (req.method === 'POST') {
    console.log(`[auth-server] Body Keys: ${Object.keys(req.body || {}).join(', ')}`);
  }

  app(req, res);
});

// Start server locally if not in GCF
if (!process.env.FUNCTION_TARGET) {
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[auth-server] listening on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `[auth-server] Port ${PORT} is already in use. Please stop the existing server first.`
      );
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console
      console.error('[auth-server] Server error:', err);
      throw err;
    }
  });
}

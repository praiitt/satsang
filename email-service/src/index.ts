import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 4003;

// CORS — same pattern as whatsapp-service
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return callback(null, true);
    const isAllowed = allowedOrigins.some(ao => ao.replace(/\/$/, '') === normalized);
    if (isAllowed) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'email-service' }));

// Mount email routes
app.use('/', routes);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    service: 'email-service',
  });
});

app.listen(PORT, () => {
  console.log(`🟢 Email Service running on http://localhost:${PORT}`);
});

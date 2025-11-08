import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { initFirebaseAdmin } from './firebase.js';
import authRoutes from './routes/auth.js';

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
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);

app.get('/', (_req, res) => res.json({ name: 'satsang-auth-server', ok: true }));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[auth-server] listening on http://localhost:${PORT}`);
});

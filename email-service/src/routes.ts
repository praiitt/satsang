import { Router, Request, Response } from 'express';
import { sendEmail, sendBroadcast, getSendLogs, getConfig, isConfigured } from './email-client';
import admin from 'firebase-admin';
import './firebase-admin'; // ensure initialized

const router = Router();

// GET /status
router.get('/status', (_req: Request, res: Response) => {
  res.json(getConfig());
});

// GET /logs — recent send history from Firestore
router.get('/logs', async (_req: Request, res: Response) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('email_logs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ logs });
  } catch {
    res.json({ logs: getSendLogs() });
  }
});

// GET /users — fetch all registered users WITH email from Firebase Auth
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users: { id: string; name: string; email: string; phone?: string }[] = [];
    let nextPageToken: string | undefined;

    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      for (const u of result.users) {
        if (u.email) {
          users.push({
            id: u.uid,
            name: u.displayName || '',
            email: u.email,
            phone: u.phoneNumber || '',
          });
        }
      }
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    console.log(`[Users] Found ${users.length} users with email`);
    res.json({ users, total: users.length });
  } catch (err: any) {
    console.error('[Users] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});


// POST /send — send single email
// Body: { to: string, subject: string, html: string, text?: string }
router.post('/send', async (req: Request, res: Response) => {
  const { to, subject, html, text } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Email service not configured. Set SENDGRID_API_KEY.' });
  }

  try {
    await sendEmail(String(to), String(subject), String(html), text ? String(text) : undefined);
    return res.json({ success: true, to });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /broadcast — send to multiple emails or all users
// Body: { emails: string[] | "all", subject: string, html: string, text?: string }
router.post('/broadcast', async (req: Request, res: Response) => {
  const { emails, subject, html, text } = req.body;

  if (!subject || !html) {
    return res.status(400).json({ error: 'subject and html are required' });
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Email service not configured. Set SENDGRID_API_KEY.' });
  }

  let recipients: string[] = [];

  if (emails === 'all') {
    // Fetch all users with email from Firestore
    try {
      const snapshot = await db.collection('users').get();
      recipients = snapshot.docs
        .map(doc => doc.data().email as string)
        .filter(Boolean);
      console.log(`[Broadcast] Fetched ${recipients.length} emails from Firestore`);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
  } else if (Array.isArray(emails) && emails.length > 0) {
    recipients = emails.map(String).filter(e => e.includes('@'));
  } else {
    return res.status(400).json({ error: 'emails must be an array of email addresses or "all"' });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'No valid recipients found' });
  }

  // Respond immediately, run broadcast async
  res.json({
    success: true,
    message: `Broadcasting to ${recipients.length} recipients...`,
    total: recipients.length,
  });

  // Fire and forget
  sendBroadcast(recipients, String(subject), String(html), text ? String(text) : undefined).catch(err =>
    console.error('[Broadcast] Unhandled error:', err)
  );
});

export default router;

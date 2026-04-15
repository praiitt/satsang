import { Router, Request, Response } from 'express';
import { waClient } from './whatsapp-client';

const router = Router();

const BROADCAST_DELAY_MS = 3000; // 3 seconds between messages
const MAX_BROADCAST_SIZE = 100;

// Helper: sleep
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// GET /status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    connected: waClient.isConnected,
    qrPending: waClient.qrPending,
  });
});

// GET /all-info — status + logs + qr in one go to reduce requests (prevents 429)
router.get('/all-info', (_req: Request, res: Response) => {
  res.json({
    connected: waClient.isConnected,
    qrPending: waClient.qrPending,
    qr: waClient.isConnected ? null : waClient.qrBase64,
    logs: waClient.sendLogs
  });
});

// GET /qr — returns base64 QR code image
router.get('/qr', (req: Request, res: Response) => {
  if (waClient.isConnected) {
    return res.status(200).json({ connected: true, qr: null });
  }
  if (!waClient.qrBase64) {
    return res.status(202).json({ connected: false, qr: null, message: 'QR not yet generated. Initializing...' });
  }
  return res.json({ connected: false, qr: waClient.qrBase64 });
});

// POST /send — send a single message
// Body: { phone: string, message: string, mediaUrl?: string }
router.post('/send', async (req: Request, res: Response) => {
  const { phone, message, mediaUrl } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }

  try {
    await waClient.sendMessage(String(phone), String(message), mediaUrl);
    return res.json({ success: true, phone });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /broadcast — send message to multiple numbers
// Body: { phones: string[], message: string, mediaUrl?: string }
router.post('/broadcast', async (req: Request, res: Response) => {
  const { phones, message, mediaUrl } = req.body;

  if (!Array.isArray(phones) || phones.length === 0 || !message) {
    return res.status(400).json({ error: 'phones (array) and message are required' });
  }

  if (phones.length > MAX_BROADCAST_SIZE) {
    return res.status(400).json({
      error: `Broadcast limited to ${MAX_BROADCAST_SIZE} numbers per session to avoid bans.`,
    });
  }

  if (!waClient.isConnected) {
    return res.status(503).json({ error: 'WhatsApp not connected. Scan the QR code first.' });
  }

  // Respond immediately — broadcast runs async
  res.json({ success: true, message: `Broadcasting to ${phones.length} numbers...`, total: phones.length });

  // Fire and forget broadcast
  (async () => {
    console.log(`[Broadcast] Starting broadcast to ${phones.length} numbers ${mediaUrl ? '(with media)' : ''}`);
    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];
      try {
        await waClient.sendMessage(phone, message, mediaUrl);
        console.log(`[Broadcast] ✅ Sent to ${phone} (${i + 1}/${phones.length})`);
      } catch (err: any) {
        console.error(`[Broadcast] ❌ Failed to send to ${phone}: ${err.message}`);
      }
      // Rate limiting delay between messages
      if (i < phones.length - 1) {
        await sleep(BROADCAST_DELAY_MS);
      }
    }
    console.log('[Broadcast] ✅ Broadcast complete!');
  })();
});

// GET /logs — return send history
router.get('/logs', (_req: Request, res: Response) => {
  res.json({ logs: waClient.sendLogs });
});

export default router;

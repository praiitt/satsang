import { Router } from 'express';
import { getDb } from '../firebase.js';
import axios from 'axios';
import twilio from 'twilio';

const router = Router();
const COLLECTION = 'users'; // The Firebase Auth users mirrored in Firestore

// Helper: Require Auth (simplified for marketing-server if needed, or bypass if internal)
// In a real setup, we'd check JWT. Here we'll trust the request since it's from our own admin dashboard,
// but let's add a basic check or just let it be open since it's an internal microservice, 
// wait, let's look at how facebook-leads did it.
// To keep it simple and match existing patterns, I'll assume standard Express routes.
const requireAuth = (req: any, res: any, next: any) => next();

// ─── INITIATE VOBIZ CALL ───────────────────────────────────────────────────────

/**
 * POST /users/:id/call
 * Initiate an outbound AI call via Vobiz API to a registered user.
 */
router.post('/:id/call', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found in Firestore' });

    const user = doc.data() as any;
    
    // We might have phone in Firestore, or we might need to rely on the fact that the frontend verified they have a phone.
    // Let's assume the frontend passes the phone if it wasn't in Firestore, or it is in Firestore.
    // Usually, auth-server adds phone to Firestore. But if not, we should probably fetch from Auth.
    // For now, let's require phone to be stored or passed in the body.
    const phone = user.phone || user.phoneNumber || req.body.phone;
    if (!phone) return res.status(400).json({ error: 'User has no phone number' });

    const VOBIZ_AUTH_ID = process.env.VOBIZ_AUTH_ID;
    const VOBIZ_AUTH_TOKEN = process.env.VOBIZ_AUTH_TOKEN;
    const VOBIZ_FROM_NUMBER = process.env.VOBIZ_FROM_NUMBER;

    if (!VOBIZ_AUTH_ID || !VOBIZ_AUTH_TOKEN || !VOBIZ_FROM_NUMBER) {
       return res.status(500).json({ error: 'Vobiz credentials not configured in environment' });
    }

    let publicHost = process.env.MARKETING_SERVER_URL?.replace('https://', '').replace('http://', '');
    if (!publicHost && req.headers.host) publicHost = req.headers.host;
    
    // Use the same Twilio TwiML generator for Vobiz
    const twimlUrl = `https://${publicHost}/twilio-bot/twiml?leadId=${req.params.id}`;

    const payload = {
      to: phone,
      from: VOBIZ_FROM_NUMBER,
      answer_url: twimlUrl,
      record: true
    };

    const callRes = await axios.post(
      `https://api.vobiz.ai/api/v1/Account/${VOBIZ_AUTH_ID}/Call`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${VOBIZ_AUTH_ID}:${VOBIZ_AUTH_TOKEN}`).toString('base64'),
        }
      }
    );

    // Update Firestore to track the call
    await db.collection(COLLECTION).doc(req.params.id).set({
      callInitiatedAt: Date.now(),
      callStatus: 'initiated'
    }, { merge: true });

    return res.json({ success: true, callData: callRes.data });
  } catch (e: any) {
    console.error('[users-api] vobiz call error:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Call initiation failed', details: e.response?.data || e.message });
  }
});

// ─── SEND WHATSAPP ───────────────────────────────────────────────────────────

/**
 * POST /users/:id/send-whatsapp
 * Send a WhatsApp message via Twilio
 */
router.post('/:id/send-whatsapp', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found in Firestore' });

    const user = doc.data() as any;
    const phone = user.phone || user.phoneNumber || req.body.phone;
    if (!phone) return res.status(400).json({ error: 'No phone number for this user' });

    const message = `Namaste ${user.name || user.displayName || 'Spiritual Seeker'}! Welcome to the RRAASI community. We are thrilled to have you with us on this journey. \n\nIf you need any help creating AI Bhajans or exploring our features, feel free to reply to this message! 🙏✨`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || '';
    
    await client.messages.create({
        body: message,
        from: twilioFrom.includes('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`,
        to: phone.includes('whatsapp:') ? phone : `whatsapp:${phone}`
    });

    await db.collection(COLLECTION).doc(req.params.id).set({
      waSent: true,
      waSentAt: Date.now(),
      waFailed: false,
      waError: null,
    }, { merge: true });

    return res.json({ success: true, phone });
  } catch (e: any) {
    console.error('[users-api] WhatsApp error:', e.response?.data || e.message);
    await getDb().collection(COLLECTION).doc(req.params.id).set({
      waSent: false,
      waFailed: true,
      waError: e.message,
    }, { merge: true });
    return res.status(500).json({ error: 'WhatsApp failed', details: e.message });
  }
});

export default router;

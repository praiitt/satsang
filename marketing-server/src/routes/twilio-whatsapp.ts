import { Router } from 'express';
import { generateWhatsAppReply } from '../services/whatsapp-bot.js';
import twilio from 'twilio';

const router = Router();
const { MessagingResponse } = twilio.twiml;

router.post('/incoming', async (req, res) => {
    try {
        const from = req.body.From;
        const text = req.body.Body;
        
        if (!from || !text) {
            console.warn('[TwilioWhatsApp] Missing From or Body in webhook payload', req.body);
            return res.status(400).send('Missing From or Body');
        }

        // Twilio sends "whatsapp:+1234567890" -> we strip the prefix to get the clean E.164 number
        const senderNumber = from.replace('whatsapp:', '');
        console.log(`[TwilioWhatsApp] Incoming from ${senderNumber}: ${text}`);
        
        // Use the existing WhatsApp bot logic and Suno integration
        const replyText = await generateWhatsAppReply(senderNumber, text);
        
        console.log(`[TwilioWhatsApp] Reply to ${senderNumber}: ${replyText}`);
        
        // Respond to Twilio using TwiML
        const twiml = new MessagingResponse();
        twiml.message(replyText);
        
        res.type('text/xml').send(twiml.toString());
    } catch (error: any) {
        console.error('[TwilioWhatsApp] Error processing message:', error);
        
        // Fallback response so Twilio gets a valid XML response
        const twiml = new MessagingResponse();
        twiml.message("I'm currently experiencing some technical difficulties. Please try again in a few moments. 🙏");
        res.type('text/xml').send(twiml.toString());
    }
});

export default router;

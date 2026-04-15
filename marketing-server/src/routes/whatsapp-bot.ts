import { Router } from 'express';
import { generateWhatsAppReply } from '../services/whatsapp-bot.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/reply', requireAuth, async (req, res) => {
    try {
        const { sender, text } = req.body;
        
        if (!sender || !text) {
            return res.status(400).json({ error: 'Missing sender or text' });
        }

        console.log(`[WhatsAppBot] Incoming from ${sender}: ${text}`);
        
        const reply = await generateWhatsAppReply(sender, text);
        
        console.log(`[WhatsAppBot] Reply to ${sender}: ${reply}`);
        
        return res.json({ reply });
    } catch (error: any) {
        console.error('[WhatsAppBot] Error:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;

import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import OpenAI from 'openai';
import { getAuth } from 'firebase-admin/auth';

// Remove top-level initializations
// We will initialize them lazily inside the class methods
// to ensure dotenv has loaded the variables first.

interface MarketingContext {
    serviceOfInterest: 'guru' | 'music' | 'tarot' | 'astrology' | 'general';
    userName?: string;
    zodiacSign?: string; // Optional, if we have it
}

export class MarketingService {
    private static openai: OpenAI | null = null;
    private static twilioClient: twilio.Twilio | null = null;
    private static sendGridInitialized = false;

    private static getOpenAI() {
        if (!this.openai) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        return this.openai;
    }

    private static getTwilio() {
        if (!this.twilioClient) {
            const sid = process.env.TWILIO_ACCOUNT_SID;
            const token = process.env.TWILIO_AUTH_TOKEN;
            if (sid && token) {
                this.twilioClient = twilio(sid, token);
            }
        }
        return this.twilioClient;
    }

    private static initSendGrid() {
        if (!this.sendGridInitialized) {
            const key = process.env.SENDGRID_API_KEY;
            if (key) {
                sgMail.setApiKey(key);
                this.sendGridInitialized = true;
            }
        }
    }

    /**
     * Generates a WhatsApp-specific message using OpenAI
     */
    static async generateWhatsAppContent(theme: string, userName?: string) {
        const name = userName || 'Friend';
        const systemPrompt = `You are the voice of RRAASI, an AI platform for spirituality.
    Generate a warm, mystical, and concise WhatsApp message for a user.
    Theme: ${theme}
    User Name: ${name}
    
    Rules:
    - Max 50 words.
    - Use 1-2 relevant emojis.
    - Include a clear, natural CTA to https://rraasi.com.
    - Tone: Compassionate, modern Indian spirituality.
    - Format: Respond ONLY with the message text.`;

        try {
            const completion = await this.getOpenAI().chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }],
                model: "gpt-4o-mini",
            });
            return completion.choices[0].message.content || `Namaste ${name}, explore the spiritual dimension with RRAASI. Explore now: https://rraasi.com`;
        } catch (error) {
            console.error('WhatsApp Gen Error:', error);
            return `Namaste ${name}, welcome to RRAASI. Your journey to spiritual clarity starts here: https://rraasi.com`;
        }
    }

    /**
     * Sends bulk WhatsApp messages
     */
    static async sendBulkWhatsApp(users: { phone: string; name: string }[], messageTemplate: string) {
        const client = this.getTwilio();
        const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        if (!client || !twilioNumber) {
            throw new Error('Twilio not configured for WhatsApp');
        }

        const stats = { success: 0, failed: 0, details: [] as any[] };

        for (const user of users) {
          try {
            const personalizedMessage = messageTemplate.replace(/\{\{name\}\}/g, user.name || 'Friend');
            const res = await client.messages.create({
              from: twilioNumber,
              to: user.phone.startsWith('whatsapp:') ? user.phone : `whatsapp:${user.phone}`,
              body: personalizedMessage,
            });
            stats.success++;
            stats.details.push({ phone: user.phone, sid: res.sid, status: 'sent' });
          } catch (e: any) {
            stats.failed++;
            stats.details.push({ phone: user.phone, error: e.message, status: 'failed' });
          }
        }
        return stats;
    }

    /**
     * Generates personalized content using OpenAI (Legacy/Welcome)
     */
    private static async generateAIContent(context: MarketingContext) {
        const { serviceOfInterest, userName } = context;
        const name = userName || 'Friend';

        const systemPrompt = `You are the voice of RRAASI, a conscious AI platform for spirituality. 
    Generate two messages for a new user interested in "${serviceOfInterest}".
    1. A short WhatsApp message (max 30 words).
    2. A slightly longer Email body paragraph (max 60 words).
    JSON: { "whatsapp": "...", "email": "..." }`;

        try {
            const completion = await this.getOpenAI().chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
            });
            return JSON.parse(completion.choices[0].message.content || '{}');
        } catch {
            return { whatsapp: `Welcome to RRAASI, ${name}!`, email: `Welcome to RRAASI.` };
        }
    }

    /**
     * Sends the Welcome "Eco-Culture" Packet
     */
    static async sendWelcomePacket(userId: string, email: string | undefined, phone: string | undefined, context: MarketingContext) {
        console.log(`[Marketing] Sending welcome packet to ${userId} for ${context.serviceOfInterest}`);

        // 1. Generate Content
        const content = await this.generateAIContent(context);

        const results = { email: false, whatsapp: false };

        // 2. Send Email
        this.initSendGrid();
        if (email && process.env.SENDGRID_API_KEY) {
            const msg = {
                to: email,
                from: 'no-reply@rraasi.com', // Update this with verified sender
                subject: `Welcome to the ${context.serviceOfInterest.charAt(0).toUpperCase() + context.serviceOfInterest.slice(1)} Eco-Culture | RRAASI`,
                html: `
          <div style="font-family: sans-serif; color: #4a4a4a; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d4af37;">Welcome to RRAASI</h1>
            <p>${content.email}</p>
            <br/>
            <p><strong>Join the others who have awakened.</strong></p>
            <a href="https://rraasi.com" style="background-color: #d4af37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Your Journey</a>
          </div>
        `,
            };

            try {
                const response = await sgMail.send(msg);
                console.log(`[Marketing] Email sent successfully to ${email}. Response Code: ${response[0].statusCode}`);
                // console.log(`[Marketing] SendGrid Response Body:`, JSON.stringify(response[0].body));
                results.email = true;
            } catch (error: any) {
                console.error('[Marketing] Email Failed:', error);
                if (error.response) {
                    console.error('[Marketing] SendGrid Error Body:', JSON.stringify(error.response.body));
                }
            }
        } else {
            console.log('[Marketing] Skipping Email: No email provided or missing SENDGRID_API_KEY');
        }

        // 3. Send WhatsApp
        const client = this.getTwilio();
        const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

        if (phone && client && twilioNumber) {
            try {
                const message = await client.messages.create({
                    from: twilioNumber,
                    to: phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`,
                    body: content.whatsapp,
                });
                console.log(`[Marketing] WhatsApp sent successfully to ${phone}. Basic SID: ${message.sid}, Status: ${message.status}`);
                results.whatsapp = true;
            } catch (error: any) {
                console.error('[Marketing] WhatsApp Failed:', error);
                if (error.code) {
                    console.error(`[Marketing] Twilio Error Code: ${error.code}, Message: ${error.message}`);
                }
            }
        } else {
            console.log('[Marketing] Skipping WhatsApp: No phone, client or TWILIO_WHATSAPP_NUMBER missing.');
            if (!client) console.log('[Marketing] Twilio client not initialized (check credentials).');
        }

        // 4. Save Log to Firestore
        try {
            const { getDb } = await import('../firebase.js');
            const db = getDb();
            await db.collection('marketing_logs').add({
                userId,
                email,
                phone,
                serviceOfInterest: context.serviceOfInterest,
                aiContent: content,
                results,
                timestamp: new Date(),
                metadata: {
                    zodiacSign: context.zodiacSign,
                    userName: context.userName
                }
            });
            console.log('[Marketing] ✅ Log saved to Firestore');
        } catch (dbError) {
            console.error('[Marketing] ❌ Failed to save log to Firestore:', dbError);
        }

        return { success: true, results, aiContent: content };
    }
}

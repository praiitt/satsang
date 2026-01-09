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
     * Generates personalized content using OpenAI
     */
    private static async generateAIContent(context: MarketingContext) {
        const { serviceOfInterest, userName, zodiacSign } = context;
        const sign = zodiacSign || 'seeker';
        const name = userName || 'Friend';

        const systemPrompt = `You are the voice of RRAASI, a conscious AI platform for spirituality. 
    Your tone is mystical, warm, welcoming, and slightly urgent (FOMO - "Fear Of Missing Out" on spiritual growth).
    Generate two messages for a new user interested in "${serviceOfInterest}".
    
    1. A short WhatsApp message (max 30 words).
    2. A slightly longer Email body paragraph (max 60 words).
    
    Mention that thousands of others are already finding clarity/peace here (Social Proof).
    Use their name (${name}) and zodiac sign (${sign}) if relevant logic applies.
    Response must be valid JSON: { "whatsapp": "...", "email": "..." }`;

        try {
            const completion = await this.getOpenAI().chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }],
                model: "gpt-4o-mini", // Cost efficient
                response_format: { type: "json_object" },
            });

            const content = JSON.parse(completion.choices[0].message.content || '{}');
            return {
                whatsapp: content.whatsapp || `Welcome to RRAASI, ${name}. Your journey begins now.`,
                email: content.email || `We are honored to have you, ${name}. Join our community of seekers finding their path.`
            };
        } catch (error) {
            console.error('OpenAI Gen Error:', error);
            // Fallback
            return {
                whatsapp: `Welcome to RRAASI, ${name}! Your spiritual journey in ${serviceOfInterest} starts now.`,
                email: `Welcome to RRAASI. We are excited to guide you on your path in ${serviceOfInterest}.`
            };
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

import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;
const toPhone = '+918454083097';

if (!accountSid || !authToken || !twilioFrom) {
    console.error('Missing Twilio credentials in .env');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testTwilio() {
    try {
        console.log(`Sending WhatsApp from ${twilioFrom} to ${toPhone}...`);
        const message = await client.messages.create({
            body: 'Hello from Twilio Test! 🙏',
            from: twilioFrom.includes('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`,
            to: toPhone.includes('whatsapp:') ? toPhone : `whatsapp:${toPhone}`
        });
        console.log('Success! Message SID:', message.sid);
    } catch (e: any) {
        console.error('Twilio Error:', e.message);
    }
}
testTwilio();

import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// You can pass the target phone number as an argument
const toNumber = process.argv[2] || process.env.TEST_WHATSAPP_NUMBER;

if (!sid || !token || !fromNumber) {
    console.error('❌ Missing Twilio credentials in .env.local');
    console.error({ sid: !!sid, token: !!token, fromNumber: !!fromNumber });
    process.exit(1);
}

if (!toNumber) {
    console.error('❌ Please provide a destination phone number.');
    console.error('Usage: npx tsx scripts/test-whatsapp.ts +919876543210');
    process.exit(1);
}

console.log(`Initializing Twilio with SID starting with ${sid.substring(0, 4)}...`);
const client = twilio(sid, token);

async function sendTestMessage(fromVal: string, toVal: string) {
    try {
        console.log(`Sending test WhatsApp message from ${fromVal} to ${toVal}...`);
        
        // Ensure the to number has the whatsapp: prefix
        const formattedTo = toVal.startsWith('whatsapp:') ? toVal : `whatsapp:${toVal}`;
        const formattedFrom = fromVal.startsWith('whatsapp:') ? fromVal : `whatsapp:${fromVal}`;

        const message = await client.messages.create({
            body: 'नमस्ते! 🙏 This is a test message from RRAASI Satsang marketing module. Guruji is ready.',
            from: formattedFrom,
            to: formattedTo
        });

        console.log('✅ Message sent successfully!');
        console.log(`Message SID: ${message.sid}`);
        console.log(`Status: ${message.status}`);
        
    } catch (error: any) {
        console.error('❌ Failed to send message:');
        console.error(`Error Code: ${error.code}`);
        console.error(`Message: ${error.message}`);
        console.error(error);
    }
}

sendTestMessage(fromNumber, toNumber);

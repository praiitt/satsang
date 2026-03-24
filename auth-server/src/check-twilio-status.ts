import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env.local') });

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;

if (!sid || !token) {
    console.error('Missing credentials');
    process.exit(1);
}

const client = twilio(sid, token);

async function checkStatus() {
    try {
        // Fetch the last 3 messages sent
        const messages = await client.messages.list({ limit: 3 });
        
        console.log('--- Last 3 Messages Status ---');
        messages.forEach(m => {
            console.log(`SID: ${m.sid}`);
            console.log(`To: ${m.to}`);
            console.log(`From: ${m.from}`);
            console.log(`Status: ${m.status}`);
            if (m.errorCode) {
                console.log(`Error Code: ${m.errorCode}`);
                console.log(`Error Message: ${m.errorMessage}`);
            }
            console.log('------------------------');
        });
    } catch (error) {
        console.error('Failed to fetch messages:', error);
    }
}

checkStatus();

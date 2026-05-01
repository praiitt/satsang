import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUNO_API_KEY = process.env.SUNO_API_KEY;
console.log("Checking API Box response...");
fetch('https://apibox.erweima.ai/api/v1/generate', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${SUNO_API_KEY}` 
    },
    body: JSON.stringify({
        prompt: 'test prompt bhajan hindi',
        customMode: false,
        instrumental: false,
        model: 'V3_5',
        callbackUrl: 'https://rraasi.com/api/suno/callback'
    })
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(err => console.error(err));

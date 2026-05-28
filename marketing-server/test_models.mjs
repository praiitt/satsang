import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
const key = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    .then(res => res.json())
    .then(data => {
        if (!data.models) console.log('Error:', data);
        else console.log(JSON.stringify(data.models.map(m => m.name).filter(n => n.includes('imagen') || n.includes('flash')), null, 2));
    })
    .catch(console.error);

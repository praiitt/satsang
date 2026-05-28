const WebSocket = require('ws');
require('dotenv').config({path: '../.env'});

const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
});

openAiWs.on('open', () => {
    const payload = {
        type: 'session.update',
        session: {
            type: 'realtime',
            audio: {
                input: {
                    format: { type: 'audio/pcmu' },
                    transcription: { model: 'whisper-1' },
                    turn_detection: { type: 'server_vad' }
                },
                output: {
                    format: { type: 'audio/pcmu' },
                    voice: "coral"
                }
            },
            instructions: "Hello",
            output_modalities: ['audio'],
            tools: [{
                type: 'function', name: 'end_call',
                description: 'End the phone call gracefully.',
                parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] }
            }, {
                type: 'function', name: 'generate_music',
                description: 'Generate music.',
                parameters: { type: 'object', properties: { prompt: { type: 'string' }, title: { type: 'string' } }, required: ['prompt', 'title'] }
            }, {
                type: 'function', name: 'send_whatsapp_link',
                description: 'Send a link.',
                parameters: { type: 'object', properties: { link_type: { type: 'string', enum: ['music', 'satsang', 'login', 'general'] } }, required: ['link_type'] }
            }]
        }
    };
    openAiWs.send(JSON.stringify(payload));
});

openAiWs.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === 'session.updated') {
        console.log("✅ SUCCESS! session.updated received:");
        console.log(JSON.stringify(data.session, null, 2));
        process.exit(0);
    } else if (data.type === 'error') {
        console.error("❌ ERROR received:");
        console.error(JSON.stringify(data.error, null, 2));
        process.exit(1);
    }
});

openAiWs.on('error', (e) => console.error(e));
setTimeout(() => {
    console.log("Timeout waiting for response.");
    process.exit(1);
}, 5000);

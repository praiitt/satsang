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
                    turn_detection: { 
                        type: 'server_vad',
                        threshold: 0.99,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500
                    }
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
            }]
        }
    };
    openAiWs.send(JSON.stringify(payload));

    setTimeout(() => {
        openAiWs.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Hello!' }] } }));
        openAiWs.send(JSON.stringify({ type: 'response.create' }));
        console.log("Triggered AI greeting");
    }, 1000);
});

openAiWs.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === 'response.audio.delta') {
        console.log("🎵 Received audio chunk!");
        process.exit(0);
    } else if (data.type === 'error') {
        console.error("❌ ERROR received:");
        console.error(JSON.stringify(data.error, null, 2));
        process.exit(1);
    } else {
        console.log(`Event: ${data.type}`);
    }
});

openAiWs.on('error', (e) => console.error(e));
setTimeout(() => {
    console.log("Timeout waiting for response audio.");
    process.exit(1);
}, 10000);

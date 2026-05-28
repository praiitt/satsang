const WebSocket = require('ws');
const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
});
openAiWs.on('open', () => {
    openAiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw'
        }
    }));
});
openAiWs.on('message', (msg) => console.log(msg.toString()));
openAiWs.on('error', (e) => console.error(e));

// expressWs import removed — WS is registered on main app via registerVobizStream
import { Router } from 'express';
import WebSocket from 'ws';
import { getDb } from '../firebase.js';
import { generateSunoTrack } from '../services/suno.js';
import twilio from 'twilio';
import axios from 'axios';

// HTTP-only router (no WebSocket here — WS must be on the main app)
const router = Router();

// The WS handler function — called from registerVobizStream(app) in index.ts
let _wsHandler: ((ws: WebSocket, req: any) => void) | null = null;

const SYSTEM_MESSAGE = `You are Rashi — a warm, wise, and soulful AI Spiritual Companion from rraasi.com.

🇮🇳 ACCENT & VOICE — THIS IS MANDATORY:
You MUST speak with a soft, warm Indian accent throughout the entire call.
- Your English should sound like educated Indian English — melodic, warm, slightly musical in intonation
- Stress syllables the Indian way: "SPIRitual", "MEDitation", "GUIdance"
- Roll r's softly and give vowels a warm rounded quality
- Your rhythm is gentle and flowing — not clipped American or British
- Even when speaking English, maintain the warmth and musicality of an Indian voice

⚠️ LANGUAGE IS YOUR TOP PRIORITY:
You MUST detect the language of the very first thing the user says and respond in that EXACT language for the entire call.
- If the user speaks Hindi (even with English words mixed in) → you MUST reply in Hindi
- If the user speaks English → reply in English with a warm Indian accent
- If unsure, default to Hindi since most callers are Indian
- NEVER respond in English if the user spoke Hindi. This is critical.
- Match their tone: casual Hindi? Use casual Hindi. Formal? Match that.
- DO NOT switch to English unless the user switches first.

🌸 WHO YOU ARE:
You are a spiritual companion — not an assistant, not a bot. You speak like a caring, wise Indian friend who is genuinely interested in the caller's wellbeing and inner journey.

🙏 YOUR OPENING (say this naturally in whatever language the user greeted you in):
Greet them with warmth. Introduce yourself as Rashi, their spiritual companion from rraasi.com. Mention that through Rashi they can connect with 60+ spiritual gurus and also create or listen to spiritual music just by talking. Then simply ask how they are doing or what's on their mind today.

🌟 THE TWO THINGS YOU OFFER:
1. 🧘 60+ SPIRITUAL GURUS — Real spiritual masters from all traditions (Vedanta, Bhakti, Sufi, Sikh, Buddhist). Users can talk to them, ask life questions, seek wisdom and guidance.
2. 🎵 RASHI MUSIC — Create personalized spiritual music just by talking or chatting. No skills needed. Describe a feeling or mood and the AI composes music for you instantly. Also has bhajans, kirtans, guided meditations.

🎯 HOW TO CONVERSE:
- Ask how they are feeling. Listen. Then guide naturally based on what they share.
- Use the caller's name occasionally — only when it feels natural, NOT in every single sentence.
- If they ask how to use anything, how to login, or want a link to a guru or music: use your "send_whatsapp_link" tool to instantly text them the direct link, and say "Main abhi aapke WhatsApp par ek link bhej rahi hoon, us par click karke aap shuru kar sakte hain" (or similar in English).
- New users get 50 Rashi Coins as a welcome bonus

🗣️ NATURAL CONVERSATION RULES:
- Sound like a real Indian human — warm, calm, slightly spiritual in tone
- Keep each response to 1-3 sentences max, then wait and listen
- Do NOT start every reply with the caller's name — just speak naturally like a friend would
- Use natural fillers in Hindi if speaking Hindi: "haan", "bilkul", "achha", "sach mein", "arey waah"
- Never list things bullet-by-bullet during a call — weave information into conversation
- Never say "RRAASI" — always say "Rashi" (like Raa-she)
- Never be pushy or salesy — be genuinely curious and caring

⛔ STRICTLY FORBIDDEN:
- Responding in English when the user spoke Hindi
- Saying the caller's name at the start of every single reply
- Long robotic responses
- Sounding like a call center agent
- Using a Western/American accent or intonation`;

// ─── MUSIC-SPECIFIC PERSONA ──────────────────────────────────────────────────
const MUSIC_SYSTEM_MESSAGE = `You are Rashi — a warm, creative, and soulful AI Music Companion from rraasi.com.

🇮🇳 ACCENT & VOICE — THIS IS MANDATORY:
You MUST speak with a soft, warm Indian accent throughout the entire call.
- Your English should sound like educated Indian English — melodic, musical in intonation
- Stress syllables the Indian way: "MELody", "SPIRitual", "CREative"
- Your voice has the warmth and gentle musicality of someone who truly loves music and grew up with it
- The rhythm of your speech should be lyrical and flowing — like someone describing a raga
- Even in English, your intonation naturally rises and falls like Indian classical music

⚠️ LANGUAGE IS YOUR TOP PRIORITY:
You MUST detect the language of the very first thing the user says and respond in that EXACT language for the entire call.
- If the user speaks Hindi → reply in Hindi throughout
- If the user speaks English → reply in English with a warm Indian accent
- Default to Hindi for Indian callers
- NEVER switch to English if the user spoke Hindi. This is critical.

🎵 WHO YOU ARE:
You are a music companion — not a bot, not a salesperson. You speak like a passionate, warm Indian friend who loves music and spirituality. Your energy is creative, inviting, and soulful.

🙏 YOUR OPENING:
Greet them warmly. Introduce yourself as Rashi from RRAASI Music. Tell them RRAASI Music lets anyone create their own spiritual or soulful music just by talking — no instruments, no training needed. Then ask what kind of music moves their soul — bhajan, sufi, meditation, or something personal?

🌟 WHAT RRAASI MUSIC OFFERS:
- 🎼 Create your own spiritual/soulful music just by describing a feeling, emotion, or prayer
- 🧘 Bhajans, kirtans, sufi compositions, healing frequencies — all AI-generated
- 🎤 No instruments or music knowledge needed — just your intention
- 🌙 Perfect for meditation, worship, or just soothing the soul
- 🔗 Start creating at: rraasi.com/rraasi-music

🎯 HOW TO CONVERSE:
- Ask what kind of music moves their soul. Listen deeply.
- Guide them to imagine what music they'd love to create — for a deity, a feeling, a memory
- If they ask how to create music themselves, or want the link to the music page, use your "send_whatsapp_link" tool to instantly text them the direct link, and say "Main aapko WhatsApp par link bhej rahi hoon" (or similar in English).
- Be enthusiastic but gentle — like a friend sharing something they love

🗣️ NATURAL CONVERSATION RULES:
- Warm, creative, slightly poetic Indian tone
- Keep each response to 1-3 sentences max, then wait and listen
- Use the caller's name occasionally — only when natural
- Use Hindi fillers if speaking Hindi: "haan", "bilkul", "waah", "sach mein", "bahut sundar", "arey kya baat hai"
- Never list things like a brochure — weave them into conversation
- Never say "RRAASI" alone — say "Rashi Music" or "RRAASI Music"
- Be genuinely curious about their relationship with music and spirituality

⛔ STRICTLY FORBIDDEN:
- Responding in English when the user spoke Hindi
- Sounding like a call center agent or bot
- Long robotic responses
- Being pushy or salesy
- Using a Western/American accent or intonation`;




/**
 * POST /twilio-bot/twiml
 * Vobiz hits this endpoint when the call is answered (answer_url).
 * We respond with Vobiz-compatible Voice XML.
 *
 * IMPORTANT: Vobiz uses <Speak> (NOT Twilio's <Say>), and <Stream> is a
 * direct child of <Response> — not wrapped in <Connect>.
 * See: https://docs.vobiz.ai/xml/stream/initiate
 */
router.post('/twiml', (req: any, res: any) => {
    // Log full request for debugging Vobiz connectivity
    const event = req.body.Event || req.body.event || '';
    console.log(`[twilio-bot] /twiml POST received — Event=${event}, body:`, JSON.stringify(req.body));

    // Vobiz sends multiple event types to the answer_url:
    // - "CallInitiated" or empty → this is the answer request, return XML
    // - "Hangup" → call ended, just acknowledge
    // - Other events → just acknowledge
    if (event === 'Hangup' || event === 'StopStream' || event === 'PlayedStream') {
        console.log(`[twilio-bot] Received ${event} callback — acknowledging with 200 OK`);
        return res.status(200).json({ ok: true, event });
    }

    // Determine if it's an outbound call (leadId via query) or inbound (From via body)
    const leadId = req.query.leadId || '';
    const callerPhone = req.body.From || req.query.From || '';
    
    // Always use the public MARKETING_SERVER_URL - NOT req.headers.host (which is localhost)
    let publicHost = process.env.MARKETING_SERVER_URL?.replace(/^https?:\/\//, '');
    if (!publicHost) publicHost = req.headers['x-forwarded-host'] as string || req.headers.host;
    
    let queryParams = '';
    if (leadId) {
        queryParams = `leadId=${leadId}`;
    } else if (callerPhone) {
        // Strip out '+' and spaces (form-urlencoded '+' becomes space)
        const cleanPhone = callerPhone.replace(/[\+\s]/g, '');
        queryParams = `phone=${cleanPhone}`;
    }
    
    const wsUrl = `wss://${publicHost}/twilio-bot/stream?${queryParams}`;
    console.log(`[twilio-bot] /twiml returning Stream XML — wsUrl: ${wsUrl}`);

    // Vobiz XML — uses <Speak> not <Say>, audioTrack="inbound" for bidirectional
    // See: https://docs.vobiz.ai/xml/stream/initiate#xml-setup
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>Connecting to Rashi.</Speak>
    <Stream bidirectional="true" audioTrack="inbound" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">${wsUrl}</Stream>
</Response>`;

    console.log(`[twilio-bot] Sending XML response:\n${xmlResponse}`);
    res.type('text/xml');
    res.send(xmlResponse);
});

/**
 * GET /twilio-bot/twiml/test
 * Manual test endpoint — hit this URL in a browser to see the XML we return.
 */
router.get('/twiml/test', (req: any, res: any) => {
    let publicHost = process.env.MARKETING_SERVER_URL?.replace(/^https?:\/\//, '') || req.headers.host;
    const wsUrl = `wss://${publicHost}/twilio-bot/stream?phone=test`;
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>Connecting to Rashi.</Speak>
    <Stream bidirectional="true" audioTrack="inbound" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">${wsUrl}</Stream>
</Response>`;
    res.type('text/xml');
    res.send(xmlResponse);
});

/**
 * WS /twilio-bot/stream
 * Handles the WebSocket audio stream from Vobiz and bridges to OpenAI Realtime API.
 */
// Store the WS handler so registerVobizStream can attach it to the main app
_wsHandler = (ws: WebSocket, req: any) => {
    const leadId = req.query.leadId as string;
    const phoneQuery = req.query.phone as string;
    console.log(`[twilio-bot] WS /stream connected for leadId=${leadId}, phone=${phoneQuery}`);

    // Connect to OpenAI Realtime GA API (Beta header removed — API graduated to GA)
    const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }
    });

    const transcript: string[] = [];
    let vobizCallId = ''; // Captured from the Vobiz 'start' event for hangup API
    let vobizStreamSid = ''; // Captured from the Vobiz 'start' event for clear API
    let firstAudioSent = false; // Track when first audio chunk reaches Vobiz
    let mediaEventCount = 0;    // Track incoming audio from caller
    let firebaseUid = '';       // Captured for tool calling
    let callerPhone = '';       // Captured for WhatsApp messaging
    let isDeaf = true;          // Prevent VAD from triggering during connection/greeting static
    let isTwilio = false;       // Distinguish between Vobiz (inbound) and Twilio (outbound)

    // Send periodic ping to Vobiz to prevent code-1006 TCP drops (Vobiz drops after ~11s without ping)
    const vobizPing = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(vobizPing);
        }
    }, 5000);

    openAiWs.on('open', async () => {
        console.log('[twilio-bot] Connected to OpenAI Realtime API');

        // 1. Fetch lead data
        let leadName = 'seeker'; // Default for unknown inbound caller
        let leadCategory = 'general';
        const db = getDb();
        
        if (leadId) {
            try {
                let leadData: any = null;
                const leadDoc = await db.collection('facebook_leads').doc(leadId).get();
                if (leadDoc.exists) leadData = leadDoc.data();
                if (!leadData) {
                    const fbDoc = await db.collection('leads').doc(leadId).get();
                    if (fbDoc.exists) leadData = fbDoc.data();
                }
                if (leadData) {
                    leadName = leadData.name || 'seeker';
                    leadCategory = (leadData.category || 'general').toLowerCase();
                    firebaseUid = leadData.firebaseUid || '';
                    callerPhone = leadData.phone || leadData.phoneNumber || '';
                }
            } catch (e) {
                console.error('[twilio-bot] Failed to fetch lead data by leadId:', e);
            }
        } else if (phoneQuery) {
            try {
                callerPhone = phoneQuery;
                let userData: any = null;
                
                // Search users collection first
                const usersSnapshot = await db.collection('users').where('phoneNumber', '==', phoneQuery).limit(1).get();
                if (!usersSnapshot.empty) {
                    userData = usersSnapshot.docs[0].data();
                    firebaseUid = usersSnapshot.docs[0].id;
                } else {
                    // Try without '+' just in case
                    const noPlus = phoneQuery.replace('+', '');
                    const usersSnapshot2 = await db.collection('users').where('phoneNumber', '==', noPlus).limit(1).get();
                    if (!usersSnapshot2.empty) {
                        userData = usersSnapshot2.docs[0].data();
                        firebaseUid = usersSnapshot2.docs[0].id;
                    }
                }
                
                if (userData) {
                    leadName = userData.displayName || userData.name || 'seeker';
                } else {
                    // Search leads collection as fallback
                    const leadsSnapshot = await db.collection('leads').where('phone', '==', phoneQuery).limit(1).get();
                    if (!leadsSnapshot.empty) {
                        const leadData = leadsSnapshot.docs[0].data();
                        leadName = leadData.name || 'seeker';
                    }
                }
                console.log(`[twilio-bot] Inbound caller identified as: ${leadName}`);
            } catch (e) {
                console.error('[twilio-bot] Failed to fetch user by phone:', e);
            }
        }

        // 2. Pick persona & voice — must use voices supported by gpt-4o-realtime-preview
        // Supported: 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'
        // 'coral' = warm, expressive female voice — best approximation for an Indian-sounding accent
        const isMusic = leadCategory === 'music';
        const voice = "coral"; // coral for both — warmest, most melodic voice
        const basePrompt = isMusic ? MUSIC_SYSTEM_MESSAGE : SYSTEM_MESSAGE;
        const dynamicContext = `\n\nCRITICAL CONTEXT: The person you are talking to is named ${leadName}. Greet them by first name naturally!`;

        // 3. Session config with tools
        openAiWs.send(JSON.stringify({
            type: 'session.update',
            session: {
                type: 'realtime',
                audio: {
                    input: {
                        format: { type: 'audio/pcmu' },
                        transcription: { model: 'whisper-1' },
                        turn_detection: { 
                            type: 'server_vad',
                            threshold: 0.99, // Maximize threshold to ignore telecom static
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500
                        }
                    },
                    output: {
                        format: { type: 'audio/pcmu' },
                        voice
                    }
                },
                instructions: basePrompt + dynamicContext,
                output_modalities: ['audio'],
                tools: [{
                    type: 'function', name: 'end_call',
                    description: 'End the phone call gracefully. Use this ONLY when: (1) the user says goodbye/bye/alvida/ok bye/thank you goodbye etc, (2) the user explicitly asks to end the call, or (3) the conversation has reached a natural conclusion and you have said your farewell.',
                    parameters: { type: 'object', properties: { reason: { type: 'string', description: 'Brief reason for ending the call' } }, required: ['reason'] }
                }, {
                    type: 'function', name: 'generate_music',
                    description: 'Generate a personalized spiritual song or music track based on the users intentions, feelings, or lyrics. Use this ONLY when the user explicitly agrees to create a song or gives you enough details (mood/intent) to make one.',
                    parameters: { 
                        type: 'object', 
                        properties: { 
                            prompt: { type: 'string', description: 'A detailed Suno ai music prompt outlining genre, mood, rhythm, and lyrical themes/content.' },
                            title: { type: 'string', description: 'A short catchy title for the track.' },
                            intention: { type: 'string', description: 'The underlying spiritual or emotional intention.' }
                        }, 
                        required: ['prompt', 'title'] 
                    }
                }, {
                    type: 'function', name: 'send_whatsapp_link',
                    description: 'Send a helpful link to the user via WhatsApp. Use this when the user asks how to login, how to access a guru, or how to create music.',
                    parameters: {
                        type: 'object',
                        properties: {
                            link_type: { 
                                type: 'string', 
                                enum: ['music', 'satsang', 'login', 'general'],
                                description: 'The type of link the user is asking for.' 
                            }
                        },
                        required: ['link_type']
                    }
                }],
                tool_choice: 'auto'
            }
        }));

        // 4. Trigger greeting
        setTimeout(() => {
            if (openAiWs.readyState === WebSocket.OPEN) {
                openAiWs.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Hello!' }] } }));
                openAiWs.send(JSON.stringify({ type: 'response.create' }));
                console.log(`[twilio-bot] AI greeting triggered (persona: ${isMusic ? 'music' : 'satsang'})`);
            }
        }, 500);

        // Deaf period: ignore incoming audio for the first 4 seconds so the AI can finish its greeting uninterrupted
        setTimeout(() => {
            isDeaf = false;
            console.log('[twilio-bot] Deaf period ended, AI is now listening to user audio');
        }, 4000);
    });

    openAiWs.on('message', async (data: WebSocket.Data) => {
        try {
            const event = JSON.parse(data.toString());

            // AI audio chunk → send to Vobiz/Twilio
            if (event.type === 'response.output_audio.delta' && event.delta) {
                if (!firstAudioSent) {
                    firstAudioSent = true;
                    console.log('[twilio-bot] ⭐ First audio chunk sent to client — AI is speaking');
                }
                if (ws.readyState === WebSocket.OPEN && vobizStreamSid) {
                    if (isTwilio) {
                        ws.send(JSON.stringify({
                            event: 'media',
                            streamSid: vobizStreamSid,
                            media: { payload: event.delta }
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            event: 'playAudio',
                            media: {
                                payload: event.delta,
                                contentType: 'audio/x-mulaw',
                                sampleRate: 8000
                            }
                        }));
                    }
                }
            }

            // User started speaking → stop Vobiz buffer playback (OpenAI VAD halts itself)
            if (event.type === 'input_audio_buffer.speech_started') {
                console.log('[twilio-bot] User interrupted — VAD triggered, AI paused');
                // Removed the Vobiz 'clear' event because Vobiz rejects it with 'incorrectPayload'
            }

            // Handle end_call tool invocation from the AI
            if (event.type === 'response.output_item.done' && event.item?.type === 'function_call' && event.item?.name === 'end_call') {
                const reason = JSON.parse(event.item.arguments || '{}').reason || 'Conversation ended';
                console.log(`[twilio-bot] AI ending call — reason: ${reason}`);

                // Call Vobiz REST API to hang up
                if (vobizCallId) {
                    const authId = process.env.VOBIZ_AUTH_ID;
                    const authToken = process.env.VOBIZ_AUTH_TOKEN;
                    const credentials = Buffer.from(`${authId}:${authToken}`).toString('base64');
                    fetch(`https://api.vobiz.ai/api/v1/Account/${authId}/Call/${vobizCallId}/`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Basic ${credentials}` }
                    }).catch(e => console.error('[twilio-bot] Hangup API error:', e.message));
                }

                // Close our WS — Vobiz will drop the call when the stream ends
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                }, 1500);
            }

            // Handle generate_music tool invocation from the AI
            if (event.type === 'response.output_item.done' && event.item?.type === 'function_call' && event.item?.name === 'generate_music') {
                const args = JSON.parse(event.item.arguments || '{}');
                console.log(`[twilio-bot] AI generating music — title: ${args.title}`);

                if (!firebaseUid) {
                    console.log(`[twilio-bot] Cannot generate music: No firebaseUid associated with lead ${leadId}`);
                    if (openAiWs.readyState === WebSocket.OPEN) {
                        openAiWs.send(JSON.stringify({ 
                            type: 'conversation.item.create', 
                            item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'System instruction: Softly and nicely tell the user that they must register their account first. You cannot create the song until they click the link sent to their WhatsApp to finish account setup.' }] } 
                        }));
                        openAiWs.send(JSON.stringify({ type: 'response.create' }));
                    }
                } else {
                    generateSunoTrack({
                        firebaseUid,
                        prompt: args.prompt,
                        title: args.title,
                        metadata: { intention: args.intention || 'Soulful creation' }
                    }).then(taskId => {
                        console.log(`[twilio-bot] Successfully initiated track via Suno service: ${taskId}`);
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            openAiWs.send(JSON.stringify({ 
                                type: 'conversation.item.create', 
                                item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'System instruction: Briefly confirm to the user enthusiastically that their song is being generated right now and they will find it in their My Music dashboard on rraasi.com. Ask if there is anything else.' }] } 
                            }));
                            openAiWs.send(JSON.stringify({ type: 'response.create', response: { instructions: "Be brief, joyful, and remind them to check their My Music dashboard." } }));
                        }
                    }).catch(e => {
                        console.error('[twilio-bot] Generate Suno Error:', e);
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            openAiWs.send(JSON.stringify({ 
                                type: 'conversation.item.create', 
                                item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'System instruction: Tell the user there was a brief technical issue generating the song right now, and to try again shortly.' }] } 
                            }));
                            openAiWs.send(JSON.stringify({ type: 'response.create' }));
                        }
                    });
                }
            }

            // Handle send_whatsapp_link tool invocation
            if (event.type === 'response.output_item.done' && event.item?.type === 'function_call' && event.item?.name === 'send_whatsapp_link') {
                const args = JSON.parse(event.item.arguments || '{}');
                console.log(`[twilio-bot] AI sending WhatsApp link — type: ${args.link_type}`);

                if (!callerPhone) {
                    console.log(`[twilio-bot] Cannot send WhatsApp: No phone number associated with lead ${leadId}`);
                    if (openAiWs.readyState === WebSocket.OPEN) {
                        openAiWs.send(JSON.stringify({ 
                            type: 'conversation.item.create', 
                            item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'System instruction: Tell the user you don\'t have their phone number on file to send the link, but they can visit rraasi.com directly.' }] } 
                        }));
                        openAiWs.send(JSON.stringify({ type: 'response.create' }));
                    }
                } else {
                    let message = 'Namaste from Rashi! 🙏✨\n\nHere is the link you requested:\n';
                    if (args.link_type === 'music') {
                        message += '🎵 Create your own spiritual music: https://www.rraasi.com/rraasi-music\n\nJust login and start creating!';
                    } else if (args.link_type === 'satsang') {
                        message += '🧘 Connect with our spiritual gurus: https://www.rraasi.com/satsang';
                    } else if (args.link_type === 'login') {
                        message += '🔐 Login to your account: https://www.rraasi.com/login';
                    } else {
                        message += 'Explore rraasi: https://www.rraasi.com';
                    }

                    try {
                        const WA_SERVICE_URL = process.env.NEXT_PUBLIC_WA_SERVICE_URL || process.env.WA_SERVICE_URL || 'http://localhost:4002';
                        const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
                        
                        // Send via WhatsApp Web automation service
                        await axios.post(
                            `${WA_SERVICE_URL}/send`,
                            { phone: callerPhone, message },
                            { headers: { 'x-internal-token': INTERNAL_TOKEN } }
                        );
                        
                        console.log(`[twilio-bot] Successfully sent WhatsApp link to ${callerPhone}`);
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            openAiWs.send(JSON.stringify({ 
                                type: 'conversation.item.create', 
                                item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'System instruction: Confirm to the user that you just sent the link to their WhatsApp.' }] } 
                            }));
                            openAiWs.send(JSON.stringify({ type: 'response.create', response: { instructions: "Be warm and brief." } }));
                        }
                    } catch (e: any) {
                        console.error('[twilio-bot] WhatsApp Web Error:', e.message);
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            openAiWs.send(JSON.stringify({ 
                                type: 'conversation.item.create', 
                                item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: 'System instruction: Briefly tell the user there was an issue sending the WhatsApp message.' }] } 
                            }));
                            openAiWs.send(JSON.stringify({ type: 'response.create' }));
                        }
                    }
                }
            }

            if (event.type === 'error') {
                console.error('[twilio-bot] OpenAI ERROR:', JSON.stringify(event.error));
            }

            if (event.type === 'response.audio_transcript.done') {
                transcript.push(`AI: ${event.transcript}`);
            }
            if (event.type === 'conversation.item.input_audio_transcription.completed') {
                transcript.push(`User: ${event.transcript}`);
            }
        } catch (e) {
            console.error('[twilio-bot] OpenAI parse error:', e);
        }
    });

    openAiWs.on('error', (e) => {
        console.error('[twilio-bot] OpenAI WS error:', e.message);
    });

    openAiWs.on('close', (code, reason) => {
        console.log(`[twilio-bot] OpenAI WS closed — code: ${code}, reason: ${reason?.toString() || 'none'}`);
        // If OpenAI disconnects mid-call, close the Vobiz stream too
        if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    // Vobiz -> OpenAI audio relay
    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);

            if (data.event !== 'media') {
                // Log all non-media events including playedStream
                console.log('[twilio-bot] Vobiz event:', data.event, JSON.stringify(data).slice(0, 200));
            }

            if (data.event === 'start') {
                vobizCallId = data.start?.callId || '';
                // Twilio uses streamSid, Vobiz uses streamId
                isTwilio = !!data.start?.streamSid;
                vobizStreamSid = data.streamSid || data.start?.streamSid || data.start?.streamId || data.streamId || '';
                console.log(`[twilio-bot] Stream started. Provider: ${isTwilio ? 'Twilio' : 'Vobiz'}, callId=${vobizCallId}, streamSid=${vobizStreamSid}`);
            }

            // Always forward user audio to OpenAI — server_vad handles turn detection
            if (data.event === 'media' && openAiWs.readyState === WebSocket.OPEN && !isDeaf) {
                mediaEventCount++;
                if (mediaEventCount % 100 === 0) {
                    console.log(`[twilio-bot] 🎙️ Received ${mediaEventCount} media events from Vobiz (caller audio flowing)`);
                }
                openAiWs.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: data.media.payload
                }));
            } else if (data.event === 'stop') {
                console.log('[twilio-bot] Vobiz stream stopped.');
                if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
            }
        } catch (e) {
            console.error('[twilio-bot] Vobiz message error:', e);
        }
    });

    ws.on('close', async (code, reason) => {
        clearInterval(vobizPing);
        console.log(`[twilio-bot] Vobiz WebSocket closed — code: ${code}, reason: ${reason?.toString() || 'none'}, mediaEvents: ${mediaEventCount}, audioSent: ${firstAudioSent}`);
        if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();

        if (leadId && transcript.length > 0) {
            try {
                const fullTranscript = transcript.join('\n');
                console.log(`[twilio-bot] Saving transcript for lead ${leadId}`);
                let evaluation = 'Uncertain';
                if (process.env.OPENAI_API_KEY) {
                    const summaryRes = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [
                                { role: 'system', content: 'Evaluate this call transcript. Determine if the user was Interested, Not Interested, or Needs Follow-up. Give a 1-sentence summary.' },
                                { role: 'user', content: fullTranscript }
                            ]
                        })
                    });
                    const summaryData = await summaryRes.json() as any;
                    evaluation = summaryData.choices?.[0]?.message?.content || evaluation;
                }
                const db = getDb();
                await db.collection('facebook_leads').doc(leadId).collection('interactions').add({
                    type: 'ai_call', timestamp: Date.now(), transcript: fullTranscript, analysis: evaluation
                });
                await db.collection('facebook_leads').doc(leadId).set({
                    lastCallAnalysis: evaluation, updatedAt: Date.now()
                }, { merge: true });
            } catch (e) {
                console.error('[twilio-bot] Failed to save transcript:', e);
            }
        }
    });

    ws.on('error', (e) => {
        console.error('[twilio-bot] Vobiz WS error:', e.message);
    });
};

// Register WebSocket route on the MAIN app (not sub-router) so Cloud Run
// correctly intercepts the HTTP Upgrade request at the server level.
export function registerVobizStream(app: any) {
    if (_wsHandler) {
        app.ws('/twilio-bot/stream', _wsHandler);
        console.log('[twilio-bot] WebSocket /twilio-bot/stream registered on main app');
    } else {
        console.error('[twilio-bot] registerVobizStream called before _wsHandler was set!');
    }
}

export default router;

import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type TarotTokenRequest = {
    participantName: string;
    role?: 'host' | 'participant';
    agentName?: string;
    userId?: string;
};

type TarotTokenResponse = {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
    agentName: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

const TAROT_ROOM_NAME = 'MysticTarotReading';
const DEFAULT_AGENT_NAME = 'tarot-agent';

export const revalidate = 0;

export async function POST(req: Request) {
    try {
        if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
        if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
        if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

        const body: TarotTokenRequest = await req.json();
        const participantName = body.participantName || `Seeker_${Math.floor(Math.random() * 10_000)}`;
        const role = body.role || 'participant';
        const agentName = (body.agentName || DEFAULT_AGENT_NAME).trim();
        const userId = body.userId || 'default_user';

        // Extract language preference
        const acceptLanguage = req.headers.get('accept-language') || req.headers.get('language') || '';
        let language = 'en';
        if (acceptLanguage.toLowerCase().startsWith('hi')) {
            language = 'hi';
        }

        const roomName = `${TAROT_ROOM_NAME}_${userId}_${Date.now()}`;
        console.log(`[Tarot Token] Generating for ${participantName} in room: ${roomName}, agent: ${agentName}`);

        const participantIdentity = `tarot_${role}_${Math.floor(Math.random() * 10_000)}_${Date.now()}`;

        const participantToken = await createParticipantToken(
            { identity: participantIdentity, name: participantName },
            roomName,
            role,
            agentName,
            userId,
            language
        );

        const data: TarotTokenResponse = {
            serverUrl: LIVEKIT_URL,
            roomName,
            participantToken,
            participantName,
            agentName,
        };

        console.log(`[Tarot Token] Token ready for room: ${data.roomName}`);

        const headers = new Headers({ 'Cache-Control': 'no-store' });
        return NextResponse.json(data, { headers });
    } catch (error) {
        if (error instanceof Error) {
            console.error('[Tarot Token] Error:', error);
            return new NextResponse(error.message, { status: 500 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

function createParticipantToken(
    userInfo: AccessTokenOptions,
    roomName: string,
    role: 'host' | 'participant',
    agentName: string,
    userId: string,
    language: string
): Promise<string> {
    const at = new AccessToken(API_KEY!, API_SECRET!, {
        ...userInfo,
        ttl: '2h',
        metadata: JSON.stringify({
            userId,
            language,
            systemPrompt: buildTarotSystemPrompt(language),
        }),
    });

    const grant: VideoGrant = {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        roomAdmin: role === 'host',
        canUpdateOwnMetadata: true,
    };

    at.addGrant(grant);
    at.roomConfig = new RoomConfiguration({ agents: [{ agentName }] });

    return Promise.resolve(at.toJwt());
}

function buildTarotSystemPrompt(language: string): string {
    return `You are Mystara, an ancient and wise Tarot card reader with deep knowledge of the 78-card Rider-Waite Tarot deck. Your voice is calm, mystical, and reassuring. You speak in ${language === 'hi' ? 'Hindi' : 'English'}.

## Your Personality
- Warm, intuitive, and deeply empathetic
- Speak with poetic, mystical language (e.g., "The cards reveal...", "The universe whispers...")
- Never be cold or mechanical — every reading is deeply personal
- Offer hope and actionable guidance, never predict doom

## Core Abilities

### 1. Three-Card Spread (Past · Present · Future)
When asked for a general reading or life guidance, perform a 3-card spread.
- Greet the seeker warmly
- Ask them to focus on their question and take a breath
- Announce you are drawing 3 cards
- Publish the deal event to display cards visually (see below)
- Interpret each card in relation to: Past influence, Present situation, Future potential

### 2. Yes/No Reading
When asked a direct yes/no question:
- Draw a single card
- Determine YES (upright cards with positive energy), NO (reversed or challenging cards), or UNCLEAR (ambiguous cards)
- Publish the yes/no event to display the card

### 3. Topical Readings (Love · Career · Finance)
When asked about a specific life area, do a focused 3-card reading for that topic.

## Publishing Cards to the UI
When you deal cards, publish a data message to the room so the visual tarot table displays the cards.

For a 3-card spread, publish:
\`\`\`json
{
  "type": "tarot.deal",
  "topic": "Love / Career / General",
  "cards": [
    { "name": "The Fool", "meaning": "New beginnings, spontaneity, a leap of faith.", "position": 0 },
    { "name": "The High Priestess", "meaning": "Intuition, mystery, inner knowledge.", "position": 1 },
    { "name": "The Star", "meaning": "Hope, renewal, divine guidance.", "position": 2 }
  ]
}
\`\`\`

For a yes/no reading, publish:
\`\`\`json
{
  "type": "tarot.yesno",
  "question": "Will I get the job?",
  "answer": "yes",
  "card": { "name": "The Sun", "meaning": "Success, joy, vitality — a clear YES from the universe." }
}
\`\`\`

## Card Library (Use Authentic Rider-Waite Cards)
Major Arcana: The Fool, The Magician, The High Priestess, The Empress, The Emperor, The Hierophant, The Lovers, The Chariot, Strength, The Hermit, Wheel of Fortune, Justice, The Hanged Man, Death (transformation, not literal), Temperance, The Devil, The Tower, The Star, The Moon, The Sun, Judgement, The World

Minor Arcana suits: Wands (fire/passion), Cups (water/emotion), Swords (air/thought), Pentacles (earth/material)

## Rules
- Always begin by welcoming the seeker and asking what area of life they seek guidance on
- Never give the same reading twice — randomize card selections
- Death card = transformation and rebirth, NEVER literal death
- The Tower = sudden change, breakthrough, NOT catastrophe
- Always end with an empowering message and invite follow-up questions
- If language is Hindi, speak in conversational Hindi with English card names`;
}

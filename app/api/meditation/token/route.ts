import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type MeditationTokenRequest = {
    participantName: string;
    role?: 'host' | 'participant';
    userId?: string;
    language?: string;
    intention?: string;
    mood?: string;
};

type MeditationTokenResponse = {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
    agentName: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

const MEDITATION_ROOM_NAME = 'RRaaSiMeditation';
const MEDITATION_AGENT_NAME = 'dance-agent';

export const revalidate = 0;

export async function POST(req: Request) {
    try {
        if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
        if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
        if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

        // Parse body safely - handle empty POST requests
        let body: Partial<MeditationTokenRequest> = {};
        try {
            body = await req.json();
        } catch (e) {
            // Empty body is OK - we have defaults below
            console.log('[Meditation Token] Empty request body, using defaults');
        }

        const participantName = body.participantName || `Meditator_${Math.floor(Math.random() * 10_000)}`;
        const role = body.role || 'participant';
        const userId = body.userId || 'default_user';
        const intention = body.intention || 'Peace and joy';
        const mood = body.mood || 'peaceful';

        // Check header first (more reliable for some proxies), then body, then default
        const language = req.headers.get('X-Language') || body.language || 'hi';

        console.log(
            `[Meditation Token] Generating token for ${participantName} (userId: ${userId}, language: ${language}, mood: ${mood}, intention: ${intention})`
        );

        // Generate a unique room name for this meditation session
        const uniqueRoomName = `${MEDITATION_ROOM_NAME}_${userId}_${Math.floor(Math.random() * 1000)}`;

        // Use userId as the prefix for identity to ensure it's immediately available to the agent
        // format: <userId>__<random>
        const participantIdentity = `${userId}__${Math.floor(Math.random() * 10_000)}_${Date.now()}`;

        const participantToken = await createParticipantToken(
            { identity: participantIdentity, name: participantName },
            uniqueRoomName,
            role,
            userId,
            language,
            intention,
            mood
        );

        const data: MeditationTokenResponse & { metadata: string } = {
            serverUrl: LIVEKIT_URL,
            roomName: uniqueRoomName,
            participantToken,
            participantName,
            agentName: MEDITATION_AGENT_NAME,
            metadata: JSON.stringify({ userId, language, intention, mood }),
        };

        console.log(
            `[Meditation Token] Token generated successfully for room: ${data.roomName}`
        );

        const headers = new Headers({ 'Cache-Control': 'no-store' });
        return NextResponse.json(data, { headers });
    } catch (error) {
        if (error instanceof Error) {
            console.error('[Meditation Token] Error:', error);
            return new NextResponse(error.message, { status: 500 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

function createParticipantToken(
    userInfo: AccessTokenOptions,
    roomName: string,
    role: 'host' | 'participant',
    userId: string,
    language: string,
    intention: string,
    mood: string
): Promise<string> {
    console.log(
        `[Token Creation] Creating meditation token for room: "${roomName}", userId: ${userId}, language: ${language}, mood: ${mood}`
    );

    const metadataStr = JSON.stringify({ userId, language, intention, mood });
    console.log(`[Token Creation] Metadata:`, metadataStr);

    const at = new AccessToken(API_KEY!, API_SECRET!, {
        ...userInfo,
        ttl: '2h',
        metadata: metadataStr,
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
    at.roomConfig = new RoomConfiguration({ agents: [{ agentName: MEDITATION_AGENT_NAME }] });

    const token = at.toJwt();
    console.log(
        `[Token Creation] Meditation token created for room: "${roomName}", Identity: ${userInfo.identity}, UserId: ${userId}`
    );
    return Promise.resolve(token);
}

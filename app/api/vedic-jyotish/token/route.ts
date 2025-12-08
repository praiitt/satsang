import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type VedicJyotishTokenRequest = {
    participantName: string;
    role?: 'host' | 'participant';
    agentName?: string;
    userId?: string;
};

type VedicJyotishTokenResponse = {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
    agentName: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

const VEDIC_JYOTISH_ROOM_NAME = 'VedicJyotishGuidance';
const DEFAULT_AGENT_NAME = 'vedic-astrology-agent';

export const revalidate = 0;

export async function POST(req: Request) {
    try {
        if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
        if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
        if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

        const body: VedicJyotishTokenRequest = await req.json();
        const participantName = body.participantName || `User_${Math.floor(Math.random() * 10_000)}`;
        const role = body.role || 'participant';
        const agentName = (body.agentName || DEFAULT_AGENT_NAME).trim();
        const userId = body.userId || 'default_user';

        if (!agentName) {
            throw new Error('Agent name is required for Vedic Jyotish');
        }

        console.log(
            `[Vedic Jyotish Token] Generating token for ${participantName} (${role}, userId: ${userId}) to join room: ${VEDIC_JYOTISH_ROOM_NAME} with agent "${agentName}"`
        );

        const participantIdentity = `vedic_jyotish_${role}_${Math.floor(Math.random() * 10_000)}_${Date.now()}`;

        const participantToken = await createParticipantToken(
            { identity: participantIdentity, name: participantName },
            VEDIC_JYOTISH_ROOM_NAME,
            role,
            agentName,
            userId
        );

        const data: VedicJyotishTokenResponse = {
            serverUrl: LIVEKIT_URL,
            roomName: VEDIC_JYOTISH_ROOM_NAME,
            participantToken,
            participantName,
            agentName,
        };

        console.log(
            `[Vedic Jyotish Token] Token generated successfully for room: ${data.roomName} (agent: ${agentName}, userId: ${userId})`
        );

        const headers = new Headers({ 'Cache-Control': 'no-store' });
        return NextResponse.json(data, { headers });
    } catch (error) {
        if (error instanceof Error) {
            console.error('[Vedic Jyotish Token] Error:', error);
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
    userId: string
): Promise<string> {
    console.log(`[Token Creation] Creating token for room: "${roomName}", userId: ${userId}`);

    const at = new AccessToken(API_KEY!, API_SECRET!, {
        ...userInfo,
        ttl: '2h',
        metadata: JSON.stringify({ userId }), // Include userId in metadata
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

    const token = at.toJwt();
    console.log(
        `[Token Creation] Token created for room: "${roomName}", Identity: ${userInfo.identity}, Agent: ${agentName}, UserId: ${userId}`
    );
    return Promise.resolve(token);
}

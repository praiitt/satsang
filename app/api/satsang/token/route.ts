import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type PrivateSatsangTokenRequest = {
    participantName: string;
    guruId: string;
    userId?: string;
    language?: string;
    planId?: string;
};

type PrivateSatsangTokenResponse = {
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
    agentName: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Default agent name used for private satsang
// This maps to the worker running 'hinduism-agent' which can embody any guru
const DEFAULT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || 'hinduism-agent';

export const revalidate = 0;

export async function POST(req: Request) {
    try {
        if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
        if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
        if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

        const body: PrivateSatsangTokenRequest = await req.json();
        const participantName = body.participantName || `Seeker_${Math.floor(Math.random() * 1000)}`;
        const guruId = body.guruId; // e.g., 'osho', 'krishna'
        const userId = body.userId || `user_${Math.floor(Math.random() * 10000)}`;
        const language = body.language || 'hi';

        if (!guruId) {
            return new NextResponse('Missing guruId', { status: 400 });
        }

        // Unique room name for this private session
        // Include timestamp to ensure uniqueness
        const roomName = `Satsang_${guruId}_${userId}_${Date.now()}`;

        console.log(
            `[PrivateSatsang Token] Generating token for ${participantName} with guru ${guruId} in room ${roomName}`
        );

        const participantIdentity = `satsang_user_${userId}_${Date.now()}`;

        // Fetch plan if planId is provided
        let fullPlan = null;
        if (body.planId) {
            try {
                // Import locally to avoid issues if not used elsewhere
                const { getAdminDb } = require('@/lib/firebase-admin');
                const db = getAdminDb();
                const planDoc = await db.collection('satsang_plans').doc(body.planId).get();
                if (planDoc.exists) {
                    fullPlan = planDoc.data();
                    console.log(`[PrivateSatsang Token] Fetched plan ${body.planId} for metadata embedding`);
                }
            } catch (e) {
                console.error('[PrivateSatsang Token] Failed to fetch plan for metadata:', e);
            }
        }

        // Create metadata for the agent to consume
        const metadata = JSON.stringify({
            guruId: guruId,
            userId: userId,
            language: language,
            planId: body.planId,
            satsang_plan: fullPlan, // Embed full plan
            type: 'private-satsang'
        });

        const participantToken = await createParticipantToken(
            {
                identity: participantIdentity,
                name: participantName,
                metadata: metadata
            },
            roomName,
            DEFAULT_AGENT_NAME
        );

        const data: PrivateSatsangTokenResponse = {
            serverUrl: LIVEKIT_URL,
            roomName,
            participantToken,
            participantName,
            agentName: DEFAULT_AGENT_NAME,
        };

        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof Error) {
            console.error('[PrivateSatsang Token] Error:', error);
            return new NextResponse(error.message, { status: 500 });
        }
        return new NextResponse('Internal server error', { status: 500 });
    }
}

function createParticipantToken(
    userInfo: AccessTokenOptions,
    roomName: string,
    agentName: string
): Promise<string> {
    const at = new AccessToken(API_KEY!, API_SECRET!, {
        ...userInfo,
        ttl: '2h', // 2 hour session limit
    });

    const grant: VideoGrant = {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        canUpdateOwnMetadata: true,
    };

    at.addGrant(grant);

    // Important: Explicitly request the hinduism-agent to join this room
    at.roomConfig = new RoomConfiguration({
        agents: [{ agentName }]
    });

    return Promise.resolve(at.toJwt());
}

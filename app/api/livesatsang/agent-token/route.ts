import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type AgentTokenResponse = {
  serverUrl: string;
  roomName: string;
  agentToken: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Room name for LiveSatsang - shared room for all users
const LIVE_SATSANG_ROOM_NAME = 'LiveSatsang';
const AGENT_NAME = 'guruji'; // Name of the agent

// don't cache the results
export const revalidate = 0;

export async function POST() {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Generate agent token
    const agentIdentity = `livesatsang_guruji_${Date.now()}`;

    const agentToken = await createAgentToken(
      {
        identity: agentIdentity,
        name: 'Guruji (LiveSatsang)',
      },
      LIVE_SATSANG_ROOM_NAME,
      AGENT_NAME
    );

    // Return connection details
    const data: AgentTokenResponse = {
      serverUrl: LIVEKIT_URL,
      roomName: LIVE_SATSANG_ROOM_NAME,
      agentToken: agentToken,
    };

    const headers = new Headers({
      'Cache-Control': 'no-store',
    });

    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[LiveSatsang Agent Token] Error:', error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

function createAgentToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName: string
): Promise<string> {
  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '24h', // Long TTL for agent sessions
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    roomAdmin: false, // Agent shouldn't be admin
    canUpdateOwnMetadata: true,
  };

  at.addGrant(grant);

  // Configure agent in room
  at.roomConfig = new RoomConfiguration({
    agents: [{ agentName }],
  });

  return Promise.resolve(at.toJwt());
}

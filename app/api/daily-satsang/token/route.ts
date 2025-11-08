import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type DailySatsangTokenRequest = {
  participantName: string;
  role?: 'host' | 'participant';
  agentName?: string;
};

type DailySatsangTokenResponse = {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
  agentName: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Room name for DailySatsang - shared room for all users
const DAILY_SATSANG_ROOM_NAME = 'DailySatsang';
// Default agent name for Daily Satsang; can be overridden per-request
const DEFAULT_AGENT_NAME =
  process.env.LIVEKIT_DAILY_SATSANG_AGENT_NAME ?? process.env.LIVEKIT_AGENT_NAME ?? 'guruji-daily';

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
    if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
    if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

    const body: DailySatsangTokenRequest = await req.json();
    const participantName = body.participantName || `User_${Math.floor(Math.random() * 10_000)}`;
    const role = body.role || 'participant';
    const agentName = (body.agentName || DEFAULT_AGENT_NAME).trim();

    if (!agentName) {
      throw new Error('Agent name is required for Daily Satsang');
    }

    console.log(
      `[DailySatsang Token] Generating token for ${participantName} (${role}) to join room: ${DAILY_SATSANG_ROOM_NAME} with agent "${agentName}"`
    );

    const participantIdentity = `dailysatsang_${role}_${Math.floor(Math.random() * 10_000)}_${Date.now()}`;

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      DAILY_SATSANG_ROOM_NAME,
      role,
      agentName
    );

    const data: DailySatsangTokenResponse = {
      serverUrl: LIVEKIT_URL,
      roomName: DAILY_SATSANG_ROOM_NAME,
      participantToken,
      participantName,
      agentName,
    };

    console.log(
      `[DailySatsang Token] Token generated successfully for room: ${data.roomName} (agent: ${agentName})`
    );

    const headers = new Headers({ 'Cache-Control': 'no-store' });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[DailySatsang Token] Error:', error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  role: 'host' | 'participant',
  agentName: string
): Promise<string> {
  console.log(`[Token Creation] Creating token for room: "${roomName}"`);

  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '2h',
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
    `[Token Creation] Token created for room: "${roomName}", Identity: ${userInfo.identity}, Agent: ${agentName}`
  );
  return Promise.resolve(token);
}

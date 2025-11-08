import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type DailySatsangTokenRequest = {
  participantName: string;
  role?: 'host' | 'participant';
};

type DailySatsangTokenResponse = {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Room name for DailySatsang - shared room for all users
const DAILY_SATSANG_ROOM_NAME = 'DailySatsang';
// Use a dedicated agent name for Daily Satsang to avoid conflicts with main 'guruji'
const AGENT_NAME = 'guruji-daily';

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
    if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
    if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

    const body: DailySatsangTokenRequest = await req.json();
    const participantName = body.participantName || `User_${Math.floor(Math.random() * 10_000)}`;
    const role = body.role || 'participant';

    console.log(
      `[DailySatsang Token] Generating token for ${participantName} (${role}) to join room: ${DAILY_SATSANG_ROOM_NAME}`
    );

    const participantIdentity = `dailysatsang_${role}_${Math.floor(Math.random() * 10_000)}_${Date.now()}`;

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      DAILY_SATSANG_ROOM_NAME,
      role
    );

    const data: DailySatsangTokenResponse = {
      serverUrl: LIVEKIT_URL,
      roomName: DAILY_SATSANG_ROOM_NAME,
      participantToken,
      participantName,
    };

    console.log(`[DailySatsang Token] Token generated successfully for room: ${data.roomName}`);

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
  role: 'host' | 'participant'
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
  at.roomConfig = new RoomConfiguration({ agents: [{ agentName: AGENT_NAME }] });

  const token = at.toJwt();
  console.log(
    `[Token Creation] Token created for room: "${roomName}", Identity: ${userInfo.identity}, Agent: ${AGENT_NAME}`
  );
  return Promise.resolve(token);
}

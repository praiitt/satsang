import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';

type LiveSatsangTokenRequest = {
  participantName: string;
  role?: 'host' | 'participant';
};

type LiveSatsangTokenResponse = {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Room name for LiveSatsang - shared room for all users
// IMPORTANT: This MUST be exactly the same for all participants
const LIVE_SATSANG_ROOM_NAME = 'LiveSatsang';

// don't cache the results
export const revalidate = 0;

export async function POST(req: Request) {
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

    // Parse request body
    const body: LiveSatsangTokenRequest = await req.json();
    const participantName = body.participantName || `User_${Math.floor(Math.random() * 10_000)}`;
    const role = body.role || 'participant';

    // IMPORTANT: Always use the same room name for all participants
    console.log(`[LiveSatsang Token] Generating token for ${participantName} (${role}) to join room: ${LIVE_SATSANG_ROOM_NAME}`);

    // Generate unique identity for this participant
    const participantIdentity = `livesatsang_${role}_${Math.floor(Math.random() * 10_000)}_${Date.now()}`;

    // Create participant token with appropriate permissions
    const participantToken = await createParticipantToken(
      { 
        identity: participantIdentity, 
        name: participantName 
      },
      LIVE_SATSANG_ROOM_NAME, // Always use 'LiveSatsang'
      role
    );

    // Return connection details - room name MUST be 'LiveSatsang'
    const data: LiveSatsangTokenResponse = {
      serverUrl: LIVEKIT_URL,
      roomName: LIVE_SATSANG_ROOM_NAME, // Always return 'LiveSatsang'
      participantToken: participantToken,
      participantName,
    };
    
    console.log(`[LiveSatsang Token] Token generated successfully for room: ${data.roomName}`);
    
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[LiveSatsang Token] Error:', error);
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
    ttl: '2h', // Longer TTL for longer sessions
  });
  
  // CRITICAL: The room name in the grant must match exactly
  const grant: VideoGrant = {
    room: roomName, // This MUST be 'LiveSatsang' for all participants
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    // Hosts can control room (mute others, etc.)
    roomAdmin: role === 'host',
    canUpdateMetadata: true,
  };
  
  at.addGrant(grant);
  
  const token = at.toJwt();
  console.log(`[Token Creation] Token created for room: "${roomName}", Identity: ${userInfo.identity}`);
  
  return Promise.resolve(token);
}


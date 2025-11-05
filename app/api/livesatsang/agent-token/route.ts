import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

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

    // Initialize RoomServiceClient to manage room configuration
    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

    // Create or update the room configuration
    // LiveKit will handle existing rooms gracefully
    // Note: The agent will automatically join when:
    // 1. An agent worker is running with agent_name='guruji'
    // 2. A participant joins with a token that includes RoomConfiguration with agents: [{ agentName: 'guruji' }]
    await roomService.createRoom({
      name: LIVE_SATSANG_ROOM_NAME,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 50,
    });

    console.log(
      `[LiveSatsang Agent] Room ${LIVE_SATSANG_ROOM_NAME} configured. Agent ${AGENT_NAME} will join if worker is running.`
    );

    // Note: The agent will automatically join when:
    // 1. An agent worker is running with agent_name='guruji'
    // 2. A participant joins with a token that includes RoomConfiguration with agents: [{ agentName: 'guruji' }]
    // For now, we'll ensure future participants include the agent config in their tokens

    return NextResponse.json({
      success: true,
      message:
        'Guruji has been invited! The agent will join automatically when the agent worker is running.',
      serverUrl: LIVEKIT_URL,
      roomName: LIVE_SATSANG_ROOM_NAME,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[LiveSatsang Agent Token] Error:', error);
      return NextResponse.json(
        {
          success: false,
          message: error.message || 'Failed to invite Guruji',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

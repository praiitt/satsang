import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

const DAILY_SATSANG_ROOM_NAME = 'DailySatsang';
// Use a dedicated agent name for Daily Satsang to avoid conflicts with main 'guruji'
const AGENT_NAME = 'guruji-daily';

export const revalidate = 0;

export async function POST() {
  try {
    if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
    if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
    if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

    const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
    await roomService.createRoom({
      name: DAILY_SATSANG_ROOM_NAME,
      emptyTimeout: 300,
      maxParticipants: 50,
    });

    console.log(
      `[DailySatsang Agent] Room ${DAILY_SATSANG_ROOM_NAME} configured. Agent ${AGENT_NAME} will join if worker is running.`
    );

    return NextResponse.json({
      success: true,
      message:
        'Guruji has been invited! The agent will join automatically when the agent worker is running.',
      serverUrl: LIVEKIT_URL,
      roomName: DAILY_SATSANG_ROOM_NAME,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[DailySatsang Agent Token] Error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to invite Guruji' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

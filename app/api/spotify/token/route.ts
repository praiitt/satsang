// This endpoint is no longer needed - we're using simple MP3 preview URLs
// Keeping file for backward compatibility but returning error
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Using direct MP3 preview URLs instead.' },
    { status: 410 }
  );
}

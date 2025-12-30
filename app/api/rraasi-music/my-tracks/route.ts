import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-api';
import { headers } from 'next/headers';

/**
 * GET /api/rraasi-music/my-tracks
 * Fetch music tracks created by the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        // Get authenticated user - pass server-side cookies
        const headerList = await headers();
        const user = await getCurrentUser(headerList.get('cookie') || undefined);

        if (!user || !user.phoneNumber) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in to view your music' },
                { status: 401 }
            );
        }

        // Get limit from query params
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');

        // Fetch tracks from auth-server
        const authServerUrl = process.env.AUTH_SERVER_URL ||
            'https://satsang-auth-server-6ougd45dya-el.a.run.app';

        const url = `${authServerUrl}/suno/tracks?userId=${encodeURIComponent(user.phoneNumber)}&limit=${limit}`;

        console.log(`[My Tracks API] Fetching tracks for user: ${user.phoneNumber}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`[My Tracks API] Auth server error: ${response.status}`);
            throw new Error('Failed to fetch tracks from auth server');
        }

        const data = await response.json();

        console.log(`[My Tracks API] Found ${data.tracks?.length || 0} tracks for ${user.phoneNumber}`);

        return NextResponse.json({
            tracks: data.tracks || [],
            user: {
                phoneNumber: user.phoneNumber,
                displayName: user.displayName || user.phoneNumber,
                uid: user.uid
            },
            total: data.tracks?.length || 0
        });

    } catch (error) {
        console.error('[My Tracks API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch your music tracks' },
            { status: 500 }
        );
    }
}

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

        console.log('[My Tracks API] Auth check - User:', user?.uid, 'Phone:', user?.phoneNumber);

        if (!user || !user.phoneNumber) {
            console.error('[My Tracks API] Authentication failed - no user or phone number');
            return NextResponse.json(
                { error: 'Unauthorized - Please log in to view your music' },
                { status: 401 }
            );
        }

        // Get limit from query params
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');

        // Fetch tracks from auth-server using new endpoint that handles room IDs
        const isDev = process.env.NODE_ENV === 'development';

        // Force localhost in development to avoid hitting production URL from .env.local
        const authServerUrl = isDev
            ? 'http://localhost:4000'
            : (process.env.AUTH_SERVER_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app');

        const url = `${authServerUrl}/suno/my-tracks`;

        console.log(`[My Tracks API] Fetching tracks for User UID: ${user.uid}, Phone: ${user.phoneNumber}`);
        console.log(`[My Tracks API] Target URL: ${url}`);

        // Forward cookies for authentication
        const cookieHeader = headerList.get('cookie') || '';

        const response = await fetch(url, {
            headers: {
                'Cookie': cookieHeader
            }
        });

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

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
        const cookieHeader = headerList.get('cookie');

        console.log('[My Tracks API] ===== AUTH DEBUG =====');
        console.log('[My Tracks API] Has cookie header:', !!cookieHeader);
        console.log('[My Tracks API] Cookie header length:', cookieHeader?.length || 0);

        const user = await getCurrentUser(cookieHeader || undefined);

        console.log('[My Tracks API] getCurrentUser result:', user ? 'USER FOUND' : 'NULL');
        console.log('[My Tracks API] User UID:', user?.uid);
        console.log('[My Tracks API] User phone:', user?.phoneNumber);
        console.log('[My Tracks API] User email:', user?.email);

        if (!user) {
            console.error('[My Tracks API] ❌ No user returned from getCurrentUser');
            return NextResponse.json(
                { error: 'Unauthorized - Please log in to view your music' },
                { status: 401 }
            );
        }

        // Phone number not required - Google login users don't have phone numbers
        console.log('[My Tracks API] ✅ User authenticated, proceeding...');

        // Get limit from query params
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');

        // Fetch tracks from auth-server using new endpoint that handles room IDs
        const isDev = process.env.NODE_ENV === 'development';

        // Force localhost in development to avoid hitting production URL from .env.local
        const authServerUrl = isDev
            ? 'http://localhost:4000'
            : (process.env.AUTH_SERVER_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app');

        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const page = searchParams.get('page') || '1';
        
        const url = new URL(`${authServerUrl}/suno/my-tracks`);
        url.searchParams.append('limit', limit.toString());
        url.searchParams.append('page', page);
        if (search) url.searchParams.append('search', search);
        if (category) url.searchParams.append('category', category);

        const urlString = url.toString();

        console.log(`[My Tracks API] ✅ Authenticated! Fetching tracks for UID: ${user.uid}`);
        console.log(`[My Tracks API] Target URL: ${urlString}`);

        // Forward cookies for authentication (reuse cookieHeader from above)
        const response = await fetch(urlString, {
            headers: {
                'Cookie': cookieHeader || ''
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

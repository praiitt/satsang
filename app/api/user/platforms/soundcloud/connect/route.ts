import { NextRequest, NextResponse } from 'next/server';

// Proxy to auth-server
export async function POST(request: NextRequest) {
    try {
        const AUTH_SERVER_URL = process.env.NODE_ENV === 'development'
            ? 'http://localhost:4000'
            : process.env.AUTH_SERVER_URL;

        const sessionCookie = request.cookies.get('__session')?.value;

        const response = await fetch(`${AUTH_SERVER_URL}/user/platforms/soundcloud/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `__session=${sessionCookie}`
            }
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error connecting SoundCloud:', error);
        return NextResponse.json(
            { error: 'Failed to connect SoundCloud' },
            { status: 500 }
        );
    }
}

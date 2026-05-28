import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { trackId } = body;
        
        if (!trackId) {
            return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
        }

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
        
        const response = await fetch(`${authServerUrl}/suno/buy-track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({ trackId }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Failed to purchase track' }, 
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Buy Track Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}

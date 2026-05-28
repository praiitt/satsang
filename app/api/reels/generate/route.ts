import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { intention } = body;
        
        if (!intention) {
            return NextResponse.json({ error: 'Missing intention' }, { status: 400 });
        }

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
        
        const response = await fetch(`${authServerUrl}/reels/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({ intention }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Failed to generate reel' }, 
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Generate Reel Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}

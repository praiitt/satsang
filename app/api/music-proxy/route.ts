import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
        return new NextResponse("Missing URL parameter", { status: 400 });
    }

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`[MusicProxy] Failed to fetch upstream url: ${url}`, response.statusText);
            return new NextResponse("Upstream fetch failed", { status: response.status });
        }

        // Clone headers and overwrite CORS directives
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.delete('Access-Control-Allow-Credentials');

        // Pipe the binary stream directly back to the client
        return new NextResponse(response.body, {
            status: response.status,
            headers: headers,
        });

    } catch (error) {
        console.error("[MusicProxy] Exception proxying audio:", error);
        return new NextResponse("Error piping audio", { status: 500 });
    }
}

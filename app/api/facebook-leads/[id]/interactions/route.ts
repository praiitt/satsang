import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MKT = () => process.env.MARKETING_SERVER_URL || 'http://127.0.0.1:4001';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const cookie = req.headers.get('cookie') || '';
    const res = await fetch(`${MKT()}/facebook-leads/${id}/interactions`, {
        headers: { 'Cookie': cookie },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getMarketingUrl = () => process.env.MARKETING_SERVER_URL || 'http://localhost:4001';
const fwd = (req: NextRequest) => ({ 'Cookie': req.headers.get('cookie') || '', 'Content-Type': 'application/json' });

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const res = await fetch(`${getMarketingUrl()}/leads/${params.id}`, { headers: fwd(req), cache: 'no-store' });
    return NextResponse.json(await res.json(), { status: res.status });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const body = await req.json();
    const res = await fetch(`${getMarketingUrl()}/leads/${params.id}`, {
        method: 'PATCH',
        headers: fwd(req),
        body: JSON.stringify(body)
    });
    return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const res = await fetch(`${getMarketingUrl()}/leads/${params.id}`, {
        method: 'DELETE',
        headers: fwd(req)
    });
    return NextResponse.json(await res.json(), { status: res.status });
}

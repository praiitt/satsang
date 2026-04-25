import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MKT = () => process.env.MARKETING_SERVER_URL || 'http://127.0.0.1:4001';
const fwd = (req: NextRequest) => ({ 'Cookie': req.headers.get('cookie') || '', 'Content-Type': 'application/json' });

type Params = { params: Promise<{ id: string }> };

// DELETE /api/facebook-leads/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const res = await fetch(`${MKT()}/facebook-leads/${id}`, {
        method: 'DELETE',
        headers: fwd(req),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

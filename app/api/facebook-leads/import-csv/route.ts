import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MKT = () => process.env.MARKETING_SERVER_URL || 'http://127.0.0.1:4001';

export async function POST(req: NextRequest) {
    // Forward the multipart form data (CSV file) directly
    const formData = await req.formData();
    const cookie = req.headers.get('cookie') || '';

    // Pass category as a query param — more reliable than FormData text fields with multer
    const category = formData.get('category') || 'general';

    const res = await fetch(`${MKT()}/facebook-leads/import-csv?category=${encodeURIComponent(category as string)}`, {
        method: 'POST',
        headers: { 'Cookie': cookie },
        body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

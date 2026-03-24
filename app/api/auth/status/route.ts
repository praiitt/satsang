
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';
import { INTEGRATION_TOKENS_COLLECTION } from '@/lib/types/integrations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const provider = searchParams.get('provider');

        if (!userId || !provider) {
            return NextResponse.json({ error: 'UserId and provider required' }, { status: 400 });
        }

        initAdmin();
        const db = getAdminDb();

        const doc = await db.collection(INTEGRATION_TOKENS_COLLECTION).doc(`${userId}_${provider}`).get();
        if (!doc.exists) {
            return NextResponse.json({ connected: false });
        }

        const data = doc.data();
        if (!data || !data.valid) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({ 
            connected: true, 
            userEmail: data.userEmail, 
            displayName: data.displayName 
        });
    } catch (error) {
        console.error('Error checking auth status:', error);
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }
}

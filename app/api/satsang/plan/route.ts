import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const planId = searchParams.get('planId');

        if (!planId) {
            return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
        }

        const db = getAdminDb();
        const doc = await db.collection('satsang_plans').doc(planId).get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            planId: doc.id,
            plan: doc.data() 
        });

    } catch (error: any) {
        console.error('Error fetching satsang plan:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

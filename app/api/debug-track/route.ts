
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const db = getAdminDb();
        const apps = admin.apps.length;
        const projectId = admin.app().options.credential?.projectId || 'unknown';

        let trackResult = null;
        if (id) {
            const doc = await db.collection('music_tracks').doc(id).get();
            trackResult = {
                exists: doc.exists,
                id: doc.id,
                data: doc.exists ? doc.data() : null
            };
        }

        return NextResponse.json({
            status: 'debug',
            appsInitialized: apps,
            projectId: projectId,
            env: {
                NODE_ENV: process.env.NODE_ENV,
                FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
                // Don't leak full keys
                HAS_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            },
            trackCheck: trackResult
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

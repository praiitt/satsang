import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    initAdmin();
    const db = getAdminDb();

    // Verify Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      await admin.auth().verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 1. Fetch all Firestore user profiles
    const firestoreSnapshot = await db.collection('users').get();
    const firestoreMap = new Map();
    firestoreSnapshot.forEach(doc => {
      firestoreMap.set(doc.id, doc.data());
    });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const users: { uid: string; displayName: string; phoneNumber: string; email: string; createdAt: string; callInitiatedAt: any; lastCallAnalysis: any; callRecordingUrl: any; callDuration: any; callStatus: any; waSent: boolean; waFailed: boolean }[] = [];
    let nextPageToken: string | undefined;

    // 2. Fetch Firebase Auth users and merge with Firestore data
    do {
      const listResult = await admin.auth().listUsers(1000, nextPageToken);
      for (const userRecord of listResult.users) {
        const phone = userRecord.phoneNumber || '';
        const fsData = firestoreMap.get(userRecord.uid) || {};
        
        users.push({
          uid: userRecord.uid,
          // Priority: Firestore name > Auth displayName > Email > Phone
          displayName: fsData.name || fsData.displayName || userRecord.displayName || userRecord.email || phone,
          phoneNumber: phone,
          email: userRecord.email || fsData.email || '',
          createdAt: userRecord.metadata.creationTime,
          callInitiatedAt: fsData.callInitiatedAt || null,
          lastCallAnalysis: fsData.lastCallAnalysis || null,
          callRecordingUrl: fsData.callRecordingUrl || null,
          callDuration: fsData.callDuration || null,
          callStatus: fsData.callStatus || null,
          waSent: fsData.waSent || false,
          waFailed: fsData.waFailed || false,
        });
      }
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    // Sort by createdAt desc
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = users.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + limit);

    return NextResponse.json({ 
      users: paginatedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Failed to list users:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

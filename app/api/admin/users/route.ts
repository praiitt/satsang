import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, initAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    initAdmin();
    const db = getAdminDb();
    
    // 1. Fetch all Firestore user profiles
    const firestoreSnapshot = await db.collection('users').get();
    const firestoreMap = new Map();
    firestoreSnapshot.forEach(doc => {
      firestoreMap.set(doc.id, doc.data());
    });

    const users: { uid: string; displayName: string; phoneNumber: string; email: string }[] = [];
    let nextPageToken: string | undefined;

    // 2. Fetch Firebase Auth users and merge with Firestore data
    do {
      const listResult = await admin.auth().listUsers(1000, nextPageToken);
      for (const userRecord of listResult.users) {
        const phone = userRecord.phoneNumber;
        if (phone) {
          const fsData = firestoreMap.get(userRecord.uid) || {};
          
          users.push({
            uid: userRecord.uid,
            // Priority: Firestore name > Auth displayName > Email > Phone
            displayName: fsData.name || fsData.displayName || userRecord.displayName || userRecord.email || phone,
            phoneNumber: phone,
            email: userRecord.email || fsData.email || '',
          });
        }
      }
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Failed to list users:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

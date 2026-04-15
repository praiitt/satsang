import admin from 'firebase-admin';
import { db } from './firebase-admin';

export interface WhatsAppLog {
    from: string;
    to: string;
    body: string;
    mediaUrl?: string;
    status: 'sent' | 'failed' | 'received';
    error?: string;
    timestamp: any;
}

export async function logWhatsAppActivity(log: WhatsAppLog) {
    if (!db) {
        console.warn('[WhatsAppLogger] Firestore not initialized, skipping log');
        return;
    }

    try {
        await db.collection('whatsapp_logs').add({
            ...log,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[WhatsAppLogger] Logged ${log.status} to Firestore`);
    } catch (err) {
        console.error('[WhatsAppLogger] Failed to log to Firestore:', err);
    }
}

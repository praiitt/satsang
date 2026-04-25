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
        const dataToSave: any = { ...log, timestamp: admin.firestore.FieldValue.serverTimestamp() };
        if (dataToSave.mediaUrl === undefined) delete dataToSave.mediaUrl;
        if (dataToSave.error === undefined) delete dataToSave.error;

        await db.collection('whatsapp_logs').add(dataToSave);
        console.log(`[WhatsAppLogger] Logged ${log.status} to Firestore`);
    } catch (err) {
        console.error('[WhatsAppLogger] Failed to log to Firestore:', err);
    }
}

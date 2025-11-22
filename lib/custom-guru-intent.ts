// eslint-disable-next-line import/named
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import type { Language } from '@/lib/translations';

export interface CustomGuruIntentData {
  idealGuruDescription: string;
  currentNeeds?: string;
  styleTags?: string[];
  contactEmail?: string;
  canContact?: boolean;
  language: Language;
  userId?: string | null;
}

export async function saveCustomGuruInterest(data: CustomGuruIntentData): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const intentsCollection = collection(db, 'customGuruIntents');

    await addDoc(intentsCollection, {
      idealGuruDescription: data.idealGuruDescription,
      currentNeeds: data.currentNeeds || null,
      styleTags: data.styleTags || [],
      contactEmail: data.contactEmail || null,
      canContact: data.canContact || false,
      language: data.language,
      userId: data.userId || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving custom guru interest:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to save your interest. Please try again.'
    );
  }
}

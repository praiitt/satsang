import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase-client';

export type DiagnosingTool = 'Astrology' | 'Tarot' | 'Numerology' | 'ET Agent' | null;
export type ActiveRemedy = 'Music' | 'Reel' | 'Art' | null;

export interface SpiritualState {
  userId: string;
  currentImbalance: string | null;     // e.g., "Anxiety block in Heart Chakra"
  diagnosingTool: DiagnosingTool;
  activeRemedy: ActiveRemedy;
  lastDiagnosticData: {
    tarotCards?: string[];             // e.g., ["The Tower", "Three of Swords"]
    astrologyTransit?: string;         // e.g., "Saturn conjunct Moon"
    numerologyDay?: number;            // e.g., 4
  };
  satsangSummary?: string;             // The conclusion reached with the AI Guru
  updatedAt: any;
}

const COLLECTION_NAME = 'user_spiritual_states';

/**
 * Gets the global spiritual state for a user.
 */
export async function getSpiritualState(userId: string): Promise<SpiritualState | null> {
  try {
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as SpiritualState;
    }
    return null;
  } catch (error) {
    console.error("Error fetching spiritual state:", error);
    return null;
  }
}

/**
 * Updates or creates the global spiritual state for a user.
 * Merges with existing data.
 */
export async function updateSpiritualState(
  userId: string, 
  updates: Partial<Omit<SpiritualState, 'userId' | 'updatedAt'>>
): Promise<void> {
  try {
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Update existing
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new
      const newState: SpiritualState = {
        userId,
        currentImbalance: updates.currentImbalance || null,
        diagnosingTool: updates.diagnosingTool || null,
        activeRemedy: updates.activeRemedy || null,
        lastDiagnosticData: updates.lastDiagnosticData || {},
        satsangSummary: updates.satsangSummary || undefined,
        updatedAt: serverTimestamp()
      };
      await setDoc(docRef, newState);
    }
  } catch (error) {
    console.error("Error updating spiritual state:", error);
    throw error;
  }
}

/**
 * Clears the active remedy and imbalance once a user has successfully processed/executed it.
 */
export async function clearActiveRemedy(userId: string): Promise<void> {
  try {
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, COLLECTION_NAME, userId);
    await updateDoc(docRef, {
      currentImbalance: null,
      activeRemedy: null,
      satsangSummary: null,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error clearing active remedy:", error);
  }
}

'use client';

import { useState, useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase-client';
import { useAuth } from '@/components/auth/auth-provider';
import type { SpiritualState } from '@/lib/services/spiritual-state';

export function useSpiritualState() {
  const { user, isAuthenticated } = useAuth();
  const [spiritualState, setSpiritualState] = useState<SpiritualState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setSpiritualState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirestore(getFirebaseApp());
    const docRef = doc(db, 'user_spiritual_states', user.uid);

    // Subscribe to real-time changes
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSpiritualState(docSnap.data() as SpiritualState);
        } else {
          setSpiritualState(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to spiritual state:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isAuthenticated]);

  return { spiritualState, loading, error };
}

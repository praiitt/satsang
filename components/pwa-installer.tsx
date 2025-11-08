'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/livekit/button';

export function PWAInstaller() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }

    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="bg-primary/10 border-primary/20 fixed right-4 bottom-4 left-4 z-50 rounded-lg border p-4 shadow-lg md:right-4 md:left-auto md:w-80">
      <div className="mb-3">
        <h3 className="text-foreground text-sm font-semibold">सत्संग ऐप इंस्टॉल करें</h3>
        <p className="text-muted-foreground text-xs">
          बेहतर अनुभव के लिए इंस्टॉल करें (ऑफ़लाइन सपोर्ट)
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleInstallClick} className="flex-1 text-sm">
          इंस्टॉल करें
        </Button>
        <Button variant="secondary" onClick={() => setShowInstallPrompt(false)} className="text-sm">
          बाद में
        </Button>
      </div>
    </div>
  );
}

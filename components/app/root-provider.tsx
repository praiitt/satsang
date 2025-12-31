'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { LanguageProvider } from '@/contexts/language-context';
import { MusicPlayerProvider } from '@/contexts/music-player-context';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MusicPlayerProvider>
          {children}
        </MusicPlayerProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
